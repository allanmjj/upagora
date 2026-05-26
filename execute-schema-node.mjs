import { readFileSync } from 'fs'

const supabaseUrl = 'https://dfqeafreiwpyrzcdvegm.supabase.co'
const serviceKey = 'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'

// Read schema file
const schema = readFileSync('./supabase/schema.sql', 'utf-8')
const statements = schema.split(';').filter(s => s.trim().length > 0)

console.log(`Found ${statements.length} SQL statements`)

// Use Supabase table insert via REST API - can't do DDL, need pg connection
// Try using @supabase/
let supabase
try {
  const mod = await import('@supabase/supabase-js')
  supabase = mod.createClient(supabaseUrl, serviceKey)
  
  // Check if we can query existing tables
  const { data: health, error: healthErr } = await supabase.from('import_sessions').select('*').limit(1)
  console.log('import_sessions exists:', !healthErr)
  
  // Try to query other tables to see which exist
  const tables = ['soul_sessions', 'soul_dimensions', 'soul_chat_messages', 'guardian_calibrations', 'soul_share_links', 'soul_snapshots']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    console.log(`${table}: ${error ? 'MISSING' : 'EXISTS'}`)
  }
} catch(e) {
  console.error('Error:', e.message)
}
