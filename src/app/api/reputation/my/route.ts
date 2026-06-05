import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase-client';
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth';

/**
 * GET /api/reputation/my
 * Get current user's soul reputation data.
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

    // Get user's soul session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, share_slug, subject_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    // Get reputation metrics
    const [calibs, sigs, feedbacks, extractions] = await Promise.all([
      supabase.from('guardian_calibrations').select('id').or(`share_slug.eq.${session.share_slug},session_id.eq.${session.id}`),
      supabase.from('guardian_signatures').select('id').eq('share_slug', session.share_slug),
      supabase.from('soul_feedback').select('rating').eq('session_id', session.share_slug),
      supabase.from('soul_extraction_results').select('confidence_score').eq('session_id', session.id),
    ]);

    const sigCount = (sigs.data || []).length;
    const calibCount = (calibs.data || []).length;
    const feedbacksList = feedbacks.data || [];
    const avgFeedback = feedbacksList.length > 0
      ? feedbacksList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacksList.length
      : 0;
    const extractionsList = extractions.data || [];
    const avgConfidence = extractionsList.length > 0
      ? extractionsList.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / extractionsList.length
      : 0;

    const score = Math.round(
      sigCount * 50 + calibCount * 20 + (avgFeedback * 20) + (avgConfidence * 0.5)
    );

    // Determine tier
    let tier = 'Soul Seed';
    if (score >= 500) tier = 'Mastersoul Legend';
    else if (score >= 300) tier = 'Soul Master';
    else if (score >= 200) tier = 'Soul Guardian';
    else if (score >= 100) tier = 'Soul Apprentice';

    return Response.json({
      subject_name: session.subject_name,
      score,
      tier,
      metrics: {
        signatures: sigCount,
        calibrations: calibCount,
        avg_feedback: Math.round(avgFeedback * 10) / 10,
        avg_confidence: Math.round(avgConfidence),
      },
    });
  } catch (err) {
    logger.error('My reputation error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
