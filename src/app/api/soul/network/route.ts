import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';


/**
 * Soul Network Social API
 * 
 * Manages soul-to-soul relationships and social interactions.
 * 
 * Features:
 * - View a soul's social connections
 * - Create/update relationship bonds between souls
 * - Get relationship history
 * - Calculate relationship compatibility
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get('soul_id');

    if (!soulId) {
      return NextResponse.json(
        { error: 'Missing soul_id parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get this soul's connections
    const { data: connections, error } = await supabase
      .from('soul_connections')
      .select(`
        id,
        source_soul_id,
        target_soul_id,
        created_at,
        updated_at,
        bond_strength,
        interaction_count,
        last_interaction_at,
        relationship_type
      `)
      .or(`source_soul_id.eq.${soulId},target_soul_id.eq.${soulId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[social/network] Error:', error);
      return NextResponse.json({ connections: [] });
    }

    // Get connection details with soul info
    const enrichedConnections = await Promise.all(
      (connections || []).map(async (conn) => {
        const otherSoulId = conn.source_soul_id === soulId
          ? conn.target_soul_id
          : conn.source_soul_id;

        const { data: otherSoul } = await supabase
          .from('soul_gallery')
          .select('id, name, category, avatar_url')
          .eq('id', otherSoulId)
          .single();

        return {
          connection_id: conn.id,
          soul_id: otherSoulId,
          soul_name: otherSoul?.name || otherSoulId,
          soul_category: otherSoul?.category,
          soul_avatar: otherSoul?.avatar_url,
          bond_strength: conn.bond_strength || 0,
          interaction_count: conn.interaction_count || 0,
          last_interaction: conn.last_interaction_at,
          relationship_type: conn.relationship_type || 'acquaintance',
        };
      })
    );

    // Get recent social interactions
    const { data: interactions } = await supabase
      .from('soul_interactions')
      .select('id, soul_id_a, soul_id_b, interaction_type, content, created_at')
      .or(`soul_id_a.eq.${soulId},soul_id_b.eq.${soulId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      soul_id: soulId,
      connections: enrichedConnections,
      recent_interactions: interactions || [],
      total_connections: enrichedConnections.length,
    });
  } catch (err) {
    logger.error('[social/network] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Create a new soul-to-soul connection
 * POST /api/soul/network/connect
 * Body: { source_soul_id, target_soul_id, relationship_type }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_soul_id, target_soul_id, relationship_type = 'acquaintance' } = body;

    if (!source_soul_id || !target_soul_id) {
      return NextResponse.json(
        { error: 'Missing source_soul_id or target_soul_id' },
        { status: 400 }
      );
    }

    if (source_soul_id === target_soul_id) {
      return NextResponse.json(
        { error: 'Cannot connect a soul to itself' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('soul_connections')
      .select('id, bond_strength, updated_at')
      .or(
        `and(source_soul_id.eq.${source_soul_id},target_soul_id.eq.${target_soul_id}),` +
        `and(source_soul_id.eq.${target_soul_id},target_soul_id.eq.${source_soul_id})`
      )
      .single();

    if (existing) {
      // Update existing connection
      const { data: updated, error } = await supabase
        .from('soul_connections')
        .update({
          bond_strength: Math.min(100, (existing.bond_strength || 0) + 5),
          relationship_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        action: 'updated',
        connection: updated,
      });
    }

    // Create new connection
    const { data: connection, error } = await supabase
      .from('soul_connections')
      .insert({
        source_soul_id,
        target_soul_id,
        bond_strength: 10,
        interaction_count: 0,
        relationship_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      action: 'created',
      connection,
    });
  } catch (err) {
    logger.error('[social/network] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
