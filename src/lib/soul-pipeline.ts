import { createClient } from '@supabase/supabase-js';
import { resolveProvider, callLLM } from '@/lib/llm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Soul Distillation Pipeline Orchestrator
 *
 * Chains the full distillation flow:
 * 1. receive raw data (text upload / scrape / auto-extract)
 * 2. LLM analyzes across 7 dimensions
 * 3. generates persona.md
 * 4. creates soul in DB
 * 5. generates initial constraints (9D)
 * 6. seeds initial memories into pgvector
 */

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: Record<string, unknown>;
  error?: string;
}

export interface DistillationResult {
  soulId: string;
  persona: string;
  dimensions: string;
  constraints: string;
  steps: PipelineStep[];
}

const STEPS: PipelineStep[] = [
  { name: 'receive_data', status: 'pending' },
  { name: 'analyze_dimensions', status: 'pending' },
  { name: 'synthesize_persona', status: 'pending' },
  { name: 'create_soul_record', status: 'pending' },
  { name: 'generate_constraints', status: 'pending' },
  { name: 'seed_memories', status: 'pending' },
];

/**
 * Run the full distillation pipeline for a given input.
 */
export async function runDistillationPipeline(
  input: string,
  subjectName: string,
  options: {
    categoryId?: string;
    language?: string;
    source?: string;
  } = {}
): Promise<DistillationResult> {
  const config = resolveProvider();
  if (!config) {
    STEPS[0].error = 'No LLM provider configured';
    STEPS[0].status = 'error';
    throw new Error('No LLM provider configured');
  }

  // Step 1: Receive and prepare data
  setActive(0);
  STEPS[0].result = {
    source: options.source || 'manual',
    input_length: input.length,
    input_preview: input.slice(0, 200),
  };
  markDone(0);

  // Step 2: Analyze 7 dimensions
  setActive(1);
  try {
    const dimensions = await analyzeDimensions(subjectName, input, config);
    STEPS[1].result = {
      dimensions_extracted: Object.keys(dimensions).length,
      dimension_names: Object.keys(dimensions),
    };
    markDone(1);

    // Step 3: Synthesize persona.md
    setActive(2);
    const persona = await synthesizePersona(subjectName, dimensions, input, config);
    STEPS[2].result = { persona_length: persona.length };
    markDone(2);

    // Step 4: Create soul record in DB
    setActive(3);
    const soulId = await createSoulRecord(subjectName, persona, dimensions, options);
    STEPS[3].result = { soul_id: soulId };
    markDone(3);

    // Step 5: Generate 9D constraints
    setActive(4);
    const constraints = await generateConstraints(subjectName, dimensions, persona, config);
    STEPS[4].result = { constraints_length: constraints.length };
    markDone(4);

    // Step 6: Seed initial memories
    setActive(5);
    try {
      const memoriesSeeded = await seedMemories(soulId, input);
      STEPS[5].result = { memories_seeded: memoriesSeeded };
    } catch {
      // Memory seeding may fail if table doesn't exist — non-fatal
      STEPS[5].result = { memories_seeded: 0, note: 'soul_embeddings table unavailable' };
    }
    markDone(5);

    return {
      soulId,
      persona,
      dimensions: JSON.stringify(dimensions),
      constraints,
      steps: STEPS.map((s) => ({ ...s })),
    };
  } catch (err) {
    STEPS.find((s) => s.status === 'running')!.error = String(err).slice(0, 300);
    STEPS.find((s) => s.status === 'running')!.status = 'error';
    throw err;
  }
}

function setActive(idx: number) {
  STEPS[idx].status = 'running';
}
function markDone(idx: number) {
  STEPS[idx].status = 'done';
}

const DIMENSIONS = [
  'cognition',
  'values',
  'expression',
  'knowledge',
  'emotion',
  'relationships',
  'narrative',
];

async function analyzeDimensions(
  name: string,
  input: string,
  config: ReturnType<typeof resolveProvider>
): Promise<Record<string, unknown>> {
  const context = input.length > 12000 ? input.slice(0, 12000) : input;

  const prompt = `You are an expert personality profiler. Analyze ${name} across 7 dimensions using ALL of the source material below.

For EACH dimension, provide structured analysis. Always output valid JSON.

Source material about ${name}:
---
${context}
---

Output exactly this JSON structure:
{
  "cognition": { "thinking_style": "...", "key_patterns": ["..."] },
  "values": { "core_values": ["..."], "ethical_framework": "..." },
  "expression": { "style": "...", "habits": ["..."], "tone": "..." },
  "knowledge": { "deep_expertise": ["..."], "surface_knowledge": ["..."], "gaps": ["..."] },
  "emotion": { "core_emotions": ["..."], "triggers": {"positive": ["..."], "negative": ["..."]}, "depth": "..." },
  "relationships": { "style": "...", "loyalty": "...", "trust": "..." },
  "narrative": { "identity_core": "...", "pivotal_moments": ["..."], "self_perception": "..." }
}`;

  const result = await callLLM(
    'You are an expert personality profiler. Always output valid JSON.',
    [{ role: 'user', content: prompt }],
    { maxTokens: 3000 }
  );

  const content = result.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { raw_analysis: content };
}

