"use client";

import { TownSummaryDashboard } from "@/components/town-summary-dashboard";
import { TownClock } from "@/components/town-clock";
import { EpochDisplay } from "@/components/town-clock";
import { EraChronicle } from "@/components/town-chronicle-sidebar";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TownDashboardPage() {
  const router = useRouter();
  const [showChronicle, setShowChronicle] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/town")}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Canvas
          </button>
          <h1 className="text-xl font-bold">🌆 Soul Town Dashboard</h1>
          <TownClock size="compact" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChronicle(!showChronicle)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              showChronicle
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            📜 Chronicle
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            ← Main Dashboard
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Main content */}
        <div className={`flex-1 p-6 ${showChronicle ? "mr-80" : ""}`}>
          {/* Epoch display */}
          <div className="mb-6">
            <EpochDisplay />
          </div>

          {/* Summary dashboard */}
          <TownSummaryDashboard />
        </div>

        {/* Chronicle sidebar */}
        {showChronicle && (
          <div className="fixed right-0 top-[72px] bottom-0 w-80 border-l border-zinc-800 bg-zinc-950 overflow-hidden">
            <EraChronicle onClose={() => setShowChronicle(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
