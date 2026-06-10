import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Try to find invite in database
    let soul_id: string | null = null;
    let inviteType = 'chat';

    try {
      const { data: invite } = await supabase
        .from('soul_invites')
        .select('soul_id, type')
        .eq('code', code)
        .single();

      if (invite) {
        soul_id = invite.soul_id;
        inviteType = invite.type || 'chat';

        // Track invite view (update last_viewed_at; views increment handled via DB trigger)
        await supabase
          .from('soul_invites')
          .update({ last_viewed_at: new Date().toISOString() })
          .eq('code', code);
      }
    } catch (dbErr) {
      logger.warn('soul_invites table lookup failed:', (dbErr as Error).message);
    }

    // If no soul_id from DB, try to extract from code
    if (!soul_id) {
      return NextResponse.json({
        error: 'Invalid or expired invite code',
        code,
      }, { status: 404 });
    }

    // Get soul info
    const { data: soul } = await supabase
      .from('soul_gallery')
      .select('id, name, name_native, description')
      .eq('id', soul_id)
      .single();

    if (!soul) {
      return NextResponse.json({
        error: 'Soul not found',
        code,
      }, { status: 404 });
    }

    return NextResponse.json({
      code,
      soul_id: soul.id,
      soul_name: soul.name_native || soul.name,
      description: soul.description || '',
      type: inviteType,
      target_url: `/soul/${soul.id}`,
    });
  } catch (err) {
    logger.error('invite resolve error:', err);
    return NextResponse.json({ error: 'Failed to resolve invite' }, { status: 500 });
  }
}
