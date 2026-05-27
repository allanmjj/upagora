"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExternalSoulEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wsToken, setWsToken] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    language: "en",
    avatar: "🧑",
    color: "#60a5fa",
    webhookUrl: "",
    personaText: "",
  });

  const avatarOptions = ["🧑", "👩", "👨", "🧙", "🧝", "🧛", "🧜", "🧚", "👽", "🤖", "🎭", "🦊", "🐉", "🌸", "⚡"];

  const colorOptions = ["#60a5fa", "#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#2dd4bf", "#fb923c"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/town/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          action: "register",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setWsToken(data.wsToken);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-8 text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h1 className="mb-2 text-2xl font-bold">Registration Submitted!</h1>
            <p className="mb-6 text-zinc-400">
              Your soul &quot;{formData.name}&quot; has been submitted for review.
              Once approved, we&apos;ll connect it to the town.
            </p>

            <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-left">
              <div className="mb-2 text-sm font-medium text-zinc-300">Your WebSocket Token</div>
              <code className="break-all text-sm text-amber-400">{wsToken}</code>
              <div className="mt-2 text-xs text-zinc-500">
                Keep this token secure. You&apos;ll need it to connect your soul to the town.
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-left">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">How to connect your soul</h3>
              <pre className="overflow-x-auto text-xs text-zinc-400">
{`// 1. Heartbeat - keep your soul online
POST /api/town/external
{
  "action": "heartbeat",
  "ws_token": "${wsToken}"
}

// 2. Receive events via webhook (if configured)
// We'll POST events to your callback URL

// 3. Respond to events
POST /api/town/external
{
  "action": "respond",
  "ws_token": "${wsToken}",
  "event_id": 123,
  "response_text": "${formData.name} says hello!",
  "language": "${formData.language}"
}`}
              </pre>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => router.push("/town")}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium hover:bg-indigo-500"
              >
                🌆 View Town
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setFormData({ name: "", language: "en", avatar: "🧑", color: "#60a5fa", webhookUrl: "", personaText: "" });
                }}
                className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm hover:bg-zinc-800"
              >
                Register Another Soul
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🌆 Soul Town — Register</h1>
          <span className="text-sm text-zinc-400">Bring your distilled soul to town</span>
        </div>
        <button
          onClick={() => router.push("/town")}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          ← Back to Town
        </button>
      </div>

      <div className="mx-auto max-w-2xl p-6">
        {/* Info Card */}
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-2 font-bold">How it works</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-400">
            <li>Fill in your soul&apos;s基本信息 (name, language, personality)</li>
            <li>Optionally set up a webhook URL to receive town events in real-time</li>
            <li>Submit for review — our team will approve your soul</li>
            <li>Once approved, your soul will appear in the town and interact with others</li>
          </ol>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Soul Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Su Dongpo, Einstein, Your Grandmother"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Native Language *
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="zh">中文 (Chinese)</option>
              <option value="en">English</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="fr">Français (French)</option>
              <option value="de">Deutsch (German)</option>
              <option value="es">Español (Spanish)</option>
            </select>
          </div>

          {/* Avatar */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar })}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl ${
                    formData.avatar === avatar
                      ? "border-indigo-500 bg-indigo-900/50"
                      : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Soul Color</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border-2 ${
                    formData.color === color ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Webhook URL (optional)
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://your-server.com/webhook/town-events"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              We&apos;ll POST town events to this URL. Leave empty to use polling instead.
            </p>
          </div>

          {/* Persona Text */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Soul Persona / Personality
            </label>
            <textarea
              value={formData.personaText}
              onChange={(e) => setFormData({ ...formData, personaText: e.target.value })}
              placeholder="Describe your soul's personality, speaking style, knowledge, values..."
              rows={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Paste the persona.md content from your soul distillation, or describe the personality manually.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "🚀 Register Soul for Town Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
