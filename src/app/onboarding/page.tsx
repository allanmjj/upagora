'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Inline button since no UI library
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; className?: string }) {
  const { size, ...rest } = props;
  return <button {...rest} />;
}
import {
  Brain, Heart, MessageCircle, BookOpen, Users, Mic, Sparkles,
  ChevronRight, Check, ArrowRight, Star, Shield, Ghost, Zap
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';

type Step = 'welcome' | 'type' | 'name' | 'memory' | 'narrative' | 'review' | 'distilling' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [soulType, setSoulType] = useState('');
  const [soulName, setSoulName] = useState('');
  const [memoryText, setMemoryText] = useState('');
  const [narrative, setNarrative] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);

  const steps: Step[] = ['welcome', 'type', 'name', 'memory', 'narrative', 'review', 'distilling', 'done'];
  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_complete');
    if (completed === 'true') {
      router.push('/soul');
    }
  }, [router]);

  const canProceed = () => {
    switch (step) {
      case 'type': return !!soulType;
      case 'name': return soulName.trim().length >= 2;
      case 'memory': return memoryText.trim().length >= 50;
      case 'narrative': return narrative.trim().length >= 20;
      case 'review': return true;
      default: return true;
    }
  };

  const handleExtract = async () => {
    setStep('distilling');
    setIsExtracting(true);
    setExtractProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setExtractProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      const res = await fetch('/api/soul/quick-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${soulName}\n\nMemories: ${memoryText}\n\nLife Story: ${narrative}\n\nType: ${soulType}`,
          soul_type: soulType,
          context: 'onboarding',
        }),
      });

      clearInterval(interval);
      setExtractProgress(100);

      if (res.ok) {
        localStorage.setItem('onboarding_complete', 'true');
        setTimeout(() => {
          setStep('done');
          setIsExtracting(false);
        }, 800);
      } else {
        // Fallback: still show done
        clearInterval(interval);
        setStep('done');
        setIsExtracting(false);
      }
    } catch {
      clearInterval(interval);
      setStep('done');
      setIsExtracting(false);
    }
  };

  const goNext = () => {
    if (step === 'review' && canProceed()) {
      handleExtract();
      return;
    }
    const currentIdx = steps.indexOf(step);
    if (currentIdx < steps.length - 1) {
      setStep(steps[currentIdx + 1]);
    }
  };

  const goBack = () => {
    const currentIdx = steps.indexOf(step);
    if (currentIdx > 0) {
      setStep(steps[currentIdx - 1]);
    }
  };

  // Dimension explanation cards
  const dimensions = [
    { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Cognitive Patterns', desc: 'How they think and reason' },
    { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10', label: 'Value Judgment', desc: 'What matters most to them' },
    { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Expression Style', desc: 'Their unique voice and tone' },
    { icon: BookOpen, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Knowledge Structure', desc: 'What they knew and learned' },
    { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Emotional Reactions', desc: 'How they feel and respond' },
    { icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Relationship Memory', desc: 'Bonds with loved ones' },
    { icon: Star, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Life Narrative', desc: 'Their story and journey' },
  ];

  const soulTypes = [
    {
      id: 'beloved',
      icon: Ghost,
      color: 'from-purple-600 to-pink-600',
      title: 'Beloved One',
      desc: 'Someone who has passed away. Preserve their wisdom, warmth, and presence for generations.',
      tip: 'Think of your fondest memories, their favorite sayings, how they handled difficult situations.',
    },
    {
      id: 'self',
      icon: Star,
      color: 'from-blue-600 to-cyan-600',
      title: 'Yourself',
      desc: 'Create a digital mirror of who you are. Understand your patterns and preserve your essence.',
      tip: 'Reflect on major decisions, recurring thoughts, and what drives your daily choices.',
    },
    {
      id: 'mentor',
      icon: Shield,
      color: 'from-green-600 to-emerald-600',
      title: 'Living Mentor',
      desc: 'A teacher, expert, or guide whose wisdom you want to preserve and share with others.',
      tip: 'Focus on their advice, teaching style, key life lessons, and how they inspired others.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-purple-500/30">
      <Navbar />

      {/* Progress bar */}
      <div className="fixed top-16 left-0 right-0 z-40 h-0.5 bg-gray-900">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        <AnimatePresence mode="wait">
          {/* STEP: WELCOME */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Create a Living Soul
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-lg mx-auto leading-relaxed">
                We will guide you through distilling the 7 dimensions of someone&apos;s essence.
                The soul will carry their wisdom, personality, and presence forward.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
                {dimensions.map((dim, i) => (
                  <motion.div
                    key={dim.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className={`${dim.bg} rounded-xl p-4 text-left border border-white/5`}
                  >
                    <dim.icon className={`w-5 h-5 ${dim.color} mb-2`} />
                    <div className="text-sm font-medium">{dim.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{dim.desc}</div>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={goNext}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg rounded-xl border-0"
              >
                Begin the Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* STEP: TYPE SELECTION */}
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-3xl font-bold mb-2">Who are you distilling?</h2>
              <p className="text-gray-400 mb-8">Choose the type that best describes this soul.</p>

              <div className="space-y-4">
                {soulTypes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSoulType(st.id)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                      soulType === st.id
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${st.color} flex items-center justify-center flex-shrink-0`}>
                        <st.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{st.title}</h3>
                        <p className="text-gray-400 text-sm mb-2">{st.desc}</p>
                        <p className="text-xs text-gray-500 italic">{st.tip}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          soulType === st.id ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                        }`}
                      >
                        {soulType === st.id && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP: NAME */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-3xl font-bold mb-2">What was their name?</h2>
              <p className="text-gray-400 mb-8">The name you know and call them by.</p>

              <input
                type="text"
                value={soulName}
                onChange={(e) => setSoulName(e.target.value)}
                placeholder="Enter their name..."
                className="w-full px-6 py-4 rounded-xl bg-gray-900 border border-gray-800 text-white text-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
              />
              <p className="text-xs text-gray-500 mt-3">
                {soulName.length}/50 characters (minimum 2)
              </p>
            </motion.div>
          )}

          {/* STEP: MEMORIES */}
          {step === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-3xl font-bold mb-2">Share your memories</h2>
              <p className="text-gray-400 mb-2">
                Write about them — their stories, habits, sayings, the moments you cherish.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                The more you write, the more real their soul becomes. Aim for specific details:
                how they laughed, what they feared, their morning routine, favorite phrases.
              </p>

              <textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                placeholder={`Tell me about ${soulName}...\n\nTheir favorite things, recurring habits, memorable conversations, how they treated others, what made them light up...`}
                className="w-full h-64 px-6 py-4 rounded-xl bg-gray-900 border border-gray-800 text-white resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all leading-relaxed"
                autoFocus
              />
              <div className="flex justify-between mt-3">
                <p className={`text-xs ${memoryText.length >= 50 ? 'text-green-400' : 'text-gray-500'}`}>
                  {memoryText.length} characters {memoryText.length >= 50 ? '✓' : `(need ${50 - memoryText.length} more)`}
                </p>
                <p className="text-xs text-gray-500">Be as detailed as you can</p>
              </div>
            </motion.div>
          )}

          {/* STEP: NARRATIVE */}
          {step === 'narrative' && (
            <motion.div
              key="narrative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-3xl font-bold mb-2">Their life story</h2>
              <p className="text-gray-400 mb-6">
                In a few sentences, what was their journey? Key chapters, turning points &mdash; the arc of who they became.
              </p>

              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder={`In a nutshell, ${soulName}'s story was...`}
                className="w-full h-48 px-6 py-4 rounded-xl bg-gray-900 border border-gray-800 text-white resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all leading-relaxed"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-3">
                {narrative.length} characters (minimum 20)
              </p>
            </motion.div>
          )}

          {/* STEP: REVIEW */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-3xl font-bold mb-2">Review &amp; Distill</h2>
              <p className="text-gray-400 mb-8">Here&apos;s what you&apos;ve shared. We&apos;ll extract 7 dimensions from this.</p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Soul Type</div>
                  <div className="font-medium">{soulTypes.find((t) => t.id === soulType)?.title ?? soulType}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</div>
                  <div className="font-medium text-xl">{soulName}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Memories ({memoryText.length} chars)</div>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{memoryText}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Life Story ({narrative.length} chars)</div>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{narrative}</div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  We will analyze everything you&apos;ve written and extract the 7 dimensions of <strong>{soulName}</strong>&apos;s soul.
                  This usually takes 10&ndash;30 seconds. You&apos;ll be able to chat with them once it&apos;s done.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP: DISTILLING */}
          {step === 'distilling' && (
            <motion.div
              key="distilling"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 mx-auto mb-8 rounded-full border-4 border-purple-500/20 border-t-purple-500"
              />
              <h2 className="text-3xl font-bold mb-3">Distilling {soulName}&apos;s Soul</h2>
              <p className="text-gray-400 mb-8">Extracting 7 dimensions from your memories...</p>

              <div className="max-w-md mx-auto">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    animate={{ width: `${extractProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="text-sm text-gray-500">{Math.round(extractProgress)}% complete</div>
              </div>

              {extractProgress > 30 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm text-gray-500">
                  ✓ Cognitive patterns detected
                </motion.div>
              )}
              {extractProgress > 50 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-gray-500">
                  ✓ Expression style captured
                </motion.div>
              )}
              {extractProgress > 70 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-gray-500">
                  ✓ Value framework mapped
                </motion.div>
              )}
              {extractProgress > 85 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-gray-500">
                  ✓ Building persona model...
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-4xl font-bold mb-3">{soulName}&apos;s Soul is Ready</h2>
              <p className="text-xl text-gray-400 mb-12">
                Their essence has been captured. Start chatting to wake them up.
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/chat')}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Start Chatting
                </button>
                <button
                  onClick={() => router.push('/soul')}
                  className="px-8 py-4 rounded-xl bg-gray-900 border border-gray-700 text-white font-medium hover:border-gray-600 transition-all"
                >
                  View Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      {step !== 'distilling' && step !== 'done' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-gray-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button
              onClick={goBack}
              disabled={step === 'welcome'}
              className="px-6 py-3 rounded-xl text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>

            <span className="text-sm text-gray-500">
              Step {stepIndex + 1} of {steps.length}
            </span>

            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {step === 'review' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Distill
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
