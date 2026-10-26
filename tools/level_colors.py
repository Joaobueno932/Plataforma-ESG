#!/usr/bin/env python3
"""Lê dos cadernos em PDF a cor oficial de cada nível de maturidade.

Uso:
    python tools/level_colors.py <pasta Documentação>

Em cada página de indicador, o nome do nível ("Não conforme", "Iniciante", ...) é impresso sobre
uma faixa preenchida; a cor da faixa é a cor do nível. O script associa cada nome à cor do
retângulo preenchido que o contém e conta as ocorrências por caderno. Somente leitura (PyMuPDF).
"""
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import fitz

LEVELS = {"nao conforme": "Não conforme", "iniciante": "Iniciante", "sensibilizada": "Sensibilizada",
          "sensibilizado": "Sensibilizada", "consciente": "Consciente", "engajada": "Engajada",
          "engajado": "Engajada", "conforme": "Conforme"}


def norm(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text).strip()


def hex_of(rgb):
    return "#" + "".join(f"{round(c * 255):02X}" for c in rgb[:3])


def main():
    folder = Path(sys.argv[1])
    found = defaultdict(Counter)
    for pdf in sorted(folder.glob("*.pdf")):
        if not re.match(r"^([A-H][ _-]|Caderno GERAL)", pdf.name):
            continue
        doc = fitz.open(str(pdf))
        for page in doc:
            fills = [(fitz.Rect(d["rect"]), d["fill"]) for d in page.get_drawings() if d.get("fill")]
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    text = "".join(s["text"] for s in line["spans"])
                    level = LEVELS.get(norm(text))
                    if not level:
                        continue
                    box = fitz.Rect(line["bbox"])
                    center = fitz.Point((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
                    under = [(r, f) for r, f in fills if r.contains(center) and r.width < page.rect.width * 0.5]
                    if not under:
                        continue
                    rect, fill = min(under, key=lambda rf: rf[0].width * rf[0].height)  # faixa mais justa
                    found[level][hex_of(fill)] += 1
    out = {level: dict(colors.most_common()) for level, colors in found.items()}
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
