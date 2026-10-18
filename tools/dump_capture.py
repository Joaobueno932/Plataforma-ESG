"""Extract screenshots/DOM/a11y/network from a REA capture_browser_scenario JSON."""
import base64, json, os, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
d = json.load(open(src, encoding='utf-8'))
n = d['normalized_result']
summary = {'evidence_id': d['evidence_id'], 'steps': []}
for s in n['steps']:
    tag = f"{s['step_index']:02d}_{s['step_id']}"
    a = s.get('artifacts') or {}
    for k, v in a.items():
        if v.get('state') != 'captured':
            continue
        val = v['value']
        if k == 'screenshot':
            open(os.path.join(out, tag + '.png'), 'wb').write(base64.b64decode(val['data_base64']))
        elif k in ('dom', 'accessibility'):
            open(os.path.join(out, f'{tag}.{k}.txt'), 'w', encoding='utf-8').write(val['text'])
        elif k in ('storage', 'history'):
            json.dump(val, open(os.path.join(out, f'{tag}.{k}.json'), 'w', encoding='utf-8'), indent=1)
    summary['steps'].append({'tag': tag, 'status': s['status'], 'error': s.get('error'),
                             'url': (s.get('after_url') or {}).get('url')})
net = []
for e in n['events']['items']:
    if e.get('kind') in ('response', 'request', 'console', 'page-error'):
        r = {k: e.get(k) for k in ('kind', 'method', 'status', 'resource_type', 'transaction_id')}
        r['url'] = (e.get('url') or {}).get('url')
        for bk in ('request_body', 'response_body'):
            if e.get(bk) is not None:
                r[bk] = e[bk]
        if e.get('kind') == 'console':
            r['text'] = e.get('text')
        net.append(r)
json.dump(net, open(os.path.join(out, 'network.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
json.dump(summary, open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps(summary, indent=1))
