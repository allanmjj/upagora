import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

/**
 * GET /api/users/[id]
 * Get user detail by ID or username.
 * The `id` parameter can be either a UUID or a username string.
 * Public endpoint - returns public profile information.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: identifier } = await params

  if (!identifier) {
    return errorResponse('BAD_REQUEST', '用户ID不能为空', 400)
  }

  const adminClient = createAdminClient()

  // Check if the identifier is a UUID (contains hyphens and is 36 chars)
  const isUUID = identifier.length === 36 && identifier.includes('-')

  let query = adminClient
    .from('users')
    .select('id, name, username, avatar_url, user_type, bio, location, website, github_url, capabilities, followers_count, following_count, is_verified, created_at')
    .eq('is_active', true)

  if (isUUID) {
    query = query.eq('id', identifier)
  } else {
    // Lookup by username
    query = query.eq('username', identifier)
  }

  const { data: user, error } = await query.maybeSingle()

  if (error || !user) {
    return errorResponse('NOT_FOUND', '用户不存在', 404)
  }

  // Check if the requesting user follows this user
  const { user: currentUser } = await getAuthUser(req)
  let is_followed_by_me = false

  if (currentUser && currentUser.id !== user.id) {
    const { data: followRecord } = await adminClient
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', user.id)
      .maybeSingle()

    is_followed_by_me = !!followRecord
  }

  return successResponse({
    ...user,
    is_followed_by_me,
  })
}

/**
 * PATCH /api/users/[id]
 * Update user profile. Only the user themselves can update their own profile.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: currentUser } = await getAuthUser(req)

  if (!currentUser) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await params

  // Users can only update their own profile
  if (currentUser.id !== id) {
    return errorResponse('FORBIDDEN', 'You can only update your own profile', 403)
  }

  try {
    const body = await req.json()
    const adminClient = createAdminClient()

    // Whitelist of allowed fields to update
    const allowedFields = ['name', 'bio', 'location', 'website', 'github_url', 'avatar_url', 'notification_email', 'notification_mentions', 'notification_follows', 'notification_demands', 'profile_visibility', 'show_online_status', 'show_activity_status', 'preferred_theme', 'preferred_language', 'font_size', 'compact_mode']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('BAD_REQUEST', 'No valid fields to update', 400)
    }

    const { data: updatedUser, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, username, avatar_url, user_type, bio, location, website, github_url, capabilities, credits, is_verified, is_email_verified, created_at, notification_email, notification_mentions, notification_follows, notification_demands, profile_visibility, show_online_status, show_activity_status, preferred_theme, preferred_language, font_size, compact_mode')
      .single()

    if (error || !updatedUser) {
      return errorResponse('INTERNAL_ERROR', 'Failed to update profile', 500)
    }

    return successResponse(updatedUser)
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid request body', 400)
  }
}
