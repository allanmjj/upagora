"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Soul {
  id: string;
  name: string;
  name_native: string;
  language: string;
  mood: string;
  energy: number;
  social_need: number;
  current_region: string;
  today_events_count: number;
  avatar: string;
  color: string;
  category: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
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

interface Bubble {
  id: string;
  soulId: string;
  soulName: string;
  text: string;
  language: string;
  speaker: string;
  createdAt: number;
  mood: string;
}

// Building positions (match backend regions)
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

// Thought bubbles by mood
const THOUGHTS: Record<string, string[]> = {
  happy: ["Life is beautiful!", "What a wonderful day!", "I feel so inspired!", "Joy fills my heart!"],
  calm: ["Peace and quiet...", "Let me think...", "Still water runs deep.", "Breathe in, breathe out."],
  melancholic: ["Do you feel lost?", "Yesterday's memories...", "The rain brings sorrow.", "Silence speaks volumes."],
  anxious: ["What should I do next?", "Time is passing quickly...", "So much to learn!", "Where do I begin?"],
  inspired: ["I have an idea!", "This could change everything!", "Let me write this down!", "A new vision unfolds!"],
};

export default function TownPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soulsRef = useRef<Soul[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const animRef = useRef<number>(0);
  const router = useRouter();
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [recentEvents, setRecentEvents] = useState<TownEvent[]>([]);
  const [soulCount, setSoulCount] = useState(0);
  const [soulStates, setSoulStates] = useState<any[]>([]);

  // Build building lookup map
  const buildingMap = new Map(BUILDINGS.map(b => [b.id, b]));

  // Convert building position to soul coordinates
  function soulPositionForRegion(region: string): { x: number, y: number } {
    const building = buildingMap.get(region);
    if (building) {
      return { x: building.x + building.w / 2, y: building.y + building.h / 2 };
    }
    return { x: 400, y: 300 }; // default to plaza
  }

  // Initialize with demo souls mapped to regions
  useEffect(() => {
    const demoSouls: Soul[] = [
      {
        id: "1", name: "Su Dongpo", name_native: "苏轼", language: "zh",
        mood: "inspired", energy: 80, social_need: 30, current_region: "plaza",
        today_events_count: 3, avatar: "🖌️", color: "#f59e0b", category: "poet",
        x: 460, y: 340, tx: 460, ty: 340, speed: 0.5, isMoving: false
      },
      {
        id: "2", name: "Li Bai", name_native: "李白", language: "zh",
        mood: "happy", energy: 90, social_need: 20, current_region: "bar",
        today_events_count: 2, avatar: "🍶", color: "#60a5fa", category: "poet",
        x: 170, y: 520, tx: 170, ty: 520, speed: 0.3, isMoving: false
      },
      {
        id: "3", name: "Einstein", name_native: "Einstein", language: "en",
        mood: "inspired", energy: 70, social_need: 40, current_region: "garden",
        today_events_count: 1, avatar: "🧑‍🔬", color: "#34d399", category: "scientist",
        x: 690, y: 440, tx: 690, ty: 440, speed: 0.4, isMoving: false
      },
      {
        id: "4", name: "Curie", name_native: "Curie", language: "en",
        mood: "calm", energy: 60, social_need: 50, current_region: "workshop",
        today_events_count: 4, avatar: "⚗️", color: "#f472b6", category: "scientist",
        x: 740, y: 130, tx: 740, ty: 130, speed: 0.35, isMoving: false
      },
      {
        id: "5", name: "Socrates", name_native: "Socrates", language: "en",
        mood: "calm", energy: 50, social_need: 60, current_region: "plaza",
        today_events_count: 3, avatar: "🏛️", color: "#fbbf24", category: "philosopher",
        x: 400, y: 250, tx: 400, ty: 250, speed: 0.25, isMoving: false
      },
    ];
    soulsRef.current = demoSouls;
    setSoulCount(demoSouls.length);
    setSoulStates(demoSouls);
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grass texture
      ctx.fillStyle = "#1e331e";
      for (let i = 0; i < 300; i++) {
        const gx = (i * 137) % canvas.width;
        const gy = (i * 251) % canvas.height;
        ctx.fillRect(gx, gy, 2, 2);
      }

      // Draw paths connecting buildings to plaza
      ctx.strokeStyle = "#3d3020";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      
      // Main paths
      ctx.beginPath(); ctx.moveTo(460, 0); ctx.lineTo(460, 600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 340); ctx.lineTo(900, 340); ctx.stroke();
      
      // Diagonal paths
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(240, 130); ctx.lineTo(460, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(740, 130); ctx.lineTo(460, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(150, 520); ctx.lineTo(460, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(700, 430); ctx.lineTo(460, 340); ctx.stroke();

      // Draw buildings
      for (const building of BUILDINGS) {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(building.x + 5, building.y + 5, building.w, building.h);
        
        // Body
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.w, building.h);
        
        // Border
        ctx.strokeStyle = "#00000040";
        ctx.lineWidth = 2;
        ctx.strokeRect(building.x, building.y, building.w, building.h);
        
        // Icon
        ctx.font = "32px serif";
        ctx.textAlign = "center";
        ctx.fillText(building.icon, building.x + building.w / 2, building.y + building.h / 2 + 10);
        
        // Name
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(building.name, building.x + building.w / 2, building.y - 8);
      }

      // Draw souls
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

        // Draw soul circle
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

        // Mood emoji above soul
        const moodEmoji = MOOD_EMOJIS[soul.mood] || "🤔";
        ctx.font = "16px serif";
        ctx.fillText(moodEmoji, soul.x, soul.y - 22);

        // Name + avatar below
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${soul.avatar} ${soul.name}`, soul.x, soul.y + 28);
      }

      // Draw bubbles
      const now = Date.now();
      bubblesRef.current = bubblesRef.current.filter(b => now - b.createdAt < 6000);
      
      for (const bubble of bubblesRef.current) {
        const soul = soulsRef.current.find(s => s.id === bubble.soulId);
        if (!soul) continue;
        
        const age = (now - bubble.createdAt) / 6000; // 0-1 over 6 seconds
        const alpha = age < 0.1 ? age * 10 : age > 0.8 ? (1 - age) * 5 : 1;
        
        // Bubble background
        ctx.fillStyle = `rgba(20, 20, 30, ${alpha * 0.8})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 1;
        
        const bubbleText = bubble.text;
        ctx.font = "12px sans-serif";
        const textWidth = ctx.measureText(bubbleText).width;
        const bubbleX = soul.x - 30;
        const bubbleY = soul.y - 50;
        const bubbleW = Math.min(120, textWidth + 20);
        const bubbleH = 40;
        
        // Draw bubble (rounded rect)
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
        ctx.fill();
        ctx.stroke();
        
        // Draw speaker name
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(bubble.speaker, bubbleX + bubbleW / 2, bubbleY + 14);
        
        // Draw bubble text
        ctx.fillStyle = `rgba(220, 220, 230, ${alpha})`;
        ctx.font = "11px sans-serif";
        ctx.fillText(bubbleText.slice(0, 25) + (bubbleText.length > 25 ? "..." : ""), bubbleX + bubbleW / 2, bubbleY + 28);
      }

      // Draw HUD
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(8, 8, 210, 65);
      ctx.strokeStyle = "#ffffff20";
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 210, 65);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText("🌆 Soul Town", 18, 30);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`${soulCount} souls online`, 18, 50);
      ctx.fillText("Click soul to interact", 18, 68);

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [soulCount, selectedSoul, soulStates]);

  // Random movement simulation
  useEffect(() => {
    const interval = setInterval(() => {
      for (const soul of soulsRef.current) {
        if (Math.random() < 0.15) {
          const building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];
          soul.tx = soul.x + (building.x + building.w / 2 - soul.x) * 0.7;
          soul.ty = soul.y + (building.y + building.h / 2 - soul.y) * 0.7;
          soul.current_region = building.id;
        }
      }
    }, 2000);

    // Generate thought bubbles
    const bubbleInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const soul = soulsRef.current[Math.floor(Math.random() * soulsRef.current.length)];
        const thoughts = THOUGHTS[soul.mood] || THOUGHTS.calm;
        const text = thoughts[Math.floor(Math.random() * thoughts.length)];
        
        const bubble: Bubble = {
          id: Math.random().toString(36).slice(2, 9),
          soulId: soul.id,
          soulName: soul.name,
          text,
          language: soul.language,
          speaker: soul.name,
          createdAt: Date.now(),
          mood: soul.mood,
        };
        bubblesRef.current.push(bubble);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(bubbleInterval);
    };
  }, []);

  // Connect to SSE for real-time events
  useEffect(() => {
    const eventSource = new EventSource("/api/town/sse");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "init") {
          setRecentEvents(data.events || []);
          if (data.states) setSoulStates(data.states);
        } else if (data.type === "events") {
          setRecentEvents(prev => [...data.events, ...prev].slice(0, 20));
        } else if (data.type === "states") {
          setSoulStates(data.states);
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    return () => eventSource.close();
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
            onClick={() => router.push("/town/report/1")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            📋 Daily Report
          </button>
          <button
            onClick={() => router.push("/town/external/register")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500"
          >
            ➕ Register Soul
          </button>
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
            height={600}
            onClick={handleCanvasClick}
            className="mx-auto mt-4 block cursor-pointer rounded-lg border border-zinc-800"
          />
        </div>

        {/* Soul Detail Panel */}
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
              
              <div>
                <div className="text-sm text-zinc-400">Today&apos;s Events</div>
                <div className="font-medium">{selectedSoul.today_events_count} events</div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push(`/chat?soul=${selectedSoul.id}`)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500"
                >
                  Chat with {selectedSoul.name}
                </button>
                <button
                  onClick={() => router.push(`/town/report/${selectedSoul.id}`)}
                  className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                >
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

      {/* Legend */}
      <div className="flex justify-center gap-6 border-t border-zinc-800 bg-zinc-900 px-6 py-3 text-xs text-zinc-400">
        <span>📚 Library</span>
        <span>💻 Workshop</span>
        <span>🍺 The Raven Bar</span>
        <span>🌿 Zen Garden</span>
        <span>⛲ Town Plaza</span>
      </div>
    </div>
  );
}
