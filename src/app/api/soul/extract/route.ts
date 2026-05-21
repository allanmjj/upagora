import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const DIMENSION_PROMPTS: Record<string, string> = {
  cognitive_patterns: "请分析以下文字，提取此人独特的认知模式、思维方式、思考习惯和决策风格。重点关注：1) 如何看待复杂问题 2) 有哪些思维定式或信念 3) 决策时考虑哪些因素",
  value_judgment: "请分析以下文字，提取此人核心的价值判断标准、道德底线和优先事项。重点关注：1) 什么是他最看重的 2) 什么是他不可妥协的 3) 价值观排序",
  expression_style: "请分析以下文字，提取此人独特的表达风格、语言习惯和沟通模式。重点关注：1) 常用词汇和句式 2) 幽默感和修辞方式 3) 语气和情感色彩 4) 独特的口头禅或表达方式",
  knowledge_structure: "请分析以下文字，提取此人的知识结构、专长领域和知识盲区。重点关注：1) 在哪些领域有深度知识 2) 知识的获取方式 3) 知识组织框架",
  emotional_response: "请分析以下文字，提取此人的情感反应模式、情绪触发点和应对方式。重点关注：1) 常见的情绪反应 2) 压力下的表现 3) 情感表达的深度和广度",
  relationship_memory: "请分析以下文字，提取此人的人际关系模式、重要关系和社交风格。重点关注：1) 对待不同类型人的方式 2) 关系维护模式 3) 社交偏好",
  life_narrative: "请分析以下文字，提取此人生命叙事、关键经历和人生转折。重点关注：1) 生命中的重要转折点 2) 对自己的故事如何理解 3) 未完成的追求",
};

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

    const body = await req.json();
    const { import_session_id, raw_text } = body;

    if (!raw_text || raw_text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Text too short for extraction (minimum 50 characters)",
        },
        { status: 400 },
      );
    }

    const userId = authRes.data.user.id;

    // Update import session status
    if (import_session_id) {
      await supabase
        .from("import_sessions")
        .update({ extraction_status: "extracting" })
        .eq("id", import_session_id);
    }

    // Extract each dimension using LLM
    const extractionResults = [];
    const provider = process.env.OPENROUTER_API_KEY
      ? "openrouter"
      : process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : process.env.OPENAI_API_KEY
          ? "openai"
          : null;

    if (!provider) {
      // No LLM provider configured - skip real extraction, create placeholder results
      for (const dimension of SEVEN_DIMENSIONS) {
        const result = await supabase
          .from("soul_extraction_results")
          .insert({
            agent_id: userId,
            import_session_id,
            dimension,
            key_insights: {
              note: "LLM provider not configured - extraction placeholder",
              raw_score: 0,
            },
            confidence: 0,
            merged_to_persona: false,
          })
          .select()
          .single();

        if (!result.error) extractionResults.push(result.data);
      }

      // Update import session
      if (import_session_id) {
        await supabase
          .from("import_sessions")
          .update({
            extraction_status: "completed",
            extracted_at: new Date().toISOString(),
          })
          .eq("id", import_session_id);
      }

      return NextResponse.json({
        message: "Extraction placeholder created (LLM provider not configured)",
        results: extractionResults,
        dimensions_extracted: SEVEN_DIMENSIONS.length,
      });
    }

    // Real extraction with LLM
    for (const dimension of SEVEN_DIMENSIONS) {
      const prompt = DIMENSION_PROMPTS[dimension];
      const llmResponse = await extractWithLLM({
        provider,
        prompt: `

${prompt}

文字内容：
${raw_text.slice(0, 4000)}

输出格式：请按JSON格式返回分析结果，包含：1) 关键洞察（字符串数组）2) 置信度（0-1 数字）3) 重要性分数（1-10 数字）`,
      });

      const result = await supabase
        .from("soul_extraction_results")
        .insert({
          agent_id: userId,
          import_session_id,
          dimension,
          key_insights: llmResponse || { note: "extraction failed" },
          confidence: 0.7,
          merged_to_persona: false,
        })
        .select()
        .single();

      if (!result.error) extractionResults.push(result.data);
    }

    // Update import session
    if (import_session_id) {
      await supabase
        .from("import_sessions")
        .update({
          extraction_status: "completed",
          extracted_at: new Date().toISOString(),
        })
        .eq("id", import_session_id);
    }

    return NextResponse.json({
      message: `Extraction complete for ${extractionResults.length} dimensions`,
      results: extractionResults,
      dimensions_extracted: extractionResults.length,
    });
  } catch (err) {
    console.error("Soul extraction error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function extractWithLLM({
  provider,
  prompt,
}: {
  provider: string;
  prompt: string;
}): Promise<any> {
  try {
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
            { role: "system", content: "你是一个灵魂蒸馏分析专家。" },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      try {
        return JSON.parse(content);
      } catch {
        return { raw_text: content };
      }
    }

    if (provider === "anthropic") {
      const res = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            system: "你是一个灵魂蒸馏分析专家。",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
          }),
        },
      );
      const data = await res.json();
      const content = data.content?.[0]?.text || "{}";
      try {
        return JSON.parse(content);
      } catch {
        return { raw_text: content };
      }
    }

    if (provider === "openai") {
      const res = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "你是一个灵魂蒸馏分析专家。" },
              { role: "user", content: prompt },
            ],
            max_tokens: 2000,
          }),
        },
      );
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      try {
        return JSON.parse(content);
      } catch {
        return { raw_text: content };
      }
    }

    return { error: "Unknown provider" };
  } catch (err) {
    console.error("LLM extraction error:", err);
    return { error: "LLM call failed" };
  }
}

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

    const { data, error } = await supabase
      .from("soul_extraction_results")
      .select("*")
      .eq("agent_id", authRes.data.user.id)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ extractions: data || [] });
  } catch (err) {
    console.error("Extraction GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
