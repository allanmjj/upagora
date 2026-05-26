import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/voice/clone
 * Upload voice samples for soul voice cloning.
 * Collects audio samples to train a voice model.
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
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    // Validate max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'Audio too large (max 10MB)' }, { status: 400 });
    }

    // Find soul session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, share_slug')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    // Upload to storage
    const filename = `voice_samples/${session.share_slug}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('soul_assets')
      .upload(filename, uint8Array, {
        contentType: file.type || 'audio/wav',
      });

    if (uploadError) {
      console.error('Voice upload error:', uploadError);
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Record the sample
    const { data: sample } = await supabase
      .from('voice_samples')
      .insert({
        session_id: session.id,
        file_path: filename,
        file_size: file.size,
        duration_seconds: 0, // calculated on processing
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    return Response.json({
      success: true,
      sample_id: sample?.id,
      message: 'Voice sample uploaded. Upload more to improve voice clone quality.',
      samples_needed: Math.max(0, 10 - ((sample?.id || 0) === 'UNKNOWN' ? 0 : 1)),
    });
  } catch (err) {
    console.error('Voice clone error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/voice/status
 * Get voice cloning progress for current soul.
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

    // Find session
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

    // Get voice samples
    const { data: samples, count } = await supabase
      .from('voice_samples')
      .select('id, status, duration_seconds, created_at', { count: 'exact' })
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });

    const totalDuration = (samples || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const pendingCount = (samples || []).filter(s => s.status === 'pending').length;
    const processedCount = (samples || []).filter(s => s.status === 'processed').length;

    return Response.json({
      samples: count || 0,
      total_duration_seconds: totalDuration,
      pending: pendingCount,
      processed: processedCount,
      quality_estimate: totalDuration > 60 ? 'good' : totalDuration > 30 ? 'moderate' : 'low',
      recommendation: totalDuration < 60 ? 'Upload more voice samples (60s+ recommended)' : 'Ready for voice synthesis',
      samples_list: samples || [],
    });
  } catch (err) {
    console.error('Voice status error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
