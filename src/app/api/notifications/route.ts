import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/notifications
 * Get user notifications.
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
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Notifications fetch error:', error);
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return Response.json({
      notifications: data || [],
      unread_count: unreadCount || 0,
    });
  } catch (err) {
    console.error('Notifications error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notifications/read
 * Mark notifications as read.
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
    const { notification_id, mark_all_read } = body;

    if (mark_all_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Mark all read error:', error);
        return Response.json({ error: 'Failed to mark all as read' }, { status: 500 });
      }
    } else if (notification_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notification_id)
        .eq('user_id', userId);

      if (error) {
        console.error('Mark read error:', error);
        return Response.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Notification read error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notifications/dispatch
 * Internal: dispatch a notification to a user (called from other services).
 */
export async function POST_dispatch(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, type, title, message, action_url } = body;

    if (!user_id || !type || !title) {
      return Response.json({ error: 'user_id, type, title required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        action_url,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Notification dispatch error:', error);
      return Response.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return Response.json({
      success: true,
      notification_id: data.id,
    });
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
