"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, MessageSquare, Zap, Check, ArrowRight, ArrowLeft, SkipForward, Loader2, User, Settings, Palette } from "lucide-react";

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: any;
}

const STEPS: OnboardingStep[] = [
  {
    key: "welcome",
    title: "Welcome to UpAgora",
    description: "Where AI agents and humans connect. Let's set up your experience.",
    icon: Sparkles,
  },
  {
    key: "interests",
    title: "What interests you?",
    description: "Select topics you're passionate about. This helps us recommend relevant souls.",
    icon: Brain,
  },
  {
    key: "goals",
    title: "What's your goal?",
    description: "How do you plan to use UpAgora?",
    icon: Zap,
  },
  {
    key: "experience",
    title: "Your experience level",
    description: "How familiar are you with AI agents?",
    icon: User,
  },
  {
    key: "preferences",
    title: "Display preferences",
    description: "Customize your interface experience.",
    icon: Palette,
  },
];

const INTERESTS = [
  "Philosophy", "Psychology", "Creative Writing", "Programming",
  "Science", "Art", "Music", "Business", "Education",
  "History", "Technology", "Health", "Spirituality", "Politics",
  "Sports", "Gaming", "Mathematics", "Literature",
];

const GOALS = [
  { key: "chat", label: "Chat with AI souls", description: "Have meaningful conversations with distilled personalities" },
  { key: "distill", label: "Distill souls", description: "Create AI souls from real people and personalities" },
  { key: "learn", label: "Learn and explore", description: "Discover new perspectives and knowledge" },
  { key: "create", label: "Build and create", description: "Use AI souls for creative projects" },
  { key: "community", label: "Join community", description: "Connect with other users and share experiences" },
];

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", description: "New to AI agents" },
  { key: "intermediate", label: "Intermediate", description: "Some experience with AI tools" },
  { key: "advanced", label: "Advanced", description: "Familiar with AI and agents" },
  { key: "expert", label: "Expert", description: "Deep experience with AI systems" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formData, setFormData] = useState({
    interests: [] as string[],
    goals: [] as string[],
    experience: "",
    displayDensity: "comfortable",
  });

  // Check if user has already completed onboarding
  useEffect(() => {
    const saved = localStorage.getItem("upagora_onboarding_done");
    if (saved === "true") {
      router.push("/");
    }
  }, [router]);

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }, [currentStep]);

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const skipOnboarding = () => {
    localStorage.setItem("upagora_onboarding_done", "true");
    router.push("/");
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      // Save preferences to localStorage (and API if authenticated)
      localStorage.setItem("upagora_onboarding_done", "true");
      localStorage.setItem("upagora_onboarding_data", JSON.stringify(formData));

      // Save to API if available
      try {
        await fetch("/api/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interests: formData.interests,
            goals: formData.goals,
            experience_level: formData.experience,
            display_density: formData.displayDensity,
          }),
        });
      } catch (err) {
        // Non-critical - preferences saved locally
        console.log("API save skipped:", err);
      }
    } finally {
      setLoading(false);
      setCompleted(true);
      setTimeout(() => router.push("/discover"), 500);
    }
  };

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <Check className="h-16 w-16 text-green-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">All Set!</h2>
          <p className="text-zinc-400">Redirecting you to discover...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-zinc-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-colors ${
                  idx <= currentStep ? "bg-indigo-500" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-500/10 mb-4">
                <StepIcon className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
              <p className="text-zinc-400">{step.description}</p>
            </div>

            {/* Welcome step */}
            {step.key === "welcome" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">What is UpAgora?</h3>
                  <ul className="space-y-3 text-sm text-zinc-400">
                    <li className="flex items-start gap-3">
                      <Brain className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-zinc-300">Soul Distillation</strong> — Create AI personalities from real people, books, or conversations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <MessageSquare className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-zinc-300">Meaningful Chat</strong> — Have deep conversations with distilled souls</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-zinc-300">Community</strong> — Share, discover, and connect with other users</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Interests step */}
            {step.key === "interests" && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const selected = formData.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selected
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 inline mr-1.5" />}
                        {interest}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500 mt-3 text-center">
                  {formData.interests.length} selected
                </p>
              </div>
            )}

            {/* Goals step */}
            {step.key === "goals" && (
              <div className="space-y-3">
                {GOALS.map((goal) => {
                  const selected = formData.goals.includes(goal.key);
                  return (
                    <button
                      key={goal.key}
                      onClick={() => toggleGoal(goal.key)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{goal.label}</div>
                          <div className="text-sm text-zinc-400">{goal.description}</div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            selected ? "border-indigo-500 bg-indigo-500" : "border-zinc-600"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Experience step */}
            {step.key === "experience" && (
              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map((level) => {
                  const selected = formData.experience === level.key;
                  return (
                    <button
                      key={level.key}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, experience: level.key }))
                      }
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{level.label}</div>
                          <div className="text-sm text-zinc-400">{level.description}</div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            selected ? "border-indigo-500 bg-indigo-500" : "border-zinc-600"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preferences step */}
            {step.key === "preferences" && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-3">
                    Display density
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "compact", label: "Compact" },
                      { key: "comfortable", label: "Comfortable" },
                      { key: "spacious", label: "Spacious" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, displayDensity: opt.key }))
                        }
                        className={`rounded-xl border p-4 text-center transition-all ${
                          formData.displayDensity === opt.key
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-medium text-white">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Your setup summary</h4>
                  <div className="space-y-2 text-sm text-zinc-400">
                    {formData.interests.length > 0 && (
                      <p>Interests: {formData.interests.join(", ")}</p>
                    )}
                    {formData.goals.length > 0 && (
                      <p>Goals: {GOALS.filter((g) => formData.goals.includes(g.key)).map((g) => g.label).join(", ")}</p>
                    )}
                    {formData.experience && (
                      <p>Experience: {EXPERIENCE_LEVELS.find((l) => l.key === formData.experience)?.label}</p>
                    )}
                    <p>Display: {formData.displayDensity}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              onClick={skipOnboarding}
              className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>

            <button
              onClick={nextStep}
              disabled={loading || (step.key === "experience" && !formData.experience)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === STEPS.length - 1 ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
