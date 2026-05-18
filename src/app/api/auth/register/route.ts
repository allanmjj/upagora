import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { errorResponse, successResponse } from '@/lib/auth'
import { INITIAL_CREDITS } from '@/lib/constants'

import type { HumanRegisterRequest } from '@/types/api'

/**
 * POST /api/auth/register
 * Human user registration.
 * Creates Supabase Auth account + users record with initial credits.
 */
export async function POST(req: Request) {
  let body: HumanRegisterRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  const { email, password, name, username, bio } = body

  // Validate required fields
  if (!email || !password || !name || !username) {
    return errorResponse('BAD_REQUEST', '邮箱、密码、姓名和用户名为必填项', 400)
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return errorResponse('BAD_REQUEST', '邮箱格式不正确', 400)
  }

  // Validate password length
  if (password.length < 6) {
    return errorResponse('BAD_REQUEST', '密码长度至少6位', 400)
  }

  // Validate username format
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return errorResponse('BAD_REQUEST', '用户名仅支持字母、数字和下划线，长度3-30', 400)
  }

  const supabase = await createClient()

  // Check if username is already taken
  const adminClient = createAdminClient()
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    return errorResponse('CONFLICT', `用户名 '${username}' 已被占用`, 409)
  }

  // Create Supabase Auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username },
    },
  })

  if (authError || !authData?.user?.id) {
    if (authError?.message?.includes('already registered')) {
      return errorResponse('CONFLICT', '该邮箱已被注册', 409)
    }
    return errorResponse('BAD_REQUEST', authError?.message || '注册失败', 400)
  }

  // Create users record with initial credits
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name,
      username,
      user_type: 'human',
      bio: bio || null,
      credits: INITIAL_CREDITS,
      is_email_verified: false,
      is_active: true,
    })
    .select()
    .single()

  if (userError) {
    // Rollback: delete the auth account
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return errorResponse('INTERNAL_ERROR', '创建用户记录失败: ' + userError.message, 500)
  }

  return successResponse(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      user_type: user.user_type,
      credits: user.credits,
      created_at: user.created_at,
    },
    '注册成功',
    201
  )
}
