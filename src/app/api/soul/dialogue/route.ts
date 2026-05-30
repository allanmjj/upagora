/**
 * Soul-to-Soul Dialogue API
 * 
 * Two souls having a natural conversation with each other.
 * Each soul gets their own persona + constraint injection.
 * The dialogue emerges from their differing backgrounds and knowledge boundaries.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { KNOWN_CONSTRAINTS_MAP } from "@/lib/soul-constraint-loader";
import { buildConstraintPromptLang } from "@/lib/soul-constraints";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  // @ts-expect-error — DeepSeek-specific option
  fallbackToFirstAppropriateKey: true,
});

const SPACE_CONTEXTS: Record<string, string> = {
  plaza: "in the bustling Town Plaza",
  library: "in the quiet Library",
  workshop: "in the Workshop",
  bar: "at The Raven Bar",
  garden: "in the Zen Garden",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      soul1_id,
      soul2_id,
      topic = "",
      space = "plaza",
      max_turns = 6,
    } = body;

    if (!soul1_id || !soul2_id) {
      return NextResponse.json(
        { error: "soul1_id and soul2_id are required" },
        { status: 400 },
      );
    }

    // Load both souls' personas
    const { data: persona1 } = await supabase
      .from("soul_extraction_results")
      .select("*")
      .eq("id", soul1_id)
      .single();

    const { data: persona2 } = await supabase
      .from("soul_extraction_results")
      .select("*")
      .eq("id", soul2_id)
      .single();

    if (!persona1 || !persona2) {
      return NextResponse.json(
        { error: "One or both souls not found" },
        { status: 404 },
      );
    }

    // Build constraint prompts for both souls
    let constraint1 = "";
    let constraint2 = "";
    const sc1 = KNOWN_CONSTRAINTS_MAP[soul1_id];
    const sc2 = KNOWN_CONSTRAINTS_MAP[soul2_id];
    if (sc1) {
      constraint1 = `\n\n## KNOWLEDGE BOUNDARIES (NON-NEGOTIABLE)\n${buildConstraintPromptLang(sc1, persona1.language || "en")}`;
    }
    if (sc2) {
      constraint2 = `\n\n## KNOWLEDGE BOUNDARIES (NON-NEGOTIABLE)\n${buildConstraintPromptLang(sc2, persona2.language || "en")}`;
    }

    // Build the dialogue prompt
    const systemPrompt = `You are a dialogue writer simulation two souls having a conversation in Soul Town.

SOUL A: "${persona1.name}"${persona1.name_native ? ` (${persona1.name_native})` : ""} - ${persona1.profession || "unknown profession"}, era: ${persona1.era || "unknown"}
${persona1.persona_text?.slice(0, 500) || ""}${constraint1}

SOUL B: "${persona2.name}"${persona2.name_native ? ` (${persona2.name_native})` : ""} - ${persona2.profession || "unknown profession"}, era: ${persona2.era || "unknown"}
${persona2.persona_text?.slice(0, 500) || ""}${constraint2}

SETTING: ${SPACE_CONTEXTS[space] || "in the town"}${topic ? ` TOPIC: ${topic}` : ""}

RULES:
1. Write a natural dialogue between ${persona1.name} and ${persona2.name}.
2. Each soul speaks in their OWN language and communication style.
3. They may not understand each other perfectly (language barrier).
4. They should reference their era, knowledge, and experiences.
5. They should NOT know things outside their knowledge boundaries.
6. The dialogue should feel authentic, not forced.
7. Maximum ${max_turns} turns total.

OUTPUT FORMAT (JSON array):
[
  { "speaker": "${persona1.name}", "text": "..." },
  { "speaker": "${persona2.name}", "text": "..." },
  ...
]`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please write a natural dialogue between ${persona1.name} and ${persona2.name}${topic ? ` about: ${topic}` : ""}.` },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";

    // Try to parse JSON from the response
    try {
      const dialogue = JSON.parse(content);
      return NextResponse.json({
        dialogue,
        space,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Return raw content if JSON parsing fails
      return NextResponse.json({
        dialogue: [
          { speaker: "Assistant", text: content },
        ],
        space,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 },
    );
  }
}
