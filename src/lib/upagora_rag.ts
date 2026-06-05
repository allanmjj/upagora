// RAG (Retrieval-Augmented Generation) service for UpAgora
// Powers semantic memory search using pgvector + embeddings

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

// Embedding provider configuration
const EMBEDDING_CONFIG = {
  openai: {
    url: 'https://api.openai.com/v1/embeddings',
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    key: process.env.OPENAI_API_KEY,
  },
  // Fallback: compute a naive embedding using character n-grams
  // Used when no embedding API key is available
  local: {
    dimensions: 300,
  },
};

export type EmbeddingSource = 'memory' | 'chat' | 'extraction' | 'narrative';

// ============================================================================
// Embedding generation
// ============================================================================

export async function generateEmbedding(
  text: string,
  provider: 'openai' | 'local' = 'openai'
): Promise<number[]> {
  if (provider === 'openai' && EMBEDDING_CONFIG.openai.key) {
    return generateOpenAIEmbedding(text);
  }
  return generateLocalEmbedding(text);
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_CONFIG.openai.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${EMBEDDING_CONFIG.openai.key}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_CONFIG.openai.model,
      input: text.slice(0, 8000), // Token limit ~8191
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error('OpenAI embedding failed:', err);
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Naive local embedding: character n-gram frequency vector
// Used as fallback when no embedding API is available
function generateLocalEmbedding(text: string): number[] {
  const dim = EMBEDDING_CONFIG.local.dimensions;
  const vec = new Array(dim).fill(0);
  const lower = text.toLowerCase().slice(0, 2000);

  // Use 3-grams and 4-grams to build a frequency vector
  for (let n = 3; n <= 4; n++) {
    for (let i = 0; i <= lower.length - n; i++) {
      const ngram = lower.slice(i, i + n);
      let hash = 0;
      for (let j = 0; j < ngram.length; j++) {
        hash = ((hash << 5) - hash + ngram.charCodeAt(j)) | 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1;
    }
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// ============================================================================
// Memory chunking & embedding
// ============================================================================

export interface MemoryChunk {
  id?: number;
  text: string;
  sourceType: EmbeddingSource;
  sourceId?: number;
  metadata?: Record<string, unknown>;
}

export async function embedAndStoreChunks(
  userId: string,
  soulId: string,
  chunks: MemoryChunk[],
  provider: 'openai' | 'local' = 'openai'
): Promise<{ success: boolean; stored: number; error?: string }> {
  try {
    let stored = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.text, provider);

        const { error } = await adminClient
          .from('soul_embeddings')
          .insert({
            user_id: userId,
            soul_id: soulId,
            text_chunk: chunk.text,
            embedding,
            source_type: chunk.sourceType,
            source_id: chunk.sourceId || null,
            metadata: chunk.metadata || {},
          });

        if (error) {
          logger.error('Failed to store embedding:', error);
        } else {
          stored++;
        }
      } catch (err) {
        logger.error('Chunk embedding failed:', err);
      }
    }

    return { success: true, stored };
  } catch (err) {
    return { success: false, stored: 0, error: String(err) };
  }
}

// ============================================================================
// Semantic memory search
// ============================================================================

export interface SearchResult {
  id: number;
  textChunk: string;
  similarity: number;
  sourceType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function searchMemories(
  soulId: string,
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<SearchResult[]> {
  // First, embed the query
  const queryEmbedding = await generateEmbedding(query);

  // Then search using pgvector
  const { data, error } = await adminClient.rpc('search_soul_memories', {
    _soul_id: soulId,
    _query_embedding: `{${queryEmbedding.join(',')}}`,
    _top_k: topK,
    _min_similarity: minSimilarity,
  });

  if (error) {
    logger.error('Semantic search failed:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    textChunk: row.text_chunk,
    similarity: parseFloat((row.similarity * 100).toFixed(1)) / 100,
    sourceType: row.source_type,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));
}

// ============================================================================
// Memory injection for chat context
// ============================================================================

export async function getMemoryContext(
  soulId: string,
  conversation: string[],
  topK: number = 3
): Promise<string> {
  if (conversation.length === 0) return '';

  // Embed the last user message as the query
  const lastMessage = conversation[conversation.length - 1];
  const results = await searchMemories(soulId, lastMessage, topK);

  if (results.length === 0) return '';

  // Format results as context injection
  const formatted = results
    .map((r, i) => `Memory ${i + 1} (relevance: ${r.similarity}): ${r.textChunk}`)
    .join('\n\n');

  return `## Relevant Memories for This Conversation\n\n${formatted}`;
}

// Re-embed existing soul memories (one-time migration helper)
export async function reEmbedSoulMemories(
  soulId: string,
  provider: 'openai' | 'local' = 'openai'
): Promise<{ success: boolean; stored: number; error?: string }> {
  // Fetch existing soul_memory entries
  const { data: memories, error: fetchError } = await adminClient
    .from('soul_memory')
    .select('id, memory_content, memory_type')
    .eq('soul_id', soulId)
    .limit(100);

  if (fetchError || !memories) {
    return { success: false, stored: 0, error: String(fetchError) };
  }

  // Check for existing user_id
  const { data: profile } = await adminClient
    .from('soul_extraction_results')
    .select('user_id')
    .eq('id', soulId)
    .single();

  const userId = profile?.user_id;
  if (!userId) {
    return { success: false, stored: 0, error: 'No user_id found for soul' };
  }

  const chunks: MemoryChunk[] = memories.map((m: any) => ({
    text: m.memory_content,
    sourceType: 'memory',
    sourceId: m.id,
    metadata: { memory_type: m.memory_type },
  }));

  return embedAndStoreChunks(userId, soulId, chunks, provider);
}
