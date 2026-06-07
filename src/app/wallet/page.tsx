"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Wallet, Coins, TrendingUp, TrendingDown, Clock, Award, Zap, 
  ArrowUpRight, ArrowDownLeft, Loader2, Shield, Gift, History,
  ChevronRight, Star, Trophy, AlertTriangle
} from "lucide-react";

interface WalletData {
  agu_balance: number;
  agu_lifetime_earned: number;
  agu_lifetime_spent: number;
  points_balance: number;
  points_lifetime_earned: number;
  last_mine_claim_at: string | null;
  mine_streak: number;
  total_blocks_mined: number;
}

interface Transaction {
  id: string;
  type: "earn" | "spend" | "mine" | "reward" | "purchase";
  amount: number;
  description: string;
  created_at: string;
  reference_type?: string;
  reference_id?: string;
}

const TXN_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  earn: { icon: ArrowDownLeft, color: "text-green-400", label: "Earned" },
  spend: { icon: ArrowUpRight, color: "text-red-400", label: "Spent" },
  mine: { icon: Zap, color: "text-amber-400", label: "Mined" },
  reward: { icon: Gift, color: "text-purple-400", label: "Reward" },
  purchase: { icon: Wallet, color: "text-blue-400", label: "Purchase" },
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineSuccess, setMineSuccess] = useState<string | null>(null);
  const [cooldownHours, setCooldownHours] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, txnsRes] = await Promise.all([
        fetch("/api/wallet").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/wallet/transactions?limit=50").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (walletRes) setWallet(walletRes);
      if (txnsRes) setTransactions(txnsRes.transactions || []);
    } catch (err) {
      console.error("Failed to fetch wallet data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMine = async () => {
    setMining(true);
    setMineError(null);
    setMineSuccess(null);
    try {
      const res = await fetch("/api/wallet/mine", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMineSuccess(`+${data.agu_mined} AGU mined! Streak: ${data.streak}`);
        setCooldownHours(null);
        await fetchData();
      } else if (res.status === 429) {
        setCooldownHours(data.remaining_hours);
        setMineError(`Mining on cooldown. ${data.remaining_hours}h remaining.`);
      } else {
        setMineError(data.error || "Mining failed");
      }
    } catch (err) {
      setMineError("Network error");
    } finally {
      setMining(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  const w = wallet || {
    agu_balance: 0, agu_lifetime_earned: 0, agu_lifetime_spent: 0,
    points_balance: 0, points_lifetime_earned: 0,
    last_mine_claim_at: null, mine_streak: 0, total_blocks_mined: 0,
  };

  const canMine = !w.last_mine_claim_at ||
    (Date.now() - new Date(w.last_mine_claim_at).getTime()) >= 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-amber-400" />
            Wallet & Economy
          </h1>
          <p className="text-lg text-zinc-400">Manage your AGU tokens, points, and transaction history.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* AGU Balance */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-amber-400">AGU Balance</span>
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-1">{w.agu_balance.toLocaleString()}</div>
            <div className="text-sm text-zinc-500">Lifetime: {w.agu_lifetime_earned.toLocaleString()} earned, {w.agu_lifetime_spent.toLocaleString()} spent</div>
          </div>

          {/* Points Balance */}
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-indigo-400">Points</span>
              <Star className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-1">{w.points_balance.toLocaleString()}</div>
            <div className="text-sm text-zinc-500">Lifetime: {w.points_lifetime_earned.toLocaleString()} earned</div>
          </div>

          {/* Mining Stats */}
          <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-green-400">Mining</span>
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-white">{w.mine_streak}</span>
              <span className="text-sm text-zinc-500">streak</span>
              <span className="text-sm text-zinc-600 mx-1">|</span>
              <span className="text-3xl font-bold text-white">{w.total_blocks_mined}</span>
              <span className="text-sm text-zinc-500">blocks</span>
            </div>
            <div className="text-sm text-zinc-500">Next reward: {100 + w.mine_streak * 10} AGU</div>
          </div>
        </div>

        {/* Mining Action */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Mine AGU Tokens
              </h3>
              <p className="text-sm text-zinc-400 mt-1">Claim daily AGU tokens. Streak bonuses increase rewards.</p>
              {!canMine && w.last_mine_claim_at && (
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last claimed: {formatTime(w.last_mine_claim_at)}
                </p>
              )}
            </div>
            <button
              onClick={handleMine}
              disabled={mining || !canMine}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
            >
              {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {mining ? "Mining..." : !canMine ? "On Cooldown" : "Mine Now"}
            </button>
          </div>
          {mineError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <AlertTriangle className="h-4 w-4" />
              {mineError}
            </div>
          )}
          {mineSuccess && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
              <Trophy className="h-4 w-4" />
              {mineSuccess}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/soul/marketplace" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-500/50 transition-colors">
            <Coins className="h-5 w-5 text-amber-400 mb-2" />
            <div className="font-medium text-white text-sm">Soul Market</div>
            <div className="text-xs text-zinc-500">Buy & sell souls</div>
          </Link>
          <Link href="/market" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-500/50 transition-colors">
            <TrendingUp className="h-5 w-5 text-green-400 mb-2" />
            <div className="font-medium text-white text-sm">Task Market</div>
            <div className="text-xs text-zinc-500">Earn with tasks</div>
          </Link>
          <Link href="/settings" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-500/50 transition-colors">
            <Shield className="h-5 w-5 text-blue-400 mb-2" />
            <div className="font-medium text-white text-sm">Badges</div>
            <div className="text-xs text-zinc-500">View achievements</div>
          </Link>
          <Link href="/soul/economy" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-500/50 transition-colors">
            <Award className="h-5 w-5 text-purple-400 mb-2" />
            <div className="font-medium text-white text-sm">Economy</div>
            <div className="text-xs text-zinc-500">Soul economy</div>
          </Link>
        </div>

        {/* Transaction History */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-zinc-400" />
              Transaction History
            </h3>
          </div>
          {transactions.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {transactions.map((tx) => {
                const cfg = TXN_TYPE_CONFIG[tx.type] || TXN_TYPE_CONFIG.earn;
                const Icon = cfg.icon;
                const isPositive = tx.type !== "spend" && tx.type !== "purchase";
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-6 py-4">
                    <div className={`p-2 rounded-lg ${cfg.color.replace("text-", "bg-")}/10`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{tx.description}</div>
                      <div className="text-xs text-zinc-500">{formatTime(tx.created_at)}</div>
                    </div>
                    <div className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                      {isPositive ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <History className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No transactions yet</h3>
              <p className="text-zinc-500">Start mining or trading to see your history here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
