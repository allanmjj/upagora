import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/growth?guardian_id=<userId>
 * Returns soul growth data (level, xp, milestones) for souls owned by a guardian.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guardianId = searchParams.get('guardian_id');

    // Get soul IDs for this guardian
    let soulIds: string[] = [];
    if (guardianId) {
      const { data: guardianSouls } = await supabase
        .from('soul_guardians')
        .select('soul_id')
        .eq('user_id', guardianId);

      if (guardianSouls) {
        soulIds = guardianSouls.map((g) => g.soul_id);
      }
    }

    // Load growth records
    let query = supabase.from('soul_growth').select('*');
    if (soulIds.length > 0) {
      query = query.in('soul_id', soulIds);
    }

    const { data: growthData, error } = await query;

    if (error) {
      logger.error('Growth API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: growthData || [] });
  } catch (err: any) {
    logger.error('Growth API exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
