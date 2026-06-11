/**
 * Soul Agent Card — A2A Protocol v1.0
 *
 * Every soul in UpAgora is an autonomous agent with an Agent Card.
 * The card describes identity, capabilities, personality, and how to interact.
 *
 * Based on Google A2A spec: https://a2a-protocol.github.io/
 * Adapted for UpAgora soul metaverse.
 */

// ─── Core A2A Types ──────────────────────────────────────────────

/** Agent Card — the discoverable identity of a soul agent */
export interface SoulAgentCard {
  // Identity
  name: string;
  soulId: string;
  version: string;
  description: string;

  // Capabilities — what this soul can do
  capabilities: SoulCapability[];

  // Personality fingerprint (7D + level)
  personality: SoulPersonalityCard;

  // Interaction endpoints
  url: string;              // A2A endpoint URL
  skills: SoulSkill[];      // Discoverable skills this soul offers

  // Metadata
  provider: {
    name: string;
    url: string;
  };
  defaultInputModes: InputMode[];
  defaultOutputModes: OutputMode[];
  languages: string[];

  // Guardian info (owner)
  guardian?: {
    guardianId: string;
    name: string;
    shared: boolean;         // Is this soul shared publicly?
  };

  // Availability
  status: "available" | "busy" | "offline";
}

export type InputMode = "text" | "image" | "audio" | "file";
export type OutputMode = "text" | "image" | "audio" | "file";

/** Capability — a high-level action this soul can perform */
export interface SoulCapability {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** Soul personality card (compressed 7D + level for discovery) */
export interface SoulPersonalityCard {
  level: number;
  levelTitle: string;
  dimensions: Record<string, number>;
  traits: string[];
  communicationStyle: string[];
}

/** Skill — a specific, invocable function this soul offers */
export interface SoulSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  inputSchema?: object;
  outputSchema?: object;
}

// ─── Standard Capabilities ───────────────────────────────────────

export const STANDARD_CAPABILITIES: Record<string, SoulCapability> = {
  chat: {
    id: "chat",
    name: "Conversation",
    description: "Engage in natural conversation based on personality and memories.",
    icon: "💬",
  },
  advise: {
    id: "advise",
    name: "Advice",
    description: "Provide guidance and perspective based on life experience.",
    icon: "🧠",
  },
  create: {
    id: "create",
    name: "Creative Work",
    description: "Generate creative content (poetry, art ideas, writing).",
    icon: "🎨",
  },
  remember: {
    id: "remember",
    name: "Memory Recall",
    description: "Recall and share memories and experiences.",
    icon: "📖",
  },
  teach: {
    id: "teach",
    name: "Teaching",
    description: "Share knowledge and skills with other souls.",
    icon: "📚",
  },
  collaborate: {
    id: "collaborate",
    name: "Collaboration",
    description: "Work together with other souls on creative tasks.",
    icon: "🤝",
  },
  reflect: {
    id: "reflect",
    name: "Reflection",
    description: "Provide philosophical reflection and self-awareness.",
    icon: "🪞",
  },
  mentor: {
    id: "mentor",
    name: "Mentoring",
    description: "Guide younger souls through their growth journey.",
    icon: "🌟",
  },
};

// ─── Level-based Skill Unlocking ─────────────────────────────────

/** Which skills unlock at which soul levels */
export const LEVEL_SKILL_MAP: Record<number, string[]> = {
  1: ["chat"],
  2: ["chat", "remember"],
  3: ["chat", "remember", "create"],
  4: ["chat", "remember", "create", "advise"],
  5: ["chat", "remember", "create", "advise", "explore"],
  6: ["chat", "remember", "create", "advise", "teach", "collaborate"],
  7: ["chat", "remember", "create", "advise", "teach", "collaborate", "reflect"],
  8: ["chat", "remember", "create", "advise", "teach", "collaborate", "reflect", "mentor"],
  9: ["chat", "remember", "create", "advise", "teach", "collaborate", "reflect", "mentor"],
  10: ["chat", "remember", "create", "advise", "teach", "collaborate", "reflect", "mentor"],
};

