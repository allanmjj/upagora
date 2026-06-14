'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, ArrowLeft, MessageCircle, TrendingUp, Users, Zap } from 'lucide-react'

interface SoulRelationship {
  soul_id: string
  soul_name: string
  related_soul_id: string
  related_soul_name: string
  relationship_type: string
  strength: number
  interaction_count: number
  last_interaction: string
  description: string
}

export default function RelationshipsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [relationships, setRelationships] = useState<SoulRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedRel, setSelectedRel] = useState<SoulRelationship | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) loadRelationships()
  }, [authLoading, user, router])

  async function loadRelationships() {
    try {
      const res = await fetch('/api/town/relationships?guardian_id=' + user!.id)
      if (res.ok) {
        const data = await res.json()
        setRelationships(data.relationships || [])
      }
    } catch (err) {
      console.error('Failed to load relationships:', err)
    } finally {
      setLoading(false)
    }
  }

  // Draw relationship graph on canvas
  useEffect(() => {
    if (!canvasRef.current || relationships.length === 0) return
    drawGraph(canvasRef.current, relationships)
  }, [relationships])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/town">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-400" />
            Soul Relationships
          </h1>
          <p className="text-sm text-zinc-500">
            See how your souls connect, interact, and influence each other
          </p>
        </div>
      </div>

      {/* Relationship Graph */}
      {relationships.length > 0 ? (
        <>
          <Card className="border border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                Connection Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full rounded-lg border border-zinc-800/50 bg-zinc-950"
                style={{ imageRendering: 'auto' }}
              />
            </CardContent>
          </Card>

          {/* Relationship Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {relationships.map((rel, i) => (
              <Card
                key={i}
                className={cn(
                  'border border-zinc-800 bg-zinc-900/50 cursor-pointer transition-all hover:border-zinc-700',
                  selectedRel === rel && 'border-violet-500/50 bg-violet-500/5'
                )}
                onClick={() => setSelectedRel(rel)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-lg">
                      {getRelationshipIcon(rel.relationship_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{rel.soul_name}</span>
                        <span className="text-xs text-zinc-500">↔</span>
                        <span className="text-sm font-semibold text-zinc-200">{rel.related_soul_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                          {rel.relationship_type}
                        </Badge>
                        <span className="text-xs text-zinc-500">
                          {rel.interaction_count} interactions
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Strength</div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Heart
                            key={j}
                            className={cn(
                              'h-3 w-3',
                              j < Math.ceil(rel.strength / 20)
                                ? 'fill-rose-400 text-rose-400'
                                : 'text-zinc-700'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {rel.description && (
                    <p className="mt-3 text-sm text-zinc-400">{rel.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border border-zinc-800 border-dashed bg-zinc-900/30">
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">No Relationships Yet</h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
              Soul relationships form through encounters and interactions in the town.{' '}
              As souls meet and converse, their connections strengthen and appear here.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/town">
                  <Zap className="h-4 w-4" /> Enter Town
                </Link>
              </Button>
              <Button asChild>
                <Link href="/distill">
                  <Heart className="h-4 w-4" /> Create More Souls
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function getRelationshipIcon(type: string): string {
  const icons: Record<string, string> = {
    friend: '🤝',
    mentor: '🎓',
    rival: '⚔️',
    lover: '❤️',
    stranger: '👋',
    ally: '🛡️',
  }
  return icons[type] || '🔗'
}

/* ─── Simple Force-Directed Graph Drawing ─── */
function drawGraph(canvas: HTMLCanvasElement, relationships: SoulRelationship[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)

  // Extract unique souls and their positions
  const souls = new Map<string, { name: string; x: number; y: number }>()
  relationships.forEach((rel) => {
    if (!souls.has(rel.soul_id)) {
      souls.set(rel.soul_id, {
        name: rel.soul_name,
        x: Math.random() * (W - 100) + 50,
        y: Math.random() * (H - 100) + 50,
      })
    }
    if (!souls.has(rel.related_soul_id)) {
      souls.set(rel.related_soul_id, {
        name: rel.related_soul_name,
        x: Math.random() * (W - 100) + 50,
        y: Math.random() * (H - 100) + 50,
      })
    }
  })

  // Simple force-directed layout (run a few iterations)
  const nodes = Array.from(souls.values())
  for (let iter = 0; iter < 50; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x
        const dy = nodes[j].y - nodes[i].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = 2000 / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        nodes[i].x -= fx
        nodes[i].y -= fy
        nodes[j].x += fx
        nodes[j].y += fy
      }
    }

    // Attraction along edges
    relationships.forEach((rel) => {
      const a = souls.get(rel.soul_id)
      const b = souls.get(rel.related_soul_id)
      if (!a || !b) return
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - 100) * 0.01 * (rel.strength / 50)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.x += fx
      a.y += fy
      b.x -= fx
      b.y -= fy
    })

    // Center gravity
    nodes.forEach((n) => {
      n.x += (W / 2 - n.x) * 0.01
      n.y += (H / 2 - n.y) * 0.01
    })

    // Boundary constraints
    nodes.forEach((n) => {
      n.x = Math.max(50, Math.min(W - 50, n.x))
      n.y = Math.max(50, Math.min(H - 50, n.y))
    })
  }

  // Update soul positions
  nodes.forEach((node, i) => {
    const [id] = Array.from(souls.keys())[i]
    if (id) souls.set(id, { ...souls.get(id)!, x: node.x, y: node.y })
  })

  // Draw edges
  relationships.forEach((rel) => {
    const a = souls.get(rel.soul_id)
    const b = souls.get(rel.related_soul_id)
    if (!a || !b) return

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 + rel.strength / 100})`
    ctx.lineWidth = 1 + rel.strength / 25
    ctx.stroke()

    // Edge label
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    ctx.fillStyle = 'rgba(161, 161, 170, 0.6)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(rel.relationship_type, mx, my - 5)
  })

  // Draw nodes
  souls.forEach((soul, id) => {
    // Node circle
    ctx.beginPath()
    ctx.arc(soul.x, soul.y, 25, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(24, 24, 27, 0.9)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Node label
    ctx.fillStyle = '#e4e4e7'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(soul.name, soul.x, soul.y + 40)
  })
}
