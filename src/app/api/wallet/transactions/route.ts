import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/wallet/transactions
 * Get wallet transaction history for the current soul
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
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    // Find most recent active soul session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ transactions: [] });
    }

    // Get transactions
    const { data: transactions, error } = await supabase
      .from('soul_transactions')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Transactions GET error:', error);
      return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return Response.json({ transactions: transactions || [] });
  } catch (err) {
    console.error('Wallet transactions error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
