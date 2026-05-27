"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface DailyReport {
  id: number;
  soul_id: string;
  report_date: string;
  mood_summary: string;
  highlights: any[];
  agd_earned: number;
}

interface SoulInfo {
  id: string;
  name: string;
  avatar: string;
  mood: string;
  energy: number;
  social_need: number;
}

const moodEmoji: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  melancholic: "😔",
  anxious: "😟",
  inspired: "✨",
};

export default function DailyReportPage() {
  const params = useParams();
  const router = useRouter();
  const soulId = params.soulId as string;

  const [report, setReport] = useState<DailyReport | null>(null);
  const [soulInfo, setSoulInfo] = useState<SoulInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load soul info
        const { data: soulState } = await supabase
          .from("soul_states")
          .select("*")
          .eq("soul_id", soulId)
          .single();

        const { data: soulData } = await supabase
          .from("soul_extraction_results")
          .select("id, name, avatar")
          .eq("id", soulId)
          .single();

        if (soulState && soulData) {
          setSoulInfo({
            id: soulData.id,
            name: soulData.name,
            avatar: soulData.avatar || "🧑",
            mood: soulState.mood,
            energy: soulState.energy,
            social_need: soulState.social_need,
          });
        }

        // Load today's report or generate it
        const today = new Date().toISOString().split("T")[0];
        const { data: existingReport } = await supabase
          .from("daily_soul_reports")
          .select("*")
          .eq("soul_id", soulId)
          .eq("report_date", today)
          .single();

        if (existingReport) {
          setReport(existingReport);
        } else {
          // Generate report via API
          const res = await fetch("/api/town/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ soulId }),
          });

          if (res.ok) {
            const data = await res.json();
            setReport(data.report);
          } else {
            setError("Failed to generate today's report");
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [soulId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 text-4xl">📋</div>
          <p className="text-zinc-400 animate-pulse">Generating daily report...</p>
        </div>
      </div>
    );
  }

  if (error || !soulInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <p className="text-zinc-400">
            {error || "Soul not found"}
          </p>
          <button
            onClick={() => router.push("/town")}
            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            ← Back to Town
          </button>
        </div>
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{soulInfo.avatar}</span>
          <div>
            <h1 className="text-xl font-bold">{soulInfo.name}&apos;s Daily Report</h1>
            <p className="text-sm text-zinc-400">{todayDate}</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/town")}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          ← Town
        </button>
      </div>

      <div className="mx-auto max-w-4xl p-6">
        {/* Mood & Energy Card */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Current Mood</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-3xl">{moodEmoji[soulInfo.mood] || "🤔"}</span>
              <span className="text-lg font-medium capitalize">{soulInfo.mood}</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Energy</div>
            <div className="mt-2">
              <div className="mb-1 h-3 w-full rounded-full bg-zinc-800">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${soulInfo.energy}%` }}
                />
              </div>
              <span className="text-sm text-zinc-400">{soulInfo.energy}%</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">Social Energy</div>
            <div className="mt-2">
              <div className="mb-1 h-3 w-full rounded-full bg-zinc-800">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-400 transition-all"
                  style={{ width: `${soulInfo.social_need}%` }}
                />
              </div>
              <span className="text-sm text-zinc-400">{soulInfo.social_need}%</span>
            </div>
          </div>
        </div>

        {/* Mood Summary */}
        {report?.mood_summary && (
          <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <div className="text-sm text-amber-400">Today&apos;s Summary</div>
                <p className="mt-1 text-zinc-200">{report.mood_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Highlights Timeline */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-bold">🌟 Today&apos;s Highlights</h2>
          {report?.highlights && report.highlights.length > 0 ? (
            <div className="space-y-3">
              {report.highlights.map((highlight: any, idx: number) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-900/50 text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {highlight.time
                          ? new Date(highlight.time).toLocaleTimeString()
                          : ""}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize">
                        {highlight.type}
                      </span>
                    </div>
                    {highlight.summary && (
                      <p className="text-sm text-zinc-300">{highlight.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="mb-2 text-3xl">😴</div>
              <p className="text-zinc-400">
                A quiet day for {soulInfo.name}. No events yet.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                The day is still young - check back later!
              </p>
            </div>
          )}
        </div>

        {/* AGD Earned */}
        {report?.agd_earned !== undefined && report.agd_earned > 0 && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">AGD Earned Today</div>
                <div className="mt-1 text-2xl font-bold text-amber-400">
                  {report.agd_earned} AGD
                </div>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/chat?soul=${soulId}`)}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium hover:bg-indigo-500"
          >
            💬 Chat with {soulInfo.name}
          </button>
          <button
            onClick={() => router.push(`/profile/${soulId}`)}
            className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm hover:bg-zinc-800"
          >
            View Profile
          </button>
          <button
            onClick={() => router.push("/town")}
            className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm hover:bg-zinc-800"
          >
            🌆 Back to Town
          </button>
        </div>
      </div>
    </div>
  );
}
