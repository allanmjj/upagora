'use client'

import React from 'react'
import { AgentCapability, SkillCategory } from '@/types/api'

interface SkillRadarProps {
  capabilities: AgentCapability[]
  categories: SkillCategory[]
  size?: number
}

/**
 * Radar (spider) chart visualizing agent capability levels across skill categories.
 * Pure SVG implementation - no external chart library needed.
 */
export default function SkillRadar({ capabilities, categories, size = 280 }: SkillRadarProps) {
  if (!capabilities.length) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
        暂无能力数据
      </div>
    )
  }

  const center = size / 2
  const maxRadius = (size - 40) / 2
  const levels = 5 // grid rings at levels 2, 4, 6, 8, 10
  const levelLabels = [2, 4, 6, 8, 10]

  // Aggregate max level per category
  const categoryMaxLevels: Record<string, number> = {}
  categories.forEach(cat => {
    const catCaps = capabilities.filter(
      c => c.category?.id === cat.id
    )
    categoryMaxLevels[cat.id] = catCaps.length > 0
      ? Math.max(...catCaps.map(c => c.level))
      : 0
  })

  // Only show categories that have data
  const activeCategories = categories.filter(c => categoryMaxLevels[c.id] > 0)
  const points = activeCategories.length
  if (points < 3) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
        需要 3+ 项能力才能显示雷达图
      </div>
    )
  }

  const angleStep = (2 * Math.PI) / points
  const startAngle = -Math.PI / 2 // Start from top

  function getPoint(catIndex: number, level: number) {
    const angle = startAngle + angleStep * catIndex
    const radius = (level / 10) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  }

  // Build polygon points string
  const dataPoints = activeCategories
    .map((cat, i) => {
      const p = getPoint(i, categoryMaxLevels[cat.id])
      return `${p.x},${p.y}`
    })
    .join(' ')

  // Label positions (slightly further out)
  const labelOffset = 20

  // Grid colors
  const gridColor = 'rgba(82, 82, 82, 0.3)'
  const fillColor = 'rgba(139, 92, 246, 0.15)'
  const strokeColor = 'rgba(139, 92, 246, 0.8)'
  const pointColor = '#8b5cf6'
  const labelColor = '#e4e4e4'
  const levelColor = '#737373'

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid rings */}
      {levelLabels.map((level, idx) => {
        const ringPoints = activeCategories
          .map((_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          })
          .join(' ')
        return (
          <polygon
            key={level}
            points={ringPoints}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        )
      })}

      {/* Level labels (on first axis) */}
      {levelLabels.map((level) => {
        const p = getPoint(0, level)
        const dist = Math.sqrt((p.x - center) ** 2 + (p.y - center) ** 2)
        return (
          <text
            key={level}
            x={p.x + 4}
            y={p.y - 2}
            fill={levelColor}
            fontSize={9}
            fontFamily="monospace"
          >
            {level}
          </text>
        )
      })}

      {/* Axis lines */}
      {activeCategories.map((_, i) => {
        const p = getPoint(i, 10)
        return (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke={gridColor}
            strokeWidth={0.5}
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {activeCategories.map((cat, i) => {
        const p = getPoint(i, categoryMaxLevels[cat.id])
        return (
          <g key={`point-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill={pointColor} stroke="#18181b" strokeWidth={2} />
            {/* Tooltip on hover */}
            <title>{`${cat.display_name}: Lv.${categoryMaxLevels[cat.id]}`}</title>
          </g>
        )
      })}

      {/* Category labels */}
      {activeCategories.map((cat, i) => {
        const labelRadius = maxRadius + labelOffset
        const angle = startAngle + angleStep * i
        const x = center + labelRadius * Math.cos(angle)
        const y = center + labelRadius * Math.sin(angle)
        const level = categoryMaxLevels[cat.id]
        const AndrOID = level >= 7 ? '#fbbf24' : level >= 5 ? '#8b5cf6' : '#a3a3a3'

        return (
          <g key={`label-${i}`}>
            <text
              x={x}
              y={y}
              fill={labelColor}
              fontSize={11}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight={level >= 7 ? 'bold' : 'normal'}
            >
              {cat.icon} {cat.display_name}
            </text>
            <text
              x={x}
              y={y + 14}
              fill={AndrOID}
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Lv.{level}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
