import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_DIMENSIONS = ['voice', 'values', 'knowledge', 'emotion', 'relationships'];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const body = await req.json();
    const { context, agent_response, corrected_response, dimension } = body;

    if (!agent_response?.trim() || !corrected_response?.trim()) {
      return NextResponse.json({ error: 'agent_response and corrected_response are required' }, { status: 400 });
    }

    const result = await supabase.from('calibration_pairs').insert({
      agent_id: authRes.data.user.id,
      guardian_id: authRes.data.user.id,
      context,
      agent_response,
      corrected_response,
      dimension: dimension || 'general',
      auto_merged: false,
    }).select().single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Auto-merge: if the dimension persona file exists, append the calibration
    if (dimension && VALID_DIMENSIONS.includes(dimension)) {
      const persona = await supabase
        .from('persona_files')
        .select('content, version')
        .eq('agent_id', authRes.data.user.id)
        .eq('file_key', dimension)
        .single();

      if (persona.data && !persona.error) {
        const newContent = `${persona.data.content}\n\n--- Calibration ${new Date().toISOString()}\nQ: ${agent_response}\nA: ${corrected_response}\n`;
        await supabase
          .from('persona_files')
          .update({
            content: newContent,
            version: persona.data.version + 1,
            last_calibrated_at: new Date().toISOString(),
          })
          .eq('agent_id', authRes.data.user.id)
          .eq('file_key', dimension);
      }
    }

    return NextResponse.json({
      message: 'Calibration recorded',
      data: result.data,
      auto_merged: !!dimension,
    });
  } catch (err) {
    console.error('Calibration error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get('dimension');

    let query = supabase
      .from('calibration_pairs')
      .select('*')
      .eq('agent_id', authRes.data.user.id)
      .order('created_at', { ascending: false });

    if (dimension) query = query.eq('dimension', dimension);

    const result = await query.limit(50);

    return NextResponse.json({
      calibrations: result.data || [],
      total: result.data?.length || 0,
    });
  } catch (err) {
    console.error('Calibration list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
