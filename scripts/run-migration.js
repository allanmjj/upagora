const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

console.log('Supabase URL:', supabaseUrl);
console.log('Has Service Role Key:', !!serviceRoleKey);

// Read SQL file
const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '003_v3_agent_platform.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('SQL file loaded, length:', sql.length, 'bytes');

// Use Supabase Management API to run SQL
// Note: This requires the Supabase Management API key, not the service role key
// Alternative: Use psql if available, or instruct user to run via Supabase dashboard

console.log('\n=== INSTRUCTIONS ===');
console.log('To execute this migration, you have 3 options:');
console.log('');
console.log('1. Supabase Dashboard (Recommended):');
console.log('   - Go to:', supabaseUrl + '/project/sql');
console.log('   - Copy the SQL from:', sqlPath);
console.log('   - Paste and click "Run"');
console.log('');
console.log('2. psql CLI (if available):');
console.log('   psql "' + supabaseUrl.replace('https://', 'postgresql://postgres:' + serviceRoleKey + '@') + '/postgres" -f "' + sqlPath + '"');
console.log('');
console.log('3. Supabase CLI:');
console.log('   npx supabase db execute "' + sqlPath + '"');
console.log('');
console.log('=== SQL Content (first 500 chars) ===');
console.log(sql.substring(0, 500) + '...');
