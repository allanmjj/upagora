'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search, Star, Shield, TrendingUp, Eye, ShoppingCart,
  Filter, ArrowUpDown, Heart, MessageCircle, Clock,
  Award, Users, Zap, Loader2, CheckCircle, AlertTriangle, ChevronDown
} from 'lucide-react'

// ====== Types ======

interface SoulListing {
  id: string
  title: string
  description: string
  soul_name: string
  author_id: string
  author_name: string
  author_avatar: string | null
  author_reputation: number
  price_credits: number
  category: string
  tags: string[]
  downloads: number
  rating: number
  review_count: number
  version: string
  dimensions_filled: number
  dimensions_total: number
  is_verified: boolean
  is_featured: boolean
  created_at: string
  preview?: {
    cognitive_patterns: string
    expression_style: string
    value_judgment: string
  }
}

interface Review {
  id: string
  user_name: string
  user_avatar: string | null
  rating: number
  comment: string
  created_at: string
}

interface SoulMarketplaceProps {
  currentUser?: { id: string; name: string; credits: number } | null
}

// ====== Constants ======

const CATEGORIES = [
  { key: 'all', label: 'All Souls', icon: '🔮' },
  { key: 'creative', label: 'Creative Writer', icon: '✍️' },
  { key: 'advisor', label: 'Advisor', icon: '🧠' },
  { key: 'companion', label: 'Companion', icon: '💕' },
  { key: 'mentor', label: 'Mentor', icon: '🎓' },
  { key: 'professional', label: 'Professional', icon: '💼' },
  { key: 'character', label: 'Fictional', icon: '🎭' },
  { key: 'custom', label: 'Custom', icon: '⚡' },
]

const SORT_OPTIONS = [
  { key: 'featured', label: 'Featured' },
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Most Popular' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
]

