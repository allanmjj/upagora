'use client';

/**
 * SoulMemoryDisplay — Shows conversation history and memory context
 * in the chat interface. Makes the soul's memory visible to the user.
 *
 * Features:
 * - Recent conversation summary per user+soul pair
 * - Memory injection status indicator
 * - Quick actions: Reinforce / Forget memories
 * - Visual memory strength indicator
 *
 * Usage: Drop into any SoulChat component
 *   <SoulMemoryDisplay soulId={soul.id} userId={user?.id} />
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Brain, MessageSquare, Clock, Trash2, Heart, TrendingUp, Sparkles, Eye, BookOpen } from 'lucide-react';

interface MemoryEntry {
  id: string;
  content: string;
  summary: string;
  created_at: string;
  strength?: number;
  reinforced?: boolean;
}

interface SoulMemoryDisplayProps {
  soulId: string;
  userId?: string;
  maxDisplay?: number;
  onReinforce?: (memoryId: string) => void;
  onForget?: (memoryId: string) => void;
}

export function SoulMemoryDisplay({
  soulId,
  userId,
  maxDisplay = 5,
  onReinforce,
  onForget,
}: SoulMemoryDisplayProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMemories = useCallback(async () => {
    if (!soulId || !userId) {
      setLoading(false);
      setTotalCount(0);
      return;
    }

    try {
      const token = localStorage.getItem('sb-access-token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/soul/memories?soul_id=${soulId}&limit=${maxDisplay * 3}`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      logger.warn('[SoulMemoryDisplay] Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  }, [soulId, userId, maxDisplay]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const memoryStrengthColor = (strength?: number): string => {
    if (!strength) return 'text-zinc-500';
    if (strength >= 80) return 'text-emerald-400';
    if (strength >= 60) return 'text-amber-400';
    if (strength >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const memoryStrengthBar = (strength?: number): string => {
    if (!strength) return 'bg-zinc-600';
    if (strength >= 80) return 'bg-emerald-400';
    if (strength >= 60) return 'bg-amber-400';
    if (strength >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2">
        <Brain className="w-3 h-3 animate-pulse" />
        Loading memories...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-600 px-3 py-2">
        <Brain className="w-3 h-3" />
        <span>Sign in to enable conversation memory</span>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-600 px-3 py-2">
        <BookOpen className="w-3 h-3" />
        <span>This soul doesn&apos;t remember you yet. Start a conversation!</span>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-zinc-300">
            Soul Memory ({totalCount} conversations)
          </span>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {totalCount > 0 ? `${Math.round((totalCount / 10) * 100)}% relationship depth` : 'New connection'}
          </span>
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800 px-3 py-2">
          {/* Memory strength overview */}
          <div className="flex items-center gap-4 mb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-blue-400" />
              <span className="text-zinc-400">Remembering:</span>
              <span className="text-blue-400 font-medium">{totalCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-zinc-400">Bond:</span>
              <span className="text-emerald-400 font-medium">
                {totalCount < 3 ? 'Acquaintance' : totalCount < 10 ? 'Friend' : 'Close bond'}
              </span>
            </div>
          </div>

          {/* Memory list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {memories.slice(0, maxDisplay).map((memory) => (
              <div
                key={memory.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/20 hover:border-zinc-700/50 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 line-clamp-2">{memory.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(memory.created_at)}
                    </span>
                    {memory.strength !== undefined && (
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${memoryStrengthBar(memory.strength)}`}
                            style={{ width: `${memory.strength}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono ${memoryStrengthColor(memory.strength)}`}>
                          {memory.strength}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onReinforce?.(memory.id)}
                    className="p-1 rounded hover:bg-purple-500/20 text-zinc-500 hover:text-purple-400 transition-colors"
                    title="Reinforce this memory"
                  >
                    <Heart className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onForget?.(memory.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Forget this memory"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {totalCount > maxDisplay && (
            <p className="text-xs text-zinc-600 mt-2 text-center">
              Showing {maxDisplay} of {totalCount} memories
            </p>
          )}
        </div>
      )}
    </div>
  );
}
