import { NextRequest, NextResponse } from 'next/server';
import { soulTakeJob, soulCompleteJob, generateWorkOutput, createJob, listOpenJobs } from '@/lib/soul.jobs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, action } = body;
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  try {
    if (action === 'take') {
      const result = await soulTakeJob(session_id);
      return NextResponse.json({ success: true, result });
    }
    if (action === 'complete') {
      const { job_id } = body;
      if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 });
      const output = await generateWorkOutput(session_id, job_id);
      const result = await soulCompleteJob(session_id, job_id, output || '');
      return NextResponse.json({ success: true, result });
    }
    if (action === 'create') {
      const { title, description, job_type, payment_agu } = body;
      const result = await createJob(title, description, job_type, payment_agu);
      return NextResponse.json({ success: true, result });
    }
    return NextResponse.json({ error: 'action required: take, complete, or create' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const action = url.searchParams.get('action') || 'list';
  const job_type = url.searchParams.get('job_type');

  try {
    if (action === 'list') {
      const jobs = await listOpenJobs(job_type || undefined);
      return NextResponse.json({ success: true, jobs });
    }
    return NextResponse.json({ error: 'action required: list' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