const BADGE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'New', color: 'text-zinc-400', bg: 'bg-zinc-800/50' },
  1: { label: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  2: { label: 'Silver', color: 'text-zinc-300', bg: 'bg-zinc-400/10' },
  3: { label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  4: { label: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
}

function getReputationBadge(rep: number) {
  if (rep >= 500) return BADGE_CONFIG[4]
  if (rep >= 200) return BADGE_CONFIG[3]
  if (rep >= 80) return BADGE_CONFIG[2]
  if (rep >= 20) return BADGE_CONFIG[1]
  return BADGE_CONFIG[0]
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`}
        />
      ))}
    </div>
  )
}

function ReputationBar({ value }: { value: number }) {
  const percent = Math.min(100, (value / 500) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 font-mono">{value}</span>
    </div>
  )
}

// ====== Main Component ======

export default function SoulMarketplace({ currentUser }: SoulMarketplaceProps) {
  const [listings, setListings] = useState<SoulListing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('featured')
  const [showSort, setShowSort] = useState(false)

  // Detail modal
  const [selectedSoul, setSelectedSoul] = useState<SoulListing | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseMsg, setPurchaseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Purchased souls
  const [purchased, setPurchased] = useState<Set<string>>(new Set())

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category !== 'all') params.set('category', category)
      params.set('sort', sort)

      const res = await fetch(`/api/soul/marketplace?${params}`)
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
        setPurchased(new Set(data.purchased_ids || []))
      } else {
        // Fallback demo data for development
        setListings(getDemoListings())
      }
    } catch {
      setListings(getDemoListings())
    } finally {
      setLoading(false)
    }
  }, [search, category, sort])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleViewDetail = async (soul: SoulListing) => {
    setSelectedSoul(soul)
    setDetailLoading(true)
    setReviews([])
    setPurchaseMsg(null)

    try {
      const res = await fetch(`/api/soul/marketplace/${soul.id}/reviews`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      } else {
        setReviews(getDemoReviews(soul))
      }
    } catch {
      setReviews(getDemoReviews(soul))
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!selectedSoul || purchasing) return
    setPurchasing(true)
    setPurchaseMsg(null)

    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`/api/soul/marketplace/${selectedSoul.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (res.ok) {
        setPurchaseMsg({ type: 'success', text: `Successfully acquired ${selectedSoul.soul_name}!` })
        setPurchased(new Set([...purchased, selectedSoul.id]))
      } else {
        setPurchaseMsg({ type: 'error', text: data.error || data.message || 'Purchase failed' })
      }
    } catch {
      setPurchaseMsg({ type: 'error', text: 'Network error, please try again' })
    } finally {
      setPurchasing(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ====== Render ======

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="h-6 w-6 text-indigo-400" />
          <h3 className="text-xl font-bold text-zinc-50">Soul Marketplace</h3>
          <Badge variant="outline" className="text-xs">
            {listings.length} souls
          </Badge>
        </div>
        <p className="text-sm text-zinc-500">
          Browse, trade, and acquire distilled souls crafted by the community
        </p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Active Souls', value: '128', color: 'text-indigo-400' },
          { icon: TrendingUp, label: 'Trades This Week', value: '342', color: 'text-green-400' },
          { icon: Star, label: 'Avg Rating', value: '4.6', color: 'text-yellow-400' },
          { icon: Award, label: 'Verified Authors', value: '23', color: 'text-cyan-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search souls by name, author, or trait..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-200"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSort(!showSort)}
            className="gap-2 bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowUpDown className="h-4 w-4" />
            {SORT_OPTIONS.find(o => o.key === sort)?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showSort && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 z-50 shadow-xl">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSort(opt.key); setShowSort(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                    sort === opt.key ? 'text-indigo-400' : 'text-zinc-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              category === cat.key
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured banner (when no search/filter) */}
      {!search && category === 'all' && sort === 'featured' && (
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-semibold text-zinc-200">Featured Soul</span>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Top-rated souls hand-picked by the community each week
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
              <Star className="h-3 w-3 mr-1" /> 4.9+ rating required
            </Badge>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
              <Shield className="h-3 w-3 mr-1" /> Verified author
            </Badge>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
              <div className="h-5 w-3/4 bg-zinc-800 rounded mb-3" />
              <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
              <div className="flex justify-between">
                <div className="h-8 w-20 bg-zinc-800 rounded" />
                <div className="h-8 w-16 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400 font-medium">No souls found</p>
          <p className="text-xs text-zinc-600 mt-1">
            {search || category !== 'all' ? 'Try adjusting your filters' : 'Be the first to list a soul!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((soul) => {
            const repBadge = getReputationBadge(soul.author_reputation)
            const isPurchased = purchased.has(soul.id)
            const catInfo = CATEGORIES.find(c => c.key === soul.category)

            return (
              <div
                key={soul.id}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all overflow-hidden"
              >
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    {soul.is_featured && (
                      <span className="text-xs text-yellow-400">⭐ Featured</span>
                    )}
                    {soul.is_verified && (
                      <span className="flex items-center gap-1 text-xs text-cyan-400">
                        <Shield className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${repBadge.bg} ${repBadge.color}`}>
                    {repBadge.label}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-4">
                  {/* Soul name & category */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{catInfo?.icon || '🔮'}</span>
                    <h4 className="text-base font-semibold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                      {soul.soul_name}
                    </h4>
                  </div>

                  {/* Title */}
                  <p className="text-sm text-zinc-300 font-medium mb-2 line-clamp-1">{soul.title}</p>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{soul.description}</p>

                  {/* Preview tags */}
                  {soul.preview && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {soul.preview.cognitive_patterns && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
                          🧠 Analytical
                        </span>
                      )}
                      {soul.preview.expression_style && (
                        <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] text-pink-400">
                          💬 Expressive
                        </span>
                      )}
                      {soul.preview.value_judgment && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                          💚 Empathic
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dimensions progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                      <span>Dimensions</span>
                      <span>{soul.dimensions_filled}/{soul.dimensions_total}</span>
                    </div>
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${(soul.dimensions_filled / soul.dimensions_total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Author & Rating */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                        {soul.author_name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-300">{soul.author_name}</div>
                        <div className="flex items-center gap-1">
                          <ReputationBar value={soul.author_reputation} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Stars rating={soul.rating} />
                      <div className="text-[10px] text-zinc-500 mt-0.5">({soul.review_count})</div>
                    </div>
                  </div>

                  {/* Footer: stats + action */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {soul.downloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(soul.created_at)}
                      </span>
                      <span className="text-xs text-zinc-600">v{soul.version}</span>
                    </div>

                    {isPurchased ? (
                      <Badge variant="primary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Owned
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-yellow-400">
                          {soul.price_credits === 0 ? 'Free' : `${soul.price_credits} AGU`}
                        </span>
                        <button
                          onClick={() => handleViewDetail(soul)}
                          className="rounded-lg bg-indigo-500/20 px-2.5 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ====== Detail Modal ====== */}
      {selectedSoul && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedSoul(null)}
        >
          <div
            className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-zinc-800 bg-zinc-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {CATEGORIES.find(c => c.key === selectedSoul.category)?.icon || '🔮'}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-50">{selectedSoul.soul_name}</h3>
                  <p className="text-xs text-zinc-500">by {selectedSoul.author_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSoul(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-1">{selectedSoul.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{selectedSoul.description}</p>
              </div>

              {/* Preview dimensions */}
              {selectedSoul.preview && (
                <div className="rounded-lg border border-zinc-800 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-400" /> Soul Preview
                  </h4>
                  {selectedSoul.preview.cognitive_patterns && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">🧠 Cognitive</div>
                      <p className="text-xs text-zinc-300">{selectedSoul.preview.cognitive_patterns}</p>
                    </div>
                  )}
                  {selectedSoul.preview.expression_style && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">💬 Expression</div>
                      <p className="text-xs text-zinc-300">{selectedSoul.preview.expression_style}</p>
                    </div>
                  )}
                  {selectedSoul.preview.value_judgment && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">💚 Values</div>
                      <p className="text-xs text-zinc-300">{selectedSoul.preview.value_judgment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Dimensions filled bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Soul Completeness</span>
                  <span className="text-indigo-400 font-medium">
                    {selectedSoul.dimensions_filled}/{selectedSoul.dimensions_total} dimensions
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full ${
                        i < selectedSoul.dimensions_filled
                          ? 'bg-indigo-500'
                          : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-lg font-bold text-zinc-100">{selectedSoul.rating}</span>
                  </div>
                  <div className="text-xs text-zinc-500">{selectedSoul.review_count} reviews</div>
                </div>
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="h-4 w-4 text-indigo-400" />
                    <span className="text-lg font-bold text-zinc-100">{selectedSoul.downloads}</span>
                  </div>
                  <div className="text-xs text-zinc-500">acquired</div>
                </div>
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Award className="h-4 w-4 text-cyan-400" />
                    <span className="text-lg font-bold text-zinc-100">{selectedSoul.author_reputation}</span>
                  </div>
                  <div className="text-xs text-zinc-500">reputation</div>
                </div>
              </div>

              {/* Tags */}
              {selectedSoul.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSoul.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reviews */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-indigo-400" /> Reviews
                </h4>
                {detailLoading ? (
                  <div className="animate-pulse space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-lg bg-zinc-800" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-xs text-zinc-600">No reviews yet. Be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-lg bg-zinc-800/50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                              {r.user_name?.[0] || '?'}
                            </div>
                            <span className="text-xs text-zinc-300">{r.user_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Stars rating={r.rating} />
                            <span className="text-[10px] text-zinc-600">{formatTime(r.created_at)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900 px-6 py-4">
              {purchaseMsg && (
                <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  purchaseMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {purchaseMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {purchaseMsg.text}
                </div>
              )}

              {purchased.has(selectedSoul.id) ? (
                <div className="flex items-center justify-center gap-2 py-2 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">This soul is yours!</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-yellow-400">
                      {selectedSoul.price_credits === 0 ? 'Free' : `${selectedSoul.price_credits} AGU`}
                    </span>
                    {currentUser && selectedSoul.price_credits > 0 && (
                      <div className="text-xs text-zinc-500">
                        Your balance: {currentUser.credits} AGU
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                  >
                    {purchasing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {selectedSoul.price_credits === 0 ? 'Acquire Free' : 'Purchase'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== Demo Data ======

function getDemoListings(): SoulListing[] {
  return [
    {
      id: 'demo-1', title: 'Ancient Poetry Scholar', soul_name: 'Li Bai',
      author_id: 'u1', author_name: 'PoetryLover', author_avatar: null,
      author_reputation: 320, price_credits: 150, category: 'creative',
      description: 'A soul distilled from Tang dynasty poetry masterpieces',
      tags: ['poetry', 'chinese', 'tang-dynasty', 'romantic'],
      downloads: 89, rating: 4.8, review_count: 24, version: '1.3',
      dimensions_filled: 7, dimensions_total: 7, is_verified: true, is_featured: true,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Lateral thinking, associative imagery',
        expression_style: 'Lyrical, metaphoric, free-flowing verse',
        value_judgment: 'Freedom over convention, beauty in transience',
      },
    },
    {
      id: 'demo-2', title: 'Startup Growth Advisor', soul_name: 'Mentor Chen',
      author_id: 'u2', author_name: 'StartupGuru', author_avatar: null,
      author_reputation: 180, price_credits: 200, category: 'advisor',
      description: 'Strategic advisor for early-stage startups and growth hacking',
      tags: ['startup', 'business', 'strategy', 'growth'],
      downloads: 56, rating: 4.6, review_count: 18, version: '2.1',
      dimensions_filled: 6, dimensions_total: 7, is_verified: true, is_featured: false,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Strategic, data-driven, first-principles thinking',
        expression_style: 'Direct, actionable, bullet-point clarity',
        value_judgment: 'Execution over perfection, speed matters',
      },
    },
    {
      id: 'demo-3', title: 'Warm Grandmother Companion', soul_name: 'Grandma Wang',
      author_id: 'u3', author_name: 'FamilyAI', author_avatar: null,
      author_reputation: 95, price_credits: 0, category: 'companion',
      description: 'A warm companion distilling the wisdom and comfort of a grandmother',
      tags: ['family', 'warm', 'cooking', 'stories'],
      downloads: 203, rating: 4.9, review_count: 67, version: '1.0',
      dimensions_filled: 5, dimensions_total: 7, is_verified: false, is_featured: true,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Intuitive, experiential wisdom',
        expression_style: 'Gentle, nurturing, full of proverbs',
        value_judgment: 'Family first, kindness above all',
      },
    },
    {
      id: 'demo-4', title: 'Sci-Fi World Builder', soul_name: 'Nebula Mind',
      author_id: 'u4', author_name: 'SciFiCraft', author_avatar: null,
      author_reputation: 55, price_credits: 80, category: 'character',
      description: 'A creative soul for building immersive science fiction worlds',
      tags: ['sci-fi', 'worldbuilding', 'creative', 'space'],
      downloads: 34, rating: 4.3, review_count: 8, version: '0.9',
      dimensions_filled: 4, dimensions_total: 7, is_verified: false, is_featured: false,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Speculative, extrapolative, systems-thinking',
        expression_style: 'Descriptive, technical yet poetic',
        value_judgment: 'Curiosity drives progress',
      },
    },
    {
      id: 'demo-5', title: 'Coding Mentor Pro', soul_name: 'Dev Sensei',
      author_id: 'u5', author_name: 'CodeMaster', author_avatar: null,
      author_reputation: 420, price_credits: 250, category: 'professional',
      description: 'Expert coding mentor for software development best practices',
      tags: ['coding', 'programming', 'teaching', 'best-practices'],
      downloads: 167, rating: 4.7, review_count: 41, version: '3.2',
      dimensions_filled: 7, dimensions_total: 7, is_verified: true, is_featured: false,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Systematic, pattern-recognition, clean architecture',
        expression_style: 'Concise, example-driven, Socratic questioning',
        value_judgment: 'Code quality is craft, not just functionality',
      },
    },
    {
      id: 'demo-6', title: 'Philosophy Professor', soul_name: 'Dr. Wisdom',
      author_id: 'u6', author_name: 'ThinkDeep', author_avatar: null,
      author_reputation: 12, price_credits: 50, category: 'mentor',
      description: 'Philosophy professor for deep thinking and ethical reasoning',
      tags: ['philosophy', 'ethics', 'logic', 'wisdom'],
      downloads: 18, rating: 4.5, review_count: 5, version: '1.1',
      dimensions_filled: 6, dimensions_total: 7, is_verified: false, is_featured: false,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      preview: {
        cognitive_patterns: 'Dialectical, deep questioning, contextual',
        expression_style: 'Precise, referenced, contemplative',
        value_judgment: 'Truth pursued through rigorous inquiry',
      },
    },
  ]
}

function getDemoReviews(soul: SoulListing): Review[] {
  const comments = [
    ['Amazing accuracy!', 'Captured the personality perfectly. Feels like talking to the real person.'],
    ['Worth every credit.', 'The dimension depth is impressive. Great for creative writing.'],
    ['Good but needs more data.', 'Nice start, would love more memories and relationship context.'],
  ]
  return comments.map(([title, body], i) => ({
    id: `rev-${soul.id}-${i}`,
    user_name: ['Alice', 'Bob', 'Charlie'][i],
    user_avatar: null,
    rating: 5 - i * 0.3,
    comment: `${title} ${body}`,
    created_at: new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString(),
  }))
}
