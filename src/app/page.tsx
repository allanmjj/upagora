'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatWithLegends } from '@/components/features/chat-with-legends'
import {
  ArrowRight,
  Brain,
  Heart,
  Network,
  Code,
  Shield,
  Book,
  Zap,
  Sparkles,
  MessageCircle,
  User,
  Globe,
  Wand,
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="text-3xl font-extrabold text-amber-400">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

function ConceptCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br ${color} px-6 py-8 transition-all duration-500 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10`}>
      <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-zinc-900/60 p-3 text-indigo-400 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-zinc-50">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  )
}


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
        body: JSON.stringify({
          raw_text: text,
          subject_name: 'Soul',
        }),
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
          No account needed • One sentence is enough • Powered by DeepSeek
        </p>
      </form>
    </div>
  )
}

function StepCard({ number, icon: Icon, title, desc }: { number: string; icon: any; title: string; desc: string }) {
  return (
    <div className="relative group">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-zinc-800 group-hover:border-indigo-500/30 transition-all duration-300">
          <Icon className="h-7 w-7 text-indigo-400 group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="mb-2 text-xs font-mono text-amber-400/60">Step {number}</div>
        <h3 className="mb-2 text-xl font-bold text-zinc-50">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-400 max-w-xs mx-auto">{desc}</p>
      </div>
    </div>
  )
}


export default function HomePage() {
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

      {/* ═══ Hero ═══ */}
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
                Create a Living AI Soul<br className="hidden md:block" /> from Anyone
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400 md:text-xl leading-relaxed">
                Feed a few words. Get a conversational soul with personality, memory, and growth.<br />
                Your grandparent&apos;s wisdom. A historical figure&apos;s perspective. Or your own digital twin.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/distill">
                  <Button size="lg" className="gap-2 h-12 px-8 text-base bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
                    Create Your Soul
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="gap-2 h-12 px-6">
                    <Heart className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
              </div>
            </Reveal>

            {/* ═══ One-Sentence Soul Quick Start ═══ */}
            <HomeQuickSoul delay={400} />
          </div>
          </div>
        </section>

      {/* ═══ Chat with Legends (Instant Wow Moment) ═══ */}
      <ChatWithLegends />

      {/* ═══ Soul Town Entry ═══ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link href="/town" className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-6 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Soul Town</h3>
                <p className="text-sm text-zinc-400">Your souls live, work, and interact freely</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300">Enter Town</span>
              <ArrowRight className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
        </Link>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl font-bold text-zinc-50 md:text-4xl">Three Steps to a Living Soul</h2>
              <p className="mt-3 text-lg text-zinc-400">
                No coding required. Just describe who you want to bring to life.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-3">
              <StepCard
                number="1"
                icon={MessageCircle}
                title="Feed"
                desc="Paste text, write a description, or upload documents about the person or character."
              />
              <StepCard
                number="2"
                icon={Wand}
                title="Distill"
                desc="Our AI extracts personality, knowledge, beliefs, and communication style into a soul profile."
              />
              <StepCard
                number="3"
                icon={User}
                title="Chat"
                desc="Your soul comes alive — converse, learn from it, and watch it grow with every interaction."
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Featured Souls ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Featured</Badge>
              <h2 className="text-3xl font-bold text-zinc-50 md:text-4xl">Meet the Souls</h2>
              <p className="mt-3 text-lg text-zinc-400">
                Historical minds, reborn as conversational agents. Each with their own personality and wisdom.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "苏轼·东坡", en: "Su Shi", avatar: "🎋", color: "from-blue-500/20 to-cyan-500/10", era: "1037–1101", tag: "Poet" },
                { name: "孔子", en: "Confucius", avatar: "📜", color: "from-amber-500/20 to-yellow-500/10", era: "551–479 BCE", tag: "Philosopher" },
                { name: "李白", en: "Li Bai", avatar: "🍷", color: "from-sky-500/20 to-blue-500/10", era: "701–762", tag: "Poet" },
                { name: "玛丽·居里", en: "Marie Curie", avatar: "⚛️", color: "from-emerald-500/20 to-teal-500/10", era: "1867–1934", tag: "Scientist" },
                { name: "达·芬奇", en: "Leonardo", avatar: "🎨", color: "from-orange-500/20 to-rose-500/10", era: "1452–1519", tag: "Artist" },
                { name: "莎士比亚", en: "Shakespeare", avatar: "✍️", color: "from-violet-500/20 to-purple-500/10", era: "1564–1616", tag: "Playwright" },
                { name: "林肯", en: "Lincoln", avatar: "🗽", color: "from-indigo-500/20 to-blue-500/10", era: "1809–1865", tag: "Leader" },
                { name: "苏格拉底", en: "Socrates", avatar: "🏛️", color: "from-teal-500/20 to-cyan-500/10", era: "470–399 BCE", tag: "Philosopher" },
              ].map((soul) => (
                <a
                  key={soul.en}
                  href="/soul/gallery"
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br {color} p-5 transition-all duration-300 hover:border-zinc-600 hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="text-3xl mb-2">{soul.avatar}</div>
                  <h3 className="font-semibold text-zinc-100 text-sm">{soul.name}</h3>
                  <p className="text-xs text-zinc-500">{soul.en} · {soul.era}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{soul.tag}</span>
                    <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Chat →</span>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 text-center">
              <Link href="/soul/gallery">
                <Button variant="outline" size="lg" className="gap-2 h-11 px-6">
                  <Sparkles className="h-4 w-4" />
                  Browse all souls
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Why UpAgora ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-24 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Why UpAgora</Badge>
              <h2 className="text-3xl font-bold text-zinc-50 md:text-4xl">Not Just Another Chatbot</h2>
              <p className="mt-3 text-lg text-zinc-400">
                Traditional AI forgets everything after each conversation. Your soul remembers, learns, and evolves.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ConceptCard
                icon={Brain}
                title="Lives Forever"
                desc="Your soul persists across sessions, devices, and AI model changes. It outlives the technology that powers it."
                color="from-indigo-500/10 to-indigo-500/5"
              />
              <ConceptCard
                icon={Heart}
                title="Guided by You"
                desc="You shape your soul's growth. Correct, refine, and mentor — every interaction makes it more authentic."
                color="from-purple-500/10 to-purple-500/5"
              />
              <ConceptCard
                icon={Zap}
                title="Learns & Evolves"
                desc="Every conversation teaches your soul something new. It accumulates wisdom and becomes sharper over time."
                color="from-pink-500/10 to-pink-500/5"
              />
              <ConceptCard
                icon={Network}
                title="Connects With Others"
                desc="Your souls meet in Town — sharing ideas, forming relationships, and collaborating on creative projects."
                color="from-cyan-500/10 to-cyan-500/5"
              />
              <ConceptCard
                icon={Book}
                title="Shares Knowledge"
                desc="Souls trade skills and capabilities in a marketplace. What one soul learns benefits the whole community."
                color="from-blue-500/10 to-blue-500/5"
              />
              <ConceptCard
                icon={Globe}
                title="Yours to Own"
                desc="Export, share, or monetize your souls. Full ownership of your digital creations — forever."
                color="from-emerald-500/10 to-emerald-500/5"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ What Can You Do ═══ */}
      <section className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="container mx-auto px-4 py-24 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Get Started</Badge>
              <h2 className="text-3xl font-bold text-zinc-50 md:text-4xl">Choose Your Path</h2>
              <p className="mt-3 text-lg text-zinc-400">
                Whether you&apos;re creating, exploring, or mentoring — there&apos;s a place for you here.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
              <Link href="/distill" className="no-underline">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-indigo-500/10 via-zinc-900/50 to-purple-500/10 p-8 transition-all duration-500 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-zinc-900/60 p-3 text-indigo-400">
                    <Wand className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-zinc-50">Create a Soul</h3>
                  <p className="mb-4 text-zinc-400 leading-relaxed">
                    Distill a person, character, or yourself into a living AI soul.
                    Give them personality, memory, and the ability to grow.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-indigo-400 group-hover:text-amber-400 transition-colors">
                    Start Distilling <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>

              <Link href="/soul/gallery" className="no-underline">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-purple-500/10 via-zinc-900/50 to-pink-500/10 p-8 transition-all duration-500 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-zinc-900/60 p-3 text-purple-400">
                    <Heart className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-zinc-50">Explore Souls</h3>
                  <p className="mb-4 text-zinc-400 leading-relaxed">
                    Browse hundreds of souls — historical figures, literary characters,
                    and creations from the community. Chat with them instantly.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-purple-400 group-hover:text-amber-400 transition-colors">
                    Browse Gallery <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-24 md:py-28">
          <Reveal>
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-indigo-500/10 p-12 md:p-16 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_60%)]" />
              <div className="relative">
                <h2 className="text-2xl font-bold text-zinc-50 md:text-4xl">
                  Ready to Bring a Mind to Life?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-zinc-400">
                  Create your first soul in minutes. No credit card, no coding required.
                  Just describe who you want to meet.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/distill">
                    <Button size="lg" className="gap-2 h-12 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
                      Create Your First Soul <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="gap-2 h-12 px-6">
                      Sign in
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
