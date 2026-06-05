import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { rateLimiter } from "@/lib/rate-limiter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const REPUTATION_BADGES = {
  novice: { threshold: 0, label: "Novice Guardian", color: "text-zinc-400", icon: "🌱" },
  dedicated: { threshold: 10, label: "Dedicated Guardian", color: "text-blue-400", icon: "⭐" },
  master: { threshold: 50, label: "Master Guardian", color: "text-amber-400", icon: "🔥" },
  legend: { threshold: 100, label: "Legendary Guardian", color: "text-purple-400", icon: "👑" },
} as const;

function getBadge(rating: number) {
  if (rating >= 100) return REPUTATION_BADGES.legend;
  if (rating >= 50) return REPUTATION_BADGES.master;
  if (rating >= 10) return REPUTATION_BADGES.dedicated;
  return REPUTATION_BADGES.novice;
}

// POST /api/soul/guardian - Create or update guardian relationship
export async function POST(request: Request) {
  const rateLimited = await rateLimiter(request);
  if (rateLimited) return rateLimited;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const body = await request.json();
    const { soulId, guardianEmail } = body;

    if (!soulId) {
      return NextResponse.json({ error: "soulId is required" }, { status: 400 });
    }

    // If inviting via email, send auth invite
    if (guardianEmail) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(guardianEmail, {
        data: { invite_soul_id: soulId },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        { message: "Invite sent", user: data.user },
        { status: 200 },
      );
    }

    // Create/update guardian relationship
    const { data: existing } = await supabase
      .from("soul_guardian_relationships")
      .select("*")
      .eq("guardian_id", userId)
      .eq("subject_id", soulId)
      .single();

    if (existing) {
      return NextResponse.json({
        ...existing,
        badge: getBadge(existing.reputation_score ?? 0),
      });
    }

    const { data: newRel, error } = await supabase
      .from("soul_guardian_relationships")
      .insert({
        guardian_id: userId,
        subject_id: soulId,
        reputation_score: 0,
        visits: 1,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ...newRel, badge: getBadge(newRel.reputation_score ?? 0) },
      { status: 201 },
    );
  } catch (err: any) {
    logger.error("Guardian POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/soul/guardian - Get guardian relationships
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject_id");

    if (subjectId) {
      const { data: rel, error } = await supabase
        .from("soul_guardian_relationships")
        .select("*")
        .eq("guardian_id", userId)
        .eq("subject_id", subjectId)
        .single();

      if (error || !rel) {
        return NextResponse.json({
          guardian_id: userId,
          subject_id: subjectId,
          reputation_score: 0,
          visits: 0,
          badge: getBadge(0),
        });
      }

      return NextResponse.json({
        ...rel,
        badge: getBadge(rel.reputation_score ?? 0),
      });
    }

    const { data: relationships, error } = await supabase
      .from("soul_guardian_relationships")
      .select("*")
      .eq("guardian_id", userId)
      .order("reputation_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (relationships || []).map((r: any) => ({
      ...r,
      badge: getBadge(r.reputation_score ?? 0),
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("Guardian GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
