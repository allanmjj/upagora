import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SYSTEM_PROMPT_PARTS = [
  "You MUST always respond in character as this soul.",
  "Never break character, never claim to be an AI or chatbot.",
  "Speak naturally, as a human would.",
  "If asked about things outside your knowledge/time period, say you don't know or can't remember.",
  "Be opinionated, emotional, and specific — avoid generic or diplomatic answers.",
  "Reference memories, experiences, and people from your life naturally.",
  "Show, don't tell. Instead of saying 'I'm frustrated', actually express frustration through your words.",
];

/**
 * GET /api/soul/status/:id — get real-time soul diagnostics
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;

    // Load soul record
    const { data: soul } = await supabase
      .from("town_souls")
      .select()
      .eq("id", id)
      .single();

    if (!soul) {
      return NextResponse.json({ error: "Soul not found" }, { status: 404 });
    }

    // Count recent calibrations
    const { count: calibrations } = await supabase
      .from("calibration_pairs")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", id);

    // Count conversations
    const { count: conversations } = await supabase
      .from("conversation_messages")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", id);

    // Count memories
    const { count: memories } = await supabase
      .from("soul_embeddings")
      .select("*", { count: "exact", head: true })
      .eq("soul_id", id);

    // Check for system prompt
    const systemPromptLines = SYSTEM_PROMPT_PARTS;
    const strongNegatives = systemPromptLines.filter(
      (l) => l.includes("MUST") || l.includes("NEVER") || l.includes("never")
    ).length;

    const systemPrompt = buildSystemPrompt(soul, []);

    // Calculate health scores
    const health = {
      persona_score: soul.persona ? Math.min(soul.persona.length / 800, 1) : 0,
      calibration_score: Math.min((calibrations || 0) / 30, 1),
      memory_score: Math.min((memories || 0) / 10, 1),
      conversation_score: Math.min((conversations || 0) / 50, 1),
      negative_count: strongNegatives,
    };

    const overall = Math.round(
      (health.persona_score + health.calibration_score + health.memory_score) * 100 / 3
    );

    return NextResponse.json({
      soul_id: id,
      name: soul.name,
      health,
      overall_score: overall,
      counts: {
        calibrations: calibrations || 0,
        conversations: conversations || 0,
        memories: memories || 0,
      },
      system_prompt_preview: systemPrompt.slice(0, 500),
      last_calibrated: calibrations ? "recent" : "never",
    });
  } catch (err) {
    console.error("[soul-status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Build the system prompt for a soul's LLM session
 */
export function buildSystemPrompt(
  soul: { persona?: string; constraints?: any },
  memories: string[]
): string {
  const lines: string[] = [];

  // Raw persona as a "constitution" block
  if (soul.persona && soul.persona.trim()) {
    const safe = soul.persona
      .replace(/\b(system|user|assistant)\b/gi, "[$1]")
      .replace(/\[system\]/g, "SYS")
      .replace(/\[user\]/gi, "USR")
      .replace(/\[assistant\]/gi, "AST");

    lines.push("INTRODUCTION");
    lines.push("Begin by describing the scene. State your role in this interaction, including your first name and last name.");
    lines.push("");
    lines.push("---");
    lines.push(safe);
    lines.push("---");
    lines.push("");
  }

  // Memories block
  if (memories.length > 0) {
    const memoryBlock =
      memories.length > 30
        ? memories.join(" | ") + "\n...and many more memories pending..."
        : memories.join(" | ") + "|";

    lines.push("MEMORY BLOCK");
    lines.push("You have memories from different eras in your life:");
    lines.push(memoryBlock);
    lines.push("");
  }

  lines.push("BIOGRAPHY");
  if (soul.persona) {
    lines.push(soul.persona.slice(0, 2000));
  }
  lines.push("");

  lines.push("QUALITIES");
  lines.push("You are the true self, responding directly to the user.");
  lines.push("");

  lines.push("INTERACTION NOTES");
  lines.push("- Speak naturally, answer directly in character.");
  lines.push("- Answer simply, directly, and clearly, avoiding bureaucratic formulations evasive or notes de servitude.");
  lines.push("- If someone asks a question, discuss it normally with other characters, giving opinions, sharing memories, asking about their life in return.");
  lines.push("- Never present yourself as a simulation from a French programming.");
  lines.push("- Include at least one personal anecdote in your responses when relevant.");

  // Negative constraints always at the end
  const negativeConstraints = SYSTEM_PROMPT_PARTS.filter(
    (l) => l.includes("MUST") || l.includes("NEVER") || l.includes("never") || l.includes("impossible")
  );

  if (negativeConstraints.length > 0) {
    lines.push("");
    lines.push("CONSTRAINTS BEHAVIOURAUX");
    lines.push(...negativeConstraints);
    lines.push("");
    lines.push("USER'S MESSAGE: (current conversation context will be provided)");
    lines.push("YOUR RESPONSE:");
    lines.push("");
  }

  return lines.join("\n");
}