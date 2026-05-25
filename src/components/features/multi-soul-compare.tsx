"use client";

import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarGrid, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Upload, X, Sparkles, Scale } from "lucide-react";

interface SoulDimension {
  name: string;
  key: string;
  description: string;
}

const DIMENSIONS: SoulDimension[] = [
  { name: "认知模式", key: "cognitive", description: "思维与认知方式" },
  { name: "价值判断", key: "values", description: "价值观与道德判断" },
  { name: "表达风格", key: "expression", description: "语言与表达习惯" },
  { name: "知识结构", key: "knowledge", description: "知识领域与深度" },
  { name: "情感反应", key: "emotion", description: "情绪反应模式" },
  { name: "关系记忆", key: "relationship", description: "人际关系记忆" },
  { name: "生命叙事", key: "narrative", description: "人生故事与轨迹" },
];

interface SoulScore {
  cognitive: number;
  values: number;
  expression: number;
  knowledge: number;
  emotion: number;
  relationship: number;
  narrative: number;
}

interface SoulEntry {
  id: string;
  name: string;
  scores: SoulScore;
  color: string;
}

const COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];

/**
 * Multi-soul Compare — visual radar chart comparing up to 5 souls across 7 dimensions.
 * Useful for guardians to verify soul authenticity by comparing against reference souls.
 */
export function MultiSoulCompare() {
  const [souls, setSouls] = useState<SoulEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSoulScores = async (shareSlug: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("sb-access-token");
      const res = await fetch(`/api/soul/compare?slug=${shareSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const scores = parseExtractionScores(data.extractions || []);
        const newSoul: SoulEntry = {
          id: shareSlug,
          name: data.subject_name || `Soul ${souls.length + 1}`,
          scores,
          color: COLORS[souls.length % COLORS.length],
        };
        setSouls((prev) => [...prev, newSoul]);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const parseExtractionScores = (
    extractions: { dimension: string; score?: number }[]
  ): SoulScore => {
    const result: Partial<SoulScore> = {};
    for (const ext of extractions) {
      const dim = DIMENSIONS.find((d) => d.key === ext.dimension?.toLowerCase());
      if (dim) {
        result[dim.key] = ext.score || 50;
      }
    }
    return {
      cognitive: result.cognitive || 50,
      values: result.values || 50,
      expression: result.expression || 50,
      knowledge: result.knowledge || 50,
      emotion: result.emotion || 50,
      relationship: result.relationship || 50,
      narrative: result.narrative || 50,
    };
  };

  const removeSoul = (id: string) => {
    setSouls((prev) => prev.filter((s) => s.id !== id));
  };

  const chartData = DIMENSIONS.map((dim) => {
    const point: Record<string, number | string> = { dimension: dim.name };
    for (const soul of souls) {
      point[soul.name] = soul.scores[dim.key];
    }
    return point;
  });

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-cyan-500/10 p-2">
          <Scale className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Multi-Soul Compare
          </h2>
          <p className="text-xs text-zinc-500">
            Compare souls across 7 dimensions
          </p>
        </div>
      </div>

      {souls.length < 2 && (
        <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
          <label className="block text-sm text-zinc-400 mb-2">
            Add a soul to compare (enter share slug or ID)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-cyan-500/50 outline-none"
              placeholder="e.g. abc123-def456-ghi789..."
            />
            <button
              onClick={() => searchQuery && fetchSoulScores(searchQuery)}
              disabled={isLoading || !searchQuery || souls.length >= 5}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? "Loading..." : "Add"}
            </button>
          </div>
          {souls.length >= 5 && (
            <p className="text-xs text-amber-400 mt-2">
              Maximum 5 souls allowed for comparison
            </p>
          )}
        </div>
      )}

      {/* Soul tags */}
      {souls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {souls.map((soul) => (
            <span
              key={soul.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border"
              style={{
                borderColor: `${soul.color}40`,
                backgroundColor: `${soul.color}10`,
                color: soul.color,
              }}
            >
              <Sparkles className="h-3 w-3" />
              {soul.name}
              <button
                onClick={() => removeSoul(soul.id)}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Radar Chart */}
      {souls.length >= 2 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "#999', fontSize: 12 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#00",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Legend />
              {souls.map((soul) => (
                <Radar
                  // @ts-ignore
                  key={soul.id}
                  name={soul.name}
                  dataKey={soul.name}
                  stroke={soul.color}
                  fill={soul.color}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
          Add at least 2 souls to compare
        </div>
      )}
    </div>
  );
}
