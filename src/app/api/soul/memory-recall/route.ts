import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateEmbedding,
  embedAndStoreChunks,
  searchMemories,
  getMemoryContext,
  reEmbedSoulMemories,
  MemoryChunk,
} from '@/lib/upagora_rag';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// POST /api/soul/memory-recall
// Semantic search for soul memories
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, query, top_k = 5, min_similarity = 0.7 } = body;

    if (!soul_id || !query) {
      return NextResponse.json({ error: 'soul_id and query are required' }, { status: 400 });
    }

    const results = await searchMemories(soul_id, query, top_k, min_similarity);

    return NextResponse.json({
      success: true,
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error('Memory recall error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ============================================================================
// POST /api/soul/memory-embed
// Embed text chunks and store in soul_embeddings
// ============================================================================
export async function POSTEmbed(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, soul_id, chunks, provider = 'openai' } = body;

    if (!user_id || !soul_id || !chunks?.length) {
      return NextResponse.json(
        { error: 'user_id, soul_id, and chunks are required' },
        { status: 400 }
      );
    }

    const memoryChunks: MemoryChunk[] = chunks.map((c: any) => ({
      text: c.text,
      sourceType: c.source_type || 'memory',
      sourceId: c.source_id,
      metadata: c.metadata,
    }));

    const result = await embedAndStoreChunks(user_id, soul_id, memoryChunks, provider);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Memory embed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ============================================================================
// POST /api/soul/memory-reindex
// Re-embed all existing soul memories into vector store
// ============================================================================
export async function POSTReindex(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, provider = 'openai' } = body;

    if (!soul_id) {
      return NextResponse.json({ error: 'soul_id is required' }, { status: 400 });
    }

    const result = await reEmbedSoulMemories(soul_id, provider);

    return NextResponse.json({
      ...result,
      success: true,
      message: `Re-embedded ${result.stored} memories`,
    });
  } catch (error) {
    console.error('Re-index error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

