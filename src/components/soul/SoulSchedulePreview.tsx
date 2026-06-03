'use client';

import { useEffect, useState } from 'react';
import { Clock, Activity, Zap, MapPin, ExternalLink } from 'lucide-react';

interface ScheduleSlot {
  phase: string;
  hour: number;
  preferredActivity: string;
  preferredLocation: string;
  energyCost: number;
  energyGain?: number;
}

interface ScheduleData {
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
}

const activityIcons: Record<string, string> = {
  rest: '😴', work: '📖', socialize: '🤝', create: '✍️',
  explore: '🔍', reflect: '🧘', wander: '🚶', guardian_visit: '👀',
  ceremony: '🕯️', teach: '👨‍🏫', meditate: '🧘', debate: '💬',
  compose: '🎼', paint: '🎨', experiment: '⚗️', write: '📝',
};

const phaseLabels: Record<string, string> = {
  dawn: '🌅 Dawn', morning: '☀️ Morning', midday: '🌞 Midday',
  afternoon: '🌤️ Afternoon', dusk: '🌇 Dusk', night: '🌙 Night',
};

export function SoulSchedulePreview({ soulId, soulName }: { soulId: string; soulName: string }) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/soul/calendar?soul_id=${encodeURIComponent(soulId)}&view=day`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [soulId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <div className="text-zinc-500 animate-pulse flex items-center justify-center gap-2">
          <Activity className="w-5 h-5" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.schedule?.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">No schedule data available for this soul.</p>
      </div>
    );
  }

  const totalEnergyCost = data.schedule.reduce((sum, s) => sum + s.energyCost, 0);
  const totalEnergyGain = data.schedule.reduce((sum, s) => sum + (s.energyGain || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-violet-400" />
          {soulName} — Daily Schedule
        </h3>

        {/* Energy balance */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl bg-zinc-800/50 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Activities</div>
            <div className="text-lg font-bold text-zinc-200">{data.schedule.length}</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Energy Spent</div>
            <div className="text-lg font-bold text-red-400">-{totalEnergyCost}</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Energy Gained</div>
            <div className="text-lg font-bold text-emerald-400">+{totalEnergyGain}</div>
          </div>
        </div>

        {/* Interaction pattern */}
        {data.pattern && (
          <div className="rounded-xl bg-violet-900/10 border border-violet-800/30 p-3">
            <div className="text-xs font-bold text-violet-400 mb-2">Interaction Pattern</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Best hour: <span className="font-bold">{String(data.pattern.preferredHourOfDay).padStart(2, '0')}:00</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                {data.pattern.avgConversationsPerDay.toFixed(1)} convos/day
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Timeline */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Today&apos;s Schedule
          </h3>
          <a
            href={`/soul/${soulId}/calendar`}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-violet-400 hover:bg-zinc-700 flex items-center gap-1"
          >
            Full Calendar <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {data.schedule.map((slot, i) => (
            <div key={i} className="flex items-start gap-4 p-4 hover:bg-zinc-800/20 transition-colors">
              {/* Time indicator */}
              <div className="shrink-0 w-16 text-right">
                <div className="text-sm font-bold text-zinc-300">
                  {String(slot.hour).padStart(2, '0')}:00
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {phaseLabels[slot.phase]?.replace(/^[^\s]+\s/, '') || slot.phase}
                </div>
              </div>

              {/* Timeline dot */}
              <div className="relative shrink-0">
                <div className="w-3 h-3 rounded-full bg-violet-500 mt-1.5" />
                {i < data.schedule.length - 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-8 bg-zinc-800" />
                )}
              </div>

              {/* Activity details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activityIcons[slot.preferredActivity] || '•'}</span>
                  <span className="font-medium text-zinc-200 capitalize">{slot.preferredActivity}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <MapPin className="w-3 h-3" />
                  <span>{slot.preferredLocation}</span>
                </div>
                <div className="flex gap-2 mt-1.5">
                  {slot.energyCost > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-400">
                      -⚡{slot.energyCost}
                    </span>
                  )}
                  {slot.energyGain && slot.energyGain > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400">
                      +⚡{slot.energyGain}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
