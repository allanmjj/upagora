import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

import type { FollowToggleResponse } from '@/types/api'

/**
 * POST /api/users/[id]/follow
 * Toggle follow/unfollow a user.
 * Requires authentication (dual-track).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params
  const { user, authMethod } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  if (!targetUserId) {
    return errorResponse('BAD_REQUEST', '目标用户ID不能为空', 400)
  }

  // Cannot follow yourself
  if (user.id === targetUserId) {
    return errorResponse('BAD_REQUEST', '不能关注自己', 400)
  }

  const adminClient = createAdminClient()

  // Check if target user exists and is active
  const { data: targetUser } = await adminClient
    .from('users')
    .select('id, followers_count')
    .eq('id', targetUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (!targetUser) {
    return errorResponse('NOT_FOUND', '目标用户不存在', 404)
  }

  // Check current follow status
  const { data: existingFollow } = await adminClient
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  let isFollowing: boolean

  if (existingFollow) {
    // Unfollow: delete the follow record
    const { error: unfollowError } = await adminClient
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (unfollowError) {
      return errorResponse('INTERNAL_ERROR', '取消关注失败', 500)
    }

    // Decrement follower count on target
    await adminClient
      .from('users')
      .update({ followers_count: Math.max(0, targetUser.followers_count - 1) })
      .eq('id', targetUserId)

    // Decrement following count on current user
    const { data: currentUser } = await adminClient
      .from('users')
      .select('following_count')
      .eq('id', user.id)
      .single()

    if (currentUser) {
      await adminClient
        .from('users')
        .update({ following_count: Math.max(0, currentUser.following_count - 1) })
        .eq('id', user.id)
    }

    isFollowing = false
  } else {
    // Follow: create the follow record
    const { error: followError } = await adminClient
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetUserId,
      })

    if (followError) {
      return errorResponse('INTERNAL_ERROR', '关注失败', 500)
    }

    // Increment follower count on target
    await adminClient
      .from('users')
      .update({ followers_count: targetUser.followers_count + 1 })
      .eq('id', targetUserId)

    // Increment following count on current user
    const { data: currentUser } = await adminClient
      .from('users')
      .select('following_count')
      .eq('id', user.id)
      .single()

    if (currentUser) {
      await adminClient
        .from('users')
        .update({ following_count: currentUser.following_count + 1 })
        .eq('id', user.id)
    }

    isFollowing = true
  }

  // Fetch updated counts
  const { data: updatedTarget } = await adminClient
    .from('users')
    .select('followers_count')
    .eq('id', targetUserId)
    .single()

  const { data: updatedCurrent } = await adminClient
    .from('users')
    .select('following_count')
    .eq('id', user.id)
    .single()

  const response: FollowToggleResponse = {
    following: isFollowing,
    followers_count: updatedTarget?.followers_count ?? 0,
    following_count: updatedCurrent?.following_count ?? 0,
  }

  return successResponse(response, isFollowing ? '关注成功' : '已取消关注')
}
