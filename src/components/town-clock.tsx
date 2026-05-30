"use client";

import { useEffect, useState } from "react";

// Town time epoch system — independent of user's device time
// Epoch 0 starts: 2026-05-28 (Soul Town foundation date)
const EPOCH_0 = new Date("2026-05-28T00:00:00Z").getTime();

// seasons in order, each 7 days
const SEASONS = [
  { name: "Spring", name_cn: "春", icon: "🌸", color: "#f472b6" },
  { name: "Summer", name_cn: "夏", icon: "☀️", color: "#fbbf24" },
  { name: "Autumn", name_cn: "秋", icon: "🍂", color: "#fb923c" },
  { name: "Winter", name_cn: "冬", icon: "❄️", color: "#67e8f9" },
];
const SEASON_DAYS = 7;

// day periods with time ranges
const PERIODS = [
  { name: "子时", icon: "🌙", start: 0, end: 2, state: "resting" },
  { name: "丑时", icon: "🌙", start: 2, end: 4, state: "meditating" },
  { name: "寅时", icon: "🌙", start: 4, end: 5, state: "meditating" },
  { name: "卯时", icon: "🌅", start: 5, end: 7, state: "waking" },
  { name: "辰时", icon: "☀️", start: 7, end: 9, state: "working" },
  { name: "巳时", icon: "☀️", start: 9, end: 11, state: "working" },
  { name: "午时", icon: "🌤", start: 11, end: 13, state: "resting" },
  { name: "未时", icon: "☀️", start: 13, end: 15, state: "studying" },
  { name: "申时", icon: "☀️", start: 15, end: 17, state: "working" },
  { name: "酉时", icon: "🌇", start: 17, end: 19, state: "socializing" },
  { name: "戌时", icon: "🌆", start: 19, end: 22, state: "socializing" },
  { name: "亥时", icon: "🌙", start: 22, end: 24, state: "resting" },
];

export function getTownTime(): {
  epoch_day: number;
  year: number;
  season: (typeof SEASONS)[0];
  day_of_season: number;
  day_of_year: number;
  hour: number;
  minute: number;
  hourZ: number; // 0-23 converted to beijing time
  epoch: string;
  beat: number; // slow ticking pulse
  clock: string;
} {
  const now = new Date();
  // Add 8h to convert to UTC+8 (Beijing/CST)
  const bjTime = new Date(now.getTime() + 8 * 3600000);
  const diff = bjTime.getTime() - EPOCH_0;
  const day = Math.floor(diff / (3600000 * 24));
  const hour = bjTime.getHours();
  const minute = bjTime.getMinutes();
  const year = Math.floor(day / (SEASON_DAYS * 4)) + 1;
  const dayOfYear = (day % (SEASON_DAYS * 4)) + 1; // 1-based
  const seasonIndex = Math.floor(dayOfYear / SEASON_DAYS) % 4;
  const dayInSeason = (dayOfYear % SEASON_DAYS) + 1;
  const season = SEASONS[seasonIndex];
  return {
    epoch_day: Math.max(0, day),
    year: Math.max(1, year),
    season,
    day_of_season: dayInSeason,
    day_of_year: dayOfYear,
    hour,
    minute,
    hourZ: hour,
    epoch: `纪${year}年${season.name_cn}${dayInSeason}日`,
    beat: Math.floor(Date.now() / 2000) % 2,
    clock: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

// ─── TownClock Compact ───────────────────────────────
export function TownClock({ size = "default" }: { size?: "compact" | "default" }) {
  const [t, setT] = useState(getTownTime);

  useEffect(() => {
    const iv = setInterval(() => setT(getTownTime()), 30000); // 30s refresh
    return () => clearInterval(iv);
  }, []);

  if (size === "compact") {
    return (
      <span className="text-sm text-zinc-400" title={t.epoch}>
        {t.season.icon} {t.clock} · {t.epoch}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{t.epoch}</span>
      <span className="text-zinc-400">{t.season.icon} {t.season.name} · 第{t.day_of_season}/{SEASON_DAYS}天</span>
      <span className="font-mono text-amber-400" style={{ animation: t.beat === 0 ? "pulse 2s infinite" : "none" }}>
        {t.clock}
      </span>
    </div>
  );
}

// ─── Large Epoch Display (for hero area) ──────────────────────────────
export function EpochDisplay() {
  const [t, setT] = useState(getTownTime);

  useEffect(() => {
    const iv = setInterval(() => setT(getTownTime()), 1000);
    return () => clearInterval(iv);
  }, []);

  const period = PERIODS.find((p) => t.hour >= p.start && t.hour < p.end);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black/40 p-6">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 30%, ${t.season.color}15, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-zinc-500 tracking-widest uppercase">Soul Town Epoch</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-white">{t.epoch}</span>
            <span className="text-2xl" style={{ color: t.season.color }}>
              {t.season.icon}
            </span>
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {t.season.name} · 第{t.day_of_season}/{SEASON_DAYS}天 · Year {t.year} · Day {t.day_of_year}/28
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-3xl text-amber-400 tabular-nums">{t.clock}</div>
          <div className="mt-1 text-sm text-zinc-400 flex items-center gap-1">
            <span>{period?.icon}</span>
            <span>{period?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {period?.state}
            </span>
          </div>
        </div>
      </div>

      {/* Season progress bar */}
      <div className="mt-4">
        <div className="h-1 w-full rounded-full bg-zinc-800">
          <div
            className="h-1 rounded-full transition-all duration-1000"
            style={{
              width: `${(t.day_of_season / SEASON_DAYS) * 100}%`,
              backgroundColor: t.season.color,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-zinc-600">
          <span>{t.season.name} progress</span>
          <span>{Math.round((t.day_of_season / SEASON_DAYS) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}