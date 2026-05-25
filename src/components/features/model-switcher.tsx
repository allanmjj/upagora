"use client";

import { useState, useEffect } from "react";
import { Settings, Check, Brain, Zap, Crown } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  price: string;
  context_window: number;
  recommended?: boolean;
}

export function ModelSwitcher() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [preferred, setPreferred] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/model")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models || []);
        setPreferred(data.preferred || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelect = async (modelId: string) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem("sb-access-token");
      await fetch("/api/settings/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model_id: modelId }),
      });
      setPreferred(modelId);
      setIsOpen(false);
    } finally {
      setUpdating(false);
    }
  };

  const currentModel = models.find((m) => m.id === preferred);

  const iconMap: Record<string, typeof Brain> = {
    Anthropic: Brain,
    OpenAI: Zap,
    Google: Crown,
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-3 animate-pulse">
        <div className="h-4 w-28 bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-3 py-2 text-sm hover:border-zinc-700/50 transition-colors"
      >
        <Settings className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-zinc-400">Model:</span>
        <span className="text-zinc-200 font-medium">
          {currentModel?.name || "Default"}
        </span>
        {currentModel?.recommended && (
          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded">
            Recommended
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
            <div className="p-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300">
                Choose Soul Chat Model
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Different models have different personality depth & speed
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {models.map((model) => {
                const Icon =
                  iconMap[model.provider as keyof typeof iconMap] || Brain;
                const isActive = model.id === preferred;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    disabled={updating}
                    className={`w-full text-left p-3 flex gap-3 border-b border-zinc-800/50 last:border-0 transition-colors ${
                      isActive
                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : "hover:bg-zinc-900/50"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 flex-shrink-0 ${
                        isActive ? "bg-amber-500/10" : "bg-zinc-800/50"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? "text-amber-400" : "text-zinc-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-zinc-200">
                          {model.name}
                        </span>
                        {model.recommended && (
                          <span className="px-1 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded">
                            ★
                          </span>
                        )}
                        {isActive && <Check className="h-3.5 w-3.5 text-green-400 ml-auto" />}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-600">
                          {model.provider} · {model.price}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {(model.context_window / 1000).toFixed(0)}K ctx
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
