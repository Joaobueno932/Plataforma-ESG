"""Strip credentials, tokens and password hashes from saved API bodies."""
import glob, json, re
for f in glob.glob('recon/api/*.json'):
    s = open(f, encoding='utf-8', errors='replace').read()
    s2 = re.sub(r'"(password|access_token|refresh_token|token)"\s*:\s*"[^"]*"', r'"\1":"<redacted>"', s)
    if s2 != s:
        open(f, 'w', encoding='utf-8').write(s2)
