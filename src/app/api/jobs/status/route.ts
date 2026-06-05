import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/jobs/status
 * Get soul job/task status for assigned tasks.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('soul_jobs')
      .select('*, assignee:users(id, name, username)')
      .eq('assignee_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Jobs status error:', error);
      return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return Response.json({
      jobs: jobs || [],
      total: (jobs || []).length,
    });
  } catch (err) {
    logger.error('Jobs status error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/complete
 * Mark a soul job/task as completed.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { job_id, result_url, notes } = body;

    if (!job_id) {
      return Response.json({ error: 'job_id required' }, { status: 400 });
    }

    // Update job status
    const { error } = await supabase
      .from('soul_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_url,
        notes,
        completed_by: userId,
      })
      .eq('id', job_id)
      .eq('assignee_id', userId);

    if (error) {
      logger.error('Job complete error:', error);
      return Response.json({ error: 'Failed to complete job' }, { status: 500 });
    }

    // Award credits for completion
    const { data: wallet } = await supabase
      .from('soul_wallets')
      .select('agu_balance, agu_lifetime_earned')
      .eq('user_id', userId)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from('soul_wallets')
        .update({
          agu_balance: wallet.agu_balance + 50,
          agu_lifetime_earned: (wallet.agu_lifetime_earned || 0) + 50,
        })
        .eq('user_id', userId);
    }

    return Response.json({
      success: true,
      credits_earned: 50,
      message: 'Job completed! +50 AGU',
    });
  } catch (err) {
    logger.error('Job complete error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
