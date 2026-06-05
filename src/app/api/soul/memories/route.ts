/**
 * GET /api/soul/memories?soul_id=xxx&limit=10
 * 
 * Retrieves personal conversation memories for a user + soul pair.
 * Used by SoulMemoryDisplay component to show memory context in chat.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const { searchParams } = new URL(req.url);
    const soulId = searchParams.get('soul_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!soulId) {
      return NextResponse.json({ error: 'soul_id required' }, { status: 400 });
    }

    // Fetch conversation memories for this user + soul pair
    const { data: memories, error, count } = await supabase
      .from('soul_embeddings')
      .select('id, content, summary, created_at, metadata', { count: 'exact' })
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'conversation_memory')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('[soul/memories] Fetch error:', error.message);
      // Return empty — don't fail the UI
      return NextResponse.json({ memories: [], total: 0 });
    }

    // Calculate a simple "strength" score based on recency and reinforcement count
    const enriched = (memories || []).map((m: any) => {
      const ageHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
      const recencyScore = Math.max(0, 100 - ageHours); // Decays over time
      const reinforced = (m.metadata?.reinforced || 0) as number;
      const strength = Math.min(100, Math.round(recencyScore * 0.7 + reinforced * 15));

      return {
        id: m.id,
        content: m.content?.slice(0, 500) || '',
        summary: m.summary?.slice(0, 200) || '',
        created_at: m.created_at,
        strength,
        reinforced: reinforced > 0,
      };
    });

    return NextResponse.json({
      memories: enriched,
      total: count || enriched.length,
    });
  } catch (err) {
    logger.error('[soul/memories] Unexpected error:', err);
    return NextResponse.json({ memories: [], total: 0 });
  }
}

/**
 * POST /api/soul/memories — Reinforce or forget a memory
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const body = await req.json();
    const { memoryId, action } = body; // action: 'reinforce' | 'forget'

    if (!memoryId || !action) {
      return NextResponse.json({ error: 'memoryId and action required' }, { status: 400 });
    }

    if (action === 'forget') {
      // Delete the memory
      const { error } = await supabase
        .from('soul_embeddings')
        .delete()
        .eq('id', memoryId);

      if (error) {
        logger.warn('[soul/memories] Delete error:', error.message);
        return NextResponse.json({ success: false, error: error.message });
      }

      return NextResponse.json({ success: true, action: 'forgotten' });
    }

    if (action === 'reinforce') {
      // Increment reinforced count in metadata
      const { data: existing } = await supabase
        .from('soul_embeddings')
        .select('metadata')
        .eq('id', memoryId)
        .single();

      const metadata = (existing?.metadata || {}) as Record<string, any>;
      metadata.reinforced = (metadata.reinforced || 0) + 1;
      metadata.last_reinforced = new Date().toISOString();

      const { error } = await supabase
        .from('soul_embeddings')
        .update({ metadata })
        .eq('id', memoryId);

      if (error) {
        logger.warn('[soul/memories] Reinforce error:', error.message);
        return NextResponse.json({ success: false, error: error.message });
      }

      return NextResponse.json({ success: true, action: 'reinforced' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    logger.error('[soul/memories] POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
