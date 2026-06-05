import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/calibrate/prompts
 *
 * Generate calibration prompts tailored to a specific soul.
 * Based on: past calibration gaps, soul category, dimension coverage.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const soulId = searchParams.get("soul_id");
    const count = parseInt(searchParams.get("count") || "5");

    // Load past calibrations to find gaps
    const { data: pastCalibrations } = await supabase
      .from("calibration_pairs")
      .select("dimension, created_at")
      .eq("soul_id", soulId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Calculate dimension coverage (which dimensions are under-calibrated)
    const dimensionCounts: Record<string, number> = {
      voice: 0, values: 0, knowledge: 0, emotion: 0, relationships: 0,
    };
    (pastCalibrations || []).forEach((c: any) => {
      if (c.dimension && dimensionCounts[c.dimension] !== undefined) {
        dimensionCounts[c.dimension]++;
      }
    });

    // Find under-calibrated dimensions
    const underCalibrated = Object.entries(dimensionCounts)
      .filter(([, count]) => count < 3)
      .sort(([, a], [, b]) => a - b)
      .map(([dim]) => dim);

    // Generate prompts based on soul type and calibration gaps
    const prompts = generatePrompts(soulId, underCalibrated, count);

    return NextResponse.json({
      prompts,
      dimension_coverage: dimensionCounts,
      under_calibrated: underCalibrated,
      total_past_calibrations: (pastCalibrations || []).length,
    });
  } catch (err) {
    logger.error("[calibrate-prompts] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generatePrompts(
  soulId: string | null,
  underCalibrated: string[],
  count: number
): string[] {
  // Priority prompts for under-calibrated dimensions
  const priorityPrompts: Record<string, string[]> = {
    voice: [
      "How would you describe your way of speaking to someone who's never heard you talk?",
      "What words or phrases do you use more than anyone else?",
      "When you're angry, how does your speech change?",
    ],
    values: [
      "Tell me about a time you stood up for something, even when it cost you.",
      "What's a belief you hold that most people would disagree with?",
      "If you had to choose between honesty and kindness, which would you pick and why?",
    ],
    knowledge: [
      "What's the most complex topic you can discuss at length without preparation?",
      "Tell me about something you thought you understood, but realized you were wrong about.",
      "What question do people ask you that you're most often surprised they don't already know?",
    ],
    emotion: [
      "What happens inside you when someone you love is hurt?",
      "Describe a moment when you were so overwhelmed you couldn't speak.",
      "What do you do when you're feeling something you can't name?",
    ],
    relationships: [
      "Tell me about someone who changed your life without realizing it.",
      "How do you decide who you can trust with your deepest thoughts?",
      "What's the hardest thing about staying close to someone over a long period?",
    ],
  };

  // General high-quality calibration prompts
  const generalPrompts = [
    "If someone asked you to describe yourself in three words, what would you say and why those three?",
    "What's something you've never told anyone because they'd think you're strange?",
    "Imagine your best friend defended you in front of a critic. What would they say?",
    "What makes you tear up when no one's watching?",
    "What's the most common misconception people have about you?",
    "If you could relive one argument, what would you do differently?",
    "What do you think is mediocre that everyone else seems to love?",
    "What childhood habit still shows up in your adult life?",
    "What would your enemies say is your greatest weakness?",
    "Tell me about a moment when you felt completely alone in a room full of people.",
  ];

  const results: string[] = [];

  // Add priority prompts first (for under-calibrated dimensions)
  for (const dim of underCalibrated) {
    if (results.length >= count) break;
    const dimPrompts = priorityPrompts[dim] || [];
    for (const p of dimPrompts) {
      if (results.length >= count) break;
      if (!results.includes(p)) {
        results.push(p);
      }
    }
  }

  // Fill remaining with general prompts
  for (const p of generalPrompts) {
    if (results.length >= count) break;
    if (!results.includes(p)) {
      results.push(p);
    }
  }

  // Shuffle and return
  return results
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
