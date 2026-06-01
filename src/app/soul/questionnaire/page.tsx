'use client';

import SoulQuestionnaire from '@/components/soul/SoulQuestionnaire';

export default function SoulQuestionnairePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Soul Personality Questionnaire</h1>
        <p className="text-zinc-400">Map your personality across 7 dimensions to create your soul profile.</p>
      </div>
      <SoulQuestionnaire />
    </div>
  );
}
