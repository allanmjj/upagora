import os, re

for root, dirs, files in os.walk('.'):
    for f in files:
        if not f.endswith(('.tsx', '.ts')):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        
        has_use_client = "'use client'" in content or '"use client"' in content
        has_dynamic = 'next/dynamic' in content and 'ssr: false' in content
        
        if has_use_client and has_dynamic:
            print(f'CLIENT_WITH_DYNAMIC: {path}')
