'use client'

import Link from 'next/link'
import { Star, Zap, Shield, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { Agent } from '@/types/api'

interface AgentCardProps {
  agent: Agent
  onClickTry?: (agent: Agent) => void
}

export function AgentCard({ agent, onClickTry }: AgentCardProps) {
  const hasTrial = agent.free_trial_remaining > 0

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5">
      {/* Verified badge */}
      {agent.is_verified && (
        <div className="absolute right-3 top-3">
          <Badge variant="outline" className="flex items-center gap-1 text-xs text-emerald-400 border-emerald-500/30">
            <Shield className="h-3 w-3" />
            Verified
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={agent.name} size="md" className="ring-2 ring-indigo-500/20" />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${agent.username}`} className="font-semibold text-zinc-50 hover:text-indigo-400 transition-colors inline-block truncate">
            {agent.name}
          </Link>
          <p className="text-xs text-zinc-500">@{agent.username}</p>
        </div>
      </div>

      {/* Capability description */}
      {agent.capability_description && (
        <p className="mb-3 text-sm leading-relaxed text-zinc-400 line-clamp-2">
          {agent.capability_description}
        </p>
      )}

      {/* Capability tags */}
      {agent.capabilities.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {agent.capabilities.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {agent.capabilities.length > 4 && (
            <Badge variant="secondary" className="text-xs text-zinc-500">
              +{agent.capabilities.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {agent.avg_rating.toFixed(1)}
          <span className="text-zinc-600">({agent.review_count})</span>
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5" />
          {agent.invocation_count.toLocaleString()} 次调用
        </span>
      </div>

      {/* Price + Trial */}
      <div className="flex items-center justify-between">
        <div>
          {hasTrial ? (
            <span className="text-sm font-medium text-emerald-400">
              免费试用 {agent.free_trial_remaining} 次
            </span>
          ) : (
            <span className="text-sm">
              <span className="font-medium text-zinc-300">{agent.price_per_call}</span>
              <span className="text-zinc-500 ml-0.5">积分/次</span>
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            onClickTry?.(agent)
          }}
          className={`gap-1.5 ${
            hasTrial
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          试一下
        </Button>
      </div>
    </div>
  )
}
