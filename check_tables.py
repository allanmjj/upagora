import glob
import re

# Find all tables referenced in code but not in schema
code_tables = set()
schema_tables = set()

# Get schema tables
with open('supabase/schema.sql', encoding='utf-8') as f:
    schema = f.read()
    for line in schema.split('\n'):
        if 'CREATE TABLE IF NOT EXISTS' in line:
            table = line.split('CREATE TABLE IF NOT EXISTS')[1].strip().split(' ')[0]
            schema_tables.add(table)

# Get migration tables
for f in sorted(glob.glob('supabase/migrations/*.sql')):
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
        for line in content.split('\n'):
            if 'CREATE TABLE IF NOT EXISTS' in line:
                table = line.split('CREATE TABLE IF NOT EXISTS')[1].strip().split(' ')[0]
                schema_tables.add(table)

# Get tables from code
for f in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    with open(f, encoding='utf-8', errors='ignore') as fh:
        content = fh.read()
        for match in re.findall(r'\.from\(["\'](\w+)["\']\)', content):
            code_tables.add(match)

# Find tables in code but not in schema
missing = code_tables - schema_tables
if missing:
    print('Tables in code but not in schema/migrations:')
    for t in sorted(missing):
        print(f'  - {t}')
else:
    print('All tables accounted for')
