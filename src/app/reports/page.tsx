"use client";

import { useEffect, useState } from "react";

export default function DailyReportPage() {
  const [souls, setSouls] = useState<any[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/soul/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.status?.sessions) {
          setSouls(d.status.sessions);
        }
      })
      .catch(() => {
        setSouls([
          { id: "1", subject_name: "Trump", status: "complete" },
          { id: "2", subject_name: "Socrates", status: "complete" },
        ]);
      });
  }, []);

  const loadReport = async (soulId: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/soul/report?session_id=${soulId}`);
      if (resp.ok) {
        const data = await resp.json();
        setReport(data.report);
      }
    } catch {
      setReport({ summary: "No daily report available yet.", soul_name: selectedSoul?.subject_name, date: new Date().toISOString().split("T")[0] });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <h1 className="text-xl font-bold">📋 Daily Reports</h1>
        <p className="text-sm text-zinc-400 mt-1">See what your souls did today</p>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-4">
        {/* Soul Selector */}
        <div className="mb-6 flex flex-wrap gap-3">
          {souls.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSoul(s); setReport(null); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                selectedSoul?.id === s.id
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {s.subject_name}
            </button>
          ))}
        </div>

        {selectedSoul && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedSoul.subject_name}</h2>
                <p className="text-sm text-zinc-400">Soul Daily Activity Report</p>
              </div>
              <button
                onClick={() => loadReport(selectedSoul.id)}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh Report"}
              </button>
            </div>

            {!report ? (
              <div className="py-12 text-center text-zinc-500">
                <div className="mb-2 text-4xl">📊</div>
                <div>Click &quot;Refresh Report&quot; to see today&apos;s summary</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Summary</h3>
                  <p className="leading-relaxed text-zinc-200">{report.summary}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Date", value: report.date || "Today" },
                    { label: "Activities", value: report.activities?.length || 0 },
                    { label: "Social Events", value: report.social || 0 },
                    { label: "Work Tasks", value: report.work || 0 },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-400">{stat.value}</div>
                      <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Economy Status */}
                {report.economy && (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Economy</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-emerald-400">{report.economy.earned} AGU</div>
                        <div className="text-xs text-zinc-400">Lifetime Earned</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-amber-400">{report.economy.spent} AGU</div>
                        <div className="text-xs text-zinc-400">Lifetime Spent</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-400">{report.economy.balance} AGU</div>
                        <div className="text-xs text-zinc-400">Current Balance</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Soul Status */}
                {report.status && (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Current State</h3>
                    <div className="flex flex-wrap gap-4">
                      <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm capitalize">Mood: {report.status.mood}</span>
                      <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm">Location: {report.status.location}</span>
                      <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm">Thoughts: {report.status.total_thoughts}</span>
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                {report.activities?.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Activity Timeline</h3>
                    <div className="space-y-2">
                      {report.activities.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg bg-zinc-800/20 px-4 py-3">
                          <span className="text-lg">{
                            a.type === "daily_log" ? "📝" :
                            a.type === "conversation" ? "💬" :
                            a.type === "work_output" ? "💻" :
                            a.type === "social_event" ? "🤝" :
                            a.type === "news_digest" ? "📰" :
                            a.type === "learning" ? "📖" : "🧠"
                          }</span>
                          <div>
                            <div className="text-sm font-medium">{a.type.replace("_", " ")}</div>
                            <div className="text-sm text-zinc-400">{a.summary?.substring(0, 150)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedSoul && (
          <div className="py-20 text-center text-zinc-500">
            <div className="mb-2 text-4xl">👆</div>
            <div>Select a soul above to view their daily report</div>
          </div>
        )}
      </div>
    </div>
  );
}
