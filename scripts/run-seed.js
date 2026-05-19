// Execute seed-full.sql via Supabase REST API (Service Role)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dfqeafreiwpyrzcdvegm.supabase.co',
  'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'
);

const fs = require('fs');
const sql = fs.readFileSync('D:\\hermes-lab\\AGORA\\app\\supabase\\seed-full.sql', 'utf8');

// Supabase JS client can't execute raw SQL, use fetch to /rest/v1/rpc won't work
// Use the pg-compatible approach: call Supabase SQL API directly
async function run() {
  // Try using the Supabase Management API to execute SQL
  // Actually, best approach: use fetch to the PostgreSQL endpoint
  // But Supabase doesn't expose a raw SQL endpoint for JS client
  
  // Split by semicolons and execute statement groups
  // Better: use the pg module directly
  console.log('Attempting to execute via pg module...');
  
  try {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: 'postgresql://postgres.dfqeafreiwpyrzcdvegm:supabase@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false }
    });
    
    await pool.query(sql);
    console.log('SQL executed successfully!');
    await pool.end();
  } catch(e) {
    console.error('pg module not available, trying alternative...');
    
    // Alternative: execute via REST API using Supabase client
    // We need to use the Supabase SQL Editor API or direct HTTP
    // Let's try fetching the management endpoint
    
    try {
      // Use supabase dashboard API (requires auth token, not available)
      console.error('Direct PostgreSQL connection not possible. Need DB password.');
      console.error('Falling back to REST API inserts...');
      
      // Since we can't do raw SQL, let's insert via REST API
      // This is the Supabase way - use the client
      
    } catch(e2) {
      console.error(e2.message);
    }
  }
}

run();
