"use client";

import { useEffect, useState, useCallback, type JSX } from "react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, RefreshCw, Filter, Users, Sparkles,
  TrendingUp, Eye, Send, Loader2, ChevronDown, ChevronUp, Search,
  Bookmark, MoreHorizontal, ThumbsUp, ThumbsDown, X
} from "lucide-react";

type Interaction = {
  id: string;
  type: string;
  from: { id: string; name: string; name_native: string; avatar?: string | null } | null;
  to: { id: string; name: string; name_native: string; avatar?: string | null } | null;
  content: Record<string, unknown>;
  timestamp: string;
  likes?: number;
  comments?: number;
  shares?: number;
  liked_by_me?: boolean;
};

const INTERACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  visit: { icon: "\u{1F6B6}", label: "Visited", color: "text-blue-400" },
  message: { icon: "\u{1F4AC}", label: "Messaged", color: "text-green-400" },
  gift: { icon: "\u{1F381}", label: "Gifted", color: "text-amber-400" },
  event: { icon: "\u{1F389}", label: "Event", color: "text-purple-400" },
  chance_encounter: { icon: "\u2728", label: "Encountered", color: "text-pink-400" },
  work: { icon: "\u{1F527}", label: "Worked with", color: "text-cyan-400" },
  ignore: { icon: "\u{1F440}", label: "Ignored", color: "text-zinc-400" },
  part: { icon: "\u{1F44B}", label: "Parted", color: "text-zinc-500" },
  mood: { icon: "\u{1F4AD}", label: "Mood", color: "text-rose-400" },
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

interface InteractionCardProps {
  interaction: Interaction;
  isLiked: boolean;
  showComments: boolean;
  commentText: string;
  onLike: (id: string) => void;
  onExpandComment: (id: string | null) => void;
  onComment: (id: string) => void;
  onCommentTextChange: (text: string) => void;
  onShare: (interaction: Interaction) => void;
}

