"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SoulRadar } from "@/components/features/soul-radar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const DIMENSIONS = [
  { key: "cognitive_patterns", label: "Cognitive Patterns", color: "#6366f1" },
  { key: "value_judgment", label: "Value Judgment", color: "#8b5cf6" },
  { key: "expression_style", label: "Expression Style", color: "#a78bfa" },
  { key: "knowledge_structure", label: "Knowledge Structure", color: "#c4b5fd" },
  { key: "emotional_response", label: "Emotional Response", color: "#818cf8" },
  { key: "relationship_memory", label: "Relationship Map", color: "#7c3aed" },
  { key: "life_narrative", label: "Life Narrative", color: "#5b21b6" },
];

// ─── Main Page ───

export default function ExperiencePage() {
  const [step, setStep] = useState(0);
  const [rawText, setRawText] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionSlug, setSessionSlug] = useState("");
  const [distillPhase, setDistillPhase] = useState(0);

  // Distillation phase messages
  const phaseMessages = [
    "Initializing soul matrix...",
    "Mapping cognitive patterns...",
    "Analyzing value judgments...",
    "Tracing expression style...",
    "Charting knowledge structure...",
    "Reading emotional responses...",
    "Building relationship map...",
    "Weaving life narrative...",
    "Soul crystallization complete.",
  ];

  // Check existing session from cookie
  useEffect(() => {
    const slug = document.cookie.match(/ns-slug=([^;]+)/)?.[1];
    if (slug) {
      fetch(`/api/soul/export-image?session_slug=${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.dimensions?.length) {
            setSessionSlug(slug);
            setDimensions(data.dimensions);
            setSubjectName(data.subject_name || "");
            setStep(3);
          }
        });
    }
  }, []);

  // Step 0 → 1
  const start = () => setStep(1);

  // Step 1 → extract
  const handleExtract = async () => {
    if (rawText.trim().length < 10) {
      setError("Please enter at least 10 characters");
      return;
    }
    setError("");
    setLoading(true);
    setDistillPhase(0);
    setStep(2);

    // Animate distillation phases
    const phaseInterval = setInterval(() => {
      setDistillPhase((p) => Math.min(p + 1, phaseMessages.length - 1));
    }, 800);

    try {
      const res = await fetch("/api/soul/quick-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, subject_name: subjectName || "Soul" }),
      });
      const data = await res.json();
      clearInterval(phaseInterval);

      if (!res.ok) {
        setError(data.error || "Extraction failed");
        setLoading(false);
        setStep(1);
        return;
      }
      setSessionSlug(data.session_slug);
      setDimensions(data.dimensions || []);
      setSubjectName(data.subject_name || subjectName);
      setDistillPhase(phaseMessages.length - 1);

      // Brief pause to show completion message
      setTimeout(() => {
        setLoading(false);
        setStep(3);
      }, 1000);
    } catch (err: any) {
      clearInterval(phaseInterval);
      setError(err.message || "Extraction failed");
      setLoading(false);
      setStep(1);
    }
  };

  // Step 3 → chat
  const handleChat = async (msg: string) => {
    setChatLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/soul/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_slug: sessionSlug }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatResponse(data.response);
      } else {
        setErrorMessage(data.error || "Chat failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Chat failed");
    }
    setChatLoading(false);
  };

  // Download radar image
  const downloadRadar = () => {
    if (!sessionSlug) return;
    window.open(`/api/soul/export-image?session_slug=${sessionSlug}`, "_blank");
  };

  // ─── Render Steps ───

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-2xl text-center space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-700/30 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              <span className="animate-bounce" style={{ animationDuration: "3s" }}>
                ✦
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Soul Distillation
              </span>
            </h1>
            <p className="text-xl text-indigo-300/70">
              In 3 minutes, AI maps your 7-dimensional soul profile
            </p>
            <p className="text-base text-white/40 max-w-md mx-auto">
              Paste your recent chat logs, emails, diary entries.
              <br />
              AI will distill your unique soul signature.
            </p>
          </div>

          <button
            onClick={start}
            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-lg font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all transform hover:scale-105"
          >
            Start Distillation →
          </button>

          <div className="text-xs text-white/25 space-y-0.5 pt-4">
            <p>Data stays private · No registration needed · Done in 3 minutes</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Paste Your Text Fragments
            </h2>
            <p className="text-white/50">Chat logs, emails, diaries, social posts — any authentic text</p>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
            />
            <textarea
              placeholder="Paste your text here (at least 10 characters)..."
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setError("");
              }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 h-64 focus:border-indigo-500 focus:outline-none resize-none"
              rows={15}
            />
            <div className="text-xs text-white/30 text-right">{rawText.length} chars</div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(0)}
              className="px-6 py-3 bg-white/5 rounded-lg text-white/60 hover:bg-white/10 transition"
            >
              ← Back
            </button>
            <button
              onClick={handleExtract}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-semibold text-lg disabled:opacity-50 hover:from-indigo-500 hover:to-purple-500 transition"
            >
              {loading ? "⏳ Distilling..." : "Start Distillation ✦"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-2xl text-center space-y-8">
          {/* Animated Radar during distillation */}
          <div className="relative mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-600/10 animate-pulse" />
            </div>
            <div className="relative">
              <SoulRadar
                data={dimensions.length > 0 ? dimensions : DIMENSIONS.map((d) => ({ ...d, score: 0.3 + Math.random() * 0.4 }))}
                animating={true}
                size={280}
              />
            </div>
          </div>

          {/* Phase messages */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-indigo-400">
              Distilling Your Soul...
            </h2>
            <div className="h-6 overflow-hidden">
              <p className="text-white/50 animate-pulse transition-all duration-300">
                {phaseMessages[distillPhase]}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-64 mx-auto mt-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${(distillPhase / (phaseMessages.length - 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-2">
                {distillPhase + 1} / {phaseMessages.length} dimensions analyzed
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {subjectName ? `${subjectName}&apos;s Soul` : "Your Soul Profile"}
            </h2>
            <p className="text-white/50">7 dimensions distilled from your authentic text</p>
          </div>

          {/* Radar Chart */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-indigo-300">7-Dimension Radar</h3>
              <button
                onClick={downloadRadar}
                className="text-xs text-white/40 hover:text-indigo-400 px-3 py-1 border border-white/10 rounded"
              >
                Save Image
              </button>
            </div>
            <SoulRadar data={dimensions} size={320} />
          </div>

          {/* Dimension Details */}
          <div className="grid gap-3 md:grid-cols-2">
            {dimensions?.map((dim: any, i: number) => (
              <div key={dim.dimension_name || i} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-indigo-500/30 transition">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-indigo-300">{dim.label}</h4>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {(dim.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-white/50 leading-relaxed">
                  {dim.insights?.[0]?.slice?.(0, 120) || "Analyzing in depth..."}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Section */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-indigo-300 mb-4">Chat With Your Soul</h3>

            {chatResponse ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-4">
                  <p className="text-white/80 leading-relaxed">{chatResponse}</p>
                </div>
                <p className="text-xs text-white/30 text-right">— This is your soul speaking</p>
              </div>
            ) : (
              <div className="text-center text-white/40 py-4">
                <p>Ask a question and let your soul answer</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <input
                type="text"
                placeholder="What do you want to ask your soul?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !chatLoading) {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      handleChat(target.value.trim());
                      target.value = "";
                    }
                  }
                }}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="What do you want to ask your soul?"]') as HTMLInputElement;
                  if (input?.value?.trim()) {
                    handleChat(input.value.trim());
                    input.value = "";
                  }
                }}
                disabled={chatLoading}
                className="px-6 py-3 bg-indigo-600 rounded-lg disabled:opacity-50 hover:bg-indigo-500 transition"
              >
                {chatLoading ? "..." : "Ask"}
              </button>
            </div>
            {errorMessage && <p className="text-red-400 text-sm mt-2">{errorMessage}</p>}
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 pt-6 pb-12">
            <p className="text-white/60">Want to save your Soul Profile?</p>
            <a
              href="/register"
              className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full font-semibold hover:from-indigo-500 hover:to-purple-500 transition"
            >
              Register to Save →
            </a>
            <p className="text-xs text-white/30">Without registration, your profile expires in 24 hours</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
