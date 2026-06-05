import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/devtools/soul-inspect
 * Debug endpoint for developers to inspect soul data structures.
 * Accessible only via auth header. Returns full soul diagnostic data.
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

    // Gather all soul data for this user
    const [sessionRes, importRes, extractRes, calibRes, walletRes, convRes] = await Promise.all([
      supabase.from('soul_sessions').select('*').eq('user_id', userId),
      supabase.from('soul_import_sessions').select('*').eq('user_id', userId),
      supabase.from('soul_extraction_results').select('id, dimension, confidence_score, created_at').eq('user_id', userId),
      supabase.from('guardian_calibrations').select('*').eq('user_id', userId),
      supabase.from('soul_wallets').select('*').eq('user_id', userId),
      supabase.from('conversation_messages').select('role, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    return Response.json({
      user: { id: userId },
      sessions: sessionRes.data || [],
      imports: importRes.data || [],
      extractions: extractRes.data || [],
      calibrations: calibRes.data || [],
      wallets: walletRes.data || [],
      recent_conversations: convRes.data || [],
      diagnostic: {
        total_imports: (importRes.data || []).length,
        total_extractions: (extractRes.data || []).length,
        total_calibrations: (calibRes.data || []).length,
        total_messages: (convRes.data || []).length,
        wallet_exists: !!(walletRes.data && walletRes.data.length > 0),
      },
    });
  } catch (err) {
    logger.error('Soul inspect error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
