'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Sparkles, TrendingUp, RotateCcw } from 'lucide-react'

/**
 * Soul Growth Trajectory Visualization
 * Renders dimension score changes across snapshot versions using SVG.
 * No external chart library needed — lightweight SVG-based implementation.
 */

interface SnapshotPoint {
  version: number
  created_at: string
  dimensions: Record<string, number> // dimension_key -> score (0-100)
  guardian_signature?: string
}

interface GrowthTrajectoryProps {
  snapshots: SnapshotPoint[]
  isLoading?: boolean
  onSelectSnapshot?: (version: number) => void
}

const DIMENSION_COLORS: Record<string, string> = {
  cognitive_patterns: '#818cf8',  // indigo
  value_judgment: '#f472b6',      // pink
  expression_style: '#fb923c',    // orange
  knowledge_structure: '#34d399', // emerald
  emotional_response: '#a78bfa',  // violet
  relationship_memory: '#38bdf8', // sky
  life_narrative: '#fbbf24',      // amber
}

const DIMENSION_LABELS: Record<string, string> = {
  cognitive_patterns: 'Cognitive',
  value_judgment: 'Values',
  expression_style: 'Expression',
  knowledge_structure: 'Knowledge',
  emotional_response: 'Emotion',
  relationship_memory: 'Relations',
  life_narrative: 'Narrative',
}

export default function SoulGrowthTrajectory({ snapshots, isLoading, onSelectSnapshot }: GrowthTrajectoryProps) {
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(new Set(Object.keys(DIMENSION_COLORS)))
  const [hoveredVersion, setHoveredVersion] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <RotateCcw className="mr-2 h-5 w-5 animate-spin" />
        Loading growth data...
      </div>
    )
  }

  if (!snapshots || snapshots.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
        <Sparkles className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
        <p className="text-sm">Need at least 2 snapshots to show growth trajectory</p>
        <p className="mt-1 text-xs text-zinc-600">Create more soul snapshots to visualize your soul's evolution</p>
      </div>
    )
  }

  // Chart dimensions
  const width = 700
  const height = 320
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Scale helpers
  const maxVersion = Math.max(...snapshots.map(s => s.version))
  const minVersion = Math.min(...snapshots.map(s => s.version))
  const versionRange = maxVersion - minVersion || 1

  const xScale = (v: number) => padding.left + ((v - minVersion) / versionRange) * chartW
  const yScale = (score: number) => padding.top + chartH - (score / 100) * chartH

  // Toggle dimension
  const toggleDimension = (dim: string) => {
    setSelectedDimensions(prev => {
      const next = new Set(prev)
      if (next.has(dim)) next.delete(dim)
      else next.add(dim)
      return next
    })
  }

  // Calculate overall growth
  const overallGrowth = (() => {
    if (snapshots.length < 2) return 0
    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]
    const firstAvg = Object.values(first.dimensions).reduce((a, b) => a + b, 0) / Object.keys(first.dimensions).length
    const lastAvg = Object.values(last.dimensions).reduce((a, b) => a + b, 0) / Object.keys(last.dimensions).length
    return Math.round(lastAvg - firstAvg)
  })()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-zinc-50">Soul Growth Trajectory</h3>
        </div>
        <Badge variant="outline" className={overallGrowth >= 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}>
          {overallGrowth >= 0 ? '+' : ''}{overallGrowth}% growth
        </Badge>
      </div>

      {/* Dimension toggles */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(DIMENSION_COLORS).map(([dim, color]) => (
          <button
            key={dim}
            onClick={() => toggleDimension(dim)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${
              selectedDimensions.has(dim) ? 'opacity-100' : 'opacity-30'
            }`}
            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {DIMENSION_LABELS[dim] || dim}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '360px' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(score => (
            <g key={score}>
              <line
                x1={padding.left}
                y1={yScale(score)}
                x2={width - padding.right}
                y2={yScale(score)}
                stroke="#27272a"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={yScale(score) + 4}
                textAnchor="end"
                className="fill-zinc-600"
                fontSize={10}
              >
                {score}
              </text>
            </g>
          ))}

          {/* Version labels on x-axis */}
          {snapshots.map(s => (
            <text
              key={s.version}
              x={xScale(s.version)}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-500"
              fontSize={10}
            >
              v{s.version}
            </text>
          ))}

          {/* Lines for each selected dimension */}
          {Array.from(selectedDimensions).map(dim => {
            const color = DIMENSION_COLORS[dim] || '#888'
            const points = snapshots
              .filter(s => s.dimensions[dim] !== undefined)
              .map(s => ({ x: xScale(s.version), y: yScale(s.dimensions[dim]), version: s.version, score: s.dimensions[dim] }))

            if (points.length < 2) return null

            const pathD = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ')

            return (
              <g key={dim}>
                {/* Area fill */}
                <path
                  d={`${pathD} L ${points[points.length - 1].x} ${yScale(0)} L ${points[0].x} ${yScale(0)} Z`}
                  fill={`${color}15`}
                />
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {points.map(p => (
                  <circle
                    key={p.version}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredVersion === p.version ? 5 : 3}
                    fill={color}
                    stroke={hoveredVersion === p.version ? '#fff' : 'none'}
                    strokeWidth={1}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredVersion(p.version)}
                    onMouseLeave={() => setHoveredVersion(null)}
                    onClick={() => onSelectSnapshot?.(p.version)}
                  />
                ))}
              </g>
            )
          })}

          {/* Hover tooltip */}
          {hoveredVersion !== null && (() => {
            const snap = snapshots.find(s => s.version === hoveredVersion)
            if (!snap) return null
            const x = xScale(hoveredVersion)
            return (
              <g>
                <line x1={x} y1={padding.top} x2={x} y2={padding.top + chartH} stroke="#52525b" strokeDasharray="4,4" />
                {Array.from(selectedDimensions).map(dim => {
                  const score = snap.dimensions[dim]
                  if (score === undefined) return null
                  return (
                    <text
                      key={dim}
                      x={x + 8}
                      y={yScale(score) + 4}
                      className="fill-zinc-300"
                      fontSize={9}
                    >
                      {DIMENSION_LABELS[dim]}: {score}
                    </text>
                  )
                })}
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Summary table */}
      {snapshots.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="px-4 py-2 text-left font-medium">Version</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Avg Score</th>
                <th className="px-4 py-2 text-left font-medium">Top Dimension</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.slice().reverse().map(snap => {
                const avg = Object.values(snap.dimensions).length > 0
                  ? Math.round(Object.values(snap.dimensions).reduce((a, b) => a + b, 0) / Object.values(snap.dimensions).length)
                  : 0
                const topDim = Object.entries(snap.dimensions).sort((a, b) => b[1] - a[1])[0]
                return (
                  <tr key={snap.version} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-50">v{snap.version}</td>
                    <td className="px-4 py-2 text-zinc-400">{new Date(snap.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className={avg >= 70 ? 'text-emerald-400' : avg >= 40 ? 'text-amber-400' : 'text-red-400'}>
                        {avg}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {topDim && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DIMENSION_COLORS[topDim[0]] || '#888' }} />
                          <span className="text-zinc-300">{DIMENSION_LABELS[topDim[0]] || topDim[0]}</span>
                          <span className="text-zinc-500">({topDim[1]}%)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
