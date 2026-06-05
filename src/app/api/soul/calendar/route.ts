import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { generateDefaultSchedule, getDayPhase, type SoulProfile, type ScheduleSlot } from "@/lib/soul-schedule-engine";
import { KNOWN_CONSTRAINTS_MAP } from "@/lib/soul-constraint-loader";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Enhanced Soul Calendar API
 *
 * Combines:
 * 1. Soul's default daily schedule (from schedule engine + 8D constraints)
 * 2. Conversation pattern analysis (best interaction times)
 * 3. Historical activity data
 * 4. Mood/energy forecast
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soulId = searchParams.get("soul_id");
    const view = searchParams.get("view") || "month"; // day | week | month

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (soulId) {
      // Fetch soul constraints for personality-driven schedule
      const constraints = KNOWN_CONSTRAINTS_MAP[soulId] || null;

      // Build a SoulProfile from constraints
      const profile: SoulProfile = {
        id: soulId,
        name: constraints?.soul_name || "Soul",
        name_native: constraints?.soul_name || "Soul",
        mood: "calm",
        energy: 70,
        era: constraints?.era_name,
        education: constraints?.education,
        skills: constraints?.knowledge_floor || [],
        personality: {
          openness: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          neuroticism: 0.5,
        },
      };

      // Generate personality-based schedule
      const schedule = generateDefaultSchedule(profile);

      // Get conversation history for pattern analysis
      const { data: conversations } = await supabase
        .from("conversation_messages")
        .select("created_at, role, content")
        .eq("soul_id", soulId)
        .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .limit(500);

      const pattern = analyzeConversationPattern(conversations || []);

      // Get soul calendar events from DB (if soul_schedule table exists)
      const { data: scheduleEvents } = await supabase
        .from("soul_schedule")
        .select("*")
        .eq("soul_id", soulId)
        .gte("scheduled_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100)
        .order("scheduled_at", { ascending: false });

      // Generate calendar events combining schedule + interaction windows
      const calendarEvents = generateCalendarEvents(schedule, pattern, scheduleEvents || [], now, view);

      return jsonResp(200, {
        soul_id: soulId,
        soul_name: constraints?.soul_name || "Unknown Soul",
        schedule,
        pattern,
        historical_events: (scheduleEvents || []).slice(0, 20),
        events: calendarEvents,
        view,
      });
    }

    // Overview: list all souls with brief schedule summary
    const { data: souls } = await supabase
      .from("town_souls")
      .select("id, name, name_native, category")
      .limit(50);

    if (!souls?.length) {
      return jsonResp(200, { souls: [] });
    }

    const soulCalendars = await Promise.all(
      souls.map(async (soul) => {
        const constraints = KNOWN_CONSTRAINTS_MAP[soul.id] || null;
        const profile: SoulProfile = {
          id: soul.id,
          name: soul.name,
          name_native: soul.name_native || soul.name,
          mood: "calm",
          energy: 70,
          era: constraints?.era_name,
          skills: constraints?.knowledge_floor || [],
        };
        const schedule = generateDefaultSchedule(profile);
        return { soul, schedule };
      })
    );

    return jsonResp(200, { souls: soulCalendars });
  } catch (err) {
    logger.error("[soul-calendar] Error:", err);
    return jsonResp(500, { error: "Internal server error" });
  }
}

function analyzeConversationPattern(conversations: any[]) {
  if (!conversations.length) {
    return {
      avgConversationsPerDay: 0,
      preferredHourOfDay: 14,
      preferredDayOfWeek: 3,
      avgMessageLength: 50,
      emotionalTrend: "neutral",
      topicsFrequency: {},
    };
  }

  const hours: number[] = [];
  const daysOfWeek: number[] = [];
  let totalWords = 0;
  const dateBucket: Record<string, number> = {};

  conversations.forEach((msg) => {
    const date = new Date(msg.created_at);
    hours.push(date.getHours());
    daysOfWeek.push(date.getDay());

    if (msg.role === "user") {
      totalWords += (msg.content || "").split(/\s+/).length;
      const dateStr = date.toISOString().split("T")[0];
      dateBucket[dateStr] = (dateBucket[dateStr] || 0) + 1;
    }
  });

  const hourCounts: Record<number, number> = {};
  hours.forEach((h) => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const preferredHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 14;

  const dayCounts: Record<number, number> = {};
  daysOfWeek.forEach((d) => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
  const preferredDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 3;

  return {
    avgConversationsPerDay: Object.values(dateBucket).reduce((a, b) => a + b, 0) / 90 || 1,
    preferredHourOfDay: parseInt(String(preferredHour)),
    preferredDayOfWeek: parseInt(String(preferredDay)),
    avgMessageLength: Math.round(totalWords / (conversations.filter((c) => c.role === "user").length || 1)),
    emotionalTrend: "neutral",
    topicsFrequency: {},
  };
}

function generateCalendarEvents(
  schedule: ScheduleSlot[],
  pattern: any,
  historicalEvents: any[],
  now: Date,
  view: string
): any[] {
  const events: any[] = [];
  const daysToShow = view === "day" ? 1 : view === "week" ? 7 : 30;

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    // Calculate interaction score
    let score = 0.5;
    if (dayOfWeek === pattern.preferredDayOfWeek) score += 0.2;
    const weekendMult = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;
    score *= weekendMult;

    let type: string;
    let priority: "low" | "medium" | "high";
    let reason: string;

    if (score > 0.8) {
      type = "deep_conversation";
      priority = "high";
      reason = "High interaction probability — optimal for deep conversation";
    } else if (score > 0.6) {
      type = "check_in";
      priority = "medium";
      reason = "Medium probability — good for a casual check-in";
    } else {
      type = "quiet_reflection";
      priority = "low";
      reason = "Low probability — suitable for quiet reflection";
    }

    events.push({
      date: dateStr,
      dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
      interaction: {
        type,
        priority,
        score,
        bestTime: `${String(pattern.preferredHourOfDay).padStart(2, "0")}:00`,
        reason,
      },
      // Add the soul's daily schedule for this day
      daily_schedule: schedule.map(s => ({
        ...s,
        phase_label: {
          dawn: "🌅 Dawn",
          morning: "☀️ Morning",
          midday: "🌞 Midday",
          afternoon: "🌤️ Afternoon",
          dusk: "🌇 Dusk",
          night: "🌙 Night",
        }[s.phase],
      })),
    });
  }

  return events;
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
