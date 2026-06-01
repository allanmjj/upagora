import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/social/feed
 * Returns recent social interactions in the soul town
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const soulId = searchParams.get('soul_id');

    let query = supabase
      .from('town_soul_interactions')
      .select(`
        id,
        type,
        from_soul_id,
        to_soul_id,
        content,
        timestamp,
        from_soul:from_soul_id(name, name_native, avatar),
        to_soul:to_soul_id(name, name_native, avatar)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (soulId) {
      query = query.or(`from_soul_id.eq.${soulId},to_soul_id.eq.${soulId}`);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet — return empty feed
      return NextResponse.json({
        interactions: [],
        note: 'social table not yet migrated',
      });
    }

    return NextResponse.json({
      interactions: (data || []).map((interaction: any) => ({
        id: interaction.id,
        type: interaction.type,
        from: interaction.from_soul
          ? { id: interaction.from_soul_id, ...interaction.from_soul }
          : null,
        to: interaction.to_soul
          ? { id: interaction.to_soul_id, ...interaction.to_soul }
          : null,
        content: interaction.content,
        timestamp: interaction.timestamp,
      })),
    });
  } catch (err) {
    console.error('[social-feed] Error:', err);
    return NextResponse.json({ interactions: [] });
  }
}

/**
 * POST /api/soul/social/interact
 * Record a social interaction between two souls in the town
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const body = await req.json();
    const { from_soul_id, to_soul_id, type, content } = body;

    if (!from_soul_id || !to_soul_id || !type) {
      return NextResponse.json(
        { error: 'from_soul_id, to_soul_id, and type required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('town_soul_interactions')
      .insert({
        from_soul_id,
        to_soul_id,
        type,
        content: content || {},
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Interaction table not available yet', original: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, interaction: data });
  } catch (err) {
    console.error('[social-interact] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
