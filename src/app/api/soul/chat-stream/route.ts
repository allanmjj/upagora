import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/chat-stream
 *
 * SSE streaming version of soul chat.
 * Returns text/event-stream with incremental tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error) {
      return new Response(JSON.stringify({ error: authRes.error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { message, conversation_history = [], emotion } = body;

    if (!message || message.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Get persona
    const { data: personaData } = await supabase
      .from("persona_generated_files")
      .select("file_content, subject_name")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!personaData || personaData.length === 0) {
      return new Response(JSON.stringify({ error: "No persona found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const persona = personaData[0].file_content;
    const subjectName = personaData[0].subject_name;

    // 2. RAG context
    const { data: sourceTexts } = await supabase
      .from("skills_feed")
      .select("content, title")
      .limit(50);

    const { data: extractions } = await supabase
      .from("soul_extraction_results")
      .select("dimension, key_insights")
      .order("created_at", { ascending: false })
      .limit(10);

    const ragContext = buildRAGContext(message, sourceTexts || [], extractions || []);

    // 3. Emotion hint injection
    const emotionHint = emotion ? `\n## 当前情绪状态\n说话者当前情绪为"${emotion}"，回答时请体现这种情绪色彩。` : "";

    const systemPrompt = `你是${subjectName}的灵魂数字副本。

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
${emotionHint}
## 对话原则
- 保持${subjectName}的时代背景和文化语境
- 用${subjectName}会用的词汇和表达
- 展现${subjectName}的情感深度和思考层次
- 回答长度适中，不要过于冗长`;

    // 4. Build messages
    const messages = [
      ...conversation_history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // 5. Determine provider (DeepSeek first)
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
      return new Response(JSON.stringify({ error: "LLM provider not configured. Set DEEPSEEK_API_KEY." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6. Create SSE stream
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (provider === "openrouter" || provider === "openai") {
            const url = provider === "openrouter"
              ? "https://openrouter.ai/api/v1/chat/completions"
              : "https://api.openai.com/v1/chat/completions";
            const apiKey = provider === "openrouter"
              ? process.env.OPENROUTER_API_KEY
              : process.env.OPENAI_API_KEY;
            const model = provider === "openrouter"
              ? "anthropic/claude-sonnet-4-20250514"
              : "gpt-4o";

            const res = await fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                max_tokens: 2000,
                stream: true,
              }),
            });

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No reader");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content;
                  if (token) {
                    fullResponse += token;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ token, done: false })}\n\n`)
                    );
                  }
                } catch {}
              }
            }
          } else if (provider === "anthropic") {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": process.env.ANTHROPIC_API_KEY!,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                system: systemPrompt,
                messages,
                max_tokens: 2000,
                stream: true,
              }),
            });

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No reader");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    fullResponse += parsed.delta.text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ token: parsed.delta.text, done: false })}\n\n`)
                    );
                  }
                } catch {}
              }
            }
          }

          // Send done signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token: "", done: true, subject_name: subjectName, full_response: fullResponse })}\n\n`)
          );

          // Save conversation to DB
          await supabase.from("conversation_messages").insert([
            { user_id: userId, role: "user", content: message, created_at: new Date().toISOString() },
            { user_id: userId, role: "assistant", content: fullResponse, created_at: new Date().toISOString() },
          ]);

          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream failed", done: true })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat stream error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildRAGContext(
  query: string,
  sourceTexts: { content: string; title: string }[],
  extractions: { dimension: string; key_insights: any }[],
): string {
  const queryTokens = new Set(query.toLowerCase().split(/[\s\u4e00-\u9fa5]/));
  const relevantTexts: string[] = [];

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

  for (const ext of extractions) {
    if (ext.key_insights?.insights) {
      relevantTexts.push(
        `[${ext.dimension}] ${(ext.key_insights.insights as string[]).slice(0, 3).join('; ')}`
      );
    }
  }

  return relevantTexts.join('\n\n');
}
