import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, type } = body;

    if (!soul_id) {
      return NextResponse.json({ error: 'soul_id required' }, { status: 400 });
    }

    // Generate unique invite code
    const code = crypto.randomBytes(8).toString('hex').slice(0, 12);
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://upagora.com'}/invite/${code}`;

    // Store invite in database if table exists
    try {
      const { error } = await supabase
        .from('soul_invites')
        .insert({
          code,
          soul_id,
          type: type || 'chat',
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.warn('Failed to store invite:', error.message);
      }
    } catch (dbErr) {
      logger.warn('soul_invites table may not exist:', (dbErr as Error).message);
    }

    return NextResponse.json({
      code,
      invite_url: inviteUrl,
      soul_id,
      type: type || 'chat',
    });
  } catch (err) {
    logger.error('invite generate error:', err);
    return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
  }
}
