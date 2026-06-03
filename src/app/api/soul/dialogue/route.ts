import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KNOWN_CONSTRAINTS_MAP } from "@/lib/soul-constraint-loader";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soulA = searchParams.get("soul_a");
    const soulB = searchParams.get("soul_b");

    if (!soulA || !soulB) {
      return jsonResp(400, { error: "Both soul_a and soul_b are required" });
    }

    // Get dialogue history
    const { data: dialogues, error } = await supabase
      .from("soul_dialogues")
      .select("*")
      .or(`and(soul_a_id.eq.${soulA},soul_b_id.eq.${soulB}),and(soul_a_id.eq.${soulB},soul_b_id.eq.${soulA})`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[soul-dialogue] fetch error:", error);
      return jsonResp(200, { dialogues: [] });
    }

    return jsonResp(200, {
      soul_a: KNOWN_CONSTRAINTS_MAP[soulA] || { soul_id: soulA, soul_name: soulA },
      soul_b: KNOWN_CONSTRAINTS_MAP[soulB] || { soul_id: soulB, soul_name: soulB },
      dialogues: dialogues || [],
    });
  } catch (err) {
    console.error("[soul-dialogue] GET error:", err);
    return jsonResp(500, { error: "Internal server error" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { soul_a, soul_b, topic, max_turns = 10 } = body;

    if (!soul_a || !soul_b) {
      return jsonResp(400, { error: "Both soul_a and soul_b are required" });
    }

    // Load 9D constraints for both souls
    const constraintsA = KNOWN_CONSTRAINTS_MAP[soul_a] || await loadFromDB(soul_a);
    const constraintsB = KNOWN_CONSTRAINTS_MAP[soul_b] || await loadFromDB(soul_b);

    if (!constraintsA || !constraintsB) {
      return jsonResp(404, { error: "One or both souls not found" });
    }

    // Generate system prompt for soul-to-soul dialogue
    const systemPrompt = buildDialoguePrompt(constraintsA, constraintsB, topic);

    // Call LLM for dialogue generation
    const dialogue = await generateDialogue(systemPrompt, max_turns);

    // Save dialogue to Supabase
    const { data: saved, error } = await supabase
      .from("soul_dialogues")
      .insert({
        soul_a_id: soul_a,
        soul_b_id: soul_b,
        topic: topic || null,
        turns: dialogue.turns,
        summary: dialogue.summary,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[soul-dialogue] save error:", error);
    }

    return jsonResp(200, {
      id: saved?.id || null,
      dialogue,
      constraints_a: {
        soul_name: constraintsA.soul_name,
        era: constraintsA.era_name,
        personality: constraintsA.personality_traits,
      },
      constraints_b: {
        soul_name: constraintsB.soul_name,
        era: constraintsB.era_name,
        personality: constraintsB.personality_traits,
      },
    });
  } catch (err) {
    console.error("[soul-dialogue] POST error:", err);
    return jsonResp(500, { error: "Internal server error" });
  }
}

async function loadFromDB(soulId: string) {
  const { data } = await supabase
    .from("soul_gallery")
    .select("*")
    .eq("soul_id", soulId)
    .single();

  return data || null;
}

function buildDialoguePrompt(constraintsA: any, constraintsB: any, topic: string | null): string {
  return `You are simulating a dialogue between two historical souls. Each soul has specific 9D constraints that define their knowledge, personality, beliefs, and communication style.

=== SOUL A: ${constraintsA.soul_name} ===
Era: ${constraintsA.era_name || "Unknown"}
Profession: ${constraintsA.profession || "Unknown"}
Knowledge base: ${(constraintsA.knowledge_floor || []).join(", ")}
Does NOT know: ${(constraintsA.knowledge_ceiling || []).join(", ")}
Personality: ${(constraintsA.personality_traits || []).join(", ")}
Beliefs: ${(constraintsA.beliefs || []).map((b: any) => `${b.name} (${b.strength}%)`).join(", ")}
Communication style: ${(constraintsA.communication_style || []).join(", ")}
Soul anchor: ${(constraintsA.soul_anchor || []).join(", ")}

=== SOUL B: ${constraintsB.soul_name} ===
Era: ${constraintsB.era_name || "Unknown"}
Profession: ${constraintsB.profession || "Unknown"}
Knowledge base: ${(constraintsB.knowledge_floor || []).join(", ")}
Does NOT know: ${(constraintsB.knowledge_ceiling || []).join(", ")}
Personality: ${(constraintsB.personality_traits || []).join(", ")}
Beliefs: ${(constraintsB.beliefs || []).map((b: any) => `${b.name} (${b.strength}%)`).join(", ")}
Communication style: ${(constraintsB.communication_style || []).join(", ")}
Soul anchor: ${(constraintsB.soul_anchor || []).join(", ")}

${topic ? `=== TOPIC: ${topic} ===` : "=== OPEN CONVERSATION ==="}

RULES:
1. Each soul must respond based strictly on their knowledge boundaries
2. A soul from an earlier era CANNOT reference things from a later era
3. Each soul's personality, beliefs, and communication style must shape their words
4. If one soul mentions something the other doesn't know, the listener reacts authentically
5. The dialogue should feel alive, not rigid — emotions, disagreements, and agreements are natural
6. Use the language style specified for each soul

Generate a ${10}-turn dialogue where both voices are clearly distinct.`;
}

async function generateDialogue(systemPrompt: string, maxTurns: number): Promise<any> {
  // Use DeepSeek LLM for dialogue generation
  const deepseekUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!deepseekKey) {
    // Fallback: return a simulated dialogue
    return generateFallbackDialogue(maxTurns);
  }

  try {
    const response = await fetch(deepseekUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Please generate the dialogue now in JSON format with a 'turns' array. Each turn has 'speaker' (soul_a or soul_b), 'line' (the spoken text), and 'context' (body language, tone, etc.). Include a 'summary' at the top level." },
        ],
        temperature: 0.9,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse as JSON, fallback to structured extraction
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      return {
        summary: "Dialogue generated (raw text parsing needed)",
        turns: extractTurns(content),
        raw: content,
      };
    }
  } catch (err) {
    console.error("[soul-dialogue] LLM error:", err);
    return generateFallbackDialogue(maxTurns);
  }
}

function extractTurns(content: string): any[] {
  const lines = content.split("\n");
  const turns: any[] = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)/);
    if (match) {
      if (current) turns.push(current);
      current = { speaker: match[1].toLowerCase(), line: match[2].trim() };
    } else if (current && line.trim()) {
      current.line += " " + line.trim();
    }
  }
  if (current) turns.push(current);

  return turns.length > 0 ? turns : [{ speaker: "narrator", line: content.slice(0, 500) }];
}

function generateFallbackDialogue(maxTurns: number): any {
  return {
    summary: "Soul-to-soul dialogue (simulated)",
    turns: Array.from({ length: Math.min(maxTurns, 6) }, (_, i) => ({
      speaker: i % 2 === 0 ? "soul_a" : "soul_b",
      line: i % 2 === 0
        ? `I wonder what would happen if our times overlapped... there is much I wish to understand about your world.`
        : `The world changes, yet human questions remain timeless. Tell me, what troubles your spirit?`,
    })),
    simulated: true,
  };
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
