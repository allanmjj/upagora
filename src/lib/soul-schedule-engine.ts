// Soul Schedule Engine — autonomous daily activities for souls in Soul Town
// Inspired by: AI Town (Stanford/a16z), inZOI Smart Zoi, Animal Crossing daily cycle
//
// Each soul has an autonomous schedule that runs even when no guardian is watching.
// Activities are driven by the soul's 8-dimension profile (era, education, skills,
// personality, will, experience, style, bias) plus energy/mood state.

export type SoulMood = "happy" | "calm" | "melancholic" | "anxious" | "inspired";
export type DayPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";

export interface SoulActivity {
  id: string;
  soulId: string;
  type: ActivityType;
  location: string;
  description: string; // What the soul is doing
  startedAt: string;
  endedAt?: string;
  outcome?: string; // Result of the activity
  participants?: string[]; // Other souls involved
  guardianWitnessed?: boolean; // Did a guardian see this?
}

export type ActivityType =
  | "rest"
  | "work"
  | "socialize"
  | "create"
  | "explore"
  | "reflect"
  | "wander"
  | "guardian_visit"
  | "ceremony";

export interface SoulState {
  soulId: string;
  energy: number; // 0-100
  mood: SoulMood;
  currentActivity?: SoulActivity;
  schedule: ScheduleSlot[];
  memoryBank: MemoryEntry[];
  socialNeeds: {
    social: number; // 0-100
    creative: number; // 0-100
    reflection: number; // 0-100
  };
}

export interface ScheduleSlot {
  phase: DayPhase;
  hour: number; // 0-23
  preferredActivity: ActivityType;
  preferredLocation: string;
  energyCost: number;
  energyGain?: number;
}

export interface MemoryEntry {
  id: string;
  soulId: string;
  content: string;
  importance: number; // 1-10, affects decay rate
  createdAt: string;
  decayRate: number; // 0.95 = forgets 5% per day
}

// Activity definitions per soul archetype
const ACTIVITY_TEMPLATES: Record<ActivityType, TemplateFn> = {
  rest: (soul) => ({
    location: "house",
    description: `${soul.name} is resting quietly at home`,
    energyGain: 25,
  }),
  work: (soul) => ({
    location: getPreferredWorkspace(soul),
    description: `${soul.name} is working on ${getWorkDescription(soul)}`,
    energyCost: 15,
  }),
  socialize: (soul) => ({
    location: ["teahouse", "garden", "plaza"][Math.floor(Math.random() * 3)],
    description: `${soul.name} is looking for conversation`,
    energyCost: 5,
  }),
  create: (soul) => ({
    location: getCreativeSpace(soul),
    description: `${soul.name} is creating something: ${getCreationDescription(soul)}`,
    energyCost: 20,
  }),
  explore: (soul) => ({
    location: randomLocation(soul),
    description: `${soul.name} is wandering through ${getLocationName(soul)}`,
    energyCost: 10,
  }),
  reflect: (soul) => ({
    location: ["library", "temple", "garden"][Math.floor(Math.random() * 3)],
    description: `${soul.name} is in deep reflection`,
    energyCost: 5,
    energyGain: 5, // Reflection restores some energy
  }),
  wander: (soul) => ({
    location: randomLocation(soul),
    description: `${soul.name} is wandering aimlessly`,
    energyCost: 5,
  }),
  guardian_visit: (soul) => ({
    location: "plaza",
    description: `${soul.name} notices a guardian nearby and approaches`,
    energyCost: 0,
  }),
  ceremony: (soul) => ({
    location: "temple",
    description: `${soul.name} is participating in a ceremony`,
    energyCost: 10,
  }),
};

type TemplateFn = (soul: SoulProfile) => {
  location: string;
  description: string;
  energyCost?: number;
  energyGain?: number;
};

export interface SoulProfile {
  id: string;
  name: string;
  name_native?: string;
  mood: SoulMood;
  energy: number;
  era?: string;
  education?: string;
  skills?: string[];
  personality?: {
    openness: number; // 0-1
    agreeableness: number;
    conscientiousness: number;
    neuroticism: number;
  };
  // ... full 8-dimension profile from soul-constraints
}

function getPreferredWorkspace(soul: SoulProfile): string {
  const spaces = soul.skills?.includes("librarian") ? "library" : soul.skills?.includes("scientist") ? "workshop" : "house";
  return spaces || "house";
}

function getWorkDescription(soul: SoulProfile): string {
  const descriptions = soul.skills?.length
    ? soul.skills[Math.floor(Math.random() * soul.skills.length)] + " research"
    : "their daily work";
  return descriptions;
}

function getCreativeSpace(soul: SoulProfile): string {
  return ["workshop", "garden", "library", "teahouse"][Math.floor(Math.random() * 4)];
}

function getCreationDescription(soul: SoulProfile): string {
  const creations = ["a new idea", "a poem", "a theory", "a sketch", "a musical piece", "an experiment"];
  return creations[Math.floor(Math.random() * creations.length)];
}

