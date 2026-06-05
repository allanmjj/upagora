'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/use-auth';
import SoulChat from '@/components/town/SoulChat';
import { SoulChatStudio } from '@/components/soul/SoulChatStudio';
import { SoulMemoryDisplay } from '@/components/soul/SoulMemoryDisplay';
import { SoulEvolutionTimeline } from '@/components/soul/SoulEvolutionTimeline';
import { SoulConstraintCard } from '@/components/soul/SoulConstraintCard';
import { SoulSchedulePreview } from '@/components/soul/SoulSchedulePreview';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface SoulData {
  id: string;
  name: string;
  name_native: string;
  persona_text: string | null;
  description: string | null;
  avatar_url: string | null;
  avatar_coordinates: string | null;
  guardian_id: string | null;
  origin_type: string | null;
  created_at: string;
  status: 'idle' | 'integrating' | 'integrated';
}

export default function SoulDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [soul, setSoul] = useState<SoulData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'constraints' | 'evolution' | 'schedule'>('chat');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSoul() {
      const id = params?.id as string;
      if (!id) return;

      const { data, error } = await supabase
        .from('soul_gallery')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Failed to load soul:', error);
      } else {
        setSoul(data as SoulData);
      }
      setLoading(false);
    }

    fetchSoul();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading soul...</div>
      </div>
    );
  }

  if (!soul) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💤</div>
          <div className="text-zinc-400">Soul not found</div>
          <button
            onClick={() => router.push('/soul')}
            className="mt-4 px-6 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Soul Registry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/soul')}
            className="text-sm text-zinc-500 hover:text-white mb-4 transition-colors"
          >
            ← Back to Soul Registry
          </button>
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-3xl shrink-0">
              {soul.avatar_url
                ? <Image
                src={soul.avatar_url}
                alt={soul.name}
                fill
                className="rounded-2xl object-cover"
                sizes="200px"
                loading="lazy"
              />
                : '🧬'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">
                {soul.name_native || soul.name}
              </h1>
              {soul.description && (
                <p className="text-zinc-400 mt-1">{soul.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  soul.status === 'idle'
                    ? 'bg-zinc-800 text-zinc-500'
                    : soul.status === 'integrating'
                    ? 'bg-amber-900/50 text-amber-300'
                    : 'bg-emerald-900/50 text-emerald-300'
                }`}>
                  {soul.status === 'idle' ? 'Created' : soul.status === 'integrating' ? 'Integrating...' : 'Integrated'}
                </span>
                {soul.origin_type && (
                  <span className="text-xs text-zinc-600">Origin: {soul.origin_type}</span>
                )}
                <span className="text-xs text-zinc-600">
                  Created: {new Date(soul.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={`/calibrate`}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium hover:from-violet-500 hover:to-purple-500 transition-all text-sm"
              >
                🎯 Calibrate
              </a>
              <a
                href={`/soul/${soul.id}/calibrate`}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 font-medium hover:bg-zinc-800 transition-all text-sm"
              >
                🧬 Soul Timeline
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('constraints')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'constraints'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              🧠 9D Constraints
            </button>
            <button
              onClick={() => setActiveTab('evolution')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'evolution'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              🔄 Evolution
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📅 Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex gap-6">
        {activeTab === 'chat' && (
          <>
            {/* Soul Chat Section */}
            <div className="flex-1">
              {soul.status === 'idle' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <span className="text-zinc-400">☁️</span> Getting started
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    This soul was just created. Begin calibration to give it shape and character.
                  </p>
                  <a
                    href={`/calibrate`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium hover:from-violet-500 hover:to-purple-500 transition-all text-sm"
                  >
                    🎯 Start Calibration →
                  </a>
                </div>
              )}

              {/* Soul Chat Interface */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="font-bold flex items-center gap-2">
                    💬 Chat with {soul.name_native || soul.name}
                  </h3>
                </div>
                <div className="h-96 bg-zinc-900 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <SoulMemoryDisplay soulId={soul.id} userId={user?.id} />
                  </div>
                  <SoulChatStudio
                    soulId={soul.id}
                    soulName={soul.name}
                    soulNameNative={soul.name_native}
                    userId={user?.id}
                    voiceEnabled={true}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 space-y-4">
              {/* Persona Info */}
              {soul.persona_text && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                  <h3 className="font-bold mb-2 text-sm">🧬 Personality</h3>
                  <div className="text-sm text-zinc-400">
                    {soul.persona_text.slice(0, 400)}
                    {soul.persona_text.length > 400 && '...'}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <h3 className="font-bold mb-3 text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <a
                    href={`/soul/${soul.id}/calendar`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors text-sm"
                  >
                    📅 Soul Calendar
                  </a>
                  <a
                    href={`/soul/${soul.id}/versions`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors text-sm"
                  >
                    🔀 Soul Versions
                  </a>
                  <a
                    href={`/gallery`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors text-sm"
                  >
                    🖼️ Gallery
                  </a>
                  <a
                    href={`/distill`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors text-sm"
                  >
                    🧬 New Distillation
                  </a>
                </div>
              </div>


            </div>
          </>
        )}

        {activeTab === 'constraints' && (
          <div className="flex-1">
            <SoulConstraintCard soulId={soul.id} />
          </div>
        )}

        {activeTab === 'evolution' && (
          <div className="flex-1">
            <SoulEvolutionTimeline soulId={soul.id} />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="flex-1">
            <SoulSchedulePreview soulId={soul.id} soulName={soul.name_native || soul.name} />
          </div>
        )}
      </div>
    </div>
  );
}
