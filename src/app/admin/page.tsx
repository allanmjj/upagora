'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Brain,
  Coins,
  MessageSquare,
  Shield,
  Star,
  Users,
  Zap,
  Loader2,
  RefreshCw,
  Heart,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface AdminStats {
  souls_created_7d: number
  messages_24h: number
  total_feedback: number
  avg_rating: number
  total_wallet_value_agu: number
  total_imports: number
  total_extractions: number
  total_calibrations: number
}

interface AdminHealth {
  database: boolean
  storage: boolean
  auth: boolean
  uptime_seconds: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [health, setHealth] = useState<AdminHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [statsRes, healthRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/health', { headers }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats || null)
      } else if (statsRes.status === 401) {
        setError('Admin access required. Please log in.')
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const statCards = stats
    ? [
        { label: 'Souls Created (7d)', value: stats.souls_created_7d, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Messages (24h)', value: stats.messages_24h, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Total Feedback', value: stats.total_feedback, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: 'Avg Rating', value: stats.avg_rating, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { label: 'Wallet Value (AGU)', value: stats.total_wallet_value_agu.toLocaleString(), icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Imports', value: stats.total_imports, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Extractions', value: stats.total_extractions, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Calibrations', value: stats.total_calibrations, icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      ]
    : []

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <Link href="/feed">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/feed">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-50">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-50">Admin Dashboard</h1>
              <p className="text-sm text-zinc-500">Platform overview & health</p>
            </div>
          </div>
          <Button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Health Status */}
        {health && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-300 mb-4">System Health</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Database', ok: health.database },
                { name: 'Storage', ok: health.storage },
                { name: 'Auth', ok: health.auth },
                { name: 'Uptime', ok: true, value: `${Math.floor((health.uptime_seconds || 0) / 3600)}h` },
              ].map((item) => (
                <Card key={item.name} className="border-zinc-800">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{item.name}</span>
                    {'ok' in item && !('value' in item) ? (
                      <span className={`h-2.5 w-2.5 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    ) : (
                      <span className="text-sm font-mono text-zinc-300">{(item as any).value}</span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">Platform Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-lg p-2 ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-50">{value}</div>
                <div className="text-xs text-zinc-500 mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
