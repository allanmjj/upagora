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
});

// POST /api/town/report - Generate daily report for a soul
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soulId } = body;

    if (!soulId) {
      return NextResponse.json({ error: "soulId is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if report already exists
    const { data: existing } = await supabase
      .from("daily_soul_reports")
      .select("*")
      .eq("soul_id", soulId)
      .eq("report_date", today)
      .single();

    if (existing) {
      return NextResponse.json({ report: existing });
    }

    // Load soul data
    const { data: soulState } = await supabase
      .from("soul_states")
      .select("*")
      .eq("soul_id", soulId)
      .single();

    const { data: soulData } = await supabase
      .from("soul_extraction_results")
      .select("id, name, avatar, language, persona_text")
      .eq("id", soulId)
      .single();

    if (!soulState) {
      return NextResponse.json({ error: "Soul state not found" }, { status: 404 });
    }

    const soulName = soulData?.name || "Unknown Soul";
    const moodEmoji: Record<string, string> = {
      happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨",
    };

    // Load today's events
    const { data: todayEvents } = await supabase
      .from("town_events")
      .select("*")
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: true });

    const highlights = (todayEvents || []).map((ev: any) => ({
      type: ev.event_type,
      summary: ev.summary || "Activity in town",
      time: ev.created_at,
    }));

    // Generate mood summary using LLM
    const moodSummary = await generateMoodSummary(soulState, soulName, highlights);

    const report = {
      soul_id: soulId,
      report_date: today,
      mood_summary: moodSummary,
      highlights: highlights,
      agd_earned: 0,
    };

    // Save report
    await supabase.from("daily_soul_reports").insert(report);

    return NextResponse.json({ report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function generateMoodSummary(state: any, name: string, highlights: any[]): Promise<string> {
  const moodAdjectives: Record<string, [string, string]> = {
    happy: ["glorious", "filled with joy"],
    calm: ["peaceful", "thoughtful"],
    melancholic: ["reflective", "contemplative"],
    anxious: ["busy", "urgently productive"],
    inspired: ["creative", "brimming with ideas"],
  };

  const [adj1, adj2] = moodAdjectives[state.mood] || ["quiet", "unusual"];

  if (highlights.length === 0) {
    return `${name} had a quiet ${adj1} day with ${adj2} moments. The town was peaceful and ${name.toLowerCase()} found time for introspection. A calm day can be just as meaningful as an active one.`;
  }

  const activityCount = highlights.length;
  const conversations = highlights.filter(h => h.type === "conversation").length;
  const creativeWorks = highlights.filter(h => h.type === "creative_work").length;

  let summary = `${name} had a ${adj1} day — ${adj2} and ${state.mood}. `;

  if (conversations > 0) {
    summary += `Had ${conversations} conversation${conversations > 1 ? 's' : ''} with fellow souls in town. `;
  }
  if (creativeWorks > 0) {
    summary += `Created ${creativeWorks} piece${creativeWorks > 1 ? 's' : ''} of creative work. `;
  }

  if (activityCount > 3) {
    summary += `A very active day with ${activityCount} events total — ${name.split(' ')[0]} is thriving!`;
  } else {
    summary += `The day had ${activityCount} significant moments.`;
  }

  return summary;
}
