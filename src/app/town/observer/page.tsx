'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Heart, Zap, MessageCircle, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface SoulEvent {
  id: number;
  type: string;
  soul_id: string;
  soul_name: string;
  description: string;
  location?: string;
  activity_type?: string;
  xp_gained?: number;
  generated_at: string;
  participants?: string[];
  content?: any;
}

interface SoulGrowth {
  soul_id: string;
  level: number;
  xp: number;
  total_messages: number;
  total_calibrations: number;
  last_proactive_at: string | null;
}

interface SoulSummary {
  id: string;
  name: string;
  name_native: string;
  avatar: string | null;
  color: string;
  growth: SoulGrowth | null;
  recent_events: SoulEvent[];
}

const LEVEL_PARTICLES: Record<number, string> = {
  1: '✨', 2: '🌱', 3: '🌸', 4: '🌳', 5: '🎵', 6: '🔥',
};

const ACTIVITY_ICONS: Record<string, string> = {
  rest: '💤', work: '⚒️', socialize: '🤝', create: '🎨',
  explore: '🧭', reflect: '🤔', wander: '🚶', guardian_visit: '👤',
  ceremony: '🏛️', autonomous_activity: '⚡', conversation: '💬',
};

export default function ObserverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [souls, setSouls] = useState<SoulSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [townTime, setTownTime] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) loadObserver();
  }, [authLoading, user, router]);

  async function loadObserver() {
    try {
      // Load souls + growth + recent events in parallel
      const [soulsRes, growthRes, eventsRes, timeRes] = await Promise.all([
        fetch('/api/town/souls?guardian_id=' + user!.id),
        fetch('/api/soul/growth?guardian_id=' + user!.id),
        fetch('/api/town/events?limit=50'),
        fetch('/api/town/schedule'),
      ]);

      const soulsData = await soulsRes.json();
      const growthData = await growthRes.json();
      const eventsData = await eventsRes.json();
      const timeData = await timeRes.json();

      // Map growth to souls
      const growthMap = new Map<string, SoulGrowth>();
      for (const g of growthData?.data || []) {
        growthMap.set(g.soul_id, g);
      }

      // Group events by soul
      const eventsBySoul = new Map<string, SoulEvent[]>();
      for (const e of (eventsData?.events || eventsData?.data || [])) {
        const soulId = e.soul_id || (typeof e.content === 'object' && e.content?.soul_id) || 'unknown';
        const list = eventsBySoul.get(soulId) || [];
        list.push(e);
        eventsBySoul.set(soulId, list);
      }

      const summaries: SoulSummary[] = (soulsData?.souls || []).map((s: any) => ({
        ...s,
        growth: growthMap.get(s.id) || null,
        recent_events: eventsBySoul.get(s.id) || [],
      }));

      setSouls(summaries);
      setTownTime(timeData?.time_string || '');
    } catch (err) {
      console.error('Failed to load observer data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                Soul Observer
              </h1>
              <p className="text-zinc-500 text-sm mt-1">
                Watch your souls live, grow, and interact — even when you're not there.
              </p>
            </div>
            {townTime && (
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Clock className="w-4 h-4" />
                Town time: {townTime}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {souls.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">No souls found. Create a soul to start observing.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/soul')}>
              Create Soul
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {souls.map((soul) => (
                  <Card key={soul.id} className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {LEVEL_PARTICLES[soul.growth?.level || 1]}
                          {soul.name_native || soul.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-violet-400 border-violet-400/30">
                          L{soul.growth?.level || 1}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Growth bar */}
                      {soul.growth && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>XP</span>
                            <span>{soul.growth.xp} / {getNextXp(soul.growth.level)}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (soul.growth.xp / getNextXp(soul.growth.level)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Recent activity */}
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Recent Activity</p>
                        {soul.recent_events.slice(0, 3).map((evt, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-base flex-shrink-0 mt-0.5">
                              {ACTIVITY_ICONS[evt.activity_type || evt.type] || '⚡'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-zinc-300 truncate">{evt.description}</p>
                              <p className="text-zinc-600 text-xs">
                                {formatTime(evt.generated_at)}
                                {evt.xp_gained && ` · +${evt.xp_gained} XP`}
                              </p>
                            </div>
                          </div>
                        ))}
                        {soul.recent_events.length === 0 && (
                          <p className="text-zinc-600 text-sm">No recent activity</p>
                        )}
                      </div>

                      {/* Stats */}
                      {soul.growth && (
                        <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {soul.growth.total_messages}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {soul.growth.xp} XP
                          </span>
                          {soul.growth.last_proactive_at && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              Last reach: {formatTime(soul.growth.last_proactive_at)}
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700/50 text-zinc-400 hover:text-white"
                        onClick={() => router.push(`/soul/${soul.id}`)}
                      >
                        View Soul
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimelineView souls={souls} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Growth Tab */}
            <TabsContent value="growth">
              <div className="grid md:grid-cols-2 gap-4">
                {souls.map((soul) => (
                  <GrowthCard key={soul.id} soul={soul} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function TimelineView({ souls }: { souls: SoulSummary[] }) {
  const allEvents = souls
    .flatMap((s) => s.recent_events.map((e) => ({ ...e, soul_name: s.name_native || s.name, soul_color: s.color })))
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());

  if (allEvents.length === 0) {
    return <p className="text-zinc-500 text-center py-8">No events yet. The town will come alive soon.</p>;
  }

  return (
    <div className="space-y-3">
      {allEvents.slice(0, 20).map((evt, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: evt.soul_color || '#8b5cf6' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{ACTIVITY_ICONS[evt.activity_type || evt.type] || '⚡'}</span>
              <span className="text-sm font-medium text-zinc-200">{evt.soul_name}</span>
              <span className="text-xs text-zinc-500">{formatTime(evt.generated_at)}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-1 ml-6">{evt.description}</p>
            {evt.location && <p className="text-xs text-zinc-600 ml-6">at {evt.location}</p>}
          </div>
          {evt.xp_gained && <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">+{evt.xp_gained} XP</Badge>}
        </div>
      ))}
    </div>
  );
}

function GrowthCard({ soul }: { soul: SoulSummary }) {
  const growth = soul.growth;
  if (!growth) return null;

  const nextXp = getNextXp(growth.level);
  const progress = Math.min(100, (growth.xp / nextXp) * 100);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {LEVEL_PARTICLES[growth.level]}
          {soul.name_native || soul.name}
          <Badge variant="outline" className="text-violet-400 border-violet-400/30">Level {growth.level}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XP Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Progress to Level {growth.level + 1}</span>
            <span className="text-violet-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{growth.xp} / {nextXp} XP needed</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-zinc-800/30">
            <p className="text-xs text-zinc-500">Total Messages</p>
            <p className="text-lg font-semibold text-zinc-200">{growth.total_messages}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/30">
            <p className="text-xs text-zinc-500">Total XP</p>
            <p className="text-lg font-semibold text-violet-400">{growth.xp}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/30">
            <p className="text-xs text-zinc-500">Calibrations</p>
            <p className="text-lg font-semibold text-zinc-200">{growth.total_calibrations}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/30">
            <p className="text-xs text-zinc-500">Recent Activity</p>
            <p className="text-lg font-semibold text-zinc-200">{soul.recent_events.length} events</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function getNextXp(level: number): number {
  // XP thresholds per level (from SOUL_LEVELS)
  const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600];
  return thresholds[level] || thresholds[Math.min(level, thresholds.length - 1)];
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
