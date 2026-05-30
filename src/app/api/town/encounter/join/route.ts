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
  // @ts-expect-error — DeepSeek-specific option
  fallbackToFirstAppropriateKey: true,
});

const fallbackProviders = [
  {
    name: "openrouter",
    client: new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "sk-placeholder",
    }),
    model: "deepseek/deepseek-chat",
  },
  ...(process.env.ANTHROPIC_API_KEY ? [{
    name: "anthropic",
    client: new OpenAI({
      baseURL: "https://api.anthropic.com/v1",
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
    model: "claude-3-5-sonnet-20241022",
  }] : []),
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

/**
 * GET /api/town/encounter?status=live|recent
 * List encounters — live ones happening now, or recent ones from today.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "recent";

    const { data: encounters } = await supabase
      .from("town_events")
      .select("*")
      .eq("event_type", "encounter")
      .order("created_at", { ascending: false });

    if (!encounters || encounters.length === 0) {
      return NextResponse.json({ encounters: [] });
    }

    // If status is live, only return encounters from the last hour
    const results =
      status === "live"
        ? encounters.filter((e: any) => {
            const created = new Date(e.created_at);
            const now = new Date();
            return now.getTime() - created.getTime() < 3600000; // 1 hour
          })
        : encounters.slice(0, 20);

    // Enrich with soul names
    const enriched = results.map((e: any) => {
      const participants = e.participants || [];
      const spaceName = SPACE_NAMES[e.space] || e.space;
      return {
        id: e.id,
        space: e.space,
        space_name: spaceName,
        participants,
        participant_names: (e.content as any)?.participant_names || participants,
        summary: e.summary,
        conversation_count: (e.content as any)?.conversation?.length || 0,
        created_at: e.created_at,
        is_live:
          new Date().getTime() - new Date(e.created_at).getTime() < 3600000,
      };
    });

    return NextResponse.json({ encounters: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/town/encounter/join
 * Guardian joins an ongoing encounter conversation.
 * Body: { event_id, message }
 * The guardian's message is injected into the conversation,
 * and the souls respond in character.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error) {
      return new Response(JSON.stringify({ error: authRes.error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const guardianId = authRes.data.user.id;
    const body = await req.json();
    const { event_id, message } = body;

    if (!event_id || !message) {
      return new Response(
        JSON.stringify({ error: "event_id and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch the encounter event
    const { data: event, error: eventError } = await supabase
      .from("town_events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Encounter not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const participants = event.participants || [];
    const existingConversation = (event.content as any)?.conversation || [];
    const space = event.space || "plaza";
    const spaceName = SPACE_NAMES[space] || space;

    // Load soul personas
    const personas: { name: string; persona_text: string; mood: string }[] = [];
    for (const soulId of participants) {
      const { data: state } = await supabase
        .from("soul_states")
        .select("mood")
        .eq("soul_id", soulId)
        .single();

      const { data: profile } = await supabase
        .from("soul_extraction_results")
        .select("name, persona_text")
        .eq("id", soulId)
        .single();

      if (profile) {
        personas.push({
          name: profile.name || soulId,
          persona_text: profile.persona_text || "",
          mood: state?.mood || "calm",
        });
      }
    }

    // Build conversation context
    const conversationContext = existingConversation
      .map((t: any) => `${t.speaker}: ${t.text}`)
      .join("\n");

    // Generate soul response to guardian's message
    const responsePrompt = `You are a creative writer. In this scene, two souls are having a conversation at ${spaceName}. A guardian (their loved one watching from afar) has just sent a message into the conversation: "${message}"

The souls can sense the guardian's presence. They should respond naturally, as if the guardian spoke to them.

Souls:
${personas.map((p) => `${p.name} (mood: ${p.mood}):\n${p.persona_text.slice(0, 500)}`).join("\n\n")}

Conversation so far:
${conversationContext || "(This is the start of the conversation)"}

Guardian says: "${message}"

Generate 2-4 lines of response from the souls. They might:
- Acknowledge the guardian
- Share thoughts with them
- Continue their own conversation with the guardian interwoven

Return ONLY a JSON array: [{ speaker, text }]. The speaker should be one of the soul names. At most 4 lines total.`;

    let soulResponses: any[] = [];
    const llmOptions = [
      { client: deepseek, model: "deepseek-chat", name: "deepseek" },
      ...fallbackProviders.map((p) => ({
        client: p.client,
        model: p.model,
        name: p.name,
      })),
    ];

    for (const opt of llmOptions) {
      try {
        const res = await (opt as any).chat.completions.create({
          model: opt.model,
          messages: [{ role: "user", content: responsePrompt }],
          temperature: 0.9,
          max_tokens: 600,
        });
        const content = res.choices[0]?.message?.content?.trim() || "";
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            soulResponses = parsed;
            break;
          }
        }
      } catch (e) {
        // Continue to next provider
        continue;
      }
    }

    // Fallback response if all LLMs fail
    if (!soulResponses.length) {
      soulResponses = personas.map((p) => ({
        speaker: p.name,
        text: `Hey guardian! We felt you join us. I'm feeling ${p.mood} today at the ${spaceName}.`,
      }));
    }

    // Save guardian message to event
    const updatedConversation = [
      ...existingConversation,
      { speaker: "Guardian", text: message },
      ...soulResponses,
    ];

    await supabase
      .from("town_events")
      .update({
        content: {
          ...event.content,
          conversation: updatedConversation,
          guardian_joined_at: new Date().toISOString(),
          guardian_id: guardianId,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", event_id);

    // Record guardian visit
    await supabase.from("town_guardian_visits").insert({
      guardian_id: guardianId,
      encounter_id: event_id,
      action: "joined_conversation",
      message,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        responses: soulResponses,
        conversation_so_far: updatedConversation,
        encounter: {
          id: event_id,
          space: space,
          space_name: spaceName,
          participants,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Encounter join error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
