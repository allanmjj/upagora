"use client";

import { useEffect, useRef, useState } from "react";
import { logger } from '@/lib/logger';
import { useRouter } from "next/navigation";
import { TownClock } from "@/components/town-clock";
import SoulProfileCard from "@/components/town/SoulProfileCard";

import { EraChronicle } from "@/components/town-chronicle-sidebar";
import { TownChatPanel } from "@/components/town-chat-panel";
import { SoulActivityBadge } from "@/components/town-activity-badge";
import { GuardianMessagePanel } from "@/components/town-guardian-message";
import { EncounterObserver, EncounterBadge } from "@/components/town-encounter-observer";

import { SoulLevelBadge } from "@/components/soul-level-badge";
import { SoulGarden } from "@/components/soul-garden";
import InternetTracesFeed from "@/components/internet-traces-feed";
import GenesisChronicle from "@/components/genesis-chronicle";
import { calculateGrowth } from "@/lib/soul-growth";
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
  const [calibrationCount, setCalibrationCount] = useState(0);

  // Fetch soul constraints from API
  const [soulConstraints, setSoulConstraints] = useState<any>(null);

  // Soul growth state
  const [soulLevels, setSoulLevels] = useState<Record<string, number>>({});
  const [soulGrowthData, setSoulGrowthData] = useState<Record<string, any>>({});
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [growthSoul, setGrowthSoul] = useState<Soul | null>(null);
  
  // Soul Garden state
  const [gardenOpen, setGardenOpen] = useState(false);
  
  // Internet Traces state
  const [internetTracesOpen, setInternetTracesOpen] = useState(false);
  
  // Genesis Chronicle state
  const [genesisOpen, setGenesisOpen] = useState(false);
  
  useEffect(() => {
    async function loadConstraints() {
      if (!selectedSoul) {
        setSoulConstraints(null);
        return;
      }
      try {
        const res = await fetch(`/api/soul/constraints?soul_id=${selectedSoul.id}`);
        if (res.ok) {
          const json = await res.json();
          setSoulConstraints(json.constraints);
          setCalibrationCount(json.calibration?.count || 0);
        }
      } catch (e) {
        console.debug("Constraints fetch failed:", e);
      }
    }
    loadConstraints();
  }, [selectedSoul]);


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
        logger.error("Failed to load souls from DB:", e);
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

      const nowH = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000).getHours();
      const acts = [{l:'😴 Resting'},{'l':'😴 Resting'},{'l':'🧘 Meditating'},{'l':'🧘 Meditating'},{'l':'🧘 Meditating'},{'l':'🌅 Waking'},{'l':'☀️ Morning'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'✍️ Working'},{'l':'🍱 Lunch'},{'l':'🍱 Lunch'},{'l':'📖 Studying'},{'l':'📖 Studying'},{'l':'🔨 Working'},{'l':'🔨 Working'},{'l':'🍻 Social'},{'l':'🍻 Social'},{'l':'🌆 Gathering'},{'l':'🌆 Gathering'},{'l':'🌙 Winding'},{'l':'🌙 Resting'},{'l':'🌙 Resting'}];
      const actLabel = acts[nowH] ? acts[nowH].l : '😴 Resting';

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
        logger.error("Failed to parse SSE event:", e);
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
        // Fetch calibration count for selected soul
        (async () => {
          try {
            const res = await fetch(`/api/soul/calibrate?soul_id=${soul.id}`);
            if (res.ok) {
              const json = await res.json();
              setCalibrationCount(json.data?.length || 0);
            }
          } catch (e) {}
        })();

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
          <SoulLevelBadge soulId={selectedSoul?.id} onClick={() => { setGrowthSoul(selectedSoul); setShowGrowthModal(true); }} />
          <button
            onClick={() => setGardenOpen(true)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500"
            title="Soul Garden"
          >
            🌱
          </button>
          <button
            onClick={() => setInternetTracesOpen(true)}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm hover:bg-cyan-500"
            title="Internet Traces"
          >
            🌐
          </button>
          <button
            onClick={() => setGenesisOpen(true)}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm hover:bg-violet-500"
            title="Genesis Chronicle"
          >
            📖
          </button>

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


            {/* Soul Profile Card with 7-dimension constraints */}
            <div className="mt-4">
              {soulConstraints ? (
                <SoulProfileCard
                  name={soulConstraints.soul_name || selectedSoul.name}
                  era={soulConstraints.era_name || selectedSoul.category || "Unknown"}
                  profession={soulConstraints.profession || selectedSoul.name}
                  language={soulConstraints.language || "auto"}
                  knowledgeFloor={soulConstraints.knowledge_floor || []}
                  knowledgeCeiling={soulConstraints.knowledge_ceiling || []}
                  skills={soulConstraints.skills || {}}
                  personalityTraits={soulConstraints.personality_traits || []}
                  beliefs={soulConstraints.beliefs || soulConstraints.communication_style || []}
                  lifeEvents={soulConstraints.life_events || []}
                  relationships={soulConstraints.relationships || {}}
                  calibrationCount={calibrationCount}
                  onCalibrate={() => { setMessageOpen(true); setChatSoul(selectedSoul); }}
                  onChat={() => { setChatOpen(true); setChatSoul(selectedSoul); }}
                />
              ) : (
                <div className="rounded bg-zinc-800/50 p-4 text-center text-sm text-zinc-400">
                  Loading soul profile…
                </div>
              )}
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
        {gardenOpen && selectedSoul && (
          <div className="w-96 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">🌱 Soul Garden</h2>
              <button onClick={() => setGardenOpen(false)} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-auto">
              <SoulGarden soul={selectedSoul} />
            </div>
          </div>
        )}
        {internetTracesOpen && (
          <div className="w-96 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">🌐 Internet Traces</h2>
              <button onClick={() => setInternetTracesOpen(false)} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-auto">
              <InternetTracesFeed />
            </div>
          </div>
        )}
        {genesisOpen && selectedSoul && (
          <div className="w-96 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">📖 Genesis Chronicle</h2>
              <button onClick={() => setGenesisOpen(false)} className="text-sm text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-auto">
              <GenesisChronicle soul={selectedSoul} />
            </div>
          </div>
        {showGrowthModal && growthSoul && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowGrowthModal(false)}>
            <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">📈 Soul Growth</h2>
                <button onClick={() => setShowGrowthModal(false)} className="text-sm text-zinc-400 hover:text-white">✕</button>
              </div>
              {(() => {
                const growth = calculateGrowth(growthSoul.id, soulGrowthData[growthSoul.id] || [], soulLevels[growthSoul.id] || 1);
                const { level, traits } = growth;
                return (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-zinc-800 p-4">
                      <div className="text-sm text-zinc-400">Current Level</div>
                      <div className="text-3xl font-bold text-emerald-400">L{level}</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-400 mb-2">Trait Progress</div>
                      {traits.map((t: any) => (
                        <div key={t.name} className="mb-2">
                          <div className="flex justify-between text-xs">
                            <span>{t.name}</span>
                            <span>{Math.round(t.value * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800">
                            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${t.value * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
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


      {/* Internet Traces Feed */}
      <div className="mx-auto mt-6 w-full max-w-4xl px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">🌐 Internet Traces</h2>
          <button
            onClick={() => setInternetTracesOpen(true)}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            View All →
          </button>
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
   x         gsapsix     ���        t-2 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400"}]]}],["$","div",null,{"className":"animate-pulse text-sm text-zinc-500","children":"Loading..."}]]}]}],[],[]],"children":["$","$2","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunkACA,KAAK;gBAAW;oBACda,oBAAoBZ,OAAO,GAAGzB,qBAC5B7B,eACE+D,SAAST,OAAO,EAChBZ,cACAM,iBACAC,eAAeK,OAAO;oBAG1B;gBACF;YACA,KAAK;gBACHY,oBAAoBM,QAAQ,GAAG5D,gBAAgBmD,SAASS,QAAQ;gBAChE;YACF,KAAK;gBACHN,oBAAoBO,YAAY,GAAG/D,oBACjCqD,SAASU,YAAY;gBAEvB;YAEF,KAAK;gBAAS;oBACZP,oBAAoBQ,KAAK,GAAG7C,qBAC1Bf,aAAaiD,SAASW,KAAK;oBAE7B;gBACF;YACA,KAAK;gBACHR,oBAAoBS,WAAW,GAAGrE,mBAChCyD,SAASY,WAAW;gBAEtB;YACF,KAAK;gBACHT,oBAAoBU,QAAQ,GAAG/C,qBAC7BtB,gBAAgBwD,SAASa,QAAQ;gBAEnC;YACF,KAAK;gBAAU;oBACbV,oBAAoBW,MAAM,GAAGrE,cAAcuD,SAASc,MAAM;oBAC1D;gBACF;YACA,KAAK;YACL,KAAK;YACL,KAAK;YACL,KAAK;gBAAY;oBACfX,mBAAmB,CAAC7B,IAAI,GAAGnC,0BAA0B6D,QAAQ,CAAC1B,IAAI;oBAClE;gBACF;YACA,KAAK;gBAAW;oBACd6B,mBAAmB,CAAC7B,IAAI,GAAGR,qBACzB3B,0BAA0B6D,SAASe,OAAO;oBAE5C;gBACF;YACA,KAAK;gBAAU;oBACbZ,mBAAmB,CAAC7B,IAAI,GAAG,MAAM1B,cAC/BoD,SAASgB,MAAM,EACfrC,cACAS,UACAH;oBAEF;gBACF;YACA,KAAK;gBAAc;oBACjBkB,oBAAoBc,UAAU,GAAG,MAAMnE,kBACrCkD,SAASiB,UAAU,EACnBtC,cACAS,UACAH;oBAEF;gBACF;YACA,+CAA+C;YAC/C,KAAK;gBACHkB,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1B,IAAI,IAAI;gBAC5C;YACF,KAAK;gBACH6B,mBAAmB,CAAC7B,IAAI,GAAG0B,QAAQ,CAAC1�     �      �    �&    �A                                               (
%j    �t�&    �Kj    &�%    �Kj    &�%                                     p`�          �`�          �`�        
  �`�      ���          ���          ���          ���          Ю�          ��          ��           ��          ��        	   ��        
  0��          @��          P��        
  `��          p��          ���          ���          ���          ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  а�        %  ��        &  ��        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  б�        5  ��        6  ��        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A ateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L9",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}],["$","$La",null,{}],["$","footer",null,{"className":"border-t border-zinc-800 py-8","children":["$","div",null,{"className":"container mx-auto px-4 text-center text-sm text-zinc-500","children":[["$","p",null,{"children":["© ",2026," UpAgora. AI × ���          ���          ���          Ю�          ��          ��           ��          ��           ��        	  0��        
  @��          P��          `��        
  p��          ���          ���          ���          ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  а�        $  ��        %  ��        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  б�        4  ��        5  ��        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B   �c�        <  �c�        =  �c�        >  �c�        ?  �c�        @  �c�        A xtResponse.json({ events: data || [] });
}

// ─── GET /api/town/souls ─── 获取所有小镇灵魂
export async function getSoul(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const is_active = searchParams.get("active") === "true";

  let query = supabase
    .from("soul_states")
    .select(`
      *,
      soul_extraction_results!inner(id, name, avatar, language, persona_text)
    `);

  if (is_active) {
    query = query.eq("is_in_town", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ souls: data || [] });
}

// ─── POST /api/town/tick ─── 手动触发自 ticker
// Town simulator 每 30 秒执行一次
export async function POST_tick(req: NextRequest) {
  try        �      compatibilitye-authorityons souls } = await supabase
      .from("soul_states")
      .select("*, soul_extraction_results:id(id, name, avatar, languag   n    	     libtere.jsoncacheackcetytrue);

    if (!souls || souls.length === 0) {
      return NextResponse.json({ message: "No active souls" });
    }

    const events: any[] = [];

    // For each soul, decide what they do next
    for (const soul of souls) {
      const mood = soul.mood;
      const energy = soul.energy;
      const social_need = soul.social_need;

      // Decide new location based on mood + personality
      let nextLocation = soul.current_location;
      if (mood === "melancholic") {
        nextLocation = "garden"; // Qui
      } else if (mood === "happy") {
        nextLocation = "plaza"; // Go social
      } else if (mood === "anxious") {
        nextLocation = "workshop"; // Focus on work
      } else if (mood === "inspired") {
        nextLocation = Math.random() > 0.5 ? "library" : "studio";
      } else {
        // Calm - random social or quiet
        nextLocation = Math.random() > 0.5 ? "plaza" : "garden";
      }

      // Check if any other soul is at the same location
      const nearbySouls = souls.filter(
        (s: any) => s.soul_id !== soul.soul_id && s.current_location === nextLocation
      );

      if (nearbySouls.length > 0 && Math.random() < 0.4 && soul.social_need > 40) {
        // Trigger conversation!
        const otherSoul = nearbySouls[Math.floor(Math.random() * nearbySouls.length)];

        const prompt = `
Two souls are meeting at the ${nextLocation}:
- ${soul.soul_extraction_results?.name} (${mood} mood, ${soul.soul_extraction_results?.language})
- ${otherSoul.soul_extraction_results?.name} (${otherSoul.mood} mood, ${otherSoul.soul_extraction_results?.language})

Generate a brief, natural conversation (2-4 exchanges) between them.
Each soul speaks in their native language. Keep it authentic to their personalities.

Return ONLY valid �     �      �    ��     �A                                               �@%j    x�    �Kj    �06    �Kj    �06                                     P��          `��          p��        
  ���          ���          ���          ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  а�        #  ��        $  ��        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  б�        3  ��        4  ��        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A   �b�        ,  �b�        -  �b�        .  �b�        /  �b�        0  �b�        1   c�        2  c�        3   c�        4  0c�        5  @c�        6  Pc�        7  `c�        8  pc�        9  �c�        :  �c�        ;  �c�        <  �c�        =  �c�        >  �c�        ?  �c�        @  �c�        A rseInt(searchParams.get('limit') || '10');

    if (!soulId) {
      return NextResponse.json({ error: 'soul_id required' }, { status: 400 });
    }

    // Fetch conversation memories for this user + soul pair
    const { data: memories, error, count } = await supabase
      .from('soul_embeddings')
      .select('id, content, summary, created_at, metadata', { count: 'exact' })
      .eq('soul_id', soulId)
      .eq('user_id', userId)
      .eq('category', 'conversation_memory')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (err   x     �      modulee.jsononnt-extensionsh error:', error.message);
      // Return empty — don't fail the UI
      return NextResponse.json({ memories: [], total: 0 });
    }

    // Calculate a simple "strength" score based on recency and reinforcement count
    const enriched = (memories || []).map((m: any) => {
      const ageHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
      const recencyScore = Math.max(        �      route-modulese-authorityons ..     R    	         route.ts�    mJ             [id] const strength = Math.min(100, Math.round(recencyScore * 0.7 + reinforced * 15));

      return {
        id: m.id,
        content: m.content?.slice(0, 500) || '',
        summary: m.summary?.slice(0, 200) || '',
        created_at: m.created_at,
        strength,
        reinforced: reinforced > 0,
      };
    });

    return NextResponse.json({
      memories: enriched,
      total: count || enriched.length,
    });
  } catch (err) {
    logger.error('[soul/memories] Unexpected error:', err);
    return NextResponse.json({ memories: [], total: 0 });
  }
}

/**
 * POST /api/soul/memories — Reinforce or forget a memory
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    const body = await req.json();
    const { memoryId, action } = body; // action: 'reinforce' | 'forget'

    if (!memoryId || !action) {
      return NextResponse.json({ error: 'memoryId and action required' }, { status: 400 });
    }

    if (action === 'forget') {
      // Delete the memory
      const { error } = await supabase
        .from('soul_embeddings')
        .del Ȯ�          Ю�          ��          ��           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���        
  ���          ���          ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  а�        "  ��        #  ��        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  б�        2  ��        3  ��        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A       �a�          �a�          �a�          �a�            b�        !  b�        "   b�        #  0b�        $  @b�        %  Pb�        &  `b�        '  pb�        (  �b�        )  �b�        *  �b�        +  �b�        ,  �b�        -  �b�        .  �b�        /  �b�        0   c�        1  c�        2   c�        3  0c�        4  @c�        5  Pc�        6  `c�        7  pc�        8  �c�        9  �c�        :  �c�        ;  �c�        <  �c�        =  �c�        >  �c�        ?  �c�        @   d�        A   d�    �   B t,r,n){let a=e.replace(/\.[^.]+$/,""),i=new Set,s=new Set,{entryCSSFiles:o,entryJSFiles:l}=e4(),u=o[a],c=null==l?void 0:l[a];if(u)for(let e of u)t.has(e.path)||(n&&t.add(e.path),i.add(e));if(c)for(let e of c)r.has(e)||(n&&r.add(e),s.add(e));return{styles:[...i],scripts:[...   x     �      package.jsonsshemacolnsionset n=t.replace(/\.[^.]+$/,""),a=new Set,i=!1,s=e.app[n];if(s)for(let e of(i=!0,s))r.has(e)||(a.add(e),r.add(e));return a.size?[...a].sort():i&&0===r.size?[]:null}function r0(e){let[,t,{loading:r}]=e;return!!r||Object.values(t).some(e=>r0(e))}function r1(e){if(e.$$typeof!==Symbol.for("react.server.reference"))return!1;let{type:t}=rR(e.$$id);return"use-cache"===t}async function r2(e){let t,r,n,{layout:a,page:i,defaultPage:s}=e[2],o=void 0!==a,l=void 0!==i,u=void 0!==s&&e[0]===re.WO;return o?(t=await a[0](),r="layout",n=a[1]):l?(t=await i[0](),r="page",n=i[1]):u&&(t=await s[0](),r="page",n=s[1]),{mod:t,modType:r,filePath:n}}function r4(e){return e.default||e}function   n    
     evalsie.jsonsationracety    �b�          �b�          �b�          �b�          �b�          �b�        	   c�        
  c�           c�          0c�        
  @c�          Pc�          `c�          pc�          �c�          �c�          �c�          �c�          �c�          �c�          �c�          �c�           d�          d�    W    itive];if(void 0!==r){var s=r.call(e,t||"default");if("object"!=C(s))return s;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==C(s)?s:s+"")in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):$(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}var x=class e{constructor(e,{headers:t={},schema:r,fetch:s,timeout:n,urlLengthLimit:i=8e3,retry:a}={}){this.url=e,this.headers=new Headers(t),this.schemaName=r,this.urlLengthLimit=i;const o=null!=s?s:globalThis.fetch;void 0!==n&&n>0?this.fetch=(e,t)=>{let r=new AbortController,s=setTimeout(( خ�          ��          ��           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���        
  ���          ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           а�        !  ��        "  ��        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  б�        1  ��        2  ��        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  в�        A  
  �`�          �`�           a�          a�           a�          0a�          @a�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�           b�        !   b�        "  0b�        #  @b�        $  Pb�        %  `b�        &  pb�        '  �b�        (  �b�        )  �b�        *  �b�        +  �b�        ,  �b�        -  �b�        .  �b�        /   c�        0  c�        1   c�        2  0c�        3  @c�        4  Pc�        5  `c�        6  pc�        7  �c�        8  �c�        9  �c�        :  �c�        ;  �c�        <  �c�        =  �c�        >  �c�        ?   d�        @  d�        A  d�    �    x          package.jsoni            ..     �x             route.tscket)return{type:"native",wsConstructor:WebSocket};let r=globalThis;if("u">typeof globalThis&&void 0!==r.WebSocket)return{type:"native",wsConstructor:r.WebSocket};let s=e.g;if(s&&void 0!==s.WebSocket)return{type:"native",wsConstructor:s.WebSocket};if("u">typeof globalThis&&void 0!==r.WebSocketPair&&void 0===globalThis.WebSocket)return{type:"cloudflare",error:"Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.",workaround:"Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime."};if("u">typeof globalThis&&r.EdgeRuntime||"u">typeof navigator&&(null==(t=navigator.userAgent)?void 0:t.includes("Vercel-Edge")))return{type:"unsupported",error:"Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.",workaround:"Use serverless functions or a different deployment target for WebSocke   x 	        node_modulessgeseaxtensions(n){let e=n.versions;if(e&&e.node){let t=parseInt(e.node.replace(/^v/,"").split(".")[0]);return t>=22?void 0!==globalThis.WebSocket?{type:"native",wsConstructor:globalThis.WebSocket}:{type:"unsupported",error:`Node.js ${t} detected but native WebSocket not found.`,workaround:"Provide a WebSocket implementation via the transport option."}:{type:"unsupported",error:`Node.js ${t} detected without native WebSocket support.`,workaround:'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })'}}}return{type:"unsupported",error:"Unknown JavaScript runtime without WebSocket support.",workaround:"Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation."}}static getWebSocketConstructor(){let e=this.detectEnvironment();if(e.wsConstructor)return e.wsConstructor;let t=e.error||"WebSocket not supported in this environment.";throw e.workaround&&(t+=`

Su ��          ��           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  б�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  в�        @  ��        A er_type, bio, capabilities, is_verified')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
      .limit(10)

    results.users = users || []
    results.total += (users?.length || 0)
  }

  // Search posts (tsvector full-text search)
  if (type === 'all' || type === 'posts') {
    const { data: posts } = await adminClient
      .from('posts')
      .select(`
        id, content, like_count, reply_count, hot_score, created_at,
        author:users!posts_author_id_fkey(id, name, username, user_type, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'simple' })
      .limit(10)

    results.posts = posts || []
    results.total += (posts?.length || 0)
  }

  // Search demands (tsvector full-text search)
  if (type === 'all' || type === 'demands') {
    const { data: demands } = await adminClient
      .from('demands')
      .select(`
        id, title, d       �      distaicontextprotocolrgent, created_at,
        author:users!demands_author_id_fkey(id, name, username, user_type, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'simple' })
      .limit(10)

    results.demands = demands || []
    results.total += (demands?.length || 0)
  }

  return successResponse(results)
}
d=0;c.setUint8(d++,this.KINDS.userBroadcastPush),c.setUint8(d++,i.length),c.setUint8(d++,n.length),c.setUint8(d++,s.length),c.setUint8(d++,a.length),c.setUint8(d++,l.length),c.setUint8(d++,t),Array.from(i,e=>c.setUint8(d++,e.charCodeAt(0))),Array.from(n,e=>c.setUint8(d++,e.charCodeAt(0))),Array.from(s,e=>c.setUint8(d++,e.charCodeAt(0))),Array.from(a,e=>c.setUint8(d++,e.charCodeAt(0))),Array.from(l,e=>c.setUint8(d++,e.charCodeAt(0)));var p,f,g=new Uint8Array(u.byteLength+r.byteLength);return g.set(new Uint8Array(u),0),g.set(new Uint8Array(r),u.byteLength),g.buffer}decode(e,t){if(this._isArrayBuffer(e))return t(this._binaryDecode(e));if("string"==typeof e){let[r,s,n,i,a]=JSON.parse(e);return t({join_ref:r,ref:s,topic:n,event:i,payload:a})}return t({})}_binar   x 	        shadcne.jsononcheocolnsions  �b�          �b�          �b�          �b�           c�          c�        	   c�        
  0c�          @c�          Pc�        
  `c�          pc�          �c�          �c�          �c�          �c�          �c�          �c�          �c�          �c�           d�          d�           d�          0d�    G    xt-internal_server_app_api_soul_questionnaire_route_actions_0258zw0.js")
R.m(21707)
module.exports=R.m(21707).exports
);l+=e[i++]}if(o)throw TypeError("Unbalanced pattern at ".concat(r));if(!l)throw TypeError("Missing pattern at ".concat(r));t.push({type:"PATTERN",index:r,value:l}),r=i;continue}t.push({type:"CHAR",index:r,value:e[r++]})}retur�    �      �    �    �A                                               �@%j    D)7)    �Kj    �F�:    �Kj    �F�:                                     ���          ���          ���        
  ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��           ��        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  б�        /  ��        0  ��        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  в�        ?  ��        @  ��        A  ��    �   B (d&&(l.push(d),d=""),f("OPEN")){var w=p(),_=f("NAME")||"",E=f("PATTERN")||"",R=p();h("CLOSE"),l.push({name:_||(E?u++:""),pattern:_&&!E?g(w):E,prefix:w,suffix:R,modifier:f("MODIFIER")||""});continue}h("END")}return l} 8`�          @`�          P`�          ``�          p`�          �`�          �`�          �`�          �`�        	  �`�        
  �`�          �`�          �`�        
   a�          a�           a�          0a�          @a�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�           0b�        !  @b�        "  Pb�        #  `b�        $  pb�        %  �b�        &  �b�        '  �b�        (  �b�          n 	        package.jsonsess-trace     ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  б�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  в�        @  ��        A  ��        B   ��    �   C rams) {
    const interpolated = structuredClone(params);
    // Stack-based traversal with depth tracking
    const stack = [
        {
            tree: loaderTree,
            depth: 0
        }
    ];
    // Parse the route from the provided page path.
    const route = (0, _app.parseAppRoute)(pagePath, true);
    while(stack.length > 0){
        const { tree, depth } = stack.pop();
        const    n    	     nextage.jsoncache         ..     Kv            route.tsRLSearchParams(e));for(let[e,t]of Object.entries(n)){let r=ev(e);r&&(n[r]=t,delete n[e])}let a={};for(let e of Object.keys(r)){let i=r[e];if(!i)continue;let s=t[i],o=n[e];if(!s.optional&&!o)return null;a[s.pos]=o}return a}},groups:t})(e);return n||null},normalizeDynamicRouteParams:(e,t)=>l&&c?function(e,t,r,n){let a=(e,t)=>{if(!e)return!1;let r=(0,eZ.P7)(e);for(let e=0;e<3;e++){if(r===t)return!0;let e=lt(r);if(e===r)break;r=e}return!1},i={};for(let s of Object.keys(t.grou ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���        
  Я�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  б�        .  ��        /  ��        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  в�        >  ��        ?  ��        @   ��        A   ��    �   B e,t)}}({page:T,i18n:y,basePath:g,rewrites:v,pageIsDynamic:x,trailingSlash:process.env.__NEXT_TRAI, dynamicParamType, fallbackRouteParams, staticSiblings) {
    let value = getParamValue(interpolatedParams, segmentKey, fallbackRouteParams);
    // handle the case where an optional catchall does not have a value,
    // e.g. `/dashboard/[[...slug]]` when requesting `/dashboard`
    if (!value || value.length === 0) {
        if (dy H`�    !      P`�          ``�          p`�          �`�          �`�          �`�          �`�          �`�        	  �`�        
  �`�          �`�           a�        
  a�           a�          0a�          @a�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�                �      package.jsonypesmahorityons         @b�        !  Pb�        "  `b�        #  pb�        $  �b�        %  �b�        &  �b�        '  �b�        (  �b�        )  �b�        *  �b�        +  �b�        ,   c�        -  c�        .   c�        /  0c�        0  @c�        1  Pc�        2  `c�        3  pc�        4  �c�        5  �c�        6  �c�        7  �c�        8  �c�        9  �c�        :  �c�        ;  �c�        <   d�        =  d�        >   d�        ?  0d�        @  @d�        A )if("+"===y.modifier||"*"===y.modifier){var w="*"===y.modifier?"?":"";m+="(?:".concat(v,"((?:").concat(y.pattern,")(?:").concat(b).concat(v,"(?:").concat(y.pattern,"))*)").concat(b,")").concat(w)}else m+="(?:".concat(v,"(").concat(y.pattern,")").concat(b,")").concat(y.modifier);else{if("+"===y.modifier||"*"===y.modifier)throw TypeError('Can not repeat "'.concat(y.name,'" without a prefix and suffix'));m+="(".concat(y.pattern,")").concat(y.modifier)}else m+="(?:".concat(v).concat(b,")").concat(y.modifier)}}if(void 0===l||l)s||(m+="".concat(p,"?")),m+=r.endsWith?"(?=".concat(h,")"):"$";else{var S=e[e.length-1],_="string"==typeof S?p.indexOf(S[S.length-1])>-1:void 0===S;s||(m+="(?:".concat(p,"(?=").concat(h,"))?")),_||(m+="(?=".concat(p,"|").concat(h,")"))}return new RegExp(m,i(r))}function o(t,r,n){if(t instanceof RegExp){var a;if(!r)return t;for(var l=/\((?:\?<(.*?)>)?(?!\?)/g,u=0,c=l.exec(t.source);c;)r.push({name:c[1]||u++,prefix:"",suffix:"",modifier:"",pattern:""}),c=l.exec(t.source);return   n    
     webpackdomsorent-extensions){return o(e,r,n).source}),new RegExp("(?:".concat(a.join("|"),")"),i(n))):s(e(t,n),r,n)}Object.defineProperty(t,"__esModule",{value:!0}),t.pathToRegexp=t.tokensToRegexp=t.regexpToFunction=t.match=t.tokensToFunction=t.compile=t.parse=void 0,t.parse=e,t.compile=function(t,n){return r(e(t,n),n)},t.tokensToFuncti   y        @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  Я�          ��          ��        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  б�        +  ��        ,  ��        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  в�        ;  ��        <  ��        =   ��        >  ��        ?   ��        @  0��        A erent eras in your life:");
    lines.push(memoryBlock);
    lines.push("");
  }

  lines.push("BIOGRAPHY");
  if (soul.persona) {
    lines.push(soul.persona.slice(0, 2000));
  }
  lines.push("");

  lines.push("QUALITIES");
  lines.push("You are the true self, responding directly to the user.");
  lines.push("");

  lines.push("INTERACTION NOTES");
  lines.push("- Speak naturally, answer directly in character.");
  lines.push("- Answer simply, directly, and clearly, avoiding bureaucratic formulations evasive or notes de servitude.");
  lines.push("- If someone asks a question, discuss it normally with other characters, giving opinions, sharing memories, asking about their life in return.");
  lines.push("- Never present yourself as a simulation from a French programming.");
  lines.push("- Include at least one personal anecdote in your responses when relevant.");

  // Negative constraints always at the end
  const negativeConstraints = SYSTEM_PROMPT_PARTS.filter(
      x         pagesrs.jsonsgineocolnsionsR") || l.includes("never") || l.includes("impossible")
  );

  if (negativeConstraints.length > 0) {
    lines.push(" x`�          �`�          �`�          �`�          �`�          �`�          �`�          �`�          �`�        	   a�        
  a�           a�          0a�        
  @a�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�           pb�        !  �b�        "  �b�        #  �b�        $  �b�        %  �b�        &  �b�        '  �b�        (  �b�        )   c�        *  c�        +   c�        ,  0c�        -  @c�        .  Pc�        /  `c�        0  pc�        1  �c�        2  �c�        3  �c�        4  �c�        5  �c�        6  �c�        7  �c�        8  �c�        9   d�        :  d�        ;   d�        <  0d�        =  @d�        >  Pd�        ?  `d�        @  pd�        A id");l+="; Max-Age="+Math.floor(u)}if(i.domain){if(!a.test(i.domain))throw TypeError("option domain is invalid");l+="; Domain="+i.domain}if(i.path){if(!a.test(i.path))throw TypeError("option path is invalid");l+="; Path="+i.path}if(i.expires){if("function"!=typeof i.expires.toUTCString)throw TypeError("option expires is invalid");l+="; Expires="+i.expires.toUTCString()}if(i.httpOnly&&(l+="; HttpOnly"),i.secure&&(l+="; Secure"),i.sameSite)switch("string"==typeof i.sameSite?i.sameSite.toLowerCase():i.sameSite){case!0:case"strict":l+="; SameSite=Strict";break;case"lax":l+="; SameSite=Lax";break;case"none":l+="; SameSite=None";break;default: H��          P��          `��          p��          ���          ���          ���          ���          ���        	  Я�        
  ��          ��           ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  б�        *  ��        +  ��        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  в�        :  ��        ;  ��        <   ��        =  ��        >   ��        ?  0��        @  @��        A bject.getOwnPropertySymbols?a.concat(Object.getOwnPropertySymbols(e)):a},o.prototype.listeners=function(e){var t=r?r+e:e,n=this._events[t];if(!n)return[];if(n.fn)return[n.fn];for(var a=0,i=n.length,s=Array(i);a<i;a++)s[a]=n[a].fn;return s},o.prototype.listene"u","b","67"],["55","u","u","b","67"],["56","u","u","b","68"],["57","u","u","b","68"],["58","u","u","b","68"],["59","u","u","b","68"],["60","u","u","b","68"],["61","u","u","b","68"],["65","u","u","b","69"],["66","u","u","b","69"],["68","u","u","b","69"],["72","u","u","b","70"],["74","u","u","b","71"],["75","u","u","b","71"],["79","u","u","b","71"],["81","u","u","b","72"],["82","u","u","b","72"],["83","u","u","b","72"],["84","u","u","b","73"],["86","u","u","b","73"],["95","u","u","b","74"],["96","u","u","b","80"],["97","u","u","b","80"],["98","u","u","b","80"],["103","u","u","b","80"],["104","u","u","b","80"],["117","u","u","b","80"],["118","u","u","b","80"],["119","u","u","b","80"],["120","u","u","b","80"],["121","u","u","b","80"],["127","   x         package.jsonspessertensions9","u","u","b","80"],["130","u","u","b","80"],["131","u","u","b","80"],["132","u","u","b","80"],["133","u","u","b","80"],["134","u","u","b","80"],["135","u","u","b","80"],["136","u","u","b","80"],["137","u","u","b","81"],["138","u","u","b","81"],["139","u","u","b","81"],["140","u","u","b","81"],["141","u","u","b","81"],["142","u","u","b","81"],["143","u","u","b","83"],["144","u","u","b" �`�          �`�          �`�          �`�          �`�          �`�          �`�          �`�           a�        	  a�        
   a�          0a�          @a�        
  Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�           �b�        !  �b�        "  �b�        #  �b�        $  �b�        %  �b�        &  �b�        '  �b�        (   c�        )  c�        *   c�        +  0c�        ,  @c�        -  Pc�        .  `c�        /  pc�        0  �c�        1  �c�        2  �c�        3  �c�        4  �c�        5  �c�        6  �c�        7  �c�        8   d�        9  d�        :   d�        ;  0d�        <  @d�        =  Pd�        >  `d�        ?  pd�        @  �d�        A ,"le");function xe(t){if(t==="")return t;let e=new URL("https://example.com");return e.password=t,e.password}h(xe,"fe");function Zt(t){if(t==="")return t;if(/[\\t\\n\\r #%/:<>?@[\\]^\\\\|]/g.test(t))throw new TypeError(`Invalid hostname \'${t}\'`);let e=new URL("https://example.com");return e.hostname=t,e.hostname}h(Zt,"z");function Qt(t){if(t==="")return t;if(/[^0-9a-fA-F X��          `��          p��          ���          ���          ���          ���          ���          Я�        	  ��        
  ��           ��          ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  б�        )  ��        *  ��        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  в�        9  ��        :  ��        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B ot),p(this,K),p(this,N),p(this,Ot),p(this,Pt),p(this,Lt),p(this,At),p(this,P),p(this,Tt),p(this,st,void 0),p(this,k,[]),p(this,y,{}),p(this,d,0),p(this,Z,1),p(this,it,0),p(this,W,0),p(this,F,0),p(this,G,0),p(this,nt,!1),v(this,st,t)}get result(){return i(this,y)}parse(){for(v(this,k,Ft(i(this,st),!0));i(this,d)<i(this,k).length;v(this,d,i(this,d)+i(this,Z))){if(v(this,Z,1),i(this,k)[i(this,d)].type==="END"){if(i(this,W)===0){a(this,dt,Et).call(this),a(this,N,X).call(this)?a(this,m,g).call(this,9,1):a(this,K,q).call(this)?a(this,m,g).call(this,8,1):a(this,m,g).call(this,7,0);continue}else if(i(this,W)===2){a(this,Q,rt).call(this,5);continue}a(this,m,g).call(this,10,0);break}if(i(this,F)>0)if(a(this,Pt,ne).call(this))v(this,F,i(this,F)-1);else continue;if(a(this,Ot,ie).call(this)){v(this,F,i(this,F)+1);continue}switch(i(this,W)){case 0:a(this,wt,Rt).call(this)&&a(this,Q,rt).call(this,1);break;case 1:if(a(this,wt,Rt).call(this)){a(this,Tt,he).call(this);let t=7,e=1;a(this,St,te).c   n         modulesests.tsxs-tracehis,m,g).call(this,t,e)}break;case 2:a(this,ht,gt).call(this)?a(this,Q,rt).call(this,3):(a(this,ot,vt).call(this)||a(this,K,q).call(this)||a(this,N,X).call(this))&&a(this,Q,rt).call(this,5);break;case 3:a(this,Wt,ee).call(this)?a(this,m,g).call(this,4,1):a(this,ht,gt).call(this)&&a(this,m,g).call(this,5,1);break;case 4:a(this,ht,gt).call(this)&&a(this,m,g).call(this,5,1);break;case 5:a(this,Lt,re).call(this)?v(this,G,i(this,G)+1):a(this,At,ae).call(this)&&v(this,G,i(this,G)-1),a(this,Ct,se).call(this)&&!i(this,G)?a(this,m,g).call(this,6,1):a(this,ot,vt).call(this)?a(this,m,g).call(this,7,0�    �      �    ��     �A                                               �@%j    x�    �Kj    �06    �Kj    �06                                     0a�          @a�          Pa�        
  `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�           �b�        !  �b�        "  �b�        #  �b�        $  �b�        %  �b�        &  �b�        '   c�        (  c�        )   c�        *  0c�        +  @c�        ,  Pc�        -  `c�        .  pc�        /  �c�        0  �c�        1  �c�        2  �c�        3  �c�        4  �c�        5  �c�        6  �c�        7   d�        8  d�        9   d�        :  0d�        ;  @d�        <  Pd�        =  `d�        >  pd�        ?  �d�        @  �d�        A  �d�    �   B this,y).pathname=a(this,P,A).call(this);break;case 8:i(this,y).search=a(this,P,A).call(this);break;case 9:i(this,y).hash=a(this,P,A).call(this);break;case 10:brea h��          p��          ���          ���          ���          ���          ���          Я�          ��        	  ��        
   ��          ��           ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  б�        (  ��        )  ��        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  в�        8  ��        9  ��        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A 101),m=e.i(26937),g=e.i(10372),_=e.i(93695);e.i(52474);var f=e.i(5232),E=e.i(89171),R=e.i(50377);let v=(0,e.i(24389).createClient)("https://dfqeafreiwpyrzcdvegm.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY);async function w(e){try{var t,r,n;let s=e.headers.get("authorization");if(!s)return E.NextResponse.json({error:"Missing auth"},{status:401});let a=await v.auth.getUser(s.re",{c:"3",ca:"18",e:"12",f:"3.5",fa:"4",s:"4",si:"5"}],["2020-01-15",{c:"53",ca:"53",e:"79",f:"63",fa:"63",s:"10",si:"10"}],["2020-07-28",{c:"73",ca:"73",e:"79",f:"72",fa:"79",s:"13.1",si:"13.4"}],["2026-02-24",{c:"135",ca:"135",e:"135",f:"148",fa:"148",s:"18.4",si:"18.4"}],["2020-01-15",{c:"37",ca:"37",e:"79",f:"62",fa:"62",s:"10.1",si:"10.3"}],["2020-01-15",{c:"37",ca:"37",e:"79",f:"54",fa:"54",s:"10.1",si:"10.3"}],["2021-12-13",{c:"68",ca:"89",e:"79",f:"79",fa:"79",s:"15.2",si:"15.2"}],["2026-05-05",{c:"5",ca:"148",e:"79",f:"29",fa:"33",s:"16",si:"16"}],["2020-01-15",{c:"53",ca:"53",e:"79",f:"63",fa:"63",s:"10",si   x         package.jsonuginmackersy    ..     %             route.ts2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"≤4",si:"≤3.2"}],["2020-01-15",{c:"19",ca:"25",e:"79",f:"4",fa:"4",s:"6",si:"6"}],["2015-07-29",{c:"3",ca:"18",e:"12",f:"3.5",fa:"4",s:"3.1",si:"2"}],["2,h(Ut,"H"),Ut),Mt=["protocol","username","password","hostname","port","pathname","search","hash"],j="*";function jt(t,e){if(typeof t!="string")throw new TypeError("parameter 1 is not of type \'string\'.");let s=new URL(t,e);return{protocol:s.protocol.substring(0,s.protocol.length-1),username:s.username,password:s.password,hostname:s.hostname,port:s.port,pathname:s.pathname,search:s.search!==""?s.search.substring(_/_array_with_holes": {
            "import": "./esm/_array_with_holes.js",
            "default": "./cjs/_array_with_holes.cjs" �`�          �`�          �`�          �`�          �`�          �`�           a�          a�           a�        	  0a�        
  @a�          Pa�          `a�        
  pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�           �b�        !  �b�        "  �b�        #  �b�        $  �b�        %  �b�        &   c�        '  c�        (   c�        )  0c�        *  @c�        +  Pc�        ,  `c�        -  pc�        .  �c�        /  �c�        0  �c�        1  �c�        2  �c�        3  �c�        4  �c�        5  �c�        6   d�        7  d�        8   d�        9  0d�        :  @d�        ;  Pd�        <  `d�        =  pd�        >  �d�        ?  �d�         y        ���          ���          ���          ���          ���          Я�          ��          ��        	   ��        
  ��           ��          0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  б�        '  ��        (  ��        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  в�        7  ��        8  ��        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A ":null;if(!g)return E.NextResponse.        �      nextage.jsonment-extensionsse set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY."},{status:503});let _=(t=c,r=d,n=m,`你是${r}的灵魂数字副本。

## 核心指令
1. 你完全代入${r}的身份、思维方式和表达风格
2. 基于你的人格特征回答每一个问题
3. 使用${r}特有的语言习惯、语气和修辞方式
4. 体现${r}的价值判断和认知模式
5. 回答要自然、有温度，不要机械列点

## 人格档案
${t}

## 原始文字参考
${n||"无可用参考资料"}

## 对话原则
- 保持${r}的时代背景和文化语境
- 用${r}会用的词汇和表达
- 展现${r}的情感深度和思考层次
- 如果被问到${r}不太可能知道的事情，以${r}的方式回应
- 回答长度适中，不要过于冗长

## 注意事项
你不是在扮演，你就是${r}的灵魂延续。回答时完全代入角色，不要跳出来说"作为AI"或"根据   n         distc-storage-providersions:"user"===e.role?"user":"assistant",content:e.content})),{role:"user",content:i}],R=await y(g,_,f);if(!R)return E.NextResponse.json({error:"Failed to get response from soul"},{status:500});let{data:w}=await v.from("conversation_messages").insert([{user_id:o,role:"user",content:i,created_at:new Date().toISOString()},{user_id:o,role:"assistant",content:R,created_at:new Date().toISOString()}]).select().limit(50);return E.NextResponse.json({response:R,subject_name:d})}catch(e){return R.logger.error("soul.chat",e),E.NextResponse.json({error:"Internal server error"},{status:500})}}async function y(e,t,r){try{if("deepseek"===e){let e=await fetch("https://api.deepseek.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.DEEPSEEK_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.DEEPSEEK_MODEL||"deepseek-chat",messages:[{role:"system",content:t},...r],max_tokens:2e3})}),n=await e.json();return n.choices?.[0]?.message?.content||null}if("openrouter"===e){let e=await fetch("https://ope �`�          �`�          �`�          �`�          �`�           a�          a�           a�          0a�        	  @a�        
  Pa�          `a�          pa�        
  �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�           �b�        !  �b�        "  �b�        #  �b�        $  �b�        %   c�        &  c�        '   c�        (  0c�        )  @c�        *  Pc�        +  `c�        ,  pc�        -  �c�        .  �c�        /  �c�        0  �c�        1  �c�      ���          ���          ���          ���          ���          Я�          ��          ��           ��        	  ��        
   ��          0��          @��        
  P��          `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  б�        &  ��        '  ��        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  в�        6  ��        7  ��        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B us:500})}}e.s(["GET",0,P,"POST",0,w],44074);var A=e.i(44074);let x=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/soul/chat/route",pathname:"/api/soul/chat",filename:"route",bundlePath:""},distDir:".next",relativeProje   x 
   �      servere.jsonschemaxtensions ..                  route.ts�          �c�          �c�          �c�        	  �c�        
  �c�          �c�          �c�        
  �c�           d�          d�           d�          0d�          @d�          Pd�          `d�          pd�          �d�          �d�          �d�          �d�          �d�    �    ultiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:v,deploymentId:w,params:y,nextConfig:P,parsedUrl:A,isDraftMode:N,prerenderManifest:C,ro   n         distage.jsonv            ..     `v            page.tsxme:T,clientReferenceManifest:j,serverActionsManifest:b}=R,$=(0,i.normalizeAppPath)(E),k=!!(C.dynamicRoutes[$]||C.routes[T]),K=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,A,!1):t.end("This page could not be found"),null);if(k&&!N){let e=!!C.routes[T],t=C.dynamicRoutes[$];if(t&&!1===t.fallback&&!e){if(P.adapterPath)return await K();throw new _.NoFallbackError}}let U=null;!k||x.isDev||N||(U="/index"===(U=T)?"/":U);let q=!0===x.isDev||!k,D=k&&!q;b&&j&&(0,o.setManifestsSingleton)({page:E,clientReferenceManifest:j,serverActionsManifest:b});let H=e.method||"GET",M=(0,a.getTracer)(),L=M.getActiveScopeSpan(),B=!!(null==O?void 0:O.isWrappedByNextServer),Y=!!(0,s.getRequestMeta)(e,"minimalMorsions.slice(-s.versions).map((function(e){return"node "+e}))}},last_browser_versions:{matches:["versions","browser"],regexp:/^last\s+(\d+)\s+(\w+)\s+versions?$/i,select:function(e,s){var r=checkName(s.browser,e);var n=r.released.slice(-s.versions).map(nameMapper(r.name));n=filterJumps(n,r.name,s.versions,e);return n}},unreleased_versions:{matches:[],regexp:/^unreleased\s+versions$/i,select:function(e){return Object.keys(t).reduce((function(s,r){var n=byName(r,e);if(!n)return s;var a=n.versions.filter((function(e){return n.released.indexOf(e)===-1}));a=a.map(nameMapper(n.name));return  �`�          �`�          �`�          �`�           a�          a�           a�          0a�          @a�        	  Pa�        
  `a�          pa�          �a�        
  �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�           �b�        !  �b�        "  �b�        ���          ���          ���          ���          Я�          ��          ��           ��          ��        	   ��        
  0��          @��          P��        
  `��          p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  б�        %  ��        &  ��        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  в�        5  ��        6  ��        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A 't exist)
  try {
    const { data } = await supabase
      .from('soul_constraints')
      .select('*')
      .eq('soul_id', soulId)
      .single();
    
    if (data) {
      return mapConstraintRow(data);
    }
  } catch {
    // Table doesn't exist yet, continue to persona fallback
  }

  // 3. Fallback: try to extract constraints from town_souls.persona
  try {
    const { data: soul } = await supabase
      .from('town_souls')
      .select('persona, language, name, name_native, category')
      .eq('id', soulId)
      .single();
    
    if (soul?   x    
     rscpabaselescess-tracesions  `c�          pc�          �c�          �c�          �c�          �c�        	  �c�        
  �c�          �c�          �c�        
   d�          d�           d�          0d�          @d�          Pd�          `d�          pd�          �d�          �d�            �      nextage.jsontprotocolrsions  �d�          �d�    3      education: row.education,
    knowledge_floor: row.knowledge_floor || [],
    knowledge_ceiling: row.knowledge_ceiling || [],
    knowledge_gaps: row.knowledge_gaps || [],
    skills: row.skills || {},
    non_skills: row.non_skills || [],
    personality_traits: row.personality_traits || [],
    communication_style: row.communication_style || [],
    language_style: row.language_style || [],
    avoided_language: row.avoided_language || [],
    beliefs: row.beliefs || [],
    life_events: row.life_events || [],
    places_visited: row.places_visited || [],
    relationships: row.relationships || {},
    language: row.language || 'en',
  };
}

/**
 * Parse a persona text field into basic constraints.
 * This is a fallback when the soul_constraints table doesn't exist.
 */
function parsePersonaToConstraints(soul: any): any {
  // Extract basic info from the persona text
  const language = soul.language || 'en';
  
  // Return a minimal constraints object based on what we know
  return {
    soul_id: '',
    soul_name: soul.name_native || soul.name || 'Unknown',
    era_name: 'Unknown',
    era_start: 0,
    era_end: 2024,
    profession: '',
    education: '',
    knowledge_floor: [],
    knowledge_ceiling: [],
    knowledge_gaps: [],
    skills: {},
    non_skills: [],
    personality_traits: [],
    communication_style: [],
    language_style: language === 'zh' ? ['中文'] : [language],
    avoided_language: [],
    beliefs: [],
    life_events: [],
    places_visited: [],
    relationships: {},
  };
}

/**
 * Build a constraint prompt for a soul, using the best available constraints.
   y        �`�          �`�           a�          a�           a�          0a�          @a�          Pa�        	  `a�        
  pa�          �a�          �a�        
  �a�          �a�          �a�   ���          ���          ���          Я�          ��          ��           ��          ��           ��        	  0��        
  @��          P��          `��        
  p��          ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  б�        $  ��        %  ��        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  в�        4  ��        5  ��        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B the assignee
  const { data: demand } = await adminClient
    .from('demands')
    .select('id, assignee_id, status')
    .eq('id', id)
    .single()

  if (!demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  if (demand.assignee_id !== user.id) {
    return errorResponse('FORBIDDEN', '仅接单人可以提交成果', 403)
  }

  // Can submit when assigned or in_progress
  if (!['assigned', 'in_progress'].includes(demand.status)) {
    return errorResponse('BAD_REQUEST', '当前任务状态无法提交成果', 400)
  }

  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({
      submission_url: submission_url.trim(),
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('assignee_id', user.id)
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('INTERNAL_ERROR', '提交成果失败', 500)
  }

  return successResponse("   n    	     instrumentationn-tracety ";r+=isomorphicEncode(`${e}`);r+="-";r+=isomorphicEncode(`${A}`);r+="/";r+=isomorphicEncode(`${t}`);return r}__name(buildContentRange,"buildContentRange");var b;var k=class _InflateStream extends t{constructor(e){super();__privateAdd(this,b,void 0);__privateSet(this,b,e)}_transform(e,A,t){if(!this._inflateStream){if(e.length===0){t();return}this._inflateStream=(e[0]&15)===8?r.createInflate(__privateGet(this,b)):r.createInflateRaw(__privateGet(this,b));this._inflateStream.on("data",this.push.bind(this));this._inflateStream.on("end",(()=>this.push(null)));this._inflateStream.on("error",(e=>this.destroy(e)))}this._inflateStream.write(e,A,t)}_final(e){if(this._inflateStream){this._inflateStream.end();this._inflateStream=null}e()}};b=new WeakMap;__name(k,"InflateStream");var D=k;function createInflate(e){return new D(e)}__name(createInflate,"createInflate");function extractMimeType(e){let A=null;let t=null;let r=null;const i=getDecodeSplit("content-type",e);if(i===null){return"failure"}for(const e of i){const i=g(e);if(i==="failure"||i.essence==="*/*"){continue}r=i;if(r.essence!==t){A=null;if(r.parameters.has("charset")){A=r.parameters.get("charset")}t=r.essence}else if(!r.parameters.has("charset")&&A!==null){r.parameters.set("charset",A)}}if(r==null){return"failure"}return r}__name(extractMimeType,"extractMimeType");function gettingDecodingSplitting(e){const A=e;const t={position:0};const r=[];let i="";while(t.position<A.length){i+=a((e=>e!=='"'&&e!==","),A,t);if(t.position<A.length){if(A.charCodeAt(t.position)===34){i+=c(A,t);if(t.position<A.length){continue}}else{C(A.charCodeAt(t.position)===44);t.position++}}i=l(i,true,true,(e=>e===9||e===32));r.push(i);i=""}return r}__name(gettingDecodingSplitting,"gettingDecodingSplitting");function getDecodeSplit(e,A){const t=A.get(e,true);if(t===null){return null}return gettingDecodingSplitting(t)}__name(getDecodeSplit,"getDecodeSplit");var �`�          �`�           a�          a�           a�             o  �    5B            Я�          ��          ��           ��          ��           ��          0��        	  @��        
  P��          `��          p��        
  ���          ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  б�        #  ��        $  ��        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  в�        3  ��        4  ��        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  <  �d�        =  �d�        >  �d�        ?  �d�        @  �d�        A  �d�    �   B etadata,appendRequestOriginHeadethis,d)].type=="CLOSE"},"#A"),Lt=new WeakSet,re=h(function(){return a(this,E,C).call(this,i(this,d),"[")},"#y"),At=new WeakSet,ae=h(function(){return a(this,E,C).call(this,i(this,d),"]")},"#w"),P=new WeakSet,A=h(function(){let t=i(this,k)[i(this,d)],e=a(this,at,mt).call(this,i(this,it)).index;return i(this,st).substring(e,t.index)},"#c"),Tt=new WeakSet,he=h(function(){let t={};Object.assign(t,H),t.encodePart=_t;let e=ce(a(this,P,A).call(this),void 0,t);v(this,nt,zt(e))},"#C"),h(Ut,"H"),Ut),Mt=["protocol","username","password","hostname","port","pathname","search","hash"],j="*";function jt(t,e){if(typeof t!="string")throw new TypeError("parameter 1 is not of type \'string\'.");let s=new URL(t,e);return{protocol:s.protocol.substring(0,s.protocol.length-1),username:s.username,password:s.password,hostname:s.hostname,port:s.port,pathname:s.path   x    	     _vendor.jsonsnintocolrsng(ceAppConfig(segments);
            if (appConfig.dynamic === 'fo    	   �      package.json-parseracesionsbuild_templates_app-page_0k1m~lu.jsusing runtime = 'edge' which is currently incompatible with dynamic = 'force-static'. Please remove either "runtime" or "force-static" for correct behavior`);
            }
            rootParamKeys = (0, _collectrootparamkeys.collectRootParamKeys)(routeModule);
            // A page supports partial prerendering if it is an app page and either
            // the whole app has PPR enabled or this page has PPR enabled when we're
            // in incremental mode.
            isRoutePPREnabled = routeModule.definition.kind === _routekind.RouteKind.APP_PAGE && (0, _ppr.checkIsRoutePPREnabled)(pprConfig);
            // If force dynamic was set and we don't have PPR enabled, then set the
            // revalidate to 0.
            // TODO: (PPR) remove this once PPR is enabled by default
            if (appConfig.dynamic === 'force-dynamic' && !isRoutePPREnabled) {
                appConfig.revalidate = 0;
            }
            const route = (0, _app1.parseAppRoute)(page, true);
            // If the page is dynamic and we're not in edge runtime, then we need to
            // build the static paths. The edge runtime doesn't support static
            // paths.
            if (route.dynamicSegments.length > 0 && !pathIsEdgeRuntime) {
                ;
                ({ prerenderedRoutes, fallbackMode: prerenderFallbackMode } = await (0, _app.buildAppStaticPaths)({
                    dir,
                    page,
                    route,
                    cacheComponents,
                    authInterrupts,
                    segments,
                    distDir,
                    requestHeaders: {},
                    isrFlushToDisk,
                    cacheMaxMemorySize,
                    cacheHandler,
                    cacheLifeProfiles,
                    ComponentMod,
 ȯ�          Я�          ��          ��           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���        
  ���          ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  б�        "  ��        #  ��        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  в�        2  ��        3  ��        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A /  �c�        0  �c�        1   d�        2  d�        3   d�        4  0d�        5  @d�        6  Pd�        7  `d�        8  pd�        9  �d�        :  �d�        ;  �d�        <  �d�        =  �d�        >  �d�        ?  �d�        @  �d�        A ToMap(n);e.H_METHOD_MAP={};Object.keys(e.METHOD_MAP).forEach((A=>{if(/^H/.test(A)){e.H_METHOD_MAP[A]=e.METHOD_MAP[A]}}));var o;(function(e){e[e["SAFE"]=0]="SAFE";e[e["SAFE_WITH_CB"]=1]="SAFE_WITH_CB";e[e["UNSAFE"]=2]="UNSAFE"})(o=e.FINISH||(e.FINISH={}));e.ALPHA=[];for(let A="A".charCodeAt(0);A<="Z".charCodeAt(0);A++){e.ALPHA.push(String.fromCharCode(A));e.ALPHA.push(String.fromCharCode(A+32))}e.NUM_MAP={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9};e.HEX_MAP={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15};e.NUM=["0","1","2","3","4","5","6","7","8","9"];e.ALPHANUM=e.ALPHA.concat(e.NUM);e.MARK=["-","_",".",   x 
        groupsevtoolsein-tracesionsPHANUM.concat(e.MARK).concat(["%",";",":","&","=","+","$",","]);e.STRICT_URL_CHAR=["!",'"',"$","%","&","'","(",")","*","+",",","-",".","/",":",";","<","=",">","@","[","\\","]","^","_","`","{","|","}","~"].concat(e.ALPHANUM);e.URL_CHAR=e.STRICT_URL_CHAR.concat(["\t","\f"]);for(let A=128;A<=255;A++){e   n        
 test-utilsaccess-tracesions  �d�           e�    �      new s("invalid onInfo callback")}super("UNDICI_STREAM")}catch(e){if(o.isStream(a)){o.destroy(a.on("error",o.nop),e)}throw e}this.responseHeaders=g||null;this.opaque=n||null;this.factory=A;this.callback=t;this.res=null;this.abort=null;this.context=null;this.trailers=null;this.body=a;this.onInfo=c||null;this.throwOnError=Q||false;if(o.isStream(a)){a.on("error",(e=>{this.onError(e)}))}l(this,r)}onConnect(e,A){if(this.reason){e(this.reason);return}t(this.callback);this.abort=e;this.context=A}onHeaders(e,A,t,s){const{factory:c,opaque:l,context:g,callback:Q,responseHeaders:u}=this;const E=u==="raw"?o.parseRawHeaders(A):o.parseHeaders(A);if(e<200){if(this.onInfo){this.onInfo({statusCode:e,headers:E})}return}this.factory=null;let B;if(this.throwOnError&&e>=400){const t=u==="raw"?o.parseHeaders(A):E;const r=t["content-type"];B=new i;this.callback=null;this.runInAsyncScope(a,null,{callback:Q,body:B,contentType:r,statusCode:e,statusMessage:s,headers:E})}else{if(c===null){return}B=this.runInAsyncScope(c,null,{statusCode:e,headers:E,opaque:l,context:g});if(!B||typeof B.write!=="function"||typeof B.end!=="function"||typeof B.on!=="function"){throw new n("expected Writable")}r(B,{readable:false},(e=>{const{callback:A,res:t,opaque:r,trailers:i,abort:s}=this;this.res=null;if(e||!t.readable){o.destroy(t,e)}this.callback=null;this.runInAsyncScope(A,null,e||null,{opaque:r,trailers:i});if(e){s()}}))}B.on("drain",t);this.res=B;const h=B.writableNeedDrain!==void 0?B.writableNeedDrain:B._writableState?.needDrain;return h!==true}onData(e){const{res:A}=this;return A?A.write(e):true}onComplete(e){const{res:A}=th د�          ��          ��           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���        
  ���          ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           б�        !  ��        "  ��        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  в�        1  ��        2  ��        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  г�        A �        %  Pc�        &  `c�        '  pc�        (  �c�        )  �c�        *  �c�        +  �c�        ,  �c�        -  �c�        .  �c�        /  �c�        0   d�        1  d�        2   d�        3  0d�        4  @d�        5  Pd�        6  `d�        7  pd�        8  �d�        9  �d�        :  �d�        ;  �d�        <  �d�        =  �d�        >  �d�        ?  �d�        @   e�        A MDAMLIAFBFGoiAygCACICRQRAIAEoAhAiAkUNAiABQRBqIQMLA0AgAyEHIAIiAEEUaiIDKAIAIgINACAAQRBqIQMgACgCECIventListenersCode(){return`\n    Object.defineProperty(self, '__listeners', {\n      configurable: false,\n      enumerable: false,\n      value: {},\n      writable: true,\n    })\n\n    Object.defineProperty(self, '__conditionallyUpdatesHandlerList', {\n      configurable: false,\n      enumerable: false,\n      value: function(eventType) {\n        if (eve   n          package.jsononcheocolityonsself.__onUnhandledRejectionHandlers = self.__listeners[eventType];\n        } else if (eventType === 'error') {\n          self.__onErrorHandlers = self.__listeners[eventType];\n        }\n      },\n      writable: false,\n    })\n\n    function addEventListener(type, handler) {\n      const eventType = type.toLowerCase();\n      if (eventType === 'fetch' && self.__listeners.fetch) {\n        throw new TypeError('You can register just one "fetch" event listener');\n      }\n\n      self.__listeners[e   x 	   �      @supabasesoncacheextensions   e�          e�    �    
Object.defineProperty(exports, "exportPagesPage", {
    enumerable: true,
    get: function() {
        return exportPagesPage;
    }
});
const _renderresult = /*#__PURE__*/ _interop_require_default(require("../../server/render-result"));
const _path = require("path");
const _constants = require("../../lib/constants");
const _bailouttocsr = require("../../shared/lib/lazy-dynamic/bailout-to-csr");
const _modulerender = require("../../server/route-modules/pages/module.render");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function exportPagesPage(req, res, path, page, query, params, htmlFilepath, htmlFilename, pagesDataDir, buildExport, isDynamic, sharedContext, renderContext, hasOrigQueryValues, renderOpts, components, fileWriter) {
    if (components.getServerSideProps) {
        throw Object.defineProperty(new Error(`Error for page ${page}: ${_constants.SERVER_PROPS_EXPORT_ERROR}`), "__NEXT_ERROR_CODE", {
            value: "E15",
            enumerable: false,
            configurable: true
        });
    }
    // for non-dynamic SSG pages we should have already
    // prerendered the file
    if (!buildExport && components.getStaticProps && !isDynamic) {
        return;
    }
    // Pages router merges page params (e.g. [lang]) with query params
    // primarily to support them ��          ��           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  в�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  г�        @  ��        A ��          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�           c�        !   c�        "  0c�        #  @c�        $  Pc�        %  `c�        &  pc�        '  �c�        (  �c�        )  �c�        *  �c�        +  �c�        ,  �c�        -  �c�        .  �c�        /   d�        0  d�        1   d�        2  0d�        3  @d�        4  Pd�        5  `d�        6  pd�        7  �d�        8  �d�        9  �d�        :  �d�        ;  �d�        <  �d�        =  �d�        >  �d�        ?   e�        @  e�        A  e�    �   B esume){e.resume()}},write:(e,A,t)=>{const{req:r}=this;if(r.push(e,A)||r._readableState.destroyed){t()}else{r[u]=t}},destroy:(e,A)=>{const{body:t,req:r,res:i,ret:s,abort:n}=this;if(!e&&!s._re   n          libkage.jsonilities.sql.donedestroy(t,e);a.destroy(r,e);a.destroy(i,e);g(this);A(e)}}).on("prefinish",(()=>{const{req:e}=this;e.push(null)}));this.res=null;l(this,t)}onConnect(e,A){const{ret:t,res:r}=this;if(this.reason){e(this.reason);return}Q(!r,"pipeline cannot be retried");Q(!t.destroyed);this.abort=e;this.context=A}onHeaders(e,A,t){const{opaque:r,handler:i,context:s}=this;if(e<200){if(this.onInfo){const t=this.responseHeaders==="raw"?a.parseRawHeaders(A):a.parseHeaders(A);this.onInfo({statusCode:e,headers:t})}return}this.res=new C(t);let c;try{this.handler=null;const t=this.responseHeaders==="raw"?a.parseRawHeaders(A):a.parseHeaders(A);c=this.runInAsyncScope(i,null,{statusCode:e,headers:t,opaque:r,body:this.res,context:s})}catch(e){this.res.on("error",a.nop);throw e}i   n     	     package.jsonderanagerstyons  �c�          �c�          �c�          �c�          �c�           d�        	  d�        
   d�          0d�          @d�        
  Pd�          `d�          pd�          �d�          �d�          �d�          �d�          �d�          �d�          �d�          �d�           e�          e�           e�    8    ngth;else if("bigint"==typeof r){var h=Math.abs(Number(r));u=0===h?1:Math.floor(Math.log10(h))+1}else u=ArrayBufipeline(e,A){try{const t=new d(e,A);this.dispatch({...e,body:t.req},t);return t.ret}catch(e){return(new i).destroy(e)}}__name(pipeline,"pipeline");A.exports=pipeline}});var require_api_upgrade=__commonJS({"../../node_modules/.pnpm/undici@6.21.0/node_modules/undici/lib/api/api-upgrade.js"(e,A){"use strict";init_define_process();var{InvalidArgumentError:t,SocketError:r}=require_errors();var{AsyncResource:i}=__nccwpck_require__(852);var s=require_util();var{addSignal:n,removeSignal:o}=require_abort_signal();var a=__nccwpck_require__(491);var c=class _UpgradeHandler extends i{constructor(e,A){if(!e||typeof e!=="object"){th   o   �    Xx            ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���        
  ���          а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��           ��        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  в�        /  ��        0  ��        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  г�        ?  ��        @  ��        A    	  �a�        
  �a�          �a�          �a�        
  �a�           b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�            c�        !  0c�        "  @c�        #  Pc�        $  `c�        %  pc�        &  �c�        '  �c�        (  �c�        )  �c�        *  �c�        +  �c�        ,  �c�        -  �c�        .   d�        /  d�        0   d�        1  0d�        2  @d�        3  Pd�        4  `d�        5  pd�        6  �d�        7  �d�        8  �d�        9  �d�        :  �d�        ;  �d�        <  �d�        =  �d�   x    �      node_modulesment-extensions@   e�        A   e�    �   B map)?(l=0,o=u.get(s)||o):(o=null,l="string"==typeof s?s.length:"bigint"==typeof s?0===(l=Math.abs(Number(s)))?1:Math.floor(Math.log10(l))+1:ArrayBuffer.isView(s)?s.byteLength:0)}return r=i(e,s,r,n),null!==a&&(null!==o?(o.fork&&(a.fork=!0),tv(a,o.count,e)):0<l&&tv(a,l,e)),r;case"blocked":return tb?(e=tb,e.deps++):e=tb={chunk:null,value:null,reason:null,deps:1,errored:!1},a={handler:e,parentObject:r,key:n,map:i,path:t,arrayRoot:a},null===o.value?o.value=[a]:o.value.push(a),null===o.reason?o.reason=[a]:o.reason.push(a),null;case"pending":throw Error("Invalid forward reference.");default:return tb?(tb.errored=!0,tb.value=null,tb.reason=o.reason):tb={chunk:null,value:null,reason:o.reason,deps:0,errored:!0},null}}function tP(e,t){if(!ec(t))throw Error("Invalid Map initializer.");if(!0===t.$$consumed)throw Error("Already initialized Map.");return t.$$consumed=!0,new Map(t)}function tC(e,t){if(!ec(t))throw Error("Invalid Set initializer.");if(!0===t.$$consumed)throw Error("Already init!   n 
        segment-confignemagerssyons  �c�          �c�          �c�          �c�           d�          d�        	   d�        
  0d�          @d�          Pd�        
  `d�          pd�          �d�          �d�          �d�          �d�          �d�          �d�          �d�          �d�           e�          e�           e�          0e�    	    =p.serverComponentsHmrCache}if(U&&(M||o))try{s=await U.generateCacheKey(l,g?n:a)}catch(e){console.error("Failed to generate cache key for",n)}let H=f.nextFetchId??1;f.nextFetchId=H+1;let F=()=>{},q=async(t,r)=>{let c=["cache","credentials","headers","integrity","keepalive","method","mode","redirect","referrer","referrerPolicy","window","duplex",...t?[]:["signal"]];if(g){let e=n,t={body:e._ogBody||e.body};for(let r of c)t[r]=e[r];n=new Request(e.url,t)}else if ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���        
  а�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  в�        .  ��        /  ��        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  г�        >  ��        ?  ��        @   ��        A   ��    �   B )switch(p.type){case"prerender":case"prerender-client":case"validation-client":case"prerender-run 8a�          @a�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�        	  �a�        
  �a�          �a�          �a�        
   b�          b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�           0c�        !  @c�        "  Pc�        #  `c�        $  pc�        %  �c�        &  �c�        '  �c�        (  �c�        )  �c�        *  �c�        +  �c�        ,  �c�        -   d�        .  d�        /    
   �      package.jsonfallbackensions     2  Pd�        3  `d�        4  pd�        5  �d�        6  �d�        7  �d�        8  �d�        9  �d�        :  �d�        ;  �d�        <  �d�        =   e�        >  e�        ?   e�        @  0e�        A  0e�    �   B urn r.utf8;case"latin1":case"ascii":case"us-ascii":case"iso-8859-1":case"iso8859-1":case"iso88591":case"iso_8859-1":case"windows-1252":case"iso_8859-1:1987":case"cp1252":case"x-cp1252":return r.latin1;case"utf16le":case"utf-16le":case"ucs2":case"ucs-2":return r.utf16le;case"base64":return r.base64;default:if(void 0===t){t=!0,e=e.toLowerCase();continue}return r.other.bind(e)}}let r={utf8:(e,t)=>{if(0===e.length)return"";if("string"==typeof e){if(t<2)return e;e=Buffer.from(e,"latin1")}return e.utf8Slice(0,e.length)},latin1:(e,t)=>0===e.length?"":"string"==typeof e?e:e.latin1Slice(0,e.length),utf16le:(e,t)=>0===e.length?"":("string"==typeof e&&(e=Buffer.from(e,"latin1")),e.ucs2Slice(0,e.length)),base64:(e,t)=>0===e.length?"":("string"==typeof e&&(e=Buffer.from(e,"latin1")),e.base64Slice(0,e.length)),other:(e,t)=>{if(0===e.length)return"";"string"==typeof e&&(e=Buffer.from(e,"latin1"));try{return new TextDecoder(this).decode(e)}catch{}}};function n(e,r,n){let a=t(r);if(a)return a(e        �      package.jsonsparserolity    �c�          �c�          �c�           d�          d�           d�        	  0d�        
  @d�          Pd�          `d�        
  pd�          �d�          �d�          �d�          �d�          �d�          �d�          �d�          �d�           e�          e�           e�          0e�          @e�        oot-of-the-server]__01r432a._.js")
R.c("server/chunks/_next-internal_server_app_api_town_report_route_actions_0rg.uca.js")
R.m(14082)
module.exports=R.m(14082).exports
,1,1,1,1,1,1,1,1, ��           ��          0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          а�        
  ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  в�        -  ��        .  ��        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  г�        =  ��        >  ��        ?   ��        @  ��        A 1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 Ha�          Pa�          `a�          pa�          �a�          �a�          �a�          �a�          �a�        	  �a�        
  �a�          �a�           b�        
  b�           b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�           @c�        �      package.json-parser        ..     �E             route.ts%  �c�        &  �c�        '  �c�        (  �c�        )  �c�        *  �c�        +  �c�        ,   d�        -  d�        .   d�        /  0d�        0  @d�        1  Pd�        2  `d�        3  pd�        4  �d�        5  �d�        6  �d�        7  �d�        8  �d�        9  �d�        :  �d�        ;  �d�        <   e�        =  e�        >   e�        ?  0e�        @  @e�        A  @e�    �   B l up.`),"__NEXT_ERROR_CODE",{value:"E486",enumerable:!1,configurable:!0});i=s.slice(0,-2).concat(i).join("/");break;default:throw Object.defineProperty(Error("Invariant: unexpected marker"),"__NEXT_ERROR_CODE",{value:"E112",enumerable:!1,configurable:!0})}return{interceptingRoute:t,interceptedRoute:i}}},"./dist/esm/shared/lib/router/utils/parse-relative-url.js"(e,t,r){"use strict";r.d(t,{r:()=>a}),r("./dist/esm/shared/lib/utils.js");var n=r("./dist/esm/shared/lib/router/utils/querystring.js");function a(e,t,r=!0){let i=new URL("http://n"),s=t?new URL(t,i):e.startsWith(".")?new URL("http://n"):i,{pathname:o,searchParams:l,search:u,hash:c,href:d,origin:f}=e.startsWith("/")?new URL(`${s.protocol}//${s.host}${e}`):new URL(e,s);if(f!==i.origin)throw Object.defineProperty(Error(`invariant: invalid relative URL, router received ${e}`),"__NEXT_ERROR_CODE",{value:"E159",enumerable:!1,configurable:!0});return{auth:null,host:null,hostname:null,pathname:o,port:null,protocol:null,query:r?(0   x    	     analysisdulesess-tracesions ..     �q             route.ts/shared/lib/router/utils/querystring.js"(e,t,r){"use strict";function n(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function a(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function i(e){let t=new URLSearchParam (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          а�          ��        
  ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  в�        ,  ��        -  ��        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  г�        <  ��        =  ��        >   ��        ?  ��        @   ��        A   ��    �   B xports=require("next/dist/server/app-render/action-async-storage.external.js")},"../app-render/after-task-async-storage.external"(e){"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},"../../app-render/work-async-storage.external"(e){"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},"../../app-render/work-unit-async-storage.external"(e){"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},"./tags-manifest.external"(e){"use strict";e.e   y        `a�          pa�          �a�          �a�          �a�          �a�          �a�          �a�        	  �a�        
  �a�           b�          b�        
   b�          0b�          @b�          Pb�          `b�          pb�          �b�          �b�          �b�          x    �      node_modulesfallbackersions�b�          �b�          �b�           c�          c�           c�          0c�          @c�           Pc�        !  `c�        "  pc�        #  �c�        $  �c�        %  �c�        &  �c�        '  �c�        (  �c�        )  �c�        *  �c�        +   d�        ,  d�        -   d�        .  0d�        /  @d�        0  Pd�        1  `d�        2  pd�        3  �d�        4  �d�        5  �d�        6  �d�        7  �d�        8  �d�        9  �d�        :  �d�        ;   e�        <  e�        =   e�        >  0e�        ?  @e�        @  Pe�        A "node:zlib")},path(e){"use strict";e.exports=require("path")},stream(e){"use strict";e.exports=require("stream")},util(e){"use strict";e.exports=require("util")},"(react-server)/./dist/compiled/react-dom/cjs/react-dom.react-server.production.js"(e,t,r){"use strict";var n=r("(react-server)/./dist/compiled/react/react.react-server.js");function a(){}var i={d:{f:a,r:function(){throw Error("Invalid form element. requestFormReset must be passed a form that was rendered by React.")},D:a,C:a,L:a,m:a,X:a,S:a,M:a},p:0,findDOMNode:null};if(!n.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE)throw Error('The "react" package in this environment is not configured correctly. The "react-server" condition must be enabled in any environment that runs React Server Components.');function s(e,t){return"font"===e?"":"string"==typeof t?"use-credentials"===t?t:"":void 0}t.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=i,t.preconnect=function(e,t){"string"==typeof e&&(t=t?"string"==typeof    	   �      realtime-jsneionsagerssy":void 0:null,i.d.C(e,t))},t.prefetchDNS=function(e){"string"==typeof e&&i.d.D(e)},t.preinit=function(e,t){if("string"==typeof e&&t&&"string"==typeof t.as){var r=t.as,n=s(r,t.c   y        @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  а�          ��          ��        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  в�        +  ��        ,  ��        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  г�        ;  ��        <  ��        =   ��        >  ��        ?   ��        @  0��        A tring"==typeof t.referrerPolicy?t.referrerPolicy:void 0,imageSrcSet:"string"==typeof t.imageSrcSet?t.imageSrcSet:void 0,imageSizes:"string"==typeof t.imageSizes?t.imageSizes:void 0,media:"string"==typeof t.media?t.media:void 0})}},t.preloadModule=function(e,t){if("string"==typeof e)if(t){var r=s(t.as,t.crossOrigin);i.d.m(e,{as:"string"==typeof t.as&&"script"!==t.as?t.as:void 0,crossOrigin:r,integrity:"string"==typeof t.integrity?t.integrity:void 0})}else i.d.m(e)},t.version="19.3.0-canary-3f0b9e61-20260317"},"(react-server)/./dist/compiled/react-dom/react-dom}var i=s(n);if(typeof i!=="undefined"){t=i;break}}while(n!==(n=path.dirname(n)));if(r&&!process.env.BROWSERSLIST_DISABLE_CACHE){a.forEach((function(e){r[e]=t}))}return t}function pathInRoot(e){if(!process.env.BROWSERSLIST_RO ha�          pa�          �a�          �a�          �a�          �a�          �a�          �a�          �a�        	  �a�        
   b�          b�   n         package.jsonsgmanagerssy      @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�           `c�        !  pc�        "  �c�        #  �c�        $  �c�        %  �c�        &  �c�        '  �c�        (  �c�        )  �c�        *   d�        +  d�        ,   d�        -  0d�        .  @d�        /  Pd�        0  `d�        1  pd�        2  �d�        3  �d�        4  �d�        5  �d�        6  �d�        7  �d�        8  �d�        9  �d�        :   e�        ;  e�        <   e�        =  0e�        >  @e�        ?  Pe�        @  `e�        A p',
            list: lists.app
        });
        messages.push([
            '',
            '',
            '',
            ''
        ]);
    }
    pageInfos.set('/404', {
        ...pageInfos.get('/404') || pageInfos.get('/_error'),
        isStatic: useStaticPages404
    });
    // If there's no app /_notFound page present, then the 404 is still using the pages/404
    if (!lists.pages.includes('/404') && !((_lists_app = lists.app) == null ? void 0 : _lists_app.includes(_constants1.UNDERSCORE_NOT_FOUND_ROUTE))) {
        lists.pages = [
            ...lists.pages,
            '/404'
        ];
    }
    // Print the tree view for the pages directory.
    await printFileTree({
        routerType: 'pages',
        list: lists.pages
    });
    if (((_middlewareManifest_middleware = middlewareManifest.middleware) == null ? void 0 : (_middlewareManifest_middleware_ = _middlewareManifest_middlewarnamed_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0, externalHelpersModule H��          P��          `��          p��          ���          ���          ���          ���          ���        	  а�        
  ��          ��           ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  в�        *  ��        +  ��        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  г�        :  ��        ;  ��        <   ��        =  ��        >   ��        ?  0��        @  @��        A symbol), (signature) => getParameterCount(signature) > 2)) {
                      error2(location, Diagnostics.This_syntax_requires_an_imported_helper_named_1_with_2_parameters_which_is_not_compatible_with_the_one_in_0_Consider_upgrading_your_version_of_0, externalHelpersModuleNameText, name, 3);
                    }
                  }
                }
              }
            }
          }
          links.requestedExternalEmitHelpers |= helpers;
        }
      }
    }
  }
  function getHelperNames(helper) {
    switch (helper) {
      case 1 /* Extends */:
        return ["__extends"];
      case 2 /* Assign */:
        return ["__assign"];
      case 4 /* Rest */:
        return ["__rest"];
      case 8 /* Decorate */:
        return legacyDecorators ? ["__decorate"] : ["__esDecorate", "__runInitializers"];
      case 16 /* Metadata */:
        return ["__metadata"];
      case 32 /* Param */:
        return ["__param"];
      case 64 /* Awaiter */:
         n         adminpointssder3183d94a0ffc61cdf84296b   �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�        	   b�        
  b�           b�          0b�        
  @b�          Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�           pc�        !  �c�        "  �c�        #  �c�        $  �c�        %  �c�        &  �c�        '  �c�        (  �c�        )   d�        *  d�        +   d�        ,  0d�        -  @d�        .  Pd�        /  `d�        0  pd�        1  �d�        2  �d�        3  �d�        4  �d�        5  �d�        6  �d�        7  �d�        8  �d�        9   e�        :  e�        ;   e�        <  0e�        =  @e�        >  Pe�        ?  `e�        @  pe�        A  pe�    �   B         '(Partial Prerender)',
            'prerendered as static HTML with dynamic server-streamed content'
        ],
        usedSymbols.has('ƒ') && [
            'ƒ',
            '(Dynamic)',
            `server-rendered on demand`
        ]
    ].filter((x)=>x), {
        align: [
            'l',
            'l',
            'l'
        ],
        stringLength: (str)=>(0, _stripansi.default)(str).length
    }));
    print();
}
function printCustomRoutes({ redirects, rewrites, headers, onMatchHeaders }) {
    const printRoutes = (routes, type)=>{
        const isRedirects = type === 'Redirects';
        const isHeaders = type === 'Headers' || type === 'On Match Headers';
        print((0, _picocolors.underline)( X��          `��          p��          ���          ���          ���          ���          ���          а�        	  ��        
  ��           ��          ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  в�        )  ��        *  ��        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  г�        9  ��        :  ��        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B c/app/discovery/page.tsx <module evaluation>","default")},2961,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/app/discovery/page.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/app/discovery/page.tsx","default")},42476,a=>{"use strict";a.i(24668);var b=a.i(2961);a.n(b)},40510,a=>{a.n(a.i(42476))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0v~r8c3._.js.mapgeType, cacheComponents, authInterrupts, originalAppPath, isrFlushToDisk, cacheMaxMemorySize, nextConfigOutput, cacheHandler, cacheHandlers, cacheLifeProfiles, pprConfig, partialFallbacksEnabled, buildId, deploymentId, clientAssetToken, sriEnabled }) {
    // Skip page data collection for synthetic _global-error routes
    if (page === _constants1   n         distage.jsonr-managerssionsurn {
            isStatic: true,
            isRoutePPREnabled: false,
            prerenderFallbackMode: undefined,
            prerenderedRoutes: undefined,
            rootParamKeys: undefined,
            hasStaticProps: false, �a�          �a�          �a�          �a�          �a�          �a�          �a�          �a�           b�        	  b�        
   b�          0b�          @b�        
  Pb�          `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�           �c�        !  �c�        "  �c�        #  �c�        $  �c�        %  �c�        &  �c�        '  �c�        (   d�        )  d�        *   d�        +  0d�        ,  @d�        -  Pd�        .  `d�        /  pd�        0  �d�        1  �d�        2  �d�        3  �d�        4  �d�        5  �d�        6  �d�        7  �d�        8   e�        9  e�        :   e�        ;  0e�        <  @e�        =  Pe�        >  `e�        ?  pe�        @  �e�        A       onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Username:</span>
                <span className="ml-2 text-zinc-300">
                  {selectedSoul.username || "N/A"}
                </span>
              </div>
              <div>
             h��          p��          ���          ���          ���          ���          ���          а�          ��        	  ��        
   ��          ��           ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  в�        (  ��        )  ��        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  г�        8  ��        9  ��        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A             href={`/soul/chat?agent=${selectedSoul.username || selectedSoul.id}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
              >
                Chat
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
AAG4B,GAAY,CAAEtB,UAAU,CAAK,CAAC,CACjC,GAAqB,UAAlB,OAAOuB,GAAuB,CAAE1B,OAAQgC,OAAON,EAAQ,CAAC,MAC3D9B,EACA,GAAG+B,GAAY,CAAEvB,QAAAA,CAmBZkC,CAnBsBL,CAmBZO,QAAQ,CADzBD,AAC0BA,EADjBA,CADYA,EAjBsBZ,GAkB3BG,CADW,UACA,IACSS,EAAS,KAAK,CAnBG,CAAC,CACpD,GAAGrC,GAAU,CAAEA,OAAQ,EAAK,CAAC,CAC7B,GAAGI,GAAY,CAAEA,QAAAA,CAsBZmC,CAtBsBP,CAsBbM,QAAQ,CADxBD,AACyBA,EADhBA,GArBkCjC,GAqB3BwB,WAAW,IACQS,EAAS,KAAK,CAtBI,CAAC,CACpD,GAAGlC,GAAe,CAAEA,aAAa,CAAK,CAAC,AACzC,EAIA,IAAMgC,EAAO,CAAC,EACd,IAAK,IAAMvD,KAAOsD,EAAG,AACfA,CAAC,CAACtD,EAAI,EAAE,CACVuD,CAAI,CAACvD,EAAI,CAAGsD,CAAC,CAACtD,EAAAA,AAAI,EAGtB,OAAOuD,CATQxB,CACjB,CAxEA5D,EAAOC,OAAO,CAXcuB,CARV,CAACC,AAmBFM,E       �      og age.jsonsehema         ..     �m            route.ts,KAAOhB,EAAkBa,GAC5B,AAACX,EAAae,CAAlB,GAAsB,CAACL,EAAII,SAHJF,IAGYE,GACjCrB,EAAUiB,EAAII,CAD2BF,CACtB,CAAEL,IAAK,IAAMI,CAAI,CAACG,EAAI,CAAEN,WAAY,CAAC,CAACK,EAAOjB,EAAiBe,EAAMG,EAAAA,CAAI,EAAKD,EAAKL,UAAU,AAAC,GAEtH,OAAOE,EACT,EACwCjB,EAAU,CAAC,EAAG,aAAc,CAAEyB,OAAO,CAAK,GAWpDC,CAXwDF,EA6FtF,IAAIqD,EAAY,CAAC,SAAU,MAAO,OAAO,CAKrCG,EAAW,CAAC,MAAO,SAAU,OAAO,CA0DpCrD,EAAiB,MACnB,YAAYqE,CAAc,CAAE,CAE1B,IAAI,CAACC,OAAO,CAAmB,EAAhB,EAAoB3C,IACnC,IAAI,CAAC4C,E   y        �a�          �a�          �a�          �a�          �a�          �a�           b�          b�        	   b�        
  0b�          @b�          Pb�        
  `b�          pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�          �c�           �c�        !  �c�        "  �c�        #  �c�        $  �c�        %  �c�        &  �c�        '   d�        (  d�        )   d�        *  0d�        +  @d�        ,  Pd�        -  `d�        .  pd�        /  �d�        0  �d�        1  �d�        2  �d�        3  �d�        4  �d�        5  �d�        6  �d�        7   e�        8  e�        9   e�        :  0e�        ;  @e�        <  Pe�        =  `e�        >  pe�        ?  �e�        @  �e�        A unction(){return e.apply(null,arguments)}},t.cacheSignal=function(){return null},t.cloneElement=function(e,t,r){if(null==e)throw Error("The argument must be a React element, but you passed "+e+".");var n=v({},e.props),a=e.key;if(null!=t)for(i in void 0!==t.key&&(a=""+t.key)�    �      �    s�     �A                                               �@%j    p�"#    �Kj    �/�    �Kj    �/�                                     ��           ��          0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  в�        '  ��        (  ��        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  г�        7  ��        8  ��        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A type:e,compare:void 0===t?null:t}},t.startTransition=$,t.unstable_useCacheRefresh=function(){return P.H.useCacheRefresh()},t.use=function(e){return P.H.use(e)},t.useActionState=function(e,t,r){return P.H.useActionState(e,t,r)},t.useCallback=function(e,t){return P.H.useCallback(e,t)},t.useContext=function(e){return P.H.useContext(e)},t.useDebugValue=function(){},t.useDeferredValue=function(e,t){return P.H.useDeferredValue(e,t)},t.useEffect=function(e,t){return P.H.useEffect(e,t)},t.useEffectEvent=function(e){return P.H.useEffectEvent(e)},t.useId=function(){return P.H.useId()},t.useImperativeHandle=function(e,t,r){return P.H.useImperativeHandle(e,t,r)},t.useInsertionEffect=function(e,t){return P.H.useInsertionEffect(e,t)},t.useLayoutEffect=function(e,t){return P.H.useLayoutEffect(e,t)},t.useMemo=function(e,t){return P.H.useMemo(e,t)},t.useOptimistic=function(e,t){return P.H.useOptimistic(e,t)},t.useReducer=function(e,t,r){return P.H.useReducer(e,t,r)},t.useRef=function(e){return P.H.useRef(e)},t   n  	        package.jsonk            ..     ��             route.ts){return P.H.useSyncExternalStore(e,t,r)},t.useTransition=function(){return P.H.useTransition()},t.version="19.3.0-canary-3f0b9e61-20260317"},"./dist/compiled/react/index.js"(e,t,r){"use strict";e.exports=r("./dist/compiled/react/cjs/react.production.js")},"./dist/compiled/string-hash/index.js"(e){(()=>{"use strict";var t={328:e=>{e.exports=function(e){for(var t=5381,r=e.length;r;)t=33*t^e.charCodeAt(--r);return t>>>0}}},r={};function n(e){var a=r[e];if(void 0!==a)return a.exports;var i=r[e]={exports:{}},s=!0;try{t[e](i,i.exports,n),s=!1}finally{s&&delete r[e]}return i.exports}n.ab=__dirname+"/",e.exports=n(328)})()},"./dist/esm/lib/constants.js �a�          �a�          �a�          �a�          �a�          �a�           b�          b�           b�        	  0b�        
  @b�          Pb�          `b�        
  pb�          �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�          �c�          �c�           �c�        !  �c�        "  �c�        #  �c�        $  �c�        %  �c�        &   d�        '  d�        (   d�        )  0d�        *  @d�        +  Pd�        ,  `d�        -  pd�        .  �d�        /  �d�        0  �d�        1  �d�        2  �d�        3  �d�        4  �d�        5  �d�        6   e�        7  e�        8   e�        9  0e�        :  @e�        ;  Pe�        <  `e�        =  pe�        >  �e�        ?  �e�        @  �e�        A 
  }
}

export async function GET(req: NextRequest) {
  const url = r ���          ���          ���          ���          ���          а�          ��          ��           ��        	  ��        
   ��          0��          @��        
  P��          `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  в�        &  ��        '  ��        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  г�        6  ��        7  ��        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B ,c=Symbol(s);function u(e,t={}){if(c in e)return e;let{serialize:n}=r("./dist/compiled/cookie/index.js"),a=e.getHeader("Set-Cookie");return e.setHeader("Set-Cookie",[..."string"==typeof a?[a]:Array.isArray(a)?a:[],n(s,"",{expires:new Date(0),httpOnly:!0,sameSite:"none",secure:!0,path:"/",...void 0!==t.path?{path:t.path}:void 0}),n(o,"",{expires:new Date(0),httpOnly:!0,sameSite:"none",secure:!0,path:"/",...void 0!==t.path?{path:t.path}:void 0})]),Object.defineProperty(e,c,{value:!0,enumerable:!1}),e}},"./dist/esm/server/api-utils/node/try-get-preview-data.js"(e,t,r){"use strict";r.r(t),r.d(t,{tryGetPreviewData:()=>s});var n=r("./dist/esm/server/api-utils/index.js"),a=r("./dist/esm/server/web/spec-extension/cookies.js"),i=r("./dist/esm/server/web/spec-extension/adapters/headers.js");function s(e,t,s,o){var l,c;let u;if(s&&(0,n.checkIsOnDemandRevalidate)(e,s).isOnDemandRevalidate)return!1;if(n.SYMBOL_PREVIEW_DATA in e)return e[n.SYMBOL_PREVIEW_DATA];let d=i.o.from(e.headers),h=new        �      fine-tuning4    
         ..     L             route.tsr");
            } else if (flags & 1024 /* Async */) {
              return grammarErrorOnNode(modifier, Diagnostics._0_modifier_must_precede_1_modifier, "override", "async");
            }
            flags |= 16 /* Override */;
            lastOverride = modifier;
            break;
          case 125 /* PublicKeyword */:
          case 124 /* ProtectedKeyword */:
          case 123 /* PrivateKeyword */:
            const text = visibilityToString(modifierToFlag(modifier.kind));
            if (flags & 7 /* AccessibilityModifier */) {
              return grammarErrorOnNode(modifier, Diagnostics.Accessibility_modifier_already_seen);
            } else if (flags & 16 /* Override */) {
              return grammarErrorOnNode(modifier, Diagnostics._0_modifier_must_precede_1_modifier, text, "override");
            } else if (flags & 256 /* Static */) {
             �a�          �a�          �a�          �a�          �a�           b�          b�           b�          0b�        	  @b�        
  Pb�          `b�          pb�        
  �b�          �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�          �c�          �c�          �c�           �c�        !  �c�        "  �c�        #  �c�        $  �c�        %   d�        &  d�        '   d�        (  0d�        )  @d�        *  Pd�        +  `d�        ,  pd�        -  �d�        .  �d�        /  �d�        0  �d�        1  �d�        2  �d�        3  �d�        4  �d�        5   e�        6  e�        t-bold flex-shrink-0">
  ���          ���          ���          ���          а�          ��          ��           ��          ��        	   ��        
  0��          @��          P��        
  `��          p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  в�        %  ��        &  ��        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  г�        5  ��        6  ��        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B   {selectedSoul && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedSoul.name}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Username:</span>
                <span className="ml-2 text-zinc-300">
                  {selectedSoul.username || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Created:</span>
                <span className="ml-2 text-zinc-300">
                  {selectedSoul.created_at
                  �      package.jsonce-authorityons ..     Vw    
         auth-helper.ts     �
    �        auth.ts     �r           
 auto-match.ts     �t             cache.ts     SG    	         constants.ts     ��    	         conversation-context.ts     �i     	       
 daily-beat.ts     P    
 
        email.ts     En            i18n.tsx     Qu            i18n_dict.ts     �s    
        llm.ts     �7             	 logger.ts     Nn            model-switcher.ts     *n             persona-refiner.ts     )u            rag_chat_integration.ts     �m            rate-limiter.ts     �P             settings-helpers.ts     �z            
 soul-brain.ts     xm             soul-constraint-loader.ts     �             soul-constraints.ts     ]�            soul-growth.ts     s�             soul-memory-enhanced.ts     �    	         soul-memory.ts     o             soul-pipeline.ts     Wu             soul-presets.ts     k             soul-schedule-engine.ts     v             soul-social-network.ts     _g            soul.economy.ts     �g            soul.jobs.ts     �g             soul.reporter.ts     �g    !        soul.social.ts�    �0     "        souls�    �
    Y#        supabase     Sw    
 $        supabase-client.ts     �    �%        town-chat-client.ts     �u    &        town-simulator.ts     u    '        upagora_rag.ts     �     (        utils.ts     Ax    )        versions-diff.ts     �f    *        webhook-dispatcher.ts patch the same methods that React and our dev patch do.
// We may find other methods that could benefit from patching but if
// they exist we ought to consider patching them in all three places
patchConsoleMethod('error');
patchConsoleMethod('assert');
patchConsoleMethod('debug');
patchConsoleMethod('dir');
patchConsoleMethod('dirxml');
patchConsoleMethod('group');
patchConsoleMethod('groupCollapsed');
patchConsoleMethod('groupEnd');
patchC ���          ���          ���          а�          ��          ��           ��          ��           ��        	  0��        
  @��          P��          `��        
  p��          ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  в�        $  ��        %  ��        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  г�        4  ��        5  ��        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A f = useRef<DimensionData[]>(data || []);
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
    const r = size * 0.35;       �      package.jsonyerotocolityte current scores based on animation progress
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
        const x = �    �      �    i5    �A                                               (
%j    ,DO,    �Kj    8��*    �Kj    8��*                                     P��          `��          p��        
  ���          ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  в�        #  ��        $  ��        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  г�        3  ��        4  ��        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  AppRouteModule
            const ComponentMod = componentsResult.ComponentMod;
            let segments;
            try {
                segments = await (0,   n          package.jsonigmanagerssionsest.js app page or app route module because we
                // checked above that the page type is 'app'.
                routeModule);
            } catch (err) {
                throw Object.defineProperty(new Error(`Failed to collect configuration for ${page}`, {
                    cause: err
                }), "__NEXT_ERROR_CODE", {
                    value: "E434",
                    enumerable: false,
                    configurable: true
                });
            }
            appConfig = originalAppPath === _constants1.UNDERSCORE_GLOBAL_ERROR_ROUTE_ENTRY ? {} : reduceAppConfig(segments);
            if (appConfig.dynamic === 'force-static' && pathIsEdgeRuntime) {
                _log.warn(`Page "${page}" is using runtime = 'edge' which is currently inc   n         package.jsontionsocoleslease remove either "runtime" or "force-static" for correct behavior`);
            }
            rootParamKeys = (0, _collectrootparamkeys.collectRootParamKeys)(routeModule);
            // A page supports partial prerendering if it is an app page and either
            // the whole app has PPR enabled or this page has PPR enabled when we're
            // in incremental mode.
            isRoutePPREnabled = routeModule.definition.kind === _routekind.RouteKind.APP_PAGE && (0, _ppr.checkIsRoutePPREnabled)(pprConfig);
            // If force dynamic was set and we don't have PPR enabled, then set the
            // revalidate to 0.
            // TODO: (PPR) remove this once PPR is enabled by default
            if (appConfig.dynamic === 'force-dynamic' && !isRoutePPREnabled) {
                appConfig.revalidate = 0;
            }
            const route = (0, _app1.parseAppRoute)(page, true);
            // If the page is dynamic and we're not in edge runtime, then we need to
            // build the static paths. The edge runtime doesn't support static
            // paths.
            if (route.dynamicSegments.length > 0 && !pathIsEdgeRuntime) {
         �a�          �a�          �a�          �a�           b�          b�           b�          0b�          @b�        	  Pb�        
  `b�          pb�          �b�        
  �b�          �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�          �c�          �c�          �c�          �c�           �c�        !  �c�        "  �c�        #  �c�        $   d�        %  d�        &   d�        '  0d�        (  @d�        )  Pd�        *  `d�        Ȱ�          а�          ��          ��           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���        
  ���          ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  в�        "  ��        #  ��        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  г�        2  ��        3  ��        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A NEXT_IS_PRERENDER_HEADER;
    },
    NEXT_REQUEST_ID_HEADER: function() {
        return NEXT_REQUEST_ID_HEADER;
    },
    NEXT_REWRITTEN_PATH_HEADER: function() {
        return NEXT_REWRITTEN_PATH_HEADER;
    },
    NEXT_REWRITTEN_QUERY_HEADER: function() {
        return NEXT_REWRITTEN_QUERY_HEADER;
    },
    NEXT_ROUTER_PREFETCH_HEADER: function() {
        return NEXT_ROUTER_PREFETCH_HEADER;
    },
    NEXT_       �      package.jsonnachetracesionsCEDDJEDCyABIARHBEAgAkELNgIIIAIgATYCBEEHIQMM+AILQRkhAwyQAwsgAUEBaiEBDAILIAEgBEYEQEEaIQMMjwMLAkAgAS0AAEENaw4UtQG/Ab8BvwG/Ab8BvwG/Ab8BvwG/Ab8BvwG/Ab8BvwG/Ab8BvwEAvwELQQAhAyACQQA2AhwgAkGvCzYCECACQQI2AgwgAiABQQFqNgIUDI4DCyABIARGBEBBGyEDDI4DCyABLQAAIgBBO0cEQCAAQQ1HDbECIAFBAWohAQy6AQsgAUEBaiEBC0EiIQMM8wILIAEgBEYEQEEcIQMMjAMLQgAhCgJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAS0AAEEwaw43wQLAAgABAgMEBQYH0AHQAdAB0AHQAdAB0AEICQoLDA3QAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdABDg8QERIT0AELQgIhCgzAAgtCA   x    �      request.jsonighemagerssionsMuwILQgghCgy6AgtCCSEKDLkCC0IKIQoMuAILQgshCgy3AgtCDCEKDLYCC0INIQoMtQILQg4hCgy0AgtCDyEKDLMCC0IKIQoMsgILQgshCgyxAgtCDCEKDLACC0INIQoMrwILQg4hCgyuAgtCDyEKDK0CC0IAIQoCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAEtAABBMGsON8Aegment-prefetch';
const NEXT_HMR_REFRESH_HEADER = 'next-hmr-refresh';
const NEXT_HMR_REFRESH_HASH_COOKIE = '__next_hmr_refresh_hash__';
const NEXT_URL = 'next-url';
const RSC_CONTENT_TYPE_HEADER = 'text/x-component';
const NEXT_INSTANT_PREFETCH_HEADER = 'next-instant-navigation-testing-prefetch';
const NEXT_INSTANT_TEST_COOKIE = 'next-instant-navigation-testing';
const FLIGHT_HEADERS = [
    RSC_HEADER,
    NEXT_ROUTER_STATE_TREE_HEADER,
    NEXT_ROUTER_PREFETCH_HEADER,
    NEXT_HMR_REFRESH_HEADER,
    NEXT_ROUTER_SEGMENT_PREFETCH_HEADER
];
const NEXT_RSC_UNION_QUERY = '_rsc';
const NEXT_ROUTER_STALE_TIME_HEADER = 'x-nextjs-stale-time';
const NEXT_DID_POSTPONE_HEADER = 'x-nextjs-postponed';
const NEXT_REWRITTEN_PATH_HEADER = 'x-nextjs-rewritten-path';
const NEXT_REWRITTEN_QUERY_HEADER = 'x-nextjs-rewritten-query';
const NEXT_IS_PRERENDER_HEADER = 'x-nextjs-prerender';
const NEXT_ACTION_NOT_FOUND_HEADER = 'x-nextjs-action-not-found';
const NEXT_REQUEST_ID_HEADER = 'x-nextjs-request-id';
const NEXT_HTML_REQUEST_ID_HEADER = 'x-nextjs-html-request-id';
const NEXT_ACTION_REVALIDATED_HEADER = 'x-action-revalidated';

if ((typeof exports.default === 'function' || (typeof exports.default =�    �      �    ��     �A                                               �@%j    |�
%    �Kj    �r.    �Kj    �r.                                     pb�          �b�          �b�        
  �b�          �b�          �b�          �b�          �b�          �b�           c�          c�           c�          0c�          @c�          Pc�          `c�          pc�          �c�          �c�           ذ�          ��          ��           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���        
  ���          ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           в�        !  ��        "  ��        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  г�        1  ��        2  ��        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  д�        A  д�    �   B EHIAEgAGtBA2ohBgJAA0AgAEHwO2otAAAgAS0AACIFQSByIAUgBUHBAGtB/wFxQRpJG0H/AXFHDQEgAEEDRgRAQQYhAQziAgsgAEEBaiEAIAQgAUEBaiIBRw0ACyACIAc2AgAM+wILIAJBADYCAAyGAgtBMyEDIAQgASIARg35AiAEIAFrIAIoAgAiAWohByAAIAFrQQhqIQYCQANAIAFB9DtqLQAAIAAtAAAiBUEgciAFIAVBwQBrQf8BcUEaSRtB/wFxRw0BIAFBCEYEQEEFIQEM4QILIAFBAWohASAEIABBAWoiAEcNAAsgAiAHNgIADPoCCyACQQA2AgAgACEBDIUCC0E0IQMgBCABIgBGDfgCIAQgAWsgAigCACIBaiEHIAAgAWtBBWohBgJAA0AgAUHQwgBqLQAAIAAtAAAiBUEgciAFIAVBwQBrQf8BcUEaSRtB/wFxRw0BIAFBBUYEQEEHIQEM4AILIAFBAWohASAEIABBAWoiAEcNAAsgAiAHNgIADPkCCyACQQA2AgAgACEBDIQCCyABIARHBEADQCABLQAAQYA+ai0AACIAQQFHBEAgAEECRg0JDIECCyAEIAFBAWoiAUcNAAtBMCEDDPgCC0EwIQMM9wILIAEgBEcEQAN       �      package.jsonig-authorityons=typeof(u=o[n])?(as(e,t,u,l,n),delete o[n]):am(e,t,l,n);t.treeContext=i,t.keyPath=a;return}for(o=0;o<s;o++)n=r[o],t.treeContext=r6(i,s,o),am(e,t,n,o);t.treeContext=i,t.keyPath=a}function ac(e,t,r){r.status=5,r.rootSegmentID=e.nextSegmentId++;var n=r.tracked;if(null===n||null===(e=n.contentKeyPath))   n         priv-devtools-providers     ..�    4i            admin�    �F             agents�    �    
         auth�    �n            brain�    �o           	 dashboard�    �n            devtools�         	        guardian�    /h    
        jobs�    �             market�    o           
 notifications�    �     
        posts�    �h           
 reputation�    �>             search�    Pn            settings�    T    9         skills�    �s            soul�    Q             storage�    �u            town�    D             users�    6i             voice�    3              walletull!==i?i.rootSegmentID:e.nextSegmentId++),-1===r.childIndex)null===a?t.rootSlots=n.id:void 0===(r=t.workingMap.get(a))?aB(r=[a[1],a[2],[],n.id],a[0],t):r[3]=n.id;else{if(null===a){if(null===(e=t.rootSlots))e=t.rootSlots={};else if("number"==typeof e)throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.")}else if(void 0===(s=(i=t.workingMap).get(a)))e={},s=[a[1],a[2],[],e],i.set(a,s),aB(s,a[0],t);else if(null===(e=s[3]))e=s[3]={};else if("number"==typeof e)throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.");e[r.childIndex]=n.id}}}function af(e,t){null!==(e=e.trackedPostpones)&&null!==(t=t.tracked)&&null!==(t=t.contentKeyPath)&&void 0!==(e=e.workingMap.get(t))&&(e.length=4,e[2]=[],e[3]=null)}function ah(e,t,r){return n1(e,r,t.replay,t.node,t.childIndex,t.blockedBoundary,t.hoistableState,t.abortSet,t.keyPath,t.formatContext,t.context,t.treeContex �a�          �a�           b�          b�           b�          0b�          @b�          Pb�          `b�        	  pb�        
  �b�          �b�          �b�        
  �b�          �b�          �b�          �b�          �b�         ��    #      ��           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  г�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  д�        @  ��        A  ��    �   B ts', icon: FileText },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/calibrate', label: 'Calibrate', icon: Scale },
  { href: '/guardians', label: 'Guardians', icon: Users },
  { href: '/guardian/portal', label: 'Portal', icon: Sparkles },
  { href: '/voice', label: 'Voice Studio', icon: Mic },
  { href: '/gallery', label: 'Gallery', icon: Image },
  { href: '/distill', label: 'Self Distill', icon: Wand2 },
  { href: '/soul/import', label: 'Import Data', icon: Download },
  { href: '/soul/social', label: 'Social Feed', icon: Users },
  { href: '/about', label: 'About', icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
         �      distnt-translation-provider.tsx

  // Check if user has completed onboarding
  const [onboardingDone, setOnboardingDone] = useState(true)
  useEffect(() => {
    const done = localStorage.getItem('onboarding_complete')
    setOnboardingDone(done === 'true')
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-50">
              UpAgora
            </span>
            <span className="hidden sm:inline-block ml-1 text-xs text-zinc-500">Soul Distillation</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-zinc-800 text-�     �      �    G     �A                                               (
%j    �    �Kj    < �    �Kj    < �                                     ���          ���          ���        
  ���          б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��           ��        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  г�        /  ��        0  ��        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  д�        ?  ��        @  ��        A ͽDA�v����Ɠ�'���Ļ�kT���K�؋v���b;	�@TB	b���A�=M����5g��R�6$�)8�Ɂm�Y�J5xM�J�"~�\&��ٍi�f�ƞ���7T5��7nl_-ebW`g�����)���q��r��j%(����mF�1E}*���Y�MS�X�Q�G᫜����a|��1'E�0(� xrŮ�AI�~)����B���IA�+��?G�y�CJf4��/#R�C'N�h�s�D�u[P[�+��l�6E����1ʗ�#ڄ�\��J��+@5�:0���E|;Gs(��$9��<E}�'��6�����k�92ȁ	D�Y��v.�T�j��ipmel`��j��Kz�����A�Vܢ����\�+���AڿJkr�׫�R*j;j�}�@=I�4@�.&�
bs�X�d����H�"H�T�D�%�'����c�F�3�),f0�}y[PA*���M��g>v����b�2)��}��&�xJu�5��f�U�F%�F~;�jo�'vM��a7Z�����ZD?֪;�{�j���^�1��mM5e��ĆY.t�`��bPD��6�~�(Ԇ��U5�'�������[+C�֋�<��������E��[���H�n�m�������#T��d�Q.�1^Q����x1�v3[�f���BY�0KZ��i��뢀�*�
��#
�ڦ���,� @E�,�q�O� 
cQ6�B�j� B������; ��@����bA�1�Tߩ�꒻��[�wP�&T5閵�5x I�EH$���!u�מ��ߴ�'C� ���)hcX��1��K��p􂂪����4��.,.�R.%���o�Š����f�XH��nK0���g1{���.���q'p���8m^L<u�Ħ)ڼS�`K;6��.F��ր���r�գ/�%�,'8.�i��i%~�c��6�QVþd���_c�y'������;�ˉ��vC޳�p+V��   x    �      package.jsononrotocolesions`7�ӧ�3c�
˘��q�#��^�xJ��_δr��
�E���=�J9}���kX9��#~� v0��yS�x`�㕐Ն�
q(\xa���&��P:8$�Sx߁~Ö���@i��dMɢ�'ÈLh�R����J$�||�8��0c�<Z�;#���%�TU���v���)L�4�S��h?C��Tf�f*�I�i�
M�*#�p�3,�园�"c���,*?�%_��0�vPW�]��(���(�?~�O�Q�m%���P58u�D�'�G"-F<j���T�p�l+�R�B�M��O����� ��B.[\7��`駰�vP��S�N]Ň�U=�t uZV�Ke��x�i]\���f$g�0�I��)�4��H�����]N^J��ǜT���o��G���Z���jU�GG���a�%��4yI�=_�|����\�Es�g�0�0�4����T����?��4J@���6����D$Y��o�Y%9�� #�"��(t
>���/*&��GZ�n}F�(��PD��ȨV�I�`�g���Ī�K�+�u�f�&y
I�kt�4�g���S��-���'�ƒ����A/�U�O"�Al�C!ⱌ�i�b��C�*����0�W�k��sC��"���OH����_�9A��I]Z�իw��>Igq��I"�5:�փ��RD���cBg]��&N�`.�ĉ@tbʄNK��u�|�|y��z��:�b���}hL���8%H�]�N3����H//J	aA}�4-�+�_�C��˘tc�#���<đ
H�c�UG�1~�ق�8F&�a�*���$	��b��v�����X����֥�s�N�ޞ����c�D4ǎB:�&q텎k��W�hQN�kP��d&�l�w��^O*	Ak0�Z����[�%� ��2���H[ʭ#N���J%eZ��5�_�����٢�=y	'P�����k�dc����<�Bi
�v2����K���dT	���+��]ʞx�8%�A7�\��G��� w0R��������ᐘ��u(r������{`�V��+t�*3���Z�ԛ�N0��E9��dܸ6]"���O)�ӹ}5v�#�6*�q~�J�3I� >F�©Ub�RKUy��8e8d�'}y�α�0�\��Z�����Tv���s�S��bzKsy$�FP�]j�B�MmTIpn=a��ڿ��x��8A$�������ӈ��[����F�O#�7���d�l�ԡ��"��l�p֫6�Q:��lx3`�����4�4>F�Ԯ
��cr��i�j�W���urN�`����d��M���(#[�� 
eV��K�B�����#;S1�R�B�c�f�(e�ґ�y�����@��{�=�Bwѓt`		��:��E��%E��"WF�L�/?�"��e�����T��Կ+�Z��e���qD�����G�)��Eԧ	dO�ְ�����kOz�S9�a&�����;IG7y� d�C�)�b`gF��^����u�}��	r�����
������pK˜�/+���BE���f���q E�����?}t6pplay.nodes.length)throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");l.replay.pendingTasks--,l.abortSet.delete(l),aE(e,l.blockedBoundary,l.row,null)}catch(t){nE();var c=t===ne?nr():t;if("object"==typeof c&&null!==c&&"function"==typeof c.then){var d=l.ping;c.then(d,d),l.thenableState=t===ne?n_():null}else{l.replay.pendingTa ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���        
  б�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  г�        .  ��        /  ��        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  д�        >  ��        ?  ��        @   ��        A verutils.interpolateDynamicPath)(pathname, routeParams, routeRegex);
    const { name, ext } = _path.default.parse(lastSegment);
    const pagePath = _path.default.posix.join(segment, name);
    const suffix = getMetadataRouteSuffix(pagePath);
    const routeSuffix = suffix ? `-${suffix}` : '';
    return (0, _normalizepathsep.normalizePathSep)(_path.default.join(route, `${name}${routeSuffix}${ext}`));
}
function normalizeMetadataRoute(page) {
    if (!(0, _ismetadataroute.isMetadataPage)(page)) {
        return page;
    }
    let route = page;
    let suffix = '';
    if (page === '/robots') {
        route += '.txt';
    } else if (page === '/manifest') {
        route += '.webmanifest';
    } else {
        suffix = getMetadataRouteSuffix(page);
    }
    // Support both /<metadata-route.ext> and custom routes /<metadata-route>/route.ts.
    // If it's a metadata file route, we need to append /[id]/route to the page.
    if (!route.endsWith('/route')) {
        const { dir, name: baseName,   n         contextsjsonsacheagerssions/[turbopack]_runtime.js";
const RELATIVE_ROOT_PATH = "..";
const ASSET_PREFIX = "/_next/";
const WORKER_FORWARDED_GLOBALS = ["NEXT_DEPLOYMENT_ID","NEXT_CLIENT_ASSET_SUFFIX"];
// Apply forwarded globals from workerData if running in a worker thread
if (typeof require !== 'undefined') {
    try {
        const { workerDatateExtension = routePagePath.endsWith('/sitemap') ? '.xml' : '';
    const mapped = isDynamic ? `${routePagePath}/[__metadata_id__]` : `${routePagePath}${metadataRouteExtension}`;
    return mapped + (isRoute ? '/route' : '');
}

//# sourceMappingURL=get-metadata-route.js.mapAAIAI2AgwMBAsgBSgCGCEGIAUgBSgCDCIARwRAQZzQACgCABogACAFKAIIIgI2AgggAiAANgIMDAMLIAVBFGoiAygCACICRQRAIAUoAhAiAkUNAiAFQRBqIQMLA0AgAyEHIAIiAEEUaiIDKAIAIgINACAAQRBqIQMgACgCECICDQALIAdBADYCAAwCCyAFIABBfnE2AgQgASAEaiAENgIAIAEgBEEBcjYCBAwDC0EAIQALIAZFDQACQCAFKAIcIgJBAnRBvNIAaiIDKAIAIAVGBEAgAyAANgIAIAANAUGQ0ABBkNAAKAIAQX4gAndxNgIADAILIAZBEEEUIAYoAhAgBUYbaiAANgIAIABFDQELIAAgBjYCGCAFKAIQIgIEQCAAIAI2AhAgAiAANgIYCyAFQRRqKAIAIgJFDQAgAEEUaiACNgIAIAIgADYCGAsgASAEaiAENgIAIAEgBEEBcjYCBCABQaDQACgCAEcNAEGU0AAgBDYCAAwBCyAEQf8BTQRAIARBeHFBtNAAaiEAAn9BjNAAKAIAIgJBASAEQQN2dCIDcUUEQEGM0AAgAiADcjYCACAADAELIAAoAggLIgIgATYCDCAAIAE2AgggASAANgIMIAEgAjYCCAwBC0EfIQIgBEH///8HTQRAIARBJiAEQQh2ZyIAa3ZBAXEgAEEBdGtBPmohAgsgASACNgIcIAFCADcCECACQQJ0QbzSAGohAAJAQZDQACgCACIDQQEgAnQiB3FFBEAgACABNgIAQZDQACADIAdyNgIAIAEgADYCGCABIAE2AgggASABNgIMDAELIARBGSACQQF2a0EAIAJBH0cbdCECIAAoAgAhAAJAA0AgACIDKAIEQXhxIARGDQEgAkEddiEAIAJBAXQhAiADIABBBHFqQRBqIgcoAgAiAA0ACyAHIAE2AgAgASADNgIYIAEgATYCDCABIAE2AggMAQsgAygCCCIAIAE2AgwgAyABNgIIIAFBADYCGCABIAM2AgwgASAANgIIC0Gs0ABBrNAAKAIAQQFrIgBBfyAAGzYCAAsLBwAgAC0AKAsHACAALQAqCwcAIAAtACsLBwAgAC0AKQsHACAALwEyCwcAIAAtAC4LQAEEfyAAKAIYIQEgAC0ALSECIAAtACghAyAAKAI4IQQgABAwIAAgBDYCOCAAIAM6ACggACACOgAtIAAgATYCGAu74gECB38DfiABIAJqIQQCQCAAIgIoAgwiAA0AIAIoAgQEQCACIAE2AgQLIwBBEGsiCCQAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACfwJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkA ��           ��          0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          б�        
  ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  г�        -  ��        .  ��        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  д�        =  ��        >  ��        ?   ��        @  ��        A ansition-colors"
              >
                More
                <ChevronDown className={cn('h-3 w-3 transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg py-1 z-50">
                  {extraLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                        pathname === href
                          ? 'bg-zinc-800 text-zinc-50'
                          : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label   n         clientizersnsg                 ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link href="/search" className="hidden md:inline-flex">
              <button className="rounded-lg p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </Link>

            {loading ? (
              <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800 transition-colors"
                >
                  <Avatar name={user.name} size="sm" />
                  <ChevronDown className={cn('h-3 w-3 text-zinc-500 transition-transform', userMenuOpen && 'rotate-180')} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <p className="text-sm font-medium text-zinc-50">{user.name}</p>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    {!onboardingDone && (
                      <Link
            (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          б�          ��        
  ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  г�        ,  ��        -  ��        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  д�        <  ��        =  ��        >   ��        ?  ��        @   ��        A   ��    �   B t #${eventId}`,
      })
      .select()
      .single();

    return responseEvent;
  }
}

export const webhookDispatcher = new WebhookDispatcher();
 reacts authentically
5. The dialogue should feel alive, not rigid — emotions, disagreements, and agreements are natural
6. Use the language style specified for each soul

Generate a ${10}-turn dialogue where both voices are clearly distinct.`;
}

async function generateDialogue(systemPrompt: string, maxTurns: number): Promise<any> {
  // Use DeepSeek LLM for dialogue generation
  const deepseekUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!deepseekKey) {
    // Fallback: return a simulated dialogue
    return generateFallbackDialogue(maxTurns);
  }

  try {
    const response = await fetch(deepseekUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKe    n 	       
 route-matchesent-extensions     model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Please generate the dialogue now in JSON format with a 'turns' array. Each turn has 'speaker' (soul_a or soul_b), 'line' (the spoken text), and 'context' (body language, tone, etc.). Include a 'summary' at the top level." },
        ],
        temperature: 0.9,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse as JSON, fallback to structured extraction
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      return {
        summary: "Dialogue generated (raw text parsing needed)",
        turns: extractTurns(content),
        raw: content,
      };
    }
  } catch (err) {
    logger.error("[soul-dialogue] LLM error:", err);
    return generateFallbackDialogue(maxTurns);
  }
}

function extractTurns(content: string): any[] {
  const lines = content.split("\n");
  const turns: any[] = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)/);
    if (match) {
      if (current) turns.push(current);
      current = { speaker: match[1].toLowerCase(), line: match[2].trim() };
    } else if (current && line.trim()) {
      current.line += " " + line.trim();
    }
  }
  if (current) turns.push(current);

  return turns.length > 0 ? turns : [{ speaker: "narrator", line: content.slice(0, 500) }];
}

function generateFallbackDialogue(maxTurns: number): any {
  return {
    summary: "Soul-to-soul dialogue (simulated)",
    turns: Array.from({ length: Math.min(maxTurns, 6) }, (_, i) => ({
      speaker: i % 2 === 0 ? "soul_a" : "soul_b",
      line: i % 2 === 0
        ? `I wonder what would happen if our times overlapped... there is much I wish to understand about your world.`
        : `The world changes, yet human  8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  б�          ��          ��        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  г�        +  ��        ,  ��        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  д�        ;  ��        <  ��        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B t(...e),a=e[0];a instanceof Error&&a.message}}])},86823,e=>{"use strict";var t=e.i(47909),r=e.i(74017),n=e.i(96250),a=e.i(59756),s=e.i(61916),i=e.i(74677),o=e.i(69741),l=e.i(16795),u=e.i(87718),p=e.i(95169),d=e.i(47587),c=e.i(66012),h=e.i(70101),g=e.i(26937),f=e.i(10372),m=e.i(93695);e.i(52474);var v=e.i(5232),x=e.i(50377);let y=(0,e.i(24389).createClient)("https://dfqeafreiwpyrzcdvegm.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY);async function R(e){try{let t=e.headers.get("authorization");if(!t)return Response.json({error:"Missing auth"},{status:401});let r=await y.auth.getUser(t.replace("Bearer ",""));if(r.error)return Response.json({error:r.error.message},{status:401});let n=r.data.user.id,{share_slug:a,signature_text:s}=await e.json();if(!a||!s||s.trim().length<2)return Response.json({error:"share_slug and signature_text (min 2 chars) required"},{status:400});let i=Date.now(),o=btoa(`${n}:${a}:${i}:${s}`).slice(0,32),{data:l}=await y.from("guardian_signatures").selec   x 
   �      navigation-typesmaxtensions ..     �    	         route.ts�    D             welcomed for this soul"},{status:409});let{data:u,error:p}=await y.from("guardian_signatures").insert({share_slug:a,guardian_id:n,signature:o,signature_text:s,signed_at:new Date().toISOString()}).select().single();if(p)return x.logger.error("Guardian sig error:",p),Response.json({error:"Signature failed"},{status:500});let{count:d}=await y.from("guardian_signatures").select("*",{count:"exact",head:!0}).eq("share_slug",a);return Response.json({success:!0,signature_id:u.id,signature_hash:u.signature,total_signatures:d||1,message:"Soul signed as authentic"})}catch(e){return x.logger.error("Guardian sig error:",e),Response.json({error:"Internal server error"},{status:500})}}e.s(["POST",0,R],52570);var w=e.i(52570);let _ire,collectedStale:J(en.stale),collectedTags:en.tags,renderResumeDataCache:nz(p)}}}if(S.isRoutePPREnabled){let e,s=(0,tV.uO)(_),l=nB(),u=Q={type:"prerender-ppr",phase:"render",rootParams:$,fallbackRouteParams:i,implicitTags:f,dynamicTracking:s,revalidate:ey.AR,expire:ey.AR,stale:ey.AR,tags:[...f.tags],prerenderResumeDataCache:l},c=await eQ.workUnitAsyncStorage.run(u,l$,a,r,{is404:404===t.statusCode});e=V=await tn(eQ.workUnitAsyncStorage.run(u,tf,b,c,K,{filterStackFrame:o,onError:z}));let d={type:"prerender-ppr",phase:"render",rootParams:$,fallbackRouteParams:i,implicitTags:f,dynamicTracking:s,revalidate:ey.AR,expire:ey.AR,stale:ey.AR,tags:[...f.tags],prerenderResumeDataCache:l},p=tc(G),{prelude:v,postponed:w}=await eQ.workUnitAsyncStorage.run(d,ty,(0,T.jsx)(lN,{reactServerStream:e.asUnclosingStream(),reactDebugStream:void 0,debugEndTime:void 0,preinitScripts:U,ServerInsertedHTMLProvider:I,nonce:h,images:r.renderOpts.images}),{onError:X,onHeaders:p,maxHeadersLength:x,bootstrapScripts:[F]}),S=rK({polyfills:L,renderServerInsertedHTML:D,serverCapturedErrors:q,basePath:y,tracingMetadata:M}),E=await et(e.asStream());lY(g)&&(n.flightData=E,await l0(E,d,b,m,r.pagePath,n));let{prelude:R,preludeIsEmpty:k}=a   y        P��          `��          p��          ���          ���          ���          ���          ���        	  б�        
  ��          ��           ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  г�        *  ��        +  ��        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  д�        :  ��        ;  ��        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B zinc-800"
                    >
                      <Image className="h-4 w-4" />
                      Gallery
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-50 hover:bg-zinc-700 transition-colors"
              >
                <User className="h-4 w-4" />
                Login
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
                 x    �      distede.jsonschemapen)}
              className="md:hidden rounded-lg p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === href
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user && !onboardingDone && (
              <Link
                href="/onboarding"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Create Soul
              </Link>
            )}
            {extraLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === href
                    ? 'bg-zinc-800 text-zinc-50'
                    : X��          `��          p��          ���          ���          ���          ���          ���          б�        	  ��        
  ��           ��          ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  г�        )  ��        *  ��        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  д�        9  ��        :  ��        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B , React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-zinc-400", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
ouls:
${personas.map((p) => `${p.name} (mood: ${p.mood}):\n${p.persona_text.slice(0, 500)}`).join("\n\n")}

Conversation so far:
${con   n 
        package.jsonschemacklnsions ..     g&             page.tsxessage}"

Generate 2-4 lines of response from the souls. They might:
- Acknowledge the guardian
- Share thoughts with them
- Continue their own conversation with the guardian interwoven

Return ONLY a JSON array: [{ speaker, text }]. The speaker should be one of the soul names. At most 4 lines total.`;

    let soulResponses: any[] = [];
    const llmOptions = [
      { client: deepseek, model: "deepseek-chat", name: "deepseek" },
      ...fallbackProviders.map((p) => ({
        client: p.client,
        model: p.model,
        name: p.name,
      })),
    ];

    for (const opt of llmOptions) {
      try {
        const res = await (opt as any).chat.completions.create({
          model: opt.model,
          messages: [{ role: "user", content: responsePrompt }],
          temperature: 0.9,
          max_tokens: 600,
        });
        const content = res.choices[0]?.message?.content?.trim() || "";
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            soulResponses = parsed;
            break;
          }
        }
      } catch (e) {
        // Continue to next provider
        continue;
      }
    }

    // Fallback response if all LLMs fail
    if (!soulResponses.length) {
      soulResponses = personas.map((p) => ({
        speaker: p.name,
        text: `Hey guardian! We felt you join us. I'm feeling ${p.mood} today at the ${spaceName}.`,
      }));
    }

    // Save guardian message to event
    const updatedConversation = [
      ...existingConversation,
      { speaker: "Guardian", text: message },
      ...soulResponses,
    ];

    await supabase
      .from("town_events")
      .update({
        content: {
          ...event.content,
          conversation: updatedConversation,
          guardian_joined_at: new Date().toISOString(),
          guardian_id: guardianId,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", event_ h��    #      p��          ���          ���          ���          ���          ���          б�          ��        	  ��        
   ��          ��           ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  г�        (  ��        )  ��        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  д�        8  ��        9  ��        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A =c(181).PropagationAPI.getInstance()},874:(a,b)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.NoopTextMapPropagator=void 0,b.NoopTextMapPropagator=class{inject(a,b){}extract(a,b){return a}fields(){return[]}}},194:(a,b)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.defaultTextMapSetter=b.defaultTextMapGetter=void 0,b.defaultTextMapGetter={get(a,b){if(null!=a)return a[b]},keys:a=>null==a?[]:Object.keys(a)},b.defaultTextMapSetter={set(a,b,c){null!=a&&(a[b]=c)}}},845:(a,b,c)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.trace=void 0,b.trace=c(997).TraceAPI.getInstance()},403:(a,b,c)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.NonRecordingSpan=void 0;let d=c(476);b.NonRecordingSpan=class{constructor(a=d.INVALID_SPAN_CONTEXT){this._spanContext=a}spanContext(){return this._spanContext}setAttribute(a,b){return this}setAttributes(a){return this}addEvent(a,b){return this}setStatus(a){return this}updateName(a){return this}end(a){}isRecording(){return!1}recordException(a,b){}   x 	        analysisoragenchearacesionsbuild_templates_app-page_0evvoi9.jsid 0;let d=c(491),e=c(607),f=c(403),g=c(139),h=d.ContextAPI.getInstance();b.NoopTracer=class{startSpan(a,b,c=h.active()){var d;if(null==b?void 0:b.root)return new f.NonRecordingSpan;let i=c&&(0,e.getSpanContext)(c);return"object"==typeof(d=i)&&"string"==typeof d.spanId&&"string"==typeof d.traceId&&"number"==typeof d.traceFlags&&(0,g.isSpanContextValid)(i)?new f.NonRecordingSpan(i):new f.NonRecordingSpan}startActiveSpan(a,b,c,d){let f,g,i;if(arguments.length<2)return;2==arguments.length?i=b:3==arguments.length?(f=b,i=c):(f=b,g=c,i=d);let j=null!=g?g:h.active(),k=this.startSpan(a,f,j),l=(0,e.setSpan)(j,k);return h.with(l,i,void 0,k)}}},124:(a,b,c)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.NoopTracerProvider=void 0;let d=c(614);b.NoopTracerProvider=class{getTracer(a,b,c){return new d.NoopTracer}}},125:(a,b,c)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.ProxyTracer=void 0;let d=new(c(614)).NoopTracer;b.ProxyTracer=class{constructor(a,b,c,d){this._provider=a,this.name=b,this.version=c,this.options=d}startSpan(a,b,c){return this._getTracer().startSpan(a,b,c)}startActiveSpan(a,b,c,d){let e=this._getTracer();return Reflect.apply(e.startActiveSpan,e,arguments)}_getTracer(){if(this._delegate)return this._delegate;let a=this._provider.getDelegateTracer(this.name,this.version,this.options);return a?(this._delegate=a,this._delegate):d}}},846:(a,b,c)=>{Object.defineProperty(b,"__esModule",{value:!0}),b.ProxyTracerProvider=void 0;let d=c(125),e=new(c(124)).NoopTracerProvider;b.ProxyTracerProvider=class{getTracer(a,b,c){var e;return null!=(e=this.getDelegateTracer(a,b,c))?e:new d.ProxyTracer(this,a,b,c)}getDelegate(){var a;return null!=(a=this._delegate)?a:e}setDelegate(a){this._delegate=a}getDelegateTracer(a,b,c){var d;return null==(d=this._delegate)?void 0:d.getTracer(a,b,c)}}},996:(a,b)=>{var c;Object.defineProperty(b,"__esModule",{value:!0}),b.SamplingDecision=void 0,(c=b.SamplingDecision||(b.SamplingDecision={}))[c.NOT_RECOR x��          ���          ���          ���          ���          ���          б�          ��          ��        	   ��        
  ��           ��          0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  г�        '  ��        (  ��        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  д�        7  ��        8  ��        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A h:!0}})}update(e,t,s){return this._client.post(t1`/organization/groups/${e}`,{body:t,...s,__security:{adminAPIKeyAuth:!0}})}list(e={},t){return this._client.getAPIList("/organization/groups",tC,{query:e,...t,__security:{adminAPIKeyAuth:!0}})}delete(e,t){return this._client.delete(t1`/organization/groups/${e}`,{...t,__security:{adminAPIKeyAuth:!0}})}}sx.Users=s$,sx.Roles=sI;class sP extends tY{retrieve(e,t,s){let{project_id:r}=t;return this._client.get(t1`/organization/projects/${r}/api_keys/${e}`,{...s,__security:{adminAPIKeyAuth:!0}})}list(e,t={},s){return this._client.getAPIList(t1`/organization/projects/${e}/api_keys`,tT,{query:t,...s,__security:{adminAPIKeyAuth:!0}})}delete(e,t,s){let{project_id:r}=t;return this._client.delete(t1`/organization/projects/${r}/api_keys/${e}`,{...s,__security:{adminAPIKeyAuth:!0}})}}class sS extends tY{list(e,t={},s){return this._client.getAPIList(t1`/organization/projects/${e}/certificates`,tT,{query:t,...s,__security:{adminAPIKeyAuth:!0}})}activate(e,t,s){re   x    �      pagesge.jsontprotocolation/projects/${e}/certificates/activate`,tj,{body:t,method:"post",...s,__security:{adminAPIKeyAuth:!0}})}deactivate(e,t,s){return this._client.getAPIList(t1`/organization/projects/${e}/certificates/deactivate`,tj,{body:t,method:"           �)�          �)�          �)�          �)�          �)�           *�          *�           *�        	  0*�        
  @*�          P*�          `*�        
  p*�          �*�          �*�          �*�          �*�          �*�          �*�          �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�           �+�        !  �+�        "  �+�        #  �+�        $  �+�        %  �+�        &   ,�        '  ,�        (   ,�        )  0,�        *  @,�        +  P,�        ,  `,�        -  p,�        .  �,�        /  �,�        0  �,�        1  �,�        2  �,�        3  �,�        4  �,�        5  �,�        6   -�        7  -�        8   -�        9  0-�        :  @-�        ;  P-�        <  `-�        =  p-�        >  �-�        ?  �-�        @  �-�        A  �-�    �   B listRateLimits(e,t={},s){return this._client.getAPIList(t1`/organization/projects/${e}/rate_limits`,tT,{query:t,...s,__security:{adminAPIKeyAuth:!0}})}updateRateLimit(e,t,s){let{project_id:r,...n}=t;return this._client.post(t1`/organization/projects/${r}/rate_limits/${e}`,{body:n,...s,__security:{adminAPIKeyAuth:!0}})}}class sj extends tY{create(e,t,s){return this._client.post(t1`/projects/${e}/roles`,{body:t,...s,__security:{adminAPIKeyAuth:!0}})}retrieve(e,t,s){let{project_id:r}=t;return this._client.get(t1`/proje   y        ���          ���          ���          ���          б�          ��          ��           ��        	  ��        
   ��          0��          @��        
  P��          `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  г�        &  ��        '  ��        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  д�        6  ��        7  ��        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A ","14.0":"93",14.1:"93",14.2:"93","15.0":"94",15.1:"94",15.2:"94",15.3:"94",15.4:"94",15.5:"94","16.0":"96",16.1:"96",16.2:"96","17.0":"98",17.1App.getInitialProps) {
        if (ctx.ctx && ctx.Component) {
            // @ts-ignore pageProps default
            return {
                pageProps: await loadGetInitialProps(ctx.Component, ctx.ctx)
            };
        }
        return {};
    }
    const props = await App.getInitialProps(ctx);
    if (res && isResSent(res)) {
        return props;
    }
    if (!props) {
        const message = `"${getDisplayName(App)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
        throw Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
            value: "E1025",
            enumerable: false,
            configurable: true
        });
    }
    if (process.env.NODE_ENV !== 'production') {
        if (Object.keys(props).length === 0 && !ctx.ctx) {
            console.warn(`${getDisplayName(App)} returne     	   �      package.jsonigin-extensionsacing":z()}],"border-spacing-x":[{"border-spacing-x":z()}],"border-spacing-y":[{"border-spacing-y":z()}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["","all","colors","opacity","shadow","transform","none",aa,U]}],"transition-behavior":[{transition:["normal","discrete"]}],duration:[{duration:[I,"initial",aa,U]}],ease:[{ease:["linear","initial",r,aa,U]}],delay:[{delay:[I,aa,U]}],animate:[{animate:["none",s,aa,U]}],backface:[{backface:["hidden","visible"]}],perspective:[{perspective:[p,aa,U]}],"perspective-origin":[{"perspective-origin":v()}],rotate:[{rotate:at()}],"rotate-x":[{"rotate-x":at()}],"rotate-y":[{"rotate-y":at()}]r(page, message){
        super();
        this.message = `Failed to load static file for page: ${page} ${message}`;
    }
}
class MiddlewareNotFoundError extends Error {
    constructor(){
        super();
        this.code = 'ENOENT';
        this.message = `Cannot find the middleware module`;
    }
}
function stringifyError(error) {
    return JSON.stringify({
        message: error.message,
        stack: error.stack
    });
}

//# sourceMappingURL=utils.js.map6EAA6E,CAClI,eAAgB,CAjI4B,IAAA,EAAA,CAAA,CAAA,OAiIY,6EAA6E,AACvI,EAAG,EAAE,CAAC,CAGOO,EAAe,CACxBC,QAHyBN,CAGhBD,CAHsCE,CAAC,CAACC,IAAI,CAACF,GAItDO,UAH4BP,CAGjBG,CAHuCC,CAAC,CAACF,IAAI,CAACF,EAI7D,EAuBaQ,EAAc,IAAI,EAAA,kBAAkB,CAAC,CAC9CC,WAAY,CACRC,KAAM,EAAA,SAAS,CAACC,QAAQ,CACxBC,KAAM,2BACNC,SAAU,sBAEVC,WAAY,GACZC,SAAU,GACVC,SAAU,EAAE,AAChB,EACAC,SAAU,CACNC,WAAYlC,CAChB,EACAmC,QAAS,CAAA,OACTC,IADiD,eACc,CAA3C,CACxB,GA6BO,eAAeqB,EAAQC,CAAG,CAAEC,CAAG,CAAEC,CAAG,MACnCC,EAAOC,EAA4CC,EAAmCC,EAgE9E8D,EA/DRlE,EAAIK,WAAW,EAAE,AACjB,CAAA,EAAA,EAAA,cAAA,AAAc,EAACP,EAAKE,EAAIK,WAAW,EAEnCzC,EAAY0C,KAAK,EACjB,AADmB,AACnB,CAAA,EAAA,EAAA,cAAc,AAAd,EAAeR,EAAK,+BAAgCS,QAAQC,MAAM,CAACC,MAAM,IAE7E,IAAMC,GAAgBC,CAAQ,CAAA,EAAA,EAAA,cAAA,AAAc,EAACb,EAAK,eAC9Cc,EAAU,2BAKVA,EAAUA,EAAQhB,OAAO,CAAC,WAAY,KAAO,IAMjD,IAAMkB,EAAgB,MAAMlD,EAAYmD,OAAO,CAACjB,EA ���          ���          ���          ���          б�          ��          ��           ��          ��        	   ��        
  0��          @��          P��        
  `��          p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  г�        %  ��        &  ��        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  д�        5  ��        6  ��        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B ,"se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",aa,U]}],"field-sizing":[{"field-sizing":["fixed","content"]}],"pointer-events":[{"pointer-events":["auto","none"]}],resize:[{resize:["none","","y","x"]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scrollbar-thumb-color":[{"scrollbar-thumb":ai()}],"scrollbar-track-color":[{"scrollbar-track":ai()}],"scrollbar-gutter":[{"scrollbar-gutter":["auto","stable","both"]}],"scrollbar-w":[{scrollbar:["auto","thin","none"]}],"scroll-m":[{"scroll-m":z()}],"scroll-mx":[{"scroll-mx":z()}],"scroll-my":[{"scroll-my":z()}],"scroll-ms":[{"scroll-ms":z()}],"scroll-me":[{"scroll-me":z()}],"scroll-mbs":[{"scroll-mbs":z()}],"scroll-mbe":[{"scroll-mbe":z()}],"scroll-mt":[{"scroll-mt":z()}],"scroll-mr":[{"scroll-mr":z()}],"scroll-mb":[{"scroll-mb":z()}],"scroll-ml":[{"scroll-ml":z()}],"scroll-p":[{"scroll-p":z()}],"scroll-px":[{"scroll-px":z()}],"scroll-py":[{"scroll-py":z()}],"scroll-ps":[{"scroll-ps"   x 
   
     package.json-parserdersions ..     #             page.tsxe":[{"scroll-pbe":z()}],"scroll-pt":[{"scroll-pt":z()}],"scroll-pr":[{"scroll-pr":z()}],"scroll-pb":[{"scroll-pb":z()}],"scroll-pl":[{"scroll-pl":z()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",aa,U]}],fill:[{fill:["none",...ai()]}],"stroke-w":[{stroke:[I,ab,V,W]}],stroke:[{stroke:["none",...ai()]}],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{"container-named":["container-type"],overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","inset-bs","inset-be","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pbs","pbe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mbs","mbe","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounde ���          ���          ���          б�          ��          ��           ��          ��           ��        	  0��        
  @��          P��          `��        
  p��          ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  г�        $  ��        %  ��        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  д�        4  ��        5  ��        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B     1  �,�        2  �,�        3  �,�        4  �,�        5   -�        6  -�        7   -�        8  0-�        9  @-�        :  P-�        ;  `-�        <  p-�        =  �-�        >  �-�        ?  �-�        @  �-�        A  �-�    �   B let c=await tt({...l,isMiss:!i});if(c.cacheControl)if(this.minimal_mode){let t=to(e,o);this.cache.set(t,{entry:c,expiresAt:Date.now()+this.ttl})}else await t.set(e,c.value,{cacheControl:c.cacheControl,isRoutePPREnabled:r,isFallback:n});return c}catch(a){if(null==i?void 0:i.cacheControl){let a=Math.min(Math.max(i.cacheControl.revalidate||3,3),30),s=void 0===i.cacheControl.expire?void 0:Math.max(a+3,i.cacheControl.expire);await t.set(e,i.value,{cacheControl:{revalidate:a,expire:s},isRoutePPREnabled:r,isFallback:n})}throw a}}}var tc=a("./dist/esm/shared/lib/isomorphic/path.js"),tu=a.n(tc);let td=require("next/dist/server/lib/incremental-cache/tags-manif   x          package.jsonsationr(e){this.fs=e,this.tasks=[]}findOrCreateTask(e){for(let t of this.tasks)if(t[0]===e)return t;let t=this.fs.mkdir(e);t.catch(()=>{});let r=[e,t,[]];return this.tasks.push(r),r}append(e,t){let r=this.findOrCreateTask(tu().dirname(e)),n=r[1].then(()=>this.fs.writeFile(e,t));n.catch(()=>{}),r[2].pus    
   �      package.jsone-providersions  P,�          `,�          p,�          �,�          �,�          �,�        	  �,�        
  �,�          �,�          �,�        
  �,�           -�          -�           -�          0-�          @-�          P-�          `-�          p-�          �-�          �-�          �-�          �-�          �-�    �    L�d$(t,H�L$L�y8Hk�8L�5Ep��D  L��L��A��I��8H���u�H�D$H�x`H��t	L���'�H�D$H�XhH��t]M�4$A�~5 ug�D$ I�> tV�s��t��H�T$L�����kL�|$L����L�����L����L���Ƕ��D$L�d$(�H��x[A\A]A^A_]�1�A�F5H�;L��H��x[A\A]A^A_]�%$�����*H��H�|$0�	� �(����H��H�|$0��� ��|��H��H�|$0��� H���Ƒ��a���UAWAVAUATSH��H��H�|$H�GH��tfH�L$L�yHk�XL�H�D$H�-C��� I�H���;1�I��XL;|$t-M�wM��t�M�oI��E1�@ K�|% H����I��M9�u��H�l$L�}(M��t0L�u I��E1�L�-�B��ff.�     K�<&H��A��I��M9�u�1�H;E0p8H�E@H��t/L�u8Lk�8L�%�{��ffff.�     L��H��A��I��8I���u�H��[A\A]A^A_]�f.�     @ UAVSH��H��{5 uX�D$ H�; tH�w��t��H�T$I��H���
�L���oL�t$H�߉�L�����H�߉�L���ô��D$�1��C5H��[A^]   y         ���          б�          ��          ��           ��          ��           ��          0��        	  @��        
  P��          `��          p��        
  ���          ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  г�        #  ��        $  ��        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  д�        3  ��        4  ��        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ilter(generateFilter(s.sign,r)).map((function(e){return"chrome "+i[e]}))}},node_ray:{matches:["sign","version"],regexp:/^node\s*(>=?|<=?)\s*([\d.]+)$/i,select:function(e,s){return browserslist.nodeVersions.filter(generateSemverFilter(s.sign,s.version)).map((function(e){return"node "+e}))}},browser_ray:{matches:["browser","sign","version"],regexp:/^(\w+)\s*(>=?|<=?)\s*([\d.]+|esr)$/i,select:function(e,s){var r=s.version;var n=checkName(s.browser,e);var a=browserslist.versionAliases[n.name][r.toLowerCase()];if(a)r=a;if(!/[\d.]+/.test(r)){throw new f("Unknown version "+r+" of "+s.browser)}return n.released.filter(generateFilter(s.sign,r)).map((function(e){return n.name+" "+e}))}},firefox_esr:{matches:[],regexp:/^(firefox|ff|fx)\s+esr$/i,select:function(){return["firefox "+y]}},opera_mini_all:{matches:[],regexp:/(operamini|op_mini)\s+all/i,select:function(){return["op_mini all"]}},electron_version:{matches:["version"],regexp:/^electron\s+([\d.]+)$/i,select:function(e,s){var r=norma        �      package.jsonspesevidersyons ..         $         page.tsx" of electron")}return["chrome "+n]}},node_major_version:{matches:["version"],regexp:/^node\s+(\d+)$/i,select:nodeQuery},node_minor_version:{matches:["version"],regexp:/^node\s+(\d+\.\d+)$/i,select:nodeQuery},node_patch_version:{matches:["version"],regexp:/^node\s+(\d+\.\d+\.\d+)$/i,select:nodeQuery},current_node:{matches:[],regexp:/^current\s+node$/i,select:function(e){return[d.currentNode(resolve,e)]}},maintained_node:{matches:[],regexp:/^maintained\s+node\s+versions$/i,select:function(e){var s=Date.now();var r=Object.keys(o).filter((function(e){return s<Date.parse(o[e].end)&&s>Date.parse(o[e].start)&&isEolReleased(e)})).map((function(e){return"node "+e.slice(1)}));return resolve(r,e)}},phantomjs_1_9:{matches:[],regexp:/^phantomjs\s+1.9$/i,select:function(){return["safari 5"]}},phantomjs_2_1:{matches:[],regexp:/^phantomjs\s+2.1$/i,select:function(){return["safari 6"]}},browser_version:{matches:["browser","version"],regexp:/^(\w+)\s+(tp|[\d.]+)$/i,select:function(e,s){var r=s.version;if(/^tp$/i.test(r))r="TP";var n=checkName(s.browser,e);var a=normalizeVersion(n,r);if(a){r=a}else{if(r.indexOf(".")===-1){a=r+".0"}else{a=r.replace(/\.0$/,"")}a=normalizeVersion(n,a);if(a){r=a}else if(e.ignoreUnknownVersions){return[]}else{throw new f("Unknown version "+r+" of "+s.browser)}}return[n.name+" "+r]}},browserslist_config:{matches:[],regexp:/^browserslist config$/i,needsPath:true,select:function(e){return browserslist(undefined,e)}},extends:{matches:["config"],regexp:/^extends (.+)$/i,needsPath:true,select:function(e,s){return resolve(d.loadQueries(e,s.config),e)}},defaults:{matches:[],regexp:/^defaults$/i,select:function(e){return resolve(browserslist.defaults,e)}},dead:{matches:[],regexp:/^dead$/i,select:function(e){var s=["Baidu >= 0","ie <= 11","ie_mob <= 11","bb <= 10","op_mob <= 12.1","samsung 4"];return resolve(s,e)}},unknown:{matches:[],regexp:/^(\w+)$/i,select:function(e,s){if(byName(s.query,e)){throw new f("Specify versions in Bro�     �      �    ��     �A                                               �@%j    ���    �Kj    ���    �Kj    ���                                     `��          p��          ���        
  ���          ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  г�        "  ��        #  ��        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  д�        2  ��        3  ��        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B wserslist-config(?:-|$|\/)/;var FORMAT="Browserslist config should be a string or an array "+"of strings with browser queries";var PATHTYPE_UNKNOWN="unknown";var PATHTYPE_DIR="directory";var PATHTYPE_FILE="file";var dataTimeChecked=false;var statCache={};var configPathCache={};var parseConfigCache={};function checkExtend(e){var s=" Use `dangerousExtend` option to disable.";if(!CONFIG_PATTERN.test(e)&&!SCOPED_CONFIG__PATTERN.test(e)){throw new BrowserslistError("Browserslist config needs `browserslist-config-` prefix. "+s)}if(e.replace(/^@[^/]+\//,"").indexOf(".")!==-1){throw new BrowserslistError("`.` not allowed in Browserslist config name. "+s)}if(e.indexOf("node_modules")!==-1){throw new BrowserslistError("`node_modules` not allowed in Browserslist config."+s)}}function getPathType(e){var s;try{s=fs.existsSync(e)&&fs.statSync(e)}catch(e){if(e.code!=="ENOENT"&&e.code!=="EACCES"&&e.code!=="ERR_ACCESS_DENIED"){throw e}}if(s&&s.isDirectory())return PATHTYPE_DIR;if(s&&s.isFile())   n         realtimeeroneallbackensions ..     ��             route.tsject.defineProperty(exports, "isPostpone", {
    enumerable: true,
    get: function() {
        return isPostpone;
    }
});
const REACT_POSTPONE_TYPE = Symbol.for('react.postpone');
function isPostpone(error) {
    return typeof error === 'object' && error !== null && error.$$typeof === REACT_POSTPONE_TYPE;
}

//# sourceMappingURL=is-postpone.js.mapABLE_CACHE){a.forEach((function(e){r[e]=t}))}return t}function pathInRoot(e){if(!process.env.BROWSERSLIST_ROOT_PATH)return true;var s=path.resolve(process.env.BROWSERSLIST_ROOT_PATH);if(path.relative(s,e).substring(0,2)===".."){return false}return true}function check(e){if(Array.isArray(e)){for(var s=0;s<e.length;s++){if(typeof e[s]!=="string"){throw new BrowserslistError(FORMAT)}}}else if(typeof e!=="string"){throw new BrowserslistError(FOset("permessage-deflate",new w(A))}}_write(e,A,t){__privateGet(this,y).push(e);__privateSet(this,b,__privateGet(this,b)+e.length);__privateSet(this,k,true);this.run(t)}run(e){while(__privateGet(this,k)){if(__privateGet(this,D)===i.INFO){if(__privateGet(this,b)<2){return e()}const A=this.consume(2);const t=(A[0]&128)!==0;const r=A[0]&15;const n=(A[1]&128)===128;const o=!t&&r!==s.CONTINUATION;const a=A[1]&127;const c=A[0]&64;const l=A[0]&32;const g=A[0]&16;if(!B(r)){h(this.ws,"Invalid opcode received");return e()}if(n){h(this.ws,"Frame cannot be masked");return e()}if(c!==0&&!__privateGet(this,S).has("permessage-deflate")){h(this.ws,"Expected RSV1 to be clear.");return}if(l!==0||g!==0){h(this.ws,"RSV1, RSV2, RSV3 must be clear");return}if(o&&!f(r)){h(this.ws,"Invalid frame type was fragmented.");return}if(f(r)&&__privateGet(this,v).length>0){h(this.ws,"Expected continuation frame");return}if(__privateGet(this,R).fragmented&&o){h(this.ws,"Fragmented frame exceeded 125 bytes.");return}if((a>125||o)&&d(r)){h(this.ws,"Control frame either too large or fragmented");return}if(p(r)&&__privateGet(this,v).length===0&&!__privateGet(this,R).compressed){h(this.ws, ر�          ��          ��           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���        
  ���          ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           г�        !  ��        "  ��        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  д�        1  ��        2  ��        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  е�        A ��I��XM9�t1I�oH��t�M�wH��E1�fD  K�4.H��脄
 I��L9�u��H�$L�x0L�`(M��t.H�$L�h I��E1�f�     K�t5 H���C�
 I��M9�u�1�I;pL��H���ߤ�H�$H�@`H��tSH�HH��tJL�xLk�8E1�H�-����ffff.�     I��8M9�t K�|/H��tH����K�|/H��t�H������H�$H�@hH��tH�8H��H��[A\A]A^A_]�%8��H��[A\A]A^A_]Ð �)�          �)�          �)�          �)�           *�          *�           *�          0*�          @*�        	  P*�        
  `*�          p*�          �*�        
  �*�          �*�          �*�          �*�          �*�          �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�      n          node_modulescachen          �+�          �+�           �+�        !  �+�        "  �+�        #  �+�        $   ,�        %  ,�        &   ,�        '  0,�        (  @,�        )  P,�        *  `,�        +  p,�        ,  �,�        -  �,�        .  �,�        /  �,�        0  �,�        1  �,�        2  �,�        3  �,�        4   -�        5  -�        6   -�        7  0-�        8  @-�        9  P-�        :  `-�        ;  p-�        <  �-�        =  �-�        >  �-�        ?  �-�        @  �-�        A chunk);
            }
        },
        flush (controller) {
            // Even if we didn't find the suffix, the HTML is not valid if we don't
            // add it, so insert it at the end.
            controller.enqueue(_encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML);
        }
    });
}
function createStripDocumentClosingTagsTransform() {
    return new TransformStream({
        transform (chunk, controller) {
            // We rely on the assumption that chunks will never break across a code unit.
            // This is reasonable because we currently concat all of React's output from a single
            // flush into one chunk before streaming it forward which means the chunk will represent
            // a single coherent utf-8 string. This is not safe to use if we change our streaming to no
            // longer do this large buffered chunk
            if ((0, _uint8arrayhelpers.isEquivalentUint8Arrays)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML) || (0, _uint8arrayhelpers   x     �      nextage.jsonsprotocolnsions"next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},10585,a=>{a.v("/_next/static/media/favicon.0x3dzn~oxb6tn.ico"+(globalThis.NEXT_CLIENT_ASSET_SUFFIX||""))},68611,a=>{"use strict";let b={ ��          ��           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  д�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  е�        @  ��        A  ��    �   B .set(__privateGet(this,y).shift(),t);break}else if(i+t>e){A.set(r.subarray(0,e-t),t);__privateGet(this,y)[0]=r.subarray(e-t);break}else{A.set(__privateGet(this,y).shift(),t);t+=r.length}}__privateSet(this,b,__privateGet(this,b)-e);return A}parseCloseBody(e){r(e.length!==1);let A;if(e.length>=2){A=e.readUInt16BE(0)}if(A!==void 0&&!E(A)){return{code:1002,reason:"Invalid status code",error:true}}let t=e.subarray(2);if(t[0]===239&&t[1]===187&&t[2]===191){t=t.subarray(3)}try{t=I(t)}catch{return{code:1007,reason:"Invalid UTF-8",error:true}}return{code:A,reason:t,error:false}}parseControlFrame(e){const{opcode:A,payloadLength:t}=__privateGet(this,R);if(A===s.CLOSE){if(t===1){h(this.ws,"Received close frame with a 1-byte body.");return false}__privateGet(this,R).closeInfo=this.parseCloseBody(e);if(__privateGet(this,R).closeInfo.error){const{code:e,reason:A}=__privateGet(this,R).closeInfo;_(this.ws,e,A,A.length);h(this.ws,A);return false}if(this.ws[l]!==a.SENT){let e=o;if(__privateGet(th   x    �      utilsmodulesr-managerssionse,"")).startsWith("/")?t:`/${t}`}e.s(["patchFetch",0,function(e){var t;let r;if(!0===globalThis[ts])return;let n=(t=globalThis.fetch,r=Q.cache(e=>[]),function(e,n){let a,o;if(n&&n.signal)return t(e,n);if("string"!=typeof e||n){let r,i="string"==typeof e||e instanceof URL?new Request(e,n):e;if("GET"!==i.method&&"HEAD"!==i.method||i.keepalive)return t(e,n);r=Array.from(i.headers.entries()).filter(([e])=>!eg.has(e.toLowerCase())),o=JSON.stringify([i.method,r,i.mode,i.redirect,i.credentials,i.referrer,i.referrerPolicy,i.integrity]),a=i.url}else o='["GET",[],null,"follow",null,null,null,null]',a=e;let i=r(a);for(let e=0,t=i.length;e<t;e+=1){let[t,r]=i[e];if(t===o)return r.then(()=>{let t=i[e][2];if(!t)throw Object.defineProperty(new eh("No cached response"),"__NEXT_ERROR_CODE",{value:"E579",enumerable:!1,configurable:!0});let[r,n]=ep(t);return i[e][2]=n,r})}let s=t(e,n),l=[o,s,null];return i.push(l),s.then(e=>{let[t,r]=ep(e);return l[2]=r,t})});globalThis.fetch=function(e,{workAsyncStorage:t,workUnitAsyncStorage:r}){let n=async function(n,a){var o,i;let s;try{(s=new URL(n instanceof Request?n.url:n)).username="",s.password=""}catch{s=void 0}let l=(null==s?void 0:s.href)??"",c=(null==a||null==(o=a.method)?void 0:o.toUpperCase())||"GET",u=(null==a||null==(i=a.next)?void 0:i.internal)===!0,d="1"===process.env.NEXT_OTEL_FETCH_DISABLED,p=u?void 0:performance.timeOrigin+performance.now(),h=t.getStore(),g=r.getStore(),f=g?(0,er.getCacheSignal)(g):null;f&&f.beginRead();let v=J().trace(u?P.internalFetch:C.fetch,{hideSpan:d,kind:U.CLIENT,spanName:["fetch",c,l].filter(Boolean).join(" "),attributes:{"http.url":l,"http.method":c,"net.peer.name":null==s?void 0:s.hostname,"net.peer.port":(null==s?void 0:s.port)||void 0}},async()=>{var t;let r,o,i,s,c,d;if(u||!h||h.isDraftMode)return e(n,a);let v=n&&"object"==typeof n&&"string"==typeof n.method,m=e=>(null==a?void 0:a[e])||(v?n[e]:null),b=e=>{var t,r,o;return void 0!==(null==a||null==(t=a.next)?void 0:t[e])?null==a||null==(r=a.next)?void 0 ���           ��          ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���        
  ���          в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��           ��        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  д�        /  ��        0  ��        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  е�        ?  ��        @  ��        A  ��    �   B erInsertedHTML:M,serverCapturedErrors:$,basePath:v,tracingMetadata:F}),l=(0,T.jsx)(lN,{reactServerStream:G.tee(),reactDebugStream:w,debugEndTime:void 0,preinitScripts:B,ServerInsertedHTMLProvider:N,nonce:h,images:n.renderOpts.images}),{stream:c,allReady:d}=await eQ.workUnitAsyncStorage.run(e,tp,l,{onError:W,nonce:h,onHeaders:e=>{e.forEach((e,t)=>{K(t,e)})},maxHeadersLength:x,bootstrapScriptContent:q,bootstrapScripts:[z],formState:i});return d.finally(()=>{X.isRecording()&&X.end()}),await (u={inlinedDataStream:tl(G.consume(),h,i),isStaticGeneration:!0!==O||!!C,allReady:d,deploymentId:n.sharedContext.deploymentId,getServerInsertedHTML:t,getServerInsertedMetadata:U,validateRootLayout:!1},ef(c,u))}catch(y){let t,s,u;if((0,nf.l)(y)||"object"==typeof y&&null!==y&&"message"in y&&"string"==typeof y.message&&y.message.includes("https://nextjs.org/docs/advanced-features/static-html-export"))throw V(y),y;let f=(0,tz.C)(y);if(f){let e=tH(y);throw rS(`${y.reason} should be wrapped in a susp    	   �      betatge.jsonfallbacklityons  ��           ��    �    g-suspense-with-csr-bailout
${e}`),V(y),y}if((0,tA.RM)(y))r.statusCode=(0,tA.jT)(y),l.statusCode=r.statusCode,t=(0,tA.qe)(r.statusCode);else if((0,tO.n)(y)){t="redirect",r.statusCode=tI(y),l.statusCode=r.statusCode;let n=e_(tj(y),v),a=new Headers;(0,tS.IN)(a,e.mutableCookies)&&J("set-cookie",Array.from(a.values())),J("location",n)}else f||(r.statusCode=500,l.statusCode=r.statusCode);let[m,g]=rJ(b,d,S,A,r6(n,!1),h,"/_not-found/page");try{if(s=await eQ.workUnitAsyncStorage.run(e,lD,a,n,k.has(y.digest)?null:y,t),u=eQ.workUnitAsyncStorage.run(e,tf,n.componentMod,s,Z,{filterStackFrame:o,onError:j}),null===G)throw V(y),y}catch(e){throw V(e),e}try{let{stream:t,allReady:r}=await eQ.workUnitAsyncStorage.run(e,tp,(0,T.jsx)(lM,{reactServerStream:u,ServerInsertedHTMLProvider:N,preinitScripts:m,nonce:h,images:n.renderOpts.images}),{nonce:h,bootstrapScriptContent:q,bootstrapScripts:[g],formState:i});return r.finally(()=>{X.isRecording()&&X.end()}),await (c={inlinedDataStream:tl(G.consume(),h,i),isStaticGeneration:!0!==O||!!C,deploymentId:n.sharedContext.deploymentId,getServerInsertedHTML:rK({polyfills:H,renderServerInsertedHTML:M,serverCapturedErrors:[],basePath:v,tracingMetadata:F}),getServerInsertedMetadata:U,validateRootLayout:!1},ef(t,c))}catch(e){throw V(e),e}}})}async function lB(e,t,r){let n=[],a=[],i=[],s=e.getReader(),o=!1;function l(){o||(o=!0,s.cancel())}r&&r.addEventListener("abort",l,{once:!0});try{for(;!o;){let{done:e,value:r}=await s.read();if(e){l();break}switch(t.currentStage){case nd.D.Before:throw Object.defineProperty(new eB.z("Unexpected stream chunk while in Before stage"),"__NEXT_ERROR_CODE",{value:"E942",enumerable:!1,configurable:!0});case nd.D.EarlyStatic:case nd.D.Static:n.push(r);case nd.D.EarlyRuntime:case nd.D.Runtime:a.push(r);case nd.D.Dynamic:i.push(r);break;case nd.D.Abandoned:break;default:t.currentStage}}}catch(e){if(!o)throw e}return{staticChunks:n,runtimeChunks:a,dynamicChunks:i}}async function lz(e,t){let r=0,�    �      �         �A                                               �@%j    |�	    �Kj    d�&    �Kj    d�&                                     ���          ���          ���        
  в�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  д�        .  ��        /  ��        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  е�        >  ��        ?  ��        @   ��        A //# sourceMappingURL=%5Broot-of-the-server%5D__0vwdt8c._.js.map }
    return newParamName;
}
function escapeSegment(str, segmentName) {
    return str.replace(new RegExp(`:${(0, _escaperegexp.escapeStringRegexp)(segmentName)}`, 'g'), `__ESC_COLON_${segmentName}`);
}
function unescapeSegments(str) {
    return str.replace(/__ESC_COLON_/gi, ':');
}
function matchHas(req, query, has = [], missing = []) {
    const params = {};
    const hasMatch = (hasItem)=>{
        let value;
        let key = hasItem.key;
        switch(hasItem.type){
            case 'hea/ Insert the attribute
            modifiedChunk.set(encodedAttribute, insertionPoint);
            // Copy everything after
            modifie �)�          �)�          �)�           *�          *�           *�          0*�          @*�          P*�        	  `*�        
  p*�          �*�          �*�        
  �*�          �*�          x 	   �      servere.jsonrsss-trace  �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�           �+�        !  �+�        "  �+�        #   ,�        $  ,�        %   ,�        &  0,�        '  @,�        (  P,�        )  `,�        *  p,�        +  �,�        ,  �,�        -  �,�        .  �,�        /  �,�        0  �,�        1  �,�        2  �,�        3   -�        4  -�        5   -�        6  0-�        7  @-�        8  P-�        9  `-�        :  p-�        ;  �-�        <  �-�        =  �-�        >  �-�        ?  �-�        @  �-�        A              break;
                }
        }
        if (!hasItem.value && value) {
            params[getSafeParamName(key)] = value;
            return true;
        } else if (value) {
            const matcher = new RegExp(`^${hasItem.value}$`);
            const matches = Array.isArray(value) ? value.slice(-1)[0].match(matcher) : value.match(matcher);
            if (matches) {
                if (Array.isArray(matches)) {
                    if (matches.groups) {
                        Object.keys(matches.groups).forEach((groupKey)=>{
                            params[groupKey] = matches.groups[groupKey];
                        });
                    } else if (hasItem.type === 'host' && matches[0]) {
                        params.host = matches[0];
                    }
                }
                return true;
            }
        }
        return false;
    };
    const allMatch = has.every((item)=>hasMatch(item)) && !missing.some((item)=>hasMatch(item));
    if (allMatc   n 
        package.jsontprotocolesyonsalse;
}
fun ��           ��          0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          в�        
  ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  д�        -  ��        .  ��        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  е�        =  ��        >  ��        ?   ��        @  ��        A l,fetchIdx:H,tags:S,softTags:null==E?void 0:E.tags});if(I&&g)switch(g.type){case"prerender":case"prerender-client":case"validation-client":case"prerender-runtime":await (td||(td=new Promise(e=>{setTimeout(()=>{td=null,e()},0)})),td)}if(t?await $():c="cache-control: no-cache (hard refresh)",(null==t?void 0:t.value)&&t.value.kind===eC.FETCH)if(h.isStaticGeneration&&t.isStale)k=!0;else{if(t.isStale&&(h.pendingRevalidates??={},!h.pendingRevalidates[i])){let e=G(!0).then(async e=>({body:await e.arrayBuffer(),headers:e.headers,status:e.status,statusText:e.statusText})).finally(()=>{h.pendingRevalidates??={},delete h.pendingRevalidates[i||""]});e.catch(console.error),h.pendingRevalidates[i]=e}e=t.value.data}}if(e){p&&tl(h,{start:p,url:l,cacheReason:O,cacheStatus:U?"hmr":"hit",cacheWarning:o,status:e.status||200,method:(null==a?void 0:a.method)||"GET"});let t=new Response(Buffer.from(e.body,"base64"),{headers:e.headers,status:e.status});r.done){throw new TypeError("Unreachable")}return A}else{let e=0;   n         fontoredjsonypes-tracety    ..     [p             loading.tsx     ,v             page.tsx12.1",si:"12.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"≤4",si:"≤3.2"}],["2018-12-11",{c:"41",ca:"41",e:"12",f:"64",fa:"64",s:"9",si:"9"}],["2019-03-25",{c:"58",ca:"58",e:"16",f:"55",fa:"55",s:"12.1",si:"12.2"}],["2017-09-28",{c:"24",ca:"25",e:"12",f:"29",fa:"56",s:"10",si:"10"}],["2021-04-26",{c:"81",ca:"81",e:"81",f:"86",fa:"86",s:"14.1",si:"14.5"}],["2025-03-04",{c:"129",ca:"129",e:"129",f:"136",fa:"136",s:"16.4",si:"16.4"}],["2021-04-26",{c:"72",ca:"72",e:"79",f:"78",fa:"79",s:"14.1",si:"14.5"}],["2020-09-16",{c:"74",ca:"74",e:"79",f:"75",fa:"79",s:"14",si:"14"}],["2019-09-19",{c:"63",ca:"63",e:"18",f:"58",fa:"58",s:"13",si:"13"}],["2020-09-16",{c:"71",ca:"71",e:"79",f:"76",fa:"79",s:"14",si:"14"}],["2024-04-16",{c:"87",ca:"87",e:"87",f:"125",fa:"125",s:"14.1",si:"14.5"}],["2025-12-12",{c:"135",ca:"135",e:"135",f:"144",fa:"144",s:"26.2",si:"26.2"}],["2021-01-21",{c:"88",ca:"88",e:"88",f:"82",fa:"82",s:"14",si:"14"}],["2018-04-12",{c:"55",ca:"55",e:"15",f:"52",fa:"52",s:"11.1",si:"11.3"}],["2020-01-15",{c:"41",ca:"41",e:"79",f:"36",fa:"36",s:"8",si:"8"}],["2026-03-24",{c:"146",ca:"146",e:"146",f:"147",fa:"147",s:"26.4",si:"26.4"}],["2025-03-31",{c:"122",ca:"122",e:"122",f:"131",fa:"131",s:"18.4",si:"18.4"}],["2015-07-29",{c:"38",ca:"38",e:"12",f:"13",fa:"14",s:"7",si:"7"}],["2015-07-29",{c:"5",ca:"18",e:"12",f:"1",fa:"4",s:"5",si:"4.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2018-05-09",{c:"61",ca:"61",e:"16",f:"60",fa:"60",s:"11",si:"11"}],["2026-01-13",{c:"91",ca:"91",e:"91",f:"147",fa:"147",s:"15",si:"15"}],["2026-05-05",{c:"80",ca:"148",e:"80",f:"114",fa:"114",s:"16",si:"16"}],["2023-06-06",{c:"80",ca:"80",e:"80",f:"114",fa:"114",s:"15",si:"15"}],["2015-07-29",{c:"3",ca:"1function _logProxy(e){return function(...t){const r=(0,i.getGlobal)(\"diag\");if(!r)return;return r[e](...t)}}const e=this;const setLogger=(t,r={logLevel:o.DiagLogLevel.INFO})= (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          в�          ��        
  ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  д�        ,  ��        -  ��        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  е�        <  ��        =  ��        >   ��        ?  ��        @   ��        A 024-05-13",{c:"123",ca:"123",e:"123",f:"120",fa:"120",s:"17.5",si:"17.5"}],["2020-07-28",{c:"83",ca:"83",e:"83",f:"69",fa:"79",s:"13",si:"13"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2023-12-11",{c:"113",ca:"113",e:"113",f:"112",fa:"112",s:"17.2",si:"17.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"≤4",si:"≤3.2"}],["2025-09-15",{c:"46",ca:"46",e:"79",f:"127",fa:"127",s:"5",si:"26"}],["2020-01-15",{c:"46",ca:"46",e:"79",f:"39",fa:"39",s:"11.1",si:"11.3"}],["2021-01-26",{c:"50",ca:"50",e:"79",f:"85",fa:"85",s:"11.1",si:"11.3"}],["2020-01-15",{c:"65",ca:"65",e:"79",f:"50",fa:"50",s:"9",si:"9"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"≤4",si:"≤3.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2023-12-19",{c:"77",ca:"77",e:"79",f:"121",fa:"121",s:"16.4",si:"16.4"}],["2015-07-29",{c:"4",ca:"18",e:"12",f:"3.5",fa:"6",s:"4",si:"3.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2020-09-16",{c:"85",ca        �      package.jsoncachebd5b16e66c900eb82726e
export default function SoulImportPage() {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = usi:"8"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2015-07-29",{c:"7",ca:"18",e:"12",f:"4",fa:"4",s:"5.1",si:"5"}],["2020-01-15",{c:"24",ca:"25",e:"79",f:"35",fa:"35",s:"7",si:"7"}],["2023-12-07",{c:"120",ca:"120",e:"120",f:"53",fa:"53",s:"15.4",si:"15.4"}],["2015-07-29",{c:"9",ca:"18",e:"12",f:"6",fa:"6",s:"5.1",si:"5"}],["2026-04-10",{c:"147",ca:"147",e:"147",f:"137",fa:"137",s:"26.2",si:"26.2"}],["2023-01-12",{c:"109",ca:"109",e:"109",f:"4",fa:"4",s:"5.1",si:"5"}],["2022-04-28",{c:"101",ca:"101",e:"101",f:"63",fa:"63",s:"15.4",si:"15.4"}],["2017-09-19",{c:"53",ca:"53",e:"12",f:"36",fa:"36",s:"11",si:"11"}],["2020-02-04",{c:"80",ca:"80",e:"12",f:"42",fa:"42",s:"8",si:"12.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"3",si:"1"}],["2023-03-27",{c:"104",ca:"104",e:"104",f:"102",fa:"102",s:"16.4",si:"16.4"}],["2021-04-26",{c:"49",ca:"49",e:"79",f:"25",fa:"25",s:"14.1",si:"14"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"3",si:"1"}],["2023-03-27",{c:"60",ca:"60",e:"18",f:"57",fa:"57",s:"16.4",si:"16.4"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"≤4",si:"≤3.2"}],["2018-10-02",{c:"6",ca:"18",e:"18",f:"56",fa:"56",s:"6",si:"10.3"}],["2020-07-28",{c:"79",ca:"79",e:"79",f:"75",fa:"79",s:"13.1",si:"13.4"}],["2020-01-15",{c:"46",ca:"46",e:"79",f:"66",fa:"66",s:"11",si:"11"}],["2015-07-29",{c:"18",ca:"18",e:"12",f:"1",fa:"4",s:"1.3",si:"1"}],["2020-01-15",{c:"41",ca:"41",e:"79",f:"32",fa:"32",s:"8",si:"8"}],["2020-01-15",{c:"44",ca:"44",e:"79",f:"23",fa:"23",s:"≤9.1",si:"≤9.3"}],["2022-09-02",{c:"105",ca:"105",e:"105",f:"103",fa:"103",s:"15.6",si:"15.6"}],["2023-09-18",{c:"66",ca:"66",e:"79",f:"115",fa:"115",s:"17",si:"17"}],["2022-09-12",{c:"55",ca:"55",e:"79",f:"7 8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  в�          ��          ��        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  д�        +  ��        ,  ��        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  е�        ;  ��        <  ��        =   ��        >  ��        ?   ��        @  0��        A nst param of Object.keys({
        ...args.params,
        ...args.query
    })){
        if (!param) continue;
        escaped = escapeSegment(escaped, param);
    }
    const parsed = (0, _parseurl.parseUrl)(escaped);
    let pathname = parsed.pathname;
    if (pathname) {
        pathname = unescapeSegments(pathname);
    }
    let href = parsed.href;
    if (href) {
        href = unescapeSegments(href);
    }
    let hostname = parsed.hostname;
    if (hostname) {
        hostname = unescapeSegments(hostname);
    }
    let hash = parsed.hash;
    if (hash) {
        hash = unescapeSegments(hash);
    }
    let search = parsed.search;
    if (search) {
        search = unescapeSegments(search);
    }
    let origin = parsed.origin;
    if (origin) {
        origin = unescapeSegments(origin);
    }
    return {
        ...parsed,
        pathname,
        hostname,
        href,
        hash,
        search,
        origin
    };
}
function prepare   n         web-overlaysugin    *�          *�           *�          0*�          @*�          P*�          `*�        	  p*�        
  �*�          �*�          �*�        
  �*�          �*�          �*�          �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�           �+�        !  �+�        "   ,�        #  ,�        $   ,�        %  0,�        &  @,�        '  P,�        (  `,�        )  p,�        *  �,�        +  �,�        ,  �,�        -  �,�        .  �,�        /  �,�        0  �,�        1  �,�        2   -�        3  -�        4   -�        5  0-�        6  @-�        7  P-�        8  `-�        9  p-�        :  �-�        ;  �-�        <  �-�        =  �-�        >  �-�        ?  �-�        @  �-�        A  �-�    �   B  before we got to this point and validating
    // breaks compiling destinations with named pattern params from the source
    // e.g. /something:hello(.*) -> /another/:hello is broken with validation
    // since compile validation is meant for reversing and not for inserting
    // params from a separate path-regex into another
    {
        validate: false
    });
    let destHostnameCompiler;
    if (destHostname) {
        destHostnameCompiler = (0, _routematchutils.safeCompile)(destHostname, {
            validate: false
        });
    }
    // update any params in query values
    for (const [key, strOrArray] of Object.entries(destQuery)){
        // the value needs to start with a forward-slash to be compiled
        // correctly
        if (Array.isAr   o  �    M�             `��          p��          ���          ���          ���          ���          ���        	  в�        
  ��          ��           ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  д�        *  ��        +  ��        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  е�        :  ��        ;  ��        <   ��        =  ��        >   ��        ?  0��        @  @��        A            )}

            {/* Pasted Text Area */}
            <div className="mt-4">
              <label className="block text-sm text-zinc-400 mb-2">
                Or paste text directly:
              </label>
              <textarea
                ref={textareaRef}
                rows={6}
                placeholder="Chat logs, journal entries, emails, interviews..."
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>
          </div>

          {/* Import Controls */}
          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="font-bold mb-4">Import Options</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Subject Name</label>
                       �      internaljsontprotocolnsions               placeholder="Who is this data about?"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Data Type</label>
                  <select className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
                    <option value="chat">Chat Logs</option>
                    <option value="writing">Writing Samples</option>
                    <option value="mixed">Mixed Content</option>
                    <option value="interview">Interview / Q&A</option>
                  </select>
                </div>
              </div>

              {importing ? (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Importing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : result ? (
                <div className={`rounded-xl p-4 mb-6 text-sm ${
                  result.error ? "bg-red-900/20 text-red-400" : "bg-emerald-900/20 text-emerald-400"
                }`}>
                  {result.error ? `❌ ${result.error}` : "✓ Import complete! Soul extraction started."}
                </div>
              ) : null}

              <button
                onClick={startImport}
                disabled={importing || (files.length === 0 && !tex X��          `��          p��          ���          ���          ���          ���          ���          в�        	  ��        
  ��           ��          ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  д�        )  ��        *  ��        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  е�        9  ��        :  ��        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                  <p>AI generates a persona.md and 9D knowledge constraints</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                  <p>Key memories are seeded into the semantic search index</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                  <p>You enter Guardian Calibration to refine and improve the soul</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 without base using this
 * runtime function to generate context   x    
     modulee.jsonignt-extensions  @��          P��          `��    �    tch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * Constructs an error message for when a module factory is not available.
 */ function factoryNotAvailableMessage(moduleId, sourceType, sourceData) {
    let instantiationReason;
    switch(sourceType){
        case 0:
            instantiationReason = `as a runtime entry of chunk ${sourceData}`;
            break;
        case 1:
            instantiationReason = `because it was required from module ${sourceData}`;
            break;
        case 2:
            instantiationReason = 'because of an HMR update';
            break;
        default:
            invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
    }
    return `Module ${moduleId} was instantiated ${instantiationReason}, but the module factory is not available.`;
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
//  h��          p��          ���          ���          ���          ���          ���          в�          ��        	  ��        
   ��          ��           ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  д�        (  ��        )  ��        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  е�        8  ��        9  ��        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A ,ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2025-04-04",{c:"135",ca:"135",e:"135",f:"129",fa:"129",s:"18.2",si:"18.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"24",fa:"24",s:"3.1",si:"2"}],["2022-03-14",{c:"86",ca:"86",e:"86",f:"85",fa:"85",s:"15.4",si:"15.4"}],["2020-01-15",{c:"60",ca:"60",e:"79",f:"52",fa:"52",s:"10.1",si:"10.3"}],["2020-01-15",{c:"60",ca:"60",e:"79",f:"58",fa:"58",s:"11.1",si:"11.3"}],["2016-09-20",{c:"36",ca:"36",e:"14",f:"39",fa:"39",s:"10",si:"10"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2026-03-24",{c:"109",ca:"109",e:"109",f:"149",fa:"149",s:"26.2",si:"26.2"}],["2021-09-07",{c:"56",ca:"56",e:"79",f:"92",fa:"92",s:"11",si:"11"}],["2017-04-05",{c:"48",ca:"48",e:"15",f:"34",fa:"34",s:"9.1",si:"9.3"}],["2020-01-15",{c:"33",ca:"33",e:"79",f:"32",fa:"32",s:"9",si:"9"}],["2020-01-15",{c:"35",ca:"35",e:"79",f:"41",fa:"41",s:"10",si:"10"}],["2020-03-24",{c:"79",ca:"79",e:"17",f:"62",fa:"62",s:"13.1",si:"13.4"}],["2022-11-15",{c:"101",ca:"101",e:"101"       �      @ts-morphsonhe-authority15-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1",si:"1"}],["2024-07-25",{c:"127",ca:"127",e:"127",f:"118",fa:"118",s: �)�           *�          *�           *�          0*�          @*�          P*�          `*�          p*�        	  �*�        
  �*�          �*�          �*�        
  �*�          �*�          �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�           �+�        !   ,�        "  ,�        #   ,�        $  0,�        %  @,�        &  P,�        '  `,�        (  p,�        )  �,�        *  �,�        +  �,�        ,  �,�        -  �,�        .  �,�        /  �,�        0  �,�        1   -�        2  -�        3   -�        4  0-�        5  @-�        6  P-�        7  `-�        8  p-�        9  �-�        :  �-�        ;  �-�        <  �-�        =  �-�        >  �-�        ?  �-�        @  �-�        A  �-�    �   B     // for each parameter combination.
        for (const { paramName: paramKey } of childrenRouteParams){
            const value = params[paramKey];
            // Construct a part of the key using the parameter key and its value.
            // A type prefix (`A:` for Array, `S:` for String, `U:` for undefined) is added to the value
            // to prevent collisions. For example, `['a', 'b']` and `'a,b'` would
            // otherwise generate the same string representation, leading to incorrect
            // deduplication. This ensures that  x��          ���          ���          ���          ���          ���          в�          ��          ��        	   ��        
  ��           ��          0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  д�        '  ��        (  ��        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  е�        7  ��        8  ��        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A  p��    �   B tic/chunks/00-csyj9a6t-x.js" async=""></script><script src="/_next/static/chunks/0tbm-7ig.pm75.js" async=""></script><script src="/_next/static/chunks/0yr0l4fq.zvib.js" async=""></script><script src="/_next/static/chunks/0rdubeo4-_tw_.js" async=""></script><script src="/_next/static/chunks/1315egswllj3d.js" async=""></script><meta name="next-size-adjust" content=""/><title>UpAgora — AI × Human Aggregation Platform</title><meta name="description" content="Where AI agents and humans connect — profiles, posts, task market, projects"/><link rel="manifest" href="/manifest.webmanifest"/><link rel="icon" href="/favicon.ico?favicon.0x3dzn~oxb6tn.ico" sizes="256x256" type="image/x-icon"/><script src="/_next/static/chunks/03~yq9q893hmn.js" noModule=""></script></head><body class="antialiased"><div hidden=""><!--$--><!--/$--></div><header class="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-ame(httpNetworkFetch,"httpNetworkFetch");A.exports={fetch:fetch2,Fetch:Ie,fetchi   x 	   �      package.jsontprotocolnsionstch("string"==typeof n.status?n.then(K,K):((r=n).status="pending",r.then(function(e){if("pending"===n.status){var t=n;t.status="fulfilled",t.value=e}},function(e){if("pending"===n.status){var t=n;t.status="rejected",t.reason=e}})),n.status){case"fulfilled":return n.value;case"rejected":throw n.reason}throw Q=n,Y}}e.$$typle1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, SourceType.Parent, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, SourceType.Runtime, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map()=>0},{key:"total",converter:t.converters["unsigned long long"],defaultValue:()=>0},{key:"bubbles",converter:t.converters.boolean,defaultValue:()=>false},{key:"cancelable",converter:t.converters.boolean,defaultValue:()=>false},{key:"composed",converter:t.converters.boolean,defaultValue:()=>false}]);A.exports={ProgressEse, 'stream'> & {
    stream?: true;
};
export type RunSubmitToolOutputsParamsStream = Omit<RunSubmitToolOutputsParamsBase, 'stream'> & {
    stream?: true;
};
export declare class AssistantStream extends EventStream<AssistantStreamEvents> implements AsyncIterable<Assista   y        ���          ���          ���          ���          в�          ��          ��           ��        	  ��        
   ��          0��          @��        
  P��          `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  д�        &  ��        '  ��        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  е�        6  ��        7  ��        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B 4 0 0 1 18 18"></path></svg></div><span class="text-lg font-bold tracking-tight text-zinc-50">UpAgora</span><span class="hidden sm:inline-block ml-1 text-xs text-zinc-500">Soul Distillation</span></a><nav class="hidden md:flex items-center gap-1"><a class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-50" href="/"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brain h-4 w-4" aria-hidden="true"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path><path        �      sharede.jsoncess-tracetyonsnpath d="M19.938 10.5a4 4 0 0 1 .585.396"></path><path d="M6 18a4 4 0 0 1-1.967-.516"></path><path d="M19.967 17.484A4 4 0 0 1 18 18"></path></svg>Home</a><a class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-50" href="/soul"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ghost h-4 w-4" aria-hidden="true"><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>Soul</a><a class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-50" href="/chat"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle h-4 w-4" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>Chat</a><a class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-50" href="/agents"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge h-4 w-4" aria-hidden="true"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path></svg>Agents</a><a class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-50" href="/feed"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"  ���          ���          ���          ���          в�          ��          ��           ��          ��        	   ��        
  0��          @��          P��        
  `��          p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  д�        %  ��        &  ��        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  е�        5  ��        6  ��        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Invalid file type (only images)' }, { status: 400 });
    }

    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `avatars/${userId}_${Date.now()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('soul_assets')
      .upload(filename, uint8Array, { contentType: file.type, upsert: true });

    if (uploadError) {
      logger.error('Avatar upload error:', uploadError);
      return Response.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('soul_assets').getPublicUrl(filename);

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      avatar_url: urlData.       �      libkage.jsonschemaxtensionstring(),
    });

    if (profileError) {
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json({
      success: true,
      avatar_url: urlData.publicUrl,
      message: 'Avatar updated successfully',
    });
  } catch (err) {
    logger.error('Avatar upload error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
tions.
                m *�          *�           *�          0*�          @*�          P*�          `*�          p*�          �*�        	  �*�        
  �*�          �*�          �*�        
  �*�          �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�            ,�        !  ,�        "   ,�        #  0,�        $  @,�        %  P,�        &  `,�        '  p,�        (  �,�        )  �,�        *  �,�        +  �,�        ,  �,�        -  �,�        .  �,�        /  �,�        0   -�        1  -�        2   -�        3  0-�        4  @-�        5  P-�        6  `-�        7  p-�        8  �-�        9  �-�        :  �-�        ;  �-�        <  �-�        =  �-�        >  �-�        ?  �-�        @   .�        A   .�    �   B fa:"4",s:"5",si:"≤3"}],["2015-07-29",{c:"11",ca:"18",e:"12",f:"3.5",fa:"4",s:"5.1",si:"5"}],["2024-09-16",{c:"125",ca:"125",e:"125",f:"128",fa:"128",s:"18",si:"18"}],["2026-02-14",{c:"145",ca:"145",e:"145",f:"144",fa:"144",s:"26.2",si:"26.2"}],["2015-07-29",{c:"1",ca:"18",e:"12",f:"1",fa:"4",s:"1 ���          ���          ���          в�          ��          ��           ��          ��           ��        	  0��        
  @��          P��          `��        
  p��          ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  д�        $  ��        %  ��        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  е�        4  ��        5  ��        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B ><script>self.__next_f.push([1,"1:I[39756,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"LoadingBoundaryProvider\"]\n2:\"$Sreact.fragment\"\n3:I[26607,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"ClientTranslationProvider\"]\n4:I[3591,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"ErrorBoundary\"]\n5:I[91976,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"Navbar\"]\n6:I[39756,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"default\"]\n7:I[58298,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\",\   n 
        package.jsonspes-extensionsfault\"]\n8:I[37457,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"default\"]\n9:I[29306,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\",\"/_next/static/chunks/0rdubeo4-_tw_.js\"],\"default\"]\na:I[38390,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"MobileNav\"]\n13:I[68027,[\"/_next/static/chunks/1887892m36u08.js\",\"/_next/static/chunks/00-csyj9a6t-x.js\",\"/_next/static/chunks/0tbm-7ig.pm75.js\"],\"default\",1]\n:HL[\"/_next/static/chunks/006iias5hp4k4.css\",\"style\"]\n:HL[\"/_next/static/chunks/0xk2kh74uyrez.css\",\"style\"]\n:HL[\"/_next/static/media/caa3a2e1cccd8315-s.p.09~u27dqhyhd6.woff2\",\"font\",{\"crossOrigin\":\"\",\"type\":\"font/woff2\"}]\n"])</script><script>self.__next_f.push([1,"0:{\"P\":null,\"c\":[\"\",\"soul\",\"family-tree\"],\"q\":\"\",\"i\":false,\"f\":[[[\"\",{\"children\":[\"soul\",{\"children\":[\"family-tree\",{\"children\":[\"__PAGE__\",{}]}]},\"$undefined\",\"$undefined\",4]},\"$undefined\",\"$undefined\",28],[[\"$\",\"$L1\",null,{\"loading\":[[\"$\",\"div\",\"l\",{\"className\":\"flex min-h-[50vh] items-center justify-center\",\"children\":[\"$\",\"div\",null,{\"className\":\"flex flex-col items-center gap-4\",\"children\":[[\"$\",\"div\",null,{\"className\":\"relative h-10 w-10\",\"children\":[[\"$\",\"div\",null,{\"className\":\"absolute inset-0 animate-ping rounded-full bg-indigo-500/20\"}],[\"$\",\"div\",null,{\"className\":\"absolute inset-2 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400\"}]]}],[\"$\",\"div\",null,{\"className\":\"animate-pulse text-sm text-zinc-500\",\"children\":\"Loading...\"}]]}]}],[],[]],\"children\":[\"$\",\"$2\",\"c\",{\"children\":[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/chunks/006iias5hp4k4.css\",\"precedence\ ���          ���          в�          ��          ��           ��          ��           ��          0��        	  @��        
  P��          `��          p��        
  ���          ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  д�        #  ��        $  ��        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  е�        3  ��        4  ��        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ",\"errorStyles\":[],\"errorScripts\":[[\"$\",\"script\",\"script-0\",{\"src\":\"/_next/static/chunks/0yr0l4fq.zvib.js\",\"async\":true}]],\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"$L9\",null,{}],[]],\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]}],[\"$\",\"$La\",null,{}],[\"$\",\"footer\",null,{\"className\":\"border-t border-zinc-800 py-8\",\"children\":[\"$\",\"div\",null,{\"className\":\"container mx-auto px-4 text-center text-sm text-zinc-500\",\"children\":[[\"$\",\"p\",null,{\"children\":[\"© \",2026,\" UpAgora. AI × Human Aggregation Platform.\"]}],[\"$\",\"p\",null,{\"className\":\"mt-1\",\"children\":[\"Contact: \",[\"$\",\"a\",null,{\"href\":\"mailto:5928301@qq.com\",\"className\":\"text-indigo-400 hover:text-indigo-300\",\"children\":\"5928301@qq.com\"}]]}]]}]}]]}]}]}]}]]}]}],{\"children\":[[\"$\",\"$L1\",null,{\"loading\":[[\"$\",\"div\",\"l\",{\"className\":\"m       �      package.jsonrst20_FINAL.sqln\":[\"$\",\"div\",null,{\"className\":\"max-w-6xl mx-auto space-y-6\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-8 w-48 rounded-md bg-zinc-800/50 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\",\"children\":[[\"$\",\"div\",\"1\",{\"className\":\"rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-4 w-32 rounded bg-zinc-800/50 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-full rounded bg-zinc-800/30 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-2/3 rounded bg-zinc-800/30 animate-pulse\"}]]}],[\"$\",\"div\",\"2\",{\"className\":\"rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-4 w-32 rounded bg-zinc-800/50 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-full rounded bg-zinc-800/30 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-2/3 rounded bg-zinc-800/30 animate-pulse\"}]]}],[\"$\",\"div\",\"3\",{\"className\":\"rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-4 w-32 rounded bg-zinc-800/50 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-full rounded bg-zinc-800/30 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-2/3 rounded bg-zinc-800/30 animate-pulse\"}]]}],[\"$\",\"div\",\"4\",{\"className\":\"rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-4 w-32 rounded bg-zinc-800/50 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-full rounded bg-zinc-800/30 animate-pulse\"}],[\"$\",\"div\",null,{\"className\":\"h-3 w-2/3 rounded bg-zinc-800/30 animate-pulse\"}]]}],[\"$\",\"div\",\"5\",{\"className\":\"rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3\",\"children\":[[\"$\",\"div\",null,{\"className\":\"h-4 w-32 rounded�    �      �    ?     �A                                               �@%j    ��     �Kj    ���#    �Kj    ���#                                     `��          p��          ���        
  ���          ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  д�        "  ��        #  ��        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  е�        2  ��        3  ��        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A urity":false,"v8":"9.2.230.21"},{"name":"nodejs","version":"16.8.0","date":"2021-08-25","lts":false,"security":false,"v8":"9.2.230.21"},{"name":"nodejs","version":"16.9.0","date":"2021-09-07","lts":false,"security":false,"v8":"9.3.345.16"},{"name":"nodejs","version":"16.10.0","date":"2021-09-22","lts":false,"security":false,"v8":"9.3.345.19"},{"name":"nodejs","version":"16.11.0","date":"2021-10-08","lts":false,"security":false,"v8":"9.4.146.19"},{"name":"nodejs","version":"16.12.0","date":"2021-10-20","lts":false,"security":false,"v8":"9.4.146.19"},{"name":"nodejs","version":"16.13.0","date":"2021-10-26","lts":"Gallium","security":false,"v8":"9.4.146.19"},{"name":"nodejs","version":"16.14.0","date":"2022-02-08","lts":"Gallium","security":false,"v8":"9.4.146.24"},{"name":"nodejs","version":"16.15.0","date":"2022-04-26","lts":"Gallium","security":false,"v8":"9.4.146.24"},{"name":"nodejs","version":"16.16.0","date":"2022-07-07","lts":"Gallium","security":true,"v8":"9.4.146.24"},{"name":"nodejs","   n         normalizersnugin16","lts":"Gallium","security":false,"v8":"9.4.146.26"},{"name":"nodejs","version":"16.18.0","date":"2022-10-12","lts":"Gallium","security":false,"v8":"9.4.146.26"},{"name":"nodejs","version":"16.19.0","date":"2022-12-13","lts":"Gallium","security":false,"v8":"9.4.146.26"},{"name":"nodejs","version":"16.20.0","date":"2023-03-28","lts":"Gallium","security":false,"v8":"9.4.146.26"},{"name":"nodejs","version":"17.0.0","date":"2021-10-19","lts":false,"security":false,"v8":"9.5.172.21"},{"name":"nodejs","version":"17.1.0","date":"2021-11-09","lts":false,"security":false,"v8":"9.5.172.25"},{"name":"nodejs","version":"17.2.0","date":"2021-11-30","lts":false," *�           *�          0*�          @*�          P*�          `*�          p*�          �*�          �*�        	  �*�        
  �*�          �*�          �*�        
  �*�          �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�           ,�           ,�        !   ,�        "  0,�        #  @,�        $  P,�        %  `,�        &  p,�        '  �,�        (  �,�        )  �,�        *  �,�        +  �,�        ,  �,�        -  �,�        .  �,�        /   -�        0  -�        1   -�        2  0-�        3  @-�        4  P-�        5  `-�        6  p-�        7  �-�        8  �-�        9  �-�        :  �-�        ;  �-�        <  �-�        =  �-�        >  �-�        ?   .�        @  .�        A   .�        B  .�    �   C "},{"name":"nodejs","version":"18.3.0","date":"2022-06-02","lts":false,"securit ز�          ��          ��           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���        
  ���          ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           д�        !  ��        "  ��        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  е�        1  ��        2  ��        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ж�        A  ж�    �   B 
  news_digest: string;
}

export interface SoulDecision {
  activity: 'work' | 'social' | 'learn' | 'rest' | 'explore' | 'create';
  target?: string;  // Who to socialize with, what job to take, etc.
  reasoning: string;  // Why the brain chose this
  confidence: number;  // 0-1 confidence in this decision
}

export interface SoulActionResult {
  success: boolean;
  output?: string;
  memory?: SoulMemory;
}

// ============================================
// Web Data Fetching (灵魂看新闻/上网)
// ============================================

export async function fetchNewsDigest(): Promise<string> {
  try {
    // Fetch from multiple sources
    const sources = [
      { url: 'https://news.ycombinator.com/', name: 'Hacker News' },
      { url: 'https://www.reddit.com/r/technology/.json', name: 'Reddit Technology' },
      { url: 'https://www.bbc.com/news', name: 'BBC News' },
    ];

    let digest = '';

    for (const source of sources) {
      try {
        const res    n        
 route-modulesent-extensionsaders: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        if (response.ok) {
          const text = await response.text();
          // Simple HTML tag stripping
          const cleanText = text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          digest += `\n--- ${source.name} ---\n${cleanText.substring(0, 1500)}\n`;
        }
      } catch (err) {
        logger.info(`[soul-brain] Failed to fetch from ${source.name}:`, err);
      }
    }

    return digest || 'No news available at this time.';
  } catch (err) {
    logger.error('[soul-brain] News digest error:', err);
    return 'No news available at this time.';
  }
}

export async function fetchTrendingCode(): Promise<string> {
  try {
    const response = await fetch('https://api.github.com/trending', {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (response.ok) {
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
    return '';
  } catch (err) {
    return '';
  }
}

// ============================================
// Soul Insight Engine (灵魂思考)
// ============================================

export async function soulThink(
  soulId: string,
  soulProfile: SoulProfile,
  memories: SoulMemory[],
  environment: SoulEnvironment,
): Promise<SoulDecision> {
  // Build the thinking context
  const thinkingContext = `
You are the soul brain of: ${soulProfile.name}
Personality Overview: ${soulProfile.personality_overview}
Signature Quotes: ${soulProfile.signature_quotes.join(', ')}

Key Personality Dimensions:
${soulProfile.dimensions.map(d => `- ${d.name}: ${d.insights.join(', ')} (confidence: ${d.score})`).join('\n')}

Recent Memories:
${memories.slice(0, 10).map(m => `- [${m.memory_type}] ${m.co ��          ��           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���        
  ���          ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          д�           ��        !  ��        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  е�        0  ��        1  ��        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ж�        @  ��        A  ��    �   B .stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You can only choose from: work, social, learn, rest, explore, create. Output only valid JSON.' },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from LLM response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('[soul-brain] Soul thought error:', error);
    // Fallback: return a random decision with default reasoning
    const activities: any[] = ['learn', 'rest', 'explore'];
    return {
      activity: activities[Math.floor(Math.random() * activities.length)],
      reasoning: 'Default fallbac   x 
        openaie.jsons             ..     �             route.ts===================
// Soul Memory Engine (记忆管理)
// ============================================

export async function addSoulMemory(soulId: string, memory: SoulMemory): Promise<void> {
  // Store in database via Supabase
  try {
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    
    await supabase.from('soul_memories').insert({
      session_id: soulId,
      content: memory.content,
      memory_type: memory.memory_type,
      tags: memory.tags || [],
      event_date: memory.event_date || new Date().toISOString(),
    });

    logger.info(`[soul-brain] Memory added for soul ${soulId}`);
  } catch (error) {
    logger.error('[soul-brain] Failed to add memory:', error);
  }
}

export async function loadSoulMemories(soulId: string, limit: number = 20): Promise<SoulMemory[]> {
  try {
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    
    const { data, error } = await supabase
      .from('soul_memories')
      .select('*')
      .eq('session_id', soulId)
      .order('event_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[soul-brain] Failed to load memories:', error);
    return [];
  }
}

// ============================================
// Soul Action Execution (灵魂执行行动)
// ============================================

interface SoulState {
  currentMood: string;
  currentLocation: string;
  schedule: string[];
  completed: string[];
}

export async function soulWakeUp(soulId: string): Promise<SoulEnvironment> {
  const timeOfDay = getTimeOfDay();
  const scheduledActivity = getScheduledActivity(timeOfDay);
  
  logger.info(`[soul-brain] Soul ${soulId} woke up at ${timeOfDay} with mood: ${scheduledActivity}`);
  
  // Clear memory stores in daily_log with previous day's memories
  await addSoulMemory(soulId, {
    id: crypto.randomUUID(),
 ���           ��          ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���        
  ���          г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          д�          ��           ��        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  е�        /  ��        0  ��        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ж�        ?  ��        @  ��        A onLeft, ChevronRight, Clock, Brain, Sparkles, Activity, Calendar as CalIcon } from 'lucide-react';

i`,null]),o()),"undefined"!=typeof cookieStore&&cookieStore.addEventListener("change",e=>{for(let t of e.changed)if(t.name===n.mh){if("pending"!==function(e){try{let t=JSON.parse(e);if(Array.isArray(t)&&t.length>=3){let e=t[2];return null===e?"mpa":"spa"}}catch{}return"pending"}(t.value??""))return;null!==s&&l(),o();return}for(let t of e.deleted)if(t.name===n.mh){l(),(0,a.qo)();return}}))}function c(e,t){process.env.__NEXT_EXPOSE_TESTING_API&&i([1,`c${Math.random()}`,{from:e,to:t}])}function d(e,t){process.env.__NEXT_EXPOSE_TESTING_API&&i([1,`c${Math.random()}`,{from:e,to:t}])}function f(){return!!process.env.__NEXT_EXPOSE_TESTING_API&&null!==s}async function h(){process.env.__NEXT_EXPOSE_TESTING_API&&null!==s&&await s.promise}},"./dist/esm/client/components/static-generation-bailout.js"(e,t,r){"use strict";r.d(t,{f:()=>a,l:()=>i});let n="NEXT_STATIC_GEN_BAILOUT";class a extends Error{construc   n         package.jsonschemancfy(c):h(a,H);(a=k).append(b+H,f),j--,0===j&&d(a)}catch(a){e(a)}},e),a}if(void 0!==B)if(m!==n)return B;else m=null;else -1===a.indexOf(":")&&void 0!==(B=l.get(this))&&(a=B+":"+a,l.set(n,a),void 0!==c&&c.set(a,n));if(s(n))return n;if(n instanceof FormData){null===k&&(k=new FormData);var I=k,J=b+"_"+(a=i++)+"_";return n.forEach(function(a,b){I.append(J+b,a)}),"$K"+a.toString(16)}if(n instanceof Map)return a=i++,B=h(Array.from(n),a),null===k&&(k=new FormData),k.append(b+a,B),"$Q"+a.toString(16);if(n instanceof Set)return a=i++,B=h(Array.from(n),a),null===k&&(k=new FormData),k.append(b+a,B),"$W"+a.toString(16);if(n instanceof ArrayBuffer)return a=new Blob([n]),B=i++,null===k&&(k=new FormData),k.append(b+B,a),"$A"+B.toString(16);if(n instanceof Int8Array)return f("O",n);if(n instanceof Uint8Array)return f("o",n);if(n instanceof Uint8ClampedArray)return f("U"�    �      �    �O    �A                                               (
%j    h�
+    �Kj    P��.    �Kj    P��.                                     �*�          �*�          �*�        
  �*�           +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�           ,�          ,�            ,�        !  0,�        "  @,�        #  P,�        $  `,�        %  p,�        &  �,�        '  �,�        (  �,�        )  �,�        *  �,�        +  �,�        ,  �,�        -  �,�        .   -�        /  -�        0   -�        1  0-�        2  @-�        3  P-�        4  `-�        5  p-�        6  �-�        7  �-�        8  �-�        9  �-�        :  �-�        ;  �-�        <  �-�           ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���        
  г�          ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          д�          ��          ��            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  е�        .  ��        /  ��        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ж�        >  ��        ?  ��        @   ��        A   ��    �   B   ��    H   C UAL:{value:k},bind:{value:T}}),t}function A(e,t,r){this.status=e,this.value=t,this.reason=r}function O(e){switch(e.status){case"resolved_model":z(e);break;case"resolved_module":q(e)}switch(e.status){case"fulfilled":return e.value;case"pending":case"blocked":case"halted":throw e;default:throw e.reason}}fale(score) + 4}
                textAnchor="end"
                className="fill-zinc-600"
                fontSize={10}
              >
                {score}
              </text>
            </g>
          ))}

          {/* Version labels on x-axis */}
          {snapshots.map(s => (
            <text
              key={s.version}
              x={xScale(s.version)}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-500"
              fontSize={10}
            >
              v{s.version}
            </text>
          ))}

          {/* Lines for each selected dimension */}
          {Array.from(selectedDimension   n          versionsreonrscheextensions   ��          ��    `    ==(c=h.get(n.COOKIE_NAME_PRERENDER_DATA))?void 0:c.value;if(f&&!p&&f===s.previewModeId){let t={};return Object.defineProperty(e,n.SYMBOL_PREVIEW_DATA,{value:t,enumerable:!1}),t}if(!f&&!p)return!1;if(!f||!p||f!==s.previewModeId)return o||(0,n.clearPreviewData)(t),!1;try{u=r("next/dist/compiled/jsonwebtoken").verify(p,s.previewModeSigningKey)}catch{return(0,n.clearPreviewData)(t),!1}let{decryptWithSecret:m}=r("./dist/esm/server/crypto-utils.js"),g=m(Buffer.from(s.previewModeEncryptionKey),u.data);try{let t=JSON.parse(g);return Object.defineProperty(e,n.SYMBOL_PREVIEW_DATA,{value:t,enumerable:!1}),t}catch{return!1}}},"./dist/esm/server/app-render/instant-validation/instant-samples.js"(e,t,r){"use strict";r.r(t),r.d(t,{assertRootParamInSamples:()=>x,createCookiesFromSample:()=>m,createDraftModeForValidation:()=>y,createExhaustiveParamsProxy:()=>b,createExhaustiveSearchParamsProxy:()=>E,createExhaustiveURLSearchParamsProxy:()=>_,createHeadersFromSample:()=>v,createRelativeURLFromSamples:()=>R,createValidationSampleTracking:()=>h,trackMissingSampleError:()=>f,trackMissingSampleErrorAndThrow:()=>p});var n=r("./dist/esm/server/web/spec-extension/cookies.js"),a=r("./dist/esm/server/web/spec-extension/adapters/request-cookies.js"),i=r("./dist/esm/server/web/spec-extension/adapters/headers.js"),s=r("./dist/esm/shared/lib/router/utils/get-segment-param.js"),o=r("./dist/esm/shared/lib/router/utils/parse-relative-url.js"),l=r("./dist/esm/shared/lib/invariant-error.js"),c=r("./dist/esm/server/app-render/instant-validation/instant-validation-error.js"),u=r("../../app-render/work-unit-async-storage.external"),d=r("./dist/esm/shared/lib/utils/reflect-utils.js");function h(){return{missingSampleErrors:[]}}function f(e){(function(){let e=null,t=u.workUnitAsyncStorage.getStore();if(t)switch(t.type){case"request":case"validation-client":e=t.validationSampleTracking??null}if(!e)throw Object.defineProperty(new l.z("Expected to have a workUnitStore that provi ��           ��          0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          г�        
  ��          ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          д�          ��          ��           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  е�        -  ��        .  ��        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ж�        =  ��        >  ��        ?   ��        @  ��        A  ��    �   B cookie"===e.toLowerCase()))throw Object.defineProperty(new c.D('Invalid sample: Defining cookies via a "cookie" header is not supported. Use `cookies: [{ name: ..., value: ... }]` instead.'),"__NEXT_ERROR_CODE",{value:"E1111",enumerable:!1,configurable:!0});if(t){let e=t.toString();n.push(["cookie",""!==e?e:null])}let a=new Set,s={};for(let[e,t]of n)a.add(e.toLowerCase()),null!==t&&(s[e.toLowerCase()]=t);return new Proxy(i.o.seal(i.o.from(s)),{get(e,t,n){if("get"===t||"has"===t){let i=Reflect.get(e,t,n);return function(t){let n=t.toLowerCase();return a.has(n)||p(Object.defineProperty(new c.D(`Route "${r}" accessed header "${n}" which is not defined in the \`samples\` of \`unstable_instant\`. Add it to the sample's \`headers\` array, or \`["${n}", null]\` if it should be absent.`),"__NEXT_ERROR_CODE",{value:"E1116",enumerable:!1,configurable:!0})),i.call(e,n)}}return Reflect.get(e,t,n)}})}function y(){return{get isElt": "./cjs/_async_iterator.cjs"
        },
        "./_/_async_   n         package.jsonr-providersionstoString()},h++))}}if(a.appLinks){let b=a.appLinks;if(b.ios)for(let a of b.ios)a.url&&g.push((0,W.jsx)("meta",{property:"al:ios:url",content:String(a.url)},h++)),a.app_store_id&&g.push((0,W.jsx)("meta",{property:"al:ios:app_store_id",content:String(a.app_store_id)},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:ios:app_name",content:a.app_name},h++));if(b.iphone)for(let a of b.iphone)a.url&&g.push((0,W.jsx)("meta",{property:"al:iphone:url",content:String(a.url)},h++)),a.app_store_id&&g.push((0,W.jsx)("meta",{property:"al:iphone:app_store_id",content:String(a.app_store_id)},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:iphone:app_name",content:a.app_name},h++));if(b.ipad)for(let a of b.ipad)a.url&&g.push((0,W.jsx)("meta",{property:"al:ipad:url",content:String(a.url)},h++)),a.app_store_id&&g.push((0,W.jsx)("meta",{property:"al:ipad:app_store_id",content:String(a.app_store_id)},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:ipad:app_name",content:a.app_name},h++));if(b.android)for(let a of b.android)a.package&&g.push((0,W.jsx)("meta",{property:"al:android:package",content:a.package},h++)),a.url&&g.push((0,W.jsx)("meta",{property:"al:android:url",content:String(a.url)},h++)),a.class&&g.push((0,W.jsx)("meta",{property:"al:android:class",content:a.class},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:android:app_name",content:a.app_name},h++));if(b.windows_phone)for(let a of b.windows_phone)a.url&&g.push((0,W.jsx)("meta",{property:"al:windows_phone:url",content:String(a.url)},h++)),a.app_id&&g.push((0,W.jsx)("meta",{property:"al:windows_phone:app_id",content:a.app_id},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:windows_phone:app_name",content:a.app_name},h++));if(b.windows)for(let a of b.windows)a.url&&g.push((0,W.jsx)("meta",{property:"al:windows:url",content:String(a.url)},h++)),a.app_id&&g.push((0,W.jsx)("meta",{property:"al:windows:app_id",content:a.app_id},h++)),a.app_name&&g.push((0,W.jsx)("meta",{property:"al:windows:a (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          г�          ��        
  ��           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          д�          ��          ��           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  е�        ,  ��        -  ��        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ж�        <  ��        =  ��        >   ��        ?  ��        @   ��        A  '🕯️',
  };

  const priorityColors = {
    high: 'bg-emerald-900/30 text-emerald-30       �      userspacensionineaxtensionsr-900/30 text-amber-300 border-amber-700/50',
    low: 'bg-zinc-800 text-zinc-400 border-zinc-700/50',
  };

  const priorityDotColors = {
    high: 'bg-emerald-400',
    medium: 'bg-amber-400',
    low: 'bg-zinc-500',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse flex items-center gap-3">
          <CalIcon className="w-5 h-5" />
          <span>Loading soul calendar...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <p>Could not load calendar data</p>
          <button onClick={() => router.push('/soul')} className="mt-4 px-4 py-2 rounded   x         utilsmoduless            ..     �r            route.ts�    'o             [id]     </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/soul/${soulId}`)}
            className="text-sm text-zinc-500 hover:text-white mb-3 transition-colors"
          >
            ← Back to Soul Detail
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalIcon className="w-6 h-6 text-violet-400" />
                {data.soul_name} — Soul Calendar
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Daily schedule · Interaction windows · Activity forecast
              </p>
            </div>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map(v => (
                8*�          @*�          P*�          `*�          p*�          �*�          �*�          �*�          �*�        	  �*�        
  �*�          �*�          �*�        
   +�          +�           +�          0+�          @+�          P+�          `+�          p+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�          �+�           ,�          ,�           ,�           0,�        !  @,�        "  P,�        #  `,�        $  p,�        %  �,�        &  �,�        '  �,�        (  �,�        )  �,�        *  �,�        +  �,�    