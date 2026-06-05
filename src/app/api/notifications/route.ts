import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase-client';

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
      logger.error('Notifications fetch error:', error);
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
    logger.error('Notifications error:', err);
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
        logger.error('Mark all read error:', error);
        return Response.json({ error: 'Failed to mark all as read' }, { status: 500 });
      }
    } else if (notification_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notification_id)
        .eq('user_id', userId);

      if (error) {
        logger.error('Mark read error:', error);
        return Response.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    logger.error('Notification read error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}


