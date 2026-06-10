import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get soul info
    const { data: soul, error: soul_err } = await supabase
      .from('soul_gallery')
      .select('id, name, name_native, description, persona_text, avatar_url, guardian_id, created_at')
      .eq('id', id)
      .single();

    if (soul_err || !soul) {
      return NextResponse.json({ error: 'Soul not found' }, { status: 404 });
    }

    // Try to find the associated session
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, session_slug, subject_name, initials, calibration_count')
      .eq('id', soul.guardian_id || id)
      .single();

    // Get dimensions
    const { data: dimensions } = await supabase
      .from('soul_dimensions')
      .select('dimension, score')
      .eq('session_id', session?.id || id);

    const dimensionMap: Record<string, number> = {};
    for (const d of dimensions || []) {
      dimensionMap[d.dimension] = d.score;
    }

    // Get chat count
    const { count: chat_count } = await supabase
      .from('soul_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session?.id || id);

    // Get calibration count
    const { count: calib_count } = await supabase
      .from('guardian_calibrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session?.id || id);

    const subjectName = session?.subject_name || soul.name_native || soul.name || 'Unknown Soul';
    const initials = session?.initials || subjectName.charAt(0) || '?';

    // Get excerpt from persona text
    const excerpt = soul.persona_text?.slice(0, 200) || soul.description?.slice(0, 200) || 'A soul waiting to be discovered...';

    return NextResponse.json({
      soul_id: soul.id,
      session_id: session?.id || id,
      session_slug: session?.session_slug || '',
      subject_name: subjectName,
      initials: initials,
      dimensions: dimensionMap,
      dimension_labels: {
        cognitive_patterns: 'Cognitive Patterns',
        value_judgment: 'Values & Ethics',
        expression_style: 'Expression Style',
        knowledge_structure: 'Knowledge Structure',
        relationship_memory: 'Relationships & Social',
        emotional_response: 'Emotional Response',
        life_narrative: 'Life Narrative',
      },
      excerpt,
      calibration_count: session?.calibration_count || calib_count || 0,
      chat_messages: chat_count || 0,
    });
  } catch (err) {
    logger.error('card-data error:', err);
    return NextResponse.json({ error: 'Failed to load card data' }, { status: 500 });
  }
}
