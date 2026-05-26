import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/admin/stats
 * Admin dashboard stats - aggregate view of platform usage.
 */
export async function GET(req: NextRequest) {
  try {
    // Basic auth check (admin token)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    // Get aggregate stats
    const [sessions, conversations, feedback, wallets, imports, extractions, calibrations] = await Promise.all([
      supabase.from('soul_sessions').select('id, created_at', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('conversation_messages').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('soul_feedback').select('id, rating', { count: 'exact', head: true }),
      supabase.from('soul_wallets').select('agu_balance, last_mine_claim_at'),
      supabase.from('soul_import_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('soul_extraction_results').select('id', { count: 'exact', head: true }),
      supabase.from('guardian_calibrations').select('id', { count: 'exact', head: true }),
    ]);

    const totalWalletValue = (wallets.data || []).reduce((sum: number, w: any) => sum + (w.agu_balance || 0), 0);

    const avgRating = feedback.data && feedback.data.length > 0
      ? Math.round(feedback.data.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / (feedback.count || 1) * 10) / 10
      : 0;

    return Response.json({
      stats: {
        souls_created_7d: sessions.count || 0,
        messages_24h: conversations.count || 0,
        total_feedback: feedback.count || 0,
        avg_rating,
        total_wallet_value_agu: totalWalletValue,
        total_imports: imports.count || 0,
        total_extractions: extractions.count || 0,
        total_calibrations: calibrations.count || 0,
      },
      wallets: wallets.data?.slice(0, 10).map((w: any) => ({
        agu_balance: w.agu_balance,
        last_claim: w.last_mine_claim_at,
      })) || [],
      healthy: true,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
