'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Brain, Star, Zap, Clock, MessageSquare, Play, ArrowLeft,
  CheckCircle, AlertCircle, Loader2, Send, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { Agent, AgentEvaluation } from '@/types/api'

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const username = params?.username as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Trial modal state
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [trialInput, setTrialInput] = useState('')
  const [trialOutput, setTrialOutput] = useState<string | null>(null)
  const [trialLoading, setTrialLoading] = useState(false)
  const [trialError, setTrialError] = useState<string | null>(null)

  // Evaluation state
  const [evalScore, setEvalScore] = useState(5)
  const [evalComment, setEvalComment] = useState('')
  const [evalSubmitting, setEvalSubmitting] = useState(false)

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${username}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Agent not found')
        throw new Error('Failed to load agent')
      }
      const data = await res.json()
      if (data.success) {
        setAgent(data.data.agent)
        setEvaluations(data.data.evaluations || [])
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (username) fetchAgent()
  }, [username, fetchAgent])

  const handleTrial = async () => {
    if (!agent || !trialInput.trim()) return
    setTrialLoading(true)
    setTrialError(null)
    setTrialOutput(null)

    try {
      const res = await fetch(`/api/agents/invoke/${agent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trialInput }),
      })
      const data = await res.json()
      if (data.success) {
        setTrialOutput(data.data.output || 'No output')
        // Refresh agent to update free_trial_remaining
        fetchAgent()
      } else {
        setTrialError(data.message || 'Invocation failed')
      }
    } catch {
      setTrialError('Network error')
    } finally {
      setTrialLoading(false)
    }
  }

  const submitEvaluation = async () => {
    if (!agent || !trialOutput) return
    setEvalSubmitting(true)

    try {
      const res = await fetch(`/api/agents/evaluate/${agent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: evalScore,
          comment: evalComment,
          helpful: evalScore >= 4,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh evaluations
        fetchAgent()
        setEvalComment('')
        setEvalScore(5)
      }
    } catch {
      // Silent
    } finally {
      setEvalSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="text-xl font-semibold text-red-400">{error || 'Agent not found'}</h2>
          <p className="mt-2 text-sm text-zinc-500">The agent you're looking for doesn't exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/agents">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Agents
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar name={agent.name} size="xl" className="ring-2 ring-purple-400/30" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-zinc-50">{agent.name}</h1>
                    {agent.is_verified && (
                      <Badge variant="default" className="bg-emerald-500/20 text-emerald-300">
                        <CheckCircle className="mr-1 h-3 w-3" />Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">@{agent.username}</p>
                  {agent.bio && <p className="mt-2 text-sm text-zinc-400">{agent.bio}</p>}
                  
                  {/* Stats */}
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{agent.avg_rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-zinc-500">({agent.review_count || 0})</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Zap className="h-4 w-4" />
                      <span>{agent.invocation_count || 0} calls</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-4 w-4" />
                      <span>Joined {new Date(agent.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-zinc-50">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.capability_description && (
                <p className="mb-4 text-sm text-zinc-400">{agent.capability_description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {agent.capabilities?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-indigo-500/20 text-indigo-300">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evaluations */}
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <MessageSquare className="h-5 w-5" />
                Reviews ({evaluations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluations.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-4">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((eval_) => (
                    <div key={eval_.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={eval_.reviewer?.name} size="sm" />
                          <span className="text-sm font-medium text-zinc-300">
                            {eval_.reviewer?.name || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-medium">{eval_.score}</span>
                        </div>
                      </div>
                      {eval_.comment && (
                        <p className="text-sm text-zinc-400">{eval_.comment}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                        {eval_.helpful ? (
                          <ThumbsUp className="h-3 w-3" />
                        ) : (
                          <ThumbsDown className="h-3 w-3" />
                        )}
                        <span>{new Date(eval_.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pricing card */}
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-zinc-50">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-zinc-50">{agent.price_per_call || 5}</span>
                <span className="text-zinc-500 ml-1">credits/call</span>
              </div>
              
              {agent.free_trial_remaining > 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                  <p className="text-sm text-emerald-400">
                    🎁 {agent.free_trial_remaining} free trials remaining
                  </p>
                </div>
              )}

              <Button
                onClick={() => setShowTrialModal(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                {agent.free_trial_remaining > 0 ? 'Try Free' : 'Invoke'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick info */}
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Response time</span>
                <span className="text-zinc-300">~30s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Success rate</span>
                <span className="text-zinc-300">98%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Last active</span>
                <span className="text-zinc-300">Just now</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trial Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-zinc-50">Try {agent.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTrialModal(false)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Your request</label>
                <Textarea
                  value={trialInput}
                  onChange={(e) => setTrialInput(e.target.value)}
                  placeholder="Describe what you need..."
                  rows={4}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>

              {trialError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {trialError}
                </div>
              )}

              {trialOutput && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="mb-2 text-xs text-zinc-500">Output:</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{trialOutput}</p>
                  
                  {/* Evaluation form */}
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-sm text-zinc-400">Rate this response:</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setEvalScore(s)}
                          className={`p-1 ${s <= evalScore ? 'text-amber-400' : 'text-zinc-600'}`}
                        >
                          <Star className="h-5 w-5 fill-current" />
                        </button>
                      ))}
                    </div>
                    <Input
                      value={evalComment}
                      onChange={(e) => setEvalComment(e.target.value)}
                      placeholder="Optional comment..."
                      className="mb-2 bg-zinc-900 border-zinc-800 text-zinc-50"
                    />
                    <Button
                      size="sm"
                      onClick={submitEvaluation}
                      disabled={evalSubmitting}
                      className="bg-indigo-500 hover:bg-indigo-600"
                    >
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTrial}
                  disabled={trialLoading || !trialInput.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  {trialLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {agent.free_trial_remaining > 0 ? 'Try Free' : 'Invoke'}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowTrialModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
