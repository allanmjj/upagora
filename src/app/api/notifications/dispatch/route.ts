import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/notifications/dispatch
 * Internal: dispatch a notification to a user (called from other services).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, type, title, message, action_url } = body;

    if (!user_id || !type || !title) {
      return Response.json({ error: 'user_id, type, title required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id, type, title, message, action_url, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      console.error('Notification dispatch error:', error);
      return Response.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return Response.json({ success: true, notification_id: data.id });
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
