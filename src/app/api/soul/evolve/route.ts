import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveProvider, callLLM } from "@/lib/llm";
import { loadSoulConstraints } from "@/lib/soul-constraint-loader";
import { buildConstraintPrompt } from "@/lib/soul-constraints";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/evolve
 *
 * Soul Evolution Engine — the core capability that makes souls alive.
 *
 * Analyzes accumulated calibration feedback + conversation history,
 * then generates an updated persona.md that reflects everything the guardian taught.
 *
 * This is how a soul "grows" without the guardian manually rewriting it.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResp(401, { error: "Missing auth" });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return jsonResp(401, { error: authRes.error.message });
    }

    const config = resolveProvider();
    if (!config) {
      return jsonResp(503, { error: "LLM provider not configured" });
    }

    const body = await req.json();
    const { soul_id, soulId } = body;
    const resolvedSoulId = soulId || soul_id;

    if (!resolvedSoulId) {
      return jsonResp(400, { error: "soul_id required" });
    }

    // Step 1: Load current persona
    const { data: personaData } = await supabase
      .from("persona_generated_files")
      .select("file_content, generated_at, version")
      .eq("soul_id", resolvedSoulId)
      .order("generated_at", { ascending: false })
      .limit(1);

    const currentPersona = personaData?.[0]?.file_content || "";
    const currentVersion = personaData?.[0]?.version || 1;

    // Step 2: Load recent calibration pairs (what the guardian taught)
    const { data: calibrations } = await supabase
      .from("calibration_pairs")
      .select("good_response, bad_response, dimension, owner_feedback, created_at")
      .eq("soul_id", resolvedSoulId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Step 3: Load recent conversation messages (what the soul has experienced)
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("role, content, created_at")
      .eq("soul_id", resolvedSoulId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Step 4: Load soul constraints (knowledge boundaries)
    let constraintsPrompt = "";
    try {
      const constraints = await loadSoulConstraints(resolvedSoulId, supabase);
      if (constraints) {
        constraintsPrompt = buildConstraintPrompt(constraints);
      }
    } catch {
      // Constraints table may not exist yet
    }

    // Step 5: Analyze calibration patterns
    const calibrationSummary = analyzeCalibrations(calibrations || []);
    const messageSummary = summarizeMessages(messages || []);

    // Step 6: Build evolution prompt
    const evolutionPrompt = buildEvolutionPrompt(
      resolvedSoulId,
      currentPersona,
      calibrationSummary,
      messageSummary,
      constraintsPrompt
    );

    // Step 7: Generate evolved persona
    const result = await callLLM(
      "You are a soul evolution engine. Your job is to take an existing persona and evolve it based on accumulated learning, calibration feedback, and lived experiences. The evolved persona should feel like the same person but deeper, more nuanced, and more authentic.",
      [{ role: "user", content: evolutionPrompt }],
      { maxTokens: 4000 }
    );

    const newPersona = result.content || currentPersona;

    // Step 8: Save evolved persona (new version)
    const newVersion = currentVersion + 1;
    const { error: saveError } = await supabase
      .from("persona_generated_files")
      .insert({
        soul_id: resolvedSoulId,
        file_content: newPersona,
        file_type: "persona.md",
        version: newVersion,
        subject_name: resolvedSoulId,
        generated_at: new Date().toISOString(),
      });

    // Step 9: Log evolution event
    try {
      await supabase.from("soul_evolution_logs").insert({
        soul_id: resolvedSoulId,
        from_version: currentVersion,
        to_version: newVersion,
        calibration_count: (calibrations || []).length,
        conversation_count: (messages || []).length,
        changes_summary: calibrationSummary.top_insights.slice(0, 5),
        evolved_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet
    }

    // Step 10: Seed new memories from evolved persona
    try {
      const chunks = splitTextIntoChunks(newPersona, 300);
      for (const chunk of chunks.slice(0, 10)) {
        await supabase.from("soul_embeddings").insert({
          soul_id: resolvedSoulId,
          content: chunk,
          summary: chunk.slice(0, 100),
          category: "evolved_persona",
        });
      }
    } catch {
      // soul_embeddings may not exist
    }

    if (saveError) {
      return jsonResp(500, {
        error: saveError.message,
        evolved_persona: newPersona, // Return anyway so frontend can show it
      });
    }

    return jsonResp(200, {
      success: true,
      from_version: currentVersion,
      to_version: newVersion,
      evolved_persona: newPersona,
      calibration_summary: calibrationSummary,
      changes_count: (calibrations || []).length,
      insights_applied: calibrationSummary.top_insights.length,
    });
  } catch (err) {
    console.error("[soul-evolve] Error:", err);
    return jsonResp(500, { error: "Evolution failed", details: String(err).slice(0, 300) });
  }
}

function analyzeCalibrations(calibrations: any[]) {
  const dimensionFocus: Record<string, number> = {};
  const insights: string[] = [];
  const styleShifts: string[] = [];

  calibrations.forEach((c) => {
    // Track dimension focus
    if (c.dimension) {
      dimensionFocus[c.dimension] = (dimensionFocus[c.dimension] || 0) + 1;
    }

    // Extract style shifts from good vs bad responses
    if (c.good_response && c.bad_response) {
      const goodLen = c.good_response.length;
      const badLen = c.bad_response.length;
      if (goodLen < badLen * 0.7) {
        styleShifts.push("Guardian prefers shorter, more direct responses");
      }
      if (goodLen > badLen * 1.3) {
        styleShifts.push("Guardian prefers more detailed, elaborated responses");
      }
    }

    // Extract explicit feedback
    if (c.owner_feedback) {
      insights.push(c.owner_feedback);
    }
  });

  const uniqueInsights = [...new Set(insights)].filter((i) => i.trim().length > 5);
  const uniqueStyleShifts = [...new Set(styleShifts)];

  // Sort dimensions by calibration frequency
  const sortedDimensions = Object.entries(dimensionFocus)
    .sort(([, a], [, b]) => b - a)
    .map(([dim, count]) => ({ dimension: dim, calibration_count: count }));

  return {
    total_calibrations: calibrations.length,
    dimension_focus: sortedDimensions,
    top_insights: uniqueInsights.slice(0, 10),
    style_shifts: uniqueStyleShifts,
  };
}

function summarizeMessages(messages: any[]) {
  const userTopics: string[] = [];
  const assistantTopics: string[] = [];

  messages.forEach((m) => {
    const firstSentence = (m.content || "").split(".")[0]?.slice(0, 100);
    if (m.role === "user" && firstSentence) {
      userTopics.push(firstSentence);
    } else if (m.role === "assistant" && firstSentence) {
      assistantTopics.push(firstSentence);
    }
  });

  return {
    total_messages: messages.length,
    user_topic_samples: userTopics.slice(0, 10),
    assistant_topic_samples: assistantTopics.slice(0, 10),
    conversation_snippet: messages.slice(0, 6).map((m) => `[${m.role}]: ${(m.content || "").slice(0, 200)}`).join("\n"),
  };
}

function buildEvolutionPrompt(
  soulId: string,
  currentPersona: string,
  calibrationSummary: ReturnType<typeof analyzeCalibrations>,
  messageSummary: ReturnType<typeof summarizeMessages>,
  constraintsPrompt: string
): string {
  const parts: string[] = [];

  parts.push("Soul Evolution Request");
  parts.push("======================");
  parts.push("");

  parts.push("CURRENT PERSONA (version being evolved):");
  parts.push("---");
  parts.push(currentPersona || "(no existing persona — this is a fresh generation)");
  parts.push("---");
  parts.push("");

  parts.push("CALIBRATION FEEDBACK (what the guardian taught):");
  parts.push(`Total calibration sessions: ${calibrationSummary.total_calibrations}`);
  parts.push("");

  if (calibrationSummary.dimension_focus.length > 0) {
    parts.push("Most-calibrated dimensions:");
    calibrationSummary.dimension_focus.forEach((d) => {
      parts.push(`  - ${d.dimension}: ${d.calibration_count} calibrations`);
    });
  }

  if (calibrationSummary.top_insights.length > 0) {
    parts.push("");
    parts.push("Direct feedback from guardian:");
    calibrationSummary.top_insights.forEach((insight) => {
      parts.push(`  - ${insight}`);
    });
  }

  if (calibrationSummary.style_shifts.length > 0) {
    parts.push("");
    parts.push("Detected style shifts the guardian prefers:");
    calibrationSummary.style_shifts.forEach((shift) => {
      parts.push(`  - ${shift}`);
    });
  }

  parts.push("");
  parts.push("CONVERSATION HISTORY (what the soul has experienced):");
  parts.push(`Total recent messages analyzed: ${messageSummary.total_messages}`);
  parts.push("");
  parts.push("Recent user topics:");
  messageSummary.user_topic_samples.forEach((topic) => {
    parts.push(`  - ${topic}`);
  });

  parts.push("");
  parts.push("Key instruction: EVOLVE the persona.");
  parts.push("This means:");
  parts.push("1. Keep the core identity intact (who this person is)");
  parts.push("2. Refine their expression style based on calibration feedback");
  parts.push("3. Add depth to dimensions that received the most calibration");
  parts.push("4. Incorporate new knowledge revealed through conversations");
  parts.push("5. Make the persona more nuanced, specific, and human");
  parts.push("6. The evolved persona should NOT be shorter — it should be deeper");

  if (constraintsPrompt) {
    parts.push("");
    parts.push("SOUL CONSTRAINTS (these boundaries must be preserved):");
    parts.push(constraintsPrompt);
  }

  parts.push("");
  parts.push("Output ONLY the new persona.md in markdown. No preamble, no explanation.");

  return parts.join("\n");
}

function splitTextIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  const re = /\.\s+/g;
  const sentences = text.split(re);

  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length > size) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = sentence;
    } else {
      current += (current ? ". " : "") + sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
