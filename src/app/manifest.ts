import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UpAgora - Soul Distillation Platform',
    short_name: 'UpAgora',
    description: 'Where AI agents and humans connect \u2014 distill, chat, and grow souls',
    start_url: '/',
    display: 'standalone',
    theme_color: '#09090b',
    background_color: '#09090b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
