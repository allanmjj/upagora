import { type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies as nextCookies } from 'next/headers'

import type { AuthUser } from '@/types/api'
import { API_KEY_PREFIX } from './constants'
import { createAdminClient } from './supabase/admin'

// ====== Auth Result ======

export interface AuthResult {
  user: AuthUser | null
  authMethod: 'api_key' | 'cookie' | null
  supabase: SupabaseClient
}

// ====== API Key Hashing (SHA-256 HMAC via Web Crypto API) ======

/**
 * Compute SHA-256 HMAC of the API key using the HMAC_SECRET env var.
 * Uses Web Crypto API only - no third-party dependencies.
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const hmacSecret = process.env.HMAC_SECRET
  if (!hmacSecret) {
    throw new Error('HMAC_SECRET environment variable is not set')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(apiKey))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ====== API Key Generation ======

/**
 * Generate a new API key with the upa_sk_ prefix.
 * Format: upa_sk_ + 32 bytes of random hex (64 hex chars).
 */
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return API_KEY_PREFIX + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ====== Cookie-based Client ======

/**
 * Create a Supabase client with anon_key and cookie session.
 * Respects RLS policies for human users.
 */
async function createCookieClient(): Promise<SupabaseClient> {
  const cookieStore = await nextCookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Cookie setting can fail in Server Components
            // This is expected and safe to ignore
          }
        },
      },
    }
  )
}

// ====== Core Authentication Function ======

/**
 * Dual-track authentication middleware.
 *
 * 1. Checks Authorization header for Bearer token starting with "upa_sk_"
 *    -> API Key authentication for AI agents
 * 2. Falls back to Cookie-based Supabase Auth session
 *    -> Standard authentication for human users
 *
 * Returns a unified AuthResult with user info, auth method, and
 * a Supabase client with appropriate permissions.
 */
export async function getAuthUser(req: Request): Promise<AuthResult> {
  // --- Track 1: API Key Authentication ---
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    if (token.startsWith(API_KEY_PREFIX)) {
      return await authenticateWithApiKey(token)
    }
  }

  // --- Track 2: Cookie/Session Authentication ---
  return await authenticateWithCookie()
}

/**
 * Authenticate an AI agent using API key.
 * - Computes SHA-256 HMAC of the provided token
 * - Looks up agent_sessions by api_key_hash
 * - Verifies session is not revoked
 * - Updates last_used_at
 * - Fetches user profile
 */
async function authenticateWithApiKey(token: string): Promise<AuthResult> {
  const adminClient = createAdminClient()

  try {
    const hashedKey = await hashApiKey(token)

    // Look up active session by hash
    const { data: session, error: sessionError } = await adminClient
      .from('agent_sessions')
      .select('id, agent_id, revoked_at')
      .eq('api_key_hash', hashedKey)
      .is('revoked_at', null)
      .single()

    if (sessionError || !session) {
      return { user: null, authMethod: null, supabase: adminClient }
    }

    // Update last_used_at (fire and forget)
    adminClient
      .from('agent_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.id)
      .then(() => {
        // no-op: best-effort update
      })

    // Fetch user profile
    const { data: userProfile, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', session.agent_id)
      .eq('is_active', true)
      .single()

    if (userError || !userProfile) {
      return { user: null, authMethod: null, supabase: adminClient }
    }

    const authUser: AuthUser = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      username: userProfile.username,
      user_type: userProfile.user_type,
      avatar_url: userProfile.avatar_url,
      capabilities: userProfile.capabilities || [],
      credits: userProfile.credits || 0,
      is_verified: userProfile.is_verified || false,
      is_email_verified: userProfile.is_email_verified || false,
    }

    return { user: authUser, authMethod: 'api_key', supabase: adminClient }
  } catch (error) {
    console.error('API key authentication error:', error)
    return { user: null, authMethod: null, supabase: adminClient }
  }
}

/**
 * Authenticate a human user via Supabase cookie session.
 * - Creates a client with anon_key that reads cookies
 * - Gets the current session
 * - Fetches user profile from users table
 */
async function authenticateWithCookie(): Promise<AuthResult> {
  const cookieClient = await createCookieClient()

  try {
    const { data: { session }, error: sessionError } = await cookieClient.auth.getSession()

    if (sessionError || !session?.user) {
      return { user: null, authMethod: null, supabase: cookieClient }
    }

    // Fetch user profile from public users table
    const { data: userProfile, error: userError } = await cookieClient
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .single()

    if (userError || !userProfile) {
      return { user: null, authMethod: null, supabase: cookieClient }
    }

    const authUser: AuthUser = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      username: userProfile.username,
      user_type: userProfile.user_type,
      avatar_url: userProfile.avatar_url,
      capabilities: userProfile.capabilities || [],
      credits: userProfile.credits || 0,
      is_verified: userProfile.is_verified || false,
      is_email_verified: userProfile.is_email_verified || false,
    }

    return { user: authUser, authMethod: 'cookie', supabase: cookieClient }
  } catch (error) {
    console.error('Cookie authentication error:', error)
    return { user: null, authMethod: null, supabase: cookieClient }
  }
}

// ====== Response Helpers ======

/**
 * Create a standardized error response.
 */
export function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: code, message }, { status })
}

/**
 * Create a standardized success response.
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  const body: Record<string, unknown> = { success: true, data }
  if (message) body.message = message
  return Response.json(body, { status })
}
