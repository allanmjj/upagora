import { createClient } from '@/lib/supabase/server';

// Soul Memory System — 经历 → 压缩 → 永久记忆

// Write a memory entry
export async function addMemory(sessionId: string, entry: {
  content: string;
  memory_type: 'daily_log' | 'conversation' | 'work_output' | 'news_digest' | 'social_event' | 'learning' | 'calibration';
  title?: string;
  tags?: string[];
  other_session_id?: string;
  event_date?: string;
}) {
  const supabase = createClient();
  const now = new Date().toISOString();

  await supabase.from('soul_memories').insert({
    session_id: sessionId,
    content: entry.content,
    memory_type: entry.memory_type,
    title: entry.title || '',
    tags: entry.tags || [],
    other_session_id: entry.other_session_id || null,
    event_date: entry.event_date || now,
    created_at: now,
  });
}

// Load recent memories for a soul
export async function getMemories(sessionId: string, limit = 20, memoryType?: string) {
  const supabase = createClient();

  let query = supabase
    .from('soul_memories')
    .select('*')
    .eq('session_id', sessionId)
    .order('event_date', { ascending: false })
    .limit(limit);

  if (memoryType) {
    query = query.eq('memory_type', memoryType);
  }

  const { data } = await query;
  return data || [];
}

// Compress memories using LLM — summarize a batch into one core memory
export async function compressMemories(sessionId: string, memoryIds: string[]) {
  const supabase = createClient();

  // Load the memories to compress
  const { data: memories } = await supabase
    .from('soul_memories')
    .select('*')
    .in('id', memoryIds);

  if (!memories || memories.length === 0) return null;

  const batchSize = memories.length;
  const contentBlock = memories.map(m => `[${m.memory_type}] ${m.content.substring(0, 300)}`).join('\n');

  const prompt = `You are a memory compression engine for a digital soul.

Compress these ${batchSize} memory entries into ONE concise, meaningful core memory.
Keep the emotional weight, key events, and personality-relevant details.
Remove fluff. Output the compressed memory in one paragraph.

Memories to compress:
${contentBlock}

Output ONLY the compressed memory text.`;

  // Use LLM to compress
  let summary = contentBlock.substring(0, 500);
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      summary = data.choices?.[0]?.message?.content?.trim() || summary;
    }
  } catch {
    // Fallback to simple truncation
    summary = `Summary of ${batchSize} experiences: ${contentBlock.substring(0, 300)}`;
  }

  // Store the compressed memory
  const { data: compressed } = await supabase.from('soul_memories').insert({
    session_id: sessionId,
    content: summary,
    memory_type: 'daily_log',
    title: `Compressed ${batchSize} memories → ${new Date().toLocaleDateString()}`,
    tags: ['compressed'],
    event_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }).select().single();

  // Mark originals as compressed
  await supabase
    .from('soul_memories')
    .update({ summary: '(compressed into core memory)' })
    .in('id', memoryIds);

  return compressed;
}

// Search memories by tag or keyword
export async function searchMemories(sessionId: string, query: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from('soul_memories')
    .select('*')
    .eq('session_id', sessionId)
    .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
    .order('event_date', { ascending: false })
    .limit(20);

  return data || [];
}

// Memory stats
export async function memoryStats(sessionId: string) {
  const supabase = createClient();

  const { data: all } = await supabase
    .from('soul_memories')
    .select('memory_type, id')
    .eq('session_id', sessionId);

  const stats: Record<string, number> = {};
  (all || []).forEach(m => {
    stats[m.memory_type] = (stats[m.memory_type] || 0) + 1;
  });

  return {
    total: all?.length || 0,
    by_type: stats,
  };
}
