import { createClient } from '@supabase/supabase-js'

const URL = 'https://dfqeafreiwpyrzcdvegm.supabase.co'
const KEY = 'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'

const supabase = createClient(URL, KEY)

// Check all tables
const tables = [
  'soul_sessions', 'soul_dimensions', 'soul_chat_messages',
  'guardian_calibrations', 'soul_share_links', 'soul_snapshots',
  'soul_imports', 'soul_extraction_results', 'persona_generated_files',
  'calibration_pairs', 'persona_files', 'conversation_messages',
  'import_sessions', 'skills_feed'
]

console.log('=== Supabase Table Status ===')
for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(1)
  console.log(`${error ? '❌' : '✅'} ${table}`)
}
console.log('=== End ===')
