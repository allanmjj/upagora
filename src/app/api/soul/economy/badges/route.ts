import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Badge definitions
const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string; threshold: number }> = {
  first_soul: { name: 'Soul Pioneer', description: 'Created your first soul', icon: '🌟', threshold: 1 },
  soul_master: { name: 'Soul Master', description: 'Created 5 souls', icon: '👑', threshold: 5 },
  soul_legend: { name: 'Soul Legend', description: 'Created 20 souls', icon: '🏆', threshold: 20 },
  chat_10: { name: 'Conversationalist', description: '10 chat messages', icon: '💬', threshold: 10 },
  chat_100: { name: 'Wordsmith', description: '100 chat messages', icon: '📜', threshold: 100 },
  mine_10: { name: 'Miner', description: 'Mined 10 times', icon: '⛏️', threshold: 10 },
  mine_50: { name: 'Gold Rush', description: 'Mined 50 times', icon: '🥇', threshold: 50 },
  trade_5: { name: 'Trader', description: '5 trades completed', icon: '🤝', threshold: 5 },
  guardian: { name: 'Guardian', description: 'Verified a soul heart', icon: '🛡️', threshold: 1 },
  popular: { name: 'Influencer', description: '10 followers', icon: '⭐', threshold: 10 },
};

/**
 * GET /api/soul/economy/badges
 * Get badges for the current user's soul session
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

    // Get user's session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ earned: [], available: Object.keys(BADGE_DEFINITIONS).map(k => BADGE_DEFINITIONS[k]) });
    }

    // Get existing badges
    const { data: earnedBadges } = await supabase
      .from('soul_badges')
      .select('badge_id, earned_at')
      .eq('session_id', session.id);

    const earnedSet = new Set((earnedBadges || []).map(b => b.badge_id));

    // Calculate stats for potential new badges
    const { count: soulCount } = await supabase
      .from('soul_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: messageCount } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: wallet } = await supabase
      .from('soul_wallets')
      .select('total_blocks_mined')
      .eq('session_id', session.id)
      .maybeSingle();

    const { count: tradeCount } = await supabase
      .from('soul_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('from_session_id', session.id)
      .eq('transaction_type', 'trade');

    // Check and award new badges
    const stats: Record<string, number> = {
      first_soul: soulCount || 0,
      soul_master: soulCount || 0,
      soul_legend: soulCount || 0,
      chat_10: messageCount || 0,
      chat_100: messageCount || 0,
      mine_10: wallet?.total_blocks_mined || 0,
      mine_50: wallet?.total_blocks_mined || 0,
      trade_5: tradeCount || 0,
      guardian: 0,
      popular: 0,
    };

    const newBadges: string[] = [];
    const now = new Date().toISOString();

    for (const [badgeId, def] of Object.entries(BADGE_DEFINITIONS)) {
      if (!earnedSet.has(badgeId) && (stats[badgeId] || 0) >= def.threshold) {
        await supabase.from('soul_badges').insert({
          session_id: session.id,
          badge_id: badgeId,
          earned_at: now,
        });
        newBadges.push(badgeId);
      }
    }

    return Response.json({
      earned: [
        ...((earnedBadges || []).map(b => ({
          id: b.badge_id,
          ...BADGE_DEFINITIONS[b.badge_id],
          earned_at: b.earned_at,
        }))),
        ...newBadges.map(id => ({
          id,
          ...BADGE_DEFINITIONS[id],
          earned_at: now,
        })),
      ],
      newly_earned: newBadges,
      stats,
    });
  } catch (err) {
    console.error('Badges error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
