import os, glob, re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
issues = []

for f in sorted(files):
    try:
        with open(f, encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
            lines = content.split('\n')
            
            # Check for 'use client' in files that use React hooks
            has_hooks = any(hook in content for hook in ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'])
            has_use_client = '\"use client\"' in content[:200] or \"'use client'\" in content[:200]
            
            if has_hooks and not has_use_client:
                # Check if it's a component (not a page that's already client)
                if '/page.tsx' in f or '/component' in f.lower():
                    issues.append(f'{f}: Missing "use client" directive (uses React hooks)')
    
    except Exception as e:
        pass

if issues:
    for issue in issues[:30]:
        print(issue)
else:
    print('No missing use client directives found')
