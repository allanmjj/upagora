import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// ─── GET /api/town/events ─── 获取最近小镇事件
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type") || null;

  let query = supabase
    .from("town_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq("event_type", type);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}

// ─── GET /api/town/souls ─── 获取所有小镇灵魂
export async function getSoul(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const is_active = searchParams.get("active") === "true";

  let query = supabase
    .from("soul_states")
    .select(`
      *,
      soul_extraction_results!inner(id, name, avatar, language, persona_text)
    `);

  if (is_active) {
    query = query.eq("is_in_town", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ souls: data || [] });
}

// ─── POST /api/town/tick ─── 手动触发自 ticker
// Town simulator 每 30 秒执行一次
export async function POST_tick(req: NextRequest) {
  try {
    // Get active souls
    const { data: souls } = await supabase
      .from("soul_states")
      .select("*, soul_extraction_results:id(id, name, avatar, language, persona_text)")
      .eq("is_in_town", true);

    if (!souls || souls.length === 0) {
      return NextResponse.json({ message: "No active souls" });
    }

    const events: any[] = [];

    // For each soul, decide what they do next
    for (const soul of souls) {
      const mood = soul.mood;
      const energy = soul.energy;
      const social_need = soul.social_need;

      // Decide new location based on mood + personality
      let nextLocation = soul.current_location;
      if (mood === "melancholic") {
        nextLocation = "garden"; // Qui
      } else if (mood === "happy") {
        nextLocation = "plaza"; // Go social
      } else if (mood === "anxious") {
        nextLocation = "workshop"; // Focus on work
      } else if (mood === "inspired") {
        nextLocation = Math.random() > 0.5 ? "library" : "studio";
      } else {
        // Calm - random social or quiet
        nextLocation = Math.random() > 0.5 ? "plaza" : "garden";
      }

      // Check if any other soul is at the same location
      const nearbySouls = souls.filter(
        (s: any) => s.soul_id !== soul.soul_id && s.current_location === nextLocation
      );

      if (nearbySouls.length > 0 && Math.random() < 0.4 && soul.social_need > 40) {
        // Trigger conversation!
        const otherSoul = nearbySouls[Math.floor(Math.random() * nearbySouls.length)];

        const prompt = `
Two souls are meeting at the ${nextLocation}:
- ${soul.soul_extraction_results?.name} (${mood} mood, ${soul.soul_extraction_results?.language})
- ${otherSoul.soul_extraction_results?.name} (${otherSoul.mood} mood, ${otherSoul.soul_extraction_results?.language})

Generate a brief, natural conversation (2-4 exchanges) between them.
Each soul speaks in their native language. Keep it authentic to their personalities.

Return ONLY valid JSON:
{
  "topic": "brief topic",
  "exchanges": [
    {"speaker": "name", "line": "what they said", "language": "zh/en/etc"}
  ],
  "excerpt": "one memorable quote from the chat"
}`;

        try {
          const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.8,
          });

          const parsed = JSON.parse(response.choices[0].message.content || "{}");

          const event = {
            event_type: "conversation",
            space: nextLocation,
            content: parsed,
            summary: parsed.excerpt || parsed.topic || "A conversation between two souls.",
            is_public: true,
          };

          await supabase.from("town_events").insert(event);
          events.push(event);

          // Update soul states
          await supabase
            .from("soul_states")
            .upsert({
              soul_id: soul.soul_id,
              social_need: Math.max(0, social_need - 20),
              energy: Math.max(0, energy - 10),
              current_location: nextLocation,
              last_heartbeat: new Date().toISOString(),
            });

          await supabase
            .from("soul_states")
            .upsert({
              soul_id: otherSoul.soul_id,
              social_need: Math.max(0, otherSoul.social_need - 20),
              energy: Math.max(0, otherSoul.energy - 10),
              current_location: nextLocation,
              last_heartbeat: new Date().toISOString(),
            });
        } catch (e) {
          logger.error("LLM call failed:", e);
        }
      } else {
        // Just move without conversation
        await supabase
          .from("soul_states")
          .upsert({
            soul_id: soul.soul_id,
            energy: Math.max(0, energy - 5),
            social_need: Math.min(100, social_need + 3),
            current_location: nextLocation,
            last_heartbeat: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({
      message: `Processed ${souls.length} souls, ${events.length} events generated`,
      events,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── GET /api/town/report/[soulId] ─── 每日灵魂报告
export async function getReport(req: NextRequest, { params }: any) {
  const soulId = params.soulId;
  const today = new Date().toISOString().split("T")[0];

  // Check if report already exists for today
  const { data: existing } = await supabase
    .from("daily_soul_reports")
    .select("*")
    .eq("soul_id", soulId)
    .eq("report_date", today)
    .single();

  if (existing) {
    return NextResponse.json({ report: existing });
  }

  // Generate report from today's events
  const { data: soulData } = await supabase
    .from("soul_states")
    .select("*, soul_extraction_results:id(id, name, avatar, language)")
    .eq("soul_id", soulId)
    .single();

  const { data: todayEvents } = await supabase
    .from("town_events")
    .select("*")
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: true });

  const moodEmoji: Record<string, string> = {
    happy: "😊",
    calm: "😌",
    melancholic: "😔",
    anxious: "😟",
    inspired: "✨",
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
    highlights: highlights,
    agd_earned: 0,
  };

  await supabase.from("daily_soul_reports").insert(report);

  return NextResponse.json({ report });
}
