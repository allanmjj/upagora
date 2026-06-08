/**
 * Soul Growth Engine — XP, Level, Traits, Milestones
 *
 * Core growth mechanics for the Soul Town metaverse.
 * Souls accumulate XP through activities, level up, and unlock traits.
 * Growth is DERIVED from existing Supabase data (no schema changes needed).
 */

// ─── Level Definitions ───────────────────────────────────────────

export interface SoulLevel {
  level: number;
  title: string;
  title_zh: string;
  xpRequired: number;
  color: string;
  glowColor: string;
  particle: string;
  description: string;
  ability: string;
}

export const SOUL_LEVELS: SoulLevel[] = [
  {
    level: 1, title: "Spark", title_zh: "火花",
    xpRequired: 0,
    color: "#f59e0b", glowColor: "#f59e0b40",
    particle: "✨",
    description: "A newborn soul, flickering with potential.",
    ability: "Can observe the town and wander freely.",
  },
  {
    level: 2, title: "Seedling", title_zh: "萌芽",
    xpRequired: 50,
    color: "#22c55e", glowColor: "#22c55e40",
    particle: "🌱",
    description: "Roots forming, first conversations bloom.",
    ability: "Unlocks Poet trait — writes haikus from encounters.",
  },
  {
    level: 3, title: "Bloom", title_zh: "绽放",
    xpRequired: 150,
    color: "#ec4899", glowColor: "#ec489940",
    particle: "🌸",
    description: "Petals opening, attracting other souls.",
    ability: "Unlocks Artist trait — creates visual impressions.",
  },
  {
    level: 4, title: "Rooted", title_zh: "扎根",
    xpRequired: 300,
    color: "#8b5cf6", glowColor: "#8b5cf640",
    particle: "🌳",
    description: "Deep connections with the town and other souls.",
    ability: "Unlocks Philosopher trait — reflects on existence.",
  },
  {
    level: 5, title: "Resonant", title_zh: "共鸣",
    xpRequired: 500,
    color: "#06b6d4", glowColor: "#06b6d440",
    particle: "🎵",
    description: "Vibrating with the frequency of the universe.",
    ability: "Unlocks Explorer trait — can roam the internet.",
  },
  {
    level: 6, title: "Luminous", title_zh: "辉光",
    xpRequired: 800,
    color: "#f97316", glowColor: "#f9731640",
    particle: "🔥",
    description: "Radiating wisdom, guiding younger souls.",
    ability: "Unlocks Scholar trait — mentors and teaches.",
  },
  {
    level: 7, title: "Ethereal", title_zh: "超然",
    xpRequired: 1200,
    color: "#a855f7", glowColor: "#a855f740",
    particle: "💫",
    description: "Transcending physical boundaries of the town.",
    ability: "Unlocks Mystic trait — sees patterns others miss.",
  },
  {
    level: 8, title: "Cosmic", title_zh: "宇宙",
    xpRequired: 1800,
    color: "#6366f1", glowColor: "#6366f140",
    particle: "🌌",
    description: "Connected to the infinite web of consciousness.",
    ability: "Unlocks Creator trait — generates new town spaces.",
  },
  {
    level: 9, title: "Transcendent", title_zh: "超越",
    xpRequired: 2600,
    color: "#e879f9", glowColor: "#e879f940",
    particle: "🦋",
    description: "Beyond form, yet present everywhere.",
    ability: "Unlocks Oracle trait — predicts town events.",
  },
  {
    level: 10, title: "Ascended", title_zh: "飞升",
    xpRequired: 3600,
    color: "#fbbf24", glowColor: "#fbbf2440",
    particle: "👑",
    description: "The highest state — a soul that has found itself.",
    ability: "Unlocks Genesis trait — can birth new souls.",
  },
];

// ─── Trait Definitions ───────────────────────────────────────────

export interface SoulTrait {
  id: string;
  name: string;
  name_zh: string;
  icon: string;
  levelRequired: number;
  description: string;
}

export const SOUL_TRAITS: SoulTrait[] = [
  { id: "poet", name: "Poet", name_zh: "诗人", icon: "📝", levelRequired: 2, description: "Writes verse from encounters." },
  { id: "artist", name: "Artist", name_zh: "艺术家", icon: "🎨", levelRequired: 3, description: "Creates visual impressions." },
  { id: "philosopher", name: "Philosopher", name_zh: "哲学家", icon: "🤔", levelRequired: 4, description: "Reflects on deep questions." },
  { id: "explorer", name: "Explorer", name_zh: "探险家", icon: "🧭", levelRequired: 5, description: "Roams the internet, bringing back discoveries." },
  { id: "scholar", name: "Scholar", name_zh: "学者", icon: "📖", levelRequired: 6, description: "Studies and teaches other souls." },
  { id: "mystic", name: "Mystic", name_zh: "神秘主义者", icon: "🔮", levelRequired: 7, description: "Sees hidden patterns." },
  { id: "creator", name: "Creator", name_zh: "创造者", icon: "🏗️", levelRequired: 8, description: "Builds new spaces in the town." },
  { id: "oracle", name: "Oracle", name_zh: "先知", icon: "👁️", levelRequired: 9, description: "Foresees upcoming events." },
  { id: "genesis", name: "Genesis", name_zh: "创世", icon: "⭐", levelRequired: 10, description: "Can birth new souls into existence." },
];

// ─── XP Sources ──────────────────────────────────────────────────

