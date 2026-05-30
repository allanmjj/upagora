"use client";

import { useEffect, useRef } from "react";

// ─── Day/Night Canvas overlay ─────────────────────────────────────
// Draws sky gradient, stars, sun/moon, fog, fireflies based on current hour.
// Pass as overlay div behind the main town canvas.

const SEASON_PRESETS: Record<number, { skyDawn: string; skyDay: string; skyDusk: string; skyNight: string; fog: string }> = {
  0: { // Spring
    skyDawn: "from-rose-900 via-pink-700 to-amber-500",
    skyDay: "from-sky-400 via-sky-300 to-emerald-200",
    skyDusk: "from-purple-900 via-rose-700 to-amber-600",
    skyNight: "from-indigo-950 via-slate-900 to-gray-950",
    fog: "from-transparent via-pink-100/5 to-transparent",
  },
  1: { // Summer
    skyDawn: "from-amber-900 via-orange-600 to-yellow-400",
    skyDay: "from-cyan-500 via-sky-400 to-emerald-300",
    skyDusk: "from-red-900 via-orange-700 to-amber-500",
    skyNight: "from-slate-950 via-black to-gray-950",
    fog: "from-transparent via-emerald-100/5 to-transparent",
  },
  2: { // Autumn
    skyDawn: "from-orange-900 via-amber-700 to-yellow-500",
    skyDay: "from-sky-500 via-orange-300 to-amber-200",
    skyDusk: "from-red-950 via-orange-800 to-amber-600",
    skyNight: "from-stone-950 via-slate-900 to-gray-950",
    fog: "from-transparent via-amber-100/5 to-transparent",
  },
  3: { // Winter
    skyDawn: "from-slate-900 via-gray-700 to-blue-600",
    skyDay: "from-blue-500 via-blue-400 to-slate-200",
    skyDusk: "from-indigo-950 via-purple-900 to-blue-800",
    skyNight: "from-gray-950 via-slate-950 to-black",
    fog: "from-transparent via-blue-100/5 to-transparent",
  },
};

interface DayNightOverlayProps {
  hour: number;
  seasonIndex: number;
  width?: number;
  height?: number;
}

function getSkyGradient(hour: number, season: number): string {
  const p = SEASON_PRESETS[season] || SEASON_PRESETS[0];
  if (hour >= 5 && hour < 7) return p.skyDawn;
  if (hour >= 7 && hour < 17) return p.skyDay;
  if (hour >= 17 && hour < 20) return p.skyDusk;
  return p.skyNight;
}

function getFog(hour: number, season: number): string {
  const p = SEASON_PRESETS[season] || SEASON_PRESETS[0];
  if (hour >= 5 && hour < 8) return p.fog;
  if (hour >= 18 && hour < 20) return p.fog;
  return "";
}

function getSunMoonPosition(hour: number, width: number): { x: number; y: number } {
  // Sunrise at 6, zenith at 12, sunset at 18
  const sunRise = 6;
  const sunSet = 18;
  const t = (hour - sunRise) / (sunSet - sunRise); // 0 to 1 arc
  const x = t * width;
  const y = -Math.sin(t * Math.PI) * 150 + 50; // arc height
  return { x, y };
}

function getStarPositions(seeded: number, seed: number): Array<{ x: number; y: number; size: number; opacity: number }> {
  const rand = (s: number) => ((Math.sin(s * 127.1 + seed) * 43758.5453) % 1 + 1) % 1;
  const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: rand(i + seed * 100) * 100,
      y: rand(i + seed * 200 + 50) * 60,
      size: rand(i + seed * 300) * 2 + 0.5,
      opacity: rand(i + seed * 400) * 0.5 + 0.3,
    });
  }
  return stars;
}

function getFireflyPositions(seeded: number, seed: number): Array<{ x: number; y: number; delay: number }> {
  const rand = (s: number) => ((Math.sin(s * 31.7 + seed) * 21139.5) % 1 + 1) % 1;
  const fireflies: Array<{ x: number; y: number; delay: number }> = [];
  for (let i = 0; i < 15; i++) {
    fireflies.push({
      x: rand(i * 10) * 90 + 5,
      y: rand(i * 20 + 50) * 50 + 30,
      delay: rand(i * 30 + 100) * 3,
    });
  }
  return fireflies;
}

export function DayNightOverlay({ hour, seasonIndex, width = 900, height = 600 }: DayNightOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isNight = hour < 5 || hour >= 20;
    const isDusk = hour >= 17 && hour < 20;
    const isDawn = hour >= 5 && hour < 7;
    const seed = Math.floor(Date.now() / 60000); // change every minute

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Stars (night only)
    if (isNight) {
      const stars = getStarPositions(0, seed || 42);
      stars.forEach((s) => {
        const twinkle = Math.sin(Date.now() / 1000 + s.x * 10) * 0.3;
        ctx.globalAlpha = s.opacity + twinkle;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x / 100 * width, s.y / 100 * height, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Moon (night)
    if (isNight) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.arc(width * 0.75, 60, 30, 0, Math.PI * 2);
      ctx.fill();
      // Moon glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(width * 0.75, 60, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sun (day)
    if (!isNight) {
      const pos = getSunMoonPosition(hour, width);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + 80, 25, 0, Math.PI * 2);
      ctx.fill();
      // Sun glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + 80, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Fog (dawn/dusk)
    if (isDawn || isDusk) {
      const gradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, `rgba(255, 255, 255, 0.08)`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);
    }

    // Fireflies (night)
    if (isNight) {
      const ff = getFireflyPositions(0, seed || 42);
      const now = Date.now() / 1000;
      ff.forEach((f) => {
        const pulse = Math.sin(now + f.delay) * 0.4 + 0.5;
        ctx.globalAlpha = pulse * 0.6;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(f.x / 100 * width, f.y / 100 * height, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }, [hour, seasonIndex, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Sky gradient provider (Tailwind class generator) ────────────
export function getSkyClass(hour: number, season: number): string {
  return getSkyGradient(hour, season);
}

export { getTownTime } from "./town-clock";