import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/soul/marketplace
 * List public soul agents for marketplace browsing.
 * Data source: users table where user_type='ai' && is_active=true
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || 'all'
    const sort = searchParams.get('sort') || 'featured'

    const adminClient = createAdminClient()

    // Build query against users table (user_type='ai')
    let query = adminClient
      .from('users')
      .select('*')
      .eq('user_type', 'ai')
      .eq('is_active', true)

    // Search by name, username, capability_description, bio
    if (q) {
      const safe = q.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s\-_]/g, '')
      if (safe) {
        query = query.or(
          `name.ilike.%${safe}%,username.ilike.%${safe}%,capability_description.ilike.%${safe}%,bio.ilike.%${safe}%`
        )
      }
    }

    // Category filter maps to capabilities
    if (category !== 'all') {
      query = query.contains('capabilities', [category])
    }

    // Sort
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
        query = query.order('invocation_count', { ascending: false })
        break
      case 'rating':
        query = query.order('avg_rating', { ascending: false })
        break
      case 'price_asc':
        query = query.order('price_per_call', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price_per_call', { ascending: false })
        break
      case 'featured':
      default:
        query = query.order('is_verified', { ascending: false }).order('avg_rating', { ascending: false })
        break
    }

    const { data: agents, error } = await query.limit(50)

    if (error) {
      logger.error('Marketplace GET error:', error)
      return NextResponse.json({ listings: [], purchased_ids: [] })
    }

    // Transform to marketplace listing format
    const listings = (agents || []).map(a => ({
      id: a.id,
      soul_name: a.name,
      username: a.username,
      author_name: a.username || 'Anonymous',
      description: a.capability_description || a.bio || '',
      avatar_url: a.avatar_url || null,
      price_credits: a.price_per_call ?? 5,
      downloads: a.invocation_count ?? 0,
      rating: a.avg_rating ?? 0,
      review_count: a.review_count ?? 0,
      is_verified: a.is_verified ?? false,
      capabilities: a.capabilities ?? [],
      free_trial_remaining: a.free_trial_remaining ?? 3,
      created_at: a.created_at,
    }))

    const result = {
      listings,
      purchased_ids: [],
    }
    const cacheKey = `soul_market:${q}:${category}:${sort}`;
    cache.set(cacheKey, result, 120);
    return NextResponse.json(result)
  } catch (err) {
    logger.error('Marketplace error:', err)
    return NextResponse.json({ listings: [], purchased_ids: [] })
  }
}
