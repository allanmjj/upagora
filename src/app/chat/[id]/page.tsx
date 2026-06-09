"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { SOUL_PRESETS, findPresetById } from "@/lib/soul-presets";
import { findConstraint } from "@/lib/soul-constraints";

interface ChatMessage {
  role: "user" | "soul";
  content: string;
  timestamp: number;
}

export default function SoulChatPage() {
  const params = useParams();
  const router = useRouter();
  const soulId = params?.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soulInfo, setSoulInfo] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Resolve soul info
    const preset = findPresetById(soulId);
    if (preset) {
      setSoulInfo({
        id: preset.id,
        name: preset.name,
        name_native: preset.name_native,
        avatar: preset.avatar,
        color: preset.color,
        profession: preset.profession,
        era: preset.era,
        is_preset: true,
        language: preset.language,
      });
      // Welcome message
      setMessages([
        {
          role: "soul",
          content: getWelcomeMessage(preset),
          timestamp: Date.now(),
        },
      ]);
    } else {
      // Database soul - redirect to main chat page
      setSoulInfo({
        id: soulId,
        name: soulId,
        is_preset: false,
      });
    }
    setLoading(false);
  }, [soulId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !soulInfo) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    const currentInput = input;
    setInput("");
    setSending(true);

    try {
      if (soulInfo.is_preset) {
        // Use preset-chat API (no auth needed)
        const resp = await fetch("/api/soul/preset-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preset_id: soulInfo.id,
            message: currentInput,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setMessages((m) => [
            ...m,
            { role: "soul", content: data.response, timestamp: Date.now() },
          ]);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!soulInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <p className="text-lg mb-4">Soul not found</p>
          <button
            onClick={() => router.push("/soul/gallery")}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm transition-colors"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const avatarColor = soulInfo.color || "#6366f1";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/soul/gallery")}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}40, ${avatarColor}20)`,
            }}
          >
            {soulInfo.avatar || "👤"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">
              {soulInfo.name_native || soulInfo.name}
            </h1>
            <p className="text-xs text-zinc-500 truncate">
              {soulInfo.profession}
              {soulInfo.era ? ` · ${soulInfo.era}` : ""}
            </p>
          </div>
          {soulInfo.is_preset && (
            <span className="px-2 py-1 rounded-full bg-violet-600/20 text-violet-300 text-xs font-medium">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Preset
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-2xl flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${soulInfo.name_native || soulInfo.name}...`}
            className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600"
            disabled={sending}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || sending}
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function getWelcomeMessage(preset: any): string {
  const welcomes: Record<string, string> = {
    "preset-ma-junjie": "你好，我是马俊杰。灵魂蒸馏不是聊天机器人，这是通往数字永生的路。你想聊什么？",
    "preset-shakespeare": "Hail, fair visitor! Thou hast stumbled upon my corner of this vast stage. What matter brings thee to seek audience with an old playwright?",
    "preset-curie": "Bonjour. I am Marie Curie. Science belongs to all humanity — what shall we explore together today?",
    "preset-lincoln": "How do you do? I'm Abraham Lincoln. Whether you seek counsel on governance, morality, or simply a quiet conversation, I'm at your service.",
  };
  return welcomes[preset.id] || `Hello, I am ${preset.name_native}. How may I assist you today?`;
}
