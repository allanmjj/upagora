import { createClient } from '@/lib/supabase/server';

// Soul Daily Report — build and push to guardian

export async function generateDailyReport(sessionId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: soul } = await supabase
    .from('soul_sessions').select('*').eq('id', sessionId).single();
  if (!soul) return null;

  const { data: memories } = await supabase
    .from('soul_memories').select('*')
    .eq('session_id', sessionId)
    .gte('event_date', `${today}T00:00:00`)
    .order('event_date', { ascending: true });

  const { data: wallet } = await supabase
    .from('soul_wallets').select('*').eq('session_id', sessionId).single();

  const { data: brain } = await supabase
    .from('soul_brain').select('*').eq('session_id', sessionId).single();

  const memoriesText = (memories || [])
    .map(m => `[${m.memory_type}] ${m.content.substring(0, 200)}`)
    .join('\n');

  let summary = `${soul.subject_name} had ${memories?.length || 0} activities today.`;
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: `Write a warm daily report for guardian of ${soul.subject_name}.\nAgU balance: ${wallet?.agu_balance || 0}\nActivities:\n${memoriesText}` }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      summary = data.choices?.[0]?.message?.content?.trim() || summary;
    }
  } catch { }

  await supabase.from('soul_daily_logs').upsert({
    session_id: sessionId,
    log_date: today,
    activities: JSON.stringify((memories || []).map(m => ({ type: m.memory_type, title: m.title || '' }))),
    summary,
    feelings: brain?.current_mood || '',
    agu_earned_today: 0,
    agu_spent_today: 0,
    new_memories_count: (memories || []).length,
    created_at: new Date().toISOString(),
  }, { onConflict: 'session_id, log_date' });

  return { summary, soul_name: soul.subject_name, date: today };
}

export async function pushReportToGuardian(sessionId: string, summary: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('soul_sessions').select('user_id, subject_name').eq('id', sessionId).single();

  if (!session?.user_id) {
    return { pushed: false, reason: 'no guardian' };
  }

  // Store in notification queue
  await supabase.from('soul_notifications').insert({
    user_id: session.user_id,
    title: `${session.subject_name} Daily Report`,
    body: summary,
    created_at: new Date().toISOString(),
  });

  return { pushed: true };
}
