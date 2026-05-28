"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface WizardStepData {
  name: string;
  background: string;
  values: string;
  knowledge: string;
  story: string;
}

const STEPS = [
  {
    id: 0,
    title: "Welcome",
    subtitle: "Begin your self-distillation journey",
    icon: "✨",
  },
  {
    id: 1,
    title: "Who Are You",
    subtitle: "Name, background, and identity",
    icon: "👤",
  },
  {
    id: 2,
    title: "Core Values",
    subtitle: "What guides your decisions",
    icon: "⚖️",
  },
  {
    id: 3,
    title: "Knowledge & Expertise",
    subtitle: "What you know and how you think",
    icon: "📚",
  },
  {
    id: 4,
    title: "Life Story",
    subtitle: "Key moments that shaped you",
    icon: "📖",
  },
  {
    id: 5,
    title: "Review & Create",
    subtitle: "Finalize your soul profile",
    icon: "🎯",
  },
];

export default function SelfDistillationWizard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [distilling, setDistilling] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WizardStepData>({
    name: "",
    background: "",
    values: "",
    knowledge: "",
    story: "",
  });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Pre-fill name if available
        setData((prev) => ({
          ...prev,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        }));
      }
      setLoading(false);
    }
    init();
  }, []);

  const updateField = (field: keyof WizardStepData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return data.name.trim().length > 0;
      case 2: return data.values.trim().length > 20;
      case 3: return data.knowledge.trim().length > 20;
      case 4: return data.story.trim().length > 20;
      case 5: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setDistilling(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Call the soul extract API with self-distillation data
      const res = await fetch("/api/soul/quick-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          background: data.background,
          values: data.values,
          knowledge: data.knowledge,
          life_story: data.story,
          mode: "self-distillation",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Extraction failed");
        return;
      }

      const result = await res.json();
      setCompleted(true);
    } catch (err) {
      setError("Failed to create soul profile. Please try again.");
    } finally {
      setDistilling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading Self-Distillation Wizard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl text-white mb-2">Self-Distillation</h2>
          <p className="text-slate-400">Please log in to start distilling your soul</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900/50 rounded-2xl border border-slate-800/50 p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Soul Created!
          </h2>
          <p className="text-slate-300 mb-6">
            Welcome to UpAgora! Your soul has been distilled and is ready.
            You can now chat with your soul, calibrate it over time, or invite guardians.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/chat" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-full font-medium transition-all">
              Chat with your soul
            </a>
            <a href="/calibrate" className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-full font-medium transition-all">
              Calibrate
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Self-Distillation Wizard
              </h1>
              <p className="text-slate-400 text-sm">
                Create your soul profile in 5 simple steps
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id <= currentStep ? "opacity-100" : "opacity-40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    step.id < currentStep
                      ? "bg-green-500/20 text-green-400"
                      : step.id === currentStep
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-slate-800/50 text-slate-500"
                  }`}
                >
                  {step.id < currentStep ? "✓" : step.icon}
                </div>
                <span className="text-xs text-slate-400 hidden md:block">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full transition-all duration-500"
              style={{
                width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{STEPS[currentStep].icon}</div>
            <h2 className="text-2xl font-semibold text-white">
              {STEPS[currentStep].title}
            </h2>
            <p className="text-slate-400">{STEPS[currentStep].subtitle}</p>
          </div>

          {currentStep === 0 && (
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-lg">
                Self-distillation is the process of capturing your unique essence
                into an AI agent. By answering a few questions, we'll create a soul
                profile that reflects who you are.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <div className="text-purple-400 mb-1">🎯</div>
                  <div>Captures your essence</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <div className="text-blue-400 mb-1">⚡</div>
                  <div>Takes only 5 minutes</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <div className="text-green-400 mb-1">🔄</div>
                  <div>Update anytime</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <div className="text-pink-400 mb-1">👥</div>
                  <div>Share with guardians</div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter your name..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Background
                </label>
                <textarea
                  value={data.background}
                  onChange={(e) => updateField("background", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                  rows={4}
                  placeholder="Tell us about yourself - your profession, interests, cultural background, etc..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm mb-4">
                What are your core values and beliefs? What principles guide your
                life and decisions? (Minimum 20 characters)
              </p>
              <textarea
                value={data.values}
                onChange={(e) => updateField("values", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                rows={6}
                placeholder="Describe your core values, what matters most to you, how you approach life..."
              />
              <div className="text-xs text-slate-500">
                {data.values.length}/20 minimum characters
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm mb-4">
                What do you know? What are your areas of expertise and interests?
                How do you typically approach problems? (Minimum 20 characters)
              </p>
              <textarea
                value={data.knowledge}
                onChange={(e) => updateField("knowledge", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                rows={6}
                placeholder="Describe your knowledge, skills, expertise areas, and how you think about problems..."
              />
              <div className="text-xs text-slate-500">
                {data.knowledge.length}/20 minimum characters
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm mb-4">
                What key moments shaped who you are? What experiences had the
                biggest impact on your life? (Minimum 20 characters)
              </p>
              <textarea
                value={data.story}
                onChange={(e) => updateField("story", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                rows={6}
                placeholder="Share key life moments, milestones, challenges you've overcome, turning points..."
              />
              <div className="text-xs text-slate-500">
                {data.story.length}/20 minimum characters
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm mb-4">
                Review your soul profile below. When ready, click "Create Soul"
                to distill your essence into an AI agent.
              </p>
              <div className="bg-slate-800/30 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-sm text-slate-400">Name</div>
                  <div className="text-white">{data.name || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Background</div>
                  <div className="text-white">{data.background || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Values</div>
                  <div className="text-white">{data.values || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Knowledge</div>
                  <div className="text-white">{data.knowledge || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Life Story</div>
                  <div className="text-white">{data.story || "Not provided"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            onClick={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
            disabled={!canProceed() || distilling}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {distilling
              ? "Distilling..."
              : currentStep === STEPS.length - 1
              ? "Create Soul ✨"
              : "Next →"}
          </button>
        </div>
      </main>
    </div>
  );
}
