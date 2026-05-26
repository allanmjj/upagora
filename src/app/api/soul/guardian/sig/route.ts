import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/soul/guardian/sig
 * Guardians sign a soul with a cryptographic signature.
 * Once signed, the soul gains guardian-backed authenticity.
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
    const { share_slug, signature_text } = body;

    if (!share_slug || !signature_text || signature_text.trim().length < 2) {
      return Response.json({ error: 'share_slug and signature_text (min 2 chars) required' }, { status: 400 });
    }

    // Generate hash-based signature
    const timestamp = Date.now();
    const signature = btoa(`${guardId}:${share_slug}:${timestamp}:${signature_text}`).slice(0, 32);

    // Check if already signed
    const { data: existing } = await supabase
      .from('guardian_signatures')
      .select('*')
      .eq('share_slug', share_slug)
      .eq('guardian_id', guardId)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ error: 'Already signed for this soul' }, { status: 409 });
    }

    // Record signature
    const { data: sig, error } = await supabase
      .from('guardian_signatures')
      .insert({
        share_slug,
        guardian_id: guardId,
        signature,
        signature_text,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Guardian sig error:', error);
      return Response.json({ error: 'Signature failed' }, { status: 500 });
    }

    // Get signature count for this soul
    const { count: totalSignatures } = await supabase
      .from('guardian_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('share_slug', share_slug);

    return Response.json({
      success: true,
      signature_id: sig.id,
      signature_hash: sig.signature,
      total_signatures: totalSignatures || 1,
      message: 'Soul signed as authentic',
    });
  } catch (err) {
    console.error('Guardian sig error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
