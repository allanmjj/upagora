import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source_type, source_name, raw_text, language } = body;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    if (!raw_text?.trim()) {
      return NextResponse.json({ error: 'raw_text is required' }, { status: 400 });
    }
    const result = await supabase.from('import_sessions').insert({
      agent_id: authRes.data.user.id,
      source_type: source_type || 'text',
      source_name,
      raw_text,
      char_count: raw_text.length,
      language: language || 'zh',
      extraction_status: 'pending',
    }).select().single();
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({
      message: 'Data imported successfully',
      import_session: result.data,
    });
  } catch (err) {
    console.error('Soul import error:', err);
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
    const status = searchParams.get('status');
    let query = supabase.from('import_sessions').select('*').eq('agent_id', authRes.data.user.id);
    if (status) query = query.eq('extraction_status', status);
    const result = await query.order('created_at', { ascending: false });
    return NextResponse.json({ imports: result.data || [], total: result.data?.length || 0 });
  } catch (err) {
    console.error('Soul imports list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
