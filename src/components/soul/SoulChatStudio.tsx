'use client';

import SoulChatCore from '@/components/soul/SoulChatCore';
import { SoulMemoryDisplay } from '@/components/soul/SoulMemoryDisplay';

interface SoulChatStudioProps {
  soulId: string;
  soulName?: string;
  soulNameNative?: string;
  soulAvatar?: string;
  soulPersona?: string;
  userId?: string;
  voiceEnabled?: boolean;
  lang?: string;
}

export function SoulChatStudio({
  soulId,
  soulName,
  soulNameNative,
  soulAvatar = '👤',
  userId,
  voiceEnabled = true,
  lang = 'zh-CN',
}: SoulChatStudioProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Memory context bar */}
      {userId && (
        <div className="border-b border-zinc-800/50">
          <SoulMemoryDisplay soulId={soulId} userId={userId} />
        </div>
      )}

      {/* Chat area */}
      <SoulChatCore
        soulId={soulId}
        soulName={soulNameNative || soulName}
        soulAvatar={soulAvatar}
        voiceEnabled={voiceEnabled}
        lang={lang}
      />
    </div>
  );
}
