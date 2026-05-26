'use client'

import { useEffect, useRef, useState } from 'react'

interface DimensionScore {
  name: string
  score: number
  angle: number
}

interface SoulRadarChartProps {
  dimensions: DimensionScore[]
  size?: number
  showLabels?: boolean
  color?: string
}

export default function SoulRadarChart({
  dimensions,
  size = 280,
  showLabels = true,
  color = '#6366f1',
}: SoulRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const maxR = size / 2 - 40
    const levels = 5

    ctx.clearRect(0, 0, size, size)

    // Draw grid levels
    for (let level = 1; level <= levels; level++) {
      const r = (maxR / levels) * level
      ctx.beginPath()
      for (let i = 0; i <= dimensions.length; i++) {
        const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = `rgba(100, 116, 139, ${level === levels ? 0.3 : 0.1})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axis lines
    dimensions.forEach((_, i) => {
      const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle))
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw data polygon
    ctx.beginPath()
    dimensions.forEach((dim, i) => {
      const angle = dim.angle - Math.PI / 2
      const r = maxR * dim.score
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = `${color}30`
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw data points
    dimensions.forEach((dim, i) => {
      const angle = dim.angle - Math.PI / 2
      const r = maxR * dim.score
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)

      ctx.beginPath()
      ctx.arc(x, y, hovered === i ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = hovered === i ? '#fff' : color
      ctx.fill()
      if (hovered === i) {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Draw labels
    if (showLabels) {
      const labelR = maxR + 24
      dimensions.forEach((dim) => {
        const angle = dim.angle - Math.PI / 2
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)

        ctx.font = '11px system-ui, sans-serif'
        ctx.fillStyle = hovered === dimensions.indexOf(dim) ? '#e2e8f0' : '#94a3b8'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(dim.name, x, y)

        // Score tooltip on hover
        if (hovered === dimensions.indexOf(dim)) {
          const tipX = cx + (maxR + 40) * Math.cos(angle)
          const tipY = cy + (maxR + 40) * Math.sin(angle) - 20
          ctx.font = 'bold 12px system-ui, sans-serif'
          ctx.fillStyle = color
          ctx.fillText(`${Math.round(dim.score * 100)}%`, tipX, tipY)
        }
      })
    }
  }, [dimensions, size, showLabels, color, hovered])

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size, cursor: 'pointer' }}
        onMouseMove={(e) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left - size / 2
          const y = e.clientY - rect.top - size / 2

          // Find closest dimension
          let closest = null
          let minDist = 30
          dimensions.forEach((dim, i) => {
            const angle = dim.angle - Math.PI / 2
            const maxR = size / 2 - 40
            const r = maxR * dim.score
            const px = r * Math.cos(angle)
            const py = r * Math.sin(angle)
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
            if (dist < minDist) {
              minDist = dist
              closest = i
            }
          })
          setHovered(closest)
        }}
        onMouseLeave={() => setHovered(null)}
      />
    </div>
  )
}