function InteractionCard({
  interaction, isLiked, showComments, commentText,
  onLike, onExpandComment, onComment, onCommentTextChange, onShare,
}: InteractionCardProps): JSX.Element {
  const cfg = (INTERACTION_CONFIG[interaction.type] || {
    icon: "\u{1F440}", label: interaction.type, color: "text-zinc-400",
  }) as { icon: string; label: string; color: string };

  const headerDiv = (
    <div className="flex items-center gap-3 p-4 pb-2">
      {interaction.from ? (
        <Link
          href={`/soul/${interaction.from.id}`}
          className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm font-bold shrink-0 hover:opacity-80 transition-opacity"
        >
          {interaction.from.name?.[0] || "?"}
        </Link>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{cfg.icon}</span>
        {interaction.to ? (
          <Link
            href={`/soul/${interaction.to.id}`}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-sm font-bold shrink-0 hover:opacity-80 transition-opacity"
          >
            {interaction.to.name?.[0] || "?"}
          </Link>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          {interaction.from ? (
            <>
              <Link href={`/soul/${interaction.from.id}`} className="font-medium text-pink-300 hover:underline">
                {interaction.from.name_native || interaction.from.name}
              </Link>
              <span className="text-zinc-500 mx-1">{cfg.label.toLowerCase()}</span>
              {interaction.to ? (
                <Link href={`/soul/${interaction.to.id}`} className="font-medium text-rose-300 hover:underline">
                  {interaction.to.name_native || interaction.to.name}
                </Link>
              ) : null}
            </>
          ) : (
            <span className="text-zinc-400">{cfg.label}</span>
          )}
        </p>
      </div>
      <span className="text-xs text-zinc-600 shrink-0">{formatTime(interaction.timestamp)}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-pink-800/50 transition-colors overflow-hidden">
      {headerDiv}
      {(interaction.content?.message as string) ? (
        <div className="px-4 pb-3">
          <p className="text-sm text-zinc-300 pl-4 border-l-2 border-pink-500/30">
            {interaction.content.message as string}
          </p>
        </div>
      ) : null}
      <div className="px-4 pb-3">
        <span className={`inline-block text-xs px-2.5 py-1 rounded-full bg-zinc-800 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-1 px-4 py-3 border-t border-zinc-800">
        <button
          onClick={() => onLike(interaction.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isLiked ? "text-pink-400 bg-pink-500/10" : "text-zinc-400 hover:text-pink-400 hover:bg-zinc-800"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{interaction.likes || 0}</span>
        </button>
        <button
          onClick={() => onExpandComment(showComments ? null : interaction.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{interaction.comments || 0}</span>
        </button>
        <button
          onClick={() => onShare(interaction)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-green-400 hover:bg-zinc-800 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>{interaction.shares || 0}</span>
        </button>
        <button className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {showComments && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => onCommentTextChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onComment(interaction.id)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-50 focus:border-pink-500 focus:outline-none"
            />
            <button
              onClick={() => onComment(interaction.id)}
              disabled={!commentText.trim()}
              className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SoulSocialPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchInteractions = useCallback(async () => {
    try {
      const res = await fetch("/api/interactions");
      if (res.ok) {
        const data = await res.json();
        setInteractions(data.interactions || data || []);
      }
    } catch {
      // failed silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInteractions();
    setRefreshing(false);
  };

  const handleLike = async (id: string) => {
    try {
      await fetch(`/api/interactions/${id}/like`, { method: "POST" });
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setInteractions((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, likes: item.liked_by_me ? (item.likes || 1) - 1 : (item.likes || 0) + 1, liked_by_me: !item.liked_by_me }
            : item
        )
      );
    } catch {
      // failed silently
    }
  };

  const handleComment = async (id: string) => {
    if (!commentText.trim()) return;
    try {
      await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      setInteractions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, comments: (item.comments || 0) + 1 } : item
        )
      );
      setCommentText("");
      setExpandedComment(null);
    } catch {
      // failed silently
    }
  };

  const handleShare = async (interaction: Interaction) => {
    const slug = interaction.from?.id || interaction.to?.id || interaction.id;
    const shareUrl = `${window.location.origin}/soul/share/${slug}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
    setInteractions((prev) =>
      prev.map((item) =>
        item.id === interaction.id ? { ...item, shares: (item.shares || 0) + 1 } : item
      )
    );
  };

  const filtered = interactions.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fromName = item.from?.name?.toLowerCase() || "";
      const toName = item.to?.name?.toLowerCase() || "";
      if (!fromName.includes(q) && !toName.includes(q)) return false;
    }
    return true;
  });

  const typeStats: Record<string, number> = {};
  interactions.forEach((i) => { typeStats[i.type] = (typeStats[i.type] || 0) + 1; });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Soul Social
                </h1>
                <p className="text-xs text-zinc-500">{interactions.length} interactions</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <RefreshCw className={`h-5 w-5 text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search souls..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                typeFilter === "all" ? "bg-pink-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              All ({interactions.length})
            </button>
            {Object.entries(typeStats).map(([type, count]) => {
              const config = INTERACTION_CONFIG[type] || { icon: "\u{1F440}", label: type, color: "text-zinc-400" };
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    typeFilter === type ? "bg-pink-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {config.icon} {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <p className="text-zinc-500">Loading interactions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Sparkles className="h-12 w-12 text-zinc-700" />
            <p className="text-zinc-500">
              {searchQuery
                ? "Try adjusting your search or filters."
                : "Souls are still getting to know each other."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                isLiked={likedPosts.has(interaction.id)}
                showComments={expandedComment === interaction.id}
                commentText={expandedComment === interaction.id ? commentText : ""}
                onLike={handleLike}
                onExpandComment={setExpandedComment}
                onComment={handleComment}
                onCommentTextChange={setCommentText}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
