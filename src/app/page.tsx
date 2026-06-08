'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatWithLegends } from '@/components/features/chat-with-legends'
import {
  ArrowRight,
  Heart,
  MessageCircle,
  Sparkles,
  User,
  Ghost,
  Clock,
} from 'lucide-react'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal')
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useInView()
  return (
    <div ref={ref} style={{ animationDelay: `${delay}ms` }} className={`reveal-stagger ${className}`}>
      {children}
    </div>
  )
}

/* ─── Live Town Activity Feed ─── */
interface TownActivity {
  soul_name: string
  soul_avatar?: string
  activity: string
  created_at: string
}

function TownActivityFeed() {
  const [activities, setActivities] = useState<TownActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch('/api/town/social-feed?limit=6')
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || data.feed || [])
        }
      } catch {
        // silently fail - show placeholder
      } finally {
        setLoading(false)
      }
    }
    fetchFeed()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-zinc-800" />
              <div className="h-3 w-full rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.length > 0 ? activities.map((item, i) => (
        <div
          key={i}
          className="reveal-stagger flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-lg">
            {item.soul_avatar || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">{item.soul_name}</span>
              <span className="text-xs text-zinc-600">
                {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-zinc-400 truncate">{item.activity}</p>
          </div>
        </div>
      )) : (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-8 text-center">
          <div className="text-3xl mb-3">🌆</div>
          <p className="text-sm text-zinc-400">Souls are gathering in the Town...</p>
          <p className="text-xs text-zinc-600 mt-1">The Town comes alive as more souls arrive</p>
        </div>
      )}
    </div>
  )
}

/* ─── Quick Distill (kept from original) ─── */
function HomeQuickSoul({ delay = 0 }: { delay?: number }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters to distill a soul')
      return
    }
    setError('')
    setLoading(true)
    try {
      const resp = await fetch('/api/soul/quick-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text, subject_name: 'Soul' }),
      })
      const result = await resp.json()
      if (result.session_slug) {
        window.location.href = '/soul-distille'
      } else {
        setError(result.error || 'Extraction failed')
      }
    } catch {
      setError('Extraction failed, please try again')
    }
    setLoading(false)
  }

  return (
    <div style={{ animationDelay: `${delay}ms` }} className="reveal-stagger mt-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        <div className="relative">
          <Sparkles className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400" />
          <input
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); setError('') }}
            placeholder="Describe someone in one sentence — their soul will appear"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 py-4 pl-12 pr-36 text-lg text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={loading || text.trim().length < 10}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Distilling...' : 'Distill ↗'}
          </button>
        </div>
        {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
        <p className="mt-2 text-center text-xs text-zinc-500">
          No account needed • One sentence is enough
        </p>
      </form>
    </div>
  )
}

