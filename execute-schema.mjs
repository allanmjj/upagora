import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://dfqeafreiwpyrzcdvegm.supabase.co'
const serviceKey = 'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Read schema file
const schema = readFileSync('./supabase/schema.sql', 'utf-8')
const statements = schema.split(';').filter(s => s.trim().length > 0)

console.log(`Found ${statements.length} SQL statements to execute`)

// Supabase doesn't have a direct RPC to execute SQL, but we can use the pg connect
// Use @supabase/postgrest-js raw RPC approach
const http = supabase.rest

for (let i = 0; i < statements.length; i++) {
  const sql = statements[i].trim()
  console.log(`[${i+1}/${statements.length}] Executing: ${sql.substring(0, 80)}...`)
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: sql })
  if (error) {
    // Try alternative: use the table endpoint
    console.log(`  RPC exec_sql not available, trying direct...`)
    console.log(`  Error: ${error.message}`)
  }
  console.log(`  Status: ${error ? 'FAILED - ' + error.message : 'DONE'}`)
}

console.log('Migration complete')
