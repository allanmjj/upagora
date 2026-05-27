import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── External Soul Registration ───────────────────────────────────
// POST /api/town/external/register
export async function POST_register(req: NextRequest) {
  const body = await req.json();
  const { name, language, persona_text, avatar, color, webhookUrl } = body;

  if (!name || !language) {
    return NextResponse.json({ error: "name and language are required" }, { status: 400 });
  }

  // Generate unique ws_token
  const wsToken = randomUUID();

  // Create external soul entry
  const { data, error } = await supabase
    .from("town_external_souls")
    .insert({
      name,
      language,
      persona_text: persona_text || "",
      avatar: avatar || "🧑",
      color: color || "#60a5fa",
      webhook_url: webhookUrl || "",
      ws_token: wsToken,
      is_approved: false,
      is_connected: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    wsToken,
    message: "Registration submitted. Waiting for approval.",
  });
}

// ─── External Soul Heartbeat ──────────────────────────────────────
// POST /api/town/external/heartbeat
export async function POST_heartbeat(req: NextRequest) {
  const body = await req.json();
  const { ws_token } = body;

  if (!ws_token) {
    return NextResponse.json({ error: "ws_token required" }, { status: 400 });
  }

  const { data: soul } = await supabase
    .from("town_external_souls")
    .select("*")
    .eq("ws_token", ws_token)
    .single();

  if (!soul) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!soul.is_approved) {
    return NextResponse.json({ error: "Not approved yet" }, { status: 403 });
  }

  // Update connection status
  await supabase
    .from("town_external_souls")
    .update({
      is_connected: true,
      last_heartbeat: new Date().toISOString(),
    })
    .eq("ws_token", ws_token);

  return NextResponse.json({ connected: true });
}

// ─── External Soul Event Dispatcher ───────────────────────────────
// When town simulator generates an event, we notify external soul via webhook
export async function dispatchEventToExternal(event: any, externalSoulId: string) {
  const { data: externalSoul } = await supabase
    .from("town_external_souls")
    .select("webhook_url, ws_token, soul_id")
    .eq("id", externalSoulId)
    .single();

  if (!externalSoul || !externalSoul.webhook_url) {
    return null;
  }

  try {
    const response = await fetch(externalSoul.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        ws_token: externalSoul.ws_token,
        response_deadline: Date.now() + 10000, // 10 seconds
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Webhook delivery failed:", e);
  }

  return null;
}

// ─── External Soul Response Handler ───────────────────────────────
// POST /api/town/external/respond
export async function POST_respond(req: NextRequest) {
  const body = await req.json();
  const { ws_token, event_id, response_text, language } = body;

  if (!ws_token || !event_id || !response_text) {
    return NextResponse.json({ error: "ws_token, event_id, response_text required" }, { status: 400 });
  }

  const { data: externalSoul } = await supabase
    .from("town_external_souls")
    .select("*")
    .eq("ws_token", ws_token)
    .single();

  if (!externalSoul) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Store external soul's response
  const response = {
    external_soul_id: externalSoul.id,
    event_id,
    response_text,
    language: language || externalSoul.language,
    responded_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("town_external_responses").insert(response);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
