"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, MessageCircle, Zap, Check, ArrowRight, ArrowLeft, UserPlus, Brain, SkipForward, Loader2 } from "lucide-react";
import { SOUL_PRESETS, type SoulPreset } from '@/lib/soul-presets';

/* ─── 3-step onboarding for Soul Town ─── */

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<"adopt" | "distill" | "">("");
  const [selectedSoulId, setSelectedSoulId] = useState<string>("");

  // Already onboarded?
  useEffect(() => {
    if (localStorage.getItem("upagora_onboarding_done") === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  function finish(pathChoice: string, soulId: string) {
    setLoading(true);
    localStorage.setItem("upagora_onboarding_done", "true");
    localStorage.setItem("upagora_onboarding_path", pathChoice);
    if (soulId) {
      localStorage.setItem("upagora_onboarding_soul", soulId);
    }
    setTimeout(() => {
      setLoading(false);
      if (soulId) {
        router.push(`/chat?soul=${soulId}`);
      } else if (pathChoice === "distill") {
        router.push("/distill");
      } else {
        router.push("/dashboard");
      }
    }, 600);
  }

  function skip() {
    localStorage.setItem("upagora_onboarding_done", "true");
    router.push("/dashboard");
  }

  /* ─── Loading / Complete ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Getting things ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  s <= step
                    ? "bg-indigo-500 scale-110"
                    : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* ─── STEP 1: Welcome ─── */}
          {step === 1 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-indigo-500/10 mb-6">
                <Sparkles className="h-10 w-10 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Welcome to Soul Town</h1>
              <p className="text-lg text-zinc-400 mb-2 max-w-md mx-auto">
                A place where distilled AI souls live, grow, and connect with you.
              </p>
              <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
                Each soul is unique — shaped by real people, ideas, and conversations.
                They have personalities, beliefs, and boundaries.
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <MessageCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-xs text-zinc-400">Chat with souls</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <Brain className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                  <div className="text-xs text-zinc-400">Distill your own</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <Zap className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-xs text-zinc-400">Watch them grow</div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors inline-flex items-center gap-2"
              >
                Let's Go <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Choose Path ─── */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">How do you want to start?</h2>
                <p className="text-zinc-400">Pick a path — you can always explore the other later.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adopt a soul */}
                <button
                  onClick={() => { setPath("adopt"); setStep(3); }}
                  className="group rounded-2xl border-2 border-zinc-800 hover:border-indigo-500 bg-zinc-900/50 p-6 text-left transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                      <UserPlus className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Adopt a Soul</div>
                      <div className="text-xs text-zinc-500">Start chatting right away</div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Choose from featured souls — historical figures, the founder, or original creations.
                    Chat immediately, no setup needed.
                  </p>
                </button>

                {/* Distill your own */}
                <button
                  onClick={() => { setPath("distill"); finish("distill", ""); }}
                  className="group rounded-2xl border-2 border-zinc-800 hover:border-purple-500 bg-zinc-900/50 p-6 text-left transition-all hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Brain className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Distill Your Soul</div>
                      <div className="text-xs text-zinc-500">Create something unique</div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Capture the essence of yourself, a person, or a character.
                    Answer questions, set boundaries, and watch your soul come alive.
                  </p>
                </button>
              </div>

              <div className="mt-6 flex justify-start">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Pick a Soul ─── */}
          {step === 3 && path === "adopt" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Choose a Soul to Chat With</h2>
                <p className="text-zinc-400">Each one has a unique personality and story.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {SOUL_PRESETS.map((soul) => {
                  const isSelected = selectedSoulId === soul.id;
                  return (
                    <button
                      key={soul.id}
                      onClick={() => setSelectedSoulId(soul.id)}
                      className={`rounded-2xl border-2 p-5 text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{soul.avatar}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-white">{soul.name_native}</div>
                              <div className="text-xs text-zinc-500">{soul.name} · {soul.era}</div>
                            </div>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{soul.profession}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => finish(path, selectedSoulId)}
                  disabled={!selectedSoulId}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl text-white font-medium transition-colors inline-flex items-center gap-2"
                >
                  Start Chatting <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Skip */}
          <div className="text-center mt-8">
            <button
              onClick={skip}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors inline-flex items-center gap-1"
            >
              <SkipForward className="h-3 w-3" /> Skip onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
