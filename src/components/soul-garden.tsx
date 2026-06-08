/**
 * Soul Garden — Personal space that grows with the soul.
 * 
 * Each soul has a garden that evolves as they level up.
 * Plants represent unlocked traits, trees show maturity,
 * flowers bloom from conversations, stars appear from internet discoveries.
 * 
 * Canvas-based for performance (60fps particles).
 */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SoulGrowth, SoulTrait } from "@/lib/soul-growth";

interface SoulGardenProps {
  growth: SoulGrowth;
  traits?: SoulTrait[];
  conversationCount: number;
  discoveryCount: number;
  className?: string;
}

// ─── Garden visual elements ─────────────────────────────────────

interface GardenElement {
  x: number;
  y: number;
  type: "tree" | "flower" | "star" | "crystal" | "butterfly" | "firefly" | "mushroom" | "compass";
  size: number;
  color: string;
  phase: number;      // animation phase offset
  speed: number;
}

const LEVEL_COLORS: Record<number, { bg: string; ground: string; aura: string }> = {
  1: { bg: "#1a1a2e", ground: "#2d4a2d", aura: "#f59e0b40" },
  2: { bg: "#1a2e1a", ground: "#3d6a3d", aura: "#22c55e40" },
  3: { bg: "#2e1a2e", ground: "#4a3d4a", aura: "#ec489940" },
  4: { bg: "#1a1a3e", ground: "#3d3d5a", aura: "#8b5cf640" },
  5: { bg: "#0a1a2e", ground: "#2a4a5a", aura: "#06b6d440" },
  6: { bg: "#2e1a0a", ground: "#5a4a2a", aura: "#f9731640" },
  7: { bg: "#1a0a2e", ground: "#4a2a5a", aura: "#a855f740" },
  8: { bg: "#0a0a2e", ground: "#2a2a5a", aura: "#6366f140" },
  9: { bg: "#2e0a1a", ground: "#5a2a3a", aura: "#e879f940" },
  10: { bg: "#1a1a0a", ground: "#5a5a2a", aura: "#fbbf2440" },
};

function generateGardenElements(growth: SoulGrowth, traits: SoulTrait[], convCount: number, discCount: number): GardenElement[] {
  const elements: GardenElement[] = [];
  const level = growth.level;

  // Central tree (grows with level)
  if (level >= 1) {
    const treeSize = 10 + level * 5;
    elements.push({
      x: 0, y: -treeSize / 2,
      type: "tree",
      size: treeSize,
      color: growth.levelInfo.color,
      phase: 0,
      speed: 0.3,
    });
  }

  // Flowers from conversations (1 flower per 3 conversations, max 20)
  const flowerCount = Math.min(Math.floor(convCount / 3), 20);
  for (let i = 0; i < flowerCount; i++) {
    const angle = (i / Math.max(flowerCount, 1)) * Math.PI * 2 + Math.random() * 0.3;
    const radius = 30 + Math.random() * 60;
    elements.push({
      x: Math.cos(angle) * radius,
      y: 10 + Math.sin(angle) * radius * 0.3,
      type: "flower",
      size: 4 + Math.random() * 4,
      color: `hsl(${(i * 37) % 360}, 70%, 65%)`,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
    });
  }

  // Stars from internet discoveries
  for (let i = 0; i < Math.min(discCount, 15); i++) {
    elements.push({
      x: (Math.random() - 0.5) * 200,
      y: -50 - Math.random() * 80,
      type: "star",
      size: 2 + Math.random() * 3,
      color: "#fde68a",
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2,
    });
  }

  // Trait-specific plants
  const traitPlants: Record<string, GardenElement["type"]> = {
    poet: "flower",
    artist: "crystal",
    philosopher: "crystal",
    explorer: "compass",
    scholar: "mushroom",
    mystic: "crystal",
    creator: "tree",
    oracle: "star",
    genesis: "star",
  };

  for (const trait of traits) {
    const plantType = traitPlants[trait.id] || "flower";
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 50;
    elements.push({
      x: Math.cos(angle) * radius,
      y: 5 + Math.sin(angle) * radius * 0.3,
      type: plantType,
      size: 6 + Math.random() * 4,
      color: growth.levelInfo.color,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4,
    });
  }

  // Butterflies at level 3+
  if (level >= 3) {
    for (let i = 0; i < Math.min(level - 1, 5); i++) {
      elements.push({
        x: (Math.random() - 0.5) * 180,
        y: -20 - Math.random() * 60,
        type: "butterfly",
        size: 5 + Math.random() * 3,
        color: `hsl(${Math.random() * 360}, 80%, 70%)`,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 1,
      });
    }
  }

  // Fireflies at level 5+
  if (level >= 5) {
    for (let i = 0; i < Math.min(level - 3, 10); i++) {
      elements.push({
        x: (Math.random() - 0.5) * 200,
        y: -10 - Math.random() * 70,
        type: "firefly",
        size: 2 + Math.random() * 2,
        color: "#fbbf24",
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 2,
      });
    }
  }

  return elements;
}

