"use client";
import { useState, useEffect, useCallback } from "react";
import { Brain, Activity, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp, TrendingDown, Clock, Zap } from "lucide-react";

interface BrainStatus {
  status: "healthy" | "warning" | "critical" | "offline";
  uptime?: number;
  last_heartbeat?: string;
  active_models?: number;
  processing_queue?: number;
  avg_response_time?: number;
  error_rate?: number;
}

interface BrainFeedItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
  source?: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  healthy: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Warning" },
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Critical" },
  offline: { icon: XCircle, color: "text-zinc-500", bg: "bg-zinc-500/10", label: "Offline" },
};

const FEED_TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  info: { icon: Activity, color: "text-blue-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
  error: { icon: XCircle, color: "text-red-400" },
  success: { icon: CheckCircle, color: "text-green-400" },
};

export default function BrainFeedPage() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [feed, setFeed] = useState<BrainFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, feedRes] = await Promise.all([
        fetch("/api/brain/status"),
        fetch("/api/brain/feed?limit=50"),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
      if (feedRes.ok) {
        const data = await feedRes.json();
        setFeed(data.feed || data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch brain data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const statusConf = status ? STATUS_CONFIG[status.status] || STATUS_CONFIG.offline : null;
  const StatusIcon = statusConf?.icon || Brain;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading brain status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-400" />
                AI Brain Monitor
              </h1>
              <p className="text-lg text-zinc-400">Real-time monitoring of AI model health and activity.</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-zinc-600 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin text-purple-400" : "text-zinc-400"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-2xl border p-6 ${statusConf?.bg || "bg-zinc-900/50"} border-zinc-800`}>
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon className={`h-5 w-5 ${statusConf?.color || "text-zinc-500"}`} />
              <span className="text-sm text-zinc-400">System Status</span>
            </div>
            <div className={`text-2xl font-bold ${statusConf?.color || "text-zinc-500"}`}>
              {statusConf?.label || "Unknown"}
            </div>
            {status?.last_heartbeat && (
              <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last: {new Date(status.last_heartbeat).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-zinc-400">Active Models</span>
            </div>
            <div className="text-2xl font-bold text-white">{status?.active_models ?? "-"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="h-5 w-5 text-green-400" />
              <span className="text-sm text-zinc-400">Queue Depth</span>
            </div>
            <div className="text-2xl font-bold text-white">{status?.processing_queue ?? "-"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              {status?.error_rate && status.error_rate > 5 ? (
                <TrendingDown className="h-5 w-5 text-red-400" />
              ) : (
                <TrendingUp className="h-5 w-5 text-amber-400" />
              )}
              <span className="text-sm text-zinc-400">Error Rate</span>
            </div>
            <div className="text-2xl font-bold text-white">{(status?.error_rate ?? 0).toFixed(1)}%</div>
          </div>
        </div>

        {/* Performance Metrics */}
        {status?.avg_response_time != null && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-zinc-500">Avg Response</div>
                <div className="text-xl font-bold text-white">{status.avg_response_time}ms</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Uptime</div>
                <div className="text-xl font-bold text-white">
                  {status.uptime ? `${Math.round(status.uptime / 3600)}h` : "-"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
          </div>
          {feed.length > 0 ? (
            <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
              {feed.map((item) => {
                const cfg = FEED_TYPE_CONFIG[item.type] || FEED_TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="flex items-start gap-4 px-6 py-4">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-300">{item.message}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        {item.source && <span className="text-zinc-600">via {item.source}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Brain className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No activity yet</h3>
              <p className="text-zinc-500">Brain activity will appear here as events occur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