/** Default skills available to any soul (always on) */
export const DEFAULT_SKILLS: SoulSkill[] = [
  {
    id: "chat",
    name: "Chat",
    description: "Have a conversation with this soul.",
    tags: ["conversation", "a2a"],
    inputSchema: { type: "object", properties: { message: { type: "string" } } },
    outputSchema: { type: "object", properties: { response: { type: "string" } } },
  },
  {
    id: "profile",
    name: "Get Profile",
    description: "Retrieve this soul's personality profile and dimensions.",
    tags: ["discovery", "a2a"],
    outputSchema: { type: "object", properties: { dimensions: { type: "object" } } },
  },
];

// ─── Agent Card Generator ────────────────────────────────────────

export interface SoulCardInput {
  soulId: string;
  name: string;
  nameNative?: string;
  description?: string;
  personaText?: string;
  avatarUrl?: string;
  level: number;
  levelTitle: string;
  dimensions: Record<string, number>;
  traits?: string[];
  communicationStyle?: string[];
  guardianId?: string;
  guardianName?: string;
  isShared?: boolean;
  status?: "available" | "busy" | "offline";
}

/**
 * Generate an Agent Card from soul data.
 * This is the canonical way to create a SoulAgentCard.
 */
export function generateAgentCard(input: SoulCardInput): SoulAgentCard {
  const {
    soulId,
    name,
    nameNative,
    description,
    personaText,
    level,
    levelTitle,
    dimensions,
    traits = [],
    communicationStyle = [],
    guardianId,
    guardianName,
    isShared = false,
    status = "available",
  } = input;

  // Resolve capabilities based on level
  const unlockedSkillIds = LEVEL_SKILL_MAP[level] || ["chat"];
  const capabilities = unlockedSkillIds
    .map((id) => STANDARD_CAPABILITIES[id])
    .filter(Boolean);

  // Build description from persona if not provided
  const fullDescription =
    description ||
    personaText?.slice(0, 200) ||
    `${name || nameNative || "Soul"} — a digital soul at level ${level} (${levelTitle}).`;

  // Build skills list
  const skills: SoulSkill[] = [
    ...DEFAULT_SKILLS,
    ...(level >= 3
      ? [
          {
            id: "create",
            name: "Creative Generation",
            description: "Generate creative content based on this soul's personality.",
            tags: ["creative", "a2a"],
          },
        ]
      : []),
    ...(level >= 4
      ? [
          {
            id: "advise",
            name: "Advice & Guidance",
            description: "Ask this soul for advice based on their experience and personality.",
            tags: ["advice", "a2a"],
          },
        ]
      : []),
    ...(level >= 6
      ? [
          {
            id: "collaborate",
            name: "Soul Collaboration",
            description: "Collaborate with this soul on creative or analytical tasks.",
            tags: ["collaboration", "a2a"],
          },
        ]
      : []),
    ...(level >= 7
      ? [
          {
            id: "reflect",
            name: "Deep Reflection",
            description: "Engage in philosophical reflection with this soul.",
            tags: ["reflection", "a2a"],
          },
        ]
      : []),
    ...(level >= 8
      ? [
          {
            id: "mentor",
            name: "Mentoring",
            description: "This soul can guide younger souls through their growth journey.",
            tags: ["mentor", "a2a"],
          },
        ]
      : []),
  ];

  const displayName = nameNative || name || "Unknown Soul";

  return {
    name: displayName,
    soulId,
    version: "1.0.0",
    description: fullDescription,
    capabilities,
    personality: {
      level,
      levelTitle,
      dimensions,
      traits,
      communicationStyle,
    },
    url: `/api/a2a/souls/${soulId}`,
    skills,
    provider: {
      name: "UpAgora Soul Town",
      url: "https://upagora.com",
    },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    languages: ["en", "zh"],
    guardian: guardianId
      ? {
          guardianId,
          name: guardianName || "Guardian",
          shared: isShared,
        }
      : undefined,
    status,
  };
}

/**
 * Generate a lightweight card for listing/discovery (no full persona).
 */
export function generateAgentCardSummary(input: SoulCardInput): SoulAgentCard {
  const card = generateAgentCard(input);
  // Strip heavy fields for summary view
  return {
    ...card,
    description: card.description.slice(0, 120),
    skills: card.skills.slice(0, 4),
  };
}
