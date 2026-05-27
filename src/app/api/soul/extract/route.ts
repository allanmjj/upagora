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

const DIMENSION_LABELS: Record<string, string> = {
  cognitive_patterns: "认知模式与思维方式",
  value_judgment: "价值判断与道德观",
  expression_style: "表达风格与语言特征",
  knowledge_structure: "知识结构与时寸领域",
  emotional_response: "情感反应与情绪模式",
  relationship_memory: "人际关系与社交风格",
  life_narrative: "生命叙事与关键经历",
};

const DIMENSION_PROMPTS: Record<string, string> = {
  cognitive_patterns: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【认知模式与思维方式】。

分析维度：
1. 思维特征 - 抽象/具体、宏观/微观、直觉/逻辑、发散/收敛
2. 认知偏好 - 如何看待复杂问题？拆解方法？归纳还是演绎？
3. 思维定式 - 反复出现的思考框架、信念体系、底层假设
4. 决策模式 - 决策时优先考虑什么？风险评估风格？信息收集方式？
5. 认知边界 - 盲区和局限性在哪里？

请基于文字证据分析，不要泛泛而谈。`,

  value_judgment: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【价值判断标准与道德观】。

分析维度：
1. 核心价值观 - 最看重什么？（如：自由、忠诚、诚实、家庭、成就等）
2. 道德底线 - 什么绝对不妥协？什么是可以交易的？
3. 价值冲突处理 - 当价值冲突时如何取舍？优先级顺序？
4. 对他人行为的评判标准 - 喜欢/讨厌什么样的人？为什么？
5. 价值演变轨迹 - 价值观是否随时间变化？从什么变到什么？

请基于文字中的具体行为、观点、选择来推断，不要凭空想象。`,

  expression_style: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【表达风格与语言特征】。

分析维度（需要具体例子）：
1. 用词特征 - 常用词汇类型、专业术语、口语化程度
2. 句式特点 - 长句/短句偏好、修辞手法（比喻/反问/排比等）
3. 语气基调 - 幽默、严肃、温和、尖锐？情感浓烈还是克制？
4. 沟通策略 - 直接/委婉、命令/建议、说教/对话
5. 独特性标记 - 反复出现的表达方式、口头禅、标志性句式
6. 语境适应 - 是否根据不同对象/场景改变风格？如何改变？

重点是：如果你要模仿此人说话，需要抓住哪些关键特征？`,

  knowledge_structure: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【知识结构体系】。

分析维度：
1. 核心专长领域 - 哪些领域有深度专业知识？
2. 知识广度 - 涉猎哪些其他领域？广度如何？
3. 知识组织方式 - 如何连接不同领域的知识？类比？框架？
4. 知识获取方式 - 偏好书本学习、实践探索、还是向他人请教？
5. 知识更新模式 - 对新知识的态度？学习速度？
6. 表达中体现的知识 - 哪些引用、典故、专业概念反复出现？

请描绘一个"知识地图"式的结构，而非简单列领域。`,

  emotional_response: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【情感反应模式】。

分析维度：
1. 情绪频谱 - 最常出现的情绪状态是什么？极端情绪频率？
2. 触发器 - 什么情境容易引发强烈情感？正向/负向？
3. 表达方式 - 情绪是外放还是内敛？如何表达情感？
4. 应对机制 - 面对挫折/压力时的典型反应模式？
5. 情感韧性 - 恢复速度的证据？安全感与脆弱事件的经历？
6. 感受深度 - 情感深度？对细微情感的敏感度如何？

请基于文字中的情感表达、语气变化、行为反应来推断。`,

  relationship_memory: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【人际关系模式与社交风格】。

分析维度：
1. 社交角色倾向 - 领导者/协调者/观察者/服务者？
2. 关系深度偏好 - 偏好深入连接还是广泛社交？为什么？
3. 对待他人的方式 - 对不同对象（上级/平级/晚辈/弱者）如何？
4. 冲突处理方式 - 如何面对分歧和矛盾？
5. 依恋模式证据 - 安全型/回避型/焦虑型的相关证据？
6. 关系中的自我定位 - 在关系中更倾向于给予还是接受？为什么？

重点是：此人如何在关系中定义自己？`,

  life_narrative: `你是一个灵魂蒸馏分析专家。请分析以下文字，深度提取此人的【生命叙事体系】。

分析维度：
1. 核心叙事主题 - 此生认为最重要的是什么？主题贯穿始终？
2. 关键转折点 - 哪些事件被认为是"决定性时刻"？
3. 自我认同演变 - 如何理解"我是谁"？这个答案如何变化？
4. 未完成的追求 - 生命中还有哪些未完成的部分？
5. 苦难与成就 - 如何看待自己经历的苦难？如何定义成就？
6. 生死观与终极关怀 - 对生命的终极问题有什么看法？

重点是：此人如何用故事框架理解自己的人生？`,
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
    const { import_session_id, raw_text, subject_name } = body;

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
      // No LLM provider configured - skip real extraction, create placeholder results
      for (const dimension of SEVEN_DIMENSIONS) {
        const result = await supabase
          .from("soul_extraction_results")
          .insert({
            agent_id: userId,
            import_session_id,
            dimension,
            subject_name: subject_name || "未知",
            key_insights: {
              note: "LLM provider not configured - extraction placeholder",
              raw_score: 0,
            },
            confidence: 0,
            merged_to_persona: false,
          })
          .select()
          .limit(50);
        if (!result.error) extractionResults.push(Array.isArray(result.data) ? result.data[0] : result.data)
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

    // Real extraction with LLM (chunk text for better coverage)
    const textChunks = chunkText(raw_text, 8000);
    
    for (const dimension of SEVEN_DIMENSIONS) {
      const prompt = DIMENSION_PROMPTS[dimension];
      
      // Extract from each chunk, then merge
      const allInsights = [];
      for (const chunk of textChunks) {
        const llmResponse = await extractWithLLM({
          provider,
          prompt: `
${prompt}

文字内容（节选）：
${chunk}

输出格式：请按JSON格式返回分析结果，包含：
- insights: 关键洞察数组（至少5条，每条带证据引用）
- evidence: 文字中的直接证据引用（3-5条原文摘录）
- confidence: 0-1的数字
`,
        });
        if (llmResponse?.insights) {
          allInsights.push(llmResponse);
        }
      }

      // Merge insights from all chunks
      const merged = mergeExtractionResults(allInsights);

      const result = await supabase
        .from("soul_extraction_results")
        .insert({
          agent_id: userId,
          import_session_id,
          dimension,
          subject_name: subject_name || "未知",
          key_insights: merged,
          confidence: merged.confidence,
          merged_to_persona: false,
          text_chunks_processed: textChunks.length,
        })
        .select()
        .limit(50);
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
      text_chunks: textChunks.length,
    });
  } catch (err) {
    console.error("Soul extraction error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function chunkText(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    // Try to break at paragraph boundary
    let breakPoint = end;
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      if (lastNewline > start + maxChunkSize / 2) {
        breakPoint = lastNewline;
      }
    }
    chunks.push(text.slice(start, breakPoint).trim());
    start = breakPoint;
  }
  return chunks;
}

