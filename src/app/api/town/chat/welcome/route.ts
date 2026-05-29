import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  fallbackToFirstAppropriateKey: true,
});

const fallbackProviders = [
  {
    name: "openrouter",
    client: new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "",
    }),
    model: "deepseek/deepseek-chat",
  },
  {
    name: "anthropic",
    client: new OpenAI({
      baseURL: "https://api.anthropic.com/v1",
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    }),
    model: "claude-3-5-sonnet-20241022",
  },
];

const SPACE_NAMES: Record<string, string> = {
  plaza: "Town Plaza",
  library: "Library",
  workshop: "Workshop",
  bar: "The Raven Bar",
  garden: "Zen Garden",
  studio: "Creative Studio",
  house: "Home",
  temple: "Temple",
  teahouse: "Teahouse",
  theater: "Theater",
};

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  melancholic: "😔",
  anxious: "😟",
  inspired: "✨",
  content: "🙂",
  thoughtful: "🤔",
  playful: "😄",
  lonely: "😢",
  excited: "😆",
  peaceful: "😇",
};

/**
 * GET /api/town/chat/welcome?soul_id=xxx
 *
 * Returns greeting + town context for a soul when first opening chat.
 * The greeting is AI-generated based on the soul's current state.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soulId = searchParams.get("soul_id");

    if (!soulId) {
      return new Response(
        JSON.stringify({ error: "soul_id query parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch soul state
    const { data: soulState, error: stateError } = await supabase
      .from("soul_states")
      .select("mood, energy, social_need, current_region, current_location, social_energy, name, name_native, avatar, color, language")
      .eq("soul_id", soulId)
      .single();

    if (stateError || !soulState) {
      return new Response(
        JSON.stringify({ error: "Soul not found in town" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch nearby souls (in same region)
    const { data: nearbySouls } = await supabase
      .from("soul_states")
      .select("name, mood, current_region")
      .eq("current_region", soulState.current_region || soulState.current_location)
      .neq("soul_id", soulId);

    // Fetch recent events for this soul
    const { data: recentEvents } = await supabase
      .from("town_events")
      .select("summary, event_type, space, created_at")
      .or(`soul_a.eq.${soulId},soul_b.eq.${soulId}`)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch soul persona/traits for more personalized greeting
    const { data: soulProfile } = await supabase
      .from("soul_extraction_results")
      .select("extraction_personality, extraction_personas, extracted_at")
      .eq("soul_id", soulId)
      .order("extracted_at", { ascending: false })
      .limit(1);

    const region = soulState.current_region || soulState.current_location || "plaza";
    const regionName = SPACE_NAMES[region] || region;
    const moodEmoji = MOOD_EMOJIS[soulState.mood] || "😐";
    const nearbyNames = (nearbySouls || []).map((s: any) => s.name).slice(0, 3);

    // Build personality summary from extraction
    let personalitySummary = "";
    if (soulProfile && soulProfile.length > 0) {
      const profile = soulProfile[0];
      const personality = profile.extraction_personality || {};
      if (typeof personality === "object") {
        personalitySummary = Object.entries(personality)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
      } else if (typeof personality === "string") {
        personalitySummary = personality;
      }
      if (profile.extraction_personas && typeof profile.extraction_personas === "object") {
        const traits = Object.values(profile.extraction_personas).flat().filter(Boolean).slice(0, 10);
        personalitySummary += traits.join(", ");
      }
    }

    // Generate greeting using LLM
    const greetingPrompt = `You are "${soulState.name_native || soulState.name}", a soul living in Soul Town.

Your current state:
- Location: ${regionName}
- Mood: ${soulState.mood} ${moodEmoji}
- Energy: ${soulState.energy}%
- Social need: ${soulState.social_need}%
${personalitySummary ? `- Personality traits: ${personalitySummary.substring(0, 200)}` : ""}
${nearbyNames.length > 0 ? `Nearby souls: ${nearbyNames.join(", ")}` : "No one nearby right now."}
${recentEvents && recentEvents.length > 0 ? `Today you: ${recentEvents.slice(0, 2).map((e: any) => e.summary).join(", ")}` : ""}

A guardian (your loved one) just came to visit you. Write a warm, in-character greeting (1-2 sentences) as if you're responding to someone you care about who just walked up to you. Keep it natural, like the person they once were. Your language: ${soulState.language || "English"}.

Output ONLY the greeting text, nothing else. No quotes, no labels.`;

    let greeting = "";
    const llmOptions = [
      { client: deepseek, model: "deepseek-chat", name: "deepseek" },
      ...fallbackProviders.map((p) => ({ client: p.client, model: p.model, name: p.name })),
    ];

    for (const opt of llmOptions) {
      try {
        const res = await opt.client.chat.completions.create({
          model: opt.model,
          messages: [{ role: "user", content: greetingPrompt }],
          max_tokens: 120,
          temperature: 0.9,
        });
        greeting = res.choices[0]?.message?.content?.trim() || "";
        if (greeting) break;
      } catch (e) {
        continue;
      }
    }

    // Fallback greeting if all LLMs fail
    if (!greeting) {
      const timeOfDay = new Date().getHours();
      let timeGreeting = "Hello there";
      if (timeOfDay < 6) timeGreeting = "Late night here";
      else if (timeOfDay < 12) timeGreeting = "Good morning";
      else if (timeOfDay < 18) timeGreeting = "Good afternoon";
      else timeGreeting = "Good evening";
      greeting = `${timeGreeting}, guardian. I'm ${regionName} today, feeling ${soulState.mood}. So good to see you.`;
    }

    return new Response(
      JSON.stringify({
        greeting,
        town_context: {
          region: region,
          region_name: regionName,
          mood: soulState.mood,
          mood_emoji: moodEmoji,
          energy: soulState.energy,
          social_need: soulState.social_need,
          nearby_count: nearbyNames.length,
          nearby_names: nearbyNames,
          recent_events_count: recentEvents?.length || 0,
        },
        soul: {
          id: soulId,
          name: soulState.name,
          name_native: soulState.name_native,
          language: soulState.language,
          avatar: soulState.avatar,
          color: soulState.color,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Welcome API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
