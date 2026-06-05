import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/guardian/verify-heart
 * Guardian heart-verification: submit a soul verification challenge.
 * Guardians prove they know the soul deeply by answering about character traits.
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

    const guardId = authRes.data.user.id;

    const body = await req.json();
    const { share_slug, challenge, response, dimension } = body;

    if (!share_slug || !challenge || !response) {
      return Response.json({ error: 'share_slug, challenge, and response required' }, { status: 400 });
    }

    // Check if this guardian has verified heart for this soul
    const { data: existing } = await supabase
      .from('guardian_heart_verifications')
      .select('*')
      .eq('share_slug', share_slug)
      .eq('guardian_id', guardId)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ error: 'Already verified for this soul' }, { status: 409 });
    }

    // Record verification
    const { data: verification, error } = await supabase
      .from('guardian_heart_verifications')
      .insert({
        share_slug,
        guardian_id: guardId,
        challenge,
        response,
        dimension,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Verify heart error:', error);
      return Response.json({ error: 'Verification failed' }, { status: 500 });
    }

    return Response.json({
      success: true,
      verification_id: verification.id,
      message: 'Heart verification recorded',
    });
  } catch (err) {
    logger.error('Guardian verify-heart error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
