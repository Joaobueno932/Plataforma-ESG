#!/usr/bin/env python3
"""Confere o nível de maturidade mínima exigida de cada indicador: cadernos em PDF × planilha.

Uso:
    python tools/minimum_crosscheck.py <pasta Documentação> <minimos-planilha.json> [saida.json]

`minimos-planilha.json` é a lista gerada pelo parser do sistema (backend/src/catalog/parse.js),
uma entrada por indicador: { section, code, title, mandatory, minimum, minimumPosition }.

Como o caderno marca o mínimo: uma faixa cinza preenchida com o texto branco "OBRIGATÓRIO",
logo acima da pontuação, na coluna do nível exigido. Os PDFs também carregam **resíduos do
modelo**: o mesmo texto branco, sem a faixa por baixo, portanto invisível na página impressa
(ex.: GE06, GG01). Por isso a extração de texto sozinha dá falsos positivos. Aqui a marca só
conta quando há um retângulo preenchido não branco sob o texto — exatamente o que o leitor vê.

Para cada página de indicador:
  1. código no título ("GE 01: Licenciamento Ambiental");
  2. colunas dos níveis pela linha de pontuação ("0 pontos", "6 pontos", ...);
  3. marca visível → coluna mais próxima → posição do nível mínimo;
  4. nomes dos níveis (cabeçalhos coloridos das colunas), na ordem das colunas.
Somente leitura. Depende de PyMuPDF (`fitz`).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

FILES = {
    "Caderno GERAL 1.pdf": "All",
    "A - Alimentos e bebidas 1.pdf": "A",
    "B - Frigorifico 1.pdf": "B",
    "C_Construção Civil 1.pdf": "C",
    "D_Industria de Transformação Diversa 1.pdf": "D",
    "E - Energia, Telecomunicações, Resíduos e Similares 1.pdf": "E",
    "F - Extração de minerais 1.pdf": "F",
    "G - Papel e celulose 1.pdf": "G",
    "H - Calçados e Componentes para Calçados,etc.pdf": "H",
}
LEVELS = {"nao conforme": "Não conforme", "iniciante": "Iniciante", "sensibilizada": "Sensibilizada",
          "consciente": "Consciente", "engajada": "Engajada", "conforme": "Conforme"}
TITLE = re.compile(r"^\s*([A-H]1?)\s?([ESG])\s?(\d{2})\s*:\s*(.+?)\s*$")
POINTS = re.compile(r"^\s*(\d+)\s*pontos?\s*$", re.I)
MARKER = re.compile(r"^\s*obrigat.{1,2}rio\s*$", re.I)


def norm(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text).strip()


def spans(page):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if span["text"].strip():
                    yield span


def filled_rects(page):
    """Retângulos preenchidos com cor não branca (faixas, cabeçalhos de coluna)."""
    rects = []
    for d in page.get_drawings():
        fill = d.get("fill")
        if fill and d.get("fill_opacity", 1) > 0 and min(fill) < 0.95:
            rects.append(fitz.Rect(d["rect"]))
    return rects


def line_texts(page):
    """Texto de cada linha (spans unidos): o título às vezes vem partido em vários spans."""
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            yield "".join(s["text"] for s in line["spans"])


def analyse_page(page):
    all_spans = list(spans(page))
    title = None
    for text in line_texts(page):
        m = TITLE.match(text)
        if m:
            title = (f"{m.group(1)}{m.group(2)}{m.group(3)}", m.group(4))
            break
    if not title:
        return None
    points = sorted((((s["bbox"][0] + s["bbox"][2]) / 2, s["bbox"][1], int(POINTS.match(s["text"]).group(1)))
                     for s in all_spans if POINTS.match(s["text"])), key=lambda p: p[0])
    if len(points) < 2:
        return {"code": title[0], "title": title[1], "error": "linha de pontuação não encontrada"}
    points_y = points[0][1]
    rects = filled_rects(page)
    visible, hidden = [], []
    for s in all_spans:
        if not MARKER.match(s["text"]):
            continue
        box = fitz.Rect(s["bbox"])
        center = fitz.Point((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
        column = min(range(len(points)), key=lambda k: abs(points[k][0] - center.x)) + 1
        (visible if any(r.contains(center) for r in rects) else hidden).append(column)
    # Cabeçalhos de coluna: nomes de nível acima da pontuação, um por coluna.
    names = {}
    for s in all_spans:
        key = norm(s["text"])
        if key in LEVELS and s["bbox"][1] < points_y:
            x = (s["bbox"][0] + s["bbox"][2]) / 2
            column = min(range(len(points)), key=lambda k: abs(points[k][0] - x))
            names.setdefault(column, LEVELS[key])
    levels = [names.get(k) for k in range(len(points))]
    position = None
    if len(set(visible)) == 1:
        position = visible[0]
    elif len(set(visible)) > 1:
        position = "ambiguo"
    return {
        "code": title[0],
        "title": title[1],
        "points": [p for _, _, p in points],
        "levels": levels,
        "minimumPosition": position,
        "visibleMarks": len(visible),
        "hiddenMarks": len(hidden),
    }


def main():
    folder = Path(sys.argv[1])
    sheet = {r["code"]: r for r in json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))}
    pdf = {}
    for file, section in FILES.items():
        doc = fitz.open(str(folder / file))
        for number, page in enumerate(doc, start=1):
            info = analyse_page(page)
            if not info:
                continue
            code = info["code"]
            # O caderno G usa "G1" no código oficial (G1E01) para não colidir com o Geral.
            if section == "G" and not code.startswith("G1"):
                code = "G1" + code[1:]
            if section == "All" and not re.match(r"^G[ESG]\d{2}$", code):
                continue
            if section not in ("All", "G") and not code.startswith(section):
                continue
            info.update({"code": code, "section": section, "file": file, "page": number})
            pdf.setdefault(code, info)

    rows = []
    for code, s in sorted(sheet.items(), key=lambda kv: (kv[1]["section"] != "All", kv[1]["section"], kv[0])):
        p = pdf.get(code)
        sheet_pos = s["minimumPosition"] if s["mandatory"] else None
        row = {
            "section": s["section"],
            "code": code,
            "title": s["title"],
            "sheetMinimum": s["minimum"] if s["mandatory"] else None,
            "sheetMinimumPosition": sheet_pos,
            "sheetMinimumPoints": s.get("minimumPoints") if s["mandatory"] else None,
            "file": p and p["file"],
            "page": p and p["page"],
            "pdfMinimumPosition": p and p.get("minimumPosition"),
            "pdfLevels": p and p.get("levels"),
            "pdfPoints": p and p.get("points"),
            "hiddenMarks": p and p.get("hiddenMarks"),
        }
        if p and isinstance(p.get("minimumPosition"), int) and p.get("levels"):
            row["pdfMinimum"] = p["levels"][p["minimumPosition"] - 1]
            row["pdfMinimumPoints"] = p["points"][p["minimumPosition"] - 1]
        if not p:
            row["status"] = "pagina-nao-localizada"
        elif p.get("error"):
            row["status"] = "erro:" + p["error"]
        elif p.get("minimumPosition") == "ambiguo":
            row["status"] = "marca-ambigua"
        elif p.get("minimumPosition") != sheet_pos:
            row["status"] = "diverge"
        elif sheet_pos and norm(row.get("pdfMinimum") or "") != norm(s["minimum"] or ""):
            row["status"] = "nivel-com-nome-diferente"
        else:
            row["status"] = "confere"
        rows.append(row)

    if len(sys.argv) > 3:
        Path(sys.argv[3]).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    summary = {}
    for r in rows:
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    print(json.dumps(summary, ensure_ascii=False))
    print("com mínimo (planilha):", sum(1 for r in rows if r["sheetMinimumPosition"]),
          "| com mínimo (cadernos):", sum(1 for r in rows if isinstance(r["pdfMinimumPosition"], int)),
          "| páginas com resíduo invisível:", sum(1 for r in rows if r["hiddenMarks"]))
    for r in rows:
        if r["status"] != "confere":
            print(r["status"], r["section"], r["code"], "| planilha:", r["sheetMinimum"], r["sheetMinimumPosition"],
                  "| caderno:", r.get("pdfMinimum"), r["pdfMinimumPosition"], "|", r["file"], "p.", r["page"])


if __name__ == "__main__":
    main()
