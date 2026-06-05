import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/compare
 * Get soul extraction dimensions for comparison radar chart.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return Response.json({ error: 'slug parameter required' }, { status: 400 });
    }

    // Find session by slug
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id, subject_name')
      .eq('share_slug', slug)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'Soul not found' }, { status: 404 });
    }

    // Get extractions for this session
    const { data: extractions } = await supabase
      .from('soul_extraction_results')
      .select('dimension, key_insights, confidence_score')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });

    // Calculate dimension scores based on extraction completeness
    const dimensionScores: Record<string, number> = {};
    
    if (extractions) {
      for (const ext of extractions) {
        const dim = ext.dimension || 'unknown';
        const confidence = ext.confidence_score || 0;
        const insights = ext.key_insights;
        
        // Score = confidence * 70% + completeness * 30%
        const completeness = insights && typeof insights === 'object' 
          ? Math.min(100, Object.keys(insights).length * 15) 
          : 50;
        
        dimensionScores[dim] = Math.round(confidence * 70 + completeness * 30);
      }
    }

    return Response.json({
      subject_name: session.subject_name,
      session_id: session.id,
      extractions: extractions?.map(e => ({
        dimension: e.dimension,
        score: dimensionScores[e.dimension] || 50,
        confidence: e.confidence_score || 0,
      })) || [],
    });
  } catch (err) {
    logger.error('Soul compare error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
