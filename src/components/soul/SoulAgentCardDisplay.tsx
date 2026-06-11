'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

export interface SoulAgentCard {
  version: string;
  name: string;
  description: string;
  url: string;
  skills: Array<{
    id: string;
    name: string;
    description: string;
    inputSchema?: any;
    outputSchema?: any;
  }>;
  capabilities: {
    streaming: boolean;
    fileExchange: boolean;
    pushNotifications: boolean;
  };
  protocols: string[];
  metadata: {
    soulId: string;
    nameNative?: string;
    level: number;
    levelTitle: string;
    dimensions: Record<string, number>;
    guardianId?: string;
    guardianName?: string;
    isShared: boolean;
    status: string;
    avatarUrl?: string;
    personaExcerpt?: string;
  };
}

interface SoulAgentCardDisplayProps {
  soulId: string;
}

export function SoulAgentCardDisplay({ soulId }: SoulAgentCardDisplayProps) {
  const [card, setCard] = useState<SoulAgentCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('skills');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchCard() {
      try {
        const res = await fetch(`/api/a2a/souls/${soulId}/card`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Agent Card');
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [soulId]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyCard = async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(card, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(card, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-zinc-400">Loading Agent Card...</span>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="rounded-2xl border border-red-900/50 bg-red-900/10 p-6">
        <div className="text-red-400">⚠️ Failed to load Agent Card: {error}</div>
      </div>
    );
  }

  const levelColors: Record<number, string> = {
    1: 'from-zinc-500 to-zinc-400',
    2: 'from-blue-600 to-blue-400',
    3: 'from-green-600 to-green-400',
    4: 'from-yellow-600 to-yellow-400',
    5: 'from-orange-600 to-orange-400',
    6: 'from-red-600 to-red-400',
  };

  const levelColor = levelColors[card.metadata.level] || 'from-violet-600 to-purple-400';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${levelColor} flex items-center justify-center text-xl font-bold`}
            >
              {card.metadata.level}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {card.name}
                {card.metadata.nameNative && (
                  <span className="text-zinc-400 ml-2">{card.metadata.nameNative}</span>
                )}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${levelColor} text-white`}
                >
                  Lv.{card.metadata.level} {card.metadata.levelTitle}
                </span>
                <span className="text-xs text-zinc-500">
                  Status: {card.metadata.status}
                </span>
                {card.metadata.isShared && (
                  <span className="text-xs text-emerald-400">● Shared</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCard}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              {copied ? '✓ Copied' : '📋 Copy JSON'}
            </button>
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Agent URL
            </a>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-4">{card.description}</p>

        {/* Protocols */}
        <div className="flex items-center gap-2 flex-wrap">
          {card.protocols.map((protocol) => (
            <span
              key={protocol}
              className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
            >
              {protocol}
            </span>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          ⚡ Capabilities
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`text-xs p-2 rounded-lg border ${
              card.capabilities.streaming
                ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-400'
                : 'border-zinc-800 bg-zinc-800/50 text-zinc-500'
            }`}
          >
            {card.capabilities.streaming ? '✓' : '✗'} Streaming
          </div>
          <div
            className={`text-xs p-2 rounded-lg border ${
              card.capabilities.fileExchange
                ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-400'
                : 'border-zinc-800 bg-zinc-800/50 text-zinc-500'
            }`}
          >
            {card.capabilities.fileExchange ? '✓' : '✗'} File Exchange
          </div>
          <div
            className={`text-xs p-2 rounded-lg border ${
              card.capabilities.pushNotifications
                ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-400'
                : 'border-zinc-800 bg-zinc-800/50 text-zinc-500'
            }`}
          >
            {card.capabilities.pushNotifications ? '✓' : '✗'} Push Notifications
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <button
          onClick={() => toggleSection('skills')}
          className="flex items-center gap-2 w-full text-sm font-bold mb-3"
        >
          {expandedSection === 'skills' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          🛠️ Skills ({card.skills.length})
        </button>
        {expandedSection === 'skills' && (
          <div className="space-y-2 mt-2">
            {card.skills.map((skill) => (
              <div key={skill.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">{skill.id}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{skill.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <button
          onClick={() => toggleSection('dimensions')}
          className="flex items-center gap-2 w-full text-sm font-bold mb-3"
        >
          {expandedSection === 'dimensions' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          📊 Soul Dimensions
        </button>
        {expandedSection === 'dimensions' && (
          <div className="space-y-2 mt-2">
            {Object.entries(card.metadata.dimensions).map(([dim, score]) => (
              <div key={dim} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-40 truncate">
                  {dim.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full"
                    style={{ width: `${Math.round((score || 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-10 text-right">
                  {((score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guardian */}
      {card.metadata.guardianName && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-bold mb-2">👤 Guardian</h3>
          <p className="text-sm text-zinc-400">{card.metadata.guardianName}</p>
        </div>
      )}

      {/* Version */}
      <div className="text-center text-xs text-zinc-600">
        A2A Protocol v{card.version}
      </div>
    </div>
  );
}