export function SoulGarden({ growth, traits = [], conversationCount = 0, discoveryCount = 0, className = "" }: SoulGardenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const elementsRef = useRef<GardenElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<GardenElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const colors = LEVEL_COLORS[growth.level] || LEVEL_COLORS[1];

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h * 0.7;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, colors.bg);
    bgGrad.addColorStop(0.7, colors.ground);
    bgGrad.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = colors.ground;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, w * 0.45, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura glow at level 6+
    if (growth.level >= 6) {
      const auraGrad = ctx.createRadialGradient(cx, cy - 40, 10, cx, cy - 40, 120);
      auraGrad.addColorStop(0, colors.aura);
      auraGrad.addColorStop(1, "transparent");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, w, h);
    }

    const elements = elementsRef.current;
    const t = time / 1000;

    for (const el of elements) {
      const px = cx + el.x;
      const py = cy + el.y + Math.sin(t * el.speed + el.phase) * 3;

      switch (el.type) {
        case "tree": {
          // Trunk
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(px - 3, py - el.size / 2, 6, el.size / 2);
          // Canopy
          ctx.fillStyle = el.color + "cc";
          ctx.beginPath();
          ctx.arc(px, py - el.size / 2, el.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          // Inner glow
          ctx.fillStyle = el.color + "40";
          ctx.beginPath();
          ctx.arc(px, py - el.size / 2, el.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "flower": {
          const petalAngle = t * el.speed + el.phase;
          for (let p = 0; p < 5; p++) {
            const a = petalAngle + (p / 5) * Math.PI * 2;
            ctx.fillStyle = el.color;
            ctx.beginPath();
            ctx.arc(px + Math.cos(a) * el.size * 0.5, py + Math.sin(a) * el.size * 0.5, el.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(px, py, el.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "star": {
          const twinkle = Math.sin(t * el.speed * 3 + el.phase) * 0.5 + 0.5;
          ctx.globalAlpha = 0.3 + twinkle * 0.7;
          ctx.fillStyle = el.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 === 0 ? el.size : el.size * 0.4;
            ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case "crystal": {
          ctx.fillStyle = el.color + "80";
          ctx.beginPath();
          ctx.moveTo(px, py - el.size);
          ctx.lineTo(px + el.size * 0.4, py);
          ctx.lineTo(px - el.size * 0.4, py);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = el.color + "40";
          ctx.beginPath();
          ctx.arc(px, py - el.size * 0.5, el.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "butterfly": {
          const bx = px + Math.sin(t * el.speed + el.phase) * 20;
          const by = py + Math.cos(t * el.speed * 0.7 + el.phase) * 10;
          const wingAngle = Math.sin(t * el.speed * 5) * 0.5;
          ctx.fillStyle = el.color;
          // Left wing
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(wingAngle);
          ctx.beginPath();
          ctx.ellipse(-3, 0, el.size, el.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // Right wing
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(-wingAngle);
          ctx.beginPath();
          ctx.ellipse(3, 0, el.size, el.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "firefly": {
          const ffAlpha = Math.sin(t * el.speed * 2 + el.phase) * 0.5 + 0.5;
          ctx.globalAlpha = ffAlpha;
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(px + Math.sin(t * el.speed + el.phase) * 15, py + Math.cos(t * el.speed * 0.5 + el.phase) * 10, el.size, 0, Math.PI * 2);
          ctx.fill();
          // Glow
          ctx.fillStyle = "#fbbf2440";
          ctx.beginPath();
          ctx.arc(px + Math.sin(t * el.speed + el.phase) * 15, py + Math.cos(t * el.speed * 0.5 + el.phase) * 10, el.size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case "compass": {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, el.size, 0, Math.PI * 2);
          ctx.stroke();
          // Needle
          const needleAngle = t * 0.3 + el.phase;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(needleAngle) * el.size * 0.8, py + Math.sin(needleAngle) * el.size * 0.8);
          ctx.stroke();
          break;
        }
        case "mushroom": {
          ctx.fillStyle = "#8b5cf6";
          ctx.fillRect(px - 2, py - el.size * 0.5, 4, el.size * 0.5);
          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.arc(px, py - el.size * 0.5, el.size * 0.6, Math.PI, 0);
          ctx.fill();
          break;
        }
      }
    }

    // Level indicator particles (orbiting)
    if (growth.level >= 8) {
      const orbitCount = growth.level - 6;
      for (let i = 0; i < orbitCount; i++) {
        const angle = (t * 0.5 + (i / orbitCount) * Math.PI * 2);
        const orbitR = 80 + i * 15;
        const ox = cx + Math.cos(angle) * orbitR;
        const oy = cy - 40 + Math.sin(angle) * orbitR * 0.3;
        ctx.fillStyle = growth.levelInfo.color + "80";
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [colors, growth.level, growth.levelInfo.color]);

  useEffect(() => {
    elementsRef.current = generateGardenElements(growth, traits, conversationCount, discoveryCount);
  }, [growth, traits, conversationCount, discoveryCount]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full h-48 md:h-64 rounded-xl border border-white/10 cursor-pointer"
        onMouseMove={handleMouseMove}
      />
      {/* Overlay info */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded bg-black/60 text-white/70 backdrop-blur-sm">
          {growth.levelInfo.particle} {growth.levelInfo.title} (Lv.{growth.level})
        </span>
        <span className="text-xs px-2 py-1 rounded bg-black/60 text-white/50 backdrop-blur-sm">
          🌸 {Math.min(Math.floor(conversationCount / 3), 20)} flowers
        </span>
        <span className="text-xs px-2 py-1 rounded bg-black/60 text-white/50 backdrop-blur-sm">
          ⭐ {Math.min(discoveryCount, 15)} stars
        </span>
      </div>
    </div>
  );
}
