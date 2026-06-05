import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DIMENSION_LABELS: Record<string, string> = {
  cognitive_patterns: "认知模式",
  value_judgment: "价值判断",
  expression_style: "表达风格",
  knowledge_structure: "知识体系",
  emotional_response: "情感反应",
  relationship_memory: "关系图谱",
  life_narrative: "生命叙事",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Look up share link
    const { data: share, error: shareErr } = await supabase
      .from("soul_share_links")
      .select("session_id, guardian_name, guardian_email, is_active, has_calibrated")
      .eq("share_slug", slug)
      .eq("is_active", true)
      .single();

    if (shareErr || !share) {
      return NextResponse.json({ error: "分享链接不存在或已失效" }, { status: 404 });
    }

    // Get session
    const { data: session, error: sessionErr } = await supabase
      .from("soul_sessions")
      .select("id, session_slug, subject_name, status, calibration_count, guardian_count, created_at")
      .eq("id", share.session_id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "灵魂会话不存在" }, { status: 404 });
    }

    // Get dimensions
    const { data: dimensions } = await supabase
      .from("soul_dimensions")
      .select("dimension, score, insights, confidence")
      .eq("session_id", share.session_id);

    const formattedDimensions = (dimensions || []).map((d) => ({
      dimension_name: d.dimension,
      label: DIMENSION_LABELS[d.dimension] || d.dimension,
      score: d.score,
      insights: d.insights || [],
      confidence: d.confidence || 0,
    }));

    return NextResponse.json({
      session: {
        session_slug: session.session_slug,
        subject_name: session.subject_name,
        status: session.status,
        calibration_count: session.calibration_count || 0,
        guardian_count: session.guardian_count || 0,
        guardian_name: share.guardian_name,
        created_at: session.created_at,
      },
      dimensions: formattedDimensions,
    });
  } catch (err) {
    logger.error("share API error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
