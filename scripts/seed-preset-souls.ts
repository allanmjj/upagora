#!/usr/bin/env node
/**
 * seed-preset-souls.ts
 * Seeds demo souls into Supabase from soul presets.
 *
 * Run: npx tsx scripts/seed-preset-souls.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { SOUL_PRESETS } from '../src/lib/soul-presets';

// Load env from .env.local
const dotenv = await import('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function seed() {
  console.log('🌱 Seeding preset souls...\n');

  const presets = SOUL_PRESETS;
  console.log(`Found ${presets.length} soul presets to seed\n`);

  for (const preset of presets) {
    console.log(`  Seeding: ${preset.name_native} (${preset.name})`);

    // 1. Insert into town_souls
    const { data: soul, error: soulErr } = await supabase
      .from('town_souls')
      .upsert({
        id: preset.id,
        name: preset.name,
        name_native: preset.name_native,
        era: preset.era,
        category: preset.category,
        profession: preset.profession,
        description: preset.biography.slice(0, 200),
        full_biography: preset.biography,
        avatar_emoji: preset.avatar,
        theme_color: preset.color,
        personality: preset.personality,
        language: preset.language,
        is_preset: true,
        personality_summary: preset.personality,
      }, { onConflict: 'id' })
      .select();

    if (soulErr) {
      console.error(`    ❌ town_souls: ${soulErr.message}`);
      continue;
    }
    console.log(`    ✅ town_souls`);

    // 2. Insert persona into generated_persona_files
    if (preset.persona) {
      const { error: personaErr } = await supabase
        .from('generated_persona_files')
        .upsert({
          soul_id: preset.id,
          file_type: 'persona',
          content: preset.persona,
          is_preset: true,
        }, { onConflict: 'soul_id' });

      if (personaErr) {
        console.log(`    ⏭️ generated_persona_files: ${personaErr.message}`);
      } else {
        console.log(`    ✅ persona`);
      }
    }

    // 3. Insert soul_constraints
    if (preset.constraints) {
      const { error: constraintErr } = await supabase
        .from('soul_constraints')
        .upsert({
          soul_id: preset.id,
          knowledge_floor: preset.constraints.knowledge_floor,
          knowledge_ceiling: preset.constraints.knowledge_ceiling,
          beliefs: preset.constraints.beliefs,
          soul_anchor: preset.constraints.soul_anchor,
          signature_phrases: preset.constraints.signature_phrases,
          avoided_topics: preset.constraints.avoided_topics,
          communication_style: preset.constraints.communication_style,
          personality: preset.personality,
        }, { onConflict: 'soul_id' });

      if (constraintErr) {
        console.log(`    ⏭️ soul_constraints: ${constraintErr.message}`);
      } else {
        console.log(`    ✅ constraints`);
      }
    }

    console.log();
  }

  console.log('✅ Seeding complete!\n');
}

seed().catch(console.error);
