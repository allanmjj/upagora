import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getConversationCount, getPersonalMemories } from '@/lib/soul-memory';

/**
 * Soul Health Score API
 *
 * Calculates a comprehensive health score for a soul based on multiple dimensions:
 * - Persona Quality (soul definition completeness): 0-25 points
 * - Calibration (how well-calibrated the soul is): 0-25 points  
 * - Memory Health (memory strength and emotional depth): 0-25 points
 * - Conversation Engagement (interaction frequency and quality): 0-25 points
 */

interface HealthScore {
  overall: number;
  persona_quality: number;
  calibration: number;
  memory: number;
  conversation: number;
  intimacy: number;
  recommendation: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get('soul_id');
    const userId = searchParams.get('user_id');

    if (!soulId) {
      return NextResponse.json(
        { error: 'Missing soul_id parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get soul constraints (persona quality indicator)
    const { data: constraints, error: constraintError } = await supabase
      .from('soul_constraints')
      .select('*')
      .eq('soul_id', soulId);

    // Get calibration data
    const { data: calibrationEvents } = await supabase
      .from('soul_calibrations')
      .select('created_at, type')
      .eq('soul_id', soulId)
      .order('created_at', { ascending: false });

    // Get memory data
    const { data: memories } = await supabase
      .from('soul_embeddings')
      .select('created_at, metadata, category')
      .eq('soul_id', soulId)
      .eq('category', 'conversation_memory');

    // Get conversation count
    const conversationCount = userId
      ? await getConversationCount({ soulId, userId })
      : 0;

    // Calculate individual scores
    const personaQuality = calculatePersonaQuality(constraints);
    const calibrationScore = calculateCalibrationScore(
      calibrationEvents,
    );
    const memoryScore = calculateMemoryScore(memories);
    const conversationScore = conversationCount * 5; // 5 points per conversation, cap at 25
    const intimacyScore = calculateIntimacyScore(
      memories,
      conversationCount,
    );

    // Calculate overall health (weighted average)
    const overall = Math.round(
      personaQuality * 0.3 +
      calibrationScore * 0.25 +
      memoryScore * 0.2 +
      conversationScore * 0.15 +
      intimacyScore * 0.1,
    );

    // Generate recommendation based on weakest dimension
    const recommendation = generateRecommendation({
      persona: personaQuality,
      calibration: calibrationScore,
      memory: memoryScore,
      conversation: conversationScore,
      intimacy: intimacyScore,
    });

    return NextResponse.json({
      overall,
      persona_quality: Math.round(personaQuality * 10) / 10,
      calibration: Math.round(calibrationScore * 10) / 10,
      memory: Math.round(memoryScore * 10) / 10,
      conversation: Math.round(conversationScore * 10) / 10,
      intimacy: Math.round(intimacyScore * 10) / 10,
      recommendation,
    });
  } catch (err) {
    console.error('[health] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculatePersonaQuality(constraints: any[] | null): number {
  if (!constraints || constraints.length === 0) {
    return 5; // Base score even without constraints
  }

  let score = 0;
  const totalDimensions = 9; // 9D constraints

  for (const constraint of constraints) {
    // Count how many dimensions are filled
    if (constraint.era_name) score++;
    if (constraint.profession) score++;
    if (constraint.knowledge_floor?.length) score++;
    if (constraint.knowledge_ceiling?.length) score++;
    if (constraint.personality_traits?.length) score++;
    if (constraint.beliefs?.length) score++;
    if (constraint.soul_anchor?.length) score++;
    if (constraint.life_experience) score++;
    if (constraint.writing_style) score++;
  }

  return Math.min(100, (score / (totalDimensions * constraints.length)) * 100);
}

function calculateCalibrationScore(events: any[] | null): number {
  if (!events || events.length === 0) {
    return 10; // Base score
  }

  // More recent calibrations = higher score
  const now = new Date().getTime();
  const recentEvents = events.filter(
    (e) => now - new Date(e.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
  ); // Within 30 days

  const recencyBonus = Math.min(40, recentEvents.length * 5);
  const totalBonus = Math.min(60, events.length * 3);

  return Math.min(100, recencyBonus + totalBonus);
}

function calculateMemoryScore(memories: any[] | null): number {
  if (!memories || memories.length === 0) {
    return 10; // Base score
  }

  // Emotional depth contributes to memory health
  let totalEmotionalWeight = 0;
  for (const memory of memories) {
    totalEmotionalWeight += memory.metadata?.emotional_intensity || 0;
  }

  const avgEmotionalWeight = totalEmotionalWeight / memories.length;
  const depthScore = Math.min(60, avgEmotionalWeight * 10);
  const volumeScore = Math.min(40, memories.length * 2);

  return Math.min(100, depthScore + volumeScore);
}

function calculateIntimacyScore(
  memories: any[] | null,
  conversationCount: number,
): number {
  if (!memories || conversationCount === 0) {
    return 5; // Base score
  }

  const recentMemories = memories.filter(
    (m) => new Date().getTime() - new Date(m.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
  ); // Within 7 days

  const recencyWeight = Math.min(30, recentMemories.length * 5);
  const volumeWeight = Math.min(70, conversationCount * 3);

  return Math.min(100, recencyWeight + volumeWeight);
}

function generateRecommendation(scores: {
  persona: number;
  calibration: number;
  memory: number;
  conversation: number;
  intimacy: number;
}): string {
  // Find the weakest dimension
  const weakest = Object.entries(scores).reduce((a, b) =>
    a[1] < b[1] ? a : b,
  )[0];

  switch (weakest) {
    case 'persona':
      return 'Complete your soul\'s 9D constraints profile to improve persona definition.';
    case 'calibration':
      return 'Use the calibration page to refine the soul\'s personality and knowledge.';
    case 'memory':
      return 'Have more meaningful conversations to build deeper memories.';
    case 'conversation':
      return 'Increase interaction frequency with your soul.';
    case 'intimacy':
      return 'Build a stronger emotional bond through regular engagement.';
    default:
      return 'Your soul is well-balanced. Keep nurturing the relationship.';
  }
}
