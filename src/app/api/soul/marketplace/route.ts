import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * GET /api/soul/marketplace
 * List soul listings with search, category filter, and sorting
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || 'all'
    const sort = searchParams.get('sort') || 'featured'

    // Try to fetch from soul_listings table
    const authHeader = req.headers.get('authorization')
    let purchasedIds: string[] = []

    if (authHeader) {
      const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (authRes.data.user) {
        const { data: purchases } = await supabase
          .from('soul_purchases')
          .select('listing_id')
          .eq('buyer_id', authRes.data.user.id)
        if (purchases) {
          purchasedIds = purchases.map((p: { listing_id: string }) => p.listing_id)
        }
      }
    }

    // Build query
    const cacheKey = `soul_market:${q}:${category}:${sort}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    let query = supabase
      .from('soul_listings')
      .select('*')
      .eq('status', 'active')

    if (q) {
      query = query.or(`title.ilike.%${q}%,soul_name.ilike.%${q}%,description.ilike.%${q}%`)
    }
    if (category !== 'all') {
      query = query.eq('category', category)
    }

    // Sort
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
        query = query.order('downloads', { ascending: false })
        break
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'price_asc':
        query = query.order('price_credits', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price_credits', { ascending: false })
        break
      case 'featured':
      default:
        query = query.order('is_featured', { ascending: false }).order('rating', { ascending: false })
        break
    }

    const { data: listings, error } = await query.limit(50)

    if (error) {
      logger.error('Marketplace GET error:', error)
      // Return empty - client will use demo data
      return NextResponse.json({ listings: [], purchased_ids: purchasedIds })
    }

    const result = {
      listings: listings || [],
      purchased_ids: purchasedIds,
    }
    cache.set(cacheKey, result, 120);
    return NextResponse.json(result)
  } catch (err) {
    logger.error('Marketplace error:', err)
    return NextResponse.json({ listings: [], purchased_ids: [] })
  }
}
