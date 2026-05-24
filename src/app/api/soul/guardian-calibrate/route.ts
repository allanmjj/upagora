import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_response, corrected_response, dimension, share_slug } = body;
    if (!agent_response || !corrected_response) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
    }

    const { data: calib } = await supabase
      .from("guardian_calibrations")
      .insert({
        share_slug,
        agent_response,
        corrected_response,
        dimension,
      })
      .select("id")
      .single();

    // 更新校准计数
    await supabase
      .from("soul_sessions")
      .update({ calibration_count: (calib ? 1 : 0) })
      .eq("id", calib?.id);

    return NextResponse.json({
      message: "校准已记录",
      calibration_id: calib?.id,
    });
  } catch (err) {
    console.error("Guardian calibrate error:", err);
    return NextResponse.json({ error: "校准失败" }, { status: 500 });
  }
}
