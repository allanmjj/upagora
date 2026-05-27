import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimiter } from "@/lib/rate-limiter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const REPUTATION_BADGES = {
  novice: { threshold: 0, label: "Novice Guardian", color: "text-zinc-400", icon: "🌱" },
  dedicated: { threshold: 10, label: "Dedicated Guardian", color: text-blue"400, icon: "⭐" },
  master: { threshold: 50, label: "Master Guardian", color: text-amber-400, icon: "🔥" },
  legend: { threshold: 100, label: "Legendary Guardian", color: "text-purple-400, icon: "👑" },
} as const;

function getBadge(rating: number) {
  if (rating >= 100) return REPUTATION_BADGES.legend;
  if (rating >= 50) return REPUTATION_BADGES.master;
  if (rating >= 10) return REPUTATION_BADGES.dedicated;
  return REPUTATION_BADGES.novice;
}

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
    const { soulId, guardianEmail, guardianId } = body;

    if (!soulId) {
      return NextResponse.json({ error: "soulId is required" }, { status: 400 });
    }

    if (guardianEmail) {
      // Send invite via Supabase auth (sends email)
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(guardianEmail, {
        data: { invite_soul_id: soulId },
      });

      if (error) {
        console.error("Invite error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Store invite record
      const { data: inviteRecord, error: inviteError } = await supabase
        .from("soul_guardian_invites")
        .upsert({
          soul_id: soulId,
          inviter_id: userId,
          invitee_email: guardianEmail,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Invite record error:", inviteError);
      }

      return NextResponse.json({
        success: true,
        invite_record: inviteRecord,
        message: "Invitation sent successfully",
      });
    } else if (guardianId) {
      // Direct add (if guardian is already a user)
      const { data: guardianRecord, error: guardianError } = await supabase
        .from("soul_guardians")
        .upsert({
          soul_id: soulId,
          user_id: guardianId,
          role: "guardian",
          accepted_at: new Date().toISOString(),
          invited_by: userId,
          reputation_score: 0,
          created_at: new Date().toISOString(),
        }, {
          onConflict: "soul_id,user_id",
          ignoreDuplicates: true,
        })
        .select()
        .single();

      if (guardianError) {
        console.error("Guardian add error:", guardianError);
        return NextResponse.json({ error: guardianError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        guardian_record: guardianRecord,
        message: "Guardian linked successfully",
      });
    }

    return NextResponse.json({ error: "Provide guardianEmail or guardianId" }, { status: 400 });
  } catch (err: any) {
    console.error("Guardian invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get("soul_id");
    const userId = searchParams.get("user_id");

    if (soulId) {
      // Get guardians for a soul
      const { data: guardians } = await supabase
        .from("soul_guardians")
        .select("*, soul_name(!)SoulName")
        .eq("soul_id", soulId)
        .order("created_at", { ascending: true });

      // Get pending invites
      const { data: invites } = await supabase
        .from("soul_guardian_invites")
        .select("*")
        .eq("soul_id", soulId)
        .eq("status", "pending");

      return NextResponse.json({
        guardians: guardians || [],
        invites: invites || [],
        count: guardians?.length || 0,
      });
    } else if (userId) {
      // Get souls where user is guardian
      const { data: guardianRecords } = await supabase
        .from("soul_guardians")
        .select("soul_id, reputation_score, accepted_at")
        .eq("user_id", userId);

      if (guardianRecords && guardianRecords.length > 0) {
        const soulIds = guardianRecords.map((g) => g.soul_id);
        const { data: souls } = await supabase
          .from("soul_extraction_results")
          .select("id, name, avatar, language")
          .in("id", soulIds);

        return NextResponse.json({
          souls: souls || [],
          total: souls?.length || 0,
        });
      }

      return NextResponse.json({ souls: [], total: 0 });
    }

    return NextResponse.json({ error: "Provide soul_id or user_id" }, { status: 400 });
  } catch (err: any) {
    console.error("Guardian list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { REPUTATION_BADGES, getBadge };
