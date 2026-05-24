import { NextRequest, NextResponse } from 'next/server';
import { soulsChat, getSocialNetwork, findChatPartner } from '@/lib/soul.social';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'chat') {
      const { soul_a, soul_b } = body;
      if (!soul_a || !soul_b) return NextResponse.json({ error: 'soul_a and soul_b required' }, { status: 400 });
      const result = await soulsChat(soul_a, soul_b);
      return NextResponse.json({ success: true, result });
    }
    if (action === 'find_partner') {
      const { session_id } = body;
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      const partner = await findChatPartner(session_id);
      return NextResponse.json({ success: true, partner });
    }
    return NextResponse.json({ error: 'action required: chat or find_partner' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const session_id = url.searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    const network = await getSocialNetwork(session_id);
    return NextResponse.json({ success: true, network });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
