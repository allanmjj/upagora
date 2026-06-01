"use client";

import { useState } from "react";

const STEPS = [
  {
    key: "intro",
    title: "Start Your Soul Distillation",
    description: "The most important relationships deserve to continue beyond time.",
  },
  {
    key: "who",
    title: "Who Are You Distilling?",
    description: "A person, a historical figure, or even yourself.",
  },
  {
    key: "method",
    title: "Choose Your Method",
    description: "Different approaches for different depths.",
  },
  {
    key: "feed",
    title: "Feed the Soul",
    description: "The more you share, the closer it becomes.",
  },
  {
    key: "calibrate",
    title: "Calibrate & Refine",
    description: "The guardian's sacred duty.",
  },
];

type StepKey = "intro" | "who" | "method" | "feed" | "calibrate";

const DISTILL_METHODS = [
  {
    id: "auto",
    icon: "🔍",
    title: "Quick Extract",
    description: "We'll search public records to build an initial profile.",
    best_for: "Historical figures, public personalities",
    time: "~5 min",
  },
  {
    id: "upload",
    icon: "📝",
    title: "Upload Materials",
    description: "Share writings, letters, transcripts, and conversation records.",
    best_for: "Anyone you have materials about",
    time: "~10 min",
  },
  {
    id: "guide",
    icon: "🎙️",
    title: "Guided Interview",
    description: "Answer structured questions that reveal personality depths.",
    best_for: "Living people, yourself",
    time: "~30 min",
  },
];

const FEED_LEVELS = [
  {
    level: "L1",
    name: "Passive Collection",
    icon: "📡",
    description: "Chat logs, emails, social media exports — anything you already have.",
    quality: "Foundation",
    color: "from-slate-500 to-zinc-500",
  },
  {
    level: "L2",
    name: "Active Extraction",
    icon: "🎯",
    description: "Answer structured questions designed to capture specific personality dimensions.",
    quality: "Improving",
    color: "from-violet-500 to-purple-500",
  },
  {
    level: "L3",
    name: "Biographical Depth",
    icon: "🗺️",
    description: "Full life map — pivotal moments, relationships, triumphs, and regrets.",
    quality: "Deep",
    color: "from-amber-500 to-orange-500",
  },
  {
    level: "L4",
    name: "Live Calibration",
    icon: "💫",
    description: "Real-time guardian feedback loop — the soul learns and evolves with every interaction.",
    quality: "Living",
    color: "from-emerald-500 to-green-500",
  },
];

export default function SoulDistillWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));
  const goToStep = (n: number) => setCurrentStep(n);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-transparent" />
        <div className="relative container mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-violet-900/20 px-4 py-1.5 text-sm text-violet-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Soul Distillation Pipeline
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-300 via-purple-300 to-amber-300 bg-clip-text text-transparent">
            Distill a Soul
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Create a digital replica that captures not just what someone knew,
            but <em className="text-zinc-300">who they were</em>.
            Through 7 dimensions of personality, backed by memory and refined by guardianship.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <button
              key={step.key}
              onClick={() => goToStep(i)}
              className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg text-sm transition-all ${
                i === currentStep
                  ? "bg-violet-600 text-white"
                  : i < currentStep
                  ? "bg-violet-900/50 text-violet-300"
                  : "bg-zinc-900 text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < currentStep
                  ? "bg-emerald-600 text-white"
                  : i === currentStep
                  ? "bg-white/20"
                  : "bg-zinc-800"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 pb-16">
        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🧬</div>
            <h2 className="text-2xl font-bold mb-4">{STEPS[0].title}</h2>
            <p className="text-zinc-400 mb-8">{STEPS[0].description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left">
                <div className="text-lg font-medium mb-1">7 Dimensions</div>
                <div className="text-sm text-zinc-500">Cognition, Values, Expression, Knowledge, Emotion, Relationships, Narrative</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left">
                <div className="text-lg font-medium mb-1">9D Constraints</div>
                <div className="text-sm text-zinc-500">Knowledge boundaries ensure authenticity — what they CAN'T know matters as much as what they can</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left">
                <div className="text-lg font-medium mb-1">Living Memory</div>
                <div className="text-sm text-zinc-500">Semantic memory with RAG retrieval, continuously calibrated by guardians</div>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium hover:from-violet-500 hover:to-purple-500 transition-all text-lg"
            >
              Begin →
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">{STEPS[1].title}</h2>
            <p className="text-zinc-400 mb-8">{STEPS[1].description}</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sū Shì / Abraham Lincoln / Your loved one"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Native Language</label>
                  <select className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-600">
                    <option value="zh">Chinese</option>
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Category</label>
                  <select className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-600">
                    <option value="historical">Historical Figure</option>
                    <option value="living">Living Person</option>
                    <option value="self">Myself</option>
                    <option value="fictional">Fictional</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={prevStep} className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                ← Back
              </button>
              <button onClick={nextStep} className="px-6 py-3 rounded-xl bg-violet-600 font-medium hover:bg-violet-500 transition-colors">
                Next: Choose Method →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">{STEPS[2].title}</h2>
            <p className="text-zinc-400 mb-8">{STEPS[2].description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {DISTILL_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`rounded-2xl border p-6 text-left transition-all ${
                    selectedMethod === method.id
                      ? "border-violet-500 bg-violet-900/20 ring-2 ring-violet-500/30"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-3xl mb-3">{method.icon}</div>
                  <div className="font-bold mb-1">{method.title}</div>
                  <div className="text-sm text-zinc-400 mb-2">{method.description}</div>
                  <div className="text-xs text-violet-400">Best for: {method.best_for}</div>
                  <div className="text-xs text-zinc-600 mt-1">Est. {method.time}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={prevStep} className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={nextStep}
                disabled={!selectedMethod}
                className="px-6 py-3 rounded-xl bg-violet-600 font-medium hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Feed the Soul →
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">{STEPS[3].title}</h2>
            <p className="text-zinc-400 mb-8">{STEPS[3].description}</p>

            <div className="space-y-4 mb-8">
              {FEED_LEVELS.map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedFeed(lvl.level)}
                  className={`w-full rounded-2xl border p-5 text-left transition-all flex gap-4 items-start ${
                    selectedFeed === lvl.level
                      ? "border-violet-500 bg-violet-900/20"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div className={`text-3xl shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${lvl.color} flex items-center justify-center`}>
                    {lvl.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{lvl.name}</span>
                      <span className="text-xs text-zinc-500">({lvl.quality})</span>
                    </div>
                    <div className="text-sm text-zinc-400">{lvl.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={prevStep} className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={nextStep}
                disabled={!selectedFeed}
                className="px-6 py-3 rounded-xl bg-violet-600 font-medium hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Calibrate →
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold mb-4">{STEPS[4].title}</h2>
            <p className="text-zinc-400 mb-8">
              The distillation pipeline is ready. You'll now enter the Guardian Calibration
              mode where you chat with the soul, observe its responses, and refine it
              through calibrated feedback.
            </p>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-8 text-left">
              <h3 className="font-bold mb-3">What calibration does:</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> 6-question onboarding questionnaire per session</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Conversation-based calibration across 5 dimensions</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Persona auto-updates from accumulated feedback</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> AI assistant suggests focused questions</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/calibrate"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium hover:from-violet-500 hover:to-purple-500 transition-all text-lg"
              >
                Enter Guardian Calibration →
              </a>
            </div>

            <p className="mt-6 text-xs text-zinc-600">
              Each calibration improves the soul. After ~30 feedback points, the system
              will suggest an AI-powered persona regeneration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
