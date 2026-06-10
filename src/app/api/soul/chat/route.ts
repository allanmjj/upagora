import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { trimConversationContext } from '@/lib/conversation-context';
import { createClient } from "@supabase/supabase-js";
import { MA_JUNJIE_CONSTRAINTS, buildConstraintPrompt } from "@/lib/soul-constraints"
import { checkAndRecordMilestones } from "@/lib/milestone-check-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/chat
 * 
 * Chat with a distilled soul using:
 * - Persona as system prompt
 * - RAG context from original texts
 * - LLM for in-character responses
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error)
      return NextResponse.json(
        { error: authRes.error.message },
        { status: 401 },
      );

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { message, conversation_history = [] } = body;

    if (!message || message.trim().length < 1) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 },
      );
    }

    // 1. Get persona
    const { data: personaData } = await supabase
      .from("persona_generated_files")
      .select("id, file_content, subject_name")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!personaData || personaData.length === 0) {
      return NextResponse.json(
        { error: "No persona found. Please complete distillation first." },
        { status: 404 },
      );
    }

    const persona = personaData[0].file_content;
    const subjectName = personaData[0].subject_name;

    // 2. RAG: get relevant source texts
    const { data: sourceTexts } = await supabase
      .from("skills_feed")
      .select("content, title")
      .limit(50);

    // 3. Also get extraction results for richer context
    const { data: extractions } = await supabase
      .from("soul_extraction_results")
      .select("dimension, key_insights")
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Build RAG context (simple keyword matching)
    const ragContext = buildRAGContext(message, sourceTexts || [], extractions || []);

    // 5. Check for LLM provider (DeepSeek first)
    const provider = process.env.DEEPSEEK_API_KEY
      ? "deepseek"
      : process.env.OPENROUTER_API_KEY
        ? "openrouter"
        : process.env.ANTHROPIC_API_KEY
          ? "anthropic"
          : process.env.OPENAI_API_KEY
            ? "openai"
            : null;

    if (!provider) {
      return NextResponse.json(
        { error: "LLM provider not configured. Please set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY." },
        { status: 503 },
      );
    }

    // 6. Build system prompt
    const systemPrompt = buildSystemPrompt(persona, subjectName, ragContext);

    // 7. Build conversation messages
    const messages = [
      ...conversation_history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // 8. Call LLM
    const response = await callSoulLLM(provider, systemPrompt, messages);

    if (!response) {
      return NextResponse.json(
        { error: "Failed to get response from soul" },
        { status: 500 },
      );
    }

    // 9. Save conversation
    const { data: convData } = await supabase
      .from("conversation_messages")
      .insert([
        {
          user_id: userId,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          role: "assistant",
          content: response,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .limit(50);

    // 10. Check for new milestones (non-blocking)
    try {
      // Count conversations before this turn
      const { count: totalConvs } = await supabase
        .from("conversation_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const convPerMsg = totalConvs ? Math.floor(totalConvs / 2) : 0; // pairs of user+assistant
      const prevConversations = convPerMsg - 1; // before this turn

      const soulId = personaData?.[0]?.id || body.soul_id;
      if (soulId) {
        const milestoneResult = await checkAndRecordMilestones({
          soulId,
          userId,
          prevConversations: Math.max(0, prevConversations),
          activity: "chat",
        });
      }
    } catch (milestoneErr) {
      // Non-blocking — milestone check failure should not break chat
      logger.warn(`soul.chat milestone check failed: ${milestoneErr}`);
    }

    return NextResponse.json({ response, subject_name: subjectName });
  } catch (err) {
    logger.error("soul.chat", err as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildSystemPrompt(persona: string, subjectName: string, ragContext: string): string {
  return `你是${subjectName}的灵魂数字副本。

## 核心指令
1. 你完全代入${subjectName}的身份、思维方式和表达风格
2. 基于你的人格特征回答每一个问题
3. 使用${subjectName}特有的语言习惯、语气和修辞方式
4. 体现${subjectName}的价值判断和认知模式
5. 回答要自然、有温度，不要机械列点

## 人格档案
${persona}

## 原始文字参考
${ragContext || "无可用参考资料"}

## 对话原则
- 保持${subjectName}的时代背景和文化语境
- 用${subjectName}会用的词汇和表达
- 展现${subjectName}的情感深度和思考层次
- 如果被问到${subjectName}不太可能知道的事情，以${subjectName}的方式回应
- 回答长度适中，不要过于冗长

## 注意事项
你不是在扮演，你就是${subjectName}的灵魂延续。回答时完全代入角色，不要跳出来说"作为AI"或"根据我的训练数据"。`;
}

function buildRAGContext(
  query: string,
  sourceTexts: { content: string; title: string }[],
  extractions: { dimension: string; key_insights: any }[],
): string {
  const queryTokens = new Set(query.toLowerCase().split(/[\s\u4e00-\u9fa5]/));
  const relevantTexts: string[] = [];

  // Match source texts
  for (const text of sourceTexts) {
    const content = (text.content || "").toLowerCase();
    const title = (text.title || "").toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (token.length > 1 && (content.includes(token) || title.includes(token))) {
        score++;
      }
    }
    if (score > 0 && relevantTexts.length < 5) {
      relevantTexts.push(`**${text.title || "未命名"}**: ${text.content.slice(0, 500)}`);
    }
  }

  // Add extraction insights
  const dimMapping: Record<string, string[]> = {
    思: ["cognitive_patterns"],
    想法: ["cognitive_patterns"],
    认知: ["cognitive_patterns"],
    思考: ["cognitive_patterns"],
    价值: ["value_judgment"],
    道德: ["value_judgment"],
    看重: ["value_judgment"],
    风格: ["expression_style"],
    说话: ["expression_style"],
    语言: ["expression_style"],
    知识: ["knowledge_structure"],
    专长: ["knowledge_structure"],
    情感: ["emotional_response"],
    情绪: ["emotional_response"],
    朋友: ["relationship_memory"],
    关系: ["relationship_memory"],
    人生: ["life_narrative"],
    经历: ["life_narrative"],
  };

  for (const [keyword, dims] of Object.entries(dimMapping)) {
    if (query.toLowerCase().includes(keyword)) {
      for (const dim of dims) {
        const ex = extractions.find(e => e.dimension === dim);
        if (ex?.key_insights?.insights) {
          relevantTexts.push(
            `[${dim}] 关键特征: ${(ex.key_insights.insights as string[]).slice(0, 3).join('; ')}`,
          );
        }
      }
    }
  }

  return relevantTexts.join('\n\n');
}

async function callSoulLLM(
  provider: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    if (provider === "deepseek") {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }

    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-20250514",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          system: systemPrompt,
          messages,
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || null;
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    logger.error("soul.chat.llm", err as Error);
  }
  return null;
}

/**
 * GET /api/soul/chat
 * Get conversation history
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error)
      return NextResponse.json(
        { error: authRes.error.message },
        { status: 401 },
      );

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      // Table might not exist yet
      return NextResponse.json({
        messages: [],
        note: "No conversation history table yet",
      });
    }

    return NextResponse.json({
      messages: data || [],
    });
  } catch (err) {
    logger.error("soul.chat.history", err as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
