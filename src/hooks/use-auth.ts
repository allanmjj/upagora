'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AuthUser } from '@/types/api'

/**
 * Authentication state hook.
 * Fetches /api/auth/me to determine if the user is logged in,
 * and provides the current user data + loading state.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setUser(data.data)
          return
        }
      }
      setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
  }, [])

  return { user, loading, logout, refetch: fetchUser }
}
