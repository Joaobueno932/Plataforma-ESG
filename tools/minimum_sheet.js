// Lista, pelo parser do próprio sistema, o nível mínimo de cada indicador da planilha oficial.
//   node tools/minimum_sheet.js "<planilha.xlsx>" <saida.json>
// A saída alimenta tools/minimum_crosscheck.py (conferência contra os cadernos em PDF).
const fs = require('fs');
const path = require('path');
const { parseCatalog } = require('../backend/src/catalog/parse');

const [source, out] = process.argv.slice(2);
if (!source || !out) {
  console.error('uso: node tools/minimum_sheet.js "<planilha.xlsx>" <saida.json>');
  process.exit(1);
}
const { indicators, report } = parseCatalog(path.resolve(source));
if (report.errors.length) {
  console.error('planilha com erros de estrutura:', JSON.stringify(report.errors.slice(0, 3)));
  process.exit(1);
}
const rows = indicators.map((indicator) => {
  const minimum = indicator.levels.find((level) => level.isMandatoryMinimum);
  return {
    section: indicator.section,
    code: indicator.code,
    title: indicator.title,
    mandatory: indicator.mandatory,
    minimum: minimum ? minimum.name : null,
    minimumPoints: minimum ? minimum.points : null,
    minimumPosition: minimum ? minimum.position : null,
  };
});
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`${rows.length} indicadores; ${rows.filter((r) => r.mandatory).length} com maturidade mínima exigida`);
