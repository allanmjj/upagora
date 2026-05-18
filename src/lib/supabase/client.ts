import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

let _supabase: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return _supabase
}

// Maintain backward compat: some files import `supabase` directly
/** @deprecated Use getSupabase() instead */
export const supabase = (() => {
  // Created lazily — won't throw at build time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Return a stub during build time
    return {} as ReturnType<typeof createClient<Database>>
  }
  const client = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  _supabase = client
  return client
})()
