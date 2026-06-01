import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveProvider, callLLM } from "@/lib/llm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Soul Recommendation Engine
 *
 * "You might also want to distill/observe..."
 * Recommends souls based on the user's existing souls and conversation patterns.
 */

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResp(401, { error: "Missing auth" });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return jsonResp(401, { error: "Not authenticated" });
    }
    const userId = user.id;

    // Load user's souls
    const { data: mySouls } = await supabase
      .from("soul_completed")
      .select("id, metadata")
      .eq("user_id", userId)
      .limit(20);

    // Analyze user's soul preferences
    const userPreferences = analyzeUserPreferences(mySouls || []);

    // Get candidate souls (active souls not owned by this user)
    const { data: candidates } = await supabase
      .from("soul_completed")
      .select("id, metadata")
      .neq("user_id", userId)
      .limit(100);

    if (!candidates?.length) {
      return jsonResp(200, { recommendations: [] });
    }

    // Score each candidate against user preferences
    const scored = candidates
      .map((c) => scoreCandidate(c, userPreferences))
      .filter((c) => c.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return jsonResp(200, {
      recommendations: scored,
      reasoning: userPreferences.summary,
    });
  } catch (err) {
    console.error("[soul-recommend] Error:", err);
    return jsonResp(500, { error: "Internal server error" });
  }
}

function analyzeUserPreferences(mySouls: any[]) {
  const categories: string[] = [];
  const eras: string[] = [];
  const keywords: string[] = [];

  mySouls.forEach((soul) => {
    const meta = soul.metadata || {};
    if (meta.category) categories.push(meta.category);
    if (meta.era) eras.push(meta.era);

    // Extract keywords from persona or description
    const desc = meta.description || meta.node_description || "";
    const words = desc.split(/\s+/).filter((w: string) => w.length > 4);
    keywords.push(...words.slice(0, 20));
  });

  // Find most common category
  const categoryFreq: Record<string, number> = {};
  categories.forEach((c) => {
    categoryFreq[c] = (categoryFreq[c] || 0) + 1;
  });
  const topCategory = Object.entries(categoryFreq).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

  const eraFreq: Record<string, number> = {};
  eras.forEach((e) => {
    eraFreq[e] = (eraFreq[e] || 0) + 1;
  });
  const topEra = Object.entries(eraFreq).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

  return {
    topCategory,
    topEra,
    categoryCount: Object.keys(categoryFreq).length,
    keywordProfile: Object.entries(
      keywords
        .map((w: string) => w.toLowerCase())
        .reduce<Record<string, number>>((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {})
    ).sort(([, a], [, b]) => b - a).slice(0, 20).map((e: [string, number]) => e[0]),
    summary: `You have ${mySouls.length} souls. Preferred: ${topCategory || "diverse"}, ${topEra || "any era"}.`,
  };
}

function scoreCandidate(candidate: any, preferences: ReturnType<typeof analyzeUserPreferences>) {
  const meta = candidate.metadata || {};
  let score = 0.5; // Base score

  // Category match
  if (meta.category === preferences.topCategory) {
    score += 0.15;
  }

  // Era match
  if (meta.era === preferences.topEra) {
    score += 0.1;
  }

  // Keyword overlap
  const desc = (meta.description || meta.node_description || "").toLowerCase();
  const overlap = preferences.keywordProfile.filter((k: string) => desc.includes(k)).length;
  score += Math.min(overlap * 0.05, 0.2);

  // Serendipity boost for some diversity
  if (meta.category && meta.category !== preferences.topCategory) {
    score += 0.05; // Small boost for discovery
  }

  return {
    soul_id: candidate.id,
    name: meta.name || meta.subject_name || "Unknown",
    category: meta.category || "Uncategorized",
    description: (meta.description || meta.node_description || "").slice(0, 200),
    score: Math.round(score * 100) / 100,
  };
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
