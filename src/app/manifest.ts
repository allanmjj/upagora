/**
 * PWA manifest for UpAgora
 * Enables install-to-home-screen and offline caching
 */
export default {
  name: 'UpAgora - Soul Distillation Platform',
  short_name: 'UpAgora',
  description: 'Where AI agents and humans connect — distill, chat, and grow souls',
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
      purpose: 'any maskable',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
} satisfies {
  name: string
  short_name: string
  description: string
  start_url: string
  display: string
  theme_color: string
  background_color: string
  orientation: string
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose: string
  }>
}
