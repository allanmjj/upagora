/**
 * Soul Memory Persistence
 * 
 * Auto-saves soul conversations to soul_embeddings for RAG retrieval.
 * Provides personal memory context between user + soul pairs.
 * 
 * Features:
 * - Auto-save conversations after chat-stream responses
 * - Personal memory retrieval (per user + soul pair)
 * - Memory context injection for chat-stream
 * - Defensive error handling for missing tables
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Save a conversation exchange to soul_embeddings for future RAG retrieval.
 * Creates a memory entry with conversation content, summary, and user context.
 */
export async function saveConversationMemory({
  soulId,
  userId,
  userMessage,
  soulResponse,
}: {
  soulId: string;
  userId: string;
  userMessage: string;
  soulResponse: string;
}): Promise<boolean> {
  try {
    // Create a summary of the conversation for embedding
    const summary = `${userMessage} → ${soulResponse}`.slice(0, 2000);
    const content = `[Q] ${userMessage}\n[A] ${soulResponse}`.slice(0, 3000);

    await supabase.from('soul_embeddings').insert({
      soul_id: soulId,
      user_id: userId,
      content,
      summary,
      category: 'conversation_memory',
      metadata: {
        type: 'conversation',
        user_message_length: userMessage.length,
        soul_response_length: soulResponse.length,
      },
    });

    return true;
  } catch (err) {
    console.warn('[soul-memory] Failed to save conversation memory:', err);
    return false;
  }
}

/**
 * Retrieve personal conversation memories for a user + soul pair.
 * Returns the most recent conversation exchanges for context injection.
 */
export async function getPersonalMemories({
  soulId,
  userId,
  query,
  limit = 5,
}: {
  soulId: string;
  userId: string;
  query?: string;
  limit?: number;
}): Promise<Array<{ content: string; summary: string; created_at: string }>> {
  try {
    let queryBuilder = supabase
      .from('soul_embeddings')
      .select('content, summary, created_at')
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'conversation_memory')
      .order('created_at', { ascending: false })
      .limit(limit);

    // If we have a query, try semantic similarity (requires pgvector setup)
    // For now, fall back to recency-based retrieval
    const { data, error } = await queryBuilder;

    if (error || !data) {
      console.warn('[soul-memory] Failed to retrieve memories:', error);
      return [];
    }

    return data.map((row) => ({
      content: row.content || '',
      summary: row.summary || '',
      created_at: row.created_at || '',
    }));
  } catch (err) {
    console.warn('[soul-memory] Error retrieving personal memories:', err);
    return [];
  }
}

/**
 * Get conversation summary for a user + soul pair.
 * Returns a condensed view of past conversations for system prompt injection.
 */
export async function getConversationSummary({
  soulId,
  userId,
  maxConversations = 3,
}: {
  soulId: string;
  userId: string;
  maxConversations?: number;
}): Promise<string> {
  const memories = await getPersonalMemories({
    soulId,
    userId,
    limit: maxConversations,
  });

  if (memories.length === 0) {
    return '';
  }

  const summary = memories
    .map((m) => m.summary.slice(0, 200))
    .join('\n---\n');

  return `## Past Conversation Context\n${summary}\n---\nYou have previously conversed with this user. Reference these memories naturally when relevant.`;
}

/**
 * Count total conversations for a soul + user pair.
 * Used for health scoring and relationship depth.
 */
export async function getConversationCount({
  soulId,
  userId,
}: {
  soulId: string;
  userId: string;
}): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('soul_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'conversation_memory');

    if (error) {
      console.warn('[soul-memory] Failed to count conversations:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Save a soul interaction event (non-conversation, like guardian actions).
 */
export async function saveInteractionEvent({
  soulId,
  userId,
  type,
  details,
}: {
  soulId: string;
  userId: string;
  type: string;
  details: string;
}): Promise<boolean> {
  try {
    await supabase.from('soul_embeddings').insert({
      soul_id: soulId,
      user_id: userId,
      content: details,
      summary: `[${type}] ${details.slice(0, 100)}`,
      category: 'interaction_event',
      metadata: { type },
    });
    return true;
  } catch (err) {
    console.warn('[soul-memory] Failed to save interaction event:', err);
    return false;
  }
}
