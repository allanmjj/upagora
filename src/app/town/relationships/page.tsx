"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨", peace: "😇",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  close_friends: "#22c55e", friends: "#06b6d4", acquaintances: "#f97316", strangers: "#6b7280",
};

interface RelationshipData {
  network: {
    total_souls: number; total_pairs: number; avg_interactions: number; strongest_bond: number;
  };
  relationships: Array<{
    soul_a: { id: string; name: string; name_native: string; avatar: string; mood: string };
    soul_b: { id: string; name: string; name_native: string; avatar: string; mood: string };
    relationship_type: string; interaction_count: number; closeness: number;
    shared_spaces: string[]; last_interaction: string;
  }>;
}

export default function SoulRelationshipsPage() {
  const router = useRouter();
  const [data, setData] = useState<RelationshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/town/relationships");
        const json = await res.json();
        setData(json);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Simple force-directed visualization
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const souls = new Map<string, { x: number; y: number; vx: number; vy: number; name: string; name_native: string; avatar: string; mood: string }>();
    const edges: Array<{ a: string; b: string; closeness: number; rel_type: string }> = [];

    data.relationships.forEach((r: any) => {
      const keyA = r.soul_a.id;
      const keyB = r.soul_b.id;
      if (!souls.has(keyA)) souls.set(keyA, { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50, vx: 0, vy: 0, ...r.soul_a });
      if (!souls.has(keyB)) souls.set(keyB, { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50, vx: 0, vy: 0, ...r.soul_b });
      edges.push({ a: keyA, b: keyB, closeness: r.closeness, rel_type: r.relationship_type });
    });

    // Simple force simulation
    for (let iter = 0; iter < 50; iter++) {
      const nodes = Array.from(souls.values());
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);
          nodes[i].vx += (dx / dist) * force;
          nodes[i].vy += (dy / dist) * force;
          nodes[j].vx -= (dx / dist) * force;
          nodes[j].vy -= (dy / dist) * force;
        }
      }
      // Attraction along edges
      edges.forEach((e) => {
        const a = souls.get(e.a);
        const b = souls.get(e.b);
        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = 150 - e.closeness; // closer = shorter distance
          const force = (dist - idealDist) * 0.01;
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }
      });
      // Update positions
      nodes.forEach((n) => {
        n.x += n.vx * 0.5;
        n.y += n.vy * 0.5;
        n.vx *= 0.8;
        n.vy *= 0.8;
        n.x = Math.max(50, Math.min(450, n.x));
        n.y = Math.max(50, Math.min(350, n.y));
      });
    }

    // Draw
    ctx.clearRect(0, 0, 500, 400);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, 500, 400);

    // Draw edges
    edges.forEach((e) => {
      const a = souls.get(e.a);
      const b = souls.get(e.b);
      if (a && b) {
        ctx.strokeStyle = RELATIONSHIP_COLORS[e.rel_type] || "#6b7280";
        ctx.globalAlpha = e.closeness / 100;
        ctx.lineWidth = Math.max(1, e.closeness / 20);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Draw nodes
    souls.forEach((s) => {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px sans-serif";
      ctx.fillText(s.avatar || "👤", s.x, s.y);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#d4d4d8";
      ctx.fillText(s.name_native || s.name, s.x, s.y + 14);
    });
  }, [data]);

  const filtered = selectedFilter === "all"
    ? data?.relationships || []
    : (data?.relationships || []).filter((r) => r.relationship_type === selectedFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Loading relationships...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/town")} className="text-zinc-400 hover:text-white">
            ← Town
          </button>
          <h1 className="text-xl font-bold">🕸️ Soul Relationships</h1>
        </div>
        <div className="flex items-center gap-3">
          {["all", "close_friends", "friends", "acquaintances", "strangers"].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs capitalize transition-colors ${
                selectedFilter === f
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Network graph */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Network Graph</h2>
          <canvas ref={canvasRef} width={500} height={400} className="w-full rounded-lg" />
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-zinc-500">
            <span><span className="inline-block w-3 h-0.5 bg-green-500 rounded mr-1"></span>Close Friends</span>
            <span><span className="inline-block w-3 h-0.5 bg-cyan-500 rounded mr-1"></span>Friends</span>
            <span><span className="inline-block w-3 h-0.5 bg-orange-500 rounded mr-1"></span>Acquaintances</span>
            <span><span className="inline-block w-3 h-0.5 bg-gray-500 rounded mr-1"></span>Strangers</span>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Network Stats</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data?.network.total_souls || 0}</div>
              <div className="text-xs text-zinc-500">Total Souls</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data?.network.total_pairs || 0}</div>
              <div className="text-xs text-zinc-500">Connections</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data?.network.avg_interactions || 0}</div>
              <div className="text-xs text-zinc-500">Avg Interactions</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data?.network.strongest_bond || 0}%</div>
              <div className="text-xs text-zinc-500">Strongest Bond</div>
            </div>
          </div>

          {/* Relationships list */}
          <div className="text-xs text-zinc-500 mb-2">RELATIONSHIPS ({filtered.length})</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filtered.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60">
                <span>{r.soul_a.avatar || "👤"}</span>
                <span className="text-xs text-white min-w-[80px] truncate">{r.soul_a.name_native || r.soul_a.name}</span>
                <span className="text-zinc-600">—</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium`} style={{ backgroundColor: (RELATIONSHIP_COLORS[r.relationship_type] || "#6b7280") + "20", color: RELATIONSHIP_COLORS[r.relationship_type] || "#6b7280" }}>
                  {r.relationship_type.replace("_", " ")}
                </span>
                <span className="text-[10px] text-zinc-600">{r.interaction_count}x</span>
                <span className="text-zinc-600">—</span>
                <span className="text-xs text-white min-w-[80px] truncate">{r.soul_b.name_native || r.soul_b.name}</span>
                <span>{r.soul_b.avatar || "👤"}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-4 text-xs text-zinc-600">No relationships found for this filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
