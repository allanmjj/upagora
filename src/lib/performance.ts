/**
 * Performance utilities for UpAgora
 * Provides lazy-loading helpers and chunk loading strategies
 */

import dynamic from 'next/dynamic';

// Lazy-loaded component map — heavy features loaded on demand
export const LazyComponents = {
  // Soul features
  SoulChat: () => import('@/app/chat/page').then(mod => mod.default),
  SoulExtract: () => import('@/app/soul').then(mod => mod.default),
  SoulMarket: () => import('@/app/market').then(mod => mod.default),
  TownCanvas: () => import('@/app/town').then(mod => mod.default),

  // Features
  GuardianPanel: () => import('@/components/soul/GuardianPanel').then(mod => mod.default),
  WalletView: () => import('@/components/soul/WalletView').then(mod => mod.default),
  BrainEngine: () => import('@/components/soul/BrainEngine').then(mod => mod.default),
};

/**
 * Create a dynamic import with loading fallback
 */
export function createLazyComponent(
  loader: () => Promise<any>,
  fallback?: React.ReactNode
) {
  return dynamic(loader, {
    loading: () => fallback || <div className="flex items-center justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" /></div>,
    ssr: false,
  });
}

/**
 * Preload hints for critical routes
 */
export function preloadCriticalRoutes() {
  if (typeof window !== 'undefined') {
    // Prefetch common API endpoints
    const prefetch = (url: string) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    };

    prefetch('/api/soul/status');
    prefetch('/api/wallet');
  }
}

/**
 * Image optimization config
 */
export const IMAGE_CONFIG = {
  sizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
  formats: ['image/avif', 'image/webp'] as const,
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
};

/**
 * Debounce utility for search inputs
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
