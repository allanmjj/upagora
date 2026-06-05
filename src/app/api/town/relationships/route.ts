import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/town/relationships — Get soul relationship network
 * Query: ?soul_id=uuid (optional, filter by specific soul)
 *
 * Returns: list of relationships with connection strength, interaction history,
 * and relationship type (friend, acquaintance, stranger, mentor, etc.)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const soul_id = searchParams.get("soul_id");

    // Fetch soul_states to get all soul names
    const { data: souls } = await supabase
      .from("soul_states")
      .select("soul_id, name, name_native, mood, current_region, avatar, color");

    // Build soul lookup
    const soulMap = new Map();
    (souls || []).forEach((s: any) => {
      soulMap.set(s.soul_id, {
        id: s.soul_id,
        name: s.name,
        name_native: s.name_native,
        mood: s.mood,
        region: s.current_region,
        avatar: s.avatar,
        color: s.color,
      });
    });

    // Fetch soul_relationships if table exists
    let relationships: any[] = [];
    try {
      const { data } = await supabase
        .from("soul_relationships")
        .select("*");
      if (data) relationships = data;
    } catch {
      // Table doesn't exist yet, derive from encounters
      const { data: encounters } = await supabase
        .from("town_events")
        .select("*")
        .eq("event_type", "encounter")
        .order("created_at", { ascending: false })
        .limit(200);

      // Derive relationships from encounters
      const pairMap = new Map();
      (encounters || []).forEach((e: any) => {
        if (e.participants && e.participants.length >= 2) {
          const pair = [e.participants[0], e.participants[1]]
            .sort()
            .join("::");
          if (!pairMap.has(pair)) {
            pairMap.set(pair, { soul1_id: e.participants[0], soul2_id: e.participants[1], interaction_count: 0, total_encounters: 0, shared_spaces: [] as string[] });
          }
          const entry = pairMap.get(pair);
          entry.interaction_count++;
          entry.total_encounters++;
          if (e.space && !entry.shared_spaces.includes(e.space)) {
            entry.shared_spaces.push(e.space);
          }
        }
      });
      relationships = Array.from(pairMap.values());
    }

    // Enrich relationships with soul data
    const enriched = relationships
      .map((r: any) => {
        const s1 = soulMap.get(r.soul1_id);
        const s2 = soulMap.get(r.soul2_id);
        if (!s1 || !s2) return null;

        // Determine relationship type based on interaction count
        const count = r.interaction_count || r.total_encounters || 0;
        let rel_type: string;
        if (count >= 10) rel_type = "close_friends";
        else if (count >= 5) rel_type = "friends";
        else if (count >= 2) rel_type = "acquaintances";
        else rel_type = "strangers";

        // Calculate a "closeness" score (0-100)
        const closeness = Math.min(100, count * 10);

        // Find shared spaces
        const sharedSpaces = r.shared_spaces || [];
        const lastInteraction = r.last_interaction_at || r.updated_at;

        return {
          soul_a: { id: r.soul1_id, name: s1.name, name_native: s1.name_native, avatar: s1.avatar, mood: s1.mood },
          soul_b: { id: r.soul2_id, name: s2.name, name_native: s2.name_native, avatar: s2.avatar, mood: s2.mood },
          relationship_type: rel_type,
          interaction_count: count,
          closeness,
          sharedSpaces,
          last_interaction: lastInteraction,
        };
      })
      .filter(Boolean);

    // Filter by soul_id if provided
    let filtered = enriched;
    if (soul_id) {
      filtered = enriched.filter((r: any) => r.soul_a.id === soul_id || r.soul_b.id === soul_id);
    }

    // Calculate network stats
    const totalPairs = enriched.length;
    const avgInteractions = totalPairs > 0 ? Math.round(enriched.reduce((sum: number, r: any) => sum + r.interaction_count, 0) / totalPairs * 10) / 10 : 0;
    const maxCloseness = enriched.length > 0 ? Math.max(...enriched.map((r: any) => r.closeness)) : 0;

    return NextResponse.json({
      network: {
        total_souls: souls?.length || 0,
        total_pairs: totalPairs,
        avg_interactions: avgInteractions,
        strongest_bond: maxCloseness,
      },
      relationships: filtered,
    });
  } catch (e: any) {
    logger.error("Relationships API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
