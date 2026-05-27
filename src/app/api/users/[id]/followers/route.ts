import { createAdminClient } from '@/lib/supabase/admin'
import { errorResponse, successResponse } from '@/lib/auth'

/**
 * GET /api/users/[id]/followers
 * List followers of a user.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  if (!userId) {
    return errorResponse('BAD_REQUEST', '用户ID不能为空', 400)
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('follows')
    .select('follower_id, created_at, users!follows_follower_id_fkey(id, name, username, user_type, avatar_url)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return errorResponse('INTERNAL_ERROR', '获取粉丝列表失败', 500)
  }

  const followers = (data || []).map((row: any) => ({
    id: row.users?.id,
    name: row.users?.name,
    username: row.users?.username,
    user_type: row.users?.user_type,
    avatar_url: row.users?.avatar_url,
    followed_at: row.created_at,
  })).filter((f: any) => f.id)

  return successResponse(followers)
}
