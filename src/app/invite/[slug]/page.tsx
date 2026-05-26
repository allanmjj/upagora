"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const DIMENSIONS = [
  { key: "cognitive_patterns", label: "Cognitive Patterns", color: "#6366f1" },
  { key: "value_judgment", label: "Value Judgment", color: "#8b5cf6" },
  { key: "expression_style", label: "Expression Style", color: "#a78bfa" },
  { key: "knowledge_structure", label: "Knowledge Structure", color: "#c4b5fd" },
  { key: "emotional_response", label: "Emotional Response", color: "#818cf8" },
  { key: "relationship_memory", label: "Relationship Map", color: "#7c3aed" },
  { key: "life_narrative", label: "Life Narrative", color: "#5b21b6" },
];

// ─── Radar Chart ───
function RadarChart({ data }: { data: { score: number }[] | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data?.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, r = 100, n = data.length;

    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / 5) * ring, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(99,102,241,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(99,102,241,0.18)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Fill
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const dr = r * (data[i]?.score || 0);
      const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(99,102,241,0.2)";
    ctx.fill();

    // Stroke
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const dr = r * (data[i]?.score || 0);
      const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points + labels
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const score = data[i]?.score || 0;
      const dr = r * score;
      const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = DIMENSIONS[i]?.color || "#6366f1";
      ctx.fill();

      const lx = cx + Math.cos(angle) * (r + 20);
      const ly = cy + Math.sin(angle) * (r + 20);
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillStyle = "#a5b4fc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${DIMENSIONS[i]?.label || ""} ${(score * 100).toFixed(0)}%`, lx, ly);
    }
  }, [data]);

  return <canvas ref={canvasRef} className="w-[280px] h-[280px]" />;
}

// ─── Page ───
export default function InvitePage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const [session, setSession] = useState<any>(null);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [calibrating, setCalibrating] = useState(false);
  const [lastAgentResponse, setLastAgentResponse] = useState("");
  const [calibrationSent, setCalibrationSent] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/soul/share/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); }
        else { setSession(data.session); setDimensions(data.dimensions || []); }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    setChatMessages((m) => [...m, { role: "user", text: msg }]);
    setChatLoading(true);
    setChatError("");
    setCalibrationSent(false);
    try {
      const res = await fetch("/api/soul/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_slug: slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((m) => [...m, { role: "agent", text: data.response }]);
        setLastAgentResponse(data.response);
      } else {
        setChatError(data.error || "Chat failed");
      }
    } catch {
      setChatError("Chat failed，please retry");
    }
    setChatLoading(false);
  };

  const handleCalibrate = async () => {
    if (!lastAgentResponse || calibrationSent) return;
    setCalibrating(true);
    try {
      await fetch("/api/soul/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_slug: slug,
          guardian_name: "anonymous",
          agent_response: lastAgentResponse,
          corrected_response: "",
          dimension: "guardian_flag",
        }),
      });
      setCalibrationSent(true);
    } catch {
      /* silent */
    }
    setCalibrating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-bounce">✦</div>
          <p className="text-white/40">Loading soul profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">😔</div>
          <h2 className="text-xl font-bold text-white/80">Soul Not Found</h2>
          <p className="text-white/40">{error}</p>
          <Link href="/experience" className="inline-block mt-4 px-6 py-3 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition">
            Try your own soul distillation →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          UpAgora
        </Link>
        <Link href="/experience" className="text-sm text-white/40 hover:text-indigo-400 transition">
          Try it yourself →
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Soul identity */}
        <div className="text-center space-y-2">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Guardian Group Invitation</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {session?.subject_name || "TA"} 's Soul Profile
          </h1>
          <p className="text-white/40 text-sm">
            From UpAgora Soul Distillation · 7-Dimension Analysis
          </p>
        </div>

        {/* Radar */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
          <h3 className="text-sm font-medium text-indigo-300 mb-4">7-Dimension Radar Chart</h3>
          <div className="flex justify-center">
            <RadarChart data={dimensions} />
          </div>
        </div>

        {/* Dimension list */}
        <div className="grid gap-3 md:grid-cols-2">
          {dimensions.map((dim: any, i: number) => (
            <div key={dim.dimension_name || i} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-indigo-300">{dim.label}</span>
                <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full">
                  {(dim.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                {dim.insights?.[0]?.slice?.(0, 100) || "Analyzing in depth..."}
              </p>
            </div>
          ))}
        </div>

        {/* Guardian chat */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-indigo-300">🛡️ Guardian Chat</h3>
            {lastAgentResponse && !calibrationSent && (
              <button
                onClick={handleCalibrate}
                disabled={calibrating}
                className="text-xs px-3 py-1 border border-red-500/30 text-red-400/70 rounded hover:border-red-500/60 hover:text-red-400 transition disabled:opacity-40"
              >
                {calibrating ? "Recording..." : "Disagree (Calibrate)"}
              </button>
            )}
            {calibrationSent && (
              <span className="text-xs text-emerald-400/70">✓ Calibration recorded</span>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-3 min-h-[120px] max-h-[320px] overflow-y-auto">
            {chatMessages.length === 0 && (
              <div className="text-center text-white/25 text-sm py-6">
                Ask the soul a question, or click 'Disagree' after a response to calibrate
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600/30 text-indigo-100"
                    : "bg-white/5 border border-white/10 text-white/80"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40">
                  Soul is thinking...
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <p className="text-red-400 text-sm">{chatError}</p>
          )}

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !chatLoading) handleChat(); }}
              placeholder="Ask the soul something..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none text-sm"
            />
            <button
              onClick={handleChat}
              disabled={chatLoading || !chatInput.trim()}
              className="px-6 py-3 bg-indigo-600 rounded-lg disabled:opacity-40 hover:bg-indigo-500 transition text-sm font-medium"
            >
              Send
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 pb-8">
          <p className="text-white/30 text-xs">EXPanonymous soul profile's Soul Profile. Data expires in 24 hours.</p>
          <Link href="/login" className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition">
            Login to save forever →
          </Link>
        </div>
      </div>
    </div>
  );
}
