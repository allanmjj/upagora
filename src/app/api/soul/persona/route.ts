import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_DIMENSIONS = ['personality', 'values', 'voice', 'knowledge', 'relationships', 'life_story'];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get('dimension');

    if (dimension) {
      const result = await supabase
        .from('persona_files')
        .select('*')
        .eq('agent_id', authRes.data.user.id)
        .eq('file_key', dimension)
        .single();

      if (result.error && result.error.code !== 'PGRST116') {
        return NextResponse.json({ error: result.error.message }, { status: 500 });
      }

      return NextResponse.json({
        dimension,
        content: result.data?.content || '',
        version: result.data?.version || 0,
      });
    }

    // Return all dimensions
    const result = await supabase
      .from('persona_files')
      .select('*')
      .eq('agent_id', authRes.data.user.id)
      .limit(50);

    return NextResponse.json({
      dimensions: result.data || [],
      complete: (result.data || []).length >= VALID_DIMENSIONS.length,
    });
  } catch (err) {
    logger.error('Persona GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });

    const body = await req.json();
    const { dimension, content } = body;

    if (!VALID_DIMENSIONS.includes(dimension)) {
      return NextResponse.json({ error: `Invalid dimension. Must be one of: ${VALID_DIMENSIONS.join(', ')}` }, { status: 400 });
    }

    // Upsert persona file
    const result = await supabase
      .from('persona_files')
      .upsert(
        {
          agent_id: authRes.data.user.id,
          file_key: dimension,
          content,
          version: body.version || 1,
          last_calibrated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,file_key' }
      )
      .select()
      .limit(50);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Persona dimension '${dimension}' updated`,
      data: result.data,
    });
  } catch (err) {
    logger.error('Persona PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
