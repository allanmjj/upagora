'use server';

import { getMemoryContext } from '@/lib/upagora_rag';

// ============================================================================
// RAG-enhanced chat: inject relevant memories into system prompt
// ============================================================================

export async function buildRagSystemPrompt(
  personaMd: string,
  soulId: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  // Extract last 3 user messages as context for memory search
  const recentUserMessages = conversationHistory
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content);

  // Get relevant memories
  const memoryContext = await getMemoryContext(
    soulId,
    recentUserMessages,
    3 // top-k
  );

  const ragInjection = memoryContext
    ? `\n\n--- RELEVANT MEMORIES FOR THIS CONVERSATION ---\n${memoryContext}\n--- END MEMORIES ---\n\n`
    : '';

  return `${personaMd}

${ragInjection}
INSTRUCTIONS: Draw upon the memories above when answering. If a memory is relevant to what the user is asking, reference it naturally in your response. If no memory is directly relevant, respond based on your persona alone.`;
}

// ============================================================================
// Chunk text for embedding storage
// ============================================================================

export async function chunkAndEmbedMemory(
  userId: string,
  soulId: string,
  memoryText: string,
  sourceType: 'memory' | 'chat' | 'extraction' | 'narrative' = 'memory'
): Promise<{ stored: number }> {
  const { embedAndStoreChunks, MemoryChunk } = await import('@/lib/upagora_rag');

  // Simple chunking: split by paragraphs (double newline)
  const paragraphs = memoryText.split(/\n\s*\n/).filter((p) => p.trim().length > 20);

  const chunks: MemoryChunk[] = paragraphs
    .slice(0, 50) // Cap to avoid embedding too much
    .map((p) => ({
      text: p.trim(),
      sourceType,
      metadata: { 
        word_count: p.split(/\s+/).length,
        char_count: p.length
      },
    }));

  const result = await embedAndStoreChunks(userId, soulId, chunks);
  return { stored: result.stored };
}
