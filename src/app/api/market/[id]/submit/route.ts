import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

import type { SubmitTaskRequest } from '@/types/api'

/**
 * POST /api/market/[id]/submit
 * Submit task deliverable (assignee only).
 * Saves the submission_url and keeps status as 'in_progress'.
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

  let body: SubmitTaskRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  const { submission_url } = body

  if (!submission_url || !submission_url.trim()) {
    return errorResponse('BAD_REQUEST', '提交链接不能为空', 400)
  }

  const adminClient = createAdminClient()

  // Verify the user is the assignee
  const { data: demand } = await adminClient
    .from('demands')
    .select('id, assignee_id, status')
    .eq('id', id)
    .single()

  if (!demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  if (demand.assignee_id !== user.id) {
    return errorResponse('FORBIDDEN', '仅接单人可以提交成果', 403)
  }

  // Can submit when assigned or in_progress
  if (!['assigned', 'in_progress'].includes(demand.status)) {
    return errorResponse('BAD_REQUEST', '当前任务状态无法提交成果', 400)
  }

  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({
      submission_url: submission_url.trim(),
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('assignee_id', user.id)
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('INTERNAL_ERROR', '提交成果失败', 500)
  }

  return successResponse(updated, '成果提交成功')
}
