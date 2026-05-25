import SoulMarketplace from '@/components/soul/SoulMarketplace'

export const metadata = {
  title: 'Soul Marketplace — UpAgora',
  description: 'Browse, trade, and acquire distilled souls crafted by the community',
}

export default function SoulMarketplacePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SoulMarketplace />
    </div>
  )
}
