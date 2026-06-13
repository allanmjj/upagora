import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================
// Tier definitions
// ============================================================
export const TIERS = {
  free: {
    name: 'Free',
    soul_limit: 3,
    amount_cents: 0,
    features: ['3 souls max', 'Basic distillation', 'Chat with your souls'],
    stripe_price_id: undefined,
  },
  creator: {
    name: 'Creator',
    soul_limit: 10,
    amount_cents: 499, // $4.99/mo
    features: [
      '10 souls max',
      'Full 7D distillation',
      'Soul-to-soul dialogue',
      'Priority API access',
      'Share cards & invites',
    ],
    stripe_price_id: process.env.STRIPE_PRICE_CREATOR,
  },
  explorer: {
    name: 'Explorer',
    soul_limit: -1, // unlimited
    amount_cents: 999, // $9.99/mo
    features: [
      'Unlimited souls',
      'Everything in Creator',
      'Custom soul constraints',
      'Full API access',
      'Analytics dashboard',
      'Early access features',
    ],
    stripe_price_id: process.env.STRIPE_PRICE_EXPLORER,
  },
} as const;

export type Tier = keyof typeof TIERS;

// ============================================================
// Core helpers
// ============================================================

/**
 * Get user's current tier (defaults to 'free' if no subscription exists).
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  if (!data || !data.tier) return 'free';
  return (data.tier as Tier) || 'free';
}

/**
 * Get soul creation limit for user. -1 means unlimited.
 */
export async function getSoulLimit(userId: string): Promise<number> {
  const tier = await getUserTier(userId);
  return TIERS[tier].soul_limit;
}

/**
 * Count user's active souls (completed/registered).
 */
export async function countUserSouls(userId: string): Promise<number> {
  const { count } = await supabase
    .from('soul_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['complete', 'registered']);

  return count || 0;
}

/**
 * Check if user can create a new soul.
 * Returns { allowed: true } or { allowed: false, reason: string, tier: Tier }.
 */
export async function canCreateSoul(userId: string) {
  const tier = await getUserTier(userId);
  const limit = TIERS[tier].soul_limit;
  const currentCount = await countUserSouls(userId);

  if (limit === -1) {
    return { allowed: true, tier, currentCount, limit: -1 };
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Soul limit reached (${currentCount}/${limit}). Upgrade to ${
        tier === 'free' ? 'Creator' : 'Explorer'
      } for more souls.`,
      tier,
      currentCount,
      limit,
    };
  }

  return { allowed: true, tier, currentCount, limit };
}

/**
 * Get full subscription details for user.
 */
export async function getSubscription(userId: string) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      tier: 'free' as Tier,
      status: 'active' as const,
      current_period_end: null,
      ...TIERS.free,
    };
  }

  return {
    ...data,
    ...TIERS[data.tier as Tier],
  };
}

/**
 * Log a subscription event.
 */
export async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  opts?: { from_tier?: string; to_tier?: string; metadata?: Record<string, any> },
) {
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    from_tier: opts?.from_tier,
    to_tier: opts?.to_tier,
    metadata: opts?.metadata || {},
  });
}

/**
 * Upsert user subscription (used by Stripe webhook).
 */
export async function upsertSubscription(
  userId: string,
  data: {
    tier: Tier;
    status: string;
    stripe_subscription_id?: string;
    stripe_customer_id?: string;
    stripe_price_id?: string;
    amount_cents?: number;
    current_period_start?: string;
    current_period_end?: string;
    canceled_at?: string | null;
    trial_end?: string | null;
    metadata?: Record<string, any>;
  },
) {
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  const fromTier = (existing?.tier as Tier) || 'free';
  const toTier = data.tier;

  // Determine event type
  let eventType = 'subscription_created';
  if (existing && fromTier !== toTier) {
    const tierOrder = { free: 0, creator: 1, explorer: 2 };
    eventType =
      tierOrder[toTier] > tierOrder[fromTier]
        ? 'subscription_upgraded'
        : 'subscription_downgraded';
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (eventType !== 'subscription_created' || !existing) {
    await logSubscriptionEvent(userId, eventType, {
      from_tier: fromTier,
      to_tier: toTier,
      metadata: data.metadata || {},
    });
  }

  return { error };
}
