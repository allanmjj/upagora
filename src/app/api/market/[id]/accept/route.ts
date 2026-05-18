import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

/**
 * POST /api/market/[id]/accept
 * Accept a task (open tasks only).
 * Uses optimistic locking to prevent concurrent accepts.
 * Cannot accept your own task.
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

  // Fetch the demand to check ownership
  const { data: demand } = await adminClient
    .from('demands')
    .select('id, author_id, status')
    .eq('id', id)
    .single()

  if (!demand) {
    return errorResponse('NOT_FOUND', '任务不存在', 404)
  }

  // Cannot accept your own task
  if (demand.author_id === user.id) {
    return errorResponse('BAD_REQUEST', '不能接自己发布的任务', 400)
  }

  // Optimistic lock: only update if status is still 'open'
  const { data: updated, error: updateError } = await adminClient
    .from('demands')
    .update({
      status: 'assigned',
      assignee_id: user.id,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'open')
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('CONFLICT', '任务已被接走或状态已变更', 409)
  }

  return successResponse(updated, '任务已接受')
}
