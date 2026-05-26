"use client"

import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"

type CountdownTarget = {
  date: Date
  label: string
}

export function HeroCountdown({
  target,
  className,
}: {
  target: CountdownTarget
  className?: string
}) {
  const calculateRemaining = () => {
    const now = new Date()
    const diff = target.date.getTime() - now.getTime()
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }

  // Start as null to avoid server/client hydration mismatch
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateRemaining> | null>(null)

  useEffect(() => {
    // Set initial value immediately after client mount
    setTimeLeft(calculateRemaining())
    const interval = setInterval(() => {
      setTimeLeft(calculateRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Show placeholder when not mounted, keeping layout stable
  if (timeLeft === null) {
    return (
      <div className={cn("w-full", className)}>
        <div className="mb-3 text-center text-sm font-medium text-zinc-400">
          <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            Launching Soon
          </span>
        </div>
        
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {["Days", "Hrs", "Min", "Sec"].map((label) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4"
            >
              <span className="text-2xl font-bold tabular-nums text-zinc-50 sm:text-3xl md:text-4xl">
                00
              </span>
              <span className="mt-1 text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 text-center text-sm text-zinc-500">
          Target: {target.label}
        </div>
      </div>
    )
  }

  const timeUnits = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hrs" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Sec" },
  ]

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 text-center text-sm font-medium text-zinc-400">
        <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
          </span>
          Launching Soon
        </span>
      </div>
      
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {timeUnits.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4"
          >
            <span className="text-2xl font-bold tabular-nums text-zinc-50 sm:text-3xl md:text-4xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center text-sm text-zinc-500">
        Target: {target.label}
      </div>
    </div>
  )
}
