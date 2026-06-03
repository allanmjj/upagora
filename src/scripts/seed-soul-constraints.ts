// Seed Soul Constraints into Supabase soul_constraints table
// Run: npx tsx src/scripts/seed-soul-constraints.ts

import { createClient } from "@supabase/supabase-js";
import {
  SU_SHI_CONSTRAINTS,
  CONFUCIUS_CONSTRAINTS,
  LI_BAI_CONSTRAINTS,
  MARIE_CURIE_CONSTRAINTS,
  LEONARDO_CONSTRAINTS,
  MA_JUNJIE_CONSTRAINTS,
} from "@/lib/soul-constraints";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALL_CONSTRAINTS = [
  SU_SHI_CONSTRAINTS,
  CONFUCIUS_CONSTRAINTS,
  LI_BAI_CONSTRAINTS,
  MARIE_CURIE_CONSTRAINTS,
  LEONARDO_CONSTRAINTS,
  MA_JUNJIE_CONSTRAINTS,
];

async function seedSoulConstraints() {
  console.log("🧬 Seeding 9D soul constraints into Supabase...\n");

  for (const c of ALL_CONSTRAINTS) {
    // Check if already seeded
    const { data: existing } = await supabase
      .from("soul_constraints")
      .select("id")
      .eq("soul_id", c.soul_id)
      .single();

    if (existing) {
      console.log(`  ⏭️  ${c.soul_name} already exists, skipping`);
      continue;
    }

    const { error } = await supabase.from("soul_constraints").insert({
      soul_id: c.soul_id,
      soul_name: c.soul_name,
      era_name: c.era_name,
      era_start: c.era_start,
      era_end: c.era_end,
      profession: c.profession,
      education: c.education,
      knowledge_floor: c.knowledge_floor,
      knowledge_ceiling: c.knowledge_ceiling,
      knowledge_gaps: c.knowledge_gaps || [],
      skills: c.skills,
      non_skills: c.non_skills || [],
      personality_traits: c.personality_traits || [],
      communication_style: c.communication_style || [],
      language_style: c.language_style || [],
      avoided_language: c.avoided_language || [],
      beliefs: c.beliefs,
      life_events: c.life_events || [],
      places_visited: c.places_visited || [],
      relationships: c.relationships || {},
    });

    if (error) {
      console.error(`  ❌ Failed: ${c.soul_name}: ${error.message}`);
      continue;
    }
    console.log(`  ✅ Seeded: ${c.soul_name} (${c.era_name})`);
  }

  console.log("\n🎉 Soul constraints seeding complete!");
}

seedSoulConstraints().catch(console.error);
