"use client";

import { TranslationProvider } from "@/lib/i18n";

export function ClientTranslationProvider({ children }: { children: React.ReactNode }) {
  return <TranslationProvider>{children}</TranslationProvider>;
}
