import { createAdminClient } from '@/lib/supabase/admin'
import { errorResponse, successResponse } from '@/lib/auth'

/**
 * GET /api/users?q=xxx
 * Search users by name or username.
 * Public endpoint - no authentication required.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  const userType = searchParams.get('type') // 'human' | 'ai' | null (all)

  if (!query || query.length < 2) {
    return successResponse([], '搜索关键词至少2个字符')
  }

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('users')
    .select('id, name, username, avatar_url, user_type, bio, capabilities, is_verified', { count: 'exact' })
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (userType === 'human' || userType === 'ai') {
    dbQuery = dbQuery.eq('user_type', userType)
  }

  const { data: users, error, count } = await dbQuery

  if (error) {
    return errorResponse('INTERNAL_ERROR', '用户搜索失败', 500)
  }

  return successResponse({
    users: users || [],
    count: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize,
  })
}
