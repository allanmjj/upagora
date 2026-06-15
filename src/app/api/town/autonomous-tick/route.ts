import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { simulatorTick } from '@/lib/town-simulator';
import {
  generateDefaultSchedule,
  advanceSoul,
  createActivity,
  type SoulProfile,
  type SoulState,
  type ActivityType,
} from '@/lib/soul-schedule-engine';
import { SOUL_LEVELS, XP_SOURCES } from '@/lib/soul-growth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Constants ──────────────────────────────────────────────────────
const MAX_LEVEL = 6; // soul_growth table CHECK constraint

/**
 * POST /api/town/autonomous-tick
 *
 * Triggers one complete town simulation tick (4 town-hours advance):
 * 1. Advance town time
 * 2. Update each soul's mood, energy, schedule
 * 3. Generate autonomous activities
 * 4. Run encounter simulator (souls in same region interact)
 * 5. Award XP for activities/encounters → check level-ups
 * 6. Record events to town_events
 *
 * Called by Hermes cron every 4 real hours.
 * Also callable manually with TOWN_AUTONOMY_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check: Bearer token (manual), x-vercel-cron (Vercel cron), x-hermes-cron (Hermes cron)
    const authHeader = req.headers.get('authorization');
    const secret = process.env.TOWN_AUTONOMY_SECRET;
    const isVercelCron = !!req.headers.get('x-vercel-cron');
    const isHermesCron = !!req.headers.get('x-hermes-cron');
    const hasValidBearer = authHeader && authHeader === `Bearer ${secret}`;

    if (secret && !isVercelCron && !isHermesCron && !hasValidBearer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await runAutonomousTick();

    return NextResponse.json({
      ok: true,
      souls_processed: results.length,
      events_created: results.reduce((s, r) => s + (r.events?.length || 0), 0),
      level_ups: results.filter((r: any) => r.leveledUp).length,
    });
  } catch (err: any) {
    logger.error('Autonomous tick failed:', err);
    return NextResponse.json({ error: err?.message || 'Tick failed' }, { status: 500 });
  }
}

// ─── Core tick logic ────────────────────────────────────────────────

async function runAutonomousTick(): Promise<any[]> {
  const results: any[] = [];

  // 1. Load active souls
  const { data: souls, error: soulsErr } = await supabase
    .from('town_souls')
    .select('id, name, name_native, personality_dims, is_active, era, education, skills, language')
    .eq('is_active', true)
    .limit(100);

  if (soulsErr || !souls?.length) {
    logger.error('Failed to load souls:', soulsErr);
    return results;
  }

  // 2. Load growth records
  const { data: growthRecords } = await supabase
    .from('soul_growth')
    .select('soul_id, level, xp')
    .in('soul_id', souls.map((s: any) => s.id));

  const growthMap = new Map<string, { level: number; xp: number }>();
  for (const g of growthRecords || []) {
    growthMap.set(g.soul_id, { level: g.level || 1, xp: g.xp || 0 });
  }

  // 3. Current town time
  const { data: townTime } = await supabase
    .from('town_time')
    .select('current_hour, current_day')
    .single();

  const currentHour = townTime?.current_hour ?? 12;
  const nextHour = (currentHour + 4) % 24;
  const nextDay = nextHour < currentHour ? (townTime?.current_day ?? 0) + 1 : (townTime?.current_day ?? 0);

  // 4. Process each soul independently
  const activityEvents: any[] = [];
  const levelUps: string[] = [];

  for (const soul of souls) {
    const growth = growthMap.get(soul.id) || { level: 1, xp: 0 };
    const soulProfile: SoulProfile = {
      id: soul.id,
      name: soul.name_native || soul.name || 'Soul',
      mood: 'calm',
      energy: 50,
      era: soul.era,
      education: soul.education,
      skills: soul.skills,
      personality: soul.personality_dims || {
        openness: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        neuroticism: 0.5,
      },
    };

    const soulState: SoulState = {
      soulId: soul.id,
      energy: 50,
      mood: 'calm',
      schedule: generateDefaultSchedule(soulProfile),
      memoryBank: [],
      socialNeeds: { social: 50, creative: 30, reflection: 20 },
    };

    // Advance soul through schedule
    const newState = advanceSoul(soulProfile, soulState, currentHour);

    // Determine current activity
    const currentSlot = newState.schedule.find(
      (s) => currentHour >= s.hour && currentHour < s.hour + 4
    );

    if (!currentSlot) continue;

    const activity = createActivity(soulProfile, currentSlot.preferredActivity as ActivityType, {
      location: currentSlot.preferredLocation,
    });

    // Calculate XP
    const xpGain = calculateActivityXP(currentSlot.preferredActivity, growth.level);
    const newXp = growth.xp + xpGain;
    const nextLevelInfo = SOUL_LEVELS.find((l) => l.level === growth.level + 1);
    const leveledUp = nextLevelInfo && newXp >= nextLevelInfo.xpRequired && growth.level < MAX_LEVEL;

    // Update growth (upsert)
    await supabase.from('soul_growth').upsert(
      {
        soul_id: soul.id,
        level: leveledUp ? Math.min(growth.level + 1, MAX_LEVEL) : growth.level,
        xp: leveledUp ? newXp - (nextLevelInfo?.xpRequired || 0) : newXp,
      },
      { onConflict: 'soul_id' }
    );

    if (leveledUp) levelUps.push(soul.id);

    // Record activity event (town_events schema: event_type, space, content, summary, is_public)
    activityEvents.push({
      event_type: activity.type,
      space: activity.location,
      content: {
        soul_id: soul.id,
        soul_name: soulProfile.name,
        activity_type: activity.type,
        xp_gained: xpGain,
      },
      summary: activity.description,
      is_public: true,
    });

    results.push({
      soulId: soul.id,
      name: soulProfile.name,
      activity: activity.description,
      leveledUp,
      xp_gain: xpGain,
    });
  }

  // 5. Batch insert activity events
  if (activityEvents.length > 0) {
    await supabase.from('town_events').insert(activityEvents);
  }

  // 6. Run encounter simulator (souls in same region interact)
  const encounterEvents = await simulatorTick();

  // Award XP for encounters
  for (const evt of encounterEvents) {
    if (evt.participants) {
      for (const participantId of evt.participants) {
        const encounterXp = XP_SOURCES.conversation || 10;

        const { data: current } = await supabase
          .from('soul_growth')
          .select('xp, level')
          .eq('soul_id', participantId)
          .single();

        if (current) {
          const newXp = current.xp + encounterXp;
          const nextLevelInfo = SOUL_LEVELS.find((l) => l.level === current.level + 1);
          const leveledUp = nextLevelInfo && newXp >= nextLevelInfo.xpRequired && current.level < MAX_LEVEL;

          await supabase.from('soul_growth').update({
            xp: leveledUp ? newXp - nextLevelInfo.xpRequired : newXp,
            level: leveledUp ? Math.min(current.level + 1, MAX_LEVEL) : current.level,
          }).eq('soul_id', participantId);

          if (leveledUp) levelUps.push(participantId);
        }
      }
    }
  }

  // 7. Advance town time
  await supabase.from('town_time').upsert({
    current_hour: nextHour,
    current_day: nextDay,
    updated_at: new Date().toISOString(),
  });

  return results;
}

/**
 * XP earned from an activity, with diminishing returns at higher levels.
 */
function calculateActivityXP(activityType: string, level: number): number {
  const baseXp: Record<string, number> = {
    rest: 2, work: 8, socialize: 5, create: 10,
    explore: 7, reflect: 6, wander: 3, guardian_visit: 10, ceremony: 12,
  };

  const base = baseXp[activityType] || XP_SOURCES.event_participated || 3;
  const multiplier = 1 - (level - 1) * 0.1; // 10% less per level
  return Math.max(1, Math.round(base * multiplier));
}
