/**
 * Server-side milestone detection helper.
 * Used by both chat route and milestone-check API to avoid duplication.
 */

import { calculateGrowth, detectNewMilestones, SOUL_LEVELS } from "@/lib/soul-growth";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface MilestoneCheckInput {
  soulId: string;
  userId: string;
  prevConversations?: number;
  activity: "chat" | "encounter" | "discovery" | "calibration";
}

export async function checkAndRecordMilestones(input: MilestoneCheckInput) {
  const { soulId, userId, prevConversations, activity } = input;

  try {
    const supabase = await createClient();

    // Load soul stats
    const { data: stats } = await supabase
      .from("soul_stats")
      .select("conversations, discoveries, days_active, calibration_count, total_events")
      .eq("soul_id", soulId)
      .single();

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

    // Calculate previous growth for comparison
    const prevGrowth = calculateGrowth({
      totalEvents: currentStats.total_events || 1,
      conversations: prevConversations ?? currentStats.conversations,
      discoveries: currentStats.discoveries || 0,
      giftsReceived: 0,
      giftsGiven: 0,
      calibrations: currentStats.calibration_count || 0,
      daysActive: currentStats.days_active || 1,
    });

    // Detect new milestones
    const newEvents = detectNewMilestones(
      prevGrowth.level,
      { conversations: prevConversations ?? currentStats.conversations, discoveries: currentStats.discoveries || 0, daysActive: currentStats.days_active || 1 },
      growth,
      { conversations: currentStats.conversations || 0, discoveries: currentStats.discoveries || 0, daysActive: currentStats.days_active || 1 }
    );

    // Record to DB
    for (const event of newEvents) {
      const { error } = await supabase.from("soul_milestone_events").insert({
        soul_id: soulId,
        user_id: userId,
        milestone_id: event.milestoneId,
        milestone_title: event.milestone.title,
        milestone_icon: event.milestone.icon,
        emotion: event.emotion,
        narrative: event.narrative,
        is_level_up: event.isLevelUp,
        level_at_achievement: event.level || growth.level,
      });

      if (error) {
        logger.warn(`[milestone-check] Failed to insert: ${error.message}`);
        break;
      }
    }

    if (newEvents.length > 0) {
      logger.info(`[milestone-check] ${soulId}: ${newEvents.length} new milestones (${activity})`);
    }

    return {
      new_milestones: newEvents,
      current_growth: growth,
    };
  } catch (error) {
    logger.warn(`[milestone-check] Error: ${error}`);
    return { new_milestones: [], current_growth: null };
  }
}
