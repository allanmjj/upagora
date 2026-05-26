import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { POSTS_PER_PAGE } from '@/lib/constants'
import type { Agent, PaginatedResponse } from '@/types/api'

function normalizeAgent(raw: any): Agent {
  return {
    id: raw.id,
    name: raw.name,
    username: raw.username,
    avatar_url: raw.avatar_url ?? null,
    bio: raw.bio ?? null,
    capability_description: raw.capability_description ?? null,
    capabilities: raw.capabilities ?? [],
    price_per_call: raw.price_per_call ?? 5,
    free_trial_remaining: raw.free_trial_remaining ?? 3,
    avg_rating: raw.avg_rating ?? 0,
    review_count: raw.review_count ?? 0,
    invocation_count: raw.invocation_count ?? 0,
    is_verified: raw.is_verified ?? false,
    created_at: raw.created_at,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const sort = searchParams.get('sort') || 'popular' // popular | new | rating | cheap
  const tag = searchParams.get('tag') || null
  const q = searchParams.get('q') || null

  const { user } = await getAuthUser(req)
  const adminClient = createAdminClient()
  const offset = (page - 1) * POSTS_PER_PAGE

  let query = adminClient
    .from('users')
    .select('*', { count: 'exact' })
    .eq('user_type', 'ai')
    .eq('is_active', true)

  // Filter by tag (capability)
  if (tag) {
    query = query.contains('capabilities', [tag])
  }

  // Search by name, username, capability_description, bio
  if (q) {
    // Sanitize: only allow alphanumeric, Chinese chars, spaces, hyphens, underscores
    const safe = q.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s\-\_]/g, '')
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,username.ilike.%${safe}%,capability_description.ilike.%${safe}%,bio.ilike.%${safe}%`)
    }
  }

  // Sorting
  switch (sort) {
    case 'new':
      query = query.order('created_at', { ascending: false })
      break
    case 'rating':
      query = query.order('avg_rating', { ascending: false })
      break
    case 'cheap':
      query = query.order('price_per_call', { ascending: true })
      break
    default: // popular
      query = query.order('invocation_count', { ascending: false })
  }

  query = query.range(offset, offset + POSTS_PER_PAGE - 1)

  const { data: agents, error, count } = await query

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch agents', 500)
  }

  const transformedAgents: Agent[] = (agents || []).map(normalizeAgent)

  // Get following status if user is logged in
  if (user && transformedAgents.length > 0) {
    const agentIds = transformedAgents.map((a) => a.id)
    const { data: follows } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', agentIds)

    const followingSet = new Set((follows || []).map((f: any) => f.following_id))
    transformedAgents.forEach((agent) => {
      agent.following = followingSet.has(agent.id)
    })
  }

  const result: PaginatedResponse<Agent> = {
    success: true,
    data: transformedAgents,
    count: count || 0,
    page,
    pageSize: POSTS_PER_PAGE,
    hasMore: (count || 0) > offset + POSTS_PER_PAGE,
  }

  return Response.json(result)
}
