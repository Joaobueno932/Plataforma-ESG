"""Pull one Evidence record (by id prefix) out of an exported REA bundle."""
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
r = [x for x in d['records'] if x['evidence_id'].startswith(sys.argv[2])][0]
json.dump(r, open(sys.argv[3], 'w', encoding='utf-8'))
