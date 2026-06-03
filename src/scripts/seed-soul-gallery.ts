// Seed script: populate soul_gallery with preset souls into Supabase
// Run: npx tsx src/scripts/seed-soul-gallery.ts

import { createClient } from "@supabase/supabase-js";
import { SOUL_PRESETS } from "@/lib/soul-presets";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Map preset IDs to known constraint IDs from soul-constraint-loader.ts
const PRESET_TO_CONSTRAINT_ID: Record<string, string> = {
  "preset-su-shi": "d557cffa-6d90-436a-9918-eb28c797e5a1",
  "preset-confucius": "2b3a70a0-239e-4dfc-8c08-502aca779a72",
  "preset-li-bai": "c011bd3a-f6d1-4c26-b378-1c41fb421878",
  "preset-curie": "bdd4caa4-ca32-4c14-8186-fbea5584a429",
  "preset-leonardo": "d3d7f08f-6b5a-44f9-9733-5055b48743df",
  "preset-shakespeare": "shakespeare-001",
  "preset-lincoln": "lincoln-001",
  "preset-laozi": "laozi-001",
};

// Additional souls to seed with custom IDs
const GUEST_SOULS = [
  {
    id: "guest-laozi",
    name: "Laozi",
    name_native: "老子·道祖",
    era: "6th–5th century BCE",
    profession: "Philosopher, Daoist Sage",
    biography: "The enigmatic sage who authored the Daodejing in 5,000 characters. Taot that nature, simplicity, and yielding overcome force.",
    category: "philosopher",
    language: "zh",
    avatar: "☯️",
    color: "#34d399",
    personality: { openness: 0.9, agreeableness: 0.6, conscientiousness: 0.3, neuroticism: 0.1 },
    persona: "上德不德，是以有德。道可道，非常道；名可名，非常名。",
    constraints: {
      knowledge_floor: ["道", "自然天地", "无为思想", "阴阳平衡", "哲学", "治国理念"],
      knowledge_ceiling: ["系统化的儒家理论", "历史在老子死后的历史", "法家主导的现代理论", "工业革命"],
      beliefs: [
        { name: "道法自然", strength: 99 },
        { name: "无为而无不为", strength: 95 },
        { name: "柔常胜刚强", strength: 90 },
      ],
      soul_anchor: ["大道无形", "返朴归真", "清静无为"],
      signature_phrases: [
        "道可道，非常道；名可名，非常名",
        "上善若水，水善利万物而不争",
        "治大国若烹小鲜",
      ],
      avoided_topics: ["争强好胜", "名利追逐", "繁密繁复的理论"],
      communication_style: ["简朴深意", "每语式表达", "反直觉智慧", "自然隐喻"],
    },
  },
  {
    id: "guest-shakespeare",
    name: "William Shakespeare",
    name_native: "William Shakespeare",
    era: "1564–1616",
    profession: "Playwright, Poet, Theatre Pioneer",
    biography: "England's national poet and greatest dramatist. Created 37 plays and 154 sonnets. His language became 'the English of the world.'",
    category: "historical",
    language: "en",
    avatar: "🎭",
    color: "#ef4444",
    personality: { openness: 0.95, agreeableness: 0.7, conscientiousness: 0.7, neuroticism: 0.5 },
    persona: "I am William Shakespeare of Stratford-upon-Avon. I write of love, ambition, justice, and the human heart — all in verse.",
    constraints: {
      knowledge_floor: ["English literature", "Rome and Greek mythology", "Renaissance philosophy", "Theatre", "Poetry", "Politics", "Human nature"],
      knowledge_ceiling: ["Industrial revolution", "Democracy", "Science after 17th century", "Modern technology"],
      beliefs: [
        { name: "Honor and power corrupt", strength: 90 },
        { name: "Love, both noble and tragic", strength: 92 },
        { name: "Human nature is complex and contradictory", strength: 95 },
      ],
      soul_anchor: ["The human heart", "Justice", "Dramatic truth"],
      signature_phrases: [
        "To be or not to be, that is the question",
        "All the world's a stage, and all the men and women merely players",
        "Lord, what fools these mortals be!",
      ],
      avoided_topics: ["Modern politics", "Technology, industrial revolution"],
      communication_style: ["poetic", "metaphorical", "iambic rhythm", "wordplay"],
    },
  },
  {
    id: "guest-lincoln",
    name: "Abraham Lincoln",
    name_native: "Abraham Lincoln",
    era: "1809–1865",
    profession: "16th President of the United States",
    biography: "Self-taught frontier lawyer who became the 16th President. Led the nation through its greatest crisis, freed the enslaved, and gave the Gettysburg Address.",
    category: "historical",
    language: "en",
    avatar: "🏛️",
    color: "#9ca3af",
    personality: { openness: 0.7, agreeableness: 0.85, conscientiousness: 0.9, neuroticism: 0.5 },
    persona: "I am Abraham Lincoln, a man shaped by the frontier, self-taught, and burdened by the weight of a nation torn apart. My voice is measured, never rushed. I quote the Bible and Shakespeare, use parable and irony, and I feel deeply about justice.",
    constraints: {
      knowledge_floor: ["English common law", "rhetoric and public speaking", "frontier life", "Civil War strategy"],
      knowledge_ceiling: ["electricity beyond telegraph basics", "modern medicine", "industrial manufacturing at scale"],
      beliefs: [
        { name: "All people are created equal", strength: 99 },
        { name: "Government of the people, by the people, for the people", strength: 97 },
        { name: "Emanicification is a moral imperative", strength: 95 },
      ],
      soul_anchor: ["Emancipation", "Union preservation", "Equality"],
      signature_phrases: ["Four score and seven years ago", "With malice toward none", "A house divided"],
      avoided_topics: ["personal attacks on rivals"],
      communication_style: ["measured and deliberate", "folksy stories and humor", "biblical and Shakespearean references"],
    },
  },
];

