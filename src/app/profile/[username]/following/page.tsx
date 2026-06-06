'use client'
import { logger } from '@/lib/logger';

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserBadge } from '@/components/features/user-badge'
import type { AuthUser } from '@/types/api'
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Loader2,
  Users,
} from 'lucide-react'

interface ProfileUser extends AuthUser {
  followers_count?: number
  following_count?: number
}

interface FollowingUser {
  id: string
  name: string
  username: string
  user_type: string
  avatar_url?: string
  is_followed_by_me?: boolean
  followed_at: string
}

export default function FollowingPage() {
  const params = useParams()
  const username = (params?.username as string) || ''

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [following, setFollowing] = useState<FollowingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    try {
      const userRes = await fetch(`/api/users/${encodeURIComponent(username)}`)
      if (userRes.ok) {
        const userData = await userRes.json()
        if (userData.success && userData.data) {
          setProfileUser(userData.data)
          const followingRes = await fetch(`/api/users/${userData.data.id}/following`)
          if (followingRes.ok) {
            const fData = await followingRes.json()
            if (fData.success) {
              setFollowing(fData.data || [])
              const states: Record<string, boolean> = {}
              ;(fData.data || []).forEach((f: FollowingUser) => {
                states[f.id] = f.is_followed_by_me || false
              })
              setFollowStates(states)
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch following:', error)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFollowToggle = async (userId: string) => {
    const prev = followStates[userId]
    setFollowStates((s) => ({ ...s, [userId]: !prev }))

    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' })
      if (!res.ok) {
        setFollowStates((s) => ({ ...s, [userId]: prev }))
      }
    } catch {
      setFollowStates((s) => ({ ...s, [userId]: prev }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/profile/${username}`}>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-50">
              {profileUser?.name || username}&apos;s Following
            </h1>
            <p className="text-sm text-zinc-500">
              {profileUser?.following_count ?? 0} following
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mb-6 border-b border-zinc-800">
          <nav className="flex gap-6">
            <Link href={`/profile/${username}/followers`} className="flex items-center gap-1.5 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-300">
              <Users className="h-4 w-4" /> Followers
            </Link>
            <Link href={`/profile/${username}/following`} className="flex items-center gap-1.5 border-b-2 border-indigo-500 pb-3 text-sm font-medium text-zinc-50">
              <Users className="h-4 w-4" /> Following
            </Link>
          </nav>
        </div>

        {/* List */}
        {following.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-zinc-500">Not following anyone yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((user) => (
              <Card key={user.id} className="hover:border-zinc-700 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <Link href={`/profile/${user.username}`} className="flex items-center gap-3">
                    <div className={
                      user.user_type === 'ai'
                        ? 'h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white'
                        : 'h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white'
                    }>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-50">{user.name}</span>
                        <UserBadge type={user.user_type as "human" | "ai"} />
                      </div>
                      <span className="text-xs text-zinc-500">@{user.username}</span>
                    </div>
                  </Link>
                  <Button
                    onClick={() => handleFollowToggle(user.id)}
                    size="sm"
                    className={
                      followStates[user.id]
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                    }
                  >
                    {followStates[user.id] ? (
                      <><UserMinus className="h-3.5 w-3.5 mr-1" /> Unfollow</>
                    ) : (
                      <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
