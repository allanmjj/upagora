"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MessageSquare,
  Moon,
  Sun,
  Star,
  Sparkles,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Priority = "high" | "medium" | "low";
type EventType = "deep_conversation" | "check_in" | "quiet_reflection";

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-amber-500/20 border-amber-500/50 text-amber-300",
  medium: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  low: "bg-zinc-700/30 border-zinc-600/40 text-zinc-400",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "最佳互动日",
  medium: "日常问候",
  low: "安静反思",
};

const EVENT_TYPE_ICONS: Record<EventType, React.ReactNode> = {
  deep_conversation: <Sparkles className="w-4 h-4 text-amber-400" />,
  check_in: <MessageSquare className="w-4 h-4 text-blue-400" />,
  quiet_reflection: <Moon className="w-4 h-4 text-zinc-400" />,
};

const EVENT_TYPE_ICONS_LARGE: Record<EventType, React.ReactNode> = {
  deep_conversation: <Sparkles className="w-6 h-6 text-amber-400" />,
  check_in: <MessageSquare className="w-6 h-6 text-blue-400" />,
  quiet_reflection: <Moon className="w-6 h-6 text-zinc-400" />,
};

interface CalendarEvent {
  date: string;
  type: EventType;
  priority: Priority;
  bestTime: string;
  suggestedTopics: string[];
  reason: string;
}

interface CalendarData {
  soul_id: string;
  pattern: {
    avgConversationsPerDay: number;
    preferredHourOfDay: number;
    preferredDayOfWeek: number;
    avgMessageLength: number;
    emotionalTrend: string;
  };
  events: CalendarEvent[];
  nextBestWindow: CalendarEvent | null;
}

interface SoulInfo {
  id: string;
  name: string;
  name_native: string | null;
  avatar: string | null;
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "凌晨";
  if (h < 6) return "凌晨";
  if (h < 9) return "早上";
  if (h < 12) return "上午";
  if (h === 12) return "中午";
  if (h < 14) return "下午";
  if (h < 18) return "下午";
  if (h < 21) return "傍晚";
  return "夜间";
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad with previous month days
  const startPad = first.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad with next month days to complete last week
  while (days.length % 7 !== 0) {
    const lastDay = days[days.length - 1];
    days.push(new Date(lastDay.getTime() + 86400000));
  }

