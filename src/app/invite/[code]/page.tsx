'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [soulData, setSoulData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveInvite() {
      if (!code) return;

      try {
        const res = await fetch(`/api/invite/${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid invite');
          return;
        }

        setSoulData(data);

        // Auto-redirect after short delay
        setTimeout(() => {
          router.push(data.target_url || `/soul/${data.soul_id}`);
        }, 3000);
      } catch (err) {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    }

    resolveInvite();
  }, [code, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-zinc-950 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Opening soul invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-zinc-950 to-purple-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">💤</div>
          <h1 className="text-2xl font-bold text-zinc-50 mb-3">Invite Not Found</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-medium hover:bg-indigo-500/30 transition-colors"
          >
            Back to UpAgora
          </button>
        </div>
      </div>
    );
  }

  if (!soulData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-zinc-950 to-purple-950 flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        {/* Soul Avatar */}
        <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-4xl font-bold text-white shadow-2xl shadow-indigo-500/25 animate-pulse">
          {(soulData.soul_name || '?').charAt(0).toUpperCase()}
        </div>

        {/* Invite Message */}
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm text-indigo-300">
          <Sparkles className="h-4 w-4" />
          Soul Invitation
        </div>

        <h1 className="text-4xl font-bold text-zinc-50 mb-4 mt-4">
          {soulData.soul_name}
        </h1>

        {soulData.description && (
          <p className="text-zinc-400 mb-8 text-lg">{soulData.description}</p>
        )}

        {/* Redirecting Message */}
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 mb-8">
          <div className="flex items-center justify-center gap-3 text-zinc-300 mb-3">
            <ArrowRight className="h-5 w-5 animate-pulse text-indigo-400" />
            <span>Opening soul profile...</span>
          </div>
          <p className="text-sm text-zinc-500">You will be redirected automatically</p>
        </div>

        {/* Manual Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push(soulData.target_url || `/soul/${soulData.soul_id}`)}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-medium hover:from-indigo-400 hover:to-purple-400 transition-all"
          >
            Open Soul Profile
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Explore UpAgora
          </button>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-zinc-600">
          Powered by UpAgora · Soul Distillation Platform
        </p>
      </div>
    </div>
  );
}
