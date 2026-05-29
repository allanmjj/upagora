"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TownClock } from "@/components/town-clock";
import { EraChronicle } from "@/components/town-chronicle-sidebar";
import { TownChatPanel } from "@/components/town-chat-panel";
import { SoulActivityBadge } from "@/components/town-activity-badge";
import { GuardianMessagePanel } from "@/components/town-guardian-message";
import { EncounterObserver, EncounterBadge } from "@/components/town-encounter-observer";

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSoul, setChatSoul] = useState<Soul | null>(null);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<TownEvent[]>([]);
  const [soulCount, setSoulCount] = useState(0);
  const [soulStates, setSoulStates] = useState<any[]>([]);
  const [encounterActive, setEncounterActive] = useState(false);
  const [encounterSouls, setEncounterSouls] = useState<{ soulA: Soul; soulB: Soul; space: string } | null>(null);
  const [encounterCount, setEncounterCount] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);

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

  // Fetch souls from live Supabase database + fallback to demo data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSouls() {
      try {
        const res = await fetch("/api/town/souls");
        const json = await res.json();
        if (json.souls && json.souls.length > 0) {
          const regionPositions: Record<string, { x: number; y: number }> = {
            plaza: { x: 400, y: 300 },
            library: { x: 200, y: 100 },
            workshop: { x: 700, y: 100 },
            bar: { x: 150, y: 500 },
            garden: { x: 650, y: 400 },
            teahouse: { x: 550, y: 500 },
          };
          const souls: Soul[] = json.souls.map((s: Soul) => {
            const pos = regionPositions[s.current_region] || { x: 400, y: 300 };
            const variance = Math.random() * 30 - 15;
            return {
              ...s,
              x: pos.x + variance,
              y: pos.y + variance,
              tx: pos.x,
              ty: pos.y,
              isMoving: false,
            };
          });
          soulsRef.current = souls;
          setSoulCount(souls.length);
          setSoulStates(souls);
        }
      } catch (e) {
        console.error("Failed to load souls from DB:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSouls();
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

      // Draw background with time-of-day color
      const bgC = ["#0a0f1a","#0a0f1a","#0d1220","#0d1220","#0d1220","#1a1830","#1a2e1a","#1e3c1e","#1e3c1e","#1e3c1e","#1e3c1e","#1a2a1a","#1a2a1a","#1e3c1e","#1e3c1e","#1e3c1e","#1e3c1e","#2a1a15","#1a1830","#0f1525","#0f1525","#0a0f1a","#0a0f1a","#0a0f1a"];
      ctx.fillStyle = bgC[nowH] || "#1a2e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Stars at night
      if (nowH >= 19 || nowH < 5) {
      ctx.fillStyle = "#ffffff60";
      for (let i = 0; i < 40; i++) {
      const sx = (i * 137) % canvas.width;
      const sy = (i * 251 + 50) % (canvas.height * 0.4);
      ctx.globalAlpha = Math.sin(Date.now() / 800 + i) * 0.5 + 0.5;
      ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
      }

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
      const nowH = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000).getHours();
      const acts = [{l:'😴 Resting'},{'l':'😴 Resting'},{'l':'🧘 Meditating'},{'l':'🧘 Meditating'},{'l':'🧘 Meditating'},{'l':'🌅 Waking'},{'l':'☀️ Morning'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'🍱 Lunch'},{'l':'🍱 Lunch'},{'l':'📖 Studying'},{'l':'📖 Studying'},{'l':'🔨 Working'},{'l':'🔨 Working'},{'l':'🍻 Social'},{'l':'🍻 Social'},{'l':'🌆 Gathering'},{'l':'🌆 Gathering'},{'l':'🌙 Winding'},{'l':'🌙 Resting'},{'l':'🌙 Resting'}];
      const actLabel = acts[nowH] ? acts[nowH].l : '😴 Resting';
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#000000cc";
      ctx.fillText(actLabel, 18, 68);
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

  // Poll for live encounters
  useEffect(() => {
    const pollEncounters = async () => {
      try {
        const res = await fetch("/api/town/encounter?qry=recent");
        if (res.ok) {
          const data = await res.json();
          const liveEncounters = (data.encounters || []).filter((e: any) => e.is_live);
          setEncounterCount(liveEncounters.length);
          if (liveEncounters.length > 0 && !encounterActive) {
            const enc = liveEncounters[0];
            const soulA = soulsRef.current.find(s => s.id === enc.soul1_id);
            const soulB = soulsRef.current.find(s => s.id === enc.soul2_id);
            if (soulA && soulB) {
              setEncounterSouls({ soulA, soulB, space: enc.space || "plaza" });
            }
          }
        }
      } catch (e) {
        // Silently fail — encounter polling is non-critical
        console.debug("Encounter poll failed:", e);
      }
    };
    pollEncounters();
    const interval = setInterval(pollEncounters, 15000);
    return () => clearInterval(interval);
  }, [encounterActive]);

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
          <TownClock size="compact" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChronicleOpen(true)}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            📜 Chronicle
          </button>
          <button
            onClick={() => setTimeFrozen(f => !f)}
            className={`rounded-lg px-4 py-2 text-sm ${timeFrozen ? "bg-blue-600 hover:bg-blue-500" : "bg-zinc-800 hover:bg-zinc-700"}`}
            title={timeFrozen ? "Unfreeze town time" : "Freeze town time"}
          >
            {timeFrozen ? "❄️ Time Frozen" : "⏱️ Freeze Time"}
          </button>
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
          <EncounterBadge count={encounterCount} onClick={() => encounterSouls && setEncounterActive(true)} />
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
                  onClick={() => { setChatOpen(true); setChatSoul(selectedSoul); }}
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
                <button
                  onClick={() => { setMessageOpen(true); setChatSoul(selectedSoul); }}
                  className="w-full rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-2 text-sm text-amber-400 hover:bg-amber-900/40"
                >
                  💌 Send Message
                </button>
              </div>
            </div>
          </div>
        )}
        {chatOpen && chatSoul && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">💬 Chat</h2>
              <button onClick={() => { setChatOpen(false); setChatSoul(null); }} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TownChatPanel soul={chatSoul} onClose={() => { setChatOpen(false); setChatSoul(null); }} />
            </div>
          </div>
        )}
        {messageOpen && chatSoul && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">💌 Message</h2>
              <button onClick={() => setMessageOpen(false)} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <GuardianMessagePanel soul={chatSoul} onSent={() => setMessageOpen(false)} />
            </div>
          </div>
        )}
        {chronicleOpen && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 h-[600px]">
            <EraChronicle onClose={() => setChronicleOpen(false)} />
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

      {/* Encounter Observer Modal */}
      {encounterActive && encounterSouls && (
        <EncounterObserver
          soulA={encounterSouls.soulA}
          soulB={encounterSouls.soulB}
          space={encounterSouls.space}
          onJoin={(soulId) => {
            const soul = soulsRef.current.find(s => s.id === soulId);
            if (soul) { setChatOpen(true); setChatSoul(soul); }
            setEncounterActive(false);
          }}
          onClose={() => setEncounterActive(false)}
        />
      )}

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
