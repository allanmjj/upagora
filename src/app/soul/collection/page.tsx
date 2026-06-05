'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import {
  Trophy, Star, Zap, Wallet, Ghost, Share2, ChevronRight,
  Crown, Shield, Sparkles, Brain, Heart, MessageCircle,
  Pickaxe, TrendingUp, Lock, Award, Gift
} from 'lucide-react';
import { SoulShareModal } from '@/components/soul/SoulShareModal';

// ---- Types ----
interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  earned_at?: string;
}

interface SoulCard {
  id: string;
  name: string;
  name_native: string;
  avatar: string;
  category: string;
  color?: string;
  era?: string;
  created_at: string;
  status?: string;
  is_preset?: boolean;
}

interface WalletData {
  agu_balance: number;
  agu_lifetime_earned: number;
  agu_lifetime_spent: number;
  mine_streak: number;
  total_blocks_mined: number;
  last_mine_claim_at: string | null;
}

interface Transaction {
  id: string;
  amount_agu: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const categoryIcons: Record<string, string> = {
  philosopher: '🏛️', scholar: '📚', scientist: '🔬', artist: '🎨',
  leader: '👑', writer: '✍️', poet: '📜', founder: '🚀',
  military: '⚔️', mystic: '🔮', custom: '🌟',
};

// Rarity tiers based on soul age and calibration
function getRarity(createdAt: string, status?: string): { label: string; color: string; glow: string } {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  if (status === 'evolved' || days > 180) return { label: 'Legendary', color: 'text-amber-400', glow: 'shadow-amber-500/20' };
  if (status === 'calibrated' || days > 30) return { label: 'Rare', color: 'text-purple-400', glow: 'shadow-purple-500/20' };
  if (status === 'newborn' || days <= 7) return { label: 'Newborn', color: 'text-emerald-400', glow: 'shadow-emerald-500/20' };
  return { label: 'Common', color: 'text-sky-400', glow: 'shadow-sky-500/20' };
}

export default function SoulCollectionPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [unearnedBadges, setUnearnedBadges] = useState<BadgeDef[]>([]);
  const [souls, setSouls] = useState<SoulCard[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'collection' | 'badges' | 'wallet'>('collection');
  const [mineLoading, setMineLoading] = useState(false);
  const [mineResult, setMineResult] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedSoul, setSelectedSoul] = useState<SoulCard | null>(null);

  // Load collection data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch soul gallery
      const soulsRes = await fetch('/api/soul/gallery');
      if (soulsRes.ok) {
        const soulsData = await soulsRes.json();
        setSouls(soulsData.souls || soulsData || []);
      }

