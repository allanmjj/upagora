"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Soul {
  id: string;
  name: string;
  avatar: string;
  color: string;
  mood: "happy" | "calm" | "melancholic" | "anxious" | "inspired";
  language: string;
  location: string;
  energy: number;
  social_need: number;
  x: number;
  y: number;
  x: number;
  y: number;
  speed: number;
  isMoving: boolean;
}

interface TownEvent {
  id: number;
  event_type: string;
  space: string;
  content: any;
  summary: string;
  created_at: string;
}

// Building positions
const BUILDINGS = [
  { id: "plaza", name: "Town Plaza", x: 400, y: 300, w: 120, h: 80, color: "#f59e0b", icon: "⛲" },
  { id: "library", name: "Library", x: 200, y: 100, w: 100, h: 70, color: "#3b82f6", icon: "📚" },
  { id: "workshop", name: "Workshop", x: 700, y: 100, w: 100, h: 70, color: "#10b981", icon: "💻" },
  { id: "bar", name: "The Raven Bar", x: 150, y: 500, w: 100, h: 70, color: "#8b5cf6", icon: "🍺" },
  { id: "garden", name: "Zen Garden", x: 650, y: 400, w: 100, h: 70, color: "#22c55e", icon: "🌿" },
];

// Mood emoji mapping
const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  melancholic: "😔",
  anxious: "😟",
  inspired: "✨",
};

