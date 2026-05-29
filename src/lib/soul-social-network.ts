// Soul Social Network — relationships between souls in Soul Town
// Inspired by: AI Town social simulation, inZOI inner-thinking NPCs
//
// Souls form relationships through interactions, share gossip, form groups,
// and their connections evolve over time like real social networks.

export type RelationshipLevel = "intimate" | "friendly" | "acquaintance" | "stranger";
export type InteractionType = "chat" | "collaborate" | "gift" | "encounter" | "dispute" | "ceremony";

export interface SocialLink {
  id: string;
  soulA: string;
  soulB: string;
  level: RelationshipLevel;
  warmth: number; // -100 to 100 (negative = rivalry)
  lastInteraction: string;
  interactionCount: number;
  sharedMemories: SharedMemory[];
  status: "active" | "dormant" | "estranged";
}

export interface SharedMemory {
  id: string;
  description: string;
  createdAt: string;
  sharedBy: string[]; // soul IDs who experienced this
}

export interface SocialFeedItem {
  id: string;
  type: FeedType;
  souls: string[]; // soul IDs involved
  description: string;
  location?: string;
  createdAt: string;
}

export type FeedType = "meet" | "chat" | "create" | "gift" | "party" | "conflict" | "reflect" | "wander";

// Social network graph
export interface SoulNetwork {
  links: SocialLink[];
  feed: SocialFeedItem[];
  groups: SocialGroup[];
}

export interface SocialGroup {
  id: string;
  name: string;
  members: string[];
  formedAt: string;
  meetingSpot?: string;
  activity: string;
}

// Initialize social link between two souls
export function createSocialLink(soulA: string, soulB: string): SocialLink {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    soulA,
    soulB,
    level: "stranger",
    warmth: 0,
    lastInteraction: new Date().toISOString(),
    interactionCount: 0,
    sharedMemories: [],
    status: "active",
  };
}

// Get or create link between two souls (bidirectional)
export function getLink(network: SoulNetwork, soulA: string, soulB: string): SocialLink | null {
  return network.links.find(
    (l) => (l.soulA === soulA && l.soulB === soulB) || (l.soulA === soulB && l.soulB === soulA)
  ) || null;
}

// Record an interaction between two souls
export function interact(network: SoulNetwork, soulA: string, soulB: string, type: InteractionType): SocialLink | null {
  let link = getLink(network, soulA, soulB);

  if (!link) {
    link = createSocialLink(soulA, soulB);
    network.links.push(link);
  }

  link.interactionCount++;
  link.lastInteraction = new Date().toISOString();

  // Warmth change based on interaction type
  const warmthDelta = getWarmthDelta(type, link.level);
  link.warmth = Math.max(-100, Math.min(100, link.warmth + warmthDelta));

  // Update relationship level based on warmth and interaction count
  link.level = getRelationshipLevel(link.warmth, link.interactionCount);
  link.status = getLinkStatus(link);

  // Add shared memory for memorable interactions
  if (isMemorableInteraction(type, link.warmth)) {
    link.sharedMemories.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      description: getMemoryDescription(type, link.level),
      createdAt: new Date().toISOString(),
      sharedBy: [soulA, soulB],
    });
  }

  // Add to social feed
  const feedItem: SocialFeedItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    type: mapToFeedType(type),
    souls: [soulA, soulB],
    description: getFeedDescription(type, link.level),
    location: getRandomLocation(type),
    createdAt: new Date().toISOString(),
  };
  network.feed.unshift(feedItem);

  return link;
}

function getWarmthDelta(type: InteractionType, currentLevel: RelationshipLevel): number {
  const base = {
    chat: 5,
    collaborate: 10,
    gift: 15,
    encounter: 3,
    dispute: -10,
    ceremony: 12,
  };
  // More impact when relationship is deeper
  const multiplier = {
    intimate: 1.5,
    friendly: 1.2,
    acquaintance: 1.0,
    stranger: 0.8,
  };
  return base[type] * (multiplier[currentLevel] || 1);
}

function getRelationshipLevel(warmth: number, interactions: number): RelationshipLevel {
  if (warmth > 40 && interactions >= 5) return "intimate";
  if (warmth > 15 && interactions >= 3) return "friendly";
  if (interactions >= 1) return "acquaintance";
  return "stranger";
}

