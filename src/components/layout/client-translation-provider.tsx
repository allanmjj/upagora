"use client";

import dynamic from "next/dynamic";

const TranslationProvider = dynamic(
  () => import("@/lib/i18n").then(mod => ({ default: mod.TranslationProvider })),
  { ssr: false }
);

export function ClientTranslationProvider({ children }: { children: React.ReactNode }) {
  return <TranslationProvider>{children}</TranslationProvider>;
}
