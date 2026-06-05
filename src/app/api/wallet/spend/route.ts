import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/wallet/spend
 * Spend AGU credits (e.g., for marketplace purchases, demand posting, etc.)
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
    const { amount, description, reference_type, reference_id } = body;

    if (!amount || amount <= 0 || !description) {
      return Response.json({ error: 'Valid amount and description required' }, { status: 400 });
    }

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

    // Get current wallet
    const { data: wallet } = await supabase
      .from('soul_wallets')
      .select('*')
      .eq('session_id', session.id)
      .maybeSingle();

    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check sufficient balance
    if (wallet.agu_balance < amount) {
      return Response.json({
        error: 'Insufficient AGU balance',
        current_balance: wallet.agu_balance,
        requested: amount,
      }, { status: 402 });
    }

    // Spend credits and log transaction
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('soul_wallets')
      .update({
        agu_balance: wallet.agu_balance - amount,
        agu_lifetime_spent: wallet.agu_lifetime_spent + amount,
        updated_at: now,
      })
      .eq('session_id', session.id);

    if (updateError) {
      logger.error('Spend update error:', updateError);
      return Response.json({ error: 'Failed to spend credits' }, { status: 500 });
    }

    // Log transaction
    await supabase.from('soul_transactions').insert({
      session_id: session.id,
      type: 'spend',
      amount: -amount,
      description,
      reference_type,
      reference_id,
      created_at: now,
    });

    return Response.json({
      success: true,
      new_balance: wallet.agu_balance - amount,
      spent: amount,
    });
  } catch (err) {
    logger.error('Wallet spend error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