function mergeExtractionResults(results: any[]): any {
  if (results.length === 0) return { insights: [], confidence: 0 };
  if (results.length === 1) return results[0];

  // Merge insights, dedup by similarity (simple string overlap)
  const allInsights: string[] = [];
  const allEvidence: string[] = [];
  let totalConfidence = 0;

  for (const r of results) {
    if (r.insights) {
      for (const insight of r.insights) {
        const text = typeof insight === 'string' ? insight : JSON.stringify(insight);
        if (!allInsights.some(existing => stringSimilarity(existing, text) > 0.7)) {
          allInsights.push(text);
        }
      }
    }
    if (r.evidence) {
      for (const ev of r.evidence) {
        if (!allEvidence.some(existing => stringSimilarity(existing, ev) > 0.9)) {
          allEvidence.push(ev);
        }
      }
    }
    totalConfidence += (r.confidence || 0.7);
  }

  return {
    insights: allInsights.slice(0, 20),
    evidence: allEvidence.slice(0, 15),
    confidence: Math.min(1, totalConfidence / results.length),
    chunks_merged: results.length,
  };
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length === 0) return 0;
  // Simple token overlap
  const aTokens = new Set(shorter.toLowerCase().split(/\s+/));
  const bTokens = new Set(longer.toLowerCase().split(/\s+/));
  let matches = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) matches++;
  }
  return matches / aTokens.size;
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
            { role: "system", content: "你是一个灵魂蒸馏分析专家。你的分析需要基于文字证据，给出有深度的解读。输出JSON格式。" },
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
            system: "你是一个灵魂蒸馏分析专家。你的分析需要基于文字证据，给出有深度的解读。输出JSON格式。",
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
              { role: "system", content: "你是一个灵魂蒸馏分析专家。你的分析需要基于文字证据，给出有深度的解读。输出JSON格式。" },
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

    const userId = authRes.data.user.id;
    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get("dimension");
    
    let query = supabase
      .from("soul_extraction_results")
      .select("*")
      .eq("agent_id", userId)
      .limit(50);

    if (dimension) {
      query = query.eq("dimension", dimension);
    }

    const { data, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with labels
    const enriched = (data || []).map(item => ({
      ...item,
      dimension_label: DIMENSION_LABELS[item.dimension] || item.dimension,
    }));

    return NextResponse.json({ extractions: enriched });
  } catch (err) {
    console.error("Extraction GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
