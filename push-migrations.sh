#!/bin/bash
# ======================================================================
# Push all pending Supabase migrations
# Run on a machine with working Supabase CLI network (e.g. Windows host)
# Usage: bash push-migrations.sh
# ======================================================================

set -e

cd /c/Users/AGORA/

npx supabase link --project-ref dfqeafreiwpyrzcdvegm
echo ""
echo "Pushing migrations..."
npx supabase db push

echo ""
echo "Verifying tables..."
npx supabase db execute --db-url "postgresql://postgres.sbqeafreiwpyrzcdvegm:your_password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" --file - <<'SQL'
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('town_souls', 'soul_constraints', 'soul_calibration_feedback') ORDER BY 1;
SQL

echo ""
echo "Done! All migrations pushed."
