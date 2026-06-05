import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { getConversationCount } from '@/lib/soul-memory';
import { calculateMemoryStrength } from '@/lib/soul-memory-enhanced';

/**
 * Soul Intimacy Score Calculation
 *
 * Measures the depth of relationship between a user and a soul based on:
 * - Conversation count and frequency
 * - Memory strength and emotional weight
 * - Time spent together
 * - Interaction diversity (chat, calibrate, learn, gift)
 *
 * Score ranges from 0-100:
 * 0-20: Stranger
 * 20-40: Acquaintance  
 * 40-60: Friend
 * 60-80: Close Friend/Trusted Guardian
 * 80-100: Soul Bond/Deep Connection
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get('soul_id');
    const userId = searchParams.get('user_id');

    if (!soulId || !userId) {
      return NextResponse.json(
        { error: 'Missing soul_id or user_id parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get conversation count
    const conversationCount = await getConversationCount({ soulId, userId });

    // Get memory data for calculation
    const { data: memories, error: memError } = await supabase
      .from('soul_embeddings')
      .select('created_at, metadata, category')
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'conversation_memory')
      .order('created_at', { ascending: true });

    if (memError) {
      logger.warn('[intimacy] Failed to get memories:', memError);
      const basicScore = Math.min(100, conversationCount * 5);
      return NextResponse.json({
        intimacy_score: basicScore,
        relationship_level: getRelationshipLevel(basicScore),
        conversation_count: conversationCount,
        days_since_first_interaction: 0,
        interaction_types: ['conversation'],
      });
    }

    if (!memories || memories.length === 0) {
      return NextResponse.json({
        intimacy_score: 0,
        relationship_level: 'Stranger',
        conversation_count: 0,
        days_since_first_interaction: 0,
        interaction_types: [],
      });
    }

    const now = new Date().getTime();
    const firstInteraction = new Date(memories[0].created_at).getTime();
    const lastInteraction = new Date(memories[memories.length - 1].created_at).getTime();
    const daysSinceFirst = Math.floor((now - firstInteraction) / (1000 * 60 * 60 * 24));

    // Calculate average memory strength using Ebbinghaus curve
    let totalStrength = 0;
    let totalEmotionalWeight = 0;
    const interactionTypes = new Set(['conversation']);

    for (const memory of memories) {
      const timeSince = now - new Date(memory.created_at).getTime();
      const encodingStrength = 60 + (memory.metadata?.emotional_intensity || 0) * 5;
      const retrieveFrequency = 1; // Base frequency
      
      const strength = calculateMemoryStrength({
        timeSinceAccess: timeSince,
        retrieveFrequency,
        encodingStrength,
        emotionalIntensity: memory.metadata?.emotional_intensity || 0,
      });
      
      totalStrength += strength;
      totalEmotionalWeight += memory.metadata?.emotional_intensity || 0;
    }

    const avgStrength = totalStrength / memories.length;
    const avgEmotionalWeight = totalEmotionalWeight / memories.length;

    // Calculate intimacy score (0-100)
    const conversationScore = Math.min(40, conversationCount * 3); // Up to 40 points
    const timeScore = Math.min(20, daysSinceFirst * 0.5); // Up to 20 points
    const memoryScore = Math.min(20, avgStrength * 0.2); // Up to 20 points
    const emotionalScore = Math.min(20, avgEmotionalWeight * 4); // Up to 20 points
    
    const intimacyScore = Math.min(100, conversationScore + timeScore + memoryScore + emotionalScore);

    // Get interaction types from interaction events
    const { data: interactionEvents } = await supabase
      .from('soul_embeddings')
      .select('metadata')
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'interaction_event')
      .limit(50);

    if (interactionEvents) {
      for (const event of interactionEvents) {
        if (event.metadata?.type) {
          interactionTypes.add(event.metadata.type);
        }
      }
    }

    return NextResponse.json({
      intimacy_score: Math.round(intimacyScore * 10) / 10,
      relationship_level: getRelationshipLevel(intimacyScore),
      conversation_count: conversationCount,
      days_since_first_interaction: daysSinceFirst,
      interaction_types: Array.from(interactionTypes),
      memory_strength_avg: Math.round(avgStrength * 10) / 10,
      emotional_weight_avg: Math.round(avgEmotionalWeight * 10) / 10,
      last_interaction: new Date(lastInteraction).toISOString(),
    });
  } catch (err) {
    logger.error('[intimacy] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getRelationshipLevel(score: number): string {
  if (score >= 80) return 'Soul Bond';
  if (score >= 60) return 'Trusted Guardian';
  if (score >= 40) return 'Friend';
  if (score >= 20) return 'Acquaintance';
  return 'Stranger';
}
