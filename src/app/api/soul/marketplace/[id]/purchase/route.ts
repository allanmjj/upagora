import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/soul/marketplace/[id]/purchase
 * Purchase a soul listing
 */
export async function POST(
  req: NextRequest,
  { params }: any
) {
  const { id } = await params;
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authRes.error || !authRes.data.user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = authRes.data.user.id

    // Check if already purchased
    const { data: existing } = await supabase
      .from('soul_purchases')
      .select('id')
      .eq('buyer_id', userId)
      .eq('listing_id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Already purchased', already_owned: true })
    }

    // Get listing
    const { data: listing, error: listingError } = await supabase
      .from('soul_listings')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check user credits
    const { data: user } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    if (!user || (user.credits || 0) < listing.price_credits) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    // Deduct credits and create purchase in transaction
    const { error: deductError } = await supabase.rpc('purchase_soul_listing', {
      p_buyer_id: userId,
      p_listing_id: id,
      p_price: listing.price_credits,
      p_seller_id: listing.author_id,
    })

    if (deductError) {
      // Fallback: manual transaction
      const { error: creditError } = await supabase
        .from('users')
        .update({ credits: (user.credits || 0) - listing.price_credits })
        .eq('id', userId)

      if (creditError) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
      }

      const { error: purchaseError } = await supabase
        .from('soul_purchases')
        .insert({
          buyer_id: userId,
          listing_id: id,
          price_paid: listing.price_credits,
        })

      if (purchaseError) {
        // Refund
        await supabase
          .from('users')
          .update({ credits: user.credits || 0 })
          .eq('id', userId)
        return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
      }

      // Increment downloads
      await supabase
        .from('soul_listings')
        .update({ downloads: (listing.downloads || 0) + 1 })
        .eq('id', id)

      // Give reputation to seller
      if (listing.price_credits > 0) {
        try {
          await supabase.rpc('increment_reputation', {
            p_user_id: listing.author_id,
            p_amount: 1,
          })
        } catch (_) {}
      }
    }

    return NextResponse.json({
      message: `Successfully acquired "${listing.soul_name}"`,
      listing_id: id,
      price_paid: listing.price_credits,
    })
  } catch (err) {
    logger.error('Purchase error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
