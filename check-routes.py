import urllib.request
import urllib.error

pages = [
    '/', '/town', '/gallery', '/discover', '/calibrate', '/guardians',
    '/voice', '/onboarding', '/profile', '/settings', '/soul/123',
    '/soul/123/versions'
]

apis = [
    '/api/town', '/api/town/summary', '/api/town/souls',
    '/api/town/chronicle', '/api/town/schedule', '/api/town/sync',
    '/api/town/relationships', '/api/soul/memory-recall', '/api/soul/chat-stream',
    '/api/soul/network', '/api/auth/me'
]

print('\n=== Page Routes ===')
ok = 0
for p in pages:
    try:
        r = urllib.request.urlopen(f'http://localhost:3000{p}', timeout=10)
        if r.status == 200:
            print(f'  {p} -> 200 OK')
            ok += 1
        else:
            print(f'  {p} -> {r.status}')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f'  {p} -> 404 (route not found)')
        else:
            print(f'  {p} -> {e.code} ERROR')
    except Exception as e:
        print(f'  {p} -> ERROR: {e}')

print(f'\nPages: {ok}/{len(pages)} OK')

print('\n=== API Routes ===')
ok = 0
for a in apis:
    try:
        r = urllib.request.urlopen(f'http://localhost:3000{a}', timeout=10)
        if r.status == 200:
            print(f'  {a} -> 200 OK')
            ok += 1
        else:
            print(f'  {a} -> {r.status}')
    except urllib.error.HTTPError as e:
        if e.code in [400, 401, 404, 405]:
            print(f'  {a} -> {e.code} (expected for GET)')
        else:
            print(f'  {a} -> {e.code} ERROR')
    except Exception as e:
        print(f'  {a} -> ERROR: {e}')

print(f'\nAPIs: {ok}/{len(apis)} OK')