      // Fetch badges
      const badgesRes = await fetch('/api/settings/badges');
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setBadges(badgesData.earned || []);
        setUnearnedBadges(badgesData.available?.filter((b: BadgeDef) =>
          !badgesData.earned?.some((e: BadgeDef) => e.id === b.id)
        ) || []);
      }

      // Fetch economy
      const econRes = await fetch('/api/soul/economy?mode=status');
      if (econRes.ok) {
        const econData = await econRes.json();
        setWallet(econData.wallet || null);
        setTransactions(econData.transactions || []);
      }
    } catch (err) {
      logger.error('Failed to load collection data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pickaxe action
  const handleMine = async () => {
    setMineLoading(true);
    setMineResult(null);
    try {
      const res = await fetch('/api/soul/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mine' }),
      });
      const data = await res.json();
      if (data.result?.error) {
        setMineResult(`⏳ ${data.result.error}`);
      } else if (data.result?.mined_agu) {
        setMineResult(`⛏️ Mined ${data.result.mined_agu} AGU!`);
        setWallet(data.result.wallet || wallet);
        setTimeout(() => setMineResult(null), 3000);
      }
    } catch {
      setMineResult('⛏️ Pickaxe failed. Try again.');
    } finally {
      setMineLoading(false);
    }
  };

  // Computed stats
  const totalSouls = souls.length;
  const earnedCount = badges.length;
  const totalCount = earnedCount + unearnedBadges.length;
  const collectionLevel = Math.floor(totalSouls / 3) + 1;
  const xpProgress = ((totalSouls % 3) / 3) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <Ghost className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-zinc-400 animate-pulse">Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-amber-400" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  Soul Collection
                </h1>
              </div>
              <p className="text-zinc-400">Your distilled souls, achievements, and cosmic currency</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Collection Level</div>
              <div className="text-2xl font-bold">{collectionLevel}</div>
              <div className="w-32 h-2 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500 mt-1">{totalSouls % 3}/3 to next level</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Ghost className="w-4 h-4" /> Souls
              </div>
              <div className="text-2xl font-bold mt-1">{totalSouls}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Award className="w-4 h-4" /> Badges
              </div>
              <div className="text-2xl font-bold mt-1">{earnedCount}/{totalCount}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Wallet className="w-4 h-4" /> AGU Balance
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-400">
                {wallet?.agu_balance?.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Pickaxe className="w-4 h-4" /> Pickaxe Streak
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-400">
                {wallet?.mine_streak || 0} days
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6">
            {[
              { key: 'collection' as const, label: 'Souls', icon: Ghost },
              { key: 'badges' as const, label: 'Badges', icon: Award },
              { key: 'wallet' as const, label: 'Wallet', icon: Wallet },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {/* ---- SOULS COLLECTION ---- */}
        {activeTab === 'collection' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Distilled Souls</h2>
              <button
                onClick={() => router.push('/distill')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Distill New Soul
              </button>
            </div>

            {souls.length === 0 ? (
              <div className="text-center py-20">
                <Ghost className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl text-zinc-500 mb-2">No souls yet</h3>
                <p className="text-zinc-600 mb-6">Distill your first soul to start your collection</p>
                <button
                  onClick={() => router.push('/distill')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
                >
                  Start Distilling
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {souls.map((soul) => {
                  const rarity = getRarity(soul.created_at, soul.status);
                  return (
                    <div
                      key={soul.id}
                      className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer"
                      onClick={() => router.push(`/soul/${soul.id}`)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl shadow-lg ${rarity.glow}`}>
                          {soul.avatar || (categoryIcons[soul.category] || '🌟')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{soul.name_native || soul.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-800 ${rarity.color}`}>
                              {rarity.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-500">{categoryIcons[soul.category] || ''} {soul.category}</span>
                            {soul.era && (
                              <span className="text-xs text-zinc-600">
                                · {soul.era}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-zinc-600">
                              {new Date(soul.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSoul(soul);
                                  setShareModalOpen(true);
                                }}
                                className="text-zinc-500 hover:text-indigo-400 transition-colors"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- BADGES ---- */}
        {activeTab === 'badges' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Achievement Badges</h2>
              <p className="text-zinc-400 text-sm">Earn badges by distilling souls, chatting, and exploring</p>
            </div>

            {/* Earned badges */}
            {badges.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Earned ({badges.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                        {badge.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-amber-400">{badge.name}</h4>
                        <p className="text-sm text-zinc-400">{badge.description}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Earned{badge.earned_at ? ` ${new Date(badge.earned_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unearned badges */}
            {unearnedBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Locked ({unearnedBadges.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unearnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 opacity-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl grayscale">
                        {badge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-zinc-400">{badge.name}</h4>
                          <Lock className="w-3 h-3 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-500">{badge.description}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Need {badge.threshold} to unlock
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share progress */}
            {badges.length > 0 && (
              <div className="mt-8 p-6 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Share2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold">Share Your Collection</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Show off your soul collection to the world. Share a link to your collection profile.
                </p>
                <button
                  onClick={() => router.push('/soul/social')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Share on Social Feed
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- WALLET ---- */}
        {activeTab === 'wallet' && (
          <div>
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-700/5 border border-emerald-500/20 rounded-xl p-6">
                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                  <Wallet className="w-4 h-4" /> AGU Balance
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {wallet?.agu_balance?.toLocaleString() || 0}
                </div>
                <button
                  onClick={handleMine}
                  disabled={mineLoading}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {mineLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Pickaxe className="w-4 h-4" />
                  )}
                  {mineLoading ? 'Pickaxe...' : 'Mine AGU'}
                </button>
                {mineResult && (
                  <div className="mt-2 text-sm text-amber-400 animate-pulse">{mineResult}</div>
                )}
                {wallet && (
                  <p className="text-xs text-zinc-500 mt-2">
                    {wallet.mine_streak} day streak · {wallet.total_blocks_mined} total blocks
                  </p>
                )}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" /> Lifetime Earned
                </div>
                <div className="text-3xl font-bold">{wallet?.agu_lifetime_earned?.toLocaleString() || 0}</div>
                <p className="text-xs text-zinc-500 mt-2">Total AGU mined</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Gift className="w-4 h-4" /> Lifetime Spent
                </div>
                <div className="text-3xl font-bold">{wallet?.agu_lifetime_spent?.toLocaleString() || 0}</div>
                <p className="text-xs text-zinc-500 mt-2">On properties & trades</p>
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800">
                  <Wallet className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No transactions yet</p>
                  <p className="text-zinc-600 text-sm mt-1">Start mining AGU to build your cosmic balance</p>
                </div>
              ) : (
                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
                  {transactions.map((tx, i) => (
                    <div
                      key={tx.id || i}
                      className={`flex items-center justify-between px-5 py-4 ${
                        i > 0 ? 'border-t border-zinc-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.transaction_type === 'mine'
                            ? 'bg-amber-500/10 text-amber-400'
                            : tx.transaction_type === 'property_sale'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-sky-500/10 text-sky-400'
                        }`}>
                          {tx.transaction_type === 'mine' ? (
                            <Pickaxe className="w-5 h-5" />
                          ) : (
                            <Gift className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description || tx.transaction_type}</p>
                          <p className="text-xs text-zinc-500">
                            {tx.transaction_type} · {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className={`font-semibold ${
                        tx.amount_agu >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.amount_agu >= 0 ? '+' : ''}{tx.amount_agu.toLocaleString()} AGU
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Soul Share Modal */}
      {selectedSoul && (
        <SoulShareModal
          soulId={selectedSoul.id}
          soulName={selectedSoul.name}
          soulNameNative={selectedSoul.name_native}
          soulAvatar={selectedSoul.avatar}
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedSoul(null);
          }}
        />
      )}
    </div>
  );
}
