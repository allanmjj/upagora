import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  calculateGrowth,
  detectNewMilestones,
  MilestoneEvent,
} from "@/lib/soul-growth";

/**
 * POST /api/soul/milestone-check
 *
 * Check and record new milestones for a soul.
 * Call this after any activity that might trigger growth (chat, encounter, etc.).
 *
 * Request body:
 * {
 *   soul_id: string,
 *   user_id: string,
 *   prev_conversations?: number,  // conversations count before this turn
 *   activity: "chat" | "encounter" | "discovery" | "calibration"
 * }
 *
 * Response:
 * {
 *   new_milestones: MilestoneEvent[],
 *   current_growth: { level: number, xp: number, xpToNext: number },
 *   notifications_created: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { soul_id, user_id, prev_conversations, activity = "chat" } = body;

    if (!soul_id || !user_id) {
      return NextResponse.json(
        { error: "soul_id and user_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Load soul data for growth calculation
    const { data: soulData } = await supabase
      .from("soul_extraction_results")
      .select("id, name, avatar, persona_text")
      .eq("id", soul_id)
      .single();

    if (!soulData) {
      return NextResponse.json({ error: "Soul not found" }, { status: 404 });
    }

    // Get current stats from DB
    const { data: stats } = await supabase
      .from("soul_stats")
      .select("conversations, discoveries, days_active, calibration_count, total_events")
      .eq("soul_id", soul_id)
      .single();

    // Fallback if soul_stats doesn't exist
    const currentStats = stats || {
      conversations: 0,
      discoveries: 0,
      days_active: 1,
      calibration_count: 0,
      total_events: 1,
    };

    // Calculate current growth
    const growth = calculateGrowth({
      totalEvents: currentStats.total_events || 1,
      conversations: currentStats.conversations || 0,
      discoveries: currentStats.discoveries || 0,
      giftsReceived: 0,
      giftsGiven: 0,
      calibrations: currentStats.calibration_count || 0,
      daysActive: currentStats.days_active || 1,
    });

    // Use previous conversation count (if provided) for level comparison
    const prevLevelInput = prev_conversations
      ? calculateGrowth({
          totalEvents: currentStats.total_events || 1,
          conversations: prev_conversations,
          discoveries: currentStats.discoveries || 0,
          giftsReceived: 0,
          giftsGiven: 0,
          calibrations: currentStats.calibration_count || 0,
          daysActive: currentStats.days_active || 1,
        })
      : growth;

    const previousStats = {
      conversations: prev_conversations ?? currentStats.conversations,
      discoveries: currentStats.discoveries || 0,
      daysActive: currentStats.days_active || 1,
    };

    // Detect new milestones
    const newEvents: MilestoneEvent[] = detectNewMilestones(
      prevLevelInput.level,
      previousStats,
      growth,
      {
        conversations: currentStats.conversations || 0,
        discoveries: currentStats.discoveries || 0,
        daysActive: currentStats.days_active || 1,
      }
    );

    // Record milestone events to DB
    let notificationsCreated = 0;
    for (const event of newEvents) {
      const { error } = await supabase.from("soul_milestone_events").insert({
        soul_id,
        user_id,
        milestone_id: event.milestoneId,
        milestone_title: event.milestone.title,
        milestone_icon: event.milestone.icon,
        emotion: event.emotion,
        narrative: event.narrative,
        is_level_up: event.isLevelUp,
        level_at_achievement: event.level || growth.level,
      });

      if (error) {
        logger.warn(
          `[milestone-check] Failed to insert milestone event: ${error.message}`
        );
        // Table might not exist yet (migration not deployed) — skip gracefully
        break;
      }
      notificationsCreated++;
    }

    logger.info(
      `[milestone-check] ${soul_id}: ${newEvents.length} new milestones (${activity})`
    );

    return NextResponse.json({
      new_milestones: newEvents.map((e) => ({
        milestone_id: e.milestoneId,
        title: e.milestone.title,
        icon: e.milestone.icon,
        narrative: e.narrative,
        emotion: e.emotion,
        is_level_up: e.isLevelUp,
        level: e.level,
        detected_at: e.detectedAt,
      })),
      current_growth: {
        level: growth.level,
        xp: growth.xp,
        xpToNext: growth.xpToNext,
        progressPercent: growth.progressPercent,
        levelInfo: {
          title: growth.levelInfo.title,
          particle: growth.levelInfo.particle,
          color: growth.levelInfo.color,
        },
      },
      notifications_created: notificationsCreated,
    });
  } catch (error) {
    logger.error(`[milestone-check] Error: ${error}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/soul/milestone-check?soul_id=xxx
 * Get milestone history for a soul.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get("soul_id");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!soulId) {
      return NextResponse.json(
        { error: "soul_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: events, error } = await supabase
      .from("soul_milestone_events")
      .select("*")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn(
        `[milestone-check] Failed to query milestones: ${error.message}`
      );
      return NextResponse.json({ new_milestones: [], current_growth: null });
    }

    return NextResponse.json({
      milestones: (events || []).map((e: any) => ({
        milestone_id: e.milestone_id,
        title: e.milestone_title,
        icon: e.milestone_icon,
        narrative: e.narrative,
        emotion: e.emotion,
        is_level_up: e.is_level_up,
        level: e.level_at_achievement,
        detected_at: e.created_at,
      })),
    });
  } catch (error) {
    logger.error(`[milestone-check GET] Error: ${error}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
