#!/usr/bin/env python3
"""Confere a planilha oficial de indicadores contra os cadernos em PDF.

Uso:
    python tools/catalog_crosscheck.py "Indicadores Programa ESG FIEMS 1 (1).xlsx" "Cadernos indicadores"

A planilha é a fonte das alternativas; os cadernos são a fonte de conferência exigida pela
especificação (§ 17: "conferir correspondência com a planilha antes da importação").

O script não altera nada: extrai o texto dos PDFs, normaliza e compara, por indicador:
  - presença do código e do título;
  - presença de cada nível de maturidade declarado na planilha;
  - presença das pontuações informadas.
Imprime um relatório em Markdown no stdout. Depende de `pypdf` (somente leitura).
"""
import json
import logging
import re
import sys
import unicodedata
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
logging.getLogger("pypdf").setLevel(logging.ERROR)

try:
    import openpyxl
except ImportError:  # pragma: no cover
    sys.exit("openpyxl é necessário para ler a planilha")
try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    sys.exit("pypdf é necessário para ler os cadernos em PDF")

SECTION_BY_FILE = {
    "caderno geral": "All",
    "a -": "A",
    "b -": "B",
    "c_": "C",
    "d_": "D",
    "e -": "E",
    "f -": "F",
    "g -": "G",
    "h -": "H",
}


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower().replace("–", "-").replace("—", "-").replace("’", "'")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def section_of(filename: str):
    name = filename.lower()
    for prefix, section in SECTION_BY_FILE.items():
        if name.startswith(prefix):
            return section
    return None


