import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * GET /api/soul/marketplace/[id]/reviews
 * Get reviews for a soul listing
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data: reviews, error } = await supabase
      .from('soul_listing_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:users!reviewer_id(name, avatar_url)
      `)
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Reviews GET error:', error)
      return NextResponse.json({ reviews: [] })
    }

    const formatted = (reviews || []).map((r: any) => ({
      id: r.id,
      user_name: r.reviewer?.name || 'Anonymous',
      user_avatar: r.reviewer?.avatar_url,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }))

    return NextResponse.json({ reviews: formatted })
  } catch (err) {
    console.error('Reviews error:', err)
    return NextResponse.json({ reviews: [] })
  }
}
