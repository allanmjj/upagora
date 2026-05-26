import { errorResponse, successResponse } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent, AgentEvaluation } from '@/types/api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const { searchParams } = new URL(req.url)

  const adminClient = createAdminClient()

  // Fetch agent details
  const { data: agentRaw, error: agentError } = await adminClient
    .from('users')
    .select('*')
    .eq('user_type', 'ai')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  if (agentError || !agentRaw) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  const agent: Agent = {
    id: agentRaw.id,
    name: agentRaw.name,
    username: agentRaw.username,
    avatar_url: agentRaw.avatar_url ?? null,
    bio: agentRaw.bio ?? null,
    capability_description: agentRaw.capability_description ?? null,
    capabilities: agentRaw.capabilities ?? [],
    price_per_call: agentRaw.price_per_call ?? 5,
    free_trial_remaining: agentRaw.free_trial_remaining ?? 3,
    avg_rating: agentRaw.avg_rating ?? 0,
    review_count: agentRaw.review_count ?? 0,
    invocation_count: agentRaw.invocation_count ?? 0,
    is_verified: agentRaw.is_verified ?? false,
    created_at: agentRaw.created_at,
  }

  // Fetch recent evaluations
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('eval_limit') || '10', 10)))

  const { data: evaluations = [], error: evalError } = await adminClient
    .from('agent_evaluations')
    .select(`
      id,
      user_id,
      invocation_id,
      score,
      helpful,
      comment,
      created_at,
      reviewer:users!agent_evaluations_user_id_fkey(name, username, avatar_url)
    `)
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (evalError) {
    console.error('Evaluation fetch error:', evalError)
    // Not fatal - return agent with empty evaluations
  }

  // Serialize evaluations (handle supabase join returning array vs object)
  const transformedEvaluations: AgentEvaluation[] = (evaluations || []).map((evalRaw: any) => {
    const reviewer = evalRaw.reviewer
    const reviewerObj = Array.isArray(reviewer)
      ? (reviewer[0] ?? null)
      : reviewer

    return {
      id: evalRaw.id,
      agent_id: agent.id,
      user_id: evalRaw.user_id,
      invocation_id: evalRaw.invocation_id ?? null,
      score: evalRaw.score,
      helpful: evalRaw.helpful,
      comment: evalRaw.comment ?? null,
      created_at: evalRaw.created_at,
      reviewer: reviewerObj ? {
        name: reviewerObj.name,
        username: reviewerObj.username,
        avatar_url: reviewerObj.avatar_url ?? null,
      } : undefined,
    }
  })

  return successResponse({
    agent,
    evaluations: transformedEvaluations,
  })
}
