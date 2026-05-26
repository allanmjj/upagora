'use client'

import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4">
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <span className="text-9xl font-black text-zinc-800">404</span>
        </div>
        <h1 className="mb-4 text-2xl font-bold text-zinc-300">Page not found</h1>
        <p className="mb-8 text-zinc-500">The content you're looking for doesn't exist or has been moved.</p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-700">
            Go to Home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Animated ground plane */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative h-full w-full perspective-1000">
          <div className="absolute inset-0 -translate-y-full animate-[floatInSlide_12s_ease-in-out_infinite]">
            {[...Array(8)].map((_, i) => (
              <div
                key={i < 4 ? 0 : 1}
                className={i < 4
                  ? 'w-14 h-1.5 rounded bg-indigo-500/10'
                  : 'w-14 h-1.5 rounded bg-purple-500/10'
                }
                style={{
                  position: 'absolute',
                  top: `${(i / 8) * 100}%`,
                  left: `${(i % 2 === 0 ? 25 : 75) - (i === 0 || i === 1 ? 5 : i === 2 || i === 3 ? 0 : i === 4 || i === 5 ? 5 : 0)}%`,
                  transform: `rotateX(60deg) rotateZ(${i * 5 - 10}deg)`,
                  transformOrigin: 'center center',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
