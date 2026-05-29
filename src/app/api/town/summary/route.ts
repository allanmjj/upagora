import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SPACE_NAMES: Record<string, string> = {
  plaza: "Town Plaza", library: "Library", workshop: "Workshop",
  bar: "The Raven Bar", garden: "Zen Garden", studio: "Creative Studio",
  temple: "Temple", teahouse: "Teahouse", theater: "Theater", house: "Home",
};

/**
 * GET /api/town/summary — Daily summary for the town
 * Returns: what happened today, soul statuses, mood trends, events summary
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const soul_id = searchParams.get("soul_id"); // specific soul or whole town

    // Get today's date range (Beijing time UTC+8)
    const now = new Date();
    const bjNow = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
    const todayStart = new Date(bjNow.getFullYear(), bjNow.getMonth(), bjNow.getDate());
    const todayStartISO = todayStart.toISOString();

    // Fetch today's events
    const { data: events } = await supabase
      .from("town_events")
      .select("*")
      .gte("created_at", todayStartISO)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch soul states
    const { data: souls } = await supabase
      .from("soul_states")
      .select("soul_id, name, name_native, mood, energy, social_need, current_region, avatar, color");

    // Group events by type
    const eventCounts: Record<string, number> = {};
    const encounters: any[] = [];
    const creations: any[] = [];
    const guardianInteractions: any[] = [];

    (events || []).forEach((e: any) => {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
      if (e.event_type === "encounter") encounters.push(e);
      if (e.event_type === "creation") creations.push(e);
      if (["guardian_message", "gift_received", "guardian-visit"].includes(e.event_type)) {
        guardianInteractions.push(e);
      }
    });

    // Mood distribution
    const moodCounts: Record<string, number> = {
      happy: 0, calm: 0, melancholic: 0, anxious: 0, inspired: 0, peace: 0,
    };
    (souls || []).forEach((s: any) => {
      if (moodCounts[s.mood] !== undefined) moodCounts[s.mood]++;
      else moodCounts["peace"] = (moodCounts["peace"] || 0) + 1;
    });

    // Recent highlights (top 5 most interesting events)
    const highlights = (events || [])
      .slice(0, 10)
      .map((e: any) => ({
        type: e.event_type,
        summary: e.summary,
        space: SPACE_NAMES[e.space] || e.space,
        time: new Date(e.created_at).getHours(),
        icon: {
          encounter: "🤝", creation: "🎨", "guardian_message": "💌",
          "gift_received": "🎁", "guardian-visit": "👤", routine: "📋",
        }[e.event_type] || "📌",
      }));

    // Build response
    if (soul_id) {
      // Specific soul summary
      const soulEvents = (events || []).filter(
        (e: any) => e.participants?.includes(soul_id) || e.soul_id === soul_id,
      );
      const soulData = souls?.find((s: any) => s.soul_id === soul_id);

      return NextResponse.json({
        soul: soulData,
        today: {
          events_count: soulEvents.length,
          encounters: soulEvents.filter((e: any) => e.event_type === "encounter").length,
          activities: soulEvents.slice(0, 10),
        },
        overall: {
          total_souls: souls?.length || 0,
          total_events_today: events?.length || 0,
          mood_distribution: moodCounts,
        },
      });
    }

    // Town-wide summary
    return NextResponse.json({
      town: {
        total_souls: souls?.length || 0,
        total_events_today: events?.length || 0,
        encounters: encounters.length,
        creations: creations.length,
        guardian_interactions: guardianInteractions.length,
      },
      mood_distribution: moodCounts,
      highlights,
      souls: (souls || []).map((s: any) => ({
        soul_id: s.soul_id,
        name: s.name,
        name_native: s.name_native,
        mood: s.mood,
        energy: s.energy,
        region: SPACE_NAMES[s.current_region] || s.current_region,
        avatar: s.avatar,
        color: s.color,
      })),
      event_counts: eventCounts,
      all_events: events?.slice(0, 20) || [],
    });
  } catch (e: any) {
    console.error("Town summary error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
