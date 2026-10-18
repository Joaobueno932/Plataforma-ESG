"""Save network bodies from a REA scenario record: API JSON -> recon/api, site static -> recon/static."""
import base64, json, os, re, sys, urllib.parse

src = sys.argv[1]
r = json.load(open(src, encoding='utf-8'))
if 'normalized_result' not in r:  # bundle
    r = [x for x in r['records'] if x['evidence_id'] == sys.argv[2]][0]
items = r['normalized_result']['events']['items']
req = {}
for e in items:
    if e['kind'] == 'request':
        req[e['transaction_id']] = e
states = {}
os.makedirs('recon/api', exist_ok=True)
seen = {}
for e in items:
    if e['kind'] != 'network-content':
        continue
    b = e['body']
    states[b['state']] = states.get(b['state'], 0) + 1
    if b['state'] != 'captured':
        continue
    q = req.get(e['transaction_id'])
    if not q:
        continue
    url = q['url']['url']
    data = base64.b64decode(b['content'])
    pu = urllib.parse.urlparse(url)
    if 'api-stg' in pu.netloc:
        name = f"{q['method']}{pu.path}" + (('_' + pu.query) if pu.query else '')
        name = re.sub(r'[^A-Za-z0-9._=-]+', '_', name)[:150] + '.' + e['phase']
        k = name
        seen[k] = seen.get(k, 0) + 1
        open(f'recon/api/{name}.json', 'wb').write(data)
    elif '/_next/static/' in pu.path and e['phase'] == 'response':
        p = 'recon/static' + pu.path
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data)
print(states)
