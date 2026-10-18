#!/bin/sh
# usage: tools/ingest.sh <evidence-id-prefix> <capture-name>
set -e
python -I tools/extract_record.py recon/evidence/bundle.json "$1" "recon/evidence/$2.json"
rm -f recon/evidence/bundle.json
python -I tools/dump_capture.py "recon/evidence/$2.json" "recon/captures/$2" | grep -E '"(tag|status|url)"' | paste - - -
python -I tools/dump_bodies.py "recon/evidence/$2.json"
python -I tools/redact_api.py
