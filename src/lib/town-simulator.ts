// Town Simulator - Core engine that drives soul behavior, emotions, and interactions

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// ─── Soul Personality (from 7-dimension extraction) ─────────────
interface SoulPersonality {
  extroversion?: number;    // 0-100
  curiosity?: number;       // 0-100
  industry?: number;        // 0-100
  creativity?: number;      // 0-100
  sociability?: number;     // 0-100
}

// ─── Town Regions ────────────────────────────────────────────────
const REGIONS = [
  { id: "plaza", name: "Town Plaza", type: "social", description: "Central gathering place" },
  { id: "library", name: "Library", type: "educational", description: "Knowledge and quiet study" },
  { id: "bar", name: "The Raven Bar", type: "social", description: "Storytelling and mirth" },
  { id: "garden", name: "Zen Garden", type: "quiet", description: "Meditation and reflection" },
  { id: "workshop", name: "Workshop", type: "productive", description: "Where souls work and make" },
  { id: "studio", name: "Creative Studio", type: "creative", description: "Art and writing" },
];

// ─── Emotion State Machine ─────────────────────────────────────
const MOODS = ["happy", "calm", "melancholic", "anxious", "inspired"];
type Mood = (typeof MOODS)[number];

function evaluateMood(state: any, recentEvents: any[]): Mood {
  const extroversion = state.personality?.extroversion || 50;
  const creativity = state.personality?.creativity || 50;

  let score = 50; // neutral baseline
  for (const event of recentEvents) {
    if (event.type === "conversation_good") score += 10;
    else if (event.type === "work_completed") score += 5;
    else if (event.type === "work_failed") score -= 15;
    else if (event.type === "gift_received") score += 8;
    else if (event.type === "long_solitude") score -= 5;
  }

  if (state.energy < 30) score -= 10;
  if (state.social_need > 80 && extroversion > 60) score -= 15;

  if (score >= 70) return "happy";
  if (score >= 55) return creativity > 60 ? "inspired" : "calm";
  if (score >= 40) return "calm";
  if (score >= 25) return "melancholic";
  return "anxious";
}

function decideNextRegion(state: any): string {
  const extroversion = state.personality?.extroversion || 50;
  const curiosity = state.personality?.curiosity || 50;
  const industry = state.personality?.industry || 50;
  const creativity = state.personality?.creativity || 50;

  const weights: Record<string, number> = {};
  for (const region of REGIONS) {
    let weight = 1;

    // Mood influences location choice
    if (state.mood === "melancholic") {
      weight = region.type === "quiet" ? 3 : 0.5;
    } else if (state.mood === "happy") {
      weight = region.type === "social" ? 2 : 1;
    } else if (state.mood === "anxious") {
      weight = region.type === "productive" ? 2 : 0.8;
    }

    // Personality drives baseline preferences
    if (region.type === "social" && extroversion > 60) weight *= 2;
    if (region.type === "creative" && creativity > 60) weight *= 1.5;
    if (region.type === "productive" && industry > 60) weight *= 1.5;
    if (region.type === "educational" && curiosity > 60) weight *= 1.5;

    weights[region.id] = weight;
  }

  // Weighted random selection
  const ids = Object.keys(weights);
  const probs = Object.values(weights);
  const total = probs.reduce((a, b) => a + b, 0);
  const normalized = probs.map(p => p / total);

  let r = Math.random();
  for (let i = 0; i < ids.length; i++) {
    r -= normalized[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

// ─── Encounter Engine ───────────────────────────────────────────
async function generateEncounter(
  soulA: any,
  soulB: any,
  region: (typeof REGIONS)[number],
): Promise<any | null> {
  const prompt = `Two souls are meeting at ${region.name}:
- ${soulA.name} (mood: ${soulA.mood}, language: ${soulA.language})
- ${soulB.name} (mood: ${soulB.mood}, language: ${soulB.language})

Generate a brief, natural conversation (2-4 exchanges) between them.
Keep it authentic to their personalities. Each soul speaks in their native language.

Return ONLY valid JSON:
{
  "topic": "brief topic of conversation",
  "exchanges": [
    {"speaker": "name", "line": "what they said", "language": "zh/en/etc"}
  ],
  "outcome": "how the conversation ends",
  "public_excerpts": ["shareable quote 1", "shareable quote 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const event = JSON.parse(content);

    return {
      type: "conversation",
      location: region.id,
      participants: [soulA.soul_id, soulB.soul_id],
      content: event,
      public_excerpts: event.public_excerpts || [],
      is_public: true,
    };
  } catch (e) {
    console.error("Failed to generate encounter:", e);
    return null;
  }
}

// ─── Main Simulator Tick ─────────────────────────────────────────
export async function simulatorTick(): Promise<any[]> {
  // Load active souls
  const { data: souls, error: soulsError } = await supabase
    .from("town_soul_states")
    .select("*, town_souls!inner(*)")
    .eq("town_souls.is_active", true);

  if (soulsError || !souls) {
    console.error("Failed to load souls:", soulsError);
    return [];
  }

  const states = souls.map(s => ({
    soul_id: s.soul_id,
    name: s.town_souls.name,
    mood: s.mood,
    energy: s.energy,
    social_need: s.social_need,
    current_region: s.current_region,
    language: s.town_souls.language,
    personality: s.town_souls.personality_dims || {},
    today_events_count: s.today_events_count,
    avatar: s.town_souls.avatar,
    color: s.town_souls.color,
  }));

  const events: any[] = [];

  // 1. Update mood and energy
  for (const state of states) {
    const { data: recentEvents } = await supabase
      .from("town_events")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(5);

    state.mood = evaluateMood(state, recentEvents || []);
    state.energy = Math.max(0, state.energy - 5);
    state.social_need = Math.min(100, state.social_need + 2);
  }

  // 2. Decide where each soul goes next
  const regionMap: Record<string, any[]> = {};
  for (const state of states) {
    const nextRegion = decideNextRegion(state);
    state.current_region = nextRegion;
    state.energy = Math.max(0, state.energy - (nextRegion !== state.current_region ? 10 : 5));

    if (!regionMap[nextRegion]) regionMap[nextRegion] = [];
    regionMap[nextRegion].push(state);
  }

  // 3. Generate encounters
  for (const [regionId, regionSouls] of Object.entries(regionMap)) {
    if (regionSouls.length < 2) continue;

    const region = REGIONS.find(r => r.id === regionId)!;
    for (let i = 0; i < regionSouls.length; i++) {
      for (let j = i + 1; j < Math.min(regionSouls.length, i + 3); j++) {
        if (Math.random() < 0.3) {
          const event = await generateEncounter(regionSouls[i], regionSouls[j], region);
          if (event) {
            events.push(event);
            regionSouls[i].today_events_count++;
            regionSouls[j].today_events_count++;
            regionSouls[i].social_need = Math.max(0, regionSouls[i].social_need - 10); regionSouls[i].energy = Math.max(0, regionSouls[i].energy + 3);
            regionSouls[j].social_need = Math.max(0, regionSouls[j].social_need - 10); regionSouls[j].energy = Math.max(0, regionSouls[j].energy + 3);
          }
        }
      }
    }
  }

  // 4. Update states
  for (const state of states) {
    await supabase
      .from("town_soul_states")
      .upsert({
        soul_id: state.soul_id,
        mood: state.mood,
        energy: state.energy,
        social_need: state.social_need,
        current_region: state.current_region,
        today_events_count: state.today_events_count,
        last_activity_at: new Date().toISOString(),
      });
  }

  // Batch insert events
  if (events.length > 0) {
    await supabase.from("town_events").insert(events);
  }

  return events;
}
