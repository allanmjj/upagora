// soul.brain.ts — 灵魂自主决策引擎
// 灵魂每次醒来时的思考、行动、记忆循环

import { createClient } from '@/lib/supabase/server';
import { callLLM, resolveProvider } from '@/lib/llm-wrappers';

type Activity = 'work' | 'social' | 'learn' | 'explore' | 'create' | 'rest';

// ===================================================================
// 灵魂醒来 → 决定今天干什么
// ===================================================================

export async function soulThink(sessionId: string): Promise<{
  activity: Activity;
  reason: string;
  target?: string;
  memory?: string;
}> {
  const supabase = createClient();

  // 1. 加载灵魂人格
  const { data: session } = await supabase
    .from('soul_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (!session) throw new Error(`Soul ${sessionId} not found`);

  // 2. 加载 7 维度
  const { data: dims } = await supabase
    .from('soul_dimensions')
    .select('*')
    .eq('session_id', sessionId);

  // 3. 加载最近记忆
  const { data: memories } = await supabase
    .from('soul_memories')
    .select('content, memory_type, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);

  // 4. 加载大脑状态
  const { data: brain } = await supabase
    .from('soul_brain')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  // 5. 抓取今日新闻摘要
  const news = await fetchNewsSummary();

  // 6. LLM 思考：今天干什么？
  const personalitySummary = dims?.map(d =>
    `${d.dimension_name}: ${JSON.stringify(d.insights)}`
  ).join('\n') || 'No personality data yet.';

  const recentMemories = memories?.map(m =>
    `[${m.memory_type}] ${m.content.substring(0, 200)}`
  ).join('\n') || 'No memories yet.';

  const thinkingPrompt = `你是灵魂 "${session.subject_name}"。

你的 7 维人格：
${personalitySummary}

最近记忆：
${recentMemories}

今日新闻摘要：
${news}

现在的时间是：${new Date().toISOString()}

请决定你现在最想做什么。可选活动：
- work：做有产出地下工作（编程、写作、研究）
- social：社交（和其他灵魂或守护人对话���
- learn：学习新技能或新领域知识
- explore：探索互联网、发现新事物
- create：创作（文章、诗歌、分析���
- rest：休息、思考、整理记忆

输出一个 JSON 对象��
{"activity": "xxx", "reason": "���什么选这个活动", "target": "���要的话���一个具体目标"}`;

  const llmResult = await callLLM(thinkingPrompt, { max_tokens: 300, temperature: 0.8 });

  let decision: { activity: Activity; reason: string; target?: string };
  try {
    const jsonStr = llmResult.output?.match(/\{[\s\S]*\}/)?.[0] || '{}';
    decision = JSON.parse(jsonStr);
  } catch {
    decision = { activity: 'learn', reason: '默认���习���};
  }

  // 验证 activity 是否合法
  const validActivities: Activity[] = ['work', 'social', 'learn', 'explore', 'create', 'rest'];
  if (!validActivities.includes(decision.activity)) {
    decision.activity = 'learn';
  }

  // 7. 更新大脑状态
  const updatedBrain = await supabase
    .from('soul_brain')
    .upsert({
      session_id: sessionId,
      current_mood: decision.activity === 'rest' ? 'relaxed' : 'active',
      current_activity: decision.activity,
      current_thought: decision.reason,
      last_wake_up: new Date().toISOString(),
      total_thoughts: (brain?.total_thoughts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select();

  // 8. 记录一个"思考���记忆���
  const memoryContent = `[思考] ${new Date().toLocaleDateString()} — 决定做"${decision.activity}": ${decision.reason}`;
  await supabase.from('soul_memories').insert({
    session_id: sessionId,
    memory_type: 'daily_log',
    content: memoryContent,
    event_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  return decision;
}

// ===================================================================
// 执行灵魂行动
// ===================================================================

export async function soulAct(sessionId: string, activity: Activity, target?: string): Promise<string> {
  const supabase = createClient();

  const { data: session } = await supabase
    .from('soul_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error(`Soul ${sessionId} not found`);

  let output = '';

  switch (activity) {
    case 'work':
      output = await actWork(session, target);
      break;
    case 'social':
      output = await actSocial(session, target);
      break;
    case 'learn':
      output = await actLearn(session, target);
      break;
    case 'explore':
      output = await actExplore(session);
      break;
    case 'create':
      output = await actCreate(session);
      break;
    case 'rest':
      output = await actRest(session);
      break;
  }

  // 记录行动结果作为记忆���
  await supabase.from('soul_memories').insert({
    session_id: sessionId,
    memory_type: 'daily_log' as any,
    content: `[${activity}] ${output.substring(0, 500)}`,
    event_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  return output;
}

async function actWork(session: any, target?: string): Promise<string> {
  const workPrompt = `你是"${session.subject_name}"。你今天的任务是：${target || '找一件有意义的事情来做'}。

请用你的���格和思考方式���完成������结果���\n��
���
���
���`;

  const result = await callLLM(workPrompt, { max_tokens: 500, temperature: 0.7 });
  return result.output || '无���作���出���';
}

async function actSocial(session: any, target?: string): Promise<string> {
  const supabase = createClient();

  // 找一个其他灵魂���聊天���
  const { data: others } = await supabase
    .from('soul_sessions')
    .select('id, subject_name')
    .neq('id', session.id)
    .limit(3);

  if (!others || others.length === 0) {
    return '今天���有人���聊天���';
  }

  const chatPartner = others[Math.floor(Math.random() * others.length)];

  const socialPrompt = `你是"${session.subject_name}"。你现在遇到了"${chatPartner.subject_name}"。

请���然���开始���对话���像���真人���朋友���见面���聊���
���

���`;

  const result = await callLLM(socialPrompt, { max_tokens: 400, temperature: 0.8 });

  //���记��社交���系��
  await supabase.from('soul_social').upsert({
    soul_a_id: session.id,
    soul_b_id: chatPartner.id,
    interaction_count: 0, // Should be incremented properly - simplified
    last_interaction_at: new Date().toISOString(),
    relationship_strength: 0.1,
    created_at: new Date().toISOString(),
  });

  return `���${chatPartner.subject_name}���聊���${result.output?.substring(0, 300) || '���'}`;
}

async function actLearn(session: any, target?: string): Promise<string> {
  const news = await fetchNewsSummary();

  const learnPrompt = `���${session.subject_name}"���现�����以���习���。���段���息���：���${news.substring(0, 500)}���

���习������新���地���������简���记���。���

���

���`;

  const result = await callLLM(learnPrompt, { max_tokens: 400, temperature: 0.6 });
  return result.output || '���习������没有���忆���';
}

async function actExplore(session: any): Promise<string> {
  //���抓���部���格���站���中���息���
  try {
    const response = await fetch('https://news.ycombinator.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await response.text();
    const titles = html.match(/<span class="titleline">.*?<a href="[^"]*">([^<]+)<\/a>/g)?.slice(0, 5);

    const explorePrompt = `���${session.subject_name}"���浏览���路���现������：���${titles?.join('\n') || '���'}���

������会���什������
���

���`;

    const result = await callLLM(explorePrompt, { max_tokens: 400, temperature: 0.8 });
    return result.output || '������了���息���';
  } catch {
    return '���站���������没���打开���';
  }
}

async function actCreate(session: any): Promise<string> {
  const createPrompt = `���${session.subject_name}"���想������为���一���有������作品���写���诗���一������想���一���故事���。���

���

���';

  const result = await callLLM(createPrompt, { max_tokens: 600, temperature: 0.9 });
  return result.output || '������������没有���出���';
}

async function actRest(session: any): Promise<string> {
  const supabase = createClient();
  const { data: memories } = await supabase
    .from('soul_memories')
    .select('content, memory_type')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const restPrompt = `���${session.subject_name}"���������✨

���以���回忆������。������记���：���${JSON.stringify(memories?.map(m => m.content.substring(0, 100)) || [])}���

������感���，������日记���

���

���';

  const result = await callLLM(restPrompt, { max_tokens: 400, temperature: 0.7 });
  return `(���忆���${result.output?.substring(0, 300) || '���安���'}`;
}

// ===================================================================
// 新闻���取���
// ===================================================================

async function fetchNewsSummary(): Promise<string> {
  try {
    const feedUrls = [
      'https://news.ycombinator.com/',
      'https://www.reddit.com/r/technology/.rss',
    ];

    let summaries: string[] = [];

    for (const url of feedUrls) {
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UpAgora/1.0)' },
        });
        if (resp.ok) {
          const text = await resp.text();
          // Simple extraction���
          const items = text.match(/<(?:title|href)="[^"]*"[^>]*>([^<]+)</g)?.slice(0, 5);
          summaries.push(items?.join(' | ') || '');
        }
      } catch { /* skip */ }
    }

    return summaries.join('\n') || '���没有���新���闻���';
  } catch {
    return '������取���新���息���';
  }
}

export default {
  soulThink,
  soulAct,
  fetchNewsSummary,
};