export default function TownPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soulsRef = useRef<Soul[]>([]);
  const animRef = useRef<number>(0);
  const router = useRouter();
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [recentEvents, setRecentEvents] = useState<TownEvent[]>([]);
  const [soulCount, setSoulCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Demo souls
    soulsRef.current = [
      { id: "1", name: "Su Dongpo", avatar: "🖌️", color: "#f59e0b", mood: "inspired", language: "zh", location: "plaza", energy: 80, social_need: 30, x: 460, y: 340, x: 460, y: 340, speed: 0.5, isMoving: false },
      { id: "2", name: "Li Bai", avatar: "🍶", color: "#60a5fa", mood: "happy", language: "zh", location: "bar", energy: 90, social_need: 20, x: 170, y: 520, x: 170, y: 520, speed: 0.3, isMoving: false },
      { id: "3", name: "Einstein", avatar: "🧑‍🔬", color: "#34d399", mood: "inspired", language: "en", location: "garden", energy: 70, social_need: 40, x: 690, y: 440, x: 690, y: 440, speed: 0.4, isMoving: false },
      { id: "4", name: "Curie", avatar: "⚗️", color: "#f472b6", mood: "calm", language: "en", location: "library", energy: 60, social_need: 50, x: 240, y: 130, x: 240, y: 130, speed: 0.35, isMoving: false },
      { id: "5", name: "Socrates", avatar: "🏛️", color: "#fbbf24", mood: "calm", language: "en", location: "plaza", energy: 50, social_need: 60, x: 460, y: 360, x: 460, y: 360, speed: 0.25, isMoving: false },
    ];
    setSoulCount(5);

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grass texture
      ctx.fillStyle = "#1e331e";
      for (let i = 0; i < 300; i++) {
        const gx = (i * 137) % canvas.width;
        const gy = (i * 251) % canvas.height;
        ctx.fillRect(gx, gy, 2, 2);
      }

      // Paths
      ctx.strokeStyle = "#3d3020";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(420, 0); ctx.lineTo(420, 650); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 340); ctx.lineTo(900, 340); ctx.stroke();
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(240, 130); ctx.lineTo(420, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(740, 130); ctx.lineTo(420, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(150, 520); ctx.lineTo(420, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(700, 480); ctx.lineTo(420, 340); ctx.stroke();

      // Buildings
      for (const b of BUILDINGS) {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);
        // Body
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Border
        ctx.strokeStyle = "#00000040";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        // Icon
        ctx.font = "32px serif";
        ctx.textAlign = "center";
        ctx.fillText(b.icon, b.x + b.w / 2, b.y + b.h / 2 + 10);
        // Name
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(b.name, b.x + b.w / 2, b.y - 8);
      }

      // Souls
      for (const soul of soulsRef.current) {
        // Move towards target
        const dx = soul.tx - soul.x;
        const dy = soul.ty - soul.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          soul.x += (dx / dist) * soul.speed * 1.5;
          soul.y += (dy / dist) * soul.speed * 1.5;
          soul.isMoving = true;
        } else {
          soul.isMoving = false;
        }

        // Body
        ctx.beginPath();
        ctx.arc(soul.x, soul.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = soul.color;
        ctx.fill();
        ctx.strokeStyle = "#00000060";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Selection highlight
        if (selectedSoul?.id === soul.id) {
          ctx.beginPath();
          ctx.arc(soul.x, soul.y, 20, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff80";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Mood emoji above
        const moodEmoji = MOOD_EMOJIS[soul.mood] || "🤔";
        ctx.font = "16px serif";
        ctx.fillText(moodEmoji, soul.x, soul.y - 22);

        // Name + avatar
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${soul.avatar} ${soul.name}`, soul.x, soul.y + 28);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(8, 8, 200, 65);
      ctx.strokeStyle = "#ffffff20";
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 200, 65);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText("🌆 Soul Town", 18, 30);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`${soulCount} souls active`, 18, 50);
      ctx.fillText("Click soul to interact", 18, 68);

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [soulCount, selectedSoul]);

  // Random movement
  useEffect(() => {
    const interval = setInterval(() => {
      // Each soul might move toward a random building
      for (const soul of soulsRef.current) {
        if (Math.random() < 0.15) {
          const building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];
          soul.tx = soul.x + (building.x + building.w / 2 - soul.x) * 0.7;
          soul.ty = soul.y + (building.y + building.h / 2 - soul.y) * 0.7;
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent events
  useEffect(() => {
    fetch("/api/town/events?limit=20")
      .then(res => res.json())
      .then(data => setRecentEvents(data.events || []))
      .catch(console.error);
  }, []);

  // Click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const soul of soulsRef.current) {
      const dx = x - soul.x;
      const dy = y - soul.y;
      if (dx * dx + dy * dy < 400) {
        setSelectedSoul(soul);
        return;
      }
    }
    setSelectedSoul(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🌆 Soul Town</h1>
          <span className="text-sm text-zinc-400">where souls live, work, and grow</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Canvas */}
        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            width={900}
            height={650}
            onClick={handleCanvasClick}
            className="mx-auto mt-4 block cursor-pointer rounded-lg border border-zinc-800"
          />
        </div>

        {/* Soul Detail */}
        {selectedSoul && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedSoul.name}</h2>
              <button onClick={() => setSelectedSoul(null)} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-zinc-400">Current Mood</div>
                <div className="font-medium">{MOOD_EMOJIS[selectedSoul.mood]} {selectedSoul.mood}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-400">Energy</div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${selectedSoul.energy}%` }} />
                </div>
                <div className="mt-1 text-xs text-zinc-400">{selectedSoul.energy}%</div>
              </div>
              <div>
                <div className="text-sm text-zinc-400">Social Energy</div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${selectedSoul.social_need}%` }} />
                </div>
                <div className="mt-1 text-xs text-zinc-400">{selectedSoul.social_need}%</div>
              </div>
              <div className="flex flex-col gap-2 pt-20">
                <button
                  onClick={() => router.push(`/chat?soul=${selectedSoul.id}`)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500"
                >
                  Chat with {selectedSoul.name}
                </button>
                <button className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                  Daily Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Town Feed */}
      <div className="mx-auto mt-6 w-full max-w-4xl px-4">
        <h2 className="mb-3 text-lg font-bold">📰 Town Feed</h2>
        <div className="space-y-3">
          {recentEvents.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center text-zinc-500">
              The town is quiet. Events will appear here as souls interact.
            </div>
          )}
          {recentEvents.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
                <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
                <span>•</span>
                <span className="capitalize">{ev.event_type}</span>
                <span>•</span>
                <span>{ev.space}</span>
              </div>
              <div className="text-zinc-300">{ev.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
