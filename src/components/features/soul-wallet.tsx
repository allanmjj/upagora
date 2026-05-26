'use client';

import { useEffect, useState } from 'react';
import { Wallet, Coins, Zap, TrendingUp, Clock, Sparkles } from 'lucide-react';

export interface WalletData {
  agu_balance: number;
  agu_lifetime_earned: number;
  agu_lifetime_spent: number;
  points_balance: number;
  points_lifetime_earned: number;
  last_mine_claim_at: string | null;
  mine_streak: number;
  total_blocks_mined: number;
}

export function SoulWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineSuccess, setMineSuccess] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleMine = async () => {
    setMining(true);
    setMineError(null);
    setMineSuccess(false);
    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMineSuccess(true);
        await fetchWallet();
        setTimeout(() => setMineSuccess(false), 3000);
      } else {
        setMineError(data.error || data.remaining_hours ? `需等待 ${data.remaining_hours} 小时` : 'Mining failed');
      }
    } catch {
      setMineError('Network error');
    } finally {
      setMining(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-6 animate-pulse">
        <div className="h-8 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-12 w-full bg-zinc-800 rounded" />
      </div>
    );
  }

  const canMine = !wallet?.last_mine_claim_at ||
    (Date.now() - new Date(wallet.last_mine_claim_at).getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-amber-500/10 p-2">
          <Wallet className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Soul Wallet</h2>
        {mineSuccess && <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />}
      </div>

      {/* AGU Balance */}
      <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-zinc-400">AGU Balance</span>
        </div>
        <div className="text-3xl font-bold text-amber-400">
          {(wallet?.agu_balance || 0).toLocaleString()}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Earned: {(wallet?.agu_lifetime_earned || 0).toLocaleString()} · Spent: {(wallet?.agu_lifetime_spent || 0).toLocaleString()}
        </div>
      </div>

      {/* Points Balance */}
      <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-zinc-400">Points Balance</span>
        </div>
        <div className="text-2xl font-bold text-blue-400">
          {(wallet?.points_balance || 0).toLocaleString()}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Total earned: {(wallet?.points_lifetime_earned || 0).toLocaleString()}
        </div>
      </div>

      {/* Mining Stats */}
      <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <span className="text-sm text-zinc-400">Mining Stats</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">{wallet?.mine_streak || 0}</div>
            <div className="text-xs text-zinc-500">Day Streak</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{wallet?.total_blocks_mined || 0}</div>
            <div className="text-xs text-zinc-500">Blocks Mined</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">
              {canMine ? 'Ready' : <><Clock className="h-3 w-3 inline mr-1" />Cooldown</>}
            </div>
            <div className="text-xs text-zinc-500">Status</div>
          </div>
        </div>
      </div>

      {/* Mine Button */}
      <button
        onClick={handleMine}
        disabled={!canMine || mining}
        className={`
          w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2
          ${canMine
            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800/30 cursor-not-allowed'
          }
          transition-colors
        `}
      >
        {mining ? (
          <>Mining...</>
        ) : canMine ? (
          <>
            <Zap className="h-4 w-4" />
            Mine AGU (+{100 + (wallet?.mine_streak || 0) * 10})
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            Come back in {Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - new Date(wallet!.last_mine_claim_at!).getTime())) / (60 * 60 * 1000))}h
          </>
        )}
      </button>

      {mineError && <div className="mt-2 text-sm text-red-400 text-center">{mineError}</div>}
      {mineSuccess && <div className="mt-2 text-sm text-amber-400 text-center animate-pulse">Mining successful! ✨</div>}
    </div>
  );
}
