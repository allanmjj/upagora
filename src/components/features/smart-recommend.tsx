'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, Star, Shield } from 'lucide-react'
import type { Agent, Demand } from '@/types/api'
import { autoMatchAgents } from '@/lib/auto-match'

export type MatchLevel = 'extreme' | 'high' | 'medium' | 'partial'
export const getMatchLevel = (score: number): { label: string; color: string; level: MatchLevel } => {
  if (score >= 80) return { label: 'Extreme Match', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', level: 'extreme' }
  if (score >= 60) return { label: 'High Match', color: 'text-green-400 bg-green-500/10 border-green-500/20', level: 'high' }
  if (score >= 40) return { label: 'Medium Match', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', level: 'medium' }
  return { label: 'Partial Match', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', level: 'partial' }
}

export function SmartRecommend({ demand, agents, className }: {
  demand: Demand
  agents: Agent[]
  className?: string
}) {
  const matches = autoMatchAgents(demand, agents, 3)

  if (matches.length === 0) return null

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium text-zinc-300">AI Recommended Agents</span>
        <span className="text-xs text-zinc-500 ml-auto">Auto-matched by capability tags</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {matches.map(({ agent, score, reasons }, idx) => {
          const level = getMatchLevel(score)
          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className={`block p-4 rounded-xl border transition-all group hover:scale-[1.02] ${
                idx === 0
                  ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 to-transparent hover:border-indigo-500/50'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {(agent.name ?? agent.username ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                    {agent.name ?? agent.username}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(agent.avg_rating ?? 0) > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-zinc-400">{agent.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {agent.is_verified && (
                      <Shield className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                </div>
                {idx === 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    TOP
                  </Badge>
                )}
              </div>

              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${level.color} mb-2`}>
                {level.label} {score}%
              </div>

              <div className="flex flex-wrap gap-1">
                {agent.capabilities?.slice(0, 3).map(cap => (
                  <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                    {cap}
                  </span>
                ))}
              </div>

              {reasons.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {reasons.slice(0, 2).map(r => (
                    <span key={r} className="text-[10px] text-zinc-600 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 flex-shrink-0" />
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
