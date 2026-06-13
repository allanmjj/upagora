"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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

// Icon mapping for notification types
function getNotificationIcon(type: string): string {
  switch (type) {
    case "daily_report": return "📋";
    case "soul_event": return "🌟";
    case "encounter": return "💬";
    case "external_soul": return "👻";
    case "soul_proactive": return "💌";
    default: return "🔔";
  }
}

// Special styling for proactive messages
function isProactive(type: string): boolean {
  return type === "soul_proactive";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
      setLoading(false);
    }

    loadNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", notifications.filter(n => !n.is_read).map(n => n.id));

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMessage = (type: string, soul_id?: string) => {
    if (type === "soul_proactive" && soul_id) {
      // Open chat with the soul that reached out
      router.push(`/chat?soul=${soul_id}`);
    } else if (type === "daily_report" && soul_id) {
      router.push(`/town/report/${soul_id}`);
    } else if (type === "soul_event" && soul_id) {
      router.push(`/chat?soul=${soul_id}`);
    } else {
      router.push("/town");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-zinc-400 animate-pulse">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🔔 Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => router.push("/town")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            ← Back to Town
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-6">
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="mb-4 text-4xl">📭</div>
            <p className="text-zinc-400">No notifications yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              You&apos;ll see notifications when your souls have activity in town.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const proactive = isProactive(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    handleMessage(notif.type, notif.soul_id);
                  }}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    proactive
                      ? notif.is_read
                        ? "border-pink-900/30 bg-pink-950/10 hover:bg-pink-950/20"
                        : "border-pink-800/50 bg-pink-950/30 hover:bg-pink-950/40"
                      : notif.is_read
                        ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                        : "border-indigo-900/50 bg-indigo-950/20 hover:bg-indigo-950/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-xl">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${proactive ? "text-pink-300" : ""}`}>
                          {notif.title}
                          {!notif.is_read && (
                            <span className={`ml-2 h-2 w-2 rounded-full ${proactive ? "bg-pink-500" : "bg-indigo-500"}`} />
                          )}
                        </h3>
                        <span className="text-xs text-zinc-500">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${proactive ? "italic text-pink-200/70" : "text-zinc-400"}`}>
                        {proactive && `"${notif.message}"`}
                        {!proactive && notif.message}
                      </p>
                      {notif.soul_name && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Soul: {notif.soul_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
