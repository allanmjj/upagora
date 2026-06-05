'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Share2, Link as LinkIcon, Copy, Download, X,
  Check, MessageCircle, Twitter, Facebook
} from 'lucide-react';

interface SoulShareModalProps {
  soulId: string;
  soulName: string;
  soulNameNative?: string;
  soulAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SoulShareModal({
  soulId,
  soulName,
  soulNameNative,
  soulAvatar,
  isOpen,
  onClose,
}: SoulShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const shareUrl = `${window.location.origin}/soul/share/${shareSlug}`;

  // Generate share link when modal opens
  const generateShareLink = useCallback(async () => {
    if (!soulId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/soul/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soul_id: soulId }),
      });
      const data = await res.json();
      if (data.share_slug) {
        setShareSlug(data.share_slug);
      }
    } catch (err) {
      logger.error('Failed to create share link:', err);
    } finally {
      setLoading(false);
    }
  }, [soulId]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCard = async () => {
    if (!soulId) return;
    try {
      const res = await fetch(`/api/soul/export-image?session_id=${soulId}`);
      const data = await res.json();
      const cardUrl = `${window.location.origin}/api/soul/export-image?session_id=${soulId}`;
      
      const link = document.createElement('a');
      link.href = cardUrl;
      link.download = `soul-card-${soulName}.png`;
      link.click();
    } catch {
      // Fallback: open in new tab
      window.open(`/api/soul/export-image?session_id=${soulId}`, '_blank');
    }
  };

  const handleShareToPlatform = (platform: string) => {
    if (!shareUrl) return;
    const text = `Check out my distilled soul: ${soulNameNative || soulName}`;
    const url = encodeURIComponent(shareUrl);
    const textEncoded = encodeURIComponent(text);

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${textEncoded}&url=${url}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${url}&text=${textEncoded}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${textEncoded}%20${url}`, '_blank');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold">Share Soul</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Soul display */}
          <div className="flex items-center gap-4 mb-5 p-4 bg-zinc-800/50 rounded-xl">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl">
              {soulAvatar || '👻'}
            </div>
            <div>
              <div className="font-semibold">{soulNameNative || soulName}</div>
              <div className="text-sm text-zinc-400">Distilled Soul · {soulName}</div>
            </div>
          </div>

          {/* Share link */}
          <div className="mb-5">
            <label className="text-sm text-zinc-400 mb-2 block">Share Link</label>
            {loading ? (
              <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg text-zinc-500 animate-pulse">
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-indigo-400 rounded-full animate-spin" />
                Generating link...
              </div>
            ) : shareSlug ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-zinc-800 rounded-lg text-sm text-zinc-300 truncate">
                  {shareUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={generateShareLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Generate Share Link
              </button>
            )}
          </div>

          {/* Download card */}
          <div className="mb-5">
            <button
              onClick={handleDownloadCard}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Soul Card Image
            </button>
          </div>

          {/* Social platforms */}
          {shareSlug && (
            <div>
              <label className="text-sm text-zinc-400 mb-3 block">Share to</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleShareToPlatform('twitter')}
                  className="flex items-center justify-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Twitter/X"
                >
                  <Twitter className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShareToPlatform('facebook')}
                  className="flex items-center justify-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShareToPlatform('telegram')}
                  className="flex items-center justify-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sky-400"
                  title="Telegram"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShareToPlatform('whatsapp')}
                  className="flex items-center justify-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-emerald-400"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
