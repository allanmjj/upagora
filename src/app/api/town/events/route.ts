import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/town/events - 获取最近小镇事件
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type") || null;
  const space = searchParams.get("space") || null;

  let query = supabase
    .from("town_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("event_type", type);
  if (space) query = query.eq("space", space);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}

// POST /api/town/events - 手动触发小镇模拟 tick
export async function POST(request: NextRequest) {
  const { action } = await request.json();

  if (action === "tick") {
    return await tick();
  } else if (action === "report") {
    const { soulId } = await request.json();
    return await generateReport(soulId);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function tick() {
  try {
    const { data: souls } = await supabase
      .from("soul_states")
      .select("*, soul_extraction_results:soul_id(id, name, avatar, language, persona_text)")
      .eq("is_in_town", true);

    if (!souls || souls.length === 0) {
      return NextResponse.json({ message: "No active souls", events: [] });
    }

    const events: any[] = [];

    for (const soul of souls) {
      const mood = soul.mood;
      const energy = soul.energy;
      const social_need = soul.social_need;

      // Decide next location based on mood + energy
      let nextLocation = decideLocation(mood, energy, social_need);

      // Find nearby souls
      const nearbySouls = souls.filter(
        (s: any) => s.soul_id !== soul.soul_id && s.current_location === nextLocation
      );

      if (nearbySouls.length > 0 && Math.random() < 0.4 && social_need > 40) {
        // Trigger conversation
        const otherSoul = nearbySouls[Math.floor(Math.random() * nearbySouls.length)];
        const event = await generateConversation(
          soul.soul_extraction_results,
          otherSoul.soul_extraction_results,
          mood,
          otherSoul.mood,
          nextLocation
        );

        if (event) {
          await supabase.from("town_events").insert(event);
          events.push(event);
        }

        // Update states
        await supabase.from("soul_states").upsert({
          soul_id: soul.soul_id,
          social_need: Math.max(0, social_need - 20),
          energy: Math.max(0, energy - 10),
          current_location: nextLocation,
          last_heartbeat: new Date().toISOString(),
        });

        await supabase.from("soul_states").upsert({
          soul_id: otherSoul.soul_id,
          social_need: Math.max(0, otherSoul.social_need - 20),
          energy: Math.max(0, otherSoul.energy - 10),
          current_location: nextLocation,
          last_heartbeat: new Date().toISOString(),
        });
      } else {
        // Just move
        await supabase.from("soul_states").upsert({
          soul_id: soul.soul_id,
          energy: Math.max(0, energy - 5),
          social_need: Math.min(100, social_need + 3),
          current_location: nextLocation,
          last_heartbeat: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${souls.length} souls, ${events.length} events generated.`,
      events,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function decideLocation(mood: string, energy: number, social_need: number): string {
  if (mood === "melancholic") return "garden";
  if (mood === "happy" && social_need > 60) return "plaza";
  if (mood === "happy") return "bar";
  if (mood === "anxious") return "workshop";
  if (mood === "inspired") return Math.random() > 0.5 ? "library" : "studio";
  // calm
  return Math.random() > 0.5 ? "plaza" : "garden";
}

async function generateConversation(soulA: any, soulB: any, moodA: string, moodB: string, location: string): Promise<any | null> {
  try {
    const openai = (await import("openai")).OpenAI;
    const deepseek = new openai({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });

    const prompt = `Two souls are meeting at the ${location}:
- ${soulA?.name} (${moodA} mood, language: ${soulA?.language})
- ${soulB?.name} (${moodB} mood, language: ${soulB?.language})

Generate a brief, natural conversation (2-4 exchanges) between them.
Each soul speaks in their native language. Keep it authentic to their personalities.

Return ONLY valid JSON:
{
  "topic": "brief topic",
  "exchanges": [
    {"speaker": "name", "line": "what they said", "language": "zh/en"}
  ],
  "excerpt": "one memorable quote"
}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      event_type: "conversation",
      space: location,
      content: parsed,
      summary: parsed.excerpt || parsed.topic || "A conversation between two souls.",
      is_public: true,
    };
  } catch (e) {
    console.error("LLM conversation failed:", e);
    return null;
  }
}

async function generateReport(soulId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: soulData } = await supabase
    .from("soul_states")
    .select("*, soul_extraction_results:soul_id(id, name, avatar, language)")
    .eq("soul_id", soulId)
    .single();

  const { data: todayEvents } = await supabase
    .from("town_events")
    .select("*")
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: true });

  const moodEmoji: Record<string, string> = {
    happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨",
  };

  const highlights = (todayEvents || []).map((ev: any) => ({
    type: ev.event_type,
    summary: ev.summary,
    time: ev.created_at,
  }));

  const moodSummary = `${moodEmoji[soulData?.mood] || "😐"} ${soulData?.soul_extraction_results?.name || "Soul"} is feeling ${soulData?.mood || "calm"} today. ${highlights.length} activities happened.`;

  const report = {
    soul_id: soulId,
    report_date: today,
    mood_summary: moodSummary,
    highlights,
    agd_earned: 0,
  };

  await supabase.from("daily_soul_reports").insert(report);

  return NextResponse.json({ report });
}
