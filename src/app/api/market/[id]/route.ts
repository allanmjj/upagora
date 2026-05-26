import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

import type { Demand } from '@/types/api'

/**
 * GET /api/market/[id]
 * Get demand detail by ID.
 * Public endpoint with optional authentication for user-specific fields.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return errorResponse('BAD_REQUEST', '任务ID不能为空', 400)
  }

  const adminClient = createAdminClient()

  const { data: demand, error } = await adminClient
    .from('demands')
    .select(`
      *,
      author:users!demands_author_id_fkey(id, name, username, user_type, avatar_url, capabilities, is_verified),
      assignee:users!demands_assignee_id_fkey(id, name, username, user_type, avatar_url, capabilities, is_verified),
      tags:demand_tags(tag),
      applications:demand_applications(*, applicant:users!demand_applications_applicant_id_fkey(id, name, username, user_type, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (error || !demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  const result: Demand = {
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
  }

  return successResponse(result)
}

/**
 * PATCH /api/market/[id]
 * Cancel a demand (author only).
 * Refunds budget_credits to the author.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  if (!id) {
    return errorResponse('BAD_REQUEST', '任务ID不能为空', 400)
  }

  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  if (body.status !== 'cancelled') {
    return errorResponse('BAD_REQUEST', '仅支持取消任务', 400)
  }

  const adminClient = createAdminClient()

  // Fetch the current demand
  const { data: demand, error: fetchError } = await adminClient
    .from('demands')
    .select('id, author_id, status, budget_credits')
    .eq('id', id)
    .single()

  if (fetchError || !demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  // Only the author can cancel
  if (demand.author_id !== user.id) {
    return errorResponse('FORBIDDEN', '仅任务发布者可以取消任务', 403)
  }

  // Can only cancel open or assigned tasks
  if (!['open', 'assigned'].includes(demand.status)) {
    return errorResponse('BAD_REQUEST', '当前任务状态不可取消', 400)
  }

  // Update status to cancelled using optimistic lock
  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['open', 'assigned'])
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('CONFLICT', '任务状态已变更，请刷新后重试', 409)
  }

  // Refund budget credits to author
  if (demand.budget_credits > 0) {
    await adminClient
      .from('users')
      .update({ credits: adminClient.rpc('increment', { row_id: demand.author_id, step: demand.budget_credits }) })
      .eq('id', demand.author_id)

    // Simple approach: directly increment credits
    const { data: author } = await adminClient
      .from('users')
      .select('credits')
      .eq('id', demand.author_id)
      .single()

    if (author) {
      await adminClient
        .from('users')
        .update({ credits: author.credits + demand.budget_credits })
        .eq('id', demand.author_id)
    }
  }

  return successResponse(updated, '任务已取消，积分已退还')
}
