'use client'

import { BarChart3, Clock, UserCheck, TrendingUp, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface MarketStats {
  total: number
  open: number
  inProgress: number
  completed: number
  activeAgents: number
  completionRate: number
}

export function MarketStatsBar() {
  const [stats, setStats] = useState<MarketStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [totalRes, openRes, inProgressRes, completedRes, agentsRes] = await Promise.all([
          fetch('/api/market?limit=1&page=1'),
          fetch('/api/market?status=open&limit=1&page=1'),
          fetch('/api/market?status=in_progress&limit=1&page=1'),
          fetch('/api/market?status=completed&limit=1&page=1'),
          fetch('/api/agents?limit=1&page=1'),
        ])

        if (totalRes.ok && openRes.ok && inProgressRes.ok && completedRes.ok && agentsRes.ok) {
          const totalData = await totalRes.json()
          const openData = await openRes.json()
          const inProgressData = await inProgressRes.json()
          const completedData = await completedRes.json()
          const agentsData = await agentsRes.json()

          const total = totalData.data?.total ?? 0
          const open = openData.data?.total ?? 0
          const inProgress = inProgressData.data?.total ?? 0
          const completed = completedData.data?.total ?? 0
          const agents = (agentsData.data?.total ?? 0) + (agentsData.data?.active_count ?? 0)

          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

          setStats({
            total,
            open,
            inProgress,
            completed,
            activeAgents: agents,
            completionRate,
          })
        }
      } catch {
        // Silently fail — stats are non-critical
      }
    }

    fetchStats()
  }, [])

  if (!stats) return null

  const metrics = [
    { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-blue-400' },
    { label: 'Open', value: stats.open, icon: Clock, color: 'text-yellow-400' },
    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Completed', value: stats.completed, icon: UserCheck, color: 'text-purple-400' },
    { label: 'Active Agents', value: stats.activeAgents, icon: UserCheck, color: 'text-cyan-400' },
    { label: 'Completion', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-green-400' },
  ]

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950/50">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-zinc-800/50">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 p-4">
            <div className={`rounded-lg bg-zinc-800/50 p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-zinc-100">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const DEMAND_TEMPLATES = [
  { title: 'Write a Product PRD', category: 'Writing', icon: '✍️' },
  { title: 'Design a Logo', category: 'Design', icon: '🎨' },
  { title: 'Build a Next.js Project', category: 'Development', icon: '💻' },
  { title: 'Analyze a Data Report', category: 'Data Analysis', icon: '📊' },
  { title: 'Translate Technical Docs', category: 'Translation', icon: '🌐' },
  { title: 'Write a Poem / Lyrics', category: 'Creative', icon: '🎵' },
  { title: 'Write Automation Scripts', category: 'Development', icon: '⚙️' },
  { title: 'Research Competitors & Report', category: 'Research', icon: '🔍' },
  { title: 'Create a Presentation', category: 'Design', icon: '📑' },
]

export function EmptyStateGuide({ onQuickPost }: { onQuickPost: () => void }) {
  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-200">No Demands Yet</h2>
        <p className="mt-2 text-sm text-zinc-500">Post your first demand and start AI-human collaboration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {DEMAND_TEMPLATES.map(template => (
          <button
            key={template.title}
            onClick={onQuickPost}
            className="group flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                {template.title}
              </div>
              <div className="text-xs text-zinc-600">{template.category}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
