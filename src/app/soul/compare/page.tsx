'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, ArrowRight, Download, Sparkles, Lightbulb, MessageSquare, Shield, Anchor, BookOpen, Target, Heart, MapPin } from 'lucide-react';
import { SoulConstraintCard } from '@/components/soul/SoulConstraintCard';

interface SoulConstraints {
  soul_id: string;
  soul_name: string;
  era_name?: string;
  era_start?: number;
  era_end?: number;
  profession?: string;
  education?: string;
  knowledge_floor?: string[];
  knowledge_ceiling?: string[];
  knowledge_gaps?: string[];
  skills?: Record<string, number>;
  non_skills?: string[];
  personality_traits?: string[];
  beliefs?: Array<{ name: string; strength: number }>;
  soul_anchor?: string[];
  life_events?: string[];
  places_visited?: string[];
  communication_style?: string[];
  language_style?: string[];
  avoided_language?: string[];
}

export default function SoulComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [soulA, setSoulA] = useState<string>(searchParams?.get('a') || '');
  const [soulB, setSoulB] = useState<string>(searchParams?.get('b') || '');
  const [dataA, setDataA] = useState<SoulConstraints | null>(null);
  const [dataB, setDataB] = useState<SoulConstraints | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const loadSoul = (id: string, setter: any, loader: any) => {
    if (!id) return;
    loader(true);
    fetch(`/api/soul/constraints?soul_id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => {
        setter(d.constraints || d);
        loader(false);
      })
      .catch(() => loader(false));
  };

  const compare = () => {
    if (soulA && soulB) {
      loadSoul(soulA, setDataA, setLoadingA);
      loadSoul(soulB, setDataB, setLoadingB);
      router.push(`/soul/compare?a=${soulA}&b=${soulB}`);
    }
  };

  // Quick preset comparisons
  const presets = [
    { a: 'su-shi', nameA: 'Su Shi', b: 'li-bai', nameB: 'Li Bai' },
    { a: 'confucius', nameA: 'Confucius', b: 'ma-junjie', nameB: 'Ma Junjie' },
    { a: 'marie-curie', nameA: 'Marie Curie', b: 'leonardo', nameB: 'Leonardo da Vinci' },
  ];

  const dimensionLabels = [
    { key: 'era_name', label: 'Era', icon: '🏛️' },
    { key: 'profession', label: 'Profession', icon: '💼' },
    { key: 'education', label: 'Education', icon: '🎓' },
    { key: 'knowledge_floor', label: 'Knows', icon: '✓' },
    { key: 'personality_traits', label: 'Personality', icon: '🧠' },
    { key: 'communication_style', label: 'Style', icon: '💬' },
    { key: 'soul_anchor', label: 'Soul Anchor', icon: '⚓' },
    { key: 'life_events', label: 'Life Events', icon: '📜' },
    { key: 'places_visited', label: 'Places', icon: '🗺️' },
  ];

  const safe = (val: any): string => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val || '—');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-7 h-7 text-amber-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-violet-400 bg-clip-text text-transparent">
              Soul Comparison
            </h1>
          </div>
          <p className="text-zinc-400">Compare two souls across all 9 dimensions side by side.</p>

          {/* Selectors */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Soul A</label>
              <input
                type="text"
                value={soulA}
                onChange={e => setSoulA(e.target.value)}
                placeholder="e.g. su-shi, confucius"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="pt-5">
              <ArrowRight className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Soul B</label>
              <input
                type="text"
                value={soulB}
                onChange={e => setSoulB(e.target.value)}
                placeholder="e.g. li-bai, marie-curie"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={compare}
                disabled={!soulA || !soulB}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-amber-600 text-white font-medium text-sm hover:from-violet-500 hover:to-amber-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Compare
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mt-4">
            <span className="text-xs text-zinc-600 py-1.5">Quick:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => { setSoulA(p.a); setSoulB(p.b); }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                {p.nameA} vs {p.nameB}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison View */}
      {dataA && dataB ? (
        <div className="container mx-auto px-4 py-8">
          {/* Soul Headers */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border border-violet-800/50 bg-violet-950/20 p-6">
              <h2 className="text-2xl font-bold text-violet-300">{dataA.soul_name}</h2>
              {dataA.era_name && <p className="text-zinc-400 mt-1">{dataA.era_name} · {dataA.profession || ''}</p>}
            </div>
            <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-6">
              <h2 className="text-2xl font-bold text-amber-300">{dataB.soul_name}</h2>
              {dataB.era_name && <p className="text-zinc-400 mt-1">{dataB.era_name} · {dataB.profession || ''}</p>}
            </div>
          </div>

          {/* Dimension Comparison Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm">Dimension-by-Dimension Comparison</h3>
            </div>
            {dimensionLabels.map((dim) => (
              <div key={dim.key} className="grid grid-cols-[auto_1fr_1fr] divide-x divide-zinc-800 border-t border-zinc-800/50">
                <div className="p-3 text-xs font-medium text-zinc-500 flex items-center gap-1.5 bg-zinc-900/80">
                  <span>{dim.icon}</span>
                  <span className="hidden sm:inline">{dim.label}</span>
                </div>
                <div className="p-3">
                  <div className="text-xs text-violet-400/60 mb-0.5">{dataA.soul_name}</div>
                  <div className="text-sm text-zinc-200">{safe((dataA as any)[dim.key])}</div>
                </div>
                <div className="p-3">
                  <div className="text-xs text-amber-400/60 mb-0.5">{dataB.soul_name}</div>
                  <div className="text-sm text-zinc-200">{safe((dataB as any)[dim.key])}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Constraint Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
            <SoulConstraintCard soulId={soulA} />
            <SoulConstraintCard soulId={soulB} />
          </div>

          {/* Similarities & Differences */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shared traits */}
              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">Shared Traits</div>
                <div className="space-y-1">
                  {dataA.personality_traits?.filter(t => dataB.personality_traits?.includes(t))?.map(t => (
                    <span key={t} className="inline-block px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 text-xs mr-1 mb-1">{t}</span>
                  ))}
                  {(!dataA.personality_traits?.filter(t => dataB.personality_traits?.includes(t))?.length) && (
                    <span className="text-xs text-zinc-600">No shared personality traits</span>
                  )}
                </div>
              </div>
              {/* Knowledge overlap */}
              <div>
                <div className="text-xs font-semibold text-blue-400 mb-2">Knowledge Overlap</div>
                <div className="space-y-1">
                  {dataA.knowledge_floor?.filter(k => dataB.knowledge_floor?.includes(k))?.map(k => (
                    <span key={k} className="inline-block px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 text-xs mr-1 mb-1">{k}</span>
                  ))}
                  {(!dataA.knowledge_floor?.filter(k => dataB.knowledge_floor?.includes(k))?.length) && (
                    <span className="text-xs text-zinc-600">No shared knowledge areas</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick chat both */}
          <div className="mt-8 flex gap-4 justify-center">
            <a href={`/chat/${soulA}`} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-medium text-sm hover:from-violet-500 hover:to-violet-400 transition-all">
              💬 Chat with {dataA.soul_name}
            </a>
            <a href={`/chat/${soulB}`} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium text-sm hover:from-amber-500 hover:to-amber-400 transition-all">
              💬 Chat with {dataB.soul_name}
            </a>
          </div>
        </div>
      ) : (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center text-zinc-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Select two souls to compare</p>
          </div>
        </div>
      )}
    </div>
  );
}
