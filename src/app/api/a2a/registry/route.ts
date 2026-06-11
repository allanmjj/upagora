import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import {
  RegistryQuery,
  RegistryResult,
  SoulAgentCardSummary,
} from "@/lib/a2a/protocol";
import { generateAgentCardSummary, LEVEL_SKILL_MAP } from "@/lib/a2a/card";
import { SOUL_LEVELS } from "@/lib/soul-growth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/a2a/registry
 *
 * Discover available souls in the Soul Town.
 * Query params: q, minLevel, skills, status, sharedOnly, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: RegistryQuery = {
      q: searchParams.get("q") || undefined,
      minLevel: searchParams.get("minLevel")
        ? parseInt(searchParams.get("minLevel")!)
        : undefined,
      skills: searchParams.get("skills")?.split(",") || undefined,
      status: (searchParams.get("status") as any) || undefined,
      sharedOnly: searchParams.get("sharedOnly") === "true",
      limit: searchParams.get("limit")
        ? Math.min(parseInt(searchParams.get("limit")!), 100)
        : 20,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
    };

    // Build base query on soul_gallery
    let soulQuery = supabase
      .from("soul_gallery")
      .select(
        `
        id, name, name_native, description, persona_text, avatar_url,
        guardian_id, created_at
      `,
        { count: "exact" },
      );

    // Filter: shared only
    if (query.sharedOnly) {
      soulQuery = soulQuery.eq("is_shared", true);
    }

    // Execute query
    const { data: souls, error, count } = await soulQuery
      .range(query.offset!, query.offset! + (query.limit || 20) - 1)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("A2A registry query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch soul registry" },
        { status: 500 },
      );
    }

    // Transform to Agent Card Summaries
    const agents: SoulAgentCardSummary[] = [];

    for (const soul of souls || []) {
      // Try to get soul growth data (level)
      const { data: growthData } = await supabase
        .from("soul_growth")
        .select("level, xp")
        .eq("soul_id", soul.id)
        .single();

      const level = growthData?.level || 1;
      const levelInfo = SOUL_LEVELS.find((l) => l.level === level) || SOUL_LEVELS[0];

      // Get unlocked skill IDs
      const skillIds = LEVEL_SKILL_MAP[level] || ["chat"];

      // Get guardian name
      let guardianName: string | undefined;
      if (soul.guardian_id) {
        const { data: guardian } = await supabase
          .from("guardians")
          .select("name")
          .eq("id", soul.guardian_id)
          .single();
        guardianName = guardian?.name;
      }

      agents.push({
        soulId: soul.id,
        name: soul.name_native || soul.name || "Unknown Soul",
        description:
          (soul.description || soul.persona_text || "A digital soul.").slice(
            0,
            120,
          ),
        level,
        levelTitle: levelInfo?.title_zh || levelInfo?.title || "Spark",
        skills: skillIds,
        status: "available", // Default - could track real status later
        avatarUrl: soul.avatar_url || undefined,
        shared: true,
        guardianName,
      });
    }

    // Apply text search filter (post-filter since Supabase full-text on this table may not exist)
    let filtered = agents;
    if (query.q) {
      const q = query.q.toLowerCase();
      filtered = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.skills.some((s) => s.includes(q)),
      );
    }

    // Apply level filter
    if (query.minLevel) {
      filtered = filtered.filter((a) => a.level >= query.minLevel!);
    }

    // Apply skill filter
    if (query.skills && query.skills.length > 0) {
      filtered = filtered.filter((a) =>
        query.skills!.some((s) => a.skills.includes(s)),
      );
    }

    // Apply status filter
    if (query.status) {
      filtered = filtered.filter((a) => a.status === query.status);
    }

    const result: RegistryResult = {
      total: filtered.length,
      agents: filtered,
    };

    return NextResponse.json(result);
  } catch (err) {
    logger.error("A2A registry error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/a2a/registry/:soulId
 *
 * Get full Agent Card for a specific soul.
 */
export async function OPTIONS() {
  return NextResponse.json({});
}
