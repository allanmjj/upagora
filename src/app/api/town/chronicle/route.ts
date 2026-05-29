import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SPACE_NAMES: Record<string, string> = {
  plaza: "Town Plaza",
  library: "Library",
  workshop: "Workshop",
  bar: "The Raven Bar",
  garden: "Zen Garden",
  studio: "Creative Studio",
  house: "Home",
  temple: "Temple",
  teahouse: "Teahouse",
  theater: "Theater",
};

const EVENT_ICONS: Record<string, string> = {
  era: "🌅",
  season: "🌸",
  "soul-arrival": "✨",
  arrival: "✨",
  encounter: "🤝",
  conversation: "🗣️",
  creation: "🎨",
  guardian-visit: "👤",
  visit: "👤",
  routine: "📋",
  other: "📌",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || "all";

    // Fetch town_events
    let query = supabase
      .from("town_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type !== "all") {
      query = query.eq("event_type", type);
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich events with readable names
    const chronicle = (events || []).map((e: any) => {
      const icon = EVENT_ICONS[e.event_type] || EVENT_ICONS.other;
      const spaceName = SPACE_NAMES[e.space] || e.space || "";

      // Extract soul names from participants if available
      let title = e.summary || "";
      if (e.event_type === "encounter" && e.participants && e.participants.length >= 2) {
        title = `${e.participants[0]} and ${e.participants[1]} had an encounter`;
      }

      return {
        id: e.id,
        type: e.event_type,
        title: title || `${e.event_type} event`,
        description: e.summary || "",
        epoch_date: new Date(e.created_at).toLocaleDateString(),
        icon,
        timestamp: e.created_at,
        space: spaceName,
        participants: e.participants || [],
      };
    });

    // Get summary stats
    const { count: totalEvents } = await supabase
      .from("town_events")
      .select("*", { count: "exact", head: true });

    const { count: uniqueEncounters } = await supabase
      .from("town_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "encounter");

    const { count: totalCreations } = await supabase
      .from("town_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "creation");

    return NextResponse.json({
      chronicle,
      stats: {
        total_events: totalEvents || 0,
        encounters: uniqueEncounters || 0,
        creations: totalCreations || 0,
      },
    });
  } catch (e: any) {
    console.error("Chronicle API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
