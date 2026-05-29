"use client";

import { useEffect, useState } from "react";

interface Soul {
  id: string;
  name: string;
  name_native?: string;
  language?: string;
  mood: string;
  energy: number;
  social_need?: number;
  current_region?: string;
  avatar?: string;
  color: string;
}

interface ConversationLine {
  speaker: string;
  text: string;
}

// ─── Encounter Observer Component ──────────────────────────────────
// Observer who is currently observing (guardian mode)
export function EncounterObserver({
  soulA,
  soulB,
  space,
  onJoin,
  onClose,
}: {
  soulA: Soul;
  soulB: Soul;
  space: string;
  onJoin?: (soulId: string) => void;
  onClose: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEncounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEncounter = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/town/encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul1Id: soulA.id,
          soul2Id: soulB.id,
          space,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch encounter");
      }

      const data = await response.json();
      setConversation(data.conversation || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load encounter");
      console.error("Encounter fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const greetingMessages: Record<string, string> = {
    plaza: "Just met in the busy Town Plaza",
    library: "Bumped into each other in the Library",
    bar: "Met up at The Raven Bar",
    garden: "Encountered in the Zen Garden",
    workshop: "Met in the Workshop",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg mx-4 bg-[#0a0c10] rounded-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-bold text-lg">🔥 Soul Encounter</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Soul meets Soul card */}
        {!loading && !error && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: soulA.color }}
              >
                {soulA.avatar || "👤"}
              </div>
              <div className="text-center flex-1">
                <span className="text-gray-400 text-sm">meets</span>
                <p className="text-gray-500 text-xs">
                  {greetingMessages[space] || "in the town"}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: soulB.color }}
              >
                {soulB.avatar || "👤"}
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-amber-400 text-sm font-medium">{soulA.name}</span>
              <span className="text-amber-400 text-sm font-medium">{soulB.name}</span>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Generating conversation...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : (
            conversation.map((line, idx) => (
              <div
                key={idx}
                className={`flex ${
                  line.speaker === soulA.name ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 text-sm rounded-2xl ${
                    line.speaker === soulA.name
                      ? "bg-white/10 text-gray-100 rounded-bl-md"
                      : "bg-amber-600/20 text-amber-100 rounded-br-md"
                  }`}
                >
                  <p className="text-xs opacity-60 mb-1">{line.speaker}</p>
                  <p>{line.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-white/10 p-4">
          {onJoin && (
            <button
              onClick={() => onJoin(soulA.id)}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium mb-2"
            >
              🤝 Join as {soulA.name}
            </button>
          )}
          <button
            onClick={fetchEncounter}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-sm"
            disabled={loading}
          >
            🔄 Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Encounter Badge (for canvas overlay) ──────────────────────────
export function EncounterBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-amber-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-lg animate-pulse hover:bg-amber-500"
    >
      🔥 {count} encounter{count > 1 ? "s" : ""} live
    </button>
  );
}
