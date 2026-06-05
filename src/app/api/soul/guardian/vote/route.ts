import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/guardian/vote
 * Guardians vote on soul engagement policies: suspend, downcase, or revive.
 * Replaces guardian_calibrations with a structured voting system.
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

    const guardId = authRes.data.user.id;
    const body = await req.json();
    const { share_slug, action, reason } = body;

    if (!share_slug || !action || !['suspend', 'downcase', 'revive'].includes(action)) {
      return Response.json({ error: 'share_slug and valid action (suspend|downcase|revive) required' }, { status: 400 });
    }

    // Check if guardian has already voted
    const { data: existingVote } = await supabase
      .from('guardian_votes')
      .select('*')
      .eq('share_slug', share_slug)
      .eq('guardian_id', guardId)
      .limit(1);

    if (existingVote && existingVote.length > 0) {
      return Response.json({ error: 'You already voted for this soul' }, { status: 409 });
    }

    // Record vote
    const { data: vote, error } = await supabase
      .from('guardian_votes')
      .insert({
        share_slug,
        guardian_id: guardId,
        action,
        reason,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Guardian vote error:', error);
      return Response.json({ error: 'Vote failed' }, { status: 500 });
    }

    // Get vote stats for this soul
    const { data: votes } = await supabase
      .from('guardian_votes')
      .select('action')
      .eq('share_slug', share_slug);

    const voteStats = (votes || []).reduce((acc, v) => {
      acc[v.action] = (acc[v.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Response.json({
      success: true,
      vote_id: vote.id,
      vote_stats: voteStats,
      message: `${action} vote recorded`,
    });
  } catch (err) {
    logger.error('Guardian vote error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
