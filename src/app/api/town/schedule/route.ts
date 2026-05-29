import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimiter } from "@/lib/rate-limiter";
import {
  advanceSoul,
  getDayPhase,
  generateDefaultSchedule,
  updateMood,
  decayMemories,
  createActivity,
  type SoulState,
} from "@/lib/soul-schedule-engine";
import {
  simulateDay,
  findGroups,
  getSocialFeed,
  type SoulNetwork,
} from "@/lib/soul-social-network";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Load soul profiles from database
async function loadSoulsWithProfiles(): Promise<
  { profile: any; state: SoulState }[]
> {
  const { data: souls, error: soulsErr } = await supabase
    .from("town_souls")
    .select("id, name, personality, is_active");

  if (soulsErr || !souls?.length) {
    return [];
  }

  const soulList = souls.filter((s) => s.is_active);

  const results: { profile: any; state: SoulState }[] = [];

  for (const soul of soulList) {
    const { data: stateRow } = await supabase
      .from("town_soul_states")
      .select("energy, mood, current_region, social_need")
      .eq("soul_id", soul.id)
      .single();

    const profile = {
      id: soul.id,
      name: soul.name,
      ...soul.personality,
    };

    let state: SoulState = stateRow
      ? {
          soulId: soul.id,
          energy: stateRow.energy ?? 60,
          mood: stateRow.mood ?? "calm",
          socialNeeds: {
            social: 50,
            creative: 50,
            reflection: 50,
          },
          schedule: [],
          memoryBank: [],
        }
      : {
          soulId: soul.id,
          energy: 60,
          mood: "calm",
          socialNeeds: { social: 50, creative: 50, reflection: 50 },
          schedule: [],
          memoryBank: [],
        };

    // Generate default schedule if not exists
    if (!state.schedule || !state.schedule.length) {
      state.schedule = generateDefaultSchedule(profile);
    }

    results.push({ profile, state });
  }

  return results;
}

// GET /api/town/schedule — Get current schedule status
export async function GET(request: Request) {
  try {
    const { data: timeData } = await supabase
      .from("town_time")
      .select("current_hour, current_day")
      .single();

    const townHour = timeData?.current_hour ?? 12;
    const townDay = timeData?.current_day ?? 1;
    const souls = await loadSoulsWithProfiles();

    const scheduleStatus = souls.map(({ profile, state }) => {
      const currentSlot = state.schedule.find(
        (s) => townHour >= s.hour && townHour < s.hour + 4
      );

      return {
        soulId: profile.id,
        soulName: profile.name,
        currentPhase: getDayPhase(townHour),
        currentActivity: currentSlot?.preferredActivity || "rest",
        currentLocation: currentSlot?.preferredLocation || "house",
        energy: state.energy,
        mood: state.mood,
        socialNeeds: state.socialNeeds,
      };
    });

    return NextResponse.json({
      townHour,
      townDay,
      phase: getDayPhase(townHour),
      souls: scheduleStatus,
    });
  } catch (err: any) {
    console.error("Schedule GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/town/schedule/advance — Advance town time by 1 tick
export async function POST(request: Request) {
  const rateLimited = await rateLimiter(request);
  if (rateLimited) return rateLimited;

  try {
    // Check auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error) {
      return NextResponse.json(
        { error: authRes.error.message },
        { status: 401 },
      );
    }

    const { data: timeData } = await supabase
      .from("town_time")
      .select("current_hour, current_day")
      .single();

    let townHour = timeData?.current_hour ?? 12;
    let townDay = timeData?.current_day ?? 1;

    // Advance time by 1 tick (4 hours per tick = 6 ticks per day)
    townHour = (townHour + 4) % 24;

    let newDay = townDay;
    if (townHour === 4) {
      // Day boundary
      newDay = townDay + 1;
      // Decay memories
      const souls = await loadSoulsWithProfiles();
      for (const { state } of souls) {
        state.memoryBank = decayMemories(state.memoryBank, 1);
      }

      // Daily social simulation
      const soulIds = souls.map((s) => s.profile.id);
      await simulateDay({}, soulIds);
    }

    // Update town time
    await supabase.from("town_time").upsert({
      current_hour: townHour,
      current_day: newDay,
    });

    // Advance each soul
    const souls = await loadSoulsWithProfiles();
    const activities = [];

    for (const { profile, state } of souls) {
      const newState = advanceSoul(profile, state, townHour);

      // Update energy/mood in DB
      await supabase.from("town_soul_states").upsert(
        {
          soul_id: profile.id,
          energy: newState.energy,
          mood: newState.mood,
        },
        { onConflict: "soul_id" },
      );

      // Record activity
      const currentSlot = newState.schedule.find(
        (s) => townHour >= s.hour && townHour < s.hour + 4,
      );
      if (currentSlot) {
        const activity = createActivity(profile, currentSlot.preferredActivity);
        activities.push(activity);

        // Store activity in town_events
        await supabase.from("town_events").insert({
          event_type: currentSlot.preferredActivity,
          participants: [profile.name],
          summary: activity.description,
          space: currentSlot.preferredLocation,
          metadata: { source: "schedule_engine" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      townHour,
      townDay: newDay,
      phase: getDayPhase(townHour),
      activitiesAdvanced: activities.length,
    });
  } catch (err: any) {
    console.error("Schedule advance error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
