use client;

import { useEffect, useRef, useState } from "react";
import { getTownChatClient } from "@/lib/town-chat-client";

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  melancholic: "😔",
  anxious: "😟",
  inspired: "✨",
};

const BUILDING_NAMES: Record<string, string> = {
  plaza: "Town Plaza",
  library: "Library",
  workshop: "Workshop",
  bar: "The Raven Bar",
  garden: "Zen Garden",
  temple: "Temple",
  teahouse: "Teahouse",
  theater: "Theater",
  house: "Home",
};

interface Soul {
  id: string;
  name: string;
  name_native: string;
  language: string;
  mood: string;
  energy: number;
  social_need: number;
  current_region: string;
  today_events_count: number;
  avatar: string;
  color: string;
}

export function TownChatPanel({
  soul,
  onClose,
}: {
  soul: Soul;
  onClose: () => void;
}) {
  const chatClient = getTownChatClient();
  const [messages, setMessages] = useState<
    { role: "user" | "soul"; content: string; isTyping?: boolean }[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [greeting, setGreeting] = useState<string>("");
  const [nearby, setNearby] = useState<string[]>([]);
  const [nowTime, setNowTime] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load greeting on mount
  useEffect(() => {
    chatClient.fetchWelcome(soul.id).then((data) => {
      if (data) {
        setGreeting(data.greeting);
        setNearby(data.town_context.nearby_names || []);
        setNowTime(
          `It is ${data.town_context.mood_emoji} mood in ${
            BUILDING_NAMES[data.town_context.region] || data.town_context.region
          }`,
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soul.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending) return;
    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "soul" as const, content: "", isTyping: true },
    ]);
    let full = "";
    await chatClient.sendMessage(
      soul.id,
      text,
      messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      (token) => {
        full += token;
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: full } : m,
          ),
        );
      },
      (resp) => {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { role: "soul" as const, content: resp }
              : m,
          ),
        );
        setIsSending(false);
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { role: "soul" as const, content: `⚠️ ${err}` }
              : m,
          ),
        );
        setIsSending(false);
      },
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-white font-bold">💬 Chat</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Soul info */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: soul.color }}
        >
          {soul.avatar || MOOD_EMOJIS[soul.mood] || "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold truncate">
            {soul.name_native || soul.name}
          </h3>
          <p className="text-xs text-zinc-400">
            {nowTime || "Loading context..."} •{" "}
            <span className="text-amber-400">
              {MOOD_EMOJIS[soul.mood]} {soul.mood}
            </span>
            {" • "}
            <span className="text-green-400">⚡ {soul.energy}%</span>
          </p>
        </div>
      </div>

      {/* Nearby souls */}
      {nearby.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500">
          👥 {nearby.join(", ")} are also around
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {greeting && messages.length === 0 && (
          <div className="text-center text-zinc-500 py-4">
            <p className="text-sm">{greeting}</p>
          </div>
        )}
        {messages.length === 0 && !greeting && (
          <div className="text-center text-zinc-600 py-8">
            <p>Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] px-3 py-2 text-sm rounded-2xl ${
                msg.role === "user"
                  ? "bg-amber-600 text-white rounded-br-md"
                  : "bg-zinc-800 text-zinc-200 rounded-bl-md"
              }`}
            >
              {msg.content}
              {msg.isTyping && (
                <span className="ml-1 inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isSending}
      />
    </div>
  );
}

function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (msg: string) => void;
  disabled: boolean;
}) {
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    if (msg.trim()) {
      onSend(msg.trim());
      setMsg("");
      ref.current && (ref.current.style.height = "auto");
    }
  };

  return (
    <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          className="flex-1 resize-none rounded-xl bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm min-h-[40px] max-h-[80px] focus:outline-none focus:border-amber-500"
          placeholder="Type a message..."
          value={msg}
          onChange={(e) => {
            setMsg(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(
              e.target.scrollHeight,
              80,
            ) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={disabled}
          rows={1}
        />
        <button
          onClick={send}
          disabled={disabled || !msg.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ➤
        </button>
      </div>
    </div>
  );
}