"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trophy, Medal, Award, Star, ChevronRight, Loader2, Crown, Shield, Zap } from "lucide-react";

interface RankingEntry {
  id: string;
  subject_name: string;
  share_slug?: string;
  score: number;
  guardian_signatures: number;
  calibrations: number;
  avg_feedback: number;
  avg_confidence: number;
  distillation_phase?: string;
  created_at?: string;
}

const TOP3_BADGES = [
  { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: Trophy, color: "text-zinc-300", bg: "bg-zinc-400/10" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
];

export default function ReputationPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "week" | "month">("all");
  const [myRank, setMyRank] = useState<RankingEntry | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      try {
        const [rankingRes, myRes] = await Promise.all([
          fetch(`/api/reputation/ranking?period=${period}&limit=50`),
          fetch("/api/reputation/my"),
        ]);
        if (rankingRes.ok) {
          const data = await rankingRes.json();
          setRanking(data.ranking || []);
        }
        if (myRes.ok) {
          const data = await myRes.json();
          setMyRank(data);
        }
      } catch (err) {
        console.error("Failed to fetch ranking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRanking();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-400" />
            Reputation Leaderboard
          </h1>
          <p className="text-lg text-zinc-400">Top souls ranked by guardian signatures, calibrations, and community feedback.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Period Filter */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
              }`}
            >
              {p === "all" ? "All Time" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            {[1, 0, 2].map((idx) => {
              const entry = ranking[idx];
              if (!entry) return null;
              const badge = TOP3_BADGES[idx];
              const Icon = badge.icon;
              const isCenter = idx === 0;
              return (
                <div key={entry.id} className={`text-center ${isCenter ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}>
                  <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 ${isCenter ? "ring-2 ring-amber-500/30" : ""}`}>
                    <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${badge.bg} mb-3`}>
                      <Icon className={`h-6 w-6 ${badge.color}`} />
                    </div>
                    <div className="text-xs text-zinc-500 mb-1">#{idx + 1}</div>
                    <Link href={`/soul/${entry.share_slug}`} className="font-semibold text-white hover:text-amber-400 transition-colors block">
                      {entry.subject_name}
                    </Link>
                    <div className="text-2xl font-bold text-amber-400 mt-2">{entry.score}</div>
                    <div className="text-xs text-zinc-500">reputation</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Full Rankings ({ranking.length} souls)</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {ranking.map((entry, idx) => {
              const rank = idx + 1;
              const badge = rank <= 3 ? TOP3_BADGES[rank - 1] : null;
              return (
                <Link
                  key={entry.id}
                  href={`/soul/${entry.share_slug || entry.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/80 transition-colors"
                >
                  <div className="w-8 text-center">
                    {badge ? (
                      <badge.icon className={`h-5 w-5 ${badge.color} mx-auto`} />
                    ) : (
                      <span className="text-sm text-zinc-500">{rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{entry.subject_name}</div>
                    <div className="flex gap-4 text-xs text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{entry.guardian_signatures} sigs</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{entry.calibrations} calibs</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{entry.avg_feedback.toFixed(1)} rating</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400">{entry.score}</div>
                    {entry.distillation_phase && (
                      <div className="text-xs text-zinc-500">{entry.distillation_phase}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </Link>
              );
            })}
          </div>
          {ranking.length === 0 && (
            <div className="p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No rankings yet</h3>
              <p className="text-zinc-500">Distill souls and get guardian signatures to appear here.</p>
            </div>
          )}
        </div>

        {/* Scoring Explanation */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-zinc-400" />
            How Reputation Works
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Shield className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-white">Guardian Signatures</div>
              <div className="text-xs text-zinc-500">50 points each</div>
            </div>
            <div className="text-center">
              <Zap className="h-5 w-5 text-green-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-white">Calibrations</div>
              <div className="text-xs text-zinc-500">20 points each</div>
            </div>
            <div className="text-center">
              <Star className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-white">Feedback Rating</div>
              <div className="text-xs text-zinc-500">0-100 normalized</div>
            </div>
            <div className="text-center">
              <Medal className="h-5 w-5 text-purple-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-white">Confidence Score</div>
              <div className="text-xs text-zinc-500">0-50 weighted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
