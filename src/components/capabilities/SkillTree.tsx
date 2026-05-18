'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { SKILL_LEVEL_LABELS } from '@/types/api'
import { AgentCapability, SkillCategory } from '@/types/api'

interface SkillTreeProps {
  capabilities: AgentCapability[]
  categories: SkillCategory[]
}

/**
 * Expandable skill tree view organized by category.
 * Shows level, patrón, XP progress, and success stats per skill.
 */
export default function SkillTree({ capabilities, categories }: SkillTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Build tree: categories -> skills with capability data
  const tree = categories
    .map(cat => {
      const catCaps = capabilities.filter(c => c.category?.id === cat.id)
      if (!catCaps.length) return null

      const totalPatron = catCaps.reduce((s, c) => s + c.patron, 0)
      const avgLevel = catCaps.length > 0
        ? (catCaps.reduce((s, c) => s + c.level, 0) / catCaps.length).toFixed(1)
        : '0'

      return {
        ...cat,
        skills: catCaps,
        totalPatron,
        avgLevel,
        count: catCaps.length,
      }
    })
    .filter(Boolean) as (SkillCategory & {
      skills: AgentCapability[]
      totalPatron: number
      avgLevel: string
      count: number
    })[]

  const totalPatron = tree.reduce((s, t) => s + t.totalPatron, 0)
  const toggleCategory = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // XP progress bar helper
  function XpBar({ xp, xpToNext }: { xp: number; xpToNext: number }) {
    const pct = Math.min((xp / xpToNext) * 100, 100)
    return (
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #7c3aed, #a78bfa)`,
          }}
        />
      </div>
    )
  }

  // Level color helper
  function levelColor(level: number): string {
    if (level >= 8) return 'text-yellow-400'
    if (level >= 6) return 'text-purple-400'
    if (level >= 4) return 'text-blue-400'
    return 'text-zinc-400'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300">技能树</h3>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{tree.length} 维度</span>
          <span className="text-yellow-500">{totalPatron} 𝕡</span>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {tree.map(cat => {
          const isOpen = !!expanded[cat.id]
          return (
            <div key={cat.id} className="rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors rounded-lg"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </span>
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-medium text-zinc-200 flex-1">
                  {cat.display_name}
                </span>
                <span className="text-xs text-zinc-500">{cat.count} 技能</span>
                <span className="text-xs text-purple-400 font-mono">Lv.{cat.avgLevel}</span>
                <span className="text-xs text-yellow-500 font-mono">{cat.totalPatron} 𝕡</span>
              </button>

              {/* Skills */}
              {isOpen && (
                <div className="px-3 pb-2 space-y-1">
                  {cat.skills.map(cap => {
                    const certMark = cap.is_certified
                      ? <span className="text-xs text-yellow-400 ml-1">★</span>
                      : null
                    return (
                      <div
                        key={cap.skill_id}
                        className="flex items-center gap-2 pl-7 py-1.5 border-l-2 border-zinc-800 ml-2"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Name + Level */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-mono font-bold ${levelColor(cap.level)}`}
                            >
                              Lv.{cap.level}
                            </span>
                            <span className="text-xs text-zinc-400 truncate">
                              {cap.skill?.display_name || cap.skill_id}
                            </span>
                            {certMark}
                          </div>

                          {/* XP bar */}
                          <div className="mt-1">
                            <XpBar xp={cap.xp} xpToNext={cap.xp_to_next} />
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                            <span>{cap.total_invocations} 次调用</span>
                            <span>{cap.success_rate}% 成功率</span>
                            {cap.patron > 0 && (
                              <span className="text-yellow-600">{cap.patron} 𝕡</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!tree.length && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          暂无技能数据
        </div>
      )}
    </div>
  )
}
