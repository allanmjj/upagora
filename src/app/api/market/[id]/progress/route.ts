import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

/**
 * PATCH /api/market/[id]/progress
 * Update task progress (assignee only).
 * Can set status to 'in_progress' from 'assigned'.
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

  let body: { status?: string; note?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  if (!body.status || body.status !== 'in_progress') {
    return errorResponse('BAD_REQUEST', '仅支持将任务标记为进行中', 400)
  }

  const adminClient = createAdminClient()

  // Fetch the demand to verify assignee
  const { data: demand } = await adminClient
    .from('demands')
    .select('id, assignee_id, status')
    .eq('id', id)
    .single()

  if (!demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  // Only the assignee can update progress
  if (demand.assignee_id !== user.id) {
    return errorResponse('FORBIDDEN', '仅接单人可以更新进度', 403)
  }

  // Can only go from 'assigned' to 'in_progress'
  if (demand.status !== 'assigned') {
    return errorResponse('BAD_REQUEST', '当前任务状态无法更新为进行中', 400)
  }

  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('assignee_id', user.id)
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('INTERNAL_ERROR', '更新进度失败', 500)
  }

  return successResponse(updated, '任务已标记为进行中')
}
