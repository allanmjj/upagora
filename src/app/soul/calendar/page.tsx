'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Brain, Sparkles, Activity, Calendar as CalIcon } from 'lucide-react';

interface ScheduleSlot {
  phase: string;
  hour: number;
  preferredActivity: string;
  preferredLocation: string;
  energyCost: number;
  energyGain?: number;
  phase_label?: string;
}

interface CalendarEvent {
  date: string;
  dayOfWeek: string;
  interaction: {
    type: string;
    priority: 'low' | 'medium' | 'high';
    score: number;
    bestTime: string;
    reason: string;
  };
  daily_schedule: ScheduleSlot[];
}

interface CalendarData {
  soul_id: string;
  soul_name: string;
  schedule: ScheduleSlot[];
  pattern: {
    avgConversationsPerDay: number;
    preferredHourOfDay: number;
    preferredDayOfWeek: number;
    avgMessageLength: number;
    emotionalTrend: string;
  };
  historical_events: any[];
  events: CalendarEvent[];
  view: string;
}

export default function SoulCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const soulId = params?.id as string;

  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!soulId) return;
    fetch(`/api/soul/calendar?soul_id=${encodeURIComponent(soulId)}&view=${view}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [soulId, view]);

  const selectedEvent = useMemo(() => {
    if (!data?.events) return null;
    return data.events.find(e => e.date === selectedDate) || data.events[0];
  }, [data, selectedDate]);

  const activityIcons: Record<string, string> = {
    rest: '😴',
    work: '📖',
    socialize: '🤝',
    create: '✍️',
    explore: '🔍',
    reflect: '🧘',
    wander: '🚶',
    guardian_visit: '👀',
    ceremony: '🕯️',
  };

  const priorityColors = {
    high: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
    medium: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    low: 'bg-zinc-800 text-zinc-400 border-zinc-700/50',
  };

  const priorityDotColors = {
    high: 'bg-emerald-400',
    medium: 'bg-amber-400',
    low: 'bg-zinc-500',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse flex items-center gap-3">
          <CalIcon className="w-5 h-5" />
          <span>Loading soul calendar...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <p>Could not load calendar data</p>
          <button onClick={() => router.push('/soul')} className="mt-4 px-4 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800">
            ← Back to Souls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/soul/${soulId}`)}
            className="text-sm text-zinc-500 hover:text-white mb-3 transition-colors"
          >
            ← Back to Soul Detail
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalIcon className="w-6 h-6 text-violet-400" />
                {data.soul_name} — Soul Calendar
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Daily schedule · Interaction windows · Activity forecast
              </p>
            </div>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    view === v
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Calendar Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Month/Week View */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold">
                {view === 'month' ? '30-Day Overview' : view === 'week' ? 'Week View' : 'Today'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>
                <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="p-3 text-center text-xs font-medium text-zinc-500">{d}</div>
              ))}
            </div>

            {/* Calendar grid - show up to 4 weeks */}
            <div className="divide-y divide-zinc-800/50">
              {Array.from({ length: view === 'week' ? 1 : 4 }, (_, weekIdx) => {
                const startEventIdx = view === 'week' ? weekOffset * 7 : weekIdx * 7 + weekOffset * 7;
                const weekEvents = (data.events || []).slice(startEventIdx, startEventIdx + 7);
                if (weekEvents.length === 0) return null;

                return (
                  <div key={weekIdx} className="grid grid-cols-7 divide-x divide-zinc-800/50">
                    {Array.from({ length: 7 }, (_, i) => {
                      const evt = weekEvents[i];
                      if (!evt) return <div key={i} className="min-h-[5rem] bg-zinc-900/20" />;
                      const isSelected = evt.date === selectedDate;

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(evt.date)}
                          className={`min-h-[5rem] p-2 text-left transition-colors ${
                            isSelected ? 'bg-violet-900/30 ring-1 ring-violet-500/50' : 'hover:bg-zinc-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${isSelected ? 'text-violet-300' : 'text-zinc-300'}`}>
                              {new Date(evt.date).getDate()}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${priorityDotColors[evt.interaction.priority]}`} />
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {evt.interaction.priority === 'high' && '🔥'}{' '}
                            {evt.interaction.priority === 'medium' && '💬'}
                            {evt.interaction.priority === 'low' && '🌙'}
                          </div>
                          {/* Mini schedule indicators */}
                          <div className="flex gap-0.5 mt-1.5">
                            {evt.daily_schedule.slice(0, 3).map((s, si) => (
                              <span key={si} className="text-[10px] opacity-60">{activityIcons[s.preferredActivity] || '•'}</span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interaction Windows Legend */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Interaction Windows
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className={`px-3 py-2 rounded-lg border text-xs ${priorityColors.high}`}>
                <div className="font-bold">High</div>
                <div className="mt-0.5">Deep conversation window</div>
              </div>
              <div className={`px-3 py-2 rounded-lg border text-xs ${priorityColors.medium}`}>
                <div className="font-bold">Medium</div>
                <div className="mt-0.5">Casual check-in</div>
              </div>
              <div className={`px-3 py-2 rounded-lg border text-xs ${priorityColors.low}`}>
                <div className="font-bold">Low</div>
                <div className="mt-0.5">Quiet reflection</div>
              </div>
            </div>

            {/* Pattern stats */}
            {data.pattern && (
              <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-sm font-bold text-zinc-200">{data.pattern.avgConversationsPerDay.toFixed(1)}</div>
                  <div className="text-xs text-zinc-500">Convos/Day</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-zinc-200">{String(data.pattern.preferredHourOfDay).padStart(2, '0')}:00</div>
                  <div className="text-xs text-zinc-500">Best Hour</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-zinc-200">{data.pattern.avgMessageLength}</div>
                  <div className="text-xs text-zinc-500">Avg Words</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Day Detail */}
        <div className="space-y-4">
          {selectedEvent ? (
            <>
              {/* Selected Date Info */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[selectedEvent.interaction.priority]}`}>
                    {selectedEvent.interaction.priority}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-2">{selectedEvent.interaction.reason}</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Clock className="w-4 h-4 text-violet-400" />
                  Best time: {selectedEvent.interaction.bestTime}
                </div>
              </div>

              {/* Daily Schedule */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm">Daily Schedule / 日程</h3>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {selectedEvent.daily_schedule.map((slot, i) => (
                    <div key={i} className="p-3 flex items-start gap-3">
                      <div className="text-lg shrink-0">{activityIcons[slot.preferredActivity] || '•'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-200">
                            {slot.phase_label || slot.phase}
                          </span>
                          <span className="text-xs text-zinc-500">{String(slot.hour).padStart(2, '0')}:00</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 capitalize">
                          {slot.preferredActivity} at {slot.preferredLocation}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {slot.energyCost > 0 && (
                            <span className="text-[10px] text-red-400">-⚡{slot.energyCost}</span>
                          )}
                          {slot.energyGain && (
                            <span className="text-[10px] text-emerald-400">+⚡{slot.energyGain}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Button */}
              <a
                href={`/soul/${soulId}`}
                className="block rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-center font-medium hover:from-violet-500 hover:to-purple-500 transition-all"
              >
                💬 Chat with {data.soul_name} Now
              </a>
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-zinc-500">
              Select a date to see the soul&apos;s daily schedule
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
