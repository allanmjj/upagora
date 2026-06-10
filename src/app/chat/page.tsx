"use client";

import { useEffect, useRef, useState } from "react";
import { useSoulVoice, detectEmotion, EMOTION_META, type SoulEmotion } from "@/components/soul/SoulVoice";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { ShareButton } from "@/components/features/ShareButton";

export default function SoulChatPage() {
  const [souls, setSouls] = useState<any[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { speak, stop, speaking, currentEmotion } = useSoulVoice();

  useEffect(() => {
    fetch("/api/soul/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.status?.sessions) {
          setSouls(d.status.sessions);
          if (d.status.sessions.length > 0) {
            setSelectedSoul(d.status.sessions[0]);
          }
        }
      })
      .catch(() => {
        setSouls([
          { id: "1", subject_name: "Trump", status: "complete" },
          { id: "2", subject_name: "Socrates", status: "complete" },
          { id: "3", subject_name: "Curie", status: "complete" },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedSoul || sending) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setStreamingText("");

    try {
      // Try streaming first
      const resp = await fetch("/api/soul/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSoul.id,
          message: userMsg.content,
          conversation_history: messages.slice(-10),
        }),
      });

      if (resp.ok && resp.headers.get("content-type")?.includes("text/event-stream")) {
        // SSE streaming
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullText += data.token;
                  setStreamingText(fullText);
                }
                if (data.done && fullText) {
                  setMessages((m) => [...m, { role: "assistant", content: fullText }]);
                  setStreamingText("");
                  // Auto-play TTS with emotion detection
                  if (ttsEnabled) {
                    const emotion = detectEmotion(fullText);
                    speak(fullText, { emotion, lang: 'en-US' });
                  }
                }
              } catch {}
            }
          }
        }
      } else {
        // Fallback to non-streaming
        const data = await resp.json();
        const text = data.response || "...";
        setMessages((m) => [...m, { role: "assistant", content: text }]);
        if (ttsEnabled) {
          const emotion = detectEmotion(text);
          speak(text, { emotion, lang: 'en-US' });
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Soul is resting right now. Try again later." }]);
    }
    setSending(false);
  };

  const handleMessageTTS = (text: string) => {
    if (speaking) {
      stop();
    } else {
      const emotion = detectEmotion(text);
      speak(text, { emotion, lang: 'en-US' });
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Soul List Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="text-lg font-bold">💬 Soul Chat</h1>
        </div>
        <div className="overflow-y-auto p-2">
          {souls.map((soul) => (
            <button
              key={soul.id}
              onClick={() => { setSelectedSoul(soul); setMessages([]); }}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                selectedSoul?.id === soul.id ? "bg-indigo-600/30" : "hover:bg-zinc-800"
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-lg font-bold">
                {soul.subject_name?.[0] || "?"}
              </div>
              <div>
                <div className="font-medium">{soul.subject_name || "Unknown"}</div>
                <div className="text-xs text-zinc-400 capitalize">{soul.status || "active"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedSoul ? (
          <>
            {/* Chat Header with TTS toggle */}
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-lg font-bold">
                {selectedSoul.subject_name?.[0] || "?"}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">{selectedSoul.subject_name}</div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Digital Soul — Online</span>
                  {speaking && (
                    <span className={`flex items-center gap-1 ${EMOTION_META[currentEmotion].color}`}>
                      {EMOTION_META[currentEmotion].icon} {EMOTION_META[currentEmotion].label}
                    </span>
                  )}
                </div>
              </div>
              {/* TTS Toggle */}
              <button
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                  if (speaking) stop();
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  ttsEnabled ? "bg-indigo-600/20 text-indigo-400" : "bg-zinc-800 text-zinc-500"
                }`}
                title={ttsEnabled ? "Soul Voice ON — Click to mute" : "Soul Voice OFF — Click to enable"}
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {ttsEnabled ? "Voice On" : "Muted"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && !streamingText && (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">👋</div>
                    <div>Say hello to {selectedSoul.subject_name}</div>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group relative max-w-md rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {msg.content}
                    {/* TTS button for assistant messages */}
                    {msg.role === "assistant" && ttsEnabled && (
                      <button
                        onClick={() => handleMessageTTS(msg.content)}
                        className="absolute -right-2 -top-2 hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-zinc-700 hover:bg-indigo-600 transition-colors"
                        title="Play voice"
                      >
                        {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Streaming text */}
              {streamingText && (
                <div className="mb-3 flex justify-start">
                  <div className="max-w-md rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-100">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse" />
                  </div>
                </div>
              )}
              {sending && !streamingText && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{selectedSoul.subject_name} is thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 bg-zinc-900 px-6 py-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Message ${selectedSoul.subject_name}...`}
                  className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-zinc-500">
            Select a soul to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
