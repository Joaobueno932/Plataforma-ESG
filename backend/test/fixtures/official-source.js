const fs = require('node:fs');
const path = require('node:path');

/** Planilha oficial de indicadores: na pasta `Documentação` ou, no formato antigo, na raiz. */
const CANDIDATES = [
  path.resolve(__dirname, '../../../Documentação/Indicadores Programa ESG FIEMS 1.xlsx'),
  path.resolve(__dirname, '../../../Indicadores Programa ESG FIEMS 1 (1).xlsx'),
];

const SOURCE = CANDIDATES.find((file) => fs.existsSync(file)) || CANDIDATES[0];
const hasSource = fs.existsSync(SOURCE);

module.exports = { SOURCE, hasSource };
