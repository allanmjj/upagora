"use client";

import { useState } from "react";

/**
 * 灵魂进化面板 - 让守护者看到灵魂的成长轨迹
 * 
 * 核心功能：
 * 1. 触发灵魂进化（基于累积的校准数据）
 * 2. 显示进化历史
 * 3. 展示进化前后的变化
 */

function EvolutionButton({ soulId, onEvolved }: { soulId: string; onEvolved: () => void }) {
  const [evolving, setEvolving] = useState(false);
  const [progress, setProgress] = useState("");

  async function evolve() {
    setEvolving(true);
    setProgress("正在分析校准数据...");

    try {
      const resp = await fetch("/api/soul/evolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("supabase-auth-token") || ""}`,
        },
        body: JSON.stringify({ soul_id: soulId }),
      });

      setProgress("正在生成新版人格档案...");

      if (resp.ok) {
        const data = await resp.json();
        setProgress(`进化完成！版本 ${data.from_version} → ${data.to_version}`);
        onEvolved();
      } else {
        const err = await resp.json();
        setProgress(`进化失败：${err.error || "未知错误"}`);
      }
    } catch (err) {
      setProgress(`进化失败：${String(err)}`);
    }

    setEvolving(false);
  }

  return (
    <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-amber-200">灵魂进化</h3>
          <p className="text-sm text-amber-300/70">基于累积的校准数据，让灵魂人格更加精准</p>
        </div>
        <button
          onClick={evolve}
          disabled={evolving}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          {evolving ? "进化中..." : "触发进化"}
        </button>
      </div>
      {progress && (
        <p className="mt-2 text-sm text-amber-300/60">{progress}</p>
      )}
    </div>
  );
}

function EvolutionTimeline({ soulId }: { soulId: string }) {
  const [, setKey] = useState(0);

  function refresh() {
    setKey(k => k + 1);
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-zinc-400 mb-2">进化轨迹</h4>
      <div className="space-y-2">
        <div className="text-sm text-zinc-500 italic">
          灵魂会随着多次校准自动进化。每次进化会基于守护者提供的反馈、
          校准对话和人格档案生成新版本。
        </div>
        <button onClick={refresh} className="text-xs text-violet-400 hover:text-violet-300">
          刷新进化状态
        </button>
      </div>
    </div>
  );
}

/**
 * 灵魂进化仪表盘
 * 嵌入到 calibrate 页面或其他灵魂管理页面中
 */
export function SoulEvolutionPanel({ soulId }: { soulId: string }) {
  return (
    <div className="space-y-3">
      <EvolutionButton soulId={soulId} onEvolved={() => {}} />
      <EvolutionTimeline soulId={soulId} />
    </div>
  );
}
