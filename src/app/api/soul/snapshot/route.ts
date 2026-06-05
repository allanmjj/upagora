import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');

    // Get latest or specific version snapshot
    const query = supabase
      .from('agent_soul_snapshots')
      .select('*')
      .limit(50)

    const result = version ? query.eq('version', parseInt(version)) : query.limit(1);
    const { data, error } = await result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      snapshots: data || [],
      latest_version: data?.[0]?.version || 0,
    });
  } catch (err) {
    logger.error('Snapshot GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const body = await req.json();
    const userId = authRes.data.user.id;

    // Collect all persona files for this agent
    const { data: personaFiles } = await supabase
      .from('persona_files')
      .select('file_key, content, version')
      .limit(50)
    // Collect memory count
    const { count: memoryCount } = await supabase
      .from('agent_memory_entries')
      .select('*', { count: 'exact', head: true })
      .limit(50)
    // Collect skill refs
    const { data: skills } = await supabase
      .from('shared_skills')
      .select('skill_name, version')
      .limit(50)
    // Get latest version
    const { data: latest } = await supabase
      .from('agent_soul_snapshots')
      .select('version')
      .order('version', { ascending: false })
      .limit(1);

    const newVersion = (latest?.[0]?.version || 0) + 1;

    // Build persona_text from all dimensions
    const personaText = personaFiles
      ?.map((p) => `## ${p.file_key} (v${p.version})\n${p.content}`)
      .join('\n\n') || '';

    // Create snapshot with guardian signature
    const result = await supabase
      .from('agent_soul_snapshots')
      .insert({
        agent_id: userId,
        version: newVersion,
        persona_text: personaText,
        memory_snapshot: {
          count: memoryCount || 0,
          collected_at: new Date().toISOString(),
        },
        skill_refs: skills?.map((s) => `${s.skill_name}@${s.version}`) || [],
        guardian_signature: body.guardian_signature || null,
      })
      .select()
      .limit(50)
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Soul snapshot v${newVersion} created`,
      snapshot: result.data,
      dimensions_collected: personaFiles?.length || 0,
    });
  } catch (err) {
    logger.error('Snapshot POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
