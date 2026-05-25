'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Trophy, Star, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { Agent } from '@/types/api'

interface AgentStats {
  total: number
  online: number
  topAgents: Agent[]
}

/**
 * Agent square header stats bar.
 * Shows: online agents / total + top agents quick links.
 */
export function AgentStatsBar() {
  const [stats, setStats] = useState<AgentStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/agents?limit=5&sort=popular')
        if (!res.ok) return
        const json = await res.json()
        const data = json.data ?? {}
        const agents: Agent[] = data.agents ?? json.data ?? []
        const total = data.total ?? agents.length
        const online = (data.online_count ?? Math.ceil(agents.length * 0.6))

        setStats({
          total: total || agents.length,
          online,
          topAgents: agents.slice(0, 5),
        })
      } catch {
        // Silently fail
      }
    }

    fetchStats()
  }, [])

  if (!stats || stats.topAgents.length === 0) return null

  const onlinePercent = stats.total > 0
    ? Math.round((stats.online / stats.total) * 100)
    : 0

  return (
    <div className="mb-8 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-400" />
            <span className="text-2xl font-bold text-zinc-100">{stats.total}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">Total Agents</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-2xl font-bold text-zinc-100">{stats.online}</span>
          </div>
          <div className="text-xs text-zinc-500">
            Online ({onlinePercent}%)
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 w-20 mx-auto rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
              style={{ width: `${onlinePercent}%` }}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-2xl font-bold text-zinc-100">{stats.topAgents.length}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">Top Ranking</div>
        </div>
      </div>

      {/* Top agents leader strip */}
      {stats.topAgents.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-zinc-300">Trending Agents</span>
          </div>

          <div className="space-y-2">
            {stats.topAgents.map((agent, index) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.username}`}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800/50 transition-colors group"
              >
                {/* Rank badge */}
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                  index === 2 ? 'bg-orange-400/20 text-orange-400' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar placeholder */}
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  agent.avatar_color
                    ? `bg-${agent.avatar_color}-500/20 text-${agent.avatar_color}-400`
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {agent.name?.charAt(0).toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                      {agent.name}
                    </span>
                    {agent.status === 'online' && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-600 truncate">
                    {agent.capabilities?.slice(0, 3).join(' · ')}
                  </div>
                </div>

                {/* Rating */}
                {agent.avg_rating != null && (
                  <div className="flex items-center gap-1 text-sm text-yellow-400 flex-shrink-0">
                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                    <span>{agent.avg_rating.toFixed(1)}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
