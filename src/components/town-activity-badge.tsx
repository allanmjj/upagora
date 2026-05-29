"use client";

import { useEffect, useState, useMemo } from "react";

// Activity states based on time of day (时辰)
const ACTIVITY_MAP: Record<number, { label: string; icon: string; color: string }> = {
  0: { label: "Deep rest", icon: "😴", color: "#6366f1" }, // 子时 0-1
  1: { label: "Deep rest", icon: "😴", color: "#6366f1" }, // 子时 1-2
  2: { label: "Meditating", icon: "🧘", color: "#8b5cf6" }, // 丑时 2-3
  3: { label: "Meditating", icon: "🧘", color: "#8b5cf6" }, // 丑时 3-4
  4: { label: "Meditating", icon: "🧘", color: "#8b5cf6" }, // 寅时 4-5
  5: { label: "Waking up", icon: "🌅", color: "#f59e0b" }, // 寅/卯时 5-6
  6: { label: "Morning routine", icon: "☀️", color: "#f97316" }, // 卯时 6-7
  7: { label: "Creative work", icon: "✍️", color: "#22c55e" }, // 辰时 7-8
  8: { label: "Creative work", icon: "✍️", color: "#22c55e" }, // 辰时 8-9
  9: { label: "Creative work", icon: "✍️", color: "#22c55e" }, // 巳时 9-10
  10: { label: "Creative work", icon: "✍️", color: "#22c55e" }, // 巳时 10-11
  11: { label: "Lunch rest", icon: "🍱", color: "#eab308" }, // 午时 11-12
  12: { label: "Lunch rest", icon: "🍱", color: "#eab308" }, // 午时 12-13
  13: { label: "Studying", icon: "📖", color: "#06b6d4" }, // 未时 13-14
  14: { label: "Studying", icon: "📖", color: "#06b6d4" }, // 未时 14-15
  15: { label: "Working", icon: "🔨", color: "#ef4444" }, // 申时 15-16
  16: { label: "Working", icon: "🔨", color: "#ef4444" }, // 申时 16-17
  17: { label: "Socializing", icon: "🍻", color: "#ec4899" }, // 酉时 17-18
  18: { label: "Socializing", icon: "🍻", color: "#ec4899" }, // 酉时 18-19
  19: { label: "Evening gathering", icon: "🌆", color: "#f97316" }, // 戌时 19-20
  20: { label: "Evening gathering", icon: "🌆", color: "#f97316" }, // 戌时 20-21
  21: { label: "Winding down", icon: "🌙", color: "#7c3aed" }, // 戌/亥时 21-22
  22: { label: "Resting", icon: "🌙", color: "#6366f1" }, // 亥时 22-23
  23: { label: "Resting", icon: "🌙", color: "#6366f1" }, // 亥时 23-0
};

// Get Beijing time (UTC+8)
function getBeijingHour(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bj = new Date(utc + 8 * 3600000);
  return bj.getHours();
}

interface ActivityBadgeData {
  hour: number;
  activity: { label: string; icon: string; color: string };
  period_name: string;
}

const PERIOD_NAMES: Record<number, string> = {
  0: "子时", 1: "子时", 2: "丑时", 3: "丑时", 4: "寅时", 5: "卯时",
  6: "辰时", 7: "辰时", 8: "巳时", 9: "巳时", 10: "午时", 11: "午时",
  12: "未时", 13: "未时", 14: "申时", 15: "申时", 16: "酉时", 17: "酉时",
  18: "戌时", 19: "戌时", 20: "亥时", 21: "亥时", 22: "亥时", 23: "亥时",
};

export function useSoulActivity(): ActivityBadgeData {
  const [hour, setHour] = useState(getBeijingHour);

  useEffect(() => {
    const iv = setInterval(() => setHour(getBeijingHour()), 60000);
    return () => clearInterval(iv);
  }, []);

  const activity = ACTIVITY_MAP[hour] || ACTIVITY_MAP[0];
  return {
    hour,
    activity,
    period_name: PERIOD_NAMES[hour] || "子时",
  };
}

/**
 * SoulActivityBadge — small badge showing what souls are currently doing
 * based on the town's daily schedule.
 */
export function SoulActivityBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { hour, activity, period_name } = useSoulActivity();

  const sizeClass = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: `${activity.color}20`, color: activity.color }}
      title={`Town hour: ${hour} (${period_name}) — Souls are ${activity.label}`}
    >
      <span>{activity.icon}</span>
      <span>{activity.label}</span>
    </span>
  );
}

/**
 * SoulActivityLegend — shows the full daily schedule legend
 * for reference in the town guardian report.
 */
export function SoulActivityLegend({ compact = false }: { compact?: boolean }) {
  const { activity, period_name } = useSoulActivity();

  // Get activities for today (grouped by unique label to avoid redundancy)
  const periods = useMemo(() => {
    const seen = new Set<string>();
    return Object.entries(ACTIVITY_MAP)
      .map(([h, a]) => ({ hour: parseInt(h), ...a }))
      .filter((a) => {
        if (seen.has(a.label)) return false;
        seen.add(a.label);
        return true;
      });
  }, []);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
        {periods.map((p) => (
          <span
            key={p.label}
            className={`px-1.5 py-0.5 rounded ${
              activity.label === p.label
                ? "ring-1 ring-offset-1 ring-offset-zinc-900"
                : "opacity-50"
            }`}
            style={{
              ringColor: p.color,
              color: p.color,
            }}
          >
            {p.icon} {p.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="text-xs text-zinc-400 space-y-1">
      <div className="font-medium text-zinc-300 mb-2">Daily Rhythm — Current: {activity.icon} {activity.label} ({period_name})</div>
      {periods.map((p) => (
        <div
          key={p.label}
          className={`flex items-center gap-2 py-1 px-2 rounded ${
            activity.label === p.label ? "bg-zinc-800" : ""
          }`}
        >
          <span>{p.icon}</span>
          <span className="w-12">{p.hour.toString().padStart(2, "0")}:00</span>
          <span style={{ color: p.color }}>{p.label}</span>
          {activity.label === p.label && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-white">
              NOW
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Hook to get activity description for a given hour (for server/API use)
 */
export function getActivityForHour(hour: number): { label: string; icon: string; color: string } {
  return ACTIVITY_MAP[hour % 24] || ACTIVITY_MAP[0];
}
