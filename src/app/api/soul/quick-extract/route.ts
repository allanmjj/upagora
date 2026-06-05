import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';
import crypto from "crypto";
import { resolveProvider, callLLM } from "@/lib/llm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SEVEN_DIMENSIONS = [
  "cognitive_patterns",
  "value_judgment",
  "expression_style",
  "knowledge_structure",
  "emotional_response",
  "relationship_memory",
  "life_narrative",
];

const DIMENSION_LABELS: Record<string, string> = {
  cognitive_patterns: "Cognitive Patterns",
  value_judgment: "Values & Ethics",
  expression_style: "Expression Style",
  knowledge_structure: "Knowledge Structure",
  emotional_response: "Emotional Response",
  relationship_memory: "Relationships & Social",
  life_narrative: "Life Narrative",
};

const DIMENSION_PROMPTS: Record<string, string> = {
  cognitive_patterns: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Cognitive Patterns & Thinking Style]. Analyze: thinking characteristics (abstract/concrete, macro/micro), cognitive preferences, mental models, decision-making patterns, cognitive boundaries.",
  value_judgment: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Value Judgments & Moral Framework]. Analyze: core values, moral底线, value conflict resolution, judgment standards for others' behavior, value evolution trajectory.",
  expression_style: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Expression Style & Linguistic Signature]. Analyze: vocabulary choices, sentence structure, tone, communication strategies, unique markers, context adaptation.",
  knowledge_structure: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Knowledge Structure & Expertise]. Analyze: core competency areas, knowledge breadth, knowledge organization, learning methods, knowledge update patterns.",
  emotional_response: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Emotional Response Patterns]. Analyze: emotional spectrum, triggers, expression styles, coping mechanisms, emotional resilience, depth of feeling.",
  relationship_memory: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Relational Patterns & Social Style]. Analyze: social role tendencies, relationship depth preferences, how they treat others, conflict handling, attachment evidence, self-positioning in relationships.",
  life_narrative: "You are a soul distillation analyst. Analyze the following text to deeply extract the person's [Life Story & Self-Narrative]. Analyze: core narrative themes, key turning points, identity evolution, unfinished pursuits, hardships and achievements, views on life and death.",
};

export async function POST(req: NextRequest) {
  try {
    // Check LLM provider first
    const provider = resolveProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "LLM provider not configured. Please set DEEPSEEK_API_KEY or OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { raw_text, subject_name = "Soul" } = body;

    if (!raw_text || raw_text.trim().length < 20) {
      return NextResponse.json(
        { error: "Text too short (minimum 20 characters)" },
        { status: 400 }
      );
    }

    // Anonymous session
    let session_slug = req.cookies.get("ns-slug")?.value;
    if (!session_slug) {
      session_slug = crypto.randomBytes(8).toString("hex");
    }

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from("soul_sessions")
      .insert({
        session_slug,
        subject_name,
        raw_text_preview: raw_text.slice(0, 200),
        raw_text_hash: crypto.createHash("md5").update(raw_text).digest("hex"),
        status: "extracting",
      })
      .select()
      .single();

    if (sessionError) {
      const existing = await supabase
        .from("soul_sessions")
        .select("*")
        .eq("session_slug", session_slug)
        .single();
      if (existing.data) {
        return NextResponse.json(
          { error: "Duplicate distillation record" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    // Extract dimensions using shared LLM
    const dimensions = [];
    for (const dim of SEVEN_DIMENSIONS) {
      const result = await extractDimension(dim, raw_text);
      await supabase.from("soul_dimensions").insert({
        session_id: session.id,
        dimension_name: dim,
        score: result.score || 0.5,
        insights: result.insights || [],
        evidence: result.evidence || [],
        confidence: result.confidence || 0.5,
      });
      dimensions.push({
        dimension_name: dim,
        label: DIMENSION_LABELS[dim],
        score: result.score || 0.5,
        insights: result.insights || [],
        confidence: result.confidence || 0.5,
      });
    }

    // Update session
    await supabase
      .from("soul_sessions")
      .update({
        status: "complete",
        extraction_started_at: new Date().toISOString(),
        extraction_completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const cookieOptions = "Path=/; Max-Age=86400; SameSite=Lax";
    return NextResponse.json(
      {
        session_slug,
        subject_name,
        dimensions,
        message: "Soul extraction complete",
      },
      {
        headers: {
          "Set-Cookie": `ns-slug=${session_slug};${cookieOptions}`,
        },
      }
    );
  } catch (err) {
    logger.error("Quick extract error:", err);
    return NextResponse.json(
      { error: "Extraction failed, please try again" },
      { status: 500 }
    );
  }
}

async function extractDimension(
  dimension: string,
  rawText: string
): Promise<any> {
  const userPrompt = `${DIMENSION_PROMPTS[dimension]}\n\nText content:\n${rawText.slice(0, 8000)}\n\nOutput format (JSON):\n{\n  "score": 0-1 number,\n  "insights": ["Key insight 1", "Key insight 2", ...],\n  "evidence": ["Evidence 1", "Evidence 2", ...],\n  "confidence": 0-1 number\n}`;

  const { content, error } = await callLLM(
    "You are a soul distillation analyst. Analyze based on text evidence, output JSON format only.",
    [{ role: "user", content: userPrompt }],
    { maxTokens: 2000 }
  );

  if (!content || error) {
    return {
      score: 0.5,
      insights: [error || "LLM call failed"],
      confidence: 0.3,
    };
  }

  try {
    return JSON.parse(content);
  } catch {
    return {
      score: 0.5,
      insights: [content.slice(0, 500)],
      confidence: 0.3,
    };
  }
}