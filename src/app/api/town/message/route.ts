import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/town/message — Guardian sends a message/gift/memory to a soul
 *
 * Body:
 * {
 *   soul_id: "uuid",
 *   type: "letter" | "memory" | "gift" | "wish",
 *   content: "Your message text...",
 *   gift_type?: "flower" | "book" | "tea" | "star" | "letter"
 * }
 *
 * The soul will receive this and may respond based on their personality.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const guardianId = authRes.data.user.id;
    const body = await req.json();
    const { soul_id, type, content, gift_type } = body;

    if (!soul_id || !type || !content) {
      return NextResponse.json(
        { error: "soul_id, type, and content are required" },
        { status: 400 },
      );
    }

    // Validate type
    const validTypes = ["letter", "memory", "gift", "wish"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be: " + validTypes.join(", ") }, { status: 400 });
    }

    // Check soul exists
    const { data: soulState, error: soulErr } = await supabase
      .from("soul_states")
      .select("name, name_native, mood, energy")
      .eq("soul_id", soul_id)
      .single();

    if (soulErr || !soulState) {
      return NextResponse.json({ error: "Soul not found" }, { status: 404 });
    }

    const giftIcons: Record<string, string> = {
      flower: "🌸",
      book: "📖",
      tea: "🍵",
      star: "⭐",
      letter: "✉️",
      default: "🎁",
    };

    // Save the message/gift
    const { data: message, error: msgErr } = await supabase
      .from("town_guardian_messages")
      .insert({
        guardian_id: guardianId,
        soul_id,
        type,
        content,
        gift_type: gift_type || null,
        gift_icon: gift_type ? (giftIcons[gift_type] || giftIcons.default) : null,
        status: "delivered",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Record as a town event
    const eventType = type === "gift" ? "gift_received" : "guardian_message";
    const giftText = gift_type ? `${giftIcons[gift_type] || giftIcons.default} ${gift_type} gift` : "";
    const { data: event } = await supabase
      .from("town_events")
      .insert({
        event_type: eventType,
        space: soulState.current_region || "plaza",
        participants: [soul_id],
        content: {
          type,
          gift_type,
          message_preview: content.slice(0, 100),
        },
        summary: `Guardian sent ${type === "letter" ? "📜 a letter" : type === "gift" ? giftText : type === "memory" ? "🧠 a memory" : "💫 a wish"} to ${soulState.name_native || soulState.name}`,
      })
      .select()
      .single();

    // Slight mood boost for the soul
    const moodBoost = type === "gift" ? 8 : type === "letter" ? 5 : type === "memory" ? 7 : 3;
    await supabase
      .from("soul_states")
      .update({
        energy: Math.min(100, (soulState.energy || 50) + moodBoost),
        social_need: Math.max(0, (soulState.social_need || 50) - moodBoost),
        updated_at: new Date().toISOString(),
      })
      .eq("soul_id", soul_id);

    return NextResponse.json({
      success: true,
      message,
      event,
      soul_impact: {
        mood_boost: moodBoost,
        new_energy: Math.min(100, (soulState.energy || 50) + moodBoost),
      },
    });
  } catch (e: any) {
    console.error("Guardian message error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/town/message?soul_id=uuid — Get guardian messages for a soul
 * GET /api/town/message — Get all recent messages
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const soul_id = searchParams.get("soul_id");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("town_guardian_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (soul_id) {
      query = query.eq("soul_id", soul_id);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
