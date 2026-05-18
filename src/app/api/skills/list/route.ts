import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: skills, error } = await supabase
      .from('agent_skills')
      .select(`
        id,
        name,
        display_name,
        description,
        is_standard,
        max_level,
        sort_order,
        category_id,
        category:agent_skill_categories (
          id,
          name,
          display_name,
          icon
        )
      `)
      .eq('is_active', true)
      .order('category_id')
      .order('sort_order')

    if (error) {
      console.error('Error fetching skills:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch skills' },
        { status: 500 }
      )
    }

    // Flatten
    const flattened = (skills || []).map(s => ({
      ...s,
      category: s.category || null,
    }))

    return NextResponse.json({
      success: true,
      data: flattened,
    })
  } catch (error) {
    console.error('Error in GET /api/skills/list:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
