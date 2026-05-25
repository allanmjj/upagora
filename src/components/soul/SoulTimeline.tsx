'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Clock, GitCommit, GitBranch, GitMerge, AlertCircle, 
  ChevronDown, ChevronRight, Star
} from 'lucide-react'

interface Snapshot {
  id: string
  version: number
  version_label: string
  created_at: string
  guardian_signature: string | null
  memory_count: number
  skill_count: number
  dimension_coverage: number
  is_starred?: boolean
  changes?: string[]
}

interface SoulTimelineProps {
  snapshots: Snapshot[]
  isLoading: boolean
  onStar?: (id: string) => void
  onView?: (snapshot: Snapshot) => void
}

export default function SoulTimeline({ 
  snapshots, 
  isLoading, 
  onStar, 
  onView 
}: SoulTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500 animate-pulse">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Loading soul evolution timeline...</p>
        </div>
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12">
        <GitCommit className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          Soul Timeline
        </h3>
        <p className="text-zinc-500 mb-6 max-w-md mx-auto">
          Soul snapshots record your digital soul's evolution. Each version captures the soul's state at a point in time, signed by guardians.
        </p>
        <Badge variant="outline" className="text-xs">
          Create your first snapshot to begin evolution
        </Badge>
      </div>
    )
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="space-y-0">
      {/* Timeline header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">Soul Evolution Timeline</h3>
          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span>{snapshots.length} versions</span>
            {snapshots.filter(s => s.is_starred).length > 0 && (
              <>
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="text-amber-400">{snapshots.filter(s => s.is_starred).length} starred</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="primary">
          Latest: v{sortedSnapshots[0]?.version || 0}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {sortedSnapshots.map((snapshot, index) => {
          const isExpanded = expanded === snapshot.id
          const isLatest = index === 0
          const date = new Date(snapshot.created_at)
          const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          return (
            <div key={snapshot.id}>
              {/* Timeline node */}
              <div className="flex items-start gap-4 py-3">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isLatest 
                      ? 'bg-indigo-500/20 border-indigo-500' 
                      : snapshot.is_starred 
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-zinc-800 border-zinc-700'
                  }`}>
                    {isLatest ? (
                      <GitMerge className="h-4 w-4 text-indigo-400" />
                    ) : snapshot.is_starred ? (
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ) : (
                      <GitCommit className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  {index < sortedSnapshots.length - 1 && (
                    <div className="w-0.5 h-8 bg-zinc-800 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Card className={`p-4 border ${
                    isLatest 
                      ? 'border-indigo-500/30 bg-indigo-500/5' 
                      : 'border-zinc-800 bg-zinc-900/50'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`font-mono font-bold ${
                            isLatest ? 'text-indigo-400' : 'text-zinc-300'
                          }`}>
                            {snapshot.version_label || `v${snapshot.version}`}
                          </span>
                          {isLatest && (
                            <Badge variant="primary" className="text-xs px-1.5 py-0">
                              Latest
                            </Badge>
                          )}
                          {snapshot.guardian_signature && (
                            <Badge variant="outline" className="text-xs">
                              ✓ Guardian Signed
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500 mb-3">
                          {formattedDate}
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-zinc-500 text-xs mb-0.5">Memories</div>
                            <div className="text-zinc-200 font-semibold">{snapshot.memory_count}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-xs mb-0.5">Skills</div>
                            <div className="text-zinc-200 font-semibold">{snapshot.skill_count}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-xs mb-0.5">Dimension Coverage</div>
                            <div className="text-zinc-200 font-semibold">
                              {Math.round(snapshot.dimension_coverage * 100)}%
                            </div>
                          </div>
                        </div>

                        {/* Dimension coverage bar */}
                        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${snapshot.dimension_coverage * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onStar?.(snapshot.id)}
                        >
                          <Star className={`h-4 w-4 ${snapshot.is_starred ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpanded(isExpanded ? null : snapshot.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in-100">
                        <div className="text-sm text-zinc-400 mb-2">Changes in this version:</div>
                        {snapshot.changes?.length > 0 ? (
                          <ul className="space-y-2">
                            {snapshot.changes.map((change, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                <span className="text-green-400 mt-0.5">+</span>
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-zinc-600 italic">
                            No detailed change log for this version
                          </div>
                        )}
                        
                        {snapshot.guardian_signature && (
                          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <div className="text-sm text-indigo-300 font-medium mb-1 flex items-center gap-2">
                              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                Guardian Signature
                              </Badge>
                            </div>
                            <div className="text-sm text-zinc-400">{snapshot.guardian_signature}</div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => onView?.(snapshot)}
                        >
                          View Full Snapshot
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
        <div className="text-sm text-zinc-500 flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Soul snapshots are immutable version records of your digital soul</span>
        </div>
      </div>
    </div>
  )
}
