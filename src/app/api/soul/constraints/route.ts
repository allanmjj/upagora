/**
 * GET /api/soul/constraints?soul_id=<uuid>
 * 
 * Returns the 7-dimension constraint data for a soul.
 * Used by SoulProfileCard to display depth information.
 */
import { NextRequest, NextResponse } from "next/server";
import { KNOWN_CONSTRAINTS_MAP } from "@/lib/soul-constraint-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soul_id = searchParams.get("soul_id");

  if (!soul_id) {
    return NextResponse.json(
      { error: "soul_id parameter is required" },
      { status: 400 }
    );
  }

  const constraints = KNOWN_CONSTRAINTS_MAP[soul_id];
  if (!constraints) {
    return NextResponse.json(
      { error: "No constraints found for this soul", soul_id },
      { status: 404 }
    );
  }

  // Fetch calibration stats from DB
  let calibrationCount = 0;
  let latestCalibration = null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: feedbackHistory, error: feedbackError } = await supabase
      .from("soul_calibration_feedback")
      .select("*")
      .eq("soul_id", soul_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!feedbackError && feedbackHistory) {
      // Get total count
      const { count } = await supabase
        .from("soul_calibration_feedback")
        .select("*", { count: "exact", head: true })
        .eq("soul_id", soul_id);
      calibrationCount = count || 0;
      latestCalibration = feedbackHistory[0]?.created_at;
    }
  } catch {
    // Calibration table may not exist yet - non-critical
  }

  return NextResponse.json({
    soul_id,
    constraints: {
      soul_name: constraints.soul_name,
      era_name: constraints.era_name,
      era_start: constraints.era_start,
      era_end: constraints.era_end,
      profession: constraints.profession,
      education: constraints.education,
      language: "auto",
      knowledge_floor: constraints.knowledge_floor || [],
      knowledge_ceiling: constraints.knowledge_ceiling || [],
      knowledge_gaps: constraints.knowledge_gaps || [],
      non_skills: constraints.non_skills || [],
      skills: constraints.skills || {},
      personality_traits: constraints.personality_traits || [],
      communication_style: constraints.communication_style || [],
      vocal_behavior: constraints.vocal_behavior || {},
    },
    calibration: {
      count: calibrationCount,
      latest: latestCalibration,
      level:
        calibrationCount > 100
          ? "mature"
          : calibrationCount > 50
            ? "evolved"
            : calibrationCount > 20
              ? "growing"
              : "newborn",
    },
  });
}

/**
 * POST /api/soul/constraints
 * 
 * Update or create constraints for a soul in the database.
 * Used by guardian during distillation process.
 */
export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { soul_id, constraints } = body;

    if (!soul_id || !constraints) {
      return NextResponse.json(
        { error: "soul_id and constraints are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("soul_constraints")
      .upsert(
        {
          soul_id,
          era_name: constraints.era_name || constraints.era_name,
          era_start: (constraints.era_start || 0) as number,
          era_end: (constraints.era_end || 0) as number,
          profession: constraints.profession || '',
          knowledge_floor: constraints.knowledge_floor || [],
          knowledge_ceiling: constraints.knowledge_ceiling || [],
          knowledge_gaps: constraints.knowledge_gaps || [],
          skills: constraints.skills || {},
          non_skills: constraints.non_skills || [],
          personality_traits: constraints.personality_traits || [],
          communication_style: constraints.communication_style || [],
        },
        { onConflict: "soul_id" }
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
