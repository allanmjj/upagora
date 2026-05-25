import { NextRequest, NextResponse } from 'next/server';
import { addMemory, getMemories, compressMemories, searchMemories, memoryStats } from '@/lib/soul.memory';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, action } = body;
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    if (action === 'add') {
      await addMemory(session_id, body);
      return NextResponse.json({ success: true });
    }
    if (action === 'compress') {
      const result = await compressMemories(session_id, body.memory_ids || []);
      return NextResponse.json({ success: true, result });
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

  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    if (action === 'list') {
      const memories = await getMemories(session_id, limit);
      return NextResponse.json({ success: true, memories });
    }
    if (action === 'search') {
      const memories = await searchMemories(session_id, query);
      return NextResponse.json({ success: true, memories });
    }
    if (action === 'stats') {
      const stats = await memoryStats(session_id);
      return NextResponse.json({ success: true, stats });
    }
    return NextResponse.json({ error: 'action required: list, search, or stats' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
