import { NextRequest, NextResponse } from 'next/server';
import { SOUL_PRESETS } from '@/lib/soul-presets';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/soul/gallery
 * Returns curated soul gallery entries
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';

    // Fetch from town_souls (primary soul source)
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch persona files for richer data
    const galleryItems = (souls || []).map((soul: any) => ({
      id: soul.id,
      name: soul.name || 'Unknown Soul',
      name_native: soul.name_native || soul.name,
      avatar: soul.avatar || '',
      language: soul.language || 'en',
      category: soul.category || 'general',
      persona_preview: soul.persona ? soul.persona.slice(0, 200) + '...' : null,
      created_at: soul.created_at,
    }));

    // Get available categories
    const { data: categories } = await supabase
      .from('town_souls')
      .select('category')
      .neq('status', 'inactive')
      .not('category', 'is', null);

    const uniqueCategories = [...new Set((categories || []).map((c: any) => c.category).filter(Boolean))];

    // Fallback to preset souls if DB is empty
    let finalSouls = galleryItems;
    let finalCategories = uniqueCategories;
    if (galleryItems.length === 0) {
      finalSouls = SOUL_PRESETS.map((p) => ({
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
      }));
      finalCategories = [...new Set(SOUL_PRESETS.map((p) => p.category).filter(Boolean))];
    }

    return NextResponse.json({
      souls: finalSouls,
      categories: finalCategories,
      total: finalSouls.length,
    });
  } catch (err) {
    console.error('[gallery] Error:', err);
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

    // Check if soul_gallery table exists (from migration)
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
    console.error('[gallery] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