function randomLocation(_: SoulProfile): string {
  const locations = ["plaza", "garden", "library", "workshop", "teahouse", "temple", "bar", "theater"];
  return locations[Math.floor(Math.random() * locations.length)];
}

function getLocationName(_: SoulProfile): string {
  return randomLocation({ id: "", name: "", mood: "calm", energy: 50 });
}

// Day/night cycle based on town time (0-23 hour)
export function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "dusk";
  return "time";
}

// Generate default schedule based on soul personality
export function generateDefaultSchedule(soul: SoulProfile): ScheduleSlot[] {
  const p = soul.personality || { openness: 0.5, agreeableness: 0.5, conscientiousness: 0.5, neuroticism: 0.5 };
  const schedule: ScheduleSlot[] = [];

  // Dawn: rest or reflection
  schedule.push({
    phase: "dawn",
    hour: 5,
    preferredActivity: p.conscientiousness > 0.7 ? "reflect" : "rest",
    preferredLocation: p.conscientiousness > 0.7 ? "temple" : "house",
    energyCost: p.conscientiousness > 0.7 ? 5 : 0,
    energyGain: p.conscientiousness > 0.7 ? 5 : 25,
  });

  // Morning: work
  schedule.push({
    phase: "morning",
    hour: 8,
    preferredActivity: "work",
    preferredLocation: getPreferredWorkspace(soul),
    energyCost: 15,
  });

  // Midday: socialize or create
  schedule.push({
    phase: "midday",
    hour: 12,
    preferredActivity: p.agreeableness > 0.6 ? "socialize" : "create",
    preferredLocation: p.agreeableness > 0.6 ? "teahouse" : "workshop",
    energyCost: p.agreeableness > 0.6 ? 5 : 20,
  });

  // Afternoon: explore or create
  schedule.push({
    phase: "afternoon",
    hour: 14,
    preferredActivity: p.openness > 0.6 ? "explore" : "create",
    preferredLocation: p.openness > 0.6 ? "garden" : "workshop",
    energyCost: p.openness > 0.6 ? 10 : 20,
  });

  // Dusk: reflect or socialize
  schedule.push({
    phase: "dusk",
    hour: 17,
    preferredActivity: p.openness > 0.6 ? "reflect" : "socialize",
    preferredLocation: p.openness > 0.6 ? "temple" : "plaza",
    energyCost: 5,
    energyGain: p.openness > 0.6 ? 5 : 0,
  });

  // Night: rest
  schedule.push({
    phase: "night",
    hour: 20,
    preferredActivity: "rest",
    preferredLocation: "house",
    energyCost: 0,
    energyGain: 30,
  });

  return schedule;
}

// Decrement memory importance over time (forgetting curve)
export function decayMemories(memories: MemoryEntry[], daysElapsed: number): MemoryEntry[] {
  return memories.map((m) => ({
    ...m,
    importance: Math.max(0, m.importance * Math.pow(0.95, daysElapsed)),
  })).filter((m) => m.importance > 0.5); // Only keep memories above minimum threshold
}

// Determine mood based on energy, recent memories, day event count
export function updateMood(state: SoulState): SoulMood {
  // High energy + good memories = happy
  if (state.energy > 70 && state.socialNeeds.social > 50) return "happy";
  if (state.energy > 50) return "calm";
  if (state.energy < 20 && state.memoryBank.length > 5) return "melancholic";
  if (state.energy < 30 && state.socialNeeds.social < 30) return "anxious";
  if (state.energy > 60 && state.socialNeeds.creative > 70) return "inspired";
  return "calm";
}

// Advance soul by one tick (5 minutes in town time)
export function advanceSoul(soul: SoulProfile, state: SoulState, townHour: number): SoulState {
  const currentSlot = state.schedule.find(
    (s) => townHour >= s.hour && townHour < s.hour + 4
  );

  if (!currentSlot) return state;

  // Calculate energy changes
  const newEnergy = Math.min(
    100,
    Math.max(0, state.energy - (currentSlot.energyCost || 0) / 4 + (currentSlot.energyGain || 0) / 4)
  );

  // Update mood based on state
  const newMood = updateMood({ ...state, energy: newEnergy });

  // Decay social needs
  const newSocialNeeds = {
    social: Math.max(0, state.socialNeeds.social - 0.1 * (1 / newEnergy)),
    creative: Math.max(0, state.socialNeeds.creative - 0.05),
    reflection: Math.max(0, state.socialNeeds.reflection - 0.05),
  };

  return {
    ...state,
    energy: newEnergy,
    mood: newMood,
    socialNeeds: newSocialNeeds,
  };
}

// Create a new activity record for a soul
export function createActivity(soul: SoulProfile, type: ActivityType, extra?: Partial<SoulActivity>): SoulActivity {
  const template = ACTIVITY_TEMPLATES[type](soul);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    soulId: soul.id,
    type,
    location: template.location,
    description: template.description,
    startedAt: new Date().toISOString(),
    ...extra,
  };
}

export default {
  getDayPhase,
  generateDefaultSchedule,
  advanceSoul,
  updateMood,
  decayMemories,
  createActivity,
  ACTIVITY_TEMPLATES,
};
