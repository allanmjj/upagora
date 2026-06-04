import urllib.request, json

base = "http://localhost:3000"

pages = [
    "/", "/town", "/gallery", "/discover", "/calibrate",
    "/guardians", "/voice", "/onboarding", "/profile", "/settings",
    "/soul", "/soul/123", "/town/relationships", "/town/report/abc",
    "/profile/admin/followers", "/profile/admin/following",
    "/soul/abc/versions", "/dashboard", "/discovery",
    "/soul/gallery", "/soul/dialogue"
]

apis_get = [
    "/api/town", "/api/town/summary", "/api/town/souls",
    "/api/town/chronicle", "/api/town/schedule", "/api/town/sync",
    "/api/town/relationships", "/api/auth/me",
    "/api/town/events", "/api/town/social-feed",
    "/api/soul/presets", "/api/soul/gallery",
    "/api/soul/status", "/api/soul/network",
    "/api/settings/badges", "/api/skills/categories",
    "/api/skills/list", "/api/soul/health"
]

print("="*60)
print("PAGE CHECK")
print("="*60)
ok = err = warn = 0
for p in pages:
    try:
        r = urllib.request.urlopen(f"{base}{p}", timeout=10)
        if r.status == 200:
            print(f"  {p:<40} ✅ 200"); ok += 1
        else:
            print(f"  {p:<40} ⚠️ {r.status}"); warn += 1
    except Exception as e:
        code = e.code if hasattr(e, 'code') else '?'
        if code == 404:
            print(f"  {p:<40} ⚠️ 404 (route may not exist)"); warn += 1
        else:
            print(f"  {p:<40} ❌ {code}"); err += 1

print(f"\nPages: {ok} OK / {warn} WARN / {err} ERR")
print()

print("="*60)
print("API CHECK (GET)")
print("="*60)
ok2 = err2 = warn2 = 0
for a in apis_get:
    try:
        r = urllib.request.urlopen(f"{base}{a}", timeout=10)
        if r.status == 200:
            print(f"  {a:<45} ✅ 200"); ok2 += 1
        else:
            print(f"  {a:<45} ⚠️ {r.status}"); warn2 += 1
    except Exception as e:
        code = e.code if hasattr(e, 'code') else '?'
        if code in (400, 404, 405):
            print(f"  {a:<45} ⚠️ {code} (expected)"); warn2 += 1
        else:
            print(f"  {a:<45} ❌ {code}"); err2 += 1

print(f"\nAPIs: {ok2} OK / {warn2} WARN / {err2} ERR")
