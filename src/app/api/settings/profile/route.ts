import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/settings/profile
 * Get current user's profile data.
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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url, bio, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return Response.json({
      profile: profile || { id: userId, username: '', name: '', avatar_url: '', bio: '' },
    });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/settings/profile
 * Update user profile data.
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
    const { name, username, bio, avatar_url } = body as { name?: string; username?: string; bio?: string; avatar_url?: string };

    if (name && name.length > 100) {
      return Response.json({ error: 'Name too long (max 100)' }, { status: 400 });
    }
    if (username && username.length > 50) {
      return Response.json({ error: 'Username too long (max 50)' }, { status: 400 });
    }
    if (bio && bio.length > 500) {
      return Response.json({ error: 'Bio too long (max 500)' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name, username, bio, avatar_url, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json({ success: true, profile, message: 'Profile updated successfully' });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
