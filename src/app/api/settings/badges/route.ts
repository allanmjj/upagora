import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/settings/badges
 * Get user's earned badges based on achievements.
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

    // Get user stats
    const [sessions, calibs, sigs, feedbacks, wallets, extractions] = await Promise.all([
      supabase.from('soul_sessions').select('id, share_slug, subject_name').eq('user_id', userId),
      supabase.from('guardian_calibrations').select('id').eq('user_id', userId),
      supabase.from('guardian_signatures').select('id').eq('guardian_id', userId),
      supabase.from('soul_feedback').select('id, rating').eq('user_id', userId),
      supabase.from('soul_wallets').select('agu_balance, mine_streak').eq('user_id', userId),
      supabase.from('soul_extraction_results').select('id').eq('user_id', userId),
    ]);

    const sessionCount = (sessions.data || []).length;
    const calibCount = (calibs.data || []).length;
    const sigCount = (sigs.data || []).length;
    const feedbackList = feedbacks.data || [];
    const wallet = wallets.data?.[0];

    // Define badges with unlock conditions
    const badgeDefs = [
      { id: 'first_soul', name: 'Soul Creator', icon: '🌱', desc: 'Create your first soul', unlocked: sessionCount >= 1 },
      { id: 'soul_calibrator', name: 'Soul Calibrator', icon: '🎯', desc: '10 soul calibrations', unlocked: calibCount >= 10 },
      { id: 'soul_signature', name: 'Soul Witness', icon: '✍️', desc: 'Sign your first soul', unlocked: sigCount >= 1 },
      { id: 'master_calibrator', name: 'Master Calibrator', icon: '🔬', desc: '100 soul calibrations', unlocked: calibCount >= 100 },
      { id: 'wallet_starter', name: 'Wallet Pioneer', icon: '💰', desc: 'First AGU mining', unlocked: wallet?.last_mine_claim_at != null },
      { id: 'mining_streak', name: 'Mining Fireball', icon: '🔥', desc: '7-day mining streak', unlocked: (wallet?.mine_streak || 0) >= 7 },
      { id: 'alchemy', name: 'Alchemy', icon: '⚗️', desc: '7-day mining streak', unlocked: wallet && wallet.agu_balance >= 1000 },
      { id: 'alchemy', name: 'Generator', icon: '⚡', desc: 'Mine 100 blocks', unlocked: (wallet?.total_blocks_mined || 0) >= 100 },
      { id: 'quality_seeker', name: 'Quality Seeker', icon: '⭐', desc: 'Submit 20 reviews with avg 4+', unlocked: feedbackList.length >= 20 && avgRating >= 4 },
      { id: 'soul_farm', name: 'Soul Grove', icon: '🌳', desc: 'Create 5 soul', unlocked: sessionCount >= 5 },
      { id: 'solar_system', name: 'Soul Galaxy', icon: '🌌', desc: 'Create 20 souls', unlocked: sessionCount >= 20 },
      { id: 'guardian', name: 'Eternal Guardian', icon: '🛡️', desc: 'Sign 10 souls', unlocked: sigCount >= 10 },
      { id: 'mature', name: 'Legendary Witness', icon: '🏆', desc: 'Sign 50 souls', unlocked: sigCount >= 50 },
    ];

    return Response.json({
      badges: badgeDefs,
      unlocked_count: badgeDefs.filter(b => b.unlocked).length,
      total_count: badgeDefs.length,
    });
  } catch (err) {
    console.error('Badges error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
