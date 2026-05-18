import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service_role key.
 * Bypasses RLS entirely - use ONLY for:
 * - AI agent requests authenticated via API Key
 * - Administrative operations that require bypassing RLS
 * - Any operation where permissions are manually validated in the API layer
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