function getLinkStatus(link: SocialLink): "active" | "dormant" | "estranged" {
  if (link.warmth < -30) return "estranged";
  // Dormant if no interaction for a while
  const daysSinceLast = (Date.now() - new Date(link.lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > 14) return "dormant";
  return "active";
}

function isMemorableInteraction(type: InteractionType, warmth: number): boolean {
  const memorable = ["collaborate", "gift", "ceremony", "dispute"];
  return memorable.includes(type) && Math.abs(warmth) > 10;
}

function getMemoryDescription(type: InteractionType, level: RelationshipLevel): string {
  const templates: Record<InteractionType, Record<RelationshipLevel, string>> = {
    chat: { intimate: "had a deep conversation", friendly: "shared stories over tea", acquaintance: "had a pleasant chat", stranger: "exchanged greetings" },
    collaborate: { intimate: "worked on something together", friendly: "helped each other", acquaintance: "did something together once", stranger: "crossed paths while working" },
    gift: { intimate: "gave a meaningful gift", friendly: "exchanged a small present", acquaintance: "shared something kind", stranger: "noticed a small gesture" },
    encounter: { intimate: "unexpectedly met", friendly: "ran into each other", acquaintance: "briefly met", stranger: "spotted from a distance" },
    dispute: { intimate: "had a serious disagreement", friendly: "argued briefly", acquaintance: "had a minor misunderstanding", stranger: "a tense exchange" },
    ceremony: { intimate: "celebrated together deeply", friendly: "attended an event together", acquaintance: "stood together at an event", stranger: "was present at the same gathering" },
  };
  return templates[type]?.[level] || "interacted briefly";
}

function mapToFeedType(type: InteractionType): FeedType {
  const map: Record<InteractionType, FeedType> = {
    chat: "chat",
    collaborate: "create",
    gift: "gift",
    encounter: "meet",
    dispute: "conflict",
    ceremony: "party",
  };
  return map[type] || "chat";
}

function getFeedDescription(type: InteractionType, level: RelationshipLevel): string {
  return getMemoryDescription(type, level);
}

function getRandomLocation(type: InteractionType): string {
  const locations: Record<InteractionType, string[]> = {
    chat: ["teahouse", "garden", "plaza"],
    collaborate: ["workshop", "library", "studio"],
    gift: ["plaza", "garden"],
    encounter: ["plaza", "library", "teahouse", "garden", "temple"],
    dispute: ["plaza", "bar"],
    ceremony: ["temple", "theater"],
  };
  const opts = locations[type] || ["plaza"];
  return opts[Math.floor(Math.random() * opts.length)];
}

// Find or form social groups based on connection clusters
export function findGroups(network: SoulNetwork, minMembers: number = 3): SocialGroup[] {
  const adjacency: Record<string, Set<string>> = {};

  for (const link of network.links) {
    if (!adjacency[link.soulA]) adjacency[link.soulA] = new Set();
    if (!adjacency[link.soulB]) adjacency[link.soulB] = new Set();
    adjacency[link.soulA].add(link.soulB);
    adjacency[link.soulB].add(link.soulA);
  }

  const visited = new Set<string>();
  const groups: SocialGroup[] = [];

  for (const soul of Object.keys(adjacency)) {
    if (visited.has(soul)) continue;

    // BFS to find connected component
    const component: string[] = [];
    const queue = [soul];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);

      for (const neighbor of adjacency[current]) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (component.length >= minMembers) {
      groups.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: getGroupName(component.length),
        members: component,
        formedAt: new Date().toISOString(),
        meetingSpot: getGroupMeetingSpot(component.length),
        activity: getGroupActivity(component.length),
      });
    }
  }

  return groups;
}

function getGroupName(size: number): string {
  const names = {
    3: "Three Thinkers' Circle",
    4: "The Four Companions",
    5: "The Five Sages",
    6: "The Hexad Society",
  };
  return names[size as keyof typeof names] || `The ${size} Souls Club`;
}

function getGroupMeetingSpot(_: number): string {
  return ["teahouse", "garden", "plaza", "library"][Math.floor(Math.random() * 4)];
}

function getGroupActivity(_: number): string {
  return ["deep conversation", "shared work", "the evening gathering", "philosophical debate"][Math.floor(Math.random() * 4)];
}

// Get social feed (sorted by time, limited)
export function getSocialFeed(network: SoulNetwork, limit: number = 20): SocialFeedItem[] {
  return network.feed.slice(0, limit);
}

// Simulate a day of random social activity
export function simulateDay(network: SoulNetwork, soulIds: string[]): SocialFeedItem[] {
  const dayFeed: SocialFeedItem[] = [];

  // Random encounters
  const encounterCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < encounterCount; i++) {
    const idxA = Math.floor(Math.random() * soulIds.length);
    let idxB = Math.floor(Math.random() * soulIds.length);
    while (idxB === idxA && soulIds.length > 1) {
      idxB = Math.floor(Math.random() * soulIds.length);
    }

    const interactionType: InteractionType = weighterInteraction(
      getLink(network, soulIds[idxA], soulIds[idxB])?.level || "stranger"
    );

    const link = interact(network, soulIds[idxA], soulIds[idxB], interactionType);
    if (link) {
      dayFeed.push(network.feed[network.feed.length - 1]);
    }
  }

  // Update groups periodically
  network.groups = findGroups(network);

  return dayFeed;
}

function weighterInteraction(level: RelationshipLevel): InteractionType {
  const weights: Record<RelationshipLevel, Record<InteractionType, number>> = {
    intimate: { chat: 40, collaborate: 30, gift: 15, encounter: 10, dispute: 5, ceremony: 0 },
    friendly: { chat: 35, collaborate: 20, gift: 10, encounter: 20, dispute: 5, ceremony: 10 },
    acquaintance: { chat: 20, collaborate: 10, gift: 5, encounter: 50, dispute: 5, ceremony: 10 },
    stranger: { chat: 5, collaborate: 0, gift: 0, encounter: 70, dispute: 15, ceremony: 10 },
  };

  const w = weights[level];
  const entries = Object.entries(w) as [InteractionType, number][];
    const total = entries.reduce((s, [, v]) => s + v, 0);
  let rand = Math.random() * total;

  for (const [type, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return type;
  }

  return "encounter";
}

export default {
  createSocialLink,
  getLink,
  interact,
  findGroups,
  getSocialFeed,
  simulateDay,
};
