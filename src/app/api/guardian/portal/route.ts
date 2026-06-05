/**
 * GET /api/guardian/portal — Guardian Portal API
 * Returns all souls with health metrics, quick actions, and recent interactions.
 * This is single unified view of the guardian's soul ecosystem.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPASE_SERVICE_ROLE_KEY!,
);

export interface PortalSoul {
  id: string;
  name: string;
  name_native?: string;
  category?: string;
  description?: string;
  avatar_url: string;
  health: {
    persona: number;
    calibration: number;
    memory: number;
    conversation: number;
    overall: number;
  };
  last_chat?: { text: string; created_at: string };
  interactions: Array<{ type: string; text: string; created_at: string }>;
}

/**
 * Auth helper — returns user ID or null for guest mode.
 */
async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authRes.error) return null;
  return authRes.data.user.id;
}

/**
 * Load soul gallery image for fallback avatar.
 */
async function getAvatar(soulId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("soul_gallery")
      .select("image_url, color")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.image_url) return data.image_url;
  } catch {
    // Table may not exist yet
  }
  return "";
}

/**
 * Compute health scores (0-100) for a soul based on DB metrics.
 */
async function computeHealth(soulId: string) {
  let calibrations = 0, conversations = 0, memories = 0, schedule = 0;

  try {
    const { count: c } = await supabase
      .from("calibration_pairs")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", soulId);
    calibrations = c || 0;
  } catch { /* table may not exist */ }

  try {
    const { count: c } = await supabase
      .from("conversation_messages")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", soulId);
    conversations = c || 0;
  } catch { /* table may not exist */ }

  try {
    const { count: c } = await supabase
      .from("soul_embeddings")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", soulId);
    memories = c || 0;
  } catch { /* table may not exist */ }

  try {
    const { count: c } = await supabase
      .from("soul_schedule")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", soulId);
    schedule = c || 0;
  } catch { /* table may not exist */ }

  const persona = Math.min(100, (conversations > 0 ? 40 : 10) + (calibrations * 8));
  const calibration = Math.min(100, calibrations * 12);
  const memory = Math.min(100, memories * 5);
  const conversation_score = Math.min(100, conversations * 6);

  return {
    persona,
    calibration,
    memory,
    conversation: conversation_score,
    overall: Math.round(
      (persona + calibration + memory + conversation_score) / 4
    ),
  };
}

/**
 * Get last conversation text for a soul.
 */
async function getLastChat(soulId: string) {
  try {
    const { data } = await supabase
      .from("conversation_messages")
      .select("user_message, created_at")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.user_message) {
      return { text: data.user_message, created_at: data.created_at };
    }
  } catch { /* ignore */ }
  return undefined;
}

/**
 * Get recent interactions for a soul.
 */
async function getInteractions(soulId: string): Promise<PortalSoul["interactions"]> {
  const interactions: PortalSoul["interactions"] = [];

  // From soul_interactions
  try {
    const { data } = await supabase
      .from("soul_interactions")
      .select("type, details, created_at")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) {
      for (const item of data) {
        interactions.push({
          type: item.type || "activity",
          text: typeof item.details === "string" ? item.details : JSON.stringify(item.details || {}),
          created_at: item.created_at,
        });
      }
    }
  } catch { /* table may not exist */ }

  // From soul_social / soul_schedule
  try {
    const { data } = await supabase
      .from("soul_schedule")
      .select("activity, location, created_at")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(3);
    if (data) {
      for (const item of data) {
        interactions.push({
          type: "schedule",
          text: `${item.activity}${item.location ? ` at ${item.location}` : ""}`,
          created_at: item.created_at,
        });
      }
    }
  } catch { /* table may not exist */ }

  // Sort by date descending
  interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return interactions.slice(0, 8);
}

/**
 * Main handler.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Load all souls (optionally filter by guardian)
    let soulsQuery = supabase.from("town_souls").select("*").order("created_at", { ascending: false });
    
    const { data: souls, error: soulsError } = await soulsQuery.limit(50);

    if (soulsError) {
      return NextResponse.json({ error: soulsError.message, demo_mode: true }, { status: 500 });
    }

    if (!souls || souls.length === 0) {
      return NextResponse.json({
        souls: [],
        message: "No souls found. Use /distill to create your first soul.",
      });
    }

    // Build portal data for each soul
    const portalSouls: PortalSoul[] = await Promise.all(
      souls.map(async (soul) => {
        const health = await computeHealth(soul.id);
        const lastChat = await getLastChat(soul.id);
        const interactions = await getInteractions(soul.id);
        const avatar_url = await getAvatar(soul.id);

        return {
          id: soul.id,
          name: soul.name || soul.name_native || "Unknown Soul",
          name_native: soul.name_native,
          category: soul.category || "general",
          description: soul.description || soul.description_tr || "",
          avatar_url,
          health,
          last_chat: lastChat,
          interactions,
        };
      })
    );

    return NextResponse.json({
      souls: portalSouls,
      guardian_id: userId,
      total_souls: portalSouls.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    logger.error("[guardian/portal] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
