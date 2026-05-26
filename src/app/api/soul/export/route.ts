import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/export
 * Export soul data as a portable JSON package.
 * Includes persona, extractions, calibrations, memories.
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

    // Get session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'No soul session found' }, { status: 404 });
    }

    // Bundle all soul data
    const [extractions, calibrations, memories, skills, snapshots, wallet] = await Promise.all([
      supabase.from('soul_extraction_results').select('*').eq('session_id', session.id),
      supabase.from('guardian_calibrations').select('*').eq('share_slug', session.share_slug).or(`session_id.eq.${session.id}`),
      supabase.from('soul_memories').select('*').eq('session_id', session.id),
      supabase.from('soul_skills').select('*').eq('session_id', session.id),
      supabase.from('soul_snapshots').select('*').eq('session_id', session.id).order('version', { ascending: false }).limit(5),
      supabase.from('soul_wallets').select('*').eq('user_id', userId),
    ]);

    const exportPackage = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      platform: 'UpAgora Soul Distillation',
      subject: {
        name: session.subject_name,
        share_slug: session.share_slug,
        distillation_phase: session.distillation_phase,
        persona_md: session.persona_md,
        created_at: session.created_at,
      },
      dimensions: {
        extractions: (extractions.data || []).map(e => ({
          dimension: e.dimension,
          confidence: e.confidence_score,
          key_insights: e.key_insights,
          created_at: e.created_at,
        })),
      },
      calibrations: (calibrations.data || []).map(c => ({
        agent_response: c.agent_response,
        corrected_response: c.corrected_response,
        dimension: c.dimension,
        created_at: c.created_at,
      })),
      memories: (memories.data || []).map(m => ({
        content: m.content,
        context_type: m.context_type,
        relevance_score: m.relevance_score,
        created_at: m.created_at,
      })),
      skills: (skills.data || []).map(s => ({
        content: s.content,
        title: s.title,
        created_at: s.created_at,
      })),
      latest_snapshots: (snapshots.data || []).map(s => ({
        version: s.snapshot_version,
        guardian_signature: s.guardian_signature,
        created_at: s.created_at,
      })),
      wallet: wallet.data?.[0] || null,
    };

    return new Response(JSON.stringify(exportPackage, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="soul-export-${session.share_slug}.json"`,
      },
    });
  } catch (err) {
    console.error('Soul export error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/soul/import-package
 * Import a soul data package from another session or external source.
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
    const { export_version, subject, dimensions, calibrations, memories, skills } = body;

    if (!export_version || !subject?.name) {
      return Response.json({ error: 'Valid export package required' }, { status: 400 });
    }

    // Option 1: Create a new personal soul session
    const { data: newSession, error: sessionError } = await supabase
      .from('soul_sessions')
      .insert({
        user_id: userId,
        subject_name: subject.name,
        distillation_phase: subject.distillation_phase || 'imported',
        persona_md: subject.persona_md,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Soul import session error:', sessionError);
      return Response.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Import extractions
    let importedCount = 0;
    if (dimensions?.extractions) {
      for (const ext of dimensions.extractions) {
        const { error } = await supabase
          .from('soul_extraction_results')
          .insert({
            session_id: newSession.id,
            user_id: userId,
            dimension: ext.dimension,
            confidence_score: ext.confidence,
            key_insights: ext.key_insights,
          });
        if (!error) importedCount++;
      }
    }

    return Response.json({
      success: true,
      session_id: newSession.id,
      imported_dimensions: importedCount,
      message: `Soul "${subject.name}" imported successfully with ${importedCount} dimensions.`,
    });
  } catch (err) {
    console.error('Soul import error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