async function synthesizePersona(
  name: string,
  dimensions: Record<string, unknown>,
  input: string,
  config: ReturnType<typeof resolveProvider>
): Promise<string> {
  const prompt = `You are a masterful persona writer for digital soul replicas.

Subject: ${name}

Based on these 7-dimensional analyses, create a vivid, human-like persona.md file.
Write in first person ("I am...") style. Make it feel alive — not a spreadsheet.

7D Analysis:
---
${JSON.stringify(dimensions, null, 2)}
---

Source material (for grounded details):
---
${input.slice(0, 4000)}
---

Write a persona.md (markdown, 800-1500 words). It must capture:
- WHO this person is (identity, essence)
- HOW they speak (language, tone, quirks)
- WHAT they care about (values, passions)
- WHAT they know/understand (expertise)
- HOW they feel (emotional landscape)
- WHO matters to them (relationships)
- WHAT shaped them (life narrative)

IMPORTANT: Do NOT output JSON. Output markdown only.`;

  const result = await callLLM(
    'You are a masterful persona writer for digital soul replicas.',
    [{ role: 'user', content: prompt }],
    { maxTokens: 4000 }
  );

  return result.content || `# ${name}\n\n(Synthesis failed — no content generated)`;
}

async function createSoulRecord(
  name: string,
  persona: string,
  dimensions: Record<string, unknown>,
  options: { categoryId?: string; language?: string; source?: string }
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('town_souls')
      .insert({
        name,
        name_native: name,
        persona,
        category: options.categoryId || 'general',
        language: options.language || 'en',
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      return data.id;
    }

    // Fallback: register in soul_extraction_results
    const { data: fallback } = await supabase
      .from('soul_extraction_results')
      .insert({
        name,
        name_native: name,
        persona_text: persona,
        dimensions,
        source: options.source || 'pipeline',
      })
      .select('id')
      .single();

    if (fallback?.id) {
      return fallback.id;
    }

    // Generate UUID as last resort
    const segments = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const hex = segments.map((s) => s.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    const segments = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const hex = segments.map((s) => s.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

async function generateConstraints(
  name: string,
  dimensions: Record<string, unknown>,
  persona: string,
  config: ReturnType<typeof resolveProvider>
): Promise<string> {
  const cognitive = (dimensions as any).cognition || {};
  const knowledge = (dimensions as any).knowledge || {};
  const values = (dimensions as any).values || {};
  const expression = (dimensions as any).expression || {};
  const emotion = (dimensions as any).emotion || {};
  const relationships = (dimensions as any).relationships || {};
  const narrative = (dimensions as any).narrative || {};

  const constraints = {
    soul_id: '',
    soul_name: name,
    era_name: 'Unknown',
    era_start: 0,
    era_end: 2026,
    profession: '',
    education: '',
    knowledge_floor: Array.isArray(knowledge.deep_expertise) ? knowledge.deep_expertise : [],
    knowledge_ceiling: Array.isArray(knowledge.gaps) ? knowledge.gaps : [],
    knowledge_gaps: Array.isArray(knowledge.gaps) ? knowledge.gaps : [],
    skills: {},
    non_skills: [],
    personality_traits: Array.isArray(cognitive.key_patterns) ? cognitive.key_patterns : [],
    communication_style: Array.isArray(expression.habits) ? expression.habits : [],
    language_style: Array.isArray(expression.habits) ? expression.habits : [],
    avoided_language: [],
    beliefs: Array.isArray(values.core_values)
      ? values.core_values.map((v: string) => ({ name: v, strength: 80 }))
      : [],
    life_events: Array.isArray(narrative.pivotal_moments) ? narrative.pivotal_moments : [],
    places_visited: [],
    relationships: {},
    soul_anchor: Array.isArray(values.core_values) ? values.core_values.slice(0, 3) : [],
    language: 'en',
  };

  // Save to DB
  try {
    constraints.soul_id = STEPS[3].result?.soul_id as string || '';
    await supabase
      .from('soul_constraints')
      .insert(constraints);
  } catch {
    // Table may not be migrated yet
  }

  return JSON.stringify(constraints, null, 2);
}

async function seedMemories(soulId: string, input: string): Promise<number> {
  if (!input || input.length < 50) return 0;

  const chunkSize = 300;
  const chunks: string[] = [];
  let pos = 0;
  while (pos < input.length) {
    const chunk = input.slice(pos, pos + chunkSize);
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim());
    }
    pos += chunkSize;
  }

  let count = 0;
  for (const chunk of chunks.slice(0, 20)) {
    try {
      await supabase.from('soul_embeddings').insert({
        soul_id: soulId,
        content: chunk,
        summary: chunk.slice(0, 100),
        category: 'memory',
      });
      count++;
    } catch {
      break;
    }
  }

  return count;
}