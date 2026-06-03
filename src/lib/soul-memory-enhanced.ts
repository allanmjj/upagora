
import { createClient } from '@/lib/supabase/server';

/**
 * Ebbinghaus Forgetting Curve Memory Strength Calculator
 *
 * The Ebbinghaus forgetting curve models memory decay over time:
 * L(t) = R × e^(-t/S)
 *
 * Where:
 * - L(t) = memory strength at time t
 * - R = retention factor (base memory persistence rate)
 * - t = time since last access or reinforcement
 * - S = source parameter (related to initial encoding strength and retrieval frequency).
 * = memory at start mastery
 *
 * We also include emotional weight factor:
 * Emotional weight increases retention. More emotional memories are retained longer.
 * Emotional weight factor: W_e = 1 + 0.5 × (emotional_intensity / MAX_INTENSITY)
 * This should be adjusted per soul's personality traits and relationship context.
 *
 * @param timeSinceAccess - Time since last access or reinforcement
 * @param retrieveFrequency - How often this memory was retrieved
 * @param encodingStrength - Initial encoding strength
 * @param emotionalIntensity - How emotional was this memory
 * @returns Memory strength percentage (0-100)
 */
export function calculateMemoryStrength({
  timeSinceAccess,
  retrieveFrequency,
  encodingStrength,
  emotionalIntensity = 0,
}: {
  timeSinceAccess: number;
  retrieveFrequency: number;
  encodingStrength: number;
  emotionalIntensity?: number;
}): number {
  const day = 24 * 60 * 60 * 1000;

  // Calculate base strength based on encoding strength: 0-100
  const baseStrength = Math.min(Math.max(encodingStrength, 0), 100);

  // If encoding strength is already low, memory will decay even with factor doesn't help
  if (baseStrength < 10) {
    // Very weak, emotional weight very little
    return baseStrength * (1 - timeSinceAccess / (7 * day));
  }

  // Stronger memories benefit from emotional factors more
  const emotionalWeight = 1 + 0.5 * (emotionalIntensity / 10);

  // Self-save time dependent decay on last retrieval frequency
  const retrievalBonus = Math.log(1 + retrieveFrequency / 5) * 0.2;

  return Math.max(0, Math.min(100, baseStrength * (1 + emotionalWeight) * (1 + retrievalBonus)));
}

/**
 * Determine if a memory should be consolidated into long-term storage
 * based on strength, time since access, and retrieval frequency.
 *
 * Memories that are:
 * - Strong (strength > 70)
 * - Frequently accessed (retrieveFrequency > 5)
 * - Long-standing (timeSinceAccess > 3 days)
 * Should be consolidated into more permanent storage to free up short-term memory.
 */
export function shouldConsolidateMemory({
  strength,
  timeSinceAccess,
  retrieveFrequency,
}: {
  strength: number;
  timeSinceAccess: number;
  retrieveFrequency: number;
}): boolean {
  const day = 24 * 60 * 60 * 1000;

  // If strength is very low or retrieve frequency is high, consolidate
  return strength > 70 && timeSinceAccess > 3 * day && retrieveFrequency > 5;
}

/**
 * Categorize memory by type: episodic, semantic, emotional
 */
export function categorizeMemory(content: string, metadata: any = {}): 'episodic' | 'semantic' | 'emotional' {
  // Check for explicit type in metadata first
  if (metadata?.memory_type) {
    return metadata.memory_type;
  }

  // Auto-categorize based on content analysis
  const contentLower = content.toLowerCase();

  // Emotional memories contain strong emotional language or recent events
  const emotionalKeywords = [
    'wow', 'incredible', 'amazing', 'sad', 'happy', 'beautiful', 'terrible',
    'love', 'hate', 'fear', 'joy', 'anger', 'peace', 'excited', 'disappointed',
    'overwhelming', 'relief', 'grateful', 'guilty', 'proud', 'ashamed',
    'remember when', 'that time', 'i felt', 'i was so', 'never forget',
  ];

  const hasEmotional = emotionalKeywords.some((kw) => contentLower.includes(kw));

  // Episodic memories are time-bound personal events
  const episodicKeywords = [
    'yesterday', 'today', 'tomorrow', 'last week', 'last year', 'when',
    'that day', 'remember', 'once', 'before', 'after', 'then',
    'at the', 'during the', 'while', 'meanwhile',
  ];

  // Semantic memories are facts, knowledge, concepts
  const semanticKeywords = [
    'definition', 'concept', 'theory', 'principle', 'rule', 'law',
    'is known', 'it means', 'in other words', 'specifically', 'generally',
    'because', 'therefore', 'consequently', 'as a result',
  ];

  // Score each category
  const episodicScore = episodicKeywords.filter((kw) => contentLower.includes(kw)).length;
  const emotionalScore = hasEmotional ? 3 : 0;
  const semanticScore = semanticKeywords.filter((kw) => contentLower.includes(kw)).length;

  if (emotionalScore > semanticScore && emotionalScore > episodicScore) {
    return 'emotional';
  } else if (semanticScore > episodicScore) {
    return 'semantic';
  } else {
    return 'episodic';
  }
}
