'use client';

import { useEffect, useState } from 'react';
import { GitCommit, GitBranch, GitMerge, ChevronRight, ChevronDown, Clock, Sparkles, Shield, BookOpen } from 'lucide-react';
import { unifiedDiff, highlightSections } from '@/lib/versions-diff';

interface Snapshot {
  id: string;
  version: number;
  created_at: string;
  persona_text: string;
  memory_snapshot?: { count: number; collected_at: string };
  skill_refs?: string[];
  guardian_signature?: string;
  notes?: string;
}

export function SoulEvolutionTimeline({ soulId }: { soulId: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [diff, setDiff] = useState<{ line: string; tag: '+' | '-' | ' ' }[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/soul/evolution?soul_id=${encodeURIComponent(soulId)}`)
      .then(r => r.json())
      .then(d => {
        setSnapshots(d.snapshots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [soulId]);

  const showDiff = (v1: number, v2: number) => {
    const s1 = snapshots.find(s => s.version === v1);
    const s2 = snapshots.find(s => s.version === v2);
    if (!s1 || !s2) return;
    setSelectedVersions([v1, v2]);
    const d = unifiedDiff(s1.persona_text || '', s2.persona_text || '');
    setDiff(d);
  };

  const toggleExpand = (v: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
          <GitBranch className="w-5 h-5" />
          <span>Loading soul evolution timeline...</span>
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-center text-zinc-500">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No evolution snapshots yet</p>
          <p className="text-xs text-zinc-600 mt-1">Snapshots are created during calibration and distillation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white">Soul Evolution Timeline</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400">
              v{snapshots[0]?.version || 0} latest · {snapshots.length} snapshots
            </span>
          </div>
          {snapshots.length >= 2 && (
            <button
              onClick={() => showDiff(snapshots[0].version - 1, snapshots[0].version)}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center gap-1"
            >
              <GitMerge className="w-3.5 h-3.5" />
              Compare latest
            </button>
          )}
        </div>
      </div>

      {/* Diff View */}
      {selectedVersions && diff && (
        <div className="border-b border-zinc-800 p-4 bg-zinc-950">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-400 font-bold">v{selectedVersions[0]}</span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
              <span className="text-emerald-400 font-bold">v{selectedVersions[1]}</span>
            </div>
            <button
              onClick={() => { setSelectedVersions(null); setDiff(null); }}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Close diff
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs">
            {highlightSections(diff).map((section, i) => {
              if (section.lines.length > 8) {
                return (
                  <div key={i} className="mb-2">
                    <div className="text-zinc-600 mt-1">{section.lines.slice(0, 3).join('\n')}</div>
                    <div className="text-zinc-700 italic">{`... +${section.lines.length - 6} lines ...`}</div>
                    <div className="text-zinc-600">{section.lines.slice(-3).join('\n')}</div>
                  </div>
                );
              }
              return (
                <div key={i} className={`mb-1 ${
                  section.tag === '+' ? 'text-emerald-400 bg-emerald-900/10' :
                  section.tag === '-' ? 'text-red-400 bg-red-900/10' :
                  'text-zinc-500'
                }`}>
                  {section.lines.join('\n')}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-900/30 rounded" /> Added</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-900/30 rounded" /> Removed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-800 rounded" /> Unchanged</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="divide-y divide-zinc-800/50 max-h-96 overflow-y-auto">
        {snapshots.map((snap, idx) => {
          const isExpanded = expanded.has(snap.version);
          const isLatest = idx === 0;
          const prevSnap = snapshots[idx + 1];

          return (
            <div key={snap.id} className={`group ${isLatest ? 'bg-emerald-900/5' : ''}`}>
              <button
                onClick={() => toggleExpand(snap.version)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/20 transition-colors"
              >
                {/* Timeline dot */}
                <div className="relative shrink-0 mt-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isLatest ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}>
                    <GitCommit className="w-4 h-4 text-white" />
                  </div>
                  {idx < snapshots.length - 1 && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-6 bg-zinc-800" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-sm ${isLatest ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      Version {snap.version}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 font-bold">LATEST</span>
                    )}
                    {snap.guardian_signature && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-400 flex items-center gap-0.5">
                        <Shield className="w-3 h-3" /> Signed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(snap.created_at).toLocaleString()}
                    </span>
                    {snap.memory_snapshot && (
                      <span>{snap.memory_snapshot.count} memories</span>
                    )}
                    {snap.skill_refs && snap.skill_refs.length > 0 && (
                      <span>{snap.skill_refs.length} skills</span>
                    )}
                  </div>
                  {snap.notes && <p className="text-xs text-zinc-400 mt-1">{snap.notes}</p>}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                </div>
              </button>

              {/* Expanded view */}
              {isExpanded && (
                <div className="px-4 pb-4 pl-16">
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Persona text preview</span>
                    </div>
                    <pre className="text-xs text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
                      {(snap.persona_text || '(empty)').slice(0, 1500)}
                      {(snap.persona_text || '').length > 1500 && '...'}
                    </pre>
                  </div>

                  {snap.skill_refs && snap.skill_refs.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-zinc-500 mb-1">Skills active:</div>
                      <div className="flex flex-wrap gap-1">
                        {snap.skill_refs.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compare with previous */}
                  {prevSnap && (
                    <button
                      onClick={() => showDiff(prevSnap.version, snap.version)}
                      className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center gap-1"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Compare with v{prevSnap.version}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
