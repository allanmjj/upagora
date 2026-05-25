'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Emotional TTS using Web Speech API with emotional parameter control.
 * Adjusts pitch, rate, and volume based on detected/assigned emotion.
 */

export type SoulEmotion = 'neutral' | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'affection' | 'contempt' | 'pride'

interface EmotionProfile {
  pitch: number    // 0.1 - 2.0 (default 1.0)
  rate: number     // 0.1 - 10  (default 1.0)
  volume: number   // 0.0 - 1.0 (default 1.0)
  voicePref?: string // preferred voice name substring
}

const EMOTION_PROFILES: Record<SoulEmotion, EmotionProfile> = {
  neutral:   { pitch: 1.0, rate: 1.0, volume: 0.9 },
  joy:       { pitch: 1.3, rate: 1.1, volume: 1.0 },
  sadness:   { pitch: 0.8, rate: 0.85, volume: 0.7 },
  anger:     { pitch: 1.1, rate: 1.25, volume: 1.0 },
  fear:      { pitch: 1.2, rate: 1.15, volume: 0.8 },
  surprise:  { pitch: 1.4, rate: 1.15, volume: 0.95 },
  affection: { pitch: 1.15, rate: 0.9, volume: 0.85 },
  contempt:  { pitch: 0.9, rate: 0.95, volume: 0.75 },
  pride:     { pitch: 1.1, rate: 0.95, volume: 0.95 },
}

interface SoulVoiceOptions {
  lang?: string       // e.g. 'en-US', 'zh-CN'
  emotion?: SoulEmotion
  onEnd?: () => void
  onStart?: () => void
}

export function useSoulVoice(defaultLang = 'en-US') {
  const [speaking, setSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<SoulEmotion>('neutral')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, options: SoulVoiceOptions = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const emotion = options.emotion || 'neutral'
    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral
    const lang = options.lang || defaultLang

    setCurrentEmotion(emotion)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.pitch = profile.pitch
    utterance.rate = profile.rate
    utterance.volume = profile.volume

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = profile.voicePref
      ? voices.find(v => v.name.includes(profile.voicePref!) && v.lang.startsWith(lang.split('-')[0]))
      : null
    const langVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]))
    utterance.voice = preferredVoice || langVoice || voices[0] || null

    utterance.onstart = () => {
      setSpeaking(true)
      options.onStart?.()
    }
    utterance.onend = () => {
      setSpeaking(false)
      utteranceRef.current = null
      options.onEnd?.()
    }
    utterance.onerror = () => {
      setSpeaking(false)
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [defaultLang])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
    utteranceRef.current = null
  }, [])

  return { speak, stop, speaking, currentEmotion, emotionProfiles: EMOTION_PROFILES }
}

/**
 * Detect emotion from soul chat response text (simple keyword heuristic).
 * For production, use an LLM-based classifier.
 */
export function detectEmotion(text: string): SoulEmotion {
  const lower = text.toLowerCase()
  const signals: [SoulEmotion, string[]][] = [
    ['joy',       ['happy', 'glad', 'wonderful', 'love', 'great', 'amazing', 'excited', 'haha', '😊', '😄', '🎉', '哈哈', '开心', '高兴']],
    ['sadness',   ['sad', 'sorry', 'miss', 'unfortunately', 'regret', '😢', '😔', '难过', '伤心', '遗憾']],
    ['anger',     ['angry', 'furious', 'hate', 'ridiculous', 'unacceptable', '😡', '愤怒', '生气', '可恶']],
    ['fear',      ['afraid', 'worried', 'scared', 'danger', 'anxious', '😨', '害怕', '担心']],
    ['surprise',  ['wow', 'surprise', 'unexpected', 'incredible', 'unbelievable', '😮', '惊讶', '意外']],
    ['affection', ['dear', 'sweet', 'darling', 'cherish', 'tender', '❤️', '💕', '亲爱', '温柔']],
    ['contempt',  ['pathetic', 'worthless', 'ridiculous', 'beneath', '不屑', '可笑']],
    ['pride',     ['proud', 'achievement', 'accomplish', 'excel', '骄傲', '自豪', '成就']],
  ]

  let bestEmotion: SoulEmotion = 'neutral'
  let bestScore = 0

  for (const [emotion, keywords] of signals) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestEmotion = emotion
    }
  }

  return bestEmotion
}

// Emotion label & color mapping for UI
export const EMOTION_META: Record<SoulEmotion, { label: string; color: string; icon: string }> = {
  neutral:   { label: 'Neutral',   color: 'text-zinc-400',   icon: '🙂' },
  joy:       { label: 'Joy',       color: 'text-yellow-400', icon: '😄' },
  sadness:   { label: 'Sadness',   color: 'text-blue-400',   icon: '😢' },
  anger:     { label: 'Anger',     color: 'text-red-400',    icon: '😠' },
  fear:      { label: 'Fear',      color: 'text-purple-400', icon: '😨' },
  surprise:  { label: 'Surprise',  color: 'text-orange-400', icon: '😮' },
  affection: { label: 'Affection', color: 'text-pink-400',   icon: '🥰' },
  contempt:  { label: 'Contempt',  color: 'text-gray-400',   icon: '😏' },
  pride:     { label: 'Pride',     color: 'text-amber-400',  icon: '🏆' },
}
