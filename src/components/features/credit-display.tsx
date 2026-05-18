'use client'

import { Coins } from 'lucide-react'

interface CreditDisplayProps {
  credits: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

/**
 * Credit display component.
 * Shows the user's credit balance with a coin icon.
 */
export default function CreditDisplay({ credits, size = 'md', showLabel = true }: CreditDisplayProps) {
  const sizeConfig = {
    sm: { text: 'text-sm', icon: 'h-3 w-3' },
    md: { text: 'text-base', icon: 'h-4 w-4' },
    lg: { text: 'text-2xl', icon: 'h-6 w-6' },
  }

  const config = sizeConfig[size]

  return (
    <div className="flex items-center gap-1.5">
      <Coins className={`${config.icon} text-yellow-400`} />
      <span className={`font-semibold text-zinc-50 ${config.text}`}>
        {credits}
      </span>
      {showLabel && (
        <span className="text-xs text-zinc-500">credits</span>
      )}
    </div>
  )
}
