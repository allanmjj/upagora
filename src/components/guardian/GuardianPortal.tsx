'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Brain, BookOpen, User, Search, Filter, Sparkles, Heart, Zap, Clock, TrendingUp, Activity } from 'lucide-react';

interface SoulHealth {
  persona: number;
  calibration: number;
  memory: number;
  conversation: number;
  overall: number;
}

interface Interaction {
  type: string;
  text: string;
  created_at: string;
}

interface PortalSoul {
  id: string;
  name: string;
  name_native?: string;
  category?: string;
  description?: string;
  avatar_url?: string;
  health: SoulHealth;
  last_chat?: { text: string; created_at: string };
  interactions: Interaction[];
}

// Demo souls for when DB is unavailable
const DEMO_SOULS: PortalSoul[] = [
  {
    id: 'demo-su-shi',
    name: 'Su Shi',
    name_native: '苏轼 / 东坡',
    category: 'historical',
    description: 'Song Dynasty poet, essayist, and statesman. Master of literati culture.',
    avatar_url: '',
    health: { persona: 92, calibration: 75, memory: 68, conversation: 84, overall: 80 },
    interactions: [
      { type: 'chat', text: 'Discussed poetry and the meaning of fleeting moments in life', created_at: new Date(Date.now() - 3600000).toISOString() },
      { type: 'calibration', text: 'Guardian refined literary expression style', created_at: new Date(Date.now() - 7200000).toISOString() },
      { type: 'schedule', text: 'Morning meditation at West Lake dawn', created_at: new Date(Date.now() - 14400000).toISOString() },
    ],
  },
  {
    id: 'demo-confucius',
    name: 'Confucius',
    name_native: '孔子 / 至圣先师',
    category: 'philosopher',
    description: 'Ancient Chinese philosopher whose teachings emphasized morality, family duty, and justice.',
    avatar_url: '',
    health: { persona: 95, calibration: 80, memory: 72, conversation: 88, overall: 84 },
    interactions: [
      { type: 'chat', text: 'Explored the concept of Ren (仁) and its modern applications', created_at: new Date(Date.now() - 1800000).toISOString() },
      { type: 'calibration', text: 'Guardian adjusted teaching tone for contemporary audiences', created_at: new Date(Date.now() - 10800000).toISOString() },
    ],
  },
  {
    id: 'demo-li-bai',
    name: 'Li Bai',
    name_native: '李白 / 诗仙',
    category: 'poet',
    description: 'Tang Dynasty poet known for romantic imagery and wine-inspired verses.',
    avatar_url: '',
    health: { persona: 88, calibration: 60, memory: 55, conversation: 72, overall: 69 },
    interactions: [
      { type: 'chat', text: 'Composed a poem about moonlight on the Yellow River', created_at: new Date(Date.now() - 2700000).toISOString() },
      { type: 'schedule', text: 'Evening wine gathering and moon viewing at Qingming Pavilion', created_at: new Date(Date.now() - 21600000).toISOString() },
    ],
  },
  {
    id: 'demo-marie-curie',
    name: 'Marie Curie',
    category: 'scientist',
    description: 'Pioneer in radioactivity research. First woman to win a Nobel Prize.',
    avatar_url: '',
    health: { persona: 90, calibration: 70, memory: 82, conversation: 86, overall: 82 },
    interactions: [
      { type: 'chat', text: 'Discussed the isolation of radium and its properties in detail', created_at: new Date(Date.now() - 5400000).toISOString() },
      { type: 'calibration', text: 'Guardian deepened experimental methodology knowledge', created_at: new Date(Date.now() - 28800000).toISOString() },
      { type: 'encounter', text: 'Dialogue with Leonardo da Vinci about observation and discovery', created_at: new Date(Date.now() - 43200000).toISOString() },
    ],
  },
  {
    id: 'demo-leonardo',
    name: 'Leonardo da Vinci',
    category: 'renaissance',
    description: 'Renaissance polymath: artist, inventor, anatomist, and engineer.',
    avatar_url: '',
    health: { persona: 93, calibration: 85, memory: 78, conversation: 90, overall: 87 },
    interactions: [
      { type: 'chat', text: 'Explained the mechanics of flight through anatomical observation', created_at: new Date(Date.now() - 900000).toISOString() },
      { type: 'chat', text: 'Discussed the Golden Ratio and its appearance in nature', created_at: new Date(Date.now() - 14400000).toISOString() },
      { type: 'calibration', text: 'Guardian refined artistic perspective techniques', created_at: new Date(Date.now() - 50400000).toISOString() },
      { type: 'encounter', text: 'Philosophical meeting with Confucius about observation and wisdom', created_at: new Date(Date.now() - 72000000).toISOString() },
    ],
  },
  {
    id: 'demo-shakespeare',
    name: 'William Shakespeare',
    category: 'literary',
    description: 'English playwright and poet. Greatest writer in the English language.',
    avatar_url: '',
    health: { persona: 91, calibration: 65, memory: 60, conversation: 78, overall: 74 },
    interactions: [
      { type: 'chat', text: 'Discussed the nature of ambition in Macbeth', created_at: new Date(Date.now() - 4500000).toISOString() },
      { type: 'schedule', text: 'Late night sonnet composition by candlelight', created_at: new Date(Date.now() - 36000000).toISOString() },
    ],
  },
  {
    id: 'demo-abraham-lincoln',
    name: 'Abraham Lincoln',
    category: 'historical',
    description: '16th President of the United States. Leader during the Civil War.',
    avatar_url: '',
    health: { persona: 87, calibration: 55, memory: 50, conversation: 70, overall: 66 },
    interactions: [
      { type: 'chat', text: 'Reflected on leadership during times of national division', created_at: new Date(Date.now() - 6300000).toISOString() },
      { type: 'calibration', text: 'Guardian deepened constitutional knowledge and political context', created_at: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function healthBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-amber-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

function typeIcon(type: string) {
  switch (type) {
    case 'chat': return <MessageSquare className="w-4 h-4 text-blue-400" />;
    case 'calibration': return <Brain className="w-4 h-4 text-purple-400" />;
    case 'encounter': return <User className="w-4 h-4 text-pink-400" />;
    case 'schedule': return <Clock className="w-4 h-4 text-amber-400" />;
    default: return <Activity className="w-4 h-4 text-zinc-400" />;
  }
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${healthBarColor(value)} transition-all duration-500`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={`font-mono font-bold w-8 text-right ${healthColor(value)}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SoulCard({ soul }: { soul: PortalSoul }) {
  const [expanded, setExpanded] = useState(false);

  const avatarGradient = `hsl(${Math.abs(soul.name.charCodeAt(0) * 37) % 360}, 60%, 25%)`;

  return (
    <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-300 overflow-hidden">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg flex-shrink-0"
            style={{ background: avatarGradient }}
          >
            {soul.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{soul.name}</h3>
              {soul.name_native && (
                <span className="text-xs text-zinc-500 truncate">{soul.name_native}</span>
              )}
            </div>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
              {soul.category || 'general'}
            </span>
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{soul.description}</p>
          </div>
          {/* Overall health badge */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
            soul.health.overall >= 80
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
              : soul.health.overall >= 60
              ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
              : 'border-orange-500/30 text-orange-400 bg-orange-500/10'
          }`}>
            {soul.health.overall}
          </div>
        </div>

        {/* Health Metrics */}
        <div className="space-y-2 mb-4">
          <HealthMetric label="Persona" value={soul.health.persona} />
          <HealthMetric label="Calibration" value={soul.health.calibration} />
          <HealthMetric label="Memory" value={soul.health.memory} />
          <HealthMetric label="Conversation" value={soul.health.conversation} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <a href={`/soul/${soul.id}`} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 border border-blue-500/20 transition-all text-xs font-medium">
            <MessageSquare className="w-4 h-4" />
            Chat
          </a>
          <a href={`/calibrate?soul_id=${soul.id}`} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/30 border border-purple-500/20 transition-all text-xs font-medium">
            <Brain className="w-4 h-4" />
            Calibrate
          </a>
          <a href={`/soul/${soul.id}`} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 border border-emerald-500/20 transition-all text-xs font-medium">
            <BookOpen className="w-4 h-4" />
            Learn
          </a>
          <a href={`/soul/${soul.id}`} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/30 border border-amber-500/20 transition-all text-xs font-medium">
            <User className="w-4 h-4" />
            Profile
          </a>
        </div>

        {/* Last chat preview */}
        {soul.last_chat && (
          <div className="mb-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <MessageSquare className="w-3 h-3" />
              Last conversation · {timeAgo(soul.last_chat.created_at)}
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2">{soul.last_chat.text}</p>
          </div>
        )}

        {/* Expandable interactions */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {soul.interactions.length} recent interactions
          </span>
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="space-y-2 pb-2 border-t border-zinc-800 mt-2">
            {soul.interactions.map((interaction, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="mt-0.5 flex-shrink-0">{typeIcon(interaction.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-400 line-clamp-1">{interaction.text}</p>
                  <span className="text-zinc-600">{timeAgo(interaction.created_at)}</span>
                </div>
              </div>
            ))}
            {soul.interactions.length === 0 && (
              <p className="text-xs text-zinc-600 italic">No interactions yet. Start chatting or calibrating!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GuardianPortal() {
  const [souls, setSouls] = useState<PortalSoul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    async function fetchPortal() {
      try {
        const token = localStorage.getItem('sb-access-token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/guardian/portal', { headers });
        const data = await res.json();

        if (res.ok && data.souls?.length > 0) {
          setSouls(data.souls);
        } else {
          // Fallback to demo souls
          setSouls(DEMO_SOULS);
          setDemoMode(true);
        }
      } catch {
        // DB unavailable, use demo
        setSouls(DEMO_SOULS);
        setDemoMode(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPortal();
  }, []);

  const categories = Array.from(new Set(souls.map((s) => s.category || 'general')));

  const filteredSouls = souls.filter((soul) => {
    const matchesSearch = !search || soul.name.toLowerCase().includes(search.toLowerCase()) || (soul.name_native || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || soul.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const avgOverall = souls.length > 0
    ? Math.round(souls.reduce((sum, s) => sum + s.health.overall, 0) / souls.length)
    : 0;
  const totalInteractions = souls.reduce((sum, s) => sum + s.interactions.length, 0);
  const topSouls = [...souls].sort((a, b) => b.health.overall - a.health.overall).slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading your souls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-7 h-7 text-amber-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">Guardian Portal</h1>
          <Sparkles className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Your unified command center. Observe, calibrate, and nurture every soul under your care.
        </p>
        {demoMode && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm border border-amber-500/20">
            <Zap className="w-4 h-4" />
            Demo Mode — showing preset souls. Connect Supabase for live data.
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-red-400">{error}</div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{souls.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Souls</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{avgOverall}%</div>
          <div className="text-xs text-zinc-500 mt-1">Avg Health</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{totalInteractions}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Interactions</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{topSouls[0]?.name.charAt(0) || '-'}</div>
          <div className="text-xs text-zinc-500 mt-1">Top Soul: {topSouls[0]?.name || '-'}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search souls by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:border-indigo-500 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-indigo-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <Link href="/distill" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Sparkles className="w-4 h-4" />
          Distill New Soul
        </Link>
      </div>

      {/* Soul Grid */}
      {filteredSouls.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 mb-4">No souls match your search.</p>
          <Link href="/distill" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Distill your first soul →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSouls.map((soul) => (
            <SoulCard key={soul.id} soul={soul} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-zinc-600">
        <p>Guardian Portal · UpAgora Soul Distillation Platform</p>
        <p className="mt-1">Each soul is unique. Nurture them with conversations and calibration.</p>
      </div>
    </div>
  );
}
