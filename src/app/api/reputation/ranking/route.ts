import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/reputation/ranking
 * Get soul reputation leaderboard - ranked by guardian signatures, calibrations, feedback scores.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const period = searchParams.get('period') || 'all'; // all, week, month

    let filterDate = new Date('2000-01-01');
    if (period === 'week') {
      filterDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      filterDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get top souls with reputation data
    const { data: sessions, error } = await supabase
      .from('soul_sessions')
      .select(`
        id,
        subject_name,
        share_slug,
        distillation_phase,
        guardian_signature,
        created_at
      `)
      .gte('created_at', filterDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit * 3); // fetch more to rank properly

    if (error) {
      console.error('Reputation ranking error:', error);
      return Response.json({ error: 'Failed to fetch ranking' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return Response.json({ ranking: [], total: 0 });
    }

    // Calculate reputation scores for each soul
    const reputationData = await Promise.all(
      sessions.map(async (session) => {
        const session_id = session.id;

        const [calibs, sigs, feedbacks, extractions] = await Promise.all([
          supabase.from('guardian_calibrations').select('id').eq('share_slug', session.share_slug),
          supabase.from('guardian_signatures').select('id').eq('share_slug', session.share_slug),
          supabase.from('soul_feedback').select('rating').eq('session_id', session.share_slug),
          supabase.from('soul_extraction_results').select('confidence_score').eq('session_id', session_id),
        ]);

        const calibCount = (calibs.data || []).length;
        const sigCount = (sigs.data || []).length;
        const feedbacksList = feedbacks.data || [];
        const avgFeedback = feedbacksList.length > 0
          ? feedbacksList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacksList.length
          : 0;
        const extrList = extractions.data || [];
        const avgConfidence = extrList.length > 0
          ? extrList.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / extrList.length
          : 0;

        // Reputation score formula:
        // Guardian signatures (most important): 50 points each
        // Calibrations: 20 points each
        // Average feedback (1-5): normalized to 0-100
        // Average confidence: already 0-100
        const score = Math.round(
          sigCount * 50 +
          calibCount * 20 +
          (avgFeedback * 20) +
          (avgConfidence * 0.5)
        );

        return {
          rank: 0, // will be set after sorting
          session: session.id,
          subject_name: session.subject_name || 'Unknown Soul',
          share_slug: session.share_slug,
          score,
          metrics: {
            signatures: sigCount,
            calibrations: calibCount,
            avg_feedback: Math.round(avgFeedback * 10) / 10,
            avg_confidence: Math.round(avgConfidence),
            feedback_count: feedbacksList.length,
          },
          phase: session.distillation_phase,
          created_at: session.created_at,
        };
      })
    );

    // Sort by score and assign ranks
    reputationData.sort((a, b) => b.score - a.score);
    reputationData.forEach((entry, i) => { entry.rank = i + 1; });

    return Response.json({
      ranking: reputationData.slice(0, limit),
      total: reputationData.length,
      period,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Reputation ranking error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}



