import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { upsertSubscription, logSubscriptionEvent, Tier } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const runtime = 'edge';

/**
 * POST /api/subscription/webhook
 * Handles Stripe events: subscription created, updated, cancelled, payment succeeded/failed.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier as Tier;
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (userId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : undefined;
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : undefined;

          await upsertSubscription(userId, {
            tier: tier || 'creator',
            status: sub.status === 'active' ? 'active' : 'incomplete',
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id,
            amount_cents: sub.plan?.amount ?? 0,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            metadata: { checkout_session_id: session.id },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id || (await getUserIdFromCustomer(sub.customer as string));
        if (!userId) break;

        // Determine tier from price_id
        const tier = getTierFromPriceId(sub.items?.data[0]?.price?.id);

        await upsertSubscription(userId, {
          tier,
          status: sub.status === 'active' ? 'active' : 'past_due',
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id,
          amount_cents: sub.items?.data[0]?.plan?.amount ?? 0,
          current_period_start: sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : undefined,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : undefined,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id || (await getUserIdFromCustomer(sub.customer as string));
        if (!userId) break;

        await upsertSubscription(userId, {
          tier: 'free',
          status: 'cancelled',
          stripe_subscription_id: sub.id,
          canceled_at: new Date().toISOString(),
        });
        await logSubscriptionEvent(userId, 'subscription_cancelled');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = invoice.metadata?.user_id || (await getUserIdFromCustomer(invoice.customer as string));
        if (userId) {
          await logSubscriptionEvent(userId, 'payment_succeeded', {
            metadata: { invoice_id: invoice.id, amount: invoice.total },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = invoice.metadata?.user_id || (await getUserIdFromCustomer(invoice.customer as string));
        if (userId) {
          await logSubscriptionEvent(userId, 'payment_failed', {
            metadata: { invoice_id: invoice.id },
          });
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- Helpers ---

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_subscriptions?stripe_customer_id=eq.${customerId}`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).then(r => r.json());

  return data?.[0]?.user_id || null;
}

function getTierFromPriceId(priceId?: string): Tier {
  if (!priceId) return 'free';
  // Map Stripe price IDs to tiers
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return 'creator';
  if (priceId === process.env.STRIPE_PRICE_EXPLORER) return 'explorer';
  return 'creator'; // default
}
