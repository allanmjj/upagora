import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

export async function GET() {
  // Fetch active souls with their states
  const { data: souls, error: soulsError } = await supabase
    .from("town_souls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (soulsError) {
    logger.error("Failed to fetch souls:", soulsError.message);
    return NextResponse.json({ souls: [], states: [], error: soulsError.message });
  }

  // Fetch states for each soul
  const states = await Promise.all(
    (souls || []).map(async (soul) => {
      const { data: state } = await supabase
        .from("town_soul_states")
        .select("*")
        .eq("soul_id", soul.id)
        .maybeSingle();
      return state;
    })
  );

  // Combine into the format the town page expects
  const townSouls = (souls || []).map((soul, i) => {
    const state = states[i] || {};
    // Pre-compute canvas positions based on region
    const regionPositions: Record<string, { x: number; y: number }> = {
      plaza: { x: 400, y: 300 },
      library: { x: 200, y: 100 },
      workshop: { x: 700, y: 100 },
      bar: { x: 150, y: 500 },
      garden: { x: 650, y: 400 },
      teahouse: { x: 550, y: 500 },
    };
    const pos = regionPositions[(state as any)?.current_region || "plaza"] || { x: 400, y: 300 };
    const variance = i * 37; // Spread souls slightly apart
    return {
      id: soul.id,
      name: soul.name,
      name_native: soul.name_native,
      language: soul.language,
      category: soul.category,
      avatar: soul.avatar,
      color: soul.color,
      mood: (state as any)?.mood || "calm",
      energy: (state as any)?.energy ?? 100,
      social_need: (state as any)?.social_need ?? 50,
      current_region: (state as any)?.current_region || "plaza",
      today_events_count: (state as any)?.today_events_count ?? 0,
      speed: 0.3 + Math.random() * 0.3,
    };
  });

  return NextResponse.json({
    souls: townSouls,
    states: states,
    count: townSouls.length,
  });
}
