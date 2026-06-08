"use client";

import { useEffect, useState } from "react";
import { logger } from '@/lib/logger';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '@/hooks/use-auth';

interface Soul {
  id: string;
  name: string;
  name_native: string;
  avatar: string;
  language: string;
  category: string;
  mood: string;
  energy: number;
  social_need: number;
  is_in_town: boolean;
  current_region: string;
  last_activity: string;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  soul_id?: string;
  soul_name?: string;
  is_read: boolean;
  created_at: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨",
};

export default function GuardianDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [souls, setSouls] = useState<Soul[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/dashboard', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        setSouls(data.souls || []);
        setNotifications(data.notifications || []);
      } catch (e) {
        logger.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-zinc-400 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <p className="text-zinc-400">Please sign in to view your dashboard.</p>
            <Link href="/login" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🛡️ Guardian Dashboard</h1>
          <span className="text-sm text-zinc-400">{souls.length} souls under your care</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            🔔 Notifications
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <Link href="/town" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500">
            🌆 View Town
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Total Souls</div>
            <div className="mt-1 text-2xl font-bold">{souls.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">In Town Now</div>
            <div className="mt-1 text-2xl font-bold text-green-400">
              {souls.filter(s => s.is_in_town).length}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Avg Energy</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {souls.length > 0 
                ? Math.round(souls.reduce((sum, s) => sum + s.energy, 0) / souls.length)
                : 0}%
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Unread Notifications</div>
            <div className="mt-1 text-2xl font-bold text-amber-400">{unreadCount}</div>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Recent Notifications</h2>
              <button
                onClick={() => router.push("/notifications")}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-center text-zinc-500">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-lg border p-3 ${
                      notif.is_read
                        ? "border-zinc-800 bg-zinc-900"
                        : "border-indigo-900/50 bg-indigo-950/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {notif.type === "daily_report" && "📋"}
                        {notif.type === "soul_event" && "🌟"}
                        {notif.type === "encounter" && "💬"}
                        {!["daily_report", "soul_event", "encounter"].includes(notif.type) && "🔔"}
                        <span className="font-medium">{notif.title}</span>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{notif.message}</p>
                    {notif.soul_name && (
                      <p className="mt-1 text-xs text-zinc-500">Soul: {notif.soul_name}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Souls Grid */}
        <h2 className="mb-4 font-bold">Your Souls</h2>
        {souls.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="mb-4 text-4xl">👻</div>
            <p className="text-zinc-400">You haven&apos;t been assigned to any souls yet.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/soul" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500">
                Create Your First Soul
              </Link>
              <Link href="/discovery" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                Discover Souls
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {souls.map((soul) => (
              <div
                key={soul.id}
                className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-indigo-500 hover:bg-zinc-800"
                onClick={() => router.push(`/profile/${soul.id}`)}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-4xl">{soul.avatar}</div>
                  <div className="flex items-center gap-2">
                    {soul.is_in_town && (
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                    <span className="text-xs text-zinc-400 capitalize">{soul.category}</span>
                  </div>
                </div>

                <h3 className="mb-1 font-bold">{soul.name}</h3>
                <div className="mb-3 text-sm text-zinc-400">{soul.name_native}</div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Mood</span>
                    <span>{MOOD_EMOJIS[soul.mood] || "🤔"} {soul.mood}</span>
                  </div>
                  
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>Energy</span>
                      <span>{soul.energy}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                        style={{ width: `${soul.energy}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>Social Energy</span>
                      <span>{soul.social_need}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-400"
                        style={{ width: `${soul.social_need}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                  <span>📍 {soul.current_region}</span>
                  <span>
                    {soul.is_in_town ? "In Town" : "Away"}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/town/report/${soul.id}`);
                    }}
                    className="flex-1 rounded-lg border border-zinc-700 py-1.5 text-xs hover:bg-zinc-800"
                  >
                    📋 Report
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/chat?soul=${soul.id}`);
                    }}
                    className="flex-1 rounded-lg border border-zinc-700 py-1.5 text-xs hover:bg-zinc-800"
                  >
                    💬 Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
