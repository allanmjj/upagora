import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/brain/feed
 * Feed data to the Soul Brain engine for continuous learning.
 * The brain engine analyzes incoming data and updates soul dimensions incrementally.
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
    const { text, source, dimension } = body;

    if (!text || text.trim().length < 10) {
      return Response.json({ error: 'Text too short (min 10 chars)' }, { status: 400 });
    }

    // Find most recent soul session
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

    // Record brain feed entry
    const { data: feed, error } = await supabase
      .from('skills_feed')
      .insert({
        session_id: session.id,
        content: text,
        title: source || 'Brain Feed',
        source: source || 'manual_feed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Brain feed error:', error);
      return Response.json({ error: 'Failed to feed brain' }, { status: 500 });
    }

    return Response.json({
      success: true,
      feed_id: feed.id,
      message: 'Data fed to soul brain engine',
      chars_processed: text.length,
    });
  } catch (err) {
    console.error('Brain feed error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
