import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimiter, type RateLimitedResponse } from "@/lib/rate-limiter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Guardian participation actions: leave flowers, send letters, light candles
export async function POST(request: Request): Promise<NextResponse> {
  const rateLimited = await rateLimiter(request) as RateLimitedResponse | null;
  if (rateLimited?.status === 429) return rateLimited;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const guardianId = authRes.data.user.id;
    const body = await request.json();
    const { action, soulId, soulName, message, location } = body;

    const validActions = ["flower", "letter", "candle", "prayer"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 },
      );
    }

    let summary = "";
    let icon = "";
    switch (action) {
      case "flower":
        summary = `A guardian left ${message ? `"${message}"` : "a flower"} at ${soulName || "the garden"}`;
        icon = "🌸";
        break;
      case "letter":
        summary = `A guardian wrote: "${message || "a message"}" for ${soulName || "someone"}`;
        icon = "✉️";
        break;
      case "candle":
        summary = `A guardian lit a candle for ${soulName || "someone"}`;
        icon = "🕯️";
        break;
      case "prayer":
        summary = `A guardian prayed: ${message ? `"${message}"` : "in silence"}`;
        icon = "🙏";
        break;
    }

    // Record in town_events table
    const { data: event, error: eventErr } = await supabase
      .from("town_events")
      .insert({
        event_type: "ceremony",
        participants: [soulName || "unknown"],
        summary,
        space: location || "plaza",
        metadata: {
          action,
          icon,
          guardian_id: guardianId,
          soul_id: soulId,
          message,
          source: "guardian_action",
        },
      })
      .select()
      .single();

    if (eventErr) {
      console.error("Failed to record guardian action:", eventErr.message);
      return NextResponse.json(
        { error: "Failed to record action", detail: eventErr.message },
        { status: 500 },
      );
    }

    // Increment guardian visit count
    if (soulName) {
      await supabase.rpc("increment_guardian_visits", {
        p_guardian_id: guardianId,
        p_soul_name: soulName,
      });
    }

    return NextResponse.json({
      success: true,
      event,
      message: "Action recorded",
    });
  } catch (err: any) {
    console.error("Guardian actions error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err.message },
      { status: 500 },
    );
  }
}

// GET /api/town/guardian-actions - Get recent guardian actions
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get("soul_id");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("town_events")
      .select("*")
      .eq("event_type", "ceremony")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (soulId) {
      query = query.eq("metadata->>soul_id", soulId);
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const actions = (events || []).map((e: any) => ({
      id: e.id,
      action: e.metadata?.action || "unknown",
      icon: e.metadata?.icon || "🕯️",
      soulName: e.participants?.[0] || "",
      message: e.metadata?.message || "",
      location: e.space || "plaza",
      timestamp: e.created_at,
    }));

    return NextResponse.json(actions);
  } catch (err: any) {
    console.error("Guardian actions GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
