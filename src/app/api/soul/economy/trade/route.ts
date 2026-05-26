import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/economy/trade
 * Trade AGU tokens between two soul sessions
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
    const { toSessionId, amount, description = 'Trade' } = body;

    if (!toSessionId || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid trade parameters' }, { status: 400 });
    }

    // Find sender's session
    const { data: fromSession } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fromSession) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    if (fromSession.id === toSessionId) {
      return Response.json({ error: 'Cannot trade with yourself' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Atomic transfer using RPC or sequential checks
    // Get sender wallet
    const { data: senderWallet } = await supabase
      .from('soul_wallets')
      .select('agu_balance')
      .eq('session_id', fromSession.id)
      .single();

    if (!senderWallet || senderWallet.agu_balance < amount) {
      return Response.json({ error: 'Insufficient AGU balance' }, { status: 422 });
    }

    // Get or create receiver wallet
    let { data: receiverWallet } = await supabase
      .from('soul_wallets')
      .select('agu_balance')
      .eq('session_id', toSessionId)
      .maybeSingle();

    if (!receiverWallet) {
      const { data: newWallet } = await supabase
        .from('soul_wallets')
        .insert({ session_id: toSessionId, agu_balance: 0, agu_lifetime_earned: 0, agu_lifetime_spent: 0 })
        .select('agu_balance')
        .single();
      receiverWallet = newWallet;
    }

    // Deduct from sender
    const { error: senderErr } = await supabase
      .from('soul_wallets')
      .update({
        agu_balance: senderWallet.agu_balance - amount,
        agu_lifetime_spent: (senderWallet as any).agu_lifetime_spent + amount,
        updated_at: now,
      })
      .eq('session_id', fromSession.id)
      .gte('agu_balance', amount);

    if (senderErr) {
      return Response.json({ error: 'Transfer failed — balance changed' }, { status: 409 });
    }

    // Add to receiver
    await supabase
      .from('soul_wallets')
      .update({
        agu_balance: receiverWallet!.agu_balance + amount,
        agu_lifetime_earned: (receiverWallet as any).agu_lifetime_earned + amount,
        updated_at: now,
      })
      .eq('session_id', toSessionId);

    // Record transaction
    await supabase.from('soul_transactions').insert({
      from_session_id: fromSession.id,
      to_session_id: toSessionId,
      amount_agu: amount,
      transaction_type: 'trade',
      description,
      created_at: now,
    });

    return Response.json({
      success: true,
      amount,
      to_session_id: toSessionId,
      timestamp: now,
    });
  } catch (err) {
    console.error('Trade error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
