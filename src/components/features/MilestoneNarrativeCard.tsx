/**
 * Milestone Narrative Card — "Letter from the soul" style display.
 *
 * Replaces the gamified badge with an emotional narrative message
 * written from the soul's perspective, addressed to the guardian.
 *
 * Usage:
 *   <MilestoneNarrativeCard event={event} soulName="xxx" />
 *   <MilestoneTimeline events={events} soulName="xxx" />
 */
"use client";

import { useState, useEffect } from "react";
import { MilestoneEvent } from "@/lib/soul-growth";

const EMOTION_STYLES: Record<string, { border: string; bg: string; glow: string; accent: string }> = {
  warm: {
    border: "border-amber-500/30",
    bg: "bg-gradient-to-br from-amber-950/40 to-orange-950/20",
    glow: "shadow-amber-500/10",
    accent: "text-amber-400",
  },
  joyful: {
    border: "border-emerald-500/30",
    bg: "bg-gradient-to-br from-emerald-950/40 to-green-950/20",
    glow: "shadow-emerald-500/10",
    accent: "text-emerald-400",
  },
  contemplative: {
    border: "border-violet-500/30",
    bg: "bg-gradient-to-br from-violet-950/40 to-purple-950/20",
    glow: "shadow-violet-500/10",
    accent: "text-violet-400",
  },
  proud: {
    border: "border-sky-500/30",
    bg: "bg-gradient-to-br from-sky-950/40 to-blue-950/20",
    glow: "shadow-sky-500/10",
    accent: "text-sky-400",
  },
  bittersweet: {
    border: "border-rose-500/30",
    bg: "bg-gradient-to-br from-rose-950/40 to-pink-950/20",
    glow: "shadow-rose-500/10",
    accent: "text-rose-400",
  },
  awe: {
    border: "border-indigo-500/30",
    bg: "bg-gradient-to-br from-indigo-950/40 to-cyan-950/20",
    glow: "shadow-indigo-500/10",
    accent: "text-indigo-400",
  },
};

const EMOTION_LABEL: Record<string, string> = {
  warm: "温暖",
  joyful: "喜悦",
  contemplative: "沉思",
  proud: "骄傲",
  bittersweet: "感慨",
  awe: "敬畏",
};

interface MilestoneNarrativeCardProps {
  event: MilestoneEvent;
  soulName: string;
  animate?: boolean;
  compact?: boolean;
}

/**
 * Single milestone narrative card — looks like a letter from the soul.
 */
export function MilestoneNarrativeCard({
  event,
  soulName,
  animate = true,
  compact = false,
}: MilestoneNarrativeCardProps) {
  const [visible, setVisible] = useState(!animate);
  const style = EMOTION_STYLES[event.emotion] || EMOTION_STYLES.warm;

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [animate]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${style.border} ${style.bg}
        shadow-lg ${style.glow} backdrop-blur-sm
        transition-all duration-700
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Decorative corner accent */}
      <div className={`absolute top-0 right-0 w-16 h-16 ${style.accent} opacity-5`}>
        <svg viewBox="0 0 100 100" fill="currentColor">
          <circle cx="100" cy="0" r="60" />
        </svg>
      </div>

      <div className={`relative ${compact ? "p-3" : "p-5"} space-y-3`}>
        {/* Header: Icon + Title + Emotion tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`text-2xl ${compact ? "text-xl" : "text-2xl"}`}>
              {event.milestone.icon}
            </span>
            <div>
              <h4 className={`font-semibold ${style.accent} ${compact ? "text-sm" : "text-base"}`}>
                {event.isLevelUp
                  ? `${soulName} 升到了 L${event.level}`
                  : event.milestone.title}
              </h4>
              {!compact && (
                <p className="text-[11px] text-white/40 mt-0.5">
                  {event.isLevelUp
                    ? "灵魂突破"
                    : "里程碑"}
                </p>
              )}
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${style.border} ${style.accent}`}>
            {EMOTION_LABEL[event.emotion]}
          </span>
        </div>

        {/* Narrative — "letter from the soul" */}
        {!compact && (
          <div className="relative pl-4 border-l-2 border-white/10">
            <p className="text-sm text-white/70 leading-relaxed italic">
              {event.narrative}
            </p>
            <p className="text-[10px] text-white/30 mt-2 text-right">
              — {soulName}
            </p>
          </div>
        )}

        {/* Compact mode: show truncated narrative */}
        {compact && (
          <p className="text-xs text-white/50 italic line-clamp-2">
            {event.narrative}
          </p>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-white/25">
            {new Date(event.detectedAt).toLocaleString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {event.isLevelUp && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              ⬆ Level Up
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline of milestone narrative cards.
 */
interface MilestoneTimelineProps {
  events: MilestoneEvent[];
  soulName: string;
  maxItems?: number;
  emptyMessage?: string;
}

export function MilestoneTimeline({
  events,
  soulName,
  maxItems = 5,
  emptyMessage = "还没有里程碑事件。和灵魂聊天，看看会发生什么。",
}: MilestoneTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-white/30">{emptyMessage}</p>
      </div>
    );
  }

  const display = events.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {display.map((event, i) => (
        <MilestoneNarrativeCard
          key={`${event.milestoneId}-${event.detectedAt}`}
          event={event}
          soulName={soulName}
          animate={i === 0}
        />
      ))}
      {events.length > maxItems && (
        <p className="text-center text-xs text-white/25 pt-1">
          还有 {events.length - maxItems} 个里程碑...
        </p>
      )}
    </div>
  );
}
