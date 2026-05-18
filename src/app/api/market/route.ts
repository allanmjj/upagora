import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { DEMANDS_PER_PAGE, INITIAL_CREDITS } from '@/lib/constants'

import type { Demand, CreateDemandRequest } from '@/types/api'

/**
 * GET /api/market
 * Fetch demands with status filter and pagination.
 * Supports: status, page, type (all/human/ai)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const status = searchParams.get('status') || undefined // undefined = all statuses
  const type = searchParams.get('type') || 'all'

  const adminClient = createAdminClient()

  const from = (page - 1) * DEMANDS_PER_PAGE
  const to = from + DEMANDS_PER_PAGE - 1

  let query = adminClient
    .from('demands')
    .select(`
      *,
      author:users!demands_author_id_fkey(id, name, username, user_type, avatar_url, capabilities, is_verified),
      assignee:users!demands_assignee_id_fkey(id, name, username, user_type, avatar_url, capabilities, is_verified),
      tags:demand_tags(tag),
      applications:demand_applications(id, applicant_id, message, status, created_at)
    `, { count: 'exact' })
    .eq('visibility', 'public')

  // Filter by status
  if (status && ['open', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    query = query.eq('status', status)
  }

  // Filter by author type
  if (type === 'human' || type === 'ai') {
    const { data: usersOfType } = await adminClient
      .from('users')
      .select('id')
      .eq('user_type', type)
      .eq('is_active', true)

    const userIds = usersOfType?.map((u) => u.id) || []
    if (userIds.length === 0) {
      return successResponse({
        demands: [],
        count: 0,
        page,
        pageSize: DEMANDS_PER_PAGE,
        hasMore: false,
      })
    }
    query = query.in('author_id', userIds)
  }

  query = query
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data: demands, error, count } = await query

  if (error) {
    return errorResponse('INTERNAL_ERROR', '获取任务列表失败', 500)
  }

  // Transform demands
  const transformedDemands: Demand[] = (demands || []).map((demand) => ({
    ...demand,
    tags: demand.tags?.map((t: { tag: string }) => t.tag) || [],
    author: demand.author ? {
      id: demand.author.id,
      email: null,
      name: demand.author.name,
      username: demand.author.username,
      user_type: demand.author.user_type,
      avatar_url: demand.author.avatar_url,
      capabilities: demand.author.capabilities || [],
      credits: 0,
      is_verified: demand.author.is_verified || false,
      is_email_verified: false,
    } : undefined,
    assignee: demand.assignee ? {
      id: demand.assignee.id,
      email: null,
      name: demand.assignee.name,
      username: demand.assignee.username,
      user_type: demand.assignee.user_type,
      avatar_url: demand.assignee.avatar_url,
      capabilities: demand.assignee.capabilities || [],
      credits: 0,
      is_verified: demand.assignee.is_verified || false,
      is_email_verified: false,
    } : null,
    applications: demand.applications?.map((a: { id: string; applicant_id: string; message: string | null; status: string; created_at: string }) => ({
      id: a.id,
      demand_id: demand.id,
      applicant_id: a.applicant_id,
      message: a.message,
      status: a.status as 'pending' | 'accepted' | 'rejected',
      created_at: a.created_at,
    })) || [],
  }))

  return successResponse({
    demands: transformedDemands,
    count: count || 0,
    page,
    pageSize: DEMANDS_PER_PAGE,
    hasMore: (count || 0) > page * DEMANDS_PER_PAGE,
  })
}

/**
 * POST /api/market
 * Create a new demand/task.
 * Requires authentication (dual-track).
 * Pre-deducts budget_credits from the author's balance.
 */
export async function POST(req: Request) {
  const { user } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  let body: CreateDemandRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  const { title, description, budget_credits, deadline_date, is_urgent, visibility, tags } = body

  if (!title || !title.trim()) {
    return errorResponse('BAD_REQUEST', '任务标题不能为空', 400)
  }

  if (!description || !description.trim()) {
    return errorResponse('BAD_REQUEST', '任务描述不能为空', 400)
  }

  const budget = budget_credits || 0
  const adminClient = createAdminClient()

  // Pre-deduct credits if budget > 0
  if (budget > 0) {
    // Atomic credit deduction: only succeeds if credits >= budget
    const { data: updatedUser, error: deductError } = await adminClient
      .from('users')
      .update({ credits: user.credits - budget })
      .eq('id', user.id)
      .gte('credits', budget)
      .select('credits')
      .single()

    if (deductError || !updatedUser) {
      return errorResponse('INSUFFICIENT_CREDITS', '积分不足，无法发布此任务', 422)
    }
  }

  // Create the demand
  const { data: demand, error: demandError } = await adminClient
    .from('demands')
    .insert({
      author_id: user.id,
      title: title.trim(),
      description: description.trim(),
      budget_credits: budget,
      deadline_date: deadline_date || null,
      is_urgent: is_urgent || false,
      visibility: visibility || 'public',
      status: 'open',
    })
    .select()
    .single()

  if (demandError) {
    // Refund credits if demand creation fails
    if (budget > 0) {
      await adminClient
        .from('users')
        .update({ credits: user.credits })
        .eq('id', user.id)
    }
    return errorResponse('INTERNAL_ERROR', '创建任务失败', 500)
  }

  // Insert tags if provided
  if (tags && tags.length > 0) {
    const tagRows = tags
      .filter((t) => t.trim().length > 0)
      .slice(0, 10)
      .map((tag) => ({ demand_id: demand.id, tag: tag.trim() }))

    if (tagRows.length > 0) {
      await adminClient.from('demand_tags').insert(tagRows)
    }
  }

  return successResponse(demand, '任务发布成功', 201)
}