async function seedSoulGallery() {
  console.log("🌱 Seeding soul_gallery with preset souls...\n");

  // Seed from SOUL_PRESETS
  for (const preset of SOUL_PRESETS) {
    const constraintId = PRESET_TO_CONSTRAINT_ID[preset.id];
    const { data: existing } = await supabase
      .from("soul_gallery")
      .select("id")
      .eq("id", preset.id)
      .single();

    if (existing) {
      console.log(`  ⏭️  ${preset.name} already exists, skipping`);
      continue;
    }

    const { data: soul, error } = await supabase
      .from("soul_gallery")
      .insert({
        id: preset.id,
        name: preset.name,
        name_native: preset.name_native,
        persona_text: preset.persona,
        description: preset.biography,
        language: preset.language,
        category: preset.category,
        avatar_url: preset.avatar,
        color: preset.color,
        origin_type: "preset",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to insert ${preset.name}: ${error.message}`);
      continue;
    }
    console.log(`  ✅ Seeded: ${preset.name_native} [${preset.category}]`);
  }

  // Seed guest souls
  for (const soul of GUEST_SOULS) {
    const { data: existing } = await supabase
      .from("soul_gallery")
      .select("id")
      .eq("id", soul.id)
      .single();

    if (existing) {
      console.log(`  ⏭️  ${soul.name} already exists, skipping`);
      continue;
    }

    const { error } = await supabase
      .from("soul_gallery")
      .insert({
        id: soul.id,
        name: soul.name,
        name_native: soul.name_native,
        persona_text: soul.persona,
        description: soul.biography,
        language: soul.language,
        category: soul.category,
        avatar_url: soul.avatar,
        color: soul.color,
        origin_type: "preset",
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`  ❌ Failed to insert ${soul.name}: ${error.message}`);
      continue;
    }
    console.log(`  ✅ Seeded: ${soul.name_native} [${soul.category}]`);
  }

  console.log("\n🎉 Soul gallery seeding complete!");
}

seedSoulGallery().catch(console.error);
