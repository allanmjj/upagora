import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    const device_info = req.headers.get("x-device-info") || req.headers.get("user-agent");

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id required", current_device: device_info },
        { status: 400 }
      );
    }

    // Get session info
    const { data: session, error: session_err } = await supabase
      .from("soul_sessions")
      .select("session_slug, subject_name, raw_text_preview, status, initials, calibration_count, extract_dim_count")
      .eq("id", session_id)
      .single();

    if (session_err || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get dimensions
    const { data: dimensions } = await supabase
      .from("soul_dimensions")
      .select("dimension, score, insights, confidence")
      .eq("session_id", session_id);

    const dimension_map: Record<string, number> = {};
    for (const d of dimensions || []) {
      dimension_map[d.dimension] = d.score;
    }

    // Count insights
    let total_insights = 0;
    for (const d of dimensions || []) {
      total_insights += (Array.isArray(d.insights) ? d.insights.length : 0);
    }

    // Get chat message count
    const { count: chat_count } = await supabase
      .from("soul_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session_id);

    // Get calibration count
    const count_result = await supabase
      .from("guardian_calibrations")
      .select("calibration_count", { count: "exact", head: true })
      .eq("session_id", session_id);
    const calib_count = count_result?.count || 0;

    const full = session.status === "complete";

    return NextResponse.json({
      subject_name: session.subject_name,
      initials: session.initials || `${session.subject_name?.charAt(0) || "?"}`,
      raw_preview: session.raw_text_preview?.slice(0, 300) || "",
      status: session.calibration_count || "active",
      calibration_count: session.calibration_count || 0,
      extract_dim_count: session.extract_dim_count || 0,
      calibrations: calib_count,
      insights_count: total_insights,
      dimensions: dimension_map,
      full,
      chat_messages: chat_count || 0,
      excerpt: (dimensions && dimensions.length > 0
        ? dimensions[0].insights?.[0] || session.raw_text_preview?.slice(0, 200) || "The soul is still silent..."
        : session.raw_text_preview?.slice(0, 200) || "The soul is still silent..."),
      dimension_labels: {
        cognitive_patterns: "Cognitive Patterns",
        value_judgment: "Values & Ethics",
        expression_style: "Expression Style",
        knowledge_structure: "Knowledge Structure",
        relationship_memory: "Relationships & Social",
        emotional_response: "Emotional Response",
        life_narrative: "Life Narrative",
      },
    });
  } catch (err) {
    logger.error("export-image error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
