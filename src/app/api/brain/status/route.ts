import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/brain/status
 * Get brain engine status metrics for the current soul.
 * Returns processing stats, memory usage, and learning metrics.
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

    // Get session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, subject_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    // Get brain metrics
    const [feedsRes, memoriesRes, skillsRes] = await Promise.all([
      supabase.from('skills_feed').select('id').eq('session_id', session.id),
      supabase.from('soul_memories').select('id').eq('session_id', session.id),
      supabase.from('soul_skills').select('id').eq('session_id', session.id),
    ]);

    const feeds = (feedsRes.data || []).length;
    const memories = (memoriesRes.data || []).length;
    const skills = (skillsRes.data || []).length;

    return Response.json({
      subject_name: session.subject_name,
      brain_status: 'active',
      processing: {
        feeds_processed: feeds,
        memories_stored: memories,
        skills_learned: skills,
        total_data_points: feeds + memories + skills,
      },
      learning_rate: memories > 0 ? Math.min(100, Math.round((memories / 7) * 100)) : 0,
      dimensions_ready: skills,
    });
  } catch (err) {
    console.error('Brain status error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
