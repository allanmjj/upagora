"use client";

import { useState } from "react";

const GIFT_OPTIONS = [
  { type: "letter", icon: "✉️", label: "Letter", desc: "A heartfelt letter" },
  { type: "memory", icon: "🧠", label: "Memory", desc: "Share a memory" },
  { type: "wish", icon: "💫", label: "Wish", desc: "Send a wish" },
  { type: "flower", icon: "🌸", label: "Flower", desc: "A bouquet" },
  { type: "tea", icon: "🍵", label: "Tea", desc: "A cup of tea" },
  { type: "book", icon: "📖", label: "Book", desc: "A favorite book" },
  { type: "star", icon: "⭐", label: "Star", desc: "Catch a star" },
];

const GIFT_TYPE_MAP: Record<string, string> = {
  letter: "letter",
  memory: "memory",
  wish: "wish",
  flower: "gift",
  tea: "gift",
  book: "gift",
  star: "gift",
};

export function GuardianMessagePanel({ soul, onSent }: { soul: { id: string; name: string }; onSent?: () => void }) {
  const [msg, setMsg] = useState("");
  const [selectedGift, setSelectedGift] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = msg.trim().length > 0 && !sending;

  const send = async () => {
    setSending(true);
    const type = GIFT_TYPE_MAP[selectedGift] || "letter";
    try {
      const res = await fetch("/api/town/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul_id: soul.id,
          type,
          content: msg.trim(),
          gift_type: selectedGift || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setMsg("");
        setSelectedGift("");
        onSent?.();
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-10">
        <p className="text-4xl mb-4">💌</p>
        <p className="text-zinc-300 font-semibold mb-2">Sent successfully!</p>
        <p className="text-sm text-zinc-500 mb-4">
          {soul.name} will cherish your message.
        </p>
        <button onClick={() => setSent(false)} className="text-xs text-amber-400 hover:text-amber-300">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gift selector */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Choose a gesture:</div>
        <div className="flex flex-wrap gap-1.5">
          {GIFT_OPTIONS.map((g) => (
            <button
              key={g.type}
              onClick={() => setSelectedGift(g.type === selectedGift ? "" : g.type)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                selectedGift === g.type
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              title={g.desc}
            >
              <span>{g.icon}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 p-4">
        <textarea
          className="w-full h-32 resize-none bg-zinc-900 text-white text-sm rounded-lg border border-zinc-700 p-3 focus:outline-none focus:border-amber-500"
          placeholder={
            selectedGift
              ? `Share what's on your mind...`
              : `Write a message to ${soul.name}...`
          }
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) send();
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-zinc-600">⌘↵ to send</span>
          <button
            onClick={send}
            disabled={!canSend}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {sending ? "Sending..." : selectedGift ? `${GIFT_OPTIONS.find(g => g.type === selectedGift)?.icon || ""} Send` : "✉️ Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
