import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport, pushReportToGuardian } from '@/lib/soul.reporter';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, action } = body;
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    if (action === 'generate') {
      const report = await generateDailyReport(session_id);
      return NextResponse.json({ success: true, report });
    }
    if (action === 'push') {
      const { summary } = body;
      if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 });
      const result = await pushReportToGuardian(session_id, summary);
      return NextResponse.json({ success: true, result });
    }
    return NextResponse.json({ error: 'action required: generate or push' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const session_id = url.searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    const report = await generateDailyReport(session_id);
    return NextResponse.json({ success: true, report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
