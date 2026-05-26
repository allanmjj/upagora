'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, AlertTriangle, CheckCircle, Gauge } from 'lucide-react';

interface PerformanceMetrics {
  api_latency: number;
  active_users: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
  requests_per_sec: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/admin/health', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      }
      setLoading(false);
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <div className="animate-pulse text-zinc-500">Loading metrics...</div>
      </div>
    );
  }

  const getStatusColor = (value: number, warn: number, danger: number) => {
    if (value >= danger) return 'text-red-400';
    if (value >= warn) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-50">Performance Dashboard</h2>
        <span className="text-xs text-zinc-500">Live · Updates every 30s</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'API Latency', value: metrics?.api_latency ?? 0, unit: 'ms', icon: Clock, warn: 500, danger: 2000 },
          { label: 'Active Users', value: metrics?.active_users ?? 0, unit: '', icon: Users, warn: 0, danger: 0 },
          { label: 'Error Rate', value: metrics?.error_rate ?? 0, unit: '%', icon: AlertTriangle, warn: 1, danger: 5 },
          { label: 'CPU Usage', value: metrics?.cpu_usage ?? 0, unit: '%', icon: Gauge, warn: 60, danger: 90 },
          { label: 'Memory Usage', value: metrics?.memory_usage ?? 0, unit: '%', icon: BarChart3, warn: 70, danger: 90 },
          { label: 'Requests/sec', value: metrics?.requests_per_sec ?? 0, unit: '/s', icon: TrendingUp, warn: 0, danger: 0 },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <m.icon className="h-4 w-4" />
              {m.label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${m.warn === 0 && m.danger === 0 ? 'text-zinc-50' : getStatusColor(m.value, m.warn, m.danger)}`}>
              {typeof m.value === 'number' ? m.value.toFixed(m.value < 10 ? 1 : 0) : m.value}
              {m.unit && <span className="text-sm text-zinc-500"> {m.unit}</span>}
            </div>
            {m.warn > 0 && m.value >= m.warn && (
              <div className="mt-2 text-xs text-amber-400">
                {m.value >= m.danger ? '⚠️ Critical' : '⚡ Warning'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">System Health</h3>
        <div className="flex items-center gap-3">
          {metrics && (
            <>
              {((metrics.error_rate ?? 0) < 5 && (metrics.cpu_usage ?? 0) < 90 && (metrics.memory_usage ?? 0) < 90) ? (
                <><CheckCircle className="h-5 w-5 text-emerald-400" /> <span className="text-emerald-400">All systems operational</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-amber-400" /> <span className="text-amber-400">Some systems degraded</span></>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