def read_spreadsheet(path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Questionário"]
    rows = list(ws.iter_rows(values_only=True))
    header = {str(h).strip().lower(): i for i, h in enumerate(rows[0]) if h}
    indicators = {}
    for row in rows[1:]:
        if not row or not row[header["caderno"]]:
            continue
        caderno = str(row[header["caderno"]]).strip()
        section = "All" if normalize(caderno) == "geral" else caderno.upper()
        code = str(row[header["codigo_ajustado"]]).strip()
        indicator = indicators.setdefault(
            code,
            {
                "section": section,
                "code": code,
                "code_original": str(row[header["códigos"]]).strip(),
                "title": str(row[header["indicadores"]]).strip(),
                "levels": [],
            },
        )
        indicator["levels"].append(
            {
                "name": str(row[header["classificação"]]).strip(),
                "points": row[header["pontuação"]],
                "mandatory": normalize(row[header["observações"]]) == "obrigatorio",
            }
        )
    return indicators


def read_pdfs(folder: Path):
    texts = {}
    for pdf in sorted(folder.glob("*.pdf")):
        section = section_of(pdf.name)
        if section is None:
            print(f"<!-- caderno não mapeado: {pdf.name} -->", file=sys.stderr)
            continue
        reader = PdfReader(str(pdf))
        pages = [page.extract_text() or "" for page in reader.pages]
        texts[section] = {
            "file": pdf.name,
            "pages": len(pages),
            "text": normalize(" ".join(pages)),
            "raw_pages": pages,
            "norm_pages": [normalize(page) for page in pages],
        }
    return texts


def page_of(caderno, code_original):
    """Página **do** indicador: a que traz o cabeçalho "CÓDIGO: título".

    Procurar apenas o código produz falso positivo, porque o sumário e as remissões de outros
    indicadores também citam o código. O cabeçalho com dois-pontos é o que identifica a página.
    """
    parts = [re.escape(part) for part in code_original.split()]
    anchor = re.compile(r"\b" + r"\s*".join(parts) + r"\s*:", re.IGNORECASE)
    for index, raw in enumerate(caderno["raw_pages"]):
        if anchor.search(raw or ""):
            return index
    return None


def points_on(page_text):
    """Pontuações declaradas na página, como multiconjunto (independe da ordem das colunas,
    que a extração de texto embaralha por causa do layout em colunas)."""
    return sorted(int(m) for m in re.findall(r"(\d+)\s*pontos", page_text))


def main():
    xlsx = Path(sys.argv[1] if len(sys.argv) > 1 else "Indicadores Programa ESG FIEMS 1 (1).xlsx")
    pdf_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "Cadernos indicadores")
    indicators = read_spreadsheet(xlsx)
    pdfs = read_pdfs(pdf_dir)

    summary = {"indicators": len(indicators), "cadernos": len(pdfs)}
    missing_section = []
    code_absent = []
    title_absent = []
    level_absent = []
    points_absent = []
    page_absent = []
    points_mismatch = []

    for code, indicator in sorted(indicators.items()):
        caderno = pdfs.get(indicator["section"])
        if not caderno:
            missing_section.append(code)
            continue
        text = caderno["text"]
        code_forms = {normalize(code), normalize(indicator["code_original"])}
        if not any(form in text for form in code_forms if form):
            code_absent.append((code, indicator["section"]))
        if normalize(indicator["title"]) not in text:
            title_absent.append((code, indicator["section"], indicator["title"]))
        for level in indicator["levels"]:
            if normalize(level["name"]) not in text:
                level_absent.append((code, level["name"]))
            points = level["points"]
            if isinstance(points, (int, float)) and points > 0 and normalize(str(int(points))) not in text:
                points_absent.append((code, level["name"], points))

        # Conferência por página do indicador, independente da ordem das colunas.
        index = page_of(caderno, indicator["code_original"])
        if index is None:
            page_absent.append((code, indicator["section"]))
            continue
        page_norm = caderno["norm_pages"][index]
        expected = sorted(int(l["points"]) for l in indicator["levels"] if isinstance(l["points"], (int, float)))
        found = points_on(page_norm)
        if expected != found:
            points_mismatch.append((code, indicator["section"], index + 1, expected, found))
        # A marca do nível mínimo ("Obrigatório") fica acima de uma coluna, e a extração de
        # texto não preserva o layout em colunas: há páginas em que ela sai como
        # "ObrigatórioObrigatório" e páginas em que não sai. Comparar isso automaticamente
        # produziria divergências falsas, então a conferência do mínimo obrigatório contra os
        # cadernos fica registrada como tarefa de leitura humana (ver docs/esg/importacao-catalogo.md).

    print("## Conferência planilha × cadernos (PDF)\n")
    print(f"- indicadores na planilha: **{summary['indicators']}**")
    print(f"- cadernos lidos: **{summary['cadernos']}** ({', '.join(f'{s} ({d[chr(102)+chr(105)+chr(108)+chr(101)]}, {d[chr(112)+chr(97)+chr(103)+chr(101)+chr(115)]} pág.)' for s, d in sorted(pdfs.items()))})")
    print(f"- códigos não localizados no caderno correspondente: **{len(code_absent)}**")
    print(f"- títulos não localizados: **{len(title_absent)}**")
    print(f"- níveis não localizados: **{len(level_absent)}**")
    print(f"- pontuações (> 0) não localizadas: **{len(points_absent)}**")
    print(f"- indicadores sem página identificável no caderno: **{len(page_absent)}**")
    print(f"- conjuntos de pontuação divergentes (planilha × página do caderno): **{len(points_mismatch)}**")
    print("- marca “Obrigatório” do nível mínimo: **não conferível por extração de texto** (layout em colunas)")
    if missing_section:
        print(f"- cadernos ausentes para: {', '.join(missing_section)}")

    def block(title, rows, formatter, limit=40):
        if not rows:
            return
        print(f"\n### {title} ({len(rows)})\n")
        for row in rows[:limit]:
            print(f"- {formatter(row)}")
        if len(rows) > limit:
            print(f"- … e mais {len(rows) - limit}")

    block("Códigos não localizados no PDF", code_absent, lambda r: f"`{r[0]}` (caderno {r[1]})")
    block("Títulos não localizados no PDF", title_absent, lambda r: f"`{r[0]}` (caderno {r[1]}): “{r[2]}”")
    block("Níveis não localizados no PDF", level_absent, lambda r: f"`{r[0]}`: {r[1]}")
    block("Pontuações não localizadas no PDF", points_absent, lambda r: f"`{r[0]}` {r[1]} = {r[2]}")
    block("Indicadores sem página identificável", page_absent, lambda r: f"`{r[0]}` (caderno {r[1]})")
    block(
        "Conjunto de pontuações divergente",
        points_mismatch,
        lambda r: f"`{r[0]}` (caderno {r[1]}, pág. {r[2]}): planilha {r[3]} × caderno {r[4]}",
        limit=60,
    )

    print("\n<!-- json:" + json.dumps({
        "indicators": summary["indicators"],
        "cadernos": summary["cadernos"],
        "code_absent": len(code_absent),
        "title_absent": len(title_absent),
        "level_absent": len(level_absent),
        "points_absent": len(points_absent),
        "page_absent": len(page_absent),
        "points_mismatch": len(points_mismatch),
    }) + " -->")


if __name__ == "__main__":
    main()
