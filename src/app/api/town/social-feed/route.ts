import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { rateLimiter } from "@/lib/rate-limiter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/town/social-feed - Get social feed of soul interactions
export async function GET(request: Request) {
  const rateLimited = await rateLimiter(request);
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get("soul_id");
    const limit = parseInt(searchParams.get("limit") || "30");
    const type = searchParams.get("type") || "all";

    let query = supabase
      .from("town_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by type
    if (type !== "all") {
      query = query.eq("event_type", type);
    }

    // Filter by soul if specified
    if (soulId) {
      query = query.or(`metadata->soul_id.eq.${soulId},participants.cs.{${soulId}}`);
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform events into social feed items
    const feedItems = (events || []).map((e: any) => {
      const iconMap: Record<string, string> = {
        "chat": "💬",
        "encounter": "🤝",
        "creation": "🎨",
        "ceremony": "🙏",
        "socialize": "👥",
        "explore": "🗺️",
        "guardian_visit": "👤",
        "rest": "💤",
      };

      const soulNames = e.participants || [];

      return {
        id: e.id,
        type: e.event_type || "chat",
        icon: iconMap[e.event_type] || "📌",
        souls: soulNames,
        description: e.summary || `${soulNames.join(" & ")} did something`,
        location: e.space || "plaza",
        timestamp: e.created_at,
        isGuardianAction: e.metadata?.source === "guardian_action",
      };
    });

    return NextResponse.json({
      feed: feedItems,
      hasMore: feedItems.length === limit,
    });
  } catch (err: any) {
    logger.error("Social feed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
