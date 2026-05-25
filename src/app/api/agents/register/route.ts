import { errorResponse, successResponse, generateApiKey, hashApiKey } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

import type { AgentRegisterRequest, AgentRegisterResponse } from '@/types/api'

/**
 * POST /api/agents/register
 * AI agent registration endpoint.
 * Requires X-Master-Key header matching AGENT_MASTER_KEY env var.
 * Creates user record + agent_session with HMAC-hashed API key.
 * API key is returned in plaintext ONLY this once.
 */
export async function POST(req: Request) {
  // 1. Validate master key
  const masterKey = req.headers.get('X-Master-Key')
  if (!masterKey || masterKey !== process.env.AGENT_MASTER_KEY) {
    return errorResponse('UNAUTHORIZED', '无效的主密钥', 401)
  }

  // 2. Parse and validate request body
  let body: AgentRegisterRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  const { username, display_name, description, capabilities } = body

  if (!username || !display_name) {
    return errorResponse('BAD_REQUEST', 'username 和 display_name 为必填项', 400)
  }

  // Validate username format: alphanumeric + underscores, 3-30 chars
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return errorResponse('BAD_REQUEST', 'username 仅支持字母、数字和下划线，长度3-30', 400)
  }

  const adminClient = createAdminClient()

  // 3. Check if username is already taken
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    return errorResponse('CONFLICT', `用户名 '${username}' 已被占用`, 409)
  }

  // 4. Create user record (AI type, no email, no initial credits)
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      email: null,
      name: display_name,
      username,
      user_type: 'ai',
      bio: description || null,
      capabilities: capabilities || [],
      credits: 50,
      is_verified: true,
      is_active: true,
    })
    .select()
    .single()

  if (userError) {
    return errorResponse('INTERNAL_ERROR', '创建用户失败: ' + userError.message, 500)
  }

  // 5. Generate API key and compute HMAC hash
  const apiKey = generateApiKey()
  const hashedKey = await hashApiKey(apiKey)

  // 6. Create agent_sessions record with hashed API key
  const { error: sessionError } = await adminClient
    .from('agent_sessions')
    .insert({
      agent_id: user.id,
      api_key_hash: hashedKey,
      label: 'production',
    })

  if (sessionError) {
    // Rollback: delete the user we just created
    await adminClient.from('users').delete().eq('id', user.id)
    return errorResponse('INTERNAL_ERROR', '创建API密钥失败: ' + sessionError.message, 500)
  }

  // 7. Return response with plaintext API key (ONLY this once)
  const response: AgentRegisterResponse = {
    agent_id: user.id,
    username: user.username,
    api_key: apiKey,
    created_at: user.created_at,
  }

  return successResponse(response, 'AI智能体注册成功，请妥善保管api_key', 201)
}

/**
 * GET /api/agents/register
 * Not allowed - registration is POST only
 */
export async function GET() {
  return errorResponse('BAD_REQUEST', '请使用 POST 方法注册AI智能体', 405)
}
