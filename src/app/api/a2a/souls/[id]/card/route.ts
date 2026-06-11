import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { generateAgentCard } from "@/lib/a2a/card";
import { SOUL_LEVELS } from "@/lib/soul-growth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/a2a/souls/[id]/card
 *
 * Return the full Agent Card for a specific soul.
 * This is the canonical A2A agent discovery endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get soul data
    const { data: soul, error: soulErr } = await supabase
      .from("soul_gallery")
      .select(
        "id, name, name_native, description, persona_text, avatar_url, guardian_id, created_at",
      )
      .eq("id", id)
      .single();

    if (soulErr || !soul) {
      return NextResponse.json(
        { error: "Soul not found", code: -32601 },
        { status: 404 },
      );
    }

    // Get growth data (level)
    const { data: growthData } = await supabase
      .from("soul_growth")
      .select("level, xp")
      .eq("soul_id", soul.id)
      .single();

    const level = growthData?.level || 1;
    const levelInfo =
      SOUL_LEVELS.find((l) => l.level === level) || SOUL_LEVELS[0];

    // Get dimensions
    const { data: dimensions } = await supabase
      .from("soul_dimensions")
      .select("dimension, score")
      .eq("soul_id", soul.id);

    const dimMap: Record<string, number> = {};
    for (const d of dimensions || []) {
      dimMap[d.dimension] = d.score;
    }

    // Get guardian info
    let guardianName: string | undefined;
    if (soul.guardian_id) {
      const { data: guardian } = await supabase
        .from("guardians")
        .select("name")
        .eq("id", soul.guardian_id)
        .single();
      guardianName = guardian?.name;
    }

    // Generate the Agent Card
    const card = generateAgentCard({
      soulId: soul.id,
      name: soul.name || "Soul",
      nameNative: soul.name_native || undefined,
      description: soul.description || undefined,
      personaText: soul.persona_text || undefined,
      level,
      levelTitle: levelInfo?.title_zh || levelInfo?.title || "Spark",
      dimensions: dimMap,
      guardianId: soul.guardian_id || undefined,
      guardianName,
      isShared: false, // Could add is_shared field later
      status: "available",
    });

    return NextResponse.json(card);
  } catch (err) {
    logger.error("A2A agent card error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: -32603 },
      { status: 500 },
    );
  }
}
