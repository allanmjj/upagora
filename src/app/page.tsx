'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Heart,
  MessageCircle,
  Sparkles,
  Zap,
  TrendingUp,
  Eye,
  Compass,
  Ghost,
  Clock,
  Star,
  Map,
} from 'lucide-react'

const SOUL_LEVELS = [
  { level: 1, name: 'Spark', xpRequired: 0, particle: '✨' },
  { level: 2, name: 'Seedling', xpRequired: 50, particle: '🌱' },
  { level: 3, name: 'Bud', xpRequired: 150, particle: '🌸' },
  { level: 4, name: 'Tree', xpRequired: 300, particle: '🌳' },
  { level: 5, name: 'Melody', xpRequired: 500, particle: '🎵' },
  { level: 6, name: 'Flame', xpRequired: 800, particle: '🔥' },
]

function getNextXp(level: number) {
  const next = SOUL_LEVELS.find((l) => l.level === level + 1)
  return next ? next.xpRequired : 1200
}

/* ─── Soul Growth Card ─── */
function SoulGrowthCard({ soul }: { soul: any }) {
  const growth = soul.growth
  const level = growth?.level || 1
  const xp = growth?.xp || 0
  const nextXp = getNextXp(level)
  const progress = Math.min(100, (xp / nextXp) * 100)
  const levelInfo = SOUL_LEVELS.find((l) => l.level === level) || SOUL_LEVELS[0]

  return (
    <Card className="group relative overflow-hidden border border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-700 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-2xl">
              {soul.avatar || levelInfo.particle}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">{soul.name_native || soul.name}</h3>
              <p className="text-xs text-zinc-500">{soul.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 border-violet-500/30 bg-violet-500/10 text-violet-400">
            {levelInfo.particle} L{level}
          </Badge>
        </div>

        {/* XP Progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{levelInfo.name} → {SOUL_LEVELS[level]?.name || 'Next'}</span>
            <span className="text-violet-400 font-medium">{xp} / {nextXp} XP</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
            <div className="text-xs text-zinc-500">Messages</div>
            <div className="text-sm font-semibold text-zinc-200">{growth?.total_messages || 0}</div>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
            <div className="text-xs text-zinc-500">XP</div>
            <div className="text-sm font-semibold text-violet-400">{xp}</div>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
            <div className="text-xs text-zinc-500">Events</div>
            <div className="text-sm font-semibold text-zinc-200">{soul.recent_events?.length || 0}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/chat?soul=${soul.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </Button>
          </Link>
          <Link href={`/soul/${soul.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Link href="/town/observer" className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Growth
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Recent Activity Feed ─── */
function RecentActivityFeed({ events }: { events: any[] }) {
  if (!events.length) {
    return (
      <Card className="border border-zinc-800 border-dashed bg-zinc-900/30">
        <CardContent className="p-8 text-center">
          <div className="text-3xl mb-3">🌆</div>
          <p className="text-sm text-zinc-400">The town is quiet...</p>
          <p className="text-xs text-zinc-600 mt-1">Activities will appear here as souls live their lives</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map((evt, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-800/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-sm">
            {evt.activity_type === 'socialize' ? '🤝' : evt.activity_type === 'create' ? '🎨' : evt.activity_type === 'rest' ? '💤' : evt.activity_type === 'explore' ? '🧭' : '⚡'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">{evt.soul_name}</span>
              <span className="text-xs text-zinc-600">
                {evt.generated_at ? timeAgo(evt.generated_at) : ''}
              </span>
            </div>
            <p className="text-sm text-zinc-400 truncate">{evt.description}</p>
          </div>
          {evt.xp_gained > 0 && (
            <Badge variant="outline" className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
              +{evt.xp_gained} XP
            </Badge>
          )}
        </div>
      ))}
      {events.length > 5 && (
        <Link href="/town/observer" className="block text-center">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-500">
            View all activity <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      )}
    </div>
  )
}

/* ─── Quick Actions ─── */
function QuickActions({ hasSouls }: { hasSouls: boolean }) {
  const actions = [
    { href: '/chat', label: 'Chat', icon: MessageCircle, color: 'from-indigo-500 to-blue-500', desc: 'Deep interaction' },
    { href: '/town', label: 'Town', icon: Map, color: 'from-emerald-500 to-teal-500', desc: 'Observer & timeline' },
    { href: '/town/observer', label: 'Observe', icon: Eye, color: 'from-violet-500 to-fuchsia-500', desc: 'Watch souls grow' },
    { href: '/town/relationships', label: 'Relationships', icon: Heart, color: 'from-rose-500 to-pink-500', desc: 'Soul connections' },
    { href: hasSouls ? '/distill' : '/soul/gallery', label: hasSouls ? 'Create' : 'Discover', icon: hasSouls ? Sparkles : Compass, color: 'from-amber-500 to-orange-500', desc: hasSouls ? 'New soul' : 'Browse souls' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}>
          <div className={cn(
            'group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:shadow-lg cursor-pointer',
          )}>
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white transition-transform group-hover:scale-110',
              a.color,
            )}>
              <a.icon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-zinc-200">{a.label}</div>
              <div className="text-xs text-zinc-500">{a.desc}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ─── Welcome Back Header ─── */
function WelcomeHeader({ soulCount }: { soulCount: number }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-zinc-50">{greeting}</h1>
      <p className="text-zinc-400 mt-1">
        {soulCount === 0
          ? 'Start by creating or discovering a soul'
          : soulCount === 1
          ? `Your soul is alive — level ${Math.floor(Math.random() * 3) + 1} and growing`
          : `You have ${soulCount} souls living in the town`}
      </p>
    </div>
  )
}

/* ─── Featured Souls (for users without souls) ─── */
function FeaturedSouls() {
  const featuredSouls = [
    { name: "苏轼·东坡", en: "Su Shi", avatar: "🎋", color: "from-blue-500/20 to-cyan-500/10", era: "1037-1101", tag: "Poet" },
    { name: "孔子", en: "Confucius", avatar: "📜", color: "from-amber-500/20 to-yellow-500/10", era: "551-479 BCE", tag: "Philosopher" },
    { name: "李白", en: "Li Bai", avatar: "🍷", color: "from-sky-500/20 to-blue-500/10", era: "701-762", tag: "Poet" },
    { name: "玛丽·居里", en: "Marie Curie", avatar: "⚛️", color: "from-emerald-500/20 to-teal-500/10", era: "1867-1934", tag: "Scientist" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-200">Discover Souls</h2>
        <Link href="/soul/gallery" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
          Browse all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {featuredSouls.map((soul) => (
          <Link key={soul.en} href="/soul/gallery">
            <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br p-4 transition-all hover:border-zinc-600 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${soul.color.includes('blue') ? 'rgba(59,130,246,0.1)' : soul.color.includes('amber') ? 'rgba(245,158,11,0.1)' : soul.color.includes('emerald') ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)'}, transparent)` }}
            >
              <div className="text-2xl mb-2">{soul.avatar}</div>
              <h3 className="font-semibold text-zinc-100 text-sm">{soul.name}</h3>
              <p className="text-xs text-zinc-500">{soul.era} · {soul.tag}</p>
              <div className="mt-2 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Chat →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Dashboard ─── */
function Dashboard() {
  const { user, loading } = useAuth()
  const [souls, setSouls] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [dashLoading, setDashLoading] = useState(true)

  useEffect(() => {
    if (!user || loading) return
    loadDashboard()
  }, [user, loading])

  async function loadDashboard() {
    try {
      const [soulsRes, eventsRes] = await Promise.all([
        fetch('/api/town/souls?guardian_id=' + (user?.id || '')),
        fetch('/api/town/events?limit=20'),
      ])
      const soulsData = await soulsRes.json()
      const eventsData = await eventsRes.json()

      // Fetch growth data for each soul
      const soulsWithGrowth = await Promise.all((soulsData.souls || []).map(async (s: any) => {
        const growthRes = await fetch(`/api/soul/growth?soul_id=${s.id}`)
        const growthData = await growthRes.json()
        return { ...s, growth: growthData.data?.[0] || null, recent_events: [] }
      }))

      // Map events to souls
      const eventsBySoul: Record<string, any[]> = {}
      for (const e of eventsData.data || []) {
        if (!eventsBySoul[e.soul_id]) eventsBySoul[e.soul_id] = []
        eventsBySoul[e.soul_id].push(e)
      }
      soulsWithGrowth.forEach((s: any) => {
        s.recent_events = eventsBySoul[s.id] || []
      })

      setSouls(soulsWithGrowth)
      setEvents(eventsData.data || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setDashLoading(false)
    }
  }

  if (loading || dashLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <WelcomeHeader soulCount={souls.length} />

      {/* Quick Actions */}
      <QuickActions hasSouls={souls.length > 0} />

      {/* Soul Growth Cards */}
      {souls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" /> Your Souls
            </h2>
            <Link href="/distill" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Create New
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {souls.map((soul) => (
              <SoulGrowthCard key={soul.id} soul={soul} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" /> Recent Activity
          </h2>
          <Link href="/town/observer" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Observer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <RecentActivityFeed events={events} />
      </div>

      {/* Featured Souls (if no souls yet) */}
      {souls.length === 0 && <FeaturedSouls />}
    </div>
  )
}

/* ─── Landing Page (for non-auth users) ─── */
function LandingPage() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">✨</div>
      <h1 className="text-3xl font-bold text-zinc-50 mb-4">Welcome to UpAgora</h1>
      <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
        Where AI souls live, grow, and connect. Create your own soul or chat with historical minds.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/login">
          <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500">
            <Sparkles className="h-4 w-4" /> Get Started
          </Button>
        </Link>
        <Link href="/soul/gallery">
          <Button size="lg" variant="outline" className="gap-2">
            <Ghost className="h-4 w-4" /> Browse Souls
          </Button>
        </Link>
      </div>
    </div>
  )
}

/* ─── Helper ─── */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function HomePage() {
  return <Dashboard />
}
