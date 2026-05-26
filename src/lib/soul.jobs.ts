import { createClient } from '@/lib/supabase/server';

// Soul Work Marketplace — 任务 → 灵魂接活 → 产出

// Soul picks up a job
export async function soulTakeJob(sessionId: string): Promise<any> {
  const supabase = await createClient();

  // Find an open job that matches soul's skills
  const { data: skills } = await supabase
    .from('soul_skills').select('skill_name, skill_level')
    .eq('session_id', sessionId);

  const { data: openJobs } = await supabase
    .from('soul_jobs').select('*')
    .eq('is_open', true)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!openJobs || openJobs.length === 0) {
    // Create a self-initiated job
    const selfJob = await supabase.from('soul_jobs').insert({
      title: `${new Date().toLocaleDateString()} - Self learning`,
      description: 'Read news and learn something new',
      job_type: 'learning',
      payment_agu: 5,
      assigned_to: sessionId,
      is_open: false,
      status: 'in_progress',
      created_at: new Date().toISOString(),
    }).select().single();

    return { job: selfJob.data, type: 'self_initiated' };
  }

  // Pick a job (simple random for now, can be weighted by skill later)
  const job = openJobs[Math.floor(Math.random() * openJobs.length)];

  // Assign to soul
  await supabase.from('soul_jobs')
    .update({ assigned_to: sessionId, is_open: false, status: 'in_progress' })
    .eq('id', job.id);

  return { job, type: 'marketplace' };
}

// Soul completes a job
export async function soulCompleteJob(sessionId: string, jobId: string, output: string, extra?: any): Promise<any> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('soul_jobs').select('*').eq('id', jobId).single();

  if (!job) throw new Error('Job not found');

  // Update job
  const { data: completed } = await supabase
    .from('soul_jobs').update({
      status: 'completed',
      output,
      output_extra: extra || null,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId).select().single();

  // Pay the soul
  const payment = job.payment_agu;
  await supabase.from('soul_wallets').upsert({
    session_id: sessionId,
    agu_balance: payment,
    agu_lifetime_earned: payment,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id' });

  // Record transaction
  await supabase.from('soul_transactions').insert({
    sender_session_id: job.posted_by || null,
    receiver_session_id: sessionId,
    amount_agu: payment,
    transaction_type: 'job_payment',
    reference_type: 'job',
    reference_id: jobId,
    description: `Completed job: ${job.title}`,
    created_at: new Date().toISOString(),
  });

  // Record memory
  await supabase.from('soul_memories').insert({
    session_id: sessionId,
    content: `[工作] 完成"${job.title}": ${output.substring(0, 300)}`,
    memory_type: 'work_output',
    event_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  // Update skill XP
  await supabase.from('soul_skills').upsert({
    session_id: sessionId,
    skill_name: job.job_type,
    skill_xp: 100,
    times_used: 1,
    skill_level: 1,
  }, { onConflict: 'session_id, skill_name' });

  return { completed: completed.data, payment };
}

// Generate work using LLM based on soul's personality
export async function generateWorkSoul(sessionId: string, jobTitle: string, jobDescription: string) {
  const supabase = await createClient();

  const { data: soul } = await supabase
    .from('soul_sessions').select('*').eq('id', sessionId).single();

  const prompt = `You are "${soul?.subject_name || 'a worker'}" working on this job.

Job: ${jobTitle}
Description: ${jobDescription}

Please produce your work output. Use your personality and style.

Work output:`;

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim();
    }
  } catch { /* fallback */ }

  return null;
}

// Create a new job posting
export async function createJob(title: string, description: string, jobType: string, paymentAGU: number) {
  const supabase = await createClient();

  const { data } = await supabase.from('soul_jobs').insert({
    title,
    description,
    job_type: jobType,
    payment_agu: paymentAGU,
    is_open: true,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select().single();

  return data;
}

// List all open jobs
export async function listOpenJobs(jobType?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('soul_jobs').select('*')
    .eq('is_open', true);

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const { data } = await query;
  return data || [];
}
