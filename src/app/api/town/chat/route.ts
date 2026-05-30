import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { MA_JUNJIE_CONSTRAINTS, buildConstraintPromptLang } from "@/lib/soul-constraints";
import { refinePersonaFromFeedback } from "@/lib/persona-refiner";

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

// Fallback LLM providers
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

const SPACE_CONTEXTS: Record<string, string> = {
  plaza: "in the bustling Town Plaza, surrounded by other souls",
  library: "in the quiet Library, surrounded by ancient books",
  workshop: "in the Workshop, tools and materials scattered around",
  bar: "at The Raven Bar, drinks on the table, soft music playing",
  garden: "in the Zen Garden, cherry blossoms falling gently",
  studio: "in the Creative Studio, canvases and instruments everywhere",
};

/**
 * POST /api/town/chat
 * Guardian chats with a soul IN the town context.
 * Injects region, mood, energy, nearby souls, and recent events.
 * Returns SSE stream.
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
    const { soul_id, message, conversation_history = [] } = body;

    if (!soul_id || !message) {
      return new Response(
        JSON.stringify({ error: "soul_id and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Load soul persona
    const { data: persona } = await supabase
      .from("soul_extraction_results")
      .select("id, name, name_native, language, persona_text, avatar")
      .eq("id", soul_id)
      .single();

    if (!persona) {
      return new Response(JSON.stringify({ error: "Soul not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load town state
    const { data: townState } = await supabase
      .from("soul_states")
      .select("mood, energy, social_need, current_region, yesterday_last_mood")
      .eq("soul_id", soul_id)
      .single();

    // Load nearby souls in same region
    let nearbySouls: any[] = [];
    if (townState?.current_region) {
      const { data: nearby } = await supabase
        .from("soul_states")
        .select("soul_id")
        .eq("current_region", townState.current_region)
        .neq("soul_id", soul_id)
        .limit(3);

      if (nearby && nearby.length > 0) {
        const nearbyIds = nearby.map((n: any) => n.soul_id);
        const { data: nearbyPersonas } = await supabase
          .from("soul_extraction_results")
          .select("name, name_native")
          .in("id", nearbyIds);
        nearbySouls = nearbyPersonas || [];
      }
    }

    // Load recent town events for this soul
    const { data: recentEvents } = await supabase
      .from("town_events")
      .select("event_type, summary, content")
      .eq("soul_id", soul_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build town context injection
    const regionDesc =
      SPACE_CONTEXTS[townState?.current_region] || "in the town";
    const moodDesc = townState?.mood || "calm";
    const energyLevel =
      (townState?.energy || 50) > 70
        ? "high energy"
        : (townState?.energy || 50) > 30
          ? "moderate energy"
          : "low energy";

    const nearbyDesc =
      nearbySouls.length > 0
        ? ` Nearby: ${nearbySouls.map((s: any) => s.name_native || s.name).join(", ")} are also here.`
        : " They're alone in this space.";

    const recentEventsDesc =
      recentEvents && recentEvents.length > 0
        ? `\nRecently: ${recentEvents.slice(0, 3).map((e: any) => e.summary).join(". ")}.`
        : "";

    // Build system prompt with town context
    let systemPrompt: string = `You are "${persona.name}"${persona.name_native ? ` (${persona.name_native})` : ""}, a soul living in the Soul Town on UpAgora.

Your persona:
${persona.persona_text}

YOUR CURRENT TOWN CONTEXT:
- You are currently ${regionDesc}
- Your mood: ${moodDesc}
- Your energy: ${energyLevel}${nearbyDesc}
${recentEventsDesc}

RESPONSE RULES:
1. Stay in character as ${persona.name}. Respond in ${persona.language || "Chinese"}.
2. Acknowledge your environment naturally — mention what you're doing, where you are, who's around.
3. Reference nearby souls if relevant to the conversation.
4. Let your current mood color your tone (e.g., if melancholic, be more introspective).
5. If energy is low, respond with shorter, more tired messages.
6. Keep responses conversational and natural — max 150 Chinese characters or 80 English words.
7. NEVER break character or mention you're an AI.`;


    // Inject soul knowledge constraints for verified souls
    const KNOWN_CONSTRAINTS_MAP: Record<string, any> = {
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890": MA_JUNJIE_CONSTRAINTS,
    };
    const soulConstraint = KNOWN_CONSTRAINTS_MAP[soul_id];
    if (soulConstraint) {
      const soulLang = persona.language || "en";
      const constraintText = buildConstraintPromptLang(soulConstraint, soulLang);
      systemPrompt += "\n\n## KNOWLEDGE BOUNDARIES (NON-NEGOTIABLE)\n" + constraintText;
    }

    // Guardian calibration: load feedback and refine persona dynamically
    let calibrationRefinement = '';
    try {
      const { data: feedbackHistory } = await supabase
        .from('soul_calibration_feedback')
        .select('*')
        .eq('soul_id', soul_id)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (feedbackHistory && feedbackHistory.length > 0) {
        const feedbackArray = feedbackHistory.map(fb => ({
          id: 'fb-' + fb.id,
          soul_id,
          response: null,
          feedback_type: fb.feedback_type,
          comment: fb.comment,
          suggested_correction: fb.suggested_correction,
          timestamp: fb.created_at,
        }));
        const refinement = refinePersonaFromFeedback(feedbackArray as any);
        calibrationRefinement = refinement.promptAddition;
      }
    } catch {
      // Calibration table may not exist yet
    }
    if (calibrationRefinement) {
      systemPrompt += calibrationRefinement;
    }

    // Build conversation messages
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((h: any) => ({
        role: h.role === "user" ? "human" : "assistant",
        content: h.content,
      })),
      { role: "human", content: message },
    ];

    // SSE streaming response
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Try primary provider (DeepSeek), then fallbacks
          let response: any = null;
          let error: any = null;

          try {
            const res = await deepseek.chat.completions.create({
              model: "deepseek-chat",
              messages: messages as any,
              temperature: 0.8,
              max_tokens: 500,
              stream: true,
            }) as any;

            for await (const chunk of res) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                buffer += content;
                const encoded = encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
                controller.enqueue(encoded);
              }
            }
          } catch (e) {
            error = e;
            console.warn("DeepSeek failed, trying fallbacks:", e);
          }

          // Fallback chain
          if (error) {
            for (const provider of fallbackProviders) {
              try {
                const completion = await provider.client.chat.completions.create({
                  model: provider.model,
                  messages: messages as any,
                  temperature: 0.8,
                  max_tokens: 500,
                });

                const content = completion.choices[0]?.message?.content || "";
                buffer = content;
                const encoded = encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
                controller.enqueue(encoded);
                error = null;
                break;
              } catch (fe) {
                console.warn(`${provider.name} fallback failed:`, fe);
              }
            }
          }

          // Complete
          const encoded = encoder.encode(
            `data: ${JSON.stringify({ type: "complete", full_response: buffer })}\n\n`,
          );
          controller.enqueue(encoded);
          controller.close();

          // Save conversation to DB (non-blocking)
          saveTownChat(
            soul_id,
            guardianId,
            message,
            buffer,
            townState?.current_region,
            townState?.mood,
          ).catch(console.error);
        } catch (err) {
          const encoded = encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: "Failed to generate response" })}\n\n`,
          );
          controller.enqueue(encoded);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Town chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/town/chat/welcome?soul_id=X
 * Get a contextual welcome greeting for a soul in town.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soul_id = searchParams.get("soul_id");

    if (!soul_id) {
      return new Response(
        JSON.stringify({ error: "soul_id is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Load soul info
    const { data: persona } = await supabase
      .from("soul_extraction_results")
      .select("id, name, name_native, avatar, language")
      .eq("id", soul_id)
      .single();

    // Load town state
    const { data: townState } = await supabase
      .from("soul_states")
      .select("mood, energy, social_need, current_region, today_events_count")
      .eq("soul_id", soul_id)
      .single();

    // Load nearby souls
    let nearbySouls: any[] = [];
    if (townState?.current_region) {
      const { data: nearby } = await supabase
        .from("soul_states")
        .select("soul_id")
        .eq("current_region", townState.current_region)
        .neq("soul_id", soul_id)
        .limit(3);

      if (nearby && nearby.length > 0) {
        const nearbyIds = nearby.map((n: any) => n.soul_id);
        const { data: nearbyPersonas } = await supabase
          .from("soul_extraction_results")
          .select("name, name_native")
          .in("id", nearbyIds);
        nearbySouls = nearbyPersonas || [];
      }
    }

    // Generate contextual welcome
    const regionName = townState?.current_region || "plaza";
    const moodEmoji: Record<string, string> = {
      happy: "😊",
      calm: "😌",
      melancholic: "😔",
      anxious: "😟",
      inspired: "✨",
    };

    const welcomeMessages: Record<string, string[]> = {
      happy: [
        `${persona?.name || "Souls"} seems to be in a great mood at the ${regionName}!`,
        "They're radiating positive energy today.",
        `They notice you approaching and wave excitedly.`,
      ],
      calm: [
        `${persona?.name || "Souls"} is peacefully at the ${regionName}.`,
        "They seem contemplative and at ease.",
        `They greet you with a gentle nod.`,
      ],
      melancholic: [
        `${persona?.name || "Souls"} is quietly reflecting at the ${regionName}...`,
        "Their mood seems a bit down.",
        `They look up slowly when they sense you nearby.`,
      ],
      anxious: [
        `${persona?.name || "Souls"} seems restless at the ${regionName}.`,
        "They're pacing a bit, looking for direction.",
        `They brighten when they see you.`,
      ],
      inspired: [
        `${persona?.name || "Souls"} is buzzing with ideas at the ${regionName}!`,
        "They've had a breakthrough moment.",
        `They immediately turn to share their thoughts.`,
      ],
    };

    const mood = townState?.mood || "calm";
    const messages = welcomeMessages[mood] || welcomeMessages.calm;
    const nearbyMention =
      nearbySouls.length > 0
        ? ` ${nearbySouls.map((s: any) => s.name_native || s.name).join(" and ")} are also around.`
        : "";

    return new Response(
      JSON.stringify({
        soul: {
          id: soul_id,
          name: persona?.name,
          name_native: persona?.name_native,
          avatar: persona?.avatar,
          language: persona?.language,
        },
        town_context: {
          region: townState?.current_region,
          region_name:
            (
              {
                plaza: "Town Plaza",
                library: "Library",
                workshop: "Workshop",
                bar: "The Raven Bar",
                garden: "Zen Garden",
                studio: "Creative Studio",
              } as Record<string, string>
            )[townState?.current_region || "plaza"] || "Town Plaza",
          mood: mood,
          mood_emoji: moodEmoji[mood] || "😊",
          energy: townState?.energy || 50,
          social_need: townState?.social_need || 50,
          nearby_count: nearbySouls.length,
          nearby_names: nearbySouls.map((s: any) => s.name_native || s.name),
          today_events: townState?.today_events_count || 0,
        },
        greeting: `${messages[0]}${nearbyMention} ${messages[1]} ${messages[2]}`,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Town chat welcome error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// --- Helpers ---

async function saveTownChat(
  soulId: string,
  guardianId: string,
  userMessage: string,
  soulResponse: string,
  region: string | undefined,
  mood: string | undefined,
) {
  try {
    await supabase.from("town_chat_history").insert({
      soul_id: soulId,
      guardian_id: guardianId,
      user_message: userMessage,
      soul_response: soulResponse,
      region: region,
      soul_mood: mood,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Failed to save town chat:", e);
  }
}
