import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/feedback
 * Record user feedback on soul responses.
 * Positive feedback reinforces behavior, negative feedback creates calibration data.
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
    const { response_id, rating, comment, dimensions } = body;

    if (!response_id || !rating || ![1, 2, 3, 4, 5].includes(rating)) {
      return Response.json({ error: 'response_id and rating (1-5) required' }, { status: 400 });
    }

    // Record feedback
    const { data: feedback, error } = await supabase
      .from('soul_feedback')
      .insert({
        session_id: response_id,
        user_id: userId,
        rating,
        comment,
        dimensions,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Feedback error:', error);
      return Response.json({ error: 'Failed to record feedback' }, { status: 500 });
    }

    return Response.json({
      success: true,
      feedback_id: feedback.id,
      message: rating >= 4 ? 'Great! This helps train the soul.' : 'Noted. We\'ll calibrate this dimension.',
    });
  } catch (err) {
    logger.error('Feedback error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