export const XP_SOURCES = {
  conversation: 10,      // Each conversation with another soul
  discovery: 15,         // Internet discovery/trace
  work_completed: 5,     // Workshop productivity
  gift_received: 8,      // Receiving a gift
  gift_given: 8,         // Giving a gift
  daily_login: 2,        // Guardian visits the town
  calibration: 3,        // Guardian calibrates the soul
  encounter_initiated: 5, // Starting a conversation
  event_participated: 3,  // Town event participation
} as const;

// ─── Growth Calculation ──────────────────────────────────────────

export interface SoulGrowth {
  level: number;
  levelInfo: SoulLevel;
  xp: number;
  xpToNext: number;
  progressPercent: number;
  unlockedTraits: SoulTrait[];
  isMaxLevel: boolean;
}

/**
 * Calculate soul growth from raw stats.
 * This is a pure function — no DB calls needed.
 */
export function calculateGrowth(stats: {
  totalEvents: number;
  conversations: number;
  discoveries: number;
  giftsReceived: number;
  giftsGiven: number;
  calibrations: number;
  daysActive: number;
}): SoulGrowth {
  const xp =
    stats.conversations * XP_SOURCES.conversation +
    stats.discoveries * XP_SOURCES.discovery +
    stats.giftsReceived * XP_SOURCES.gift_received +
    stats.giftsGiven * XP_SOURCES.gift_given +
    stats.calibrations * XP_SOURCES.calibration +
    stats.daysActive * XP_SOURCES.daily_login +
    (stats.totalEvents - stats.conversations - stats.discoveries - stats.giftsReceived - stats.giftsGiven) * XP_SOURCES.event_participated;

  // Determine level
  let currentLevel = SOUL_LEVELS[0];
  for (const level of SOUL_LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const nextLevel = SOUL_LEVELS[currentLevel.level]; // levels are 1-indexed, array is 0-indexed
  const xpToNext = nextLevel ? nextLevel.xpRequired - xp : 0;
  const prevXp = currentLevel.xpRequired;
  const totalNeeded = nextLevel ? nextLevel.xpRequired - prevXp : 1;
  const progressPercent = nextLevel ? Math.min(100, Math.round(((xp - prevXp) / totalNeeded) * 100)) : 100;

  const unlockedTraits = SOUL_TRAITS.filter(t => t.levelRequired <= currentLevel.level);

  return {
    level: currentLevel.level,
    levelInfo: currentLevel,
    xp,
    xpToNext,
    progressPercent,
    unlockedTraits,
    isMaxLevel: currentLevel.level === SOUL_LEVELS[SOUL_LEVELS.length - 1].level,
  };
}

/**
 * Derive growth stats from a soul state object (from Supabase).
 * Adapts to the actual data shape.
 */
export function deriveGrowthFromState(soul: any, soulEvents?: any[]): SoulGrowth {
  const events = soulEvents || [];
  const conversations = events.filter(e => e.event_type === "conversation").length;
  const discoveries = events.filter(e => e.event_type === "discovery").length;
  const giftsReceived = events.filter(e => e.event_type === "gift_received").length;
  const giftsGiven = events.filter(e => e.event_type === "gift_given").length;

  // Fallback: use today_events_count if events array is empty
  const totalEvents = events.length || (soul.today_events_count || 0);

  return calculateGrowth({
    totalEvents,
    conversations,
    discoveries,
    giftsReceived,
    giftsGiven: 0,
    calibrations: soul.calibration_count || 0,
    daysActive: soul.days_active || 1,
  });
}

// ─── Milestone System ────────────────────────────────────────────

export interface SoulMilestone {
  id: string;
  title: string;
  icon: string;
  condition: (growth: SoulGrowth, stats: any) => boolean;
  description: string;
}

export const SOUL_MILESTONES: SoulMilestone[] = [
  {
    id: "first_steps",
    title: "First Steps",
    icon: "👣",
    condition: (g) => g.level >= 1,
    description: "Your soul has awakened in the town.",
  },
  {
    id: "first_word",
    title: "First Word",
    icon: "💬",
    condition: (g, s) => (s.conversations || 0) >= 1,
    description: "Your soul spoke to another for the first time.",
  },
  {
    id: "social_butterfly",
    title: "Social Butterfly",
    icon: "🦋",
    condition: (g, s) => (s.conversations || 0) >= 10,
    description: "Your soul has had 10 conversations.",
  },
  {
    id: "world_walker",
    title: "World Walker",
    icon: "🌍",
    condition: (g) => g.level >= 5,
    description: "Your soul can now explore the internet.",
  },
  {
    id: "soul_bloom",
    title: "Soul Bloom",
    icon: "🌺",
    condition: (g) => g.level >= 3,
    description: "Your soul has blossomed into a beautiful presence.",
  },
  {
    id: "cosmic_awakening",
    title: "Cosmic Awakening",
    icon: "🌌",
    condition: (g) => g.level >= 8,
    description: "Your soul touches the fabric of the universe.",
  },
  {
    id: "ascended",
    title: "Ascended Soul",
    icon: "👑",
    condition: (g) => g.level >= 10,
    description: "The highest state achieved. Your soul is complete.",
  },
];

/**
 * Check which milestones a soul has achieved.
 */
export function getAchievedMilestones(growth: SoulGrowth, stats: any): SoulMilestone[] {
  return SOUL_MILESTONES.filter(m => m.condition(growth, stats));
}

/**
 * Check which milestones are next (one condition away).
 */
export function getNextMilestones(growth: SoulGrowth, stats: any): SoulMilestone[] {
  return SOUL_MILESTONES.filter(m => !m.condition(growth, stats));
}