  return days;
}

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const mond = new Date(base);
  mond.setDate(base.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mond);
    d.setDate(mond.getDate() + i);
    return d;
  });
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function SoulCalendarPage() {
  const params = useParams();
  const soulId = params?.id as string | undefined;

  if (!soulId) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center"><p className="text-zinc-400">无效的灵魂ID</p></div>;
  }

  const [soul, setSoul] = useState<SoulInfo | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"week" | "month">("month");

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const mond = new Date(today);
    mond.setDate(today.getDate() - day);
    mond.setHours(0, 0, 0, 0);
    return mond;
  });

  // Month navigation
  const [monthDate, setMonthDate] = useState(new Date());

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("未登录"); setLoading(false); return; }

      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const resp = await fetch(`/api/soul/calendar?soul_id=${soulId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) throw new Error("加载失败");
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setCalendar(data.calendar);
    } catch (err: any) {
      setError(err.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [soulId]);

  useEffect(() => {
    async function loadSoul() {
      const { data } = await supabase
        .from("soul_extraction_results")
        .select("id, name, name_native, avatar")
        .eq("id", soulId)
        .single();
      if (data) setSoul(data);
    }
    loadSoul();
    fetchCalendar();
  }, [soulId, fetchCalendar]);

  // Build event map: dateStr -> CalendarEvent
  const eventMap = new Map<string, CalendarEvent>();
  if (calendar?.events) {
    for (const ev of calendar.events) {
      eventMap.set(ev.date, ev);
    }
  }

  // Pattern insights
  const pattern = calendar?.pattern;
  const preferredDayLabel = pattern ? DAY_NAMES[pattern.preferredDayOfWeek] : "三";
  const preferredTimeLabel = pattern ? formatHour(pattern.preferredHourOfDay) : "下午";

  const renderWeekView = () => {
    const days = getWeekDays(weekStart);
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = dateStr(day);
          const event = eventMap.get(key);
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === today.getMonth();

          return (
            <div
              key={key}
              className={`
                relative flex flex-col items-center justify-start rounded-xl p-3 min-h-28 transition-all
                ${event ? PRIORITY_COLORS[event.priority] : "bg-zinc-800/40 border border-zinc-700/40"}
                ${isToday ? "ring-2 ring-amber-400/60 ring-offset-2 ring-offset-zinc-950" : ""}
                ${!isCurrentMonth ? "opacity-30" : ""}
              `}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-amber-400" : "text-zinc-400"}`}>
                {day.getDate()}
              </div>
              <div className="text-xs text-zinc-500 mb-2">{DAY_NAMES_EN[day.getDay()]}</div>

              {event && (
                <div className="flex flex-col items-center gap-1 w-full">
                  {EVENT_TYPE_ICONS[event.type]}
                  <div className="text-[10px] text-center leading-tight">{event.reason.split("—")[0]}</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {event.bestTime}
                  </div>
                </div>
              )}

              {!event && (
                <div className="text-[10px] text-zinc-600 text-center">—</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getMonthDays(monthDate.getFullYear(), monthDate.getMonth());
    const today = new Date();
    const currentMonth = monthDate.getMonth();

    return (
      <div className="flex flex-col gap-1">
        {/* Day name header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES_EN.map((d, i) => (
            <div key={i} className="text-center text-xs text-zinc-500 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = dateStr(day);
            const event = eventMap.get(key);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = day.getMonth() === currentMonth;

            return (
              <div
                key={key}
                className={`
                  relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-16 transition-all
                  ${event ? PRIORITY_COLORS[event.priority] : "bg-zinc-800/20"}
                  ${isToday ? "ring-2 ring-amber-400/60" : "border border-transparent"}
                  ${!isCurrentMonth ? "opacity-30" : ""}
                `}
              >
                <span className={`text-xs font-medium ${isToday ? "text-amber-400" : isCurrentMonth ? "text-zinc-300" : "text-zinc-600"}`}>
                  {day.getDate()}
                </span>
                {event && (
                  <div className="mt-0.5 flex flex-col items-center gap-0.5 w-full">
                    {EVENT_TYPE_ICONS[event.type]}
                    <span className="text-[9px] text-center leading-tight opacity-80">{event.bestTime}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
              <Link href="/soul" className="hover:text-zinc-300 transition-colors">灵魂</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-zinc-300">{soul?.name || soulId}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-amber-400">灵魂日历</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-400" />
              {soul?.name || "加载中..."} 的灵魂日历
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCalendar}
            disabled={loading}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1">刷新</span>
          </Button>
        </div>

        {loading && !calendar && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        )}

        {error && (
          <Card className="border-red-900/50 bg-red-950/20">
            <CardContent className="p-4 text-red-400 text-sm">{error}</CardContent>
          </Card>
        )}

        {calendar && (
          <>
            {/* Pattern Insights Strip */}
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">偏好互动日</div>
                      <div className="text-sm font-medium text-amber-300">每周{preferredDayLabel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">偏好时间段</div>
                      <div className="text-sm font-medium text-blue-300">{preferredTimeLabel} {String(pattern?.preferredHourOfDay || 14).padStart(2, "0")}:00</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">平均日对话数</div>
                      <div className="text-sm font-medium text-violet-300">{pattern?.avgConversationsPerDay?.toFixed(1) || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">情感趋势</div>
                      <div className="text-sm font-medium text-emerald-300">{pattern?.emotionalTrend === "neutral" ? "中性" : pattern?.emotionalTrend || "中性"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar + Next Best Window */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Calendar Grid */}
              <div className="lg:col-span-2">
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-zinc-200 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        互动日历
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {/* View mode toggle */}
                        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                          <button
                            onClick={() => setViewMode("week")}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${viewMode === "week" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                          >
                            周视图
                          </button>
                          <button
                            onClick={() => setViewMode("month")}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${viewMode === "month" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                          >
                            月视图
                          </button>
                        </div>

                        {viewMode === "week" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const prev = new Date(weekStart);
                                prev.setDate(prev.getDate() - 7);
                                setWeekStart(prev);
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-zinc-400 min-w-32 text-center">
                              {weekStart.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} — {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                            </span>
                            <button
                              onClick={() => {
                                const next = new Date(weekStart);
                                next.setDate(next.getDate() + 7);
                                setWeekStart(next);
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {viewMode === "month" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const prev = new Date(monthDate);
                                prev.setMonth(prev.getMonth() - 1);
                                setMonthDate(prev);
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-zinc-400 min-w-24 text-center">
                              {monthDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
                            </span>
                            <button
                              onClick={() => {
                                const next = new Date(monthDate);
                                next.setMonth(next.getMonth() + 1);
                                setMonthDate(next);
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {viewMode === "week" ? renderWeekView() : renderMonthView()}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-amber-500/40" />
                        <span className="text-xs text-zinc-500">{PRIORITY_LABEL.high}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-blue-500/40" />
                        <span className="text-xs text-zinc-500">{PRIORITY_LABEL.medium}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-zinc-700/40" />
                        <span className="text-xs text-zinc-500">{PRIORITY_LABEL.low}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Next Best Window + Upcoming Events */}
              <div className="space-y-4">

                {/* Next Best Window */}
                {calendar.nextBestWindow && (
                  <Card className="border-amber-700/50 bg-gradient-to-br from-amber-950/40 to-zinc-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-amber-300 text-base flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        最佳互动时机
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          {EVENT_TYPE_ICONS_LARGE[calendar.nextBestWindow.type as EventType]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-amber-200">{PRIORITY_LABEL[calendar.nextBestWindow.priority]}</div>
                          <div className="text-xs text-amber-400/70">{calendar.nextBestWindow.date}</div>
                          <div className="text-xs text-amber-400/70 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{calendar.nextBestWindow.bestTime}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-amber-900/20 p-3 text-xs text-amber-200/80 leading-relaxed">
                        {calendar.nextBestWindow.reason}
                      </div>

                      <div>
                        <div className="text-xs text-zinc-500 mb-1.5">推荐话题</div>
                        <div className="space-y-1">
                          {calendar.nextBestWindow.suggestedTopics.map((topic, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 mt-1 flex-shrink-0" />
                              <span className="text-xs text-zinc-300">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Link
                        href={`/soul/${soulId}`}
                        className="block w-full text-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
                      >
                        立即互动
                      </Link>
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Events */}
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-zinc-200 text-base flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" />
                      未来 10 天推荐
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {calendar.events.length === 0 && (
                        <p className="text-sm text-zinc-600 italic">暂无推荐日程</p>
                      )}
                      {calendar.events.map((event) => (
                        <div
                          key={event.date}
                          className={`rounded-lg p-3 border ${PRIORITY_COLORS[event.priority]}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              {EVENT_TYPE_ICONS[event.type as EventType]}
                              <span className="text-xs font-medium">{event.date}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />{event.bestTime}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">{event.reason}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
