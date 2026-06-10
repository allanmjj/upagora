'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { TIERS, Tier } from '@/lib/subscription';
import {
  Check, Crown, Zap, Rocket, ArrowRight, Loader2, Sparkles,
} from 'lucide-react';

interface CurrentSub {
  tier: Tier;
  status: string;
  current_period_end: string | null;
  souls_used: number;
  soul_limit: number | null;
}

export default function PricingPage() {
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState<CurrentSub | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      fetch('/api/subscription/me')
        .then(r => r.json())
        .then(setCurrent)
        .catch(() => {});
    }
  }, [session]);

  const handleSubscribe = async (tier: Tier) => {
    if (!session) {
      router.push('/login?redirect=/pricing');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Checkout failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentTier = (tier: Tier) => current?.tier === tier;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto pt-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          Choose your journey
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent mb-4">
          Unlock Your Soul Potential
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Start free with 3 souls. Upgrade anytime for deeper distillation, unlimited creations, and early access.
        </p>
        {current && (
          <p className="mt-3 text-sm text-zinc-500">
            Current tier: <span className="text-violet-400 capitalize">{current.tier}</span>
            {current.soul_limit !== null && ` (${current.souls_used}/${current.soul_limit} souls used)`}
          </p>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        {(['free', 'creator', 'explorer'] as Tier[]).map((tier) => {
          const config = TIERS[tier];
          const isPaid = tier !== 'free';
          const isActive = isCurrentTier(tier);

          return (
            <div
              key={tier}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                isActive
                  ? 'border-violet-500/50 bg-violet-500/5 shadow-lg shadow-violet-500/10'
                  : tier === 'creator'
                  ? 'border-violet-500/30 bg-zinc-900/50 shadow-lg shadow-violet-500/5'
                  : 'border-zinc-800 bg-zinc-900/30'
              }`}
            >
              {tier === 'creator' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs font-medium text-white">
                  Most Popular
                </div>
              )}

              {/* Icon + Name */}
              <div className="mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  tier === 'free' ? 'bg-zinc-800' :
                  tier === 'creator' ? 'bg-violet-500/20 text-violet-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {tier === 'free' ? <Zap className="w-5 h-5" /> :
                   tier === 'creator' ? <Crown className="w-5 h-5" /> :
                   <Rocket className="w-5 h-5" />}
                </div>
                <h3 className="text-xl font-semibold">{config.name}</h3>
                <div className="mt-1">
                  {isPaid ? (
                    <span className="text-3xl font-bold">${(config.amount_cents / 100).toFixed(2)}<span className="text-sm text-zinc-500 font-normal">/mo</span></span>
                  ) : (
                    <span className="text-3xl font-bold">Free</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {config.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <div className="w-full py-2.5 rounded-xl bg-violet-500/10 text-violet-300 text-sm font-medium text-center border border-violet-500/20">
                  Current Plan
                </div>
              ) : isPaid ? (
                <button
                  onClick={() => void handleSubscribe(tier)}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && tier === (current?.tier === 'free' ? 'creator' : tier) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    tier === 'free' ? 'Upgrade to' : 'Switch to'
                  )}
                  {tier === 'creator' ? 'Creator' : 'Explorer'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link href="/dashboard" className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium text-center block transition-all">
                  Get Started
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <FaqItem q="Can I change my tier later?" a="Yes, you can upgrade or downgrade at any time. Changes take effect at the next billing cycle." />
          <FaqItem q="What happens to my souls if I cancel?" a="Your distilled souls are always yours. If you downgrade to Free, souls beyond the limit are archived, not deleted." />
          <FaqItem q="How does distillation work?" a="Distillation captures your cognitive patterns, values, expression style, knowledge structure, emotional response, relationships, and life narrative across 7 dimensions." />
          <FaqItem q="Can I use UpAgora commercially?" a="Creator and Explorer plans include commercial usage rights for your distilled souls." />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left text-sm font-medium"
      >
        <span>{q}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-4 pb-4 text-sm text-zinc-400">{a}</p>}
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
