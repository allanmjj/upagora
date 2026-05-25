import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/brain/report
 * Get soul brain processing report — what has been learned, metrics, and status.
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

    // Get soul session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, subject_name, distillation_phase')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    // Get all processing metrics
    const [feedsRes, memoriesRes, extractionsRes, skillsRes, calibsRes] = await Promise.all([
      supabase.from('skills_feed').select('id, created_at').eq('session_id', session.id),
      supabase.from('soul_memories').select('id, created_at').eq('session_id', session.id),
      supabase.from('soul_extraction_results').select('id, dimension, confidence_score').eq('session_id', session.id),
      supabase.from('soul_skills').select('id, created_at').eq('session_id', session.id),
      supabase.from('guardian_calibrations').select('id, created_at').eq('session_id', session.id),
    ]);

    const feeds = feedsRes.data || [];
    const memories = memoriesRes.data || [];
    const extractions = extractionsRes.data || [];
    const skills = skillsRes.data || [];
    const calibrations = calibsRes.data || [];

    // Calculate average confidence
    const avgConfidence = extractions.length > 0
      ? Math.round(extractions.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / extractions.length)
      : 0;

    // Calculate dimension coverage
    const uniqueDims = new Set(extractions.map(e => e.dimension)).size;
    const dimensionCoverage = Math.round((uniqueDims / 7) * 100);

    return Response.json({
      subject_name: session.subject_name,
      phase: session.distillation_phase,
      processing: {
        feeds_processed: feeds.length,
        memories_stored: memories.length,
        dimensions_extracted: uniqueDims,
        skills_learned: skills.length,
        calibrations_done: calibrations.length,
      },
      quality: {
        avg_confidence: avgConfidence,
        dimension_coverage: dimensionCoverage,
        overall_readiness: Math.round((avgConfidence * 0.6 + dimensionCoverage * 0.3 + calibrations.length * 0.1)),
      },
      timeline: {
        first_feed: feeds.length > 0 ? feeds[feeds.length - 1].created_at : null,
        latest_calibration: calibrations.length > 0 ? calibrations[calibrations.length - 1].created_at : null,
      },
    });
  } catch (err) {
    console.error('Brain report error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
