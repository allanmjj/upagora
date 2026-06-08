import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { logger } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

const REGION_NAMES: Record<string, string> = {
  plaza: "Town Plaza", library: "Library", workshop: "Workshop",
  bar: "The Raven Bar", garden: "Zen Garden", studio: "Creative Studio",
};

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨",
};

// ─── GET: Fetch chronicles ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soulId = searchParams.get("soul_id");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const limit = parseInt(searchParams.get("limit") || "7");

  if (!soulId) {
    return NextResponse.json({ error: "soul_id required" }, { status: 400 });
  }

  let query = supabase
    .from("daily_chronicles")
    .select("*")
    .eq("soul_id", soulId)
    .order("date", { ascending: false })
    .limit(limit);

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query;
  if (error) {
    logger.info("daily_chronicles table not ready:", error.message);
    return NextResponse.json({ chronicles: [] });
  }

  return NextResponse.json({ chronicles: data || [] });
}

// ─── POST: Generate daily chronicle ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, date } = body;
    const targetDate = date || new Date().toISOString().split("T")[0];

    if (!soul_id) {
      return NextResponse.json({ error: "soul_id required" }, { status: 400 });
    }

    // 1. Look up soul
    const { data: soulState } = await supabase
      .from("town_soul_states")
      .select("*, town_souls!inner(*)")
      .eq("soul_id", soul_id)
      .single();

    if (!soulState) {
      return NextResponse.json({ error: "soul not found" }, { status: 404 });
    }

    const soul = soulState.town_souls;
    const personality = soul.personality_dims || {};
    const mood = soulState.mood || "calm";
    const energy = soulState.energy ?? 50;
    const region = REGION_NAMES[soulState.current_region] || "Town Plaza";

    // 2. Fetch today's events
    const { data: todayEvents } = await supabase
      .from("town_events")
      .select("*")
      .gte("created_at", `${targetDate}T00:00:00`)
      .lte("created_at", `${targetDate}T23:59:59`)
      .limit(20);

    const eventsSummary = (todayEvents || [])
      .map((e: any) => {
        const exchanges = e.content?.exchanges || [];
        const dialogue = exchanges
          .map((x: any) => `${x.speaker}: "${x.line}"`)
          .join("\n");
        return `[${e.space || "unknown"}] ${e.summary || e.event_type || "event"}\n${dialogue}`;
      })
      .join("\n\n")
      .slice(0, 2000);

    // 3. Call LLM
    const prompt = `You are writing the Genesis Chronicle — a poetic daily journal entry for a soul named "${soul.name}" living in Soul Town.

Today: ${targetDate}
Soul's mood: ${mood} ${MOOD_EMOJI[mood] || ""}
Energy: ${energy}/100
Current region: ${region}
Personality: curiosity ${personality.curiosity ?? 50}, extroversion ${personality.extroversion ?? 50}, creativity ${personality.creativity ?? 50}

Today's events in town:
${eventsSummary || "(A quiet day with no major events. The soul spent time in introspection.)"}

Write a beautiful, concise chronicle entry (4-6 sentences) capturing:
- Where the soul wandered
- Key conversations or moments
- What the soul felt or learned
- A reflective ending

Return ONLY valid JSON:
{
  "entry": "the full chronicle text (4-6 sentences, poetic but personal)",
  "quote": "one reflective one-liner the soul leaves for their guardian",
  "mood": "overall word for the day: peaceful, adventurous, bittersweet, joyful, contemplative, restless",
  "highlights": ["event 1 short label", "event 2 short label"]
}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.9,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");

    // 4. Store chronicle
    const { error: insertError } = await supabase.from("daily_chronicles").insert({
      soul_id,
      soul_name: soul.name,
      date: targetDate,
      entry: parsed.entry || "A quiet day in the town.",
      quote: parsed.quote || "",
      mood: parsed.mood || "peaceful",
      highlights: parsed.highlights || [],
    });

    if (insertError) {
      logger.info("daily_chronicles insert failed:", insertError.message);
    }

    return NextResponse.json({
      chronicle: {
        ...parsed,
        soul_name: soul.name,
        date: targetDate,
      },
    });
  } catch (e: any) {
    logger.error("Chronicle generation failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
