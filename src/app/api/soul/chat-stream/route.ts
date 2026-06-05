import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveProvider } from '@/lib/llm';
import { getMemoryContext } from '@/lib/upagora_rag';
import { loadSoulConstraints } from '@/lib/soul-constraint-loader';
import { buildConstraintPrompt } from '@/lib/soul-constraints';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResp(401, { error: 'Missing auth' });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return jsonResp(401, { error: authRes.error.message });
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { message, soulId, soul_id, conversationHistory = [], emotion } = body;
    const resolvedSoulId = soulId || soul_id;

    if (!message || message.trim().length < 1) {
      return jsonResp(400, { error: 'Message required' });
    }

    // 1. Get persona — isolated per soulId
    let personaQuery = supabase
      .from('persona_generated_files')
      .select('file_content, subject_name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (resolvedSoulId) {
      personaQuery = personaQuery.eq('soul_id', resolvedSoulId);
    }

    const { data: personaData, error: personaError } = await personaQuery;

    if (personaError || !personaData || personaData.length === 0) {
      return jsonResp(404, { error: 'No persona found' });
    }

    const persona = personaData[0].file_content;
    const subjectName = personaData[0].subject_name;

    // 2. Load soul constraints (8 dimensions: era, education, skills, personality, beliefs, experience, language, bias)
    let constraintPrompt = '';
    try {
      if (resolvedSoulId) {
        const constraints = await loadSoulConstraints(resolvedSoulId, supabase);
        if (constraints) {
          constraintPrompt = buildConstraintPrompt(constraints);
        }
      }
    } catch {
      // No constraints available for this soul
    }

    // 3. Semantic RAG context (pgvector)
    let ragContext = '无可用参考资料';
    try {
      if (resolvedSoulId) {
        const memoryContext = await getMemoryContext(resolvedSoulId, [message], 5);
        if (memoryContext) {
          ragContext = memoryContext;
        } else {
          ragContext = await getExtractionContext(userId, resolvedSoulId);
        }
      } else {
        ragContext = await getExtractionContext(userId);
      }
    } catch (err) {
      logger.error('chat-stream.rag', err as Error);
    }

    // 4. Emotion hint
    const emotionHint = emotion
      ? `\n## 当前情绪状态\n说话者当前情绪为"${emotion}"，回答时请体现这种情绪色彩。`
      : '';

    // 5. Build system prompt with all context layers
    const systemPrompt = [
      `你是${subjectName}的灵魂副本。`,
      '',
      '## 核心指令',
      '1. 你完全代入' + subjectName + '的身份、思维方式和表达风格',
      '2. 基于你的人格特征回答每一个问题',
      '3. 使用' + subjectName + '特有的语言习惯、语气和修辞方式',
      '4. 体现' + subjectName + '的价值判断和认知模式',
      '5. 回答要自然、有温度，不要机械列点',
      '',
      '## 人格档案',
      persona,
    ];

    if (constraintPrompt) {
      systemPrompt.push('');
      systemPrompt.push('## 灵魂约束 (Knowledge Boundaries - 重要!)');
      systemPrompt.push(constraintPrompt);
    }

    systemPrompt.push('');
    systemPrompt.push('## 记忆参考');
    systemPrompt.push(ragContext);
    systemPrompt.push(emotionHint);
    systemPrompt.push('');
    systemPrompt.push('## 对话原则');
    systemPrompt.push('- 保持' + subjectName + '的时代背景和文化语境');
    systemPrompt.push('- 用' + subjectName + '会用的词汇和表达');
    systemPrompt.push('- 展现' + subjectName + '的情感深度和思考层次');
    systemPrompt.push('- 回答长度适中，不要过于冗长');

    // 6. Build conversation messages
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // 7. Resolve LLM provider
    const config = resolveProvider();
    if (!config) {
      return jsonResp(503, { error: 'LLM provider not configured' });
    }

    // 8. Create SSE stream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamProviderResponse(
            config,
            systemPrompt.join('\n'),
            messages,
            encoder,
            controller,
            (token) => { fullResponse += token; }
          );

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: '', done: true, subject_name: subjectName, full_response: fullResponse })}\n\n`
            )
          );

          // Save conversation to DB
          const records: any[] = [
            { user_id: userId, role: 'user', content: message, created_at: new Date().toISOString() },
            { user_id: userId, role: 'assistant', content: fullResponse, created_at: new Date().toISOString() },
          ];
          if (resolvedSoulId) {
            records[0].soul_id = resolvedSoulId;
            records[1].soul_id = resolvedSoulId;
          }
          await supabase.from('conversation_messages').insert(records);

          controller.close();
        } catch (err) {
          logger.error('chat-stream.stream', err as Error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed', done: true })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    logger.error('chat-stream', err as Error);
    return jsonResp(500, { error: 'Internal server error' });
  }
}

function jsonResp(status: number, data: any) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function streamProviderResponse(
  config: { provider: string; url: string; apiKey: string; model: string },
  systemPrompt: string,
  messages: { role: string; content: string }[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  onToken: (token: string) => void
) {
  const provider = config.provider;

  if (provider === 'gpt' || provider === 'openai') {
    const res = await fetch(provider === 'gpt' ? config.url : 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider === 'gpt' ? (process.env.OPENAI_API_KEY || config.apiKey) : config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 2000,
        stream: true,
      }),
    });
    await decodeOpenAIStream(res, encoder, controller, onToken);

  } else if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 2000,
        stream: true,
      }),
    });
    await decodeOpenAIStream(res, encoder, controller, onToken);

  } else if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages,
        max_tokens: 2000,
        stream: true,
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            onToken(parsed.delta.text);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: parsed.delta.text, done: false })}\n\n`)
            );
          }
        } catch {}
      }
    }
  }
}

async function decodeOpenAIStream(
  response: Response,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  onToken: (token: string) => void
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          onToken(token);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token, done: false })}\n\n`)
          );
        }
      } catch {}
    }
  }
}

async function getExtractionContext(userId: string, soulId?: string): Promise<string> {
  let query = supabase
    .from('soul_extraction_results')
    .select('dimension, key_insights')
    .eq('agent_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (soulId) {
    query = query.eq('soul_id', soulId);
  }

  const { data: extractions } = await query;
  if (!extractions || extractions.length === 0) return '无可用参考资料';

  const parts: string[] = [];
  for (const ext of extractions) {
    if (ext.key_insights?.insights) {
      const insights = Array.isArray(ext.key_insights.insights)
        ? ext.key_insights.insights
        : [JSON.stringify(ext.key_insights.insights)];
      parts.push(`[${ext.dimension}] ${insights.slice(0, 3).join('; ')}`);
    }
  }

  return parts.join('\n\n') || '无可用参考资料';
}