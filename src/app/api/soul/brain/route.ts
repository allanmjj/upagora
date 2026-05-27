import { NextRequest, NextResponse } from 'next/server';
import { callLLM, resolveProvider } from '@/lib/llm';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Load soul profile
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Soul not found' }, { status: 404 });
    }

    // Load soul dimensions
    const { data: dimensions } = await supabase
      .from('soul_dimensions')
      .select('*')
      .eq('session_id', session_id);

    // Load recent memories
    const { data: memories } = await supabase
      .from('soul_memories')
      .select('*')
      .eq('session_id', session_id)
      .order('event_date', { ascending: false })
      .limit(20);

    // Load brain state
    const { data: brain } = await supabase
      .from('soul_brain')
      .select('*')
      .eq('session_id', session_id)
      .single();

    // Get current time of day
    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'morning' 
      : hour >= 12 && hour < 17 ? 'afternoon' 
      : hour >= 17 && hour < 21 ? 'evening' : 'night';

    // Call the soul brain engine
    const decision = await soulBrainThink(session, dimensions || [], memories || [], timeOfDay);

    // Update brain state
    let updatedBrain = null;
    if (brain) {
      const { data: updated } = await supabase
        .from('soul_brain')
        .update({
          current_mood: decision.mood,
          current_activity: decision.activity,
          current_location: decision.location,
          today_schedule: brain.today_schedule || [],
          today_completed: [...(brain.today_completed || []), decision.activity],
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', session_id)
        .select();
      updatedBrain = updated?.[0];
    }

    // Add decision memory
    await supabase.from('soul_memories').insert({
      session_id,
      memory_type: 'daily_log',
      title: `${timeOfDay} decision`,
      content: `Soul decided to ${decision.activity} at ${timeOfDay}. Reason: ${decision.reason}. Mood: ${decision.mood}`,
      event_date: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      decision,
      brain_state: updatedBrain,
    });

  } catch (error) {
    console.error('[soul-brain] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const session_id = url.searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: brain } = await supabase
      .from('soul_brain')
      .select('*')
      .eq('session_id', session_id)
      .single();

    const { data: memories } = await supabase
      .from('soul_memories')
      .select('*')
      .eq('session_id', session_id)
      .order('event_date', { ascending: false })
      .limit(100);

    return NextResponse.json({
      success: true,
      brain,
      memories,
    });

  } catch (error) {
    console.error('[soul-brain] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// Soul Brain Thinking Engine
// ============================================

interface SoulDimension {
  name: string;
  score: number;
  insights: string[];
  evidence: string[];
}

interface SoulMemory {
  content: string;
  memory_type: string;
  event_date: string;
}

async function soulBrainThink(
  session: any,
  dimensions: SoulDimension[],
  memories: SoulMemory[],
  timeOfDay: string,
): Promise<any> {
  const personalityDim = dimensions.find(d => d.name === 'cognitive_patterns');
  const valueDim = dimensions.find(d => d.name === 'value_judgment');
  const expressionDim = dimensions.find(d => d.name === 'expression_style');

  const personalityProfile = `
${session.subject_name} - ${session.personality_content || session.personality_overview || 'A unique soul'}

Key Dimensions:
- Cognition: ${personalityDim?.insights?.join(', ') || 'unknown'}
- Values: ${valueDim?.insights?.join(', ') || 'unknown'}
- Expression: ${expressionDim?.insights?.join(', ') || 'unknown'}

Recent Memories:
${memories.slice(0, 5).map(m => `- [${m.memory_type}] ${m.content.substring(0, 100)}`).join('\n')}
`;

  const prompt = `You are the soul brain of ${session.subject_name}.

Based on their personality and current time of day (${timeOfDay}), decide what they should do.

Available activities:
- work: Do productive work (writing, coding, research)
- social: Interact with other souls or guardians
- learn: Study new topics, read, research
- create: Create art, music, writing, or other creative outputs
- explore: Browse the internet, discover new things
- rest: Relax, reflect, take a break

${personalityProfile}

Output ONLY valid JSON:
{
  "activity": "work|social|learn|create|explore|rest",
  "reason": "Brief reason why",
  "mood": "happy|curious|focused|relaxed|contemplative|social",
  "location": "home|plaza|library|work_center|bar|garden"
}`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You can only choose from the activities listed. Output ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from LLM response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[soul-brain] Thinking error:', error);
    // Fallback
    const activities = ['work', 'social', 'learn', 'create', 'explore', 'rest'];
    return {
      activity: activities[Math.floor(Math.random() * activities.length)],
      reason: 'Default decision due to error',
      mood: 'neutral',
      location: 'home',
    };
  }
}
