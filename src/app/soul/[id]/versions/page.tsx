"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { unifiedDiff, highlightSections } from "@/lib/versions-diff";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface SoulVersion {
  id: number;
  version_number: number;
  persona_snapshot: string;
  calibration_delta: any;
  guardian_id: string;
  notes: string;
  created_at: string;
}

export default function SoulVersionDiffPage() {
  const params = useParams();
  const soulId = params.id as string;

  const [versions, setVersions] = useState<SoulVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null);
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);
  const [diffMode, setDiffMode] = useState<"unified" | "split">("unified");

  useEffect(() => {
    async function loadVersions() {
      const { data } = await supabase
        .from("soul_versions")
        .select("*")
        .eq("soul_id", soulId)
        .order("version_number", { ascending: true });
      if (data) {
        setVersions(data as SoulVersion[]);
        if (data.length >= 2) {
          setSelectedVersionA(data.length - 2);
          setSelectedVersionB(data.length - 1);
        }
      }
      setLoading(false);
    }
    loadVersions();
  }, [soulId]);

  const versionA = versions.find((v) => v.version_number === selectedVersionA);
  const versionB = versions.find((v) => v.version_number === selectedVersionB);

  const diff =
    versionA && versionB
      ? unifiedDiff(versionA.persona_snapshot || "", versionB.persona_snapshot || "")
      : [];

  const diffSections = highlightSections(diff);

  const additions = diff.filter((d) => d.tag === "+").length;
  const deletions = diff.filter((d) => d.tag === "-").length;

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse">Loading soul versions...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Soul Version Diff
            </h1>
            <p className="text-zinc-400 mt-1">Track how the soul evolved through guardian calibration</p>
          </div>
          {versionA && versionB && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400">+{additions} added</span>
              <span className="text-red-400">-{deletions} removed</span>
            </div>
          )}
        </div>

        {/* Version Selector */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="text-xs text-zinc-400 mb-2 block">Earlier Version (Before)</label>
            <select
              value={selectedVersionA || ""}
              onChange={(e) => setSelectedVersionA(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version_number}>
                  v{v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {versionA && versionA.notes && (
              <p className="text-xs text-zinc-500 mt-2 truncate">{versionA.notes}</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="text-xs text-zinc-400 mb-2 block">Later Version (After)</label>
            <select
              value={selectedVersionB || ""}
              onChange={(e) => setSelectedVersionB(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version_number}>
                  v{v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {versionB && versionB.notes && (
              <p className="text-xs text-zinc-500 mt-2 truncate">{versionB.notes}</p>
            )}
          </div>
        </div>

        {/* Diff Mode Toggle */}
        {diff.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => setDiffMode("unified")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                diffMode === "unified"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Unified View
            </button>
            <button
              onClick={() => setDiffMode("split")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                diffMode === "split"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Split View
            </button>
          </div>
        )}

        {/* Diff Display */}
        {diff.length === 0 && versionA && versionB ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-zinc-400">No differences between these versions</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {diffMode === "unified" ? (
              /* Unified View */
              <div className="divide-y divide-zinc-800/50">
                {diffSections
                  .filter((s) => s.tag === "+" || s.tag === "-")
                  .map((section, idx) => (
                    <div key={idx}>
                      {section.tag === "-" && (
                        <div className="bg-red-950/30">
                          {section.lines.map((line, li) => (
                            <div key={li} className="px-4 py-0.5 text-sm flex">
                              <span className="text-red-400 w-5 shrink-0">- </span>
                              <span className="text-red-300/80 font-mono break-all">{line || " "}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {section.tag === "+" && (
                        <div className="bg-green-950/30">
                          {section.lines.map((line, li) => (
                            <div key={li} className="px-4 py-0.5 text-sm flex">
                              <span className="text-green-400 w-5 shrink-0">+ </span>
                              <span className="text-green-300/80 font-mono break-all">{line || " "}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              /* Split View */
              <div className="grid grid-cols-2 divide-x divide-zinc-800">
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-red-400 mb-3">Before (v{versionA?.version_number})</h3>
                  <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {versionA?.persona_snapshot || "(no persona)"}
                  </pre>
                </div>
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-green-400 mb-3">After (v{versionB?.version_number})</h3>
                  <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {versionB?.persona_snapshot || "(no persona)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Version History Timeline */}
        {versions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-zinc-200 mb-4">Version History</h2>
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                      {v.guardian_id && (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                          by guardian
                        </span>
                      )}
                    </div>
                    {v.notes && <p className="text-xs text-zinc-400 mt-1">{v.notes}</p>}
                    {v.calibration_delta && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(v.calibration_delta).map(([dim, score]: [string, any]) => (
                          <span key={dim} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                            {dim}: {typeof score === "number" ? score.toFixed(1) : score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
