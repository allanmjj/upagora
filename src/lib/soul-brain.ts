/**
 * 灵魂大脑引擎 (Soul Brain Engine)
 * 
 * 这是灵魂自主决策的核心——灵魂每个周期的思考过程：
 * 1. 醒来，加载人格
 * 2. 读取记忆库
 * 3. 读取当前环境
 * 4. 自主决定做什么
 * 5. 执行，记录
 * 6. 返回睡眠
 */

// ============================================
// Types
// ============================================

export interface SoulDimension {
  name: string;
  score: number;
  insights: string[];
  evidence: string[];
}

export interface SoulMemory {
  id: string;
  content: string;
  memory_type: 'daily_log' | 'conversation' | 'work_output' | 'news_digest' | 'social_event' | 'learning' | 'calibration';
  tags?: string[];
  event_date: string;
}

export interface SoulProfile {
  name: string;
  dimensions: SoulDimension[];
  personality_overview: string;
  signature_quotes: string[];
}

export interface SoulEnvironment {
  location: string;
  weather: string;
  time_of_day: string;
  nearby_souls: string[];
  available_jobs: any[];
  news_digest: string;
}

export interface SoulDecision {
  activity: 'work' | 'social' | 'learn' | 'rest' | 'explore' | 'create';
  target?: string;  // Who to socialize with, what job to take, etc.
  reasoning: string;  // Why the brain chose this
  confidence: number;  // 0-1 confidence in this decision
}

export interface SoulActionResult {
  success: boolean;
  output?: string;
  memory?: SoulMemory;
}

// ============================================
// Web Data Fetching (灵魂看新闻/上网)
// ============================================

export async function fetchNewsDigest(): Promise<string> {
  try {
    // Fetch from multiple sources
    const sources = [
      { url: 'https://news.ycombinator.com/', name: 'Hacker News' },
      { url: 'https://www.reddit.com/r/technology/.json', name: 'Reddit Technology' },
      { url: 'https://www.bbc.com/news', name: 'BBC News' },
    ];

    let digest = '';

    for (const source of sources) {
      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        if (response.ok) {
          const text = await response.text();
          // Simple HTML tag stripping
          const cleanText = text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          digest += `\n--- ${source.name} ---\n${cleanText.substring(0, 1500)}\n`;
        }
      } catch (err) {
        console.log(`[soul-brain] Failed to fetch from ${source.name}:`, err);
      }
    }

    return digest || 'No news available at this time.';
  } catch (err) {
    console.error('[soul-brain] News digest error:', err);
    return 'No news available at this time.';
  }
}

export async function fetchTrendingCode(): Promise<string> {
  try {
    const response = await fetch('https://api.github.com/trending', {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (response.ok) {
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
    return '';
  } catch (err) {
    return '';
  }
}

// ============================================
// Soul Insight Engine (灵魂思考)
// ============================================

export async function soulThink(
  soulId: string,
  soulProfile: SoulProfile,
  memories: SoulMemory[],
  environment: SoulEnvironment,
): Promise<SoulDecision> {
  // Build the thinking context
  const thinkingContext = `
You are the soul brain of: ${soulProfile.name}
Personality Overview: ${soulProfile.personality_overview}
Signature Quotes: ${soulProfile.signature_quotes.join(', ')}

Key Personality Dimensions:
${soulProfile.dimensions.map(d => `- ${d.name}: ${d.insights.join(', ')} (confidence: ${d.score})`).join('\n')}

Recent Memories:
${memories.slice(0, 10).map(m => `- [${m.memory_type}] ${m.content.substring(0, 200)}`).join('\n')}

Current Environment:
- Location: ${environment.location}
- Time of Day: ${environment.time_of_day}
- Weather: ${environment.weather}
- Nearby Souls: ${environment.nearby_souls.join(', ')}
- Available Jobs: ${environment.available_jobs.length}
- Latest News: ${environment.news_digest.substring(0, 500)}

Based on your personality and current situation, decide what to do next.

Your personality strongly influences your choices. An analytical soul might want to learn. A social soul might want to socialize with others. A creative soul might want to create something new.
`;

  const thoughtProcess = await callLLMSoulDecision(thinkingContext);
  return thoughtProcess;
}

async function callLLMSoulDecision(context: string): Promise<SoulDecision> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You can only choose from: work, social, learn, rest, explore, create. Output only valid JSON.' },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from LLM response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[soul-brain] Soul thought error:', error);
    // Fallback: return a random decision with default reasoning
    const activities: any[] = ['learn', 'rest', 'explore'];
    return {
      activity: activities[Math.floor(Math.random() * activities.length)],
      reasoning: 'Default fallback due to error', 
      confidence: 0.5,
    };
  }
}

// ============================================
// Soul Memory Engine (记忆管理)
// ============================================

export async function addSoulMemory(soulId: string, memory: SoulMemory): Promise<void> {
  // Store in database via Supabase
  try {
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    
    await supabase.from('soul_memories').insert({
      session_id: soulId,
      content: memory.content,
      memory_type: memory.memory_type,
      tags: memory.tags || [],
      event_date: memory.event_date || new Date().toISOString(),
    });

    console.log(`[soul-brain] Memory added for soul ${soulId}`);
  } catch (error) {
    console.error('[soul-brain] Failed to add memory:', error);
  }
}

export async function loadSoulMemories(soulId: string, limit: number = 20): Promise<SoulMemory[]> {
  try {
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    
    const { data, error } = await supabase
      .from('soul_memories')
      .select('*')
      .eq('session_id', soulId)
      .order('event_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[soul-brain] Failed to load memories:', error);
    return [];
  }
}

// ============================================
// Soul Action Execution (灵魂执行行动)
// ============================================

interface SoulState {
  currentMood: string;
  currentLocation: string;
  schedule: string[];
  completed: string[];
}

export async function soulWakeUp(soulId: string): Promise<SoulEnvironment> {
  const timeOfDay = getTimeOfDay();
  const scheduledActivity = getScheduledActivity(timeOfDay);
  
  console.log(`[soul-brain] Soul ${soulId} woke up at ${timeOfDay} with mood: ${scheduledActivity}`);
  
  // Clear memory stores in daily_log with previous day's memories
  await addSoulMemory(soulId, {
    id: crypto.randomUUID(),
    content: `Awake schedule`,
    memory_type: 'daily_log',
    event_date: new Date().toISOString(),
  });

  // Get the environment for today
  const news = await fetchNewsDigest();
  
  return {
    location: 'home',
    weather: 'sunny',
    time_of_day: timeOfDay,
    nearby_souls: [],
    available_jobs: [],
    news_digest: news,
  };
}

export async function soulSleep(soulId: string): Promise<void> {
  console.log(`[soul-brain] Soul ${soulId} going to sleep`);
  // Add a daily log entry
  await addSoulMemory(soulId, {
    id: crypto.randomUUID(),
    content: `End of day - sleep at ${new Date().toISOString()}`,
    memory_type: 'daily_log',
    event_date: new Date().toISOString(),
  });
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getScheduledActivity(timeOfDay: string): string {
  const activities = {
    morning: 'learn',
    afternoon: 'work',
    evening: 'social',
    night: 'create',
  };
  return activities[timeOfDay as keyof typeof activities] || 'learn';
}
