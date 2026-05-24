"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Soul {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  activity: string;
  isMoving: boolean;
}

interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
  type: string;
}

const BUILDINGS: Building[] = [
  { id: "plaza", name: "Town Plaza", x: 400, y: 300, width: 120, height: 80, color: "#f59e0b", icon: "⛲", type: "plaza" },
  { id: "library", name: "Library", x: 200, y: 100, width: 100, height: 70, color: "#3b82f6", icon: "📚", type: "library" },
  { id: "workshop", name: "Workshop", x: 700, y: 100, width: 100, height: 70, color: "#10b981", icon: "💻", type: "work" },
  { id: "bar", name: "Social Bar", x: 150, y: 500, width: 100, height: 70, color: "#8b5cf6", icon: "🍺", type: "bar" },
  { id: "mine", name: "Mine", x: 800, y: 500, width: 100, height: 70, color: "#6b7280", icon: "⛏️", type: "mine" },
  { id: "market", name: "Market", x: 550, y: 200, width: 100, height: 70, color: "#ef4444", icon: "🏪", type: "market" },
  { id: "garden", name: "Garden", x: 650, y: 400, width: 100, height: 70, color: "#22c55e", icon: "🌿", type: "garden" },
];

const SOUL_COLORS = ["#f472b6", "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#2dd4bf"];

export default function TownPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soulsRef = useRef<Soul[]>([]);
  const animRef = useRef<number>(0);
  const [viewMode, setViewMode] = useState<"top" | "iso">("top");
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [soulCount, setSoulCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize with demo souls
    soulsRef.current = [
      { id: "1", name: "Trump", x: 460, y: 340, targetX: 460, targetY: 340, speed: 0.5, color: "#ef4444", activity: "social", isMoving: false },
      { id: "2", name: "Socrates", x: 250, y: 130, targetX: 250, targetY: 130, speed: 0.3, color: "#60a5fa", activity: "learn", isMoving: false },
      { id: "3", name: "Curie", x: 750, y: 130, targetX: 750, targetY: 130, speed: 0.4, color: "#34d399", activity: "work", isMoving: false },
      { id: "4", name: "Da Vinci", x: 550, y: 430, targetX: 550, targetY: 430, speed: 0.6, color: "#fbbf24", activity: "create", isMoving: false },
      { id: "5", name: "Einstein", x: 350, y: 550, targetX: 350, targetY: 550, speed: 0.45, color: "#a78bfa", activity: "explore", isMoving: false },
    ];
    setSoulCount(5);

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background (grass)
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grass texture
      ctx.fillStyle = "#1e331e";
      for (let i = 0; i < 200; i++) {
        const gx = (i * 137) % canvas.width;
        const gy = (i * 251) % canvas.height;
        ctx.fillRect(gx, gy, 3, 3);
      }

      // Draw paths
      ctx.strokeStyle = "#3d3020";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";

      // Main cross roads
      ctx.beginPath();
      ctx.moveTo(460, 0);
      ctx.lineTo(460, 600);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 340);
      ctx.lineTo(900, 340);
      ctx.stroke();

      // Diagonal paths
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(250, 130);
      ctx.lineTo(460, 340);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(750, 130);
      ctx.lineTo(460, 340);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(150, 550);
      ctx.lineTo(460, 340);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(850, 550);
      ctx.lineTo(460, 340);
      ctx.stroke();

      // Draw buildings
      BUILDINGS.forEach((b) => {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(b.x + 5, b.y + 5, b.width, b.height);

        // Building body
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        // Border
        ctx.strokeStyle = "#00000040";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        // Icon
        ctx.font = "32px serif";
        ctx.textAlign = "center";
        ctx.fillText(b.icon, b.x + b.width / 2, b.y + b.height / 2 + 10);

        // Name
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(b.name, b.x + b.width / 2, b.y - 8);
      });

      // Draw souls
      soulsRef.current.forEach((soul) => {
        // Move towards target
        const dx = soul.targetX - soul.x;
        const dy = soul.targetY - soul.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
          soul.x += (dx / dist) * soul.speed * 1.5;
          soul.y += (dy / dist) * soul.speed * 1.5;
          soul.isMoving = true;
        } else {
          soul.isMoving = false;
        }

        // Draw soul body
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

        // Name label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(soul.name, soul.x, soul.y - 20);

        // Activity indicator
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#ffffffcc";
        const activityEmoji = {
          work: "💻", social: "🗣️", learn: "📖", create: "🎨",
          explore: "🔍", rest: "😴",
        }[soul.activity] || "🤔";
        ctx.fillText(activityEmoji, soul.x, soul.y + 28);
      });

      // Draw HUD overlay
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

  // Random soul movement simulation
  useEffect(() => {
    const interval = setInterval(() => {
      soulsRef.current.forEach((soul) => {
        if (Math.random() < 0.15) {
          // Pick a random building as target
          const building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];
          soul.targetX = soul.x + (building.x + building.width / 2 - soul.x) * 0.7;
          soul.targetY = soul.y + (building.y + building.height / 2 - soul.y) * 0.7;
          const activities = ["work", "social", "learn", "create", "explore", "rest"];
          soul.activity = activities[Math.floor(Math.random() * activities.length)];
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Click handler for souls
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
            onClick={() => router.push("/soul")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            ← Soul Center
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Canvas Area */}
        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            width={900}
            height={650}
            onClick={handleCanvasClick}
            className="mx-auto mt-4 block cursor-pointer rounded-lg border border-zinc-800"
          />
        </div>

        {/* Soul Detail Panel */}
        {selectedSoul && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedSoul.name}</h2>
              <button
                onClick={() => setSelectedSoul(null)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-zinc-400">Current Activity</div>
                <div className="font-medium capitalize">
                  {selectedSoul.activity === "work" && "💻 Working"}
                  {selectedSoul.activity === "social" && "🗣️ Socializing"}
                  {selectedSoul.activity === "learn" && "📖 Learning"}
                  {selectedSoul.activity === "create" && "🎨 Creating"}
                  {selectedSoul.activity === "explore" && "🔍 Exploring"}
                  {selectedSoul.activity === "rest" && "😴 Resting"}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400">Position</div>
                <div className="font-mono text-sm">
                  ({Math.round(selectedSoul.x)}, {Math.round(selectedSoul.y)})
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push(`/soul`)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500"
                >
                  Chat with {selectedSoul.name}
                </button>
                <button className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                  View Memories
                </button>
                <button className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                  Daily Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 border-t border-zinc-800 bg-zinc-900 px-6 py-3 text-xs text-zinc-400">
        <span>📚 Library</span>
        <span>💻 Workshop</span>
        <span>🍺 Social Bar</span>
        <span>⛏️ Mine</span>
        <span>🏪 Market</span>
        <span>🌿 Garden</span>
        <span>⛲ Plaza</span>
      </div>
    </div>
  );
}
