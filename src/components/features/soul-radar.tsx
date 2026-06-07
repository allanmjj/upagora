"use client";

import { useEffect, useRef } from "react";

interface DimensionData {
  label: string;
  score: number;
  color?: string;
}

interface SoulRadarProps {
  data?: DimensionData[];
  animating?: boolean;
  size?: number;
  showLabels?: boolean;
}

const DIMS = [
  { key: "cognitive_patterns", label: "Cognitive Patterns", color: "#6366f1" },
  { key: "value_judgment", label: "Value Judgment", color: "#8b5cf6" },
  { key: "expression_style", label: "Expression Style", color: "#a78bfa" },
  { key: "knowledge_structure", label: "Knowledge Structure", color: "#c4b5fd" },
  { key: "emotional_response", label: "Emotional Response", color: "#818cf8" },
  { key: "relationship_memory", label: "Relationship Map", color: "#7c3aed" },
  { key: "life_narrative", label: "Life Narrative", color: "#5b21b6" },
];

export function SoulRadar({
  data,
  animating = false,
  size = 300,
  showLabels = true,
}: SoulRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const targetRef = useRef<DimensionData[]>(data || []);
  const startTimeRef = useRef<number>(0);
  const activeRef = useRef<boolean>(animating);

  // Update target when data changes
  useEffect(() => {
    targetRef.current = data || [];
    if (!animating) {
      // Redraw with final data when animation stops
      drawFrame(null);
    }
  }, [data]);

  useEffect(() => {
    activeRef.current = animating;
    if (animating && data) {
      startTimeRef.current = performance.now();
      targetRef.current = data;
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [animating]);

  function drawFrame(elapsedMs: number | null) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.35;
    const n = DIMS.length;

    // Calculate current scores based on animation progress
    let progress = 1; // default: show final state
    if (activeRef.current && elapsedMs !== null) {
      progress = Math.min(elapsedMs / 4000, 1); // 4 seconds for full reveal
    }

    const targets = targetRef.current;
    const scores: number[] = [];
    for (let i = 0; i < n; i++) {
      const dimStart = i / n;
      const dimEnd = dimStart + 1 / n;
      const targetScore = targets[i]?.score ?? 0;
      if (progress < dimStart) {
        scores.push(0);
      } else if (progress > dimEnd) {
        scores.push(targetScore);
      } else {
        const dimProgress = (progress - dimStart) / (dimEnd - dimStart);
        scores.push(targetScore * dimProgress);
      }
    }

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2);
    gradient.addColorStop(0, "rgba(99,102,241,0.05)");
    gradient.addColorStop(1, "rgba(99,102,241,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const rr = (r / 5) * ring;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(99,102,241,0.08)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Axes
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(99,102,241,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Data polygon
    const hasData = scores.some((s) => s > 0);
    if (hasData) {
      // Glow layer
      ctx.save();
      ctx.shadowColor = "#6366f1";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const dr = r * scores[i];
        const x = cx + Math.cos(angle) * dr;
        const y = cy + Math.sin(angle) * dr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(99,102,241,0.2)";
      ctx.fill();
      ctx.restore();

      // Stroke
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const dr = r * scores[i];
        const x = cx + Math.cos(angle) * dr;
        const y = cy + Math.sin(angle) * dr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points with pulse
      for (let i = 0; i < n; i++) {
        if (scores[i] <= 0) continue;
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const dr = r * scores[i];
        const x = cx + Math.cos(angle) * dr;
        const y = cy + Math.sin(angle) * dr;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = DIMS[i].color + "40";
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = DIMS[i].color;
        ctx.fill();
      }
    }

    // Labels
    if (showLabels) {
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 20);
        const ly = cy + Math.sin(angle) * (r + 20);

        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (scores[i] > 0) {
          ctx.fillStyle = "rgba(165,180,252,0.9)";
          ctx.fillText(`${DIMS[i].label} ${(scores[i] * 100).toFixed(0)}%`, lx, ly);
        } else {
          ctx.fillStyle = "rgba(165,180,252,0.3)";
          ctx.fillText(DIMS[i].label, lx, ly);
        }
      }
    }
  }

  function animate(now: number) {
    const elapsed = now - startTimeRef.current;
    drawFrame(elapsed);
    if (elapsed < 4000 && activeRef.current) {
      frameRef.current = requestAnimationFrame(animate);
    }
  }

  // Initial draw
  useEffect(() => {
    drawFrame(null);
  }, []);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        style={{ width: size, maxWidth: "100%", height: "auto" }}
      />
    </div>
  );
}
