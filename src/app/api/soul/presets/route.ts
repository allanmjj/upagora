import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/soul/presets - List all available soul presets
 * Returns the full preset catalog for the Soul Gallery quick-start.
 */
export async function GET(_req: NextRequest) {
  try {
    const { SOUL_PRESETS } = await import("@/lib/soul-presets");
    return NextResponse.json({ presets: SOUL_PRESETS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/soul/presets/[id] - Initialize a soul from a preset.
 * Body: { preset_id: string, name?: string, name_native?: string }
 * The preset is loaded, a new soul record is created in soul_gallery,
 * and associated state is initialized.
 */
export async function POST(req: NextRequest) {
  try {
    const { preset_id, name, name_native } = await req.json();

    if (!preset_id) {
      return NextResponse.json({ error: "preset_id is required" }, { status: 400 });
    }

    const { SOUL_PRESETS } = await import("@/lib/soul-presets");
    const preset = SOUL_PRESETS.find((p) => p.id === preset_id);

    if (!preset) {
      return NextResponse.json({ error: `Preset "${preset_id}" not found` }, { status: 404 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const soulId = `${preset_id}-${Date.now()}`;

    // Insert into soul_gallery
    const { data: soul, error: soulError } = await supabase
      .from("soul_gallery")
      .insert({
        id: soulId,
        name: name || preset.name,
        name_native: name_native || preset.name_native,
        persona_text: preset.persona,
        constraints: preset.constraints,
        personality_dims: preset.personality,
        language: preset.language,
        category: preset.category,
        avatar: preset.avatar,
        color: preset.color,
        security: "public",
        is_official: true,
      })
      .select()
      .single();

    if (soulError) {
      return NextResponse.json({ error: soulError.message }, { status: 500 });
    }

    // Initialize soul state
    await supabase.from("soul_states").insert({
      soul_id: soulId,
      mood: "calm",
      energy: 100,
      social_need: 50,
      current_region: "plaza",
      today_events_count: 0,
    });

    return NextResponse.json({ soul });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
