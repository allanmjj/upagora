import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// POST /api/notifications/dispatch - Send notifications to guardians
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, soul_id, guardian_ids } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title, and message are required" }, { status: 400 });
    }

    // If no specific guardians, notify all guardians of the soul
    let targetGuardians = guardian_ids;
    if (!targetGuardians && soul_id) {
      const { data: guardianData } = await supabase
        .from("soul_guardians")
        .select("user_id")
        .eq("soul_id", soul_id);
      
      targetGuardians = guardianData?.map(g => g.user_id) || [];
    }

    if (!targetGuardians || targetGuardians.length === 0) {
      return NextResponse.json({ error: "No target guardians found" }, { status: 400 });
    }

    // Load soul name if applicable
    let soul_name = undefined;
    if (soul_id) {
      const { data: soulData } = await supabase
        .from("soul_extraction_results")
        .select("name")
        .eq("id", soul_id)
        .single();
      soul_name = soulData?.name;
    }

    // Create notifications for each guardian
    const notifications = targetGuardians.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      soul_id,
      soul_name,
      is_read: false,
    }));

    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications_sent: data?.length || 0,
      data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/notifications/batch - Send batch notifications
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notifications } = body;

    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json({ error: "notifications array is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications_sent: data?.length || 0,
      data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/notifications/dispatch - Get pending notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
