
/**
 * Dynamic Soul Constraint Loader
 * 
 * Loads soul constraints from multiple sources:
 * 1. KNOWN_CONSTRAINTS_MAP (hardcoded fallback)
 * 2. town_souls.persona (database fallback)
 * 3. soul_constraints table (when available)
 * 
 * This is the centralized entry point for all soul constraint loading.
 */

import { 
  SoulConstraints,
  SU_SHI_CONSTRAINTS, 
  CONFUCIUS_CONSTRAINTS, 
  LI_BAI_CONSTRAINTS, 
  MARIE_CURIE_CONSTRAINTS, 
  LEONARDO_CONSTRAINTS,
  MA_JUNJIE_CONSTRAINTS, 
  buildConstraintPromptLang 
} from '@/lib/soul-constraints';

// Hardcoded constraints for known souls (fallback)
export const KNOWN_CONSTRAINTS_MAP: Record<string, SoulConstraints> = {
  'd557cffa-6d90-436a-9918-eb28c797e5a1': SU_SHI_CONSTRAINTS,
  '2b3a70a0-239e-4dfc-8c08-502aca779a72': CONFUCIUS_CONSTRAINTS,
  'c011bd3a-f6d1-4c26-b378-1c41fb421878': LI_BAI_CONSTRAINTS,
  'bdd4caa4-ca32-4c14-8186-fbea5584a429': MARIE_CURIE_CONSTRAINTS,
  'd3d7f08f-6b5a-44f9-9733-5055b48743df': LEONARDO_CONSTRAINTS,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': MA_JUNJIE_CONSTRAINTS,
};

/**
 * Load soul constraints from any available source.
 * Returns constraints object or null if not found.
 */
export async function loadSoulConstraints(
  soulId: string,
  supabase: any  // Supabase client
): Promise<any | null> {
  // 1. Check hardcoded map
  if (KNOWN_CONSTRAINTS_MAP[soulId]) {
    return KNOWN_CONSTRAINTS_MAP[soulId];
  }

  // 2. Try soul_constraints table (will fail gracefully if table doesn't exist)
  try {
    const { data } = await supabase
      .from('soul_constraints')
      .select('*')
      .eq('soul_id', soulId)
      .single();
    
    if (data) {
      return mapConstraintRow(data);
    }
  } catch {
    // Table doesn't exist yet, continue to persona fallback
  }

  // 3. Fallback: try to extract constraints from town_souls.persona
  try {
    const { data: soul } = await supabase
      .from('town_souls')
      .select('persona, language, name, name_native, category')
      .eq('id', soulId)
      .single();
    
    if (soul?.persona) {
      return parsePersonaToConstraints(soul);
    }
  } catch {
    // No persona available
  }

  return null;
}

/**
 * Map a soul_constraints database row to SoulConstraints interface.
 */
function mapConstraintRow(row: any): any {
  return {
    soul_id: row.soul_id,
    soul_name: row.soul_name,
    era_name: row.era_name,
    era_start: row.era_start,
    era_end: row.era_end,
    profession: row.profession,
    education: row.education,
    knowledge_floor: row.knowledge_floor || [],
    knowledge_ceiling: row.knowledge_ceiling || [],
    knowledge_gaps: row.knowledge_gaps || [],
    skills: row.skills || {},
    non_skills: row.non_skills || [],
    personality_traits: row.personality_traits || [],
    communication_style: row.communication_style || [],
    language_style: row.language_style || [],
    avoided_language: row.avoided_language || [],
    beliefs: row.beliefs || [],
    life_events: row.life_events || [],
    places_visited: row.places_visited || [],
    relationships: row.relationships || {},
    language: row.language || 'en',
  };
}

/**
 * Parse a persona text field into basic constraints.
 * This is a fallback when the soul_constraints table doesn't exist.
 */
function parsePersonaToConstraints(soul: any): any {
  // Extract basic info from the persona text
  const language = soul.language || 'en';
  
  // Return a minimal constraints object based on what we know
  return {
    soul_id: '',
    soul_name: soul.name_native || soul.name || 'Unknown',
    era_name: 'Unknown',
    era_start: 0,
    era_end: 2024,
    profession: '',
    education: '',
    knowledge_floor: [],
    knowledge_ceiling: [],
    knowledge_gaps: [],
    skills: {},
    non_skills: [],
    personality_traits: [],
    communication_style: [],
    language_style: language === 'zh' ? ['中文'] : [language],
    avoided_language: [],
    beliefs: [],
    life_events: [],
    places_visited: [],
    relationships: {},
  };
}

/**
 * Build a constraint prompt for a soul, using the best available constraints.
 * The prompt will be in the soul's native language.
 */
export async function buildSoulConstraintPrompt(
  soulId: string,
  supabase: any
): Promise<string> {
  const constraints = await loadSoulConstraints(soulId, supabase);
  if (!constraints) {
    return '';
  }
  
  const language = constraints.language || 'en';
  return buildConstraintPromptLang(constraints, language);
}
