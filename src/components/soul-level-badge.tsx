/**
 * Soul Level Badge — Compact progress indicator with XP bar, level title, and trait icons.
 * Used in town page, soul profile card, and chat panel headers.
 */
"use client";

import { SoulGrowth } from "@/lib/soul-growth";

interface SoulLevelBadgeProps {
  growth: SoulGrowth;
  showTraits?: boolean;
  showXP?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SoulLevelBadge({
  growth,
  showTraits = true,
  showXP = true,
  size = "md",
  className = "",
}: SoulLevelBadgeProps) {
  const sizeClasses = {
    sm: { level: "text-sm", title: "text-xs", bar: "h-1", trait: "w-4 h-4 text-xs" },
    md: { level: "text-lg", title: "text-sm", bar: "h-1.5", trait: "w-5 h-5 text-sm" },
    lg: { level: "text-2xl", title: "text-base", bar: "h-2", trait: "w-6 h-6 text-base" },
  };
  const s = sizeClasses[size];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Level + Title row */}
      <div className="flex items-center gap-2">
        <span className={`font-bold ${s.level}`} style={{ color: growth.levelInfo.color }}>
          {growth.levelInfo.particle} Lv.{growth.level}
        </span>
        <span className={`${s.title} text-white/60`}>
          {growth.levelInfo.title_zh} · {growth.levelInfo.title}
        </span>
        {growth.isMaxLevel && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            MAX
          </span>
        )}
      </div>

      {/* XP Progress bar */}
      {showXP && !growth.isMaxLevel && (
        <div className="flex items-center gap-2">
          <div className={`flex-1 ${s.bar} bg-white/5 rounded-full overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-500`}
              style={{
                width: `${growth.progressPercent}%`,
                background: `linear-gradient(90deg, ${growth.levelInfo.color}, ${growth.levelInfo.color}80)`,
              }}
            />
          </div>
          <span className="text-xs text-white/40 whitespace-nowrap">
            {growth.xp} / {growth.xp + growth.xpToNext} XP
          </span>
        </div>
      )}

      {/* Unlocked Traits */}
      {showTraits && growth.unlockedTraits.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {growth.unlockedTraits.map((trait) => (
            <span
              key={trait.id}
              className={`${s.trait} inline-flex items-center justify-center rounded bg-white/5 border border-white/10`}
              title={`${trait.name_zh} (${trait.name}) — ${trait.description}`}
            >
              {trait.icon}
            </span>
          ))}
          {growth.unlockedTraits.length === 0 && (
            <span className="text-xs text-white/30">No traits unlocked yet</span>
          )}
        </div>
      )}

      {/* Level description (lg only) */}
      {size === "lg" && (
        <p className="text-xs text-white/40 italic">{growth.levelInfo.description}</p>
      )}
    </div>
  );
}
