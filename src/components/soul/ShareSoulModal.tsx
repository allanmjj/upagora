'use client';

import { useState, useCallback } from 'react';
import { X, Download, Link2, Share2, ExternalLink, Check, Copy, UserPlus } from 'lucide-react';
import { SoulCard } from './SoulCard';

interface ShareSoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionSlug: string;
  subjectName: string;
  soulData: {
    subject_name: string;
    initials: string;
    dimensions: Record<string, number>;
    dimension_labels: Record<string, string>;
    excerpt?: string;
    calibration_count?: number;
    chat_messages?: number;
  };
}

export function ShareSoulModal({ isOpen, onClose, sessionId, sessionSlug, subjectName, soulData }: ShareSoulModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://upagora.com';
  const shareUrl = sessionSlug ? `${baseUrl}/soul/${sessionSlug}` : `${baseUrl}/soul/${sessionId}`;

  const copyLink = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const generateInvite = useCallback(async () => {
    setGeneratingInvite(true);
    try {
      const res = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soul_id: sessionId, type: 'chat' }),
      });
      const data = await res.json();
      if (data.invite_url) {
        setInviteCode(data.invite_url);
      }
    } catch (err) {
      console.error('Failed to generate invite:', err);
    } finally {
      setGeneratingInvite(false);
    }
  }, [sessionId]);

  const shareToTwitter = useCallback(() => {
    const text = `Meet ${subjectName}'s digital soul on UpAgora — a soul distillation platform that preserves wisdom and personality.`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }, [subjectName, shareUrl]);

  const shareToNative = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${subjectName}'s Soul — UpAgora`,
        text: `Meet ${subjectName}'s digital soul on UpAgora`,
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  }, [subjectName, shareUrl]);

  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm p-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-50">Share Soul Card</h2>
            <p className="text-sm text-zinc-400 mt-1">Share {subjectName}&apos;s digital soul</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Soul Card Preview */}
          <div className="rounded-xl bg-zinc-950/50 p-4 border border-zinc-800">
            <SoulCard data={soulData} />
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            {/* Copy Link */}
            <div className="flex items-center gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                <Link2 className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200">Share Link</div>
                <div className="text-xs text-zinc-400 truncate">{shareUrl}</div>
              </div>
              <button
                onClick={() => void copyLink(shareUrl)}
                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Invite Link */}
            <div className="flex items-center gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                <UserPlus className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200">Invite Link</div>
                <div className="text-xs text-zinc-400">
                  {inviteCode
                    ? <span className="truncate block">{inviteCode}</span>
                    : 'Generate a tracked invite link'}
                </div>
              </div>
              {inviteCode ? (
                <button
                  onClick={() => void copyLink(inviteCode)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              ) : (
                <button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {generatingInvite ? 'Generating...' : 'Generate'}
                </button>
              )}
            </div>

            {/* Native Share */}
            {canNativeShare && (
              <button
                onClick={shareToNative}
                className="w-full flex items-center gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 hover:bg-zinc-800/70 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Share2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-zinc-200">Share to Apps</div>
                  <div className="text-xs text-zinc-400">Messaging, email, social media</div>
                </div>
                <Share2 className="h-5 w-5 text-zinc-400" />
              </button>
            )}

            {/* Twitter/X */}
            <button
              onClick={shareToTwitter}
              className="w-full flex items-center gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 hover:bg-zinc-800/70 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
                <svg className="h-5 w-5 text-zinc-200" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-zinc-200">Share on X</div>
                <div className="text-xs text-zinc-400">Post about this soul</div>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-400" />
            </button>

            {/* Open Soul Page */}
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 hover:bg-zinc-800/70 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <ExternalLink className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-zinc-200">View Soul Page</div>
                <div className="text-xs text-zinc-400">Open full profile in new tab</div>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-400" />
            </a>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3">
            <p className="text-xs text-indigo-300">
              Shared links show a soul preview card on social media with profile and stats.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
