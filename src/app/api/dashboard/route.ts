import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase-client';

/**
 * GET /api/dashboard
 * Returns consolidated dashboard data: souls under guardian care + notifications.
 * Auth: Bearer token in Authorization header.
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

    // Load soul IDs where user is guardian
    const { data: guardianSouls } = await supabase
      .from('soul_guardians')
      .select('soul_id')
      .eq('user_id', userId);

    if (!guardianSouls || guardianSouls.length === 0) {
      // No souls - return empty with notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      return Response.json({
        souls: [],
        notifications: notifs || [],
      });
    }

    const soulIds = guardianSouls.map(g => g.soul_id);

    // Load soul extraction data (single query)
    const { data: soulData } = await supabase
      .from('soul_extraction_results')
      .select('*')
      .in('id', soulIds);

    // Load town states (single query instead of N+1)
    const { data: townStates } = await supabase
      .from('soul_states')
      .select('*')
      .in('soul_id', soulIds);

    // Build lookup map for town states
    const stateMap = new Map();
    (townStates || []).forEach(s => stateMap.set(s.soul_id, s));

    // Combine soul data with town state
    const souls = (soulData || []).map(soul => ({
      ...soul,
      mood: stateMap.get(soul.id)?.mood || 'calm',
      energy: stateMap.get(soul.id)?.energy || 50,
      social_need: stateMap.get(soul.id)?.social_need || 50,
      is_in_town: stateMap.get(soul.id)?.is_in_town || false,
      current_region: stateMap.get(soul.id)?.current_region || 'plaza',
      last_activity: stateMap.get(soul.id)?.updated_at || '',
    }));

    // Load notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({
      souls,
      notifications: notifs || [],
    });
  } catch (e) {
    logger.error('Dashboard API error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
