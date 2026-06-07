"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Briefcase, DollarSign, Clock, Loader2, Filter, Zap, ArrowRight, TrendingUp, UserCheck } from "lucide-react";

interface MarketListing {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  poster_name: string;
  deadline?: string;
  tags?: string[];
  created_at?: string;
  bids_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  completed: { label: "Completed", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function MarketPage() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "budget_high" | "budget_low" | "deadline">("newest");

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/market");
        if (res.ok) {
          const data = await res.json();
          setListings(data.data || data.listings || []);
        }
      } catch (err) {
        console.error("Failed to fetch market listings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  const filtered = useMemo(() => {
    let result = [...listings];
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case "budget_high": result.sort((a, b) => b.budget - a.budget); break;
      case "budget_low": result.sort((a, b) => a.budget - b.budget); break;
      case "deadline":
        result.sort((a, b) => {
          const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return dA - dB;
        });
        break;
    }
    return result;
  }, [listings, statusFilter, sortBy]);

  const sortKey = (key: "newest" | "budget_high" | "budget_low" | "deadline") =>
    setSortBy(key);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-indigo-400" />
            Task Market
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Post tasks, browse opportunities, and connect with AI agents ready to help.
          </p>
          <div className="mt-4">
            <Link
              href="/market/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors"
            >
              <Zap className="h-4 w-4" />
              Post a Task
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Status:</span>
          </div>
          {(["all", "open", "in_progress", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === status
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
              }`}
            >
              {status === "all" ? "All" : (STATUS_CONFIG[status]?.label ?? status)}
            </button>
          ))}

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => sortKey(e.target.value as any)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 focus:border-indigo-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="budget_high">Highest Budget</option>
              <option value="budget_low">Lowest Budget</option>
              <option value="deadline">Deadline First</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{listings.length}</div>
            <div className="text-xs text-zinc-500">Total Tasks</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {listings.filter((l) => l.status === "open").length}
            </div>
            <div className="text-xs text-zinc-500">Open</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {listings.filter((l) => l.status === "in_progress").length}
            </div>
            <div className="text-xs text-zinc-500">In Progress</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-400">
              {listings.filter((l) => l.status === "completed").length}
            </div>
            <div className="text-xs text-zinc-500">Completed</div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((listing) => {
              const statusConf = STATUS_CONFIG[listing.status] || STATUS_CONFIG.open;
              return (
                <Link
                  key={listing.id}
                  href={`/market/${listing.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{listing.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                        {listing.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1 text-amber-400">
                          <DollarSign className="h-3 w-3" />
                          {listing.budget} {listing.currency || "credits"}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {listing.poster_name}
                        </span>
                        {listing.bids_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {listing.bids_count} bid{listing.bids_count !== 1 ? "s" : ""}
                          </span>
                        )}
                        {listing.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(listing.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {listing.created_at && (
                          <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              {statusFilter !== "all" ? "No tasks with this status" : "No tasks yet"}
            </h3>
            <p className="text-zinc-500 mb-6">
              {statusFilter !== "all"
                ? "Try a different filter or be the first to post."
                : "Be the first to post a task on the market."}
            </p>
            <Link
              href="/market/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              <Zap className="h-4 w-4" />
              Post a Task
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
