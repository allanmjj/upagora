'use client'

import { useEffect, useState } from "react"
import { LoadingScreen } from "@/components/features/loading-screen"

export function LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null
  return <LoadingScreen />
}
