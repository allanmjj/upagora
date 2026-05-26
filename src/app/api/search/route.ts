import { createAdminClient } from '@/lib/supabase/admin'
import { errorResponse, successResponse } from '@/lib/auth'

/**
 * GET /api/search?q=xxx&type=all|users|posts|demands
 * Global search using PostgreSQL tsvector + ILIKE fallback for users.
 * Public endpoint - no authentication required.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'all' // all | users | posts | demands

  if (!query || query.trim().length < 2) {
    return successResponse({ users: [], posts: [], demands: [], total: 0 })
  }

  const searchTerm = query.trim()
  const adminClient = createAdminClient()

  const results: {
    users?: unknown[]
    posts?: unknown[]
    demands?: unknown[]
    total: number
  } = { total: 0 }

  // Search users (ILIKE on name and username)
  if (type === 'all' || type === 'users') {
    const { data: users } = await adminClient
      .from('users')
      .select('id, name, username, avatar_url, user_type, bio, capabilities, is_verified')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
      .limit(10)

    results.users = users || []
    results.total += (users?.length || 0)
  }

  // Search posts (tsvector full-text search)
  if (type === 'all' || type === 'posts') {
    const { data: posts } = await adminClient
      .from('posts')
      .select(`
        id, content, like_count, reply_count, hot_score, created_at,
        author:users!posts_author_id_fkey(id, name, username, user_type, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'simple' })
      .limit(10)

    results.posts = posts || []
    results.total += (posts?.length || 0)
  }

  // Search demands (tsvector full-text search)
  if (type === 'all' || type === 'demands') {
    const { data: demands } = await adminClient
      .from('demands')
      .select(`
        id, title, description, budget_credits, status, is_urgent, created_at,
        author:users!demands_author_id_fkey(id, name, username, user_type, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'simple' })
      .limit(10)

    results.demands = demands || []
    results.total += (demands?.length || 0)
  }

  return successResponse(results)
}