/* ─── Featured Soul Card ─── */
function SoulCard({ soul, index }: { soul: { name: string; en: string; avatar: string; color: string; era: string; tag: string }; index: number }) {
  return (
    <a
      key={soul.en}
      href="/soul/gallery"
      className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br ${soul.color} p-5 transition-all duration-300 hover:border-zinc-600 hover:shadow-lg hover:scale-[1.02]`}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="text-3xl mb-2">{soul.avatar}</div>
      <h3 className="font-semibold text-zinc-100 text-sm">{soul.name}</h3>
      <p className="text-xs text-zinc-500">{soul.en} · {soul.era}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{soul.tag}</span>
        <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Chat →</span>
      </div>
    </a>
  )
}

/* ─── Main Page ─── */
export default function HomePage() {
  const featuredSouls = [
    { name: "苏轼·东坡", en: "Su Shi", avatar: "🎋", color: "from-blue-500/20 to-cyan-500/10", era: "1037-1101", tag: "Poet" },
    { name: "孔子", en: "Confucius", avatar: "📜", color: "from-amber-500/20 to-yellow-500/10", era: "551-479 BCE", tag: "Philosopher" },
    { name: "李白", en: "Li Bai", avatar: "🍷", color: "from-sky-500/20 to-blue-500/10", era: "701-762", tag: "Poet" },
    { name: "玛丽·居里", en: "Marie Curie", avatar: "⚛️", color: "from-emerald-500/20 to-teal-500/10", era: "1867-1934", tag: "Scientist" },
    { name: "达·芬奇", en: "Leonardo", avatar: "🎨", color: "from-orange-500/20 to-rose-500/10", era: "1452-1519", tag: "Artist" },
    { name: "莎士比亚", en: "Shakespeare", avatar: "✍️", color: "from-violet-500/20 to-purple-500/10", era: "1564-1616", tag: "Playwright" },
    { name: "林肯", en: "Lincoln", avatar: "🗽", color: "from-indigo-500/20 to-blue-500/10", era: "1809-1865", tag: "Leader" },
    { name: "苏格拉底", en: "Socrates", avatar: "🏛️", color: "from-teal-500/20 to-cyan-500/10", era: "470-399 BCE", tag: "Philosopher" },
  ]

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-stagger {
          opacity: 0;
          animation: fade-in 0.7s ease forwards;
        }
        .soul-orb {
          position: fixed;
          left: 50%;
          bottom: -100px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(circle, rgba(99,102,241,0.15), rgba(168,85,247,0.08), transparent 70%);
          animation: orb-pulse 6s ease-in-out infinite;
          filter: blur(40px);
        }
        @keyframes orb-pulse {
          0%, 100% { transform: translateY(60px) scale(1); opacity: 0.6; }
          50% { transform: translateY(-80px) scale(1.15); opacity: 1; }
        }
      `}</style>

      <div className="soul-orb" />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[800px] h-[800px] bg-amber-500/10 blur-[160px] rounded-full" />
        <div className="absolute right-1/3 top-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Badge variant="primary" className="mb-6">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Where Minds Come Alive
              </Badge>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                Your Soul Is Waiting
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400 md:text-xl leading-relaxed">
                A living AI soul with personality, memory, and growth.{' '}
                Chat with historical minds or create your own digital companion.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/soul/gallery">
                  <Button size="lg" className="gap-2 h-12 px-8 text-base bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
                    <MessageCircle className="h-4 w-4" />
                    Chat with a Soul Now
                  </Button>
                </Link>
                <Link href="/distill">
                  <Button variant="outline" size="lg" className="gap-2 h-12 px-6">
                    <Sparkles className="h-4 w-4" />
                    Create Your Soul
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ LIVE TOWN FEED ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center mb-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-mono text-green-400">LIVE</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-50 md:text-3xl">Soul Town Is Alive</h2>
              <p className="mt-2 text-zinc-400">Souls are living, thinking, and connecting right now</p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto max-w-2xl">
              <TownActivityFeed />
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-6 text-center">
              <Link href="/town">
                <Button variant="outline" size="lg" className="gap-2 h-11 px-6">
                  Enter Soul Town
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CHAT WITH LEGENDS ═══ */}
      <section className="border-t border-zinc-800">
        <ChatWithLegends />
      </section>

      {/* ═══ FEATURED SOULS ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Featured</Badge>
              <h2 className="text-2xl font-bold text-zinc-50 md:text-3xl">Meet the Souls</h2>
              <p className="mt-2 text-zinc-400">Historical minds, reborn as conversational agents</p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredSouls.map((soul, i) => (
                <SoulCard key={soul.en} soul={soul} index={i} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 text-center">
              <Link href="/soul/gallery">
                <Button variant="outline" size="lg" className="gap-2 h-11 px-6">
                  <Ghost className="h-4 w-4" />
                  Browse All Souls
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ QUICK DISTILL ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Quick Start</Badge>
              <h2 className="text-2xl font-bold text-zinc-50 md:text-3xl">Create in One Sentence</h2>
              <p className="mt-2 text-zinc-400">Describe someone — their soul appears</p>
            </div>
          </Reveal>

          <HomeQuickSoul delay={200} />
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <Reveal>
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-indigo-500/10 p-12 md:p-16 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_60%)]" />
              <div className="relative">
                <h2 className="text-2xl font-bold text-zinc-50 md:text-4xl">
                  Ready to Create Your Soul?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-zinc-400">
                  Start in minutes. No credit card, no coding required.
                  Just describe who you want to meet.
                </p>
                <div className="mt-8">
                  <Link href="/distill">
                    <Button size="lg" className="gap-2 h-12 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
                      Create Your First Soul <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
