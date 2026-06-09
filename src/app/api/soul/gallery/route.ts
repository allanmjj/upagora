import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { SOUL_PRESETS } from '@/lib/soul-presets';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/gallery
 * Returns merged soul gallery: presets + database souls
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';

    // 1. Fetch from town_souls (database souls)
    let query = supabase
      .from('town_souls')
      .select('id, name, name_native, persona, avatar, language, category, status, created_at')
      .neq('status', 'inactive')
      .order('created_at', { ascending: false });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: souls, error } = await query.limit(50);

    if (error) {
      logger.error('[gallery] DB error:', error);
    }

    // 2. Build gallery items from database
    const dbItems = (souls || []).map((soul: any) => ({
      id: soul.id,
      name: soul.name || 'Unknown Soul',
      name_native: soul.name_native || soul.name,
      avatar: soul.avatar || '',
      language: soul.language || 'en',
      category: soul.category || 'general',
      persona_preview: soul.persona ? soul.persona.slice(0, 200) + '...' : null,
      created_at: soul.created_at,
      is_preset: false,
    }));

    // 3. Build gallery items from presets
    const presetItems = SOUL_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      name_native: p.name_native,
      avatar: p.avatar || '',
      language: p.language || 'en',
      category: p.category || 'general',
      persona_preview: p.persona ? p.persona.slice(0, 200) + '...' : p.biography?.slice(0, 200) || null,
      created_at: new Date().toISOString(),
      is_preset: true,
      era: p.era,
      profession: p.profession,
      personality: p.personality,
      theme_color: p.color,
      avatar_emoji: p.avatar,
    }));

    // 4. Merge: presets first, then DB souls, deduplicate by id
    const idSet = new Set<string>();
    const merged: typeof presetItems = [];

    // Category filter for presets
    const filteredPresets = category === 'all'
      ? presetItems
      : presetItems.filter((p) => p.category === category);

    for (const item of filteredPresets) {
      if (!idSet.has(item.id)) {
        idSet.add(item.id);
        merged.push(item);
      }
    }
    for (const item of dbItems) {
      if (!idSet.has(item.id)) {
        idSet.add(item.id);
        merged.push(item);
      }
    }

    // 5. Get available categories (merge preset + DB categories)
    const presetCategories = new Set(SOUL_PRESETS.map((p) => p.category).filter(Boolean));
    const dbCategories = new Set(
      (souls || [])
        .map((s: any) => s.category)
        .filter(Boolean)
    );
    const allCategories = [...new Set([...presetCategories, ...dbCategories])];

    return NextResponse.json({
      souls: merged,
      categories: allCategories,
      total: merged.length,
    });
  } catch (err) {
    logger.error('[gallery] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/soul/gallery
 * Add a soul to the gallery (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { soul_id, category, featured, description, tags } = body;

    if (!soul_id) {
      return NextResponse.json({ error: 'soul_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('soul_gallery')
      .insert({
        soul_id,
        category: category || 'featured',
        featured: featured || false,
        description,
        tags: tags || [],
        title: '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[gallery] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
