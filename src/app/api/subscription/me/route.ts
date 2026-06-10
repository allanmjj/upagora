import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, canCreateSoul, TIERS } from '@/lib/subscription';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const runtime = 'edge';

/**
 * GET /api/subscription/me
 * Returns user's current subscription status, tier, and soul usage.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    const soulCheck = await canCreateSoul(user.id);
    const tier = subscription.tier as keyof typeof TIERS;

    return NextResponse.json({
      tier,
      status: subscription.status,
      name: TIERS[tier]?.name || 'Free',
      soul_limit: soulCheck.limit,
      souls_used: soulCheck.currentCount,
      can_create_soul: soulCheck.allowed,
      amount_cents: subscription.amount_cents,
      current_period_end: subscription.current_period_end,
      features: TIERS[tier]?.features || TIERS.free.features,
    });
  } catch (err: any) {
    console.error('subscription/me error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
