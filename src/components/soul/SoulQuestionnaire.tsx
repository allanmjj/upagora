'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain, Shield, Heart, BookOpen, Sparkles, Network, Zap,
  ChevronRight, ChevronLeft, CheckCircle, Loader2, RotateCcw,
  Eye, Download, Share2, BarChart3, ArrowRight, AlertCircle
} from 'lucide-react'

// ====== Types ======

interface Question {
  id: string
  dimension: string
  dimensionKey: string
  dimensionIcon: typeof Brain
  question: string
  helpText?: string
  options: {
    value: string
    label: string
    description: string
    scores: Record<string, number>
  }[]
}

interface DimensionScore {
  key: string
  label: string
  icon: typeof Brain
  score: number
  maxScore: number
  traits: string[]
  color: string
}

interface QuestionnaireResult {
  id: string
  dimensionScores: DimensionScore[]
  overallScore: number
  dominantTraits: string[]
  soulType: string
  soulTypeDescription: string
  completedAt: string
}

// ====== Constants ======

const DIMENSIONS = [
  { key: 'cognitive', label: 'Cognitive Patterns', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'values', label: 'Value Judgment', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'expression', label: 'Expression Style', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'knowledge', label: 'Knowledge Structure', icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'emotional', label: 'Emotional Response', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'relationship', label: 'Relationship Memory', icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'narrative', label: 'Life Narrative', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
]

const QUESTIONS: Question[] = [
  // Cognitive Patterns (2 questions)
  {
    id: 'cog-1',
    dimension: 'Cognitive Patterns',
    dimensionKey: 'cognitive',
    dimensionIcon: Brain,
    question: 'When facing a complex problem, what is your default approach?',
    helpText: 'This reveals how you process information and make decisions.',
    options: [
      { value: 'analytical', label: 'Systematic Analysis', description: 'Break it down into parts, analyze each component logically', scores: { cognitive: 3, knowledge: 1 } },
      { value: 'intuitive', label: 'Gut Feeling', description: 'Trust your instincts, rely on pattern recognition', scores: { cognitive: 2, emotional: 2 } },
      { value: 'creative', label: 'Lateral Thinking', description: 'Look at it from unexpected angles, connect disparate ideas', scores: { cognitive: 3, expression: 1 } },
      { value: 'practical', label: 'Trial and Error', description: 'Just start doing, iterate based on results', scores: { cognitive: 1, narrative: 2 } },
    ],
  },
  {
    id: 'cog-2',
    dimension: 'Cognitive Patterns',
    dimensionKey: 'cognitive',
    dimensionIcon: Brain,
    question: 'How do you prefer to learn something new?',
    options: [
      { value: 'reading', label: 'Deep Reading', description: 'Books, papers, detailed documentation — immerse in theory', scores: { cognitive: 2, knowledge: 2 } },
      { value: 'doing', label: 'Hands-On', description: 'Jump in, build things, learn by making mistakes', scores: { cognitive: 1, narrative: 2 } },
      { value: 'discussing', label: 'Dialogue', description: 'Talk it through with others, debate and refine understanding', scores: { cognitive: 1, relationship: 3 } },
      { value: 'observing', label: 'Observation', description: 'Watch experts, absorb patterns, mirror what works', scores: { cognitive: 2, emotional: 1 } },
    ],
  },

  // Value Judgment (2 questions)
  {
    id: 'val-1',
    dimension: 'Value Judgment',
    dimensionKey: 'values',
    dimensionIcon: Shield,
    question: 'In a conflict between honesty and kindness, what guides you?',
    helpText: 'This reveals your ethical framework and priority system.',
    options: [
      { value: 'honesty', label: 'Radical Honesty', description: 'Truth first, even if it hurts — people deserve clarity', scores: { values: 3, expression: 1 } },
      { value: 'kindness', label: 'Compassionate Care', description: 'Protect feelings first, deliver truth gently when needed', scores: { values: 2, emotional: 2 } },
      { value: 'contextual', label: 'Situational Balance', description: 'Depends entirely on the context and relationship', scores: { values: 1, relationship: 2 } },
      { value: 'pragmatic', label: 'Outcome-Focused', description: 'Choose whichever leads to the best long-term result', scores: { values: 2, narrative: 1 } },
    ],
  },
  {
    id: 'val-2',
    dimension: 'Value Judgment',
    dimensionKey: 'values',
    dimensionIcon: Shield,
    question: 'What matters most in a life well-lived?',
    options: [
      { value: 'growth', label: 'Continuous Growth', description: 'Always evolving, learning, becoming a better version', scores: { values: 2, cognitive: 1 } },
      { value: 'connection', label: 'Deep Connections', description: 'Meaningful relationships and being truly known by others', scores: { values: 2, relationship: 2 } },
      { value: 'impact', label: 'Making an Impact', description: 'Leaving the world better than you found it', scores: { values: 3, narrative: 1 } },
      { value: 'freedom', label: 'Personal Freedom', description: 'Autonomy, self-determination, living on your own terms', scores: { values: 2, expression: 1 } },
    ],
  },

  // Expression Style (2 questions)
  {
    id: 'expr-1',
    dimension: 'Expression Style',
    dimensionKey: 'expression',
    dimensionIcon: Heart,
    question: 'How would others describe your communication style?',
    options: [
      { value: 'direct', label: 'Direct & Concise', description: 'Say what you mean, no sugar-coating, efficient', scores: { expression: 3, values: 1 } },
      { value: 'warm', label: 'Warm & Storytelling', description: 'Use anecdotes, metaphors, make people feel something', scores: { expression: 2, narrative: 2 } },
      { value: 'analytical', label: 'Structured & Logical', description: 'Organized points, data-backed, persuasive arguments', scores: { expression: 2, cognitive: 1 } },
      { value: 'playful', label: 'Playful & Witty', description: 'Humor, wordplay, make serious things approachable', scores: { expression: 3, emotional: 1 } },
    ],
  },
  {
    id: 'expr-2',
    dimension: 'Expression Style',
    dimensionKey: 'expression',
    dimensionIcon: Heart,
    question: 'When you write or create something, what\'s most important?',
    options: [
      { value: 'clarity', label: 'Clarity', description: 'Every word serves a purpose, zero ambiguity', scores: { expression: 2, cognitive: 1 } },
      { value: 'emotion', label: 'Emotional Resonance', description: 'Make the reader feel something deep and genuine', scores: { expression: 2, emotional: 2 } },
      { value: 'beauty', label: 'Aesthetic Beauty', description: 'The form itself — rhythm, structure, visual elegance', scores: { expression: 3, knowledge: 1 } },
      { value: 'insight', label: 'New Perspective', description: 'Shift how people see something, provoke thinking', scores: { expression: 1, cognitive: 2 } },
    ],
  },

  // Knowledge Structure (1 question)
  {
    id: 'know-1',
    dimension: 'Knowledge Structure',
    dimensionKey: 'knowledge',
    dimensionIcon: BookOpen,
    question: 'How would you describe the shape of your knowledge?',
    helpText: 'This reveals whether you\'re a specialist, generalist, or something else.',
    options: [
      { value: 'deep', label: 'Deep Specialist', description: 'Know everything about a few topics, less about others', scores: { knowledge: 3, cognitive: 1 } },
      { value: 'broad', label: 'Curious Generalist', description: 'A little about everything, always exploring new domains', scores: { knowledge: 2, narrative: 1 } },
      { value: 'connected', label: 'Network Thinker', description: 'See connections across fields, interdisciplinary insights', scores: { knowledge: 3, expression: 1 } },
      { value: 'applied', label: 'Practitioner', description: 'Knowledge through doing, hands-on expertise over theory', scores: { knowledge: 1, narrative: 2 } },
    ],
  },

  // Emotional Response (2 questions)
  {
    id: 'emo-1',
    dimension: 'Emotional Response',
    dimensionKey: 'emotional',
    dimensionIcon: Sparkles,
    question: 'When something unexpected goes wrong, your first reaction is?',
    options: [
      { value: 'calm', label: 'Calm & Rational', description: 'Take a breath, assess the situation, plan next steps', scores: { emotional: 2, cognitive: 2 } },
      { value: 'frustrated', label: 'Visibly Frustrated', description: 'Feel it intensely, but recover quickly and refocus', scores: { emotional: 3, expression: 1 } },
      { value: 'supportive', label: 'Check on Others', description: 'Worry about how it affects people around you first', scores: { emotional: 1, relationship: 3 } },
      { value: 'adaptive', label: 'Roll With It', description: 'Pivot immediately — change is just another variable', scores: { emotional: 1, narrative: 2 } },
    ],
  },
  {
    id: 'emo-2',
    dimension: 'Emotional Response',
    dimensionKey: 'emotional',
    dimensionIcon: Sparkles,
    question: 'What kind of content moves you the most?',
    options: [
      { value: 'triumph', label: 'Underdog Stories', description: 'People overcoming impossible odds through sheer will', scores: { emotional: 2, values: 2 } },
      { value: 'vulnerability', label: 'Raw Vulnerability', description: 'Someone being honest about their struggles and fears', scores: { emotional: 3, relationship: 1 } },
      { value: 'beauty', label: 'Quiet Beauty', description: 'A perfectly crafted sentence, a sunset, a small kindness', scores: { emotional: 2, expression: 1 } },
      { value: 'justice', label: 'Justice Served', description: 'When the truth comes out and wrongs are righted', scores: { emotional: 1, values: 3 } },
    ],
  },

  // Relationship Memory (2 questions)
  {
    id: 'rel-1',
    dimension: 'Relationship Memory',
    dimensionKey: 'relationship',
    dimensionIcon: Network,
    question: 'How do you maintain meaningful relationships?',
    options: [
      { value: 'consistent', label: 'Regular Check-ins', description: 'Scheduled calls, messages, always staying in touch', scores: { relationship: 3, values: 1 } },
      { value: 'deep', label: 'Quality Over Frequency', description: 'Few but very deep conversations when you do connect', scores: { relationship: 2, emotional: 2 } },
      { value: 'shared', label: 'Shared Activities', description: 'Bond through doing things together — projects, hobbies, adventures', scores: { relationship: 1, narrative: 3 } },
      { value: 'supportive', label: 'There When Needed', description: 'Low日常 contact, but always show up in moments that matter', scores: { relationship: 2, values: 2 } },
    ],
  },

  // Life Narrative (2 questions)
  {
    id: 'nar-1',
    dimension: 'Life Narrative',
    dimensionKey: 'narrative',
    dimensionIcon: Zap,
    question: 'How do you see your life story so far?',
    helpText: 'This reveals your self-concept and identity narrative.',
    options: [
      { value: 'journey', label: 'Hero\'s Journey', description: 'Trials and growth, each challenge made me who I am', scores: { narrative: 3, values: 1 } },
      { value: 'evolution', label: 'Continuous Evolution', description: 'No fixed narrative, just constant change and adaptation', scores: { narrative: 2, cognitive: 2 } },
      { value: 'collection', label: 'Collection of Moments', description: 'Life isn\'t a story — it\'s a series of beautiful/painful snapshots', scores: { narrative: 2, emotional: 2 } },
      { value: 'blank', label: 'Unwritten Book', description: 'The best chapters are still ahead, I\'m just getting started', scores: { narrative: 2, expression: 1 } },
    ],
  },
  {
    id: 'nar-2',
    dimension: 'Life Narrative',
    dimensionKey: 'narrative',
    dimensionIcon: Zap,
    question: 'If your soul had a color palette, what would it be?',
    options: [
      { value: 'warm', label: 'Warm Tones', description: 'Amber, terracotta, soft gold — comfort, nostalgia, home', scores: { narrative: 2, emotional: 2 } },
      { value: 'cool', label: 'Cool Tones', description: 'Deep blue, silver, teal — calm, depth, contemplation', scores: { narrative: 2, cognitive: 1 } },
      { value: 'vibrant', label: 'Vibrant Mix', description: 'Every color — chaotic energy, creativity, passion', scores: { narrative: 1, expression: 3 } },
      { value: 'earth', label: 'Earth Tones', description: 'Forest green, brown, clay — grounded, natural, steady', scores: { narrative: 2, values: 2 } },
    ],
  },
]

const SOUL_TYPES: Record<string, { type: string; description: string; color: string }> = {
  analytical: { type: 'The Architect', description: 'You think in systems and structures. Your soul builds frameworks others can live in.', color: 'from-blue-500 to-cyan-500' },
  empathic: { type: 'The Healer', description: 'You feel deeply and connect authentically. Your soul makes others feel seen.', color: 'from-pink-500 to-rose-500' },
  creative: { type: 'The Alchemist', description: 'You transform raw material into gold. Your soul sees beauty in the ordinary.', color: 'from-purple-500 to-violet-500' },
  pragmatic: { type: 'The Navigator', description: 'You chart paths through chaos. Your soul finds the way when others are lost.', color: 'from-emerald-500 to-green-500' },
  philosophical: { type: 'The Sage', description: 'You seek truth beneath the surface. Your soul asks the questions worth answering.', color: 'from-amber-500 to-yellow-500' },
  social: { type: 'The Weaver', description: 'You create invisible threads between people. Your soul builds communities.', color: 'from-cyan-500 to-teal-500' },
  adventurous: { type: 'The Explorer', description: 'You chase horizons and embrace uncertainty. Your soul turns fear into fuel.', color: 'from-orange-500 to-red-500' },
}

// ====== Main Component ======

export default function SoulQuestionnaire() {
  const [step, setStep] = useState(0) // 0 = intro, 1..N = questions, N+1 = results
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<QuestionnaireResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const totalQuestions = QUESTIONS.length
  const isIntro = step === 0
  const isComplete = step === totalQuestions + 1
  const currentQuestion = QUESTIONS[step - 1]

  const progress = Math.min(100, (step / (totalQuestions + 1)) * 100)

  const handleAnswer = (questionId: string, optionValue: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionValue }))
  }

  const handleNext = () => {
    if (!currentQuestion || !answers[currentQuestion.id]) return

    if (step === totalQuestions) {
      // Calculate results
      const calcResult = calculateResults()
      setResult(calcResult)
      setStep(step + 1)
    } else {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleRestart = () => {
    setAnswers({})
    setResult(null)
    setStep(0)
    setSaveError(null)
  }

  const handleSaveToSoul = async () => {
    if (!result || saving) return
    setSaving(true)
    setSaveError(null)

    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/soul/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          answers,
          result: {
            dimensionScores: result.dimensionScores.map(d => ({
              key: d.key,
              label: d.label,
              score: d.score,
              maxScore: d.maxScore,
              traits: d.traits,
            })),
            overallScore: result.overallScore,
            dominantTraits: result.dominantTraits,
            soulType: result.soulType,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        // Saved successfully
        setSaveError(null)
      } else {
        setSaveError(data.error || data.message || 'Save failed')
      }
    } catch {
      setSaveError('Network error, please try again')
    } finally {
      setSaving(false)
    }
  }

  const calculateResults = (): QuestionnaireResult => {
    // Calculate dimension scores
    const dimensionTotals: Record<string, number> = {}
    const dimensionTraits: Record<string, string[]> = {}

    for (const dim of DIMENSIONS) {
      dimensionTotals[dim.key] = 0
      dimensionTraits[dim.key] = []
    }

    for (const q of QUESTIONS) {
      const selectedAnswer = answers[q.id]
      if (!selectedAnswer) continue

      const option = q.options.find((o) => o.value === selectedAnswer)
      if (!option) continue

      for (const [dimKey, score] of Object.entries(option.scores)) {
        dimensionTotals[dimKey] = (dimensionTotals[dimKey] || 0) + score
        if (score >= 2) {
          const trait = option.label
          if (!dimensionTraits[dimKey]?.includes(trait)) {
            dimensionTraits[dimKey] = [...(dimensionTraits[dimKey] || []), trait]
          }
        }
      }
    }

    // Max possible per dimension (3 questions * max 3 points = 9)
    const maxPerDim = 9

    const dimensionScores: DimensionScore[] = DIMENSIONS.map((dim) => ({
      key: dim.key,
      label: dim.label,
      icon: dim.icon,
      score: dimensionTotals[dim.key] || 0,
      maxScore: maxPerDim,
      traits: dimensionTraits[dim.key] || [],
      color: dim.color,
    }))

    const totalScore = dimensionScores.reduce((sum, d) => sum + d.score, 0)
    const maxTotal = dimensionScores.length * maxPerDim
    const overallScore = Math.round((totalScore / maxTotal) * 100)

    // Determine dominant type
    const sorted = [...dimensionScores].sort((a, b) => b.score - a.score)
    const topDim = sorted[0]?.key || 'analytical'
    const soulTypeInfo = SOUL_TYPES[topDim] || SOUL_TYPES.analytical

    const dominantTraits = sorted
      .filter((d) => d.traits.length > 0)
      .flatMap((d) => d.traits)
      .slice(0, 6)

    return {
      id: `qr-${Date.now()}`,
      dimensionScores,
      overallScore,
      dominantTraits,
      soulType: soulTypeInfo.type,
      soulTypeDescription: soulTypeInfo.description,
      completedAt: new Date().toISOString(),
    }
  }

  // ====== Render ======

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-6 w-6 text-purple-400" />
          <h3 className="text-xl font-bold text-zinc-50">Soul Questionnaire</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Answer 14 questions across 7 dimensions to map your soul profile
        </p>
      </div>

      {/* Progress bar */}
      {!isIntro && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{isComplete ? 'Complete!' : `Question ${step} of ${totalQuestions}`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ===== Intro Screen ===== */}
      {isIntro && (
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-8 text-center">
          <div className="text-5xl mb-4">🔮</div>
          <h2 className="text-2xl font-bold text-zinc-50 mb-2">Map Your Soul</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8">
            This questionnaire profiles your personality across 7 dimensions of a digital soul.
            There are no wrong answers — only authentic ones.
          </p>

          {/* 7 Dimensions Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {DIMENSIONS.map((dim) => (
              <div key={dim.key} className={`rounded-lg border border-zinc-800 ${dim.bg} p-3`}>
                <dim.icon className={`h-5 w-5 ${dim.color} mx-auto mb-1`} />
                <div className="text-xs font-medium text-zinc-300">{dim.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setStep(1)}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8"
            >
              Begin Questionnaire
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Takes ~3-5 minutes · 14 questions · Results can be saved to your soul profile
          </p>
        </div>
      )}

      {/* ===== Question Screen ===== */}
      {!isIntro && !isComplete && currentQuestion && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          {/* Dimension badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`rounded-lg p-1.5 ${DIMENSIONS.find(d => d.key === currentQuestion.dimensionKey)?.bg}`}>
              <currentQuestion.dimensionIcon className={`h-4 w-4 ${DIMENSIONS.find(d => d.key === currentQuestion.dimensionKey)?.color}`} />
            </div>
            <Badge variant="outline" className="text-xs">
              {currentQuestion.dimension}
            </Badge>
            <span className="text-xs text-zinc-600 ml-auto">
              {step}/{totalQuestions}
            </span>
          </div>

          {/* Question */}
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            {currentQuestion.question}
          </h3>
          {currentQuestion.helpText && (
            <p className="text-xs text-zinc-500 mb-6">{currentQuestion.helpText}</p>
          )}

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(currentQuestion.id, option.value)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                    }`}>
                      {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{option.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step <= 1}
              className="gap-2 text-zinc-400 hover:text-zinc-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-1">
              {QUESTIONS.map((q, i) => {
                const isAnswered = answers[q.id]
                const isCurrent = i + 1 === step
                return (
                  <div
                    key={q.id}
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCurrent ? 'bg-indigo-400' : isAnswered ? 'bg-indigo-500/50' : 'bg-zinc-700'
                    }`}
                  />
                )
              })}
            </div>

            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-50"
            >
              {step === totalQuestions ? 'See Results' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== Results Screen ===== */}
      {isComplete && result && (
        <div className="space-y-6">
          {/* Soul Type Card */}
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-center">
            <div className="text-5xl mb-4">✨</div>
            <Badge variant="primary" className="mb-3">
              {result.soulType}
            </Badge>
            <h2 className="text-2xl font-bold text-zinc-50 mb-2">Your Soul Type</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {result.soulTypeDescription}
            </p>

            {/* Overall Score */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-4">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {result.overallScore}%
              </div>
              <div className="text-left">
                <div className="text-sm text-zinc-300">Soul Completeness</div>
                <div className="text-xs text-zinc-500">Based on {totalQuestions} answers across 7 dimensions</div>
              </div>
            </div>

            {/* Dominant Traits */}
            {result.dominantTraits.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {result.dominantTraits.map((trait) => (
                  <Badge key={trait} variant="outline" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Dimension Breakdown */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              Dimension Breakdown
            </h3>

            <div className="space-y-4">
              {result.dimensionScores.map((dim) => {
                const percent = Math.round((dim.score / dim.maxScore) * 100)
                const Icon = dim.icon
                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${dim.color}`} />
                        <span className="text-sm text-zinc-300">{dim.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {dim.traits.length > 0 && (
                          <div className="flex gap-1">
                            {dim.traits.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className={`text-sm font-medium ${dim.color}`}>{percent}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          percent >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                          percent >= 40 ? 'bg-gradient-to-r from-indigo-500 to-purple-400' :
                          'bg-gradient-to-r from-zinc-600 to-zinc-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dimension Radar Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {result.dimensionScores.map((dim) => {
              const Icon = dim.icon
              const percent = Math.round((dim.score / dim.maxScore) * 100)
              return (
                <div key={dim.key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                  <Icon className={`h-5 w-5 ${dim.color} mx-auto mb-1`} />
                  <div className={`text-lg font-bold ${dim.color}`}>{percent}%</div>
                  <div className="text-[10px] text-zinc-500">{dim.label}</div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSaveToSoul}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Save to Soul Profile
            </Button>

            <Button
              onClick={handleRestart}
              variant="outline"
              className="gap-2 text-zinc-400 hover:text-zinc-200 border-zinc-700"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{saveError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
