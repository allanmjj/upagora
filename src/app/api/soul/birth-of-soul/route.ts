import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import { SOUL_PRESETS } from '@/lib/soul-presets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Soul Birth API
 * 
 * POST /api/soul/birth-of-soul   - Create a new soul from extraction data
 * GET  /api/soul/birth-of-soul   - Get available soul templates/presets
 * 
 * The birth process:
 * 1. Guardian creates soul from presets or custom extraction
 * 2. Initial persona is generated/stored
 * 3. Soul enters the 'newborn' state ready for calibration
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const template = searchParams.get('template');

    if (template) {
      // Return a specific template for preview
      const preset = SOUL_PRESETS.find(p => p.id === template);
      if (!preset) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template: preset });
    }

    // Return all available presets as templates
    return NextResponse.json({ 
      presets: SOUL_PRESETS.map(p => ({
        id: p.id,
        name: p.name,
        name_native: p.name_native,
        era: p.era,
        profession: p.profession,
        category: p.category,
        language: p.language,
        avatar: p.avatar,
        color: p.color,
        personality_preview: `${p.personality.openness > 0.8 ? '开朗' : '沉稳'} · ${p.personality.agreeableness > 0.8 ? '友善' : '独立'}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      preset_id,
      custom_name,
      custom_name_native,
      custom_persona,
      custom_biography,
      guardian_id,
      guardian_name,
      extraction_data,
    } = body;

    // Validate input
    if (!preset_id && !extraction_data) {
      return NextResponse.json(
        { error: 'Either preset_id or extraction_data is required' },
        { status: 400 }
      );
    }

    let soulData: any;

    if (preset_id) {
      // Base on a preset template
      const preset = SOUL_PRESETS.find(p => p.id === preset_id);
      if (!preset) {
        return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
      }
      soulData = {
        name: custom_name || preset.name,
        name_native: custom_name_native || preset.name_native,
        persona: custom_persona || preset.persona,
        avatar: preset.avatar,
        color: preset.color,
        category: preset.category,
        language: preset.language,
        era: preset.era,
        profession: preset.profession,
        biography: custom_biography || preset.biography,
        is_preset: true,
        is_official: false,
        is_active: true,
        status: 'newborn',
        theme_color: preset.color,
        personality_summary: `${preset.personality.openness > 0.8 ? 'Curious' : 'Focused'}, ${preset.personality.agreeableness > 0.8 ? 'Warm' : 'Direct'}`,
        current_region: 'plaza',
      };
    } else if (extraction_data) {
      // Custom soul from extraction
      soulData = {
        name: extraction_data.name || 'Unnamed Soul',
        name_native: extraction_data.name_native || extraction_data.name || 'Unnamed Soul',
        persona: custom_persona || extraction_data.persona || '',
        avatar: extraction_data.avatar || '🌟',
        color: extraction_data.color || '#8b5cf6',
        category: extraction_data.category || 'custom',
        language: extraction_data.language || 'en',
        era: extraction_data.era || '',
        profession: extraction_data.profession || '',
        biography: custom_biography || extraction_data.biography || '',
        is_preset: false,
        is_official: false,
        is_active: true,
        status: 'newborn',
        theme_color: extraction_data.color || '#8b5cf6',
        personality_summary: extraction_data.personality_summary || '',
        current_region: 'plaza',
      };
    }

    // Insert into town_souls
    const { data: soul, error: soulError } = await supabase
      .from('town_souls')
      .insert(soulData)
      .select()
      .single();

    if (soulError) {
      return NextResponse.json({ error: soulError.message }, { status: 500 });
    }

    // store soul_constraints row if persona-generated constraints exist
    if (extraction_data?.constraints) {
      await supabase
        .from('soul_constraints')
        .insert({
          soul_id: soul.id,
          era: extraction_data.constraints.era || soulData.era || '',
          education: extraction_data.constraints.education || '',
          skills: extraction_data.constraints.skills || [],
          personality: extraction_data.constraints.personality || soulData.personality_summary || '',
          willpower: extraction_data.constraints.willpower || '',
          experiences: extraction_data.constraints.experiences || [],
          style: extraction_data.constraints.style || [],
          biases: extraction_data.constraints.biases || [],
          knowledge_domains: extraction_data.constraints.knowledge_domains || [],
          forbidden_topics: extraction_data.constraints.forbidden_topics || [],
          signature_phrases: extraction_data.constraints.signature_phrases || [],
          created_at: new Date().toISOString(),
        });
    }

    // Record guardian relationship if provided
    if (guardian_id) {
      await supabase
        .from('soul_guardian_relationships')
        .insert({
          soul_id: soul.id,
          guardian_id,
          guardian_name: guardian_name || '',
          role: 'creator',
          status: 'active',
          created_at: new Date().toISOString(),
        });
    }

    // Create town event for the birth
    await supabase
      .from('town_events')
      .insert({
        type: 'soul_birth',
        soul_id: soul.id,
        title: `${soul.name_native || soul.name} has arrived in Soul Town`,
        description: `A new soul has been born into the town. ${guardian_name ? `Created by guardian ${guardian_name}.` : ''}`,
        region: 'plaza',
        data: { soul_id: soul.id, guardian_id: guardian_id || null },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      soul,
      message: `Soul "${soul.name_native || soul.name}" has been born successfully.`,
    });
  } catch (error: any) {
    logger.error('[Birth API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
