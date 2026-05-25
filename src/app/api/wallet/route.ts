import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/wallet
 * Get wallet balance and stats for the current soul session
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

    // Find most recent active soul session for this user
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({
        agu_balance: 0,
        agu_lifetime_earned: 0,
        agu_lifetime_spent: 0,
        points_balance: 0,
        points_lifetime_earned: 0,
        last_mine_claim_at: null,
        mine_streak: 0,
        total_blocks_mined: 0,
      });
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('soul_wallets')
      .select('*')
      .eq('session_id', session.id)
      .maybeSingle();

    // If no wallet exists, return defaults
    if (!wallet) {
      return Response.json({
        agu_balance: 0,
        agu_lifetime_earned: 0,
        agu_lifetime_spent: 0,
        points_balance: 0,
        points_lifetime_earned: 0,
        last_mine_claim_at: null,
        mine_streak: 0,
        total_blocks_mined: 0,
      });
    }

    return Response.json(wallet);
  } catch (err) {
    console.error('Wallet GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/wallet/mine
 * Mine AGU tokens (daily claim)
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

    // Find most recent active soul session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    const now = new Date();

    // Upsert wallet
    const { data: walletBefore } = await supabase
      .from('soul_wallets')
      .select('*')
      .eq('session_id', session.id)
      .maybeSingle();

    // Check mining cooldown (24 hours)
    if (walletBefore?.last_mine_claim_at) {
      const lastClaim = new Date(walletBefore.last_mine_claim_at);
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastClaim < 24) {
        const remaining = Math.ceil(24 - hoursSinceLastClaim);
        return Response.json({
          error: 'Mining cooldown active',
          remaining_hours: remaining,
          last_claim_at: walletBefore.last_mine_claim_at,
        }, { status: 429 });
      }
    }

    // Calculate mine reward based on streak
    let streak = walletBefore?.mine_streak || 0;
    let pointsAdded = walletBefore?.points_lifetime_earned || 0;

    // Streak bonus: base 100 + streak * 10
    const aguBonus = 100 + streak * 10;
    streak += 1;
    pointsAdded += 10;

    // Update wallet
    const { data: walletUpdated, error } = await supabase
      .from('soul_wallets')
      .upsert({
        session_id: session.id,
        agu_balance: (walletBefore?.agu_balance || 0) + aguBonus,
        agu_lifetime_earned: (walletBefore?.agu_lifetime_earned || 0) + aguBonus,
        points_balance: (walletBefore?.points_balance || 0) + 10,
        points_lifetime_earned: (walletBefore?.points_lifetime_earned || 0) + 10,
        last_mine_claim_at: now.toISOString(),
        mine_streak: streak,
        total_blocks_mined: (walletBefore?.total_blocks_mined || 0) + 1,
        updated_at: now.toISOString(),
      }, { onConflict: 'session_id' })
      .select()
      .single();

    if (error) {
      console.error('Mine upsert error:', error);
      return Response.json({ error: 'Failed to mine' }, { status: 500 });
    }

    return Response.json({
      success: true,
      agu_mined: aguBonus,
      new_balance: walletUpdated.agu_balance,
      streak: walletUpdated.mine_streak,
      total_blocks: walletUpdated.total_blocks_mined,
    });
  } catch (err) {
    console.error('Wallet POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
