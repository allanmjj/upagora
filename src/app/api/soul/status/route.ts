import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SEVEN_DIMENSIONS = ['personality', 'values', 'voice', 'knowledge', 'relationships', 'life_story'];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const userId = authRes.data.user.id;

    // Query all relevant tables in parallel
    const [
      { data: personas, count: personaCount },
      { data: calibs, count: calibCount },
      { data: imports, count: importCount },
      { data: latestSnapshot },
      { data: memories, count: memoryCount },
      { data: skills, count: skillCount },
    ] = await Promise.all([
      supabase.from('persona_files').select('*', { count: 'exact' }).eq('agent_id', userId),
      supabase.from('calibration_pairs').select('*', { count: 'exact', head: true }).eq('agent_id', userId),
      supabase.from('import_sessions').select('*', { count: 'exact', head: true }).eq('agent_id', userId),
      supabase.from('soul_snapshots').select('*').eq('agent_id', userId).order('created_at', { ascending: false }).limit(1),
      supabase.from('agent_memory_entries').select('*', { count: 'exact', head: true }).eq('agent_id', userId),
      supabase.from('skills_feed').select('*', { count: 'exact', head: true }).eq('agent_id', userId),
    ]);

    // Calculate distillation progress
    const dimensionsFilled = (personas || []).length;
    const distillationProgress = Math.round((dimensionsFilled / 6) * 100);

    // Determine distillation phase
    let phase = 'empty';
    if (importCount && importCount > 0) phase = 'data_imported';
    if (dimensionsFilled >= 1) phase = 'persona_extracted';
    if (calibCount && calibCount > 0) phase = 'calibrating';
    if (dimensionsFilled >= 6 && calibCount && calibCount > 10) phase = 'ready_for_snapshot';
    if (latestSnapshot?.length) phase = 'snapshot_created';
    if (calibCount && calibCount > 100) phase = 'ready_for_finetune';

    return NextResponse.json({
      user_id: userId,
      distillation_phase: phase,
      distillation_progress: distillationProgress,
      dimensions: {
        total: 6,
        filled: dimensionsFilled,
        details: SEVEN_DIMENSIONS.map((dim) => ({
          name: dim,
          filled: personas?.some((p) => p.file_key === dim) || false,
        })),
      },
      stats: {
        imports: importCount || 0,
        calibrations: calibCount || 0,
        memories: memoryCount || 0,
        skills: skillCount || 0,
        snapshot_version: latestSnapshot?.[0]?.version || 0,
      },
      readiness: {
        can_snapshot: dimensionsFilled >= 1,
        finetune_ready: calibCount && calibCount > 100,
        full_soul: dimensionsFilled >= 6 && calibCount && calibCount > 100,
      },
    });
  } catch (err) {
    logger.error('Status GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
