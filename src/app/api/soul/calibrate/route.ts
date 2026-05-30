/**
 * Guardian Soul Calibration API
 * 
 * Receives calibration feedback (feels right / not like me / correction)
 * and stores it for persona refinement.
 * 
 * POST /api/soul/calibrate
 * Body: { soul_id, response_id, feedback_type, comment, suggested_correction? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type FeedbackType = 'positive' | 'negative' | 'correction';

type CalibrationRequest = {
  guardian_id?: string;
  soul_id: string;
  response_id: string;
  feedback_type: FeedbackType;
  comment: string;
  suggested_correction?: string;
};

function getCalibrationErrors(message?: string) {
  return NextResponse.json(
    { success: false, error: message || 'Internal error' },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CalibrationRequest;

    // Validate required fields
    if (!body.soul_id || !body.feedback_type || !body.comment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Normalize feedback_type
    const typeMap: Record<string, FeedbackType> = {
      positive: 'positive',
      1: 'positive',
      thumbs_up: 'positive',
      agree: 'positive',
      1463: 'positive',
      negative: 'negative',
      2: 'negative',
      thumbs_down: 'negative',
      disagree: 'negative',
      correction: 'correction',
      3: 'correction',
      edit: 'correction',
      suggest: 'correction',
    };
    const normalized = typeMap[body.feedback_type] || body.feedback_type.toLowerCase() as FeedbackType;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert into soul_calibration_feedback table
    const { data, error } = await supabase
      .from('soul_calibration_feedback')
      .insert({
        soul_id: body.soul_id,
        response_id: body.response_id,
        feedback_type: normalized,
        comment: body.comment,
        suggested_correction: body.suggested_correction || null,
        guardian_id: body.guardian_id || 'anonymous',
      })
      .select()
      .single();

    if (error) {
      console.error('Calibration insert error:', error);
      // If table doesn't exist, return success anyway (graceful degradation)
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: null,
          warning: 'Calibration table not yet created',
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Calibration API error:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soul_id = searchParams.get('soul_id');
    if (!soul_id) {
      return NextResponse.json(
        { success: false, error: 'soul_id required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('soul_calibration_feedback')
      .select('*')
      .eq('soul_id', soul_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Calibration fetch error:', error);
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Calibration API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
