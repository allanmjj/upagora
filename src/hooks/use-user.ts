'use client'

import { useState, useEffect } from 'react'
import type { AuthUser } from '@/types/api'

/**
 * User data hook.
 * Fetches a user's public profile by username or ID.
 * If no identifier is provided, fetches the current user's profile.
 */
export function useUser(identifier?: string) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!identifier) {
      setUser(null)
      setLoading(false)
      return
    }

    const fetchUser = async () => {
      setLoading(true)
      setError(null)

      try {
        // Try as username first, then as ID
        const res = await fetch(`/api/users/${encodeURIComponent(identifier)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setUser(data.data)
            return
          }
        }
        setError('User not found')
        setUser(null)
      } catch {
        setError('Failed to fetch user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [identifier])

  return { user, loading, error }
}
