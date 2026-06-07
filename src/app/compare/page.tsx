"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Scale, Star, Zap, Brain, Heart, MessageSquare, TrendingUp, Loader2, ChevronRight, Award, BookOpen } from "lucide-react";

interface SoulOption {
  id: string;
  name: string;
  username: string;
  capability_description?: string;
  capabilities?: string[];
  avg_rating?: number;
  review_count?: number;
  invocation_count?: number;
  price_per_call?: number;
  is_verified?: boolean;
}

const DIMENSIONS = [
  { key: "cognitive_patterns", label: "Cognitive Patterns", icon: Brain },
  { key: "value_judgment", label: "Value Judgment", icon: Award },
  { key: "expression_style", label: "Expression Style", icon: MessageSquare },
  { key: "knowledge_structure", label: "Knowledge Structure", icon: BookOpen },
  { key: "emotional_response", label: "Emotional Response", icon: Heart },
  { key: "relationship_memory", label: "Relationship Memory", icon: TrendingUp },
  { key: "life_narrative", label: "Life Narrative", icon: Heart },
];

export default function ComparePage() {
  const [souls, setSouls] = useState<SoulOption[]>([]);
  const [soulA, setSoulA] = useState<string>("");
  const [soulB, setSoulB] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [extractionsA, setExtractionsA] = useState<any[]>([]);
  const [extractionsB, setExtractionsB] = useState<any[]>([]);
  const [loadingExtractions, setLoadingExtractions] = useState(false);

  useEffect(() => {
    async function fetchSouls() {
      try {
        const res = await fetch("/api/agents?sort=popular");
        const data = await res.json();
        setSouls(data.data || []);
      } catch (err) {
        console.error("Failed to fetch souls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSouls();
  }, []);

  const soulAData = souls.find((s) => s.id === soulA);
  const soulBData = souls.find((s) => s.id === soulB);

  const handleCompare = async () => {
    if (!soulA || !soulB || soulA === soulB) return;
    setLoadingExtractions(true);

    // Fetch extraction results for both souls
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/soul/extract?dimension=all`),
        fetch(`/api/soul/extract?dimension=all`),
      ]);
      if (resA.ok) {
        const data = await resA.json();
        setExtractionsA(data.extractions || []);
      }
      if (resB.ok) {
        const data = await resB.json();
        setExtractionsB(data.extractions || []);
      }
    } catch (err) {
      console.error("Failed to fetch extractions:", err);
    }

    setLoadingExtractions(false);
  };

  const getScoreForDimension = (extractions: any[], dimension: string) => {
    const extraction = extractions.find((e) => e.dimension === dimension);
    if (!extraction) return null;
    return extraction.confidence != null ? Math.round(extraction.confidence * 100) : null;
  };

  const renderScoreBar = (scoreA: number | null, scoreB: number | null) => {
    const maxScore = Math.max(scoreA || 0, scoreB || 0, 1);
    return (
      <div className="flex items-center gap-1 h-6">
        <div className="flex-1 flex justify-end">
          {scoreA !== null && (
            <div
              className="h-4 rounded-l bg-blue-500/60 transition-all"
              style={{ width: `${(scoreA / maxScore) * 100}%`, minWidth: scoreA > 0 ? 8 : 0 }}
            />
          )}
        </div>
        <div className="w-px h-4 bg-zinc-700" />
        <div className="flex-1">
          {scoreB !== null && (
            <div
              className="h-4 rounded-r bg-purple-500/60 transition-all"
              style={{ width: `${(scoreB / maxScore) * 100}%`, minWidth: scoreB > 0 ? 8 : 0 }}
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Scale className="h-8 w-8 text-indigo-400" />
            Soul Comparison
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Compare two souls side by side — their capabilities, dimensions, ratings, and personality profiles.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Selection */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-white">Soul 1</h3>
            </div>
            <select
              value={soulA}
              onChange={(e) => setSoulA(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select a soul...</option>
              {souls.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <h3 className="font-semibold text-white">Soul 2</h3>
            </div>
            <select
              value={soulB}
              onChange={(e) => setSoulB(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select a soul...</option>
              {souls.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={!soulA || !soulB || soulA === soulB || loadingExtractions}
          className="mb-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          {loadingExtractions ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Scale className="h-4 w-4" />
          )}
          Compare Souls
        </button>

        {/* Comparison Results */}
        {soulAData && soulBData && soulA !== soulB && (
          <>
            {/* Overview cards */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-lg font-bold">
                    {soulAData.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{soulAData.name}</h3>
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      {soulAData.username}
                      {soulAData.is_verified && (
                        <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">Verified</span>
                      )}
                    </div>
                  </div>
                </div>
                {soulAData.capability_description && (
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{soulAData.capability_description}</p>
                )}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{soulAData.avg_rating?.toFixed(1) || "0.0"}</div>
                    <div className="text-xs text-zinc-500">Rating</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{soulAData.review_count || 0}</div>
                    <div className="text-xs text-zinc-500">Reviews</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{soulAData.invocation_count || 0}</div>
                    <div className="text-xs text-zinc-500">Invocations</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-lg font-bold">
                    {soulBData.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{soulBData.name}</h3>
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      {soulBData.username}
                      {soulBData.is_verified && (
                        <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">Verified</span>
                      )}
                    </div>
                  </div>
                </div>
                {soulBData.capability_description && (
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{soulBData.capability_description}</p>
                )}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{soulBData.avg_rating?.toFixed(1) || "0.0"}</div>
                    <div className="text-xs text-zinc-500">Rating</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{soulBData.review_count || 0}</div>
                    <div className="text-xs text-zinc-500">Reviews</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{soulBData.invocation_count || 0}</div>
                    <div className="text-xs text-zinc-500">Invocations</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capabilities comparison */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
              <h3 className="font-semibold text-white mb-4">Capabilities</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-wrap gap-2">
                  {(soulAData.capabilities || []).map((cap) => (
                    <span key={cap} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
                      {cap}
                    </span>
                  ))}
                  {(!soulAData.capabilities || soulAData.capabilities.length === 0) && (
                    <span className="text-zinc-600 text-sm">No capabilities listed</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(soulBData.capabilities || []).map((cap) => (
                    <span key={cap} className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm border border-purple-500/20">
                      {cap}
                    </span>
                  ))}
                  {(!soulBData.capabilities || soulBData.capabilities.length === 0) && (
                    <span className="text-zinc-600 text-sm">No capabilities listed</span>
                  )}
                </div>
              </div>
            </div>

            {/* 7 Dimensions comparison */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="font-semibold text-white mb-4">7 Dimensions Analysis</h3>
              <div className="space-y-4">
                {DIMENSIONS.map((dim) => {
                  const scoreA = getScoreForDimension(extractionsA, dim.key);
                  const scoreB = getScoreForDimension(extractionsB, dim.key);
                  const Icon = dim.icon;
                  return (
                    <div key={dim.key} className="flex items-center gap-4">
                      <div className="w-40 flex items-center gap-2 text-sm text-zinc-400 flex-shrink-0">
                        <Icon className="h-4 w-4 text-zinc-600" />
                        {dim.label}
                      </div>
                      {renderScoreBar(scoreA, scoreB)}
                      <div className="flex gap-8 text-xs text-zinc-500 flex-shrink-0">
                        <span className="w-12 text-right">{scoreA !== null ? `${scoreA}%` : "-"}</span>
                        <span className="w-12">{scoreB !== null ? `${scoreB}%` : "-"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {extractionsA.length === 0 && extractionsB.length === 0 && (
                <p className="text-xs text-zinc-600 mt-4 text-center">
                  Dimension analysis will be available once soul extraction is complete.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Link
                href={`/soul/dialogue?soulA=${soulA}&soulB=${soulB}`}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Start Dialogue
              </Link>
              <Link
                href="/soul/marketplace"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Browse More
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
