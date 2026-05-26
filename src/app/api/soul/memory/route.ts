import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, action } = body;
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    if (action === 'add') {
      const { data, error } = await supabase
        .from('soul_memories')
        .insert({
          session_id,
          content: body.content,
          memory_type: body.memory_type || 'context',
          similarity_vector: body.similarity_vector || null,
          created_at: new Date().toISOString(),
        })
        .select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, id: data?.[0]?.id });
    }
    if (action === 'compress') {
      const memoryIds = body.memory_ids || [];
      if (memoryIds.length === 0) {
        return NextResponse.json({ success: true, result: 'no ids to compress' });
      }
      const { error } = await supabase
        .from('soul_memories')
        .delete()
        .in('id', memoryIds.slice(0, -1))
        .then(() =>
          supabase.from('soul_memories')
            .update({ memory_type: 'compressed' })
            .eq('id', memoryIds[memoryIds.length - 1])
        );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, result: 'compressed' });
    }
    return NextResponse.json({ error: 'action required: add or compress' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const session_id = url.searchParams.get('session_id');
  const action = url.searchParams.get('action') || 'list';
  const query = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    if (action === 'list' && session_id) {
      const { data, error } = await supabase
        .from('soul_memories')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ memories: data || [] });
    }
    if (action === 'search' && query) {
      const { data, error } = await supabase
        .from('soul_memories')
        .select('*')
        .ilike('content', `%${query}%`)
        .limit(limit);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ memories: data || [] });
    }
    if (action === 'stats' && session_id) {
      const { data, error } = await supabase
        .from('soul_memories')
        .select('id, memory_type')
        .eq('session_id', session_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const byType: Record<string, number> = {};
      (data || []).forEach(m => { byType[m.memory_type] = (byType[m.memory_type] || 0) + 1; });
      return NextResponse.json({ total: (data || []).length, by_type: byType });
    }
    return NextResponse.json({ error: 'action and session_id required' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
