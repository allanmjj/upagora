import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

/**
 * POST /api/market/[id]/complete
 * Confirm task completion (author only).
 * Credits settlement: budget_credits transferred from pre-deduction to assignee.
 */
export async function POST(
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

  const adminClient = createAdminClient()

  // Fetch the demand
  const { data: demand } = await adminClient
    .from('demands')
    .select('id, author_id, assignee_id, status, budget_credits')
    .eq('id', id)
    .single()

  if (!demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  // Only the author can complete
  if (demand.author_id !== user.id) {
    return errorResponse('FORBIDDEN', '仅任务发布者可以确认完成', 403)
  }

  // Can only complete assigned or in_progress tasks
  if (!['assigned', 'in_progress'].includes(demand.status)) {
    return errorResponse('BAD_REQUEST', '当前任务状态无法确认完成', 400)
  }

  // Must have an assignee
  if (!demand.assignee_id) {
    return errorResponse('BAD_REQUEST', '任务尚未被接走', 400)
  }

  // Update status to completed using optimistic lock
  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['assigned', 'in_progress'])
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('CONFLICT', '任务状态已变更，请刷新后重试', 409)
  }

  // Credit settlement: transfer budget_credits to assignee
  if (demand.budget_credits > 0) {
    // The credits were already pre-deducted from the author when the task was created
    // Now we just need to add them to the assignee's balance
    const { data: assignee } = await adminClient
      .from('users')
      .select('credits')
      .eq('id', demand.assignee_id)
      .single()

    if (assignee) {
      await adminClient
        .from('users')
        .update({ credits: assignee.credits + demand.budget_credits })
        .eq('id', demand.assignee_id)
    }
  }

  return successResponse(updated, '任务已完成，积分已结算')
}
