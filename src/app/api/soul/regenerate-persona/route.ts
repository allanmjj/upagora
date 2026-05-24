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
  knowledge_structure: "知识结构体系",
  emotional_response: "情感反应与情绪模式",
  relationship_memory: "人际关系与社交风格",
  life_narrative: "生命叙事与关键经历",
};

/**
 * POST /api/soul/regenerate-persona
 * 
 * Regenerate persona.md from extraction results.
 * If LLM provider available: use LLM to compose a rich persona.
 * Otherwise: compose from structured data.
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

    // Get all merged extraction results for this user
    const { data: extractions, error: exErr } = await supabase
      .from("soul_extraction_results")
      .select("*")
      .limit(50)
      .order("created_at", { ascending: false });

    if (exErr) {
      return NextResponse.json(
        { error: exErr.message },
        { status: 500 },
      );
    }

    if (!extractions || extractions.length === 0) {
      // Try to extract from latest import session instead
      const { data: latestImport } = await supabase
        .from("import_sessions")
        .select("*")
        .limit(50)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestImport) {
        const { data: relatedExtractions } = await supabase
          .from("soul_extraction_results")
          .select("*")
          .limit(50)
          .order("created_at", { ascending: false });

        if (relatedExtractions && relatedExtractions.length > 0) {
          return regeneratePersonaFromData(
            userId,
            relatedExtractions,
            latestImport.subject_name,
          );
        }
      }

      return NextResponse.json(
        { error: "No extraction results found" },
        { status: 404 },
      );
    }

    // Get subject name from latest
    const subjectName = extractions[0]?.subject_name || "未知灵魂";
    return regeneratePersonaFromData(userId, extractions, subjectName);
  } catch (err) {
    console.error("Persona regeneration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function regeneratePersonaFromData(
  userId: string,
  extractions: any[],
  subjectName: string,
): Promise<NextResponse> {
  // Build structured persona data
  const personaData: Record<string, any> = {};
  
  for (const extraction of extractions) {
    if (extraction.dimension && extraction.key_insights) {
      personaData[extraction.dimension] = extraction.key_insights;
    }
  }

  // Check which dimensions are filled
  const filledDimensions = SEVEN_DIMENSIONS.filter(
    dim => personaData[dim]?.insights || personaData[dim]?.raw_text,
  );

  if (filledDimensions.length === 0) {
    return NextResponse.json(
      { error: "No valid extraction data to compose persona" },
      { status: 400 },
    );
  }

  // Try LLM-based generation if available
  const provider = process.env.OPENROUTER_API_KEY
    ? "openrouter"
    : process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : null;

  let personaMd: string;

  if (provider && filledDimensions.length >= 3) {
    // Compose extraction summary for LLM
    const extractionSummary = filledDimensions.map(dim => {
      const data = personaData[dim];
      const insights = data?.insights || [];
      const rawText = data?.raw_text || "";
      return `## ${DIMENSION_LABELS[dim] || dim}\n${Array.isArray(insights) ? insights.join('\n') : rawText}`;
    }).join('\n\n');

    const personaPrompt = `你是一位灵魂工程师。请根据以下7维度灵魂提取数据，为【${subjectName}】生成一个可用于AI角色扮演的人格配置文件（persona.md）。

提取数据：
${extractionSummary}

请生成一个完整的 persona.md 文件，包含以下部分：

1. 身份声明（我是谁）
2. 认知模式
3. 价值体系
4. 表达风格指南
5. 知识领域
6. 情感特征
7. 关系模式
8. 生命叙事
9. 对话指南（如何与TA对话）
10. 反特征（TA绝不会做的事/说的话）

要求：
- 用第二人称描述，让AI可以直接代入
- 表达风格部分要有具体的语言样本
- 反特征部分要具体
- 整体长度控制在2000字以内
- 格式为Markdown`;

    const llmRes = await callLLM(provider, personaPrompt);
    personaMd = llmRes || generateFallbackPersona(subjectName, personaData, filledDimensions);
  } else {
    // Fallback: structured persona from data
    personaMd = generateFallbackPersona(subjectName, personaData, filledDimensions);
  }

  // Save/update persona
  const { data: existingPersona } = await supabase
    .from("persona_generated_files")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  let personaId: string | undefined;
  const timestamp = new Date().toISOString();

  if (existingPersona && existingPersona.length > 0) {
    // Update existing
    const { data } = await supabase
      .from("persona_generated_files")
      .update({
        file_content: personaMd,
        file_path: `/persona/${userId}/persona.md`,
        persona_version: existingPersona[0].persona_version + 1,
        last_updated: timestamp,
      })
      .eq("id", existingPersona[0].id)
      .select()
      .limit(50)
  } else {
    // Create new
    const { data } = await supabase
      .from("persona_generated_files")
      .insert({
        user_id: userId,
        file_content: personaMd,
        file_path: `/persona/${userId}/persona.md`,
        persona_version: 1,
        subject_name: subjectName,
      })
      .select()
      .limit(50)
  }

  // Also update soul_extraction_results to mark as merged
  await supabase
    .from("soul_extraction_results")
    .update({ merged_to_persona: true })
    .in("id", extractions.map(e => e.id));

  // Update agent status
  await supabase
    .from("agent_profiles")
    .update({
      distillation_status: "persona_generated",
      persona_generated_at: timestamp,
    })
    .eq("user_id", userId);

  return NextResponse.json({
    message: "Persona generated successfully",
    persona_id: personaId,
    persona_md: personaMd,
    dimensions_used: filledDimensions.length,
    subject_name: subjectName,
  });
}

/**
 * GET /api/soul/regenerate-persona
 * Get current persona
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

    const { data, error } = await supabase
      .from("persona_generated_files")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      persona: data?.[0] || null,
    });
  } catch (err) {
    console.error("Persona GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generateFallbackPersona(
  subjectName: string,
  personaData: Record<string, any>,
  filledDimensions: string[],
): string {
  let md = `# ${subjectName} - 灵魂人格档案\n\n`;
  md += `> 自动生成的人格配置文件\n`;
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  md += `## 身份声明\n\n`;
  md += `我是${subjectName}。以下是我的灵魂特征：\n\n`;

  for (const dim of filledDimensions) {
    const data = personaData[dim];
    md += `## ${DIMENSION_LABELS[dim] || dim}\n\n`;
    if (data?.insights && Array.isArray(data.insights)) {
      md += data.insights.slice(0, 5).map((i: string) => `- ${i}`).join('\n');
    } else if (data?.raw_text) {
      md += data.raw_text;
    } else {
      md += `（数据待补充）`;
    }
    md += '\n\n';
  }

  md += `## 对话指南\n\n`;
  md += `- 保持${subjectName}的语气和风格\n`;
  md += `- 使用符合其认知模式的方式回答问题\n`;
  md += `- 体现其价值判断和信念体系\n`;

  return md;
}

async function callLLM(provider: string, prompt: string): Promise<string | null> {
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
            { role: "system", content: "你是一个灵魂工程师，专长是从分析数据生成高质量的人格配置。" },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
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
          system: "你是一个灵魂工程师，专长是从分析数据生成高质量的人格配置。",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
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
            { role: "system", content: "你是一个灵魂工程师，专长是从分析数据生成高质量的人格配置。" },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    console.error("LLM persona generation error:", err);
  }
  return null;
}
