import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { resolveProvider } from "@/lib/llm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/memory/compress
 *
 * Compress conversation history into key insights using LLM.
 * This reduces context window pressure by summarizing past conversations.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const {
      soul_id,
      messages,
      max_insights = 10,
      strategy = "summarize", // summarize | extract | hybrid
    } = body;

    if (!soul_id) {
      return NextResponse.json({ error: "soul_id required" }, { status: 400 });
    }

    // If no messages provided, fetch recent conversations from DB
    let conversationMessages = messages;
    if (!conversationMessages || conversationMessages.length === 0) {
      const { data: convData } = await supabase
        .from("conversation_messages")
        .select("role, content, created_at")
        .eq("soul_id", soul_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100);

      conversationMessages = convData?.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) || [];
    }

    if (conversationMessages.length === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        stats: { total_messages: 0, compressed_from: 0, compressed_to: 0 },
      });
    }

    // Get the config
    const config = resolveProvider();
    if (!config) {
      return NextResponse.json(
        { error: "LLM provider not configured" },
        { status: 503 }
      );
    }

    // Load soul persona for context
    const { data: personaData } = await supabase
      .from("persona_generated_files")
      .select("file_content")
      .eq("soul_id", soul_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const persona = personaData?.[0]?.file_content || "";

    // Build conversation text
    const conversationText = conversationMessages
      .map((m: any) => `[${m.role}]: ${m.content}`)
      .join("\n\n");

    // Build compression prompt based on strategy
    let systemPrompt: string;
    let userPrompt: string;

    switch (strategy) {
      case "summarize":
        systemPrompt = "You are a memory compression expert. Extract key insights, facts, and personality patterns from conversation transcripts.";
        userPrompt = `Compress the following conversation about ${soul_id} into at most ${max_insights} key insights.

${persona ? `Context (who this soul is supposed to be):\n${persona.slice(0, 500)}\n\n` : ""}Conversation:
---
${conversationText}
---

Output ONLY a JSON array of insight objects:
[{"type": "belief/value/knowledge/emotion/relationship/habit", "insight": "concise insight", "confidence": 0-100}]
`;
        break;

      case "extract":
        systemPrompt = "You are a data extraction expert. Extract specific facts and quotes from conversations.";
        userPrompt = `Extract the following from this conversation:
1. Key quotes that reveal personality
2. Stated beliefs or values
3. Knowledge displayed
4. Emotional reactions
5. Relationship dynamics

${persona ? `Soul context:\n${persona.slice(0, 500)}\n\n` : ""}Conversation:
---
${conversationText}
---

Output ONLY a JSON array:
[{"type": "quote/belief/knowledge/emotion/relationship", "content": "extracted text", "speaker": "user/soul"}]
`;
        break;

      case "hybrid":
      default:
        systemPrompt = "You are a dual-mode analyst. First summarize key themes, then extract specific supporting evidence.";
        userPrompt = `Analyze this conversation in two layers:
1. HIGH-LEVEL: What are the main themes revealed?
2. LOW-LEVEL: What specific quotes/examples support each theme?

${persona ? `Soul context:\n${persona.slice(0, 500)}\n\n` : ""}Conversation:
---
${conversationText}
---

Output a JSON object:
{"themes": [{"name": "theme", "description": "brief"}, ...], "evidence": [{"theme": "theme_name", "quote": "...", "from": "user/soul"}, ...], "new_insights": ["insight 1", "insight 2"], "persona_updates": {"field": "suggested_update"}, "calibration_needed": true/false}`;
    }

    // Call LLM for compression
    const config2 = resolveProvider();
    if (!config2) {
      return NextResponse.json({ error: "No LLM provider" }, { status: 503 });
    }

    const { callLLM } = await import("@/lib/llm");
    const result = await callLLM(
      systemPrompt,
      [{ role: "user", content: userPrompt }],
      { maxTokens: 2000 }
    );

    const content = result.content || "";

    // Parse compressed result
    let compressedData;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      compressedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      compressedData = { raw: content };
    }

    // Save compressed insights to DB (soul_embeddings table when available)
    let saved = 0;
    const insights = Array.isArray(compressedData)
      ? compressedData
      : [
          ...(compressedData.themes || []),
          ...(compressedData.evidence || []),
          ...(compressedData.new_insights || []).map((t: string) => ({
            type: "insight",
            content: t,
          })),
        ];

    for (const insight of insights.slice(0, 20)) {
      try {
        const content_str =
          (insight as any).insight ||
          (insight as any).content ||
          (insight as any).name ||
          JSON.stringify(insight);
        await supabase.from("soul_embeddings").insert({
          soul_id,
          content: content_str,
          category: (insight as any).type || "insight",
          summary: content_str.slice(0, 100),
        });
        saved++;
      } catch {
        // Table might not exist yet from migration - continue gracefully
      }
    }

    const totalChars = conversationText.length;

    return NextResponse.json({
      success: true,
      compressed: compressedData,
      saved_to_db: saved,
      stats: {
        total_messages: conversationMessages.length,
        total_chars: totalChars,
        insights_extracted: insights.length,
        compressed_to: JSON.stringify(compressedData).length,
        compression_ratio: totalChars
          ? Math.round(
              (1 - JSON.stringify(compressedData).length / totalChars) * 100
            )
          : 0,
      },
    });
  } catch (err) {
    logger.error("[memory-compress] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
