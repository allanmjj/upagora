import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Soul Calendar API
 *
 * Analyzes conversation patterns and generates a personalized calendar
 * showing the \"best times\" to interact with each soul based on historical data.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResp(401, { error: "Missing auth" });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return jsonResp(401, { error: "Not authenticated" });
    }
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const soulId = searchParams.get("soul_id");

    if (soulId) {
      // Return calendar for a specific soul
      const calendar = await generateSoulCalendar(soulId, userId);
      return jsonResp(200, { calendar });
    } else {
      // Return calendar overview for all souls
      const { data: souls } = await supabase
        .from("town_souls")
        .select("id, name, name_native, guardian_id, category")
        .or(`guardian_id.eq.${userId},status.eq.active`)
        .limit(50);

      if (!souls?.length) {
        return jsonResp(200, { souls: [] });
      }

      const calendars = await Promise.all(
        souls.map((soul) => generateSoulCalendar(soul.id, userId))
      );

      return jsonResp(200, {
        souls: souls.map((soul, index) => ({
          ...soul,
          calendar: calendars[index],
        })),
      });
    }
  } catch (err) {
    console.error("[soul-calendar] Error:", err);
    return jsonResp(500, { error: "Internal server error" });
  }
}

async function generateSoulCalendar(soulId: string, userId: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Get conversation history (last 90 days)
  const { data: conversations } = await supabase
    .from("conversation_messages")
    .select("created_at, role, content")
    .eq("soul_id", soulId)
    .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(500);

  // Analyze conversation patterns
  const pattern = analyzeConversationPattern(conversations || []);

  // Generate calendar events for next 30 days
  const events: any[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    // Create daily interaction window based on patterns
    const window = createInteractionWindow(pattern, dayOfWeek, i === 0);

    if (window.shouldInteract) {
      events.push({
        date: dateStr,
        type: window.type,
        priority: window.priority,
        bestTime: window.bestTime,
        suggestedTopics: window.suggestedTopics,
        reason: window.reason,
      });
    }
  }

  return {
    soul_id: soulId,
    pattern,
    events: events.slice(0, 10), // Return top 10 recommended events
    nextBestWindow: events.length > 0 ? events[0] : null,
  };
}

function analyzeConversationPattern(conversations: any[]) {
  if (!conversations.length) {
    return {
      avgConversationsPerDay: 0,
      preferredHourOfDay: 14, // 2 PM default
      preferredDayOfWeek: 3, // Wednesday default
      avgMessageLength: 50,
      emotionalTrend: "neutral",
      topicsFrequency: {},
    };
  }

  // Analyze time patterns
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

  // Find preferred hour (mode of hours)
  const hourCounts: Record<number, number> = {};
  hours.forEach((h) => {
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const preferredHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 14;

  // Find preferred day of week
  const dayCounts: Record<number, number> = {};
  daysOfWeek.forEach((d) => {
    daysOfWeek[d] = (daysOfWeek[d] || 0) + 1;
  });
  const preferredDay = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 3;

  return {
    avgConversationsPerDay: Object.values(dateBucket).reduce((a, b) => a + b, 0) / 90 || 1,
    preferredHourOfDay: parseInt(String(preferredHour)),
    preferredDayOfWeek: parseInt(String(preferredDay)),
    avgMessageLength: Math.round(totalWords / (conversations.filter((c) => c.role === "user").length || 1)),
    emotionalTrend: "neutral", // This would need NLP analysis
    topicsFrequency: {}, // Would need topic extraction
  };
}

function createInteractionWindow(
  pattern: ReturnType<typeof analyzeConversationPattern>,
  dayOfWeek: number,
  isToday: boolean
) {
  // Calculate interaction score based on patterns
  let score = 0.5;

  // Bonus for preferred day
  if (dayOfWeek === pattern.preferredDayOfWeek) {
    score += 0.2;
  }

  // Bonus for daily rhythm variation
  const dayOfWeekMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;
  score *= dayOfWeekMultiplier;

  // Interaction type based on timing
  let type: string;
  let priority: "low" | "medium" | "high";
  let reason: string;

  if (score > 0.8) {
    type = "deep_conversation";
    priority = "high";
    reason = "高互动概率 — 现在是深度对话的好时机";
  } else if (score > 0.6) {
    type = "check_in";
    priority = "medium";
    reason = "中等互动概率 — 适合日常问候";
  } else {
    type = "quiet_reflection";
    priority = "low";
    reason = "低互动概率 — 适合安静反思";
  }

  // Generate suggested topics based on pattern
  const suggestedTopics = generateSuggestedTopics(type, pattern);

  return {
    shouldInteract: score > 0.4,
    score,
    type,
    priority,
    bestTime: `${String(pattern.preferredHourOfDay).padStart(2, "0")}:00`,
    suggestedTopics,
    reason,
  };
}

function generateSuggestedTopics(type: string, pattern: any) {
  switch (type) {
    case "deep_conversation":
      return [
        "深入探讨最近思考的人生课题",
        "分享新学到的知识或感悟",
        "讨论价值观选择",
        "回顾过去的里程碑",
      ];
    case "check_in":
      return [
        "简单问候，了解近况",
        "分享日常生活片段",
        "轻松话题，聊聊兴趣",
        "感谢上次的回应",
      ];
    case "quiet_reflection":
      return [
        "记录今天的感悟",
        "写下未来一周的计划",
        "表达对灵魂的感谢",
        "简单地存在就好",
      ];
    default:
      return ["简单的互动就好"];
  }
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
