/**
 * Leitura e validação da planilha oficial de indicadores.
 *
 * Fontes dentro do mesmo arquivo, conferidas entre si:
 *  - aba `Questionário`  → uma linha por **alternativa** (fonte das alternativas e dos pontos);
 *  - aba `Consolidado`   → uma linha por **indicador** (máximo, obrigatoriedade, ODS);
 *  - abas `Caderno Geral` e `A`–`H` → os cadernos, com a denominação oficial e os indicadores.
 *
 * Nada é completado por inferência: campos que a planilha não traz (descrição do indicador e
 * orientação de verificação) ficam nulos e são listados em `missingSources`. Linhas de
 * alternativa **não** viram indicadores; o indicador é o agrupamento por código.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { readWorkbook } = require('./xlsx');

const QUESTION_SHEET = 'Questionário';
const CONSOLIDATED_SHEET = 'Consolidado';
const GENERAL_SHEET = 'Caderno Geral';
const SECTOR_SHEETS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Conferência declarada na especificação § 14 — usada para comparar, nunca como constante. */
const EXPECTED = {
  indicators: 139,
  general: 59,
  sectoral: 80,
  perSectoral: 10,
  perAssessment: 69,
  sectorals: 8,
};

const AXIS = { environmental: 'E', ambiental: 'E', social: 'S', governance: 'G', governanca: 'G' };

const stripAccents = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalize = (value) => stripAccents(value).trim().toLowerCase();
const text = (value) => (value === null || value === undefined ? null : String(value).replace(/\s+/g, ' ').trim() || null);
const slugify = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Eixo a partir de rótulos como "Environmental (Ambiental)" ou "Governance (Governança)". */
function axisOf(value) {
  const key = normalize(value).split(/[\s(]/)[0];
  return AXIS[key] || null;
}

/** "Geral" → All (Caderno Geral); letras → o próprio caderno setorial. */
function sectionOf(value) {
  const raw = text(value);
  if (!raw) return null;
  if (normalize(raw) === 'geral') return 'All';
  return raw.toUpperCase();
}

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
/** Zero é valor, não ausência. */
const asNumber = (value) => {
  if (isBlank(value)) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const isYes = (value) => normalize(value) === 'sim';

/** Índice das colunas pelo **nome** do cabeçalho (a posição física não é confiável). */
function headerIndex(row) {
  const index = {};
  (row || []).forEach((cell, i) => {
    const key = normalize(cell).replace(/\s+/g, '_');
    if (key) index[key] = i;
  });
  return index;
}

function sourceOf(input, sourceFile) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  return {
    file: sourceFile || (Buffer.isBuffer(input) ? 'upload.xlsx' : path.basename(input)),
    hash: crypto.createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.length,
    buffer,
  };
}

/* ------------------------------------------------------------------ parsing */

function parseIndicators(rows, report) {
  const header = headerIndex(rows[0]);
  const required = ['caderno', 'eixos', 'topicos', 'codigos', 'codigo_ajustado', 'indicadores', 'descricao', 'classificacao', 'pontuacao'];
  const missing = required.filter((column) => header[column] === undefined);
  if (missing.length) {
    report.errors.push({ kind: 'coluna-ausente', sheet: QUESTION_SHEET, detail: `colunas ausentes: ${missing.join(', ')}` });
    return [];
  }

  const byCode = new Map();
  let dataRows = 0;

  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2; // 1 = cabeçalho
    if (!row || row.every(isBlank)) return;
    dataRows += 1;

    const section = sectionOf(row[header.caderno]);
    const code = text(row[header.codigo_ajustado]);
    const codeOriginal = text(row[header.codigos]);
    const title = text(row[header.indicadores]);
    const axis = axisOf(row[header.eixos]);
    const topic = text(row[header.topicos]);
    const levelName = text(row[header.classificacao]);
    const description = text(row[header.descricao]);
    const points = asNumber(row[header.pontuacao]);
    const note = text(row[header.observacoes]);
    const mandatoryColumn = header.obrigatorio !== undefined ? text(row[header.obrigatorio]) : null;
    const ods = text(row[header.ods]);

    const fail = (kind, detail) => report.errors.push({ kind, sheet: QUESTION_SHEET, line, code, detail });
    if (!section) return fail('campo-ausente', 'caderno em branco');
    if (!code) return fail('campo-ausente', 'código do indicador em branco');
    if (!title) return fail('campo-ausente', 'título do indicador em branco');
    if (!axis) return fail('valor-invalido', `eixo não reconhecido: ${row[header.eixos]}`);
    if (!levelName) return fail('campo-ausente', 'classificação (nível) em branco');
    if (!description) return fail('campo-ausente', 'descrição da alternativa em branco');
    if (points === null) return fail('campo-ausente', 'pontuação em branco');
    if (Number.isNaN(points)) return fail('numero-invalido', `pontuação não numérica: ${row[header.pontuacao]}`);
    if (points < 0) return fail('numero-invalido', `pontuação negativa: ${points}`);
    // Padrão observado na fonte: <caderno><eixo><NN>, com o caderno G usando G1 para não
    // colidir com o Geral (GE01 × G1E01).
    const codeMatch = /^([A-Z]\d?)([ESG])(\d{2})$/.exec(code);
    if (!codeMatch) report.warnings.push({ kind: 'codigo-fora-do-padrao', sheet: QUESTION_SHEET, line, code });
    else if (codeMatch[2] !== axis)
      report.divergences.push({
        kind: 'eixo-divergente-do-codigo',
        sheet: QUESTION_SHEET,
        line,
        code,
        detail: `código indica eixo ${codeMatch[2]} e a coluna Eixos indica ${axis}`,
      });

    const key = code;
    let indicator = byCode.get(key);
    if (!indicator) {
      indicator = {
        section,
        axis,
        topic,
        code,
        codeOriginal,
        title,
        ods,
        description: null, // a planilha não traz descrição do indicador
        verification: null, // nem orientação de verificação
        levels: [],
        firstLine: line,
      };
      byCode.set(key, indicator);
    } else {
      // O indicador é o agrupamento por código: as demais linhas são alternativas dele.
      const check = (field, value, label) => {
        if (value && indicator[field] && normalize(indicator[field]) !== normalize(value))
          report.errors.push({
            kind: 'indicador-inconsistente',
            sheet: QUESTION_SHEET,
            line,
            code,
            detail: `${label} divergente entre linhas do mesmo código: "${indicator[field]}" × "${value}"`,
          });
      };
      check('title', title, 'título');
      check('section', section, 'caderno');
      check('axis', axis, 'eixo');
      check('topic', topic, 'tópico');
      if (ods && !indicator.ods) indicator.ods = ods;
    }

    const isMandatoryMinimum = normalize(note) === 'obrigatorio';
    if (mandatoryColumn !== null && isYes(mandatoryColumn) !== isMandatoryMinimum) {
      report.divergences.push({
        kind: 'obrigatorio-derivado-divergente',
        sheet: QUESTION_SHEET,
        line,
        code,
        detail: `coluna "Obrigatório" = ${mandatoryColumn || 'vazio'} mas "Observações" ${isMandatoryMinimum ? 'marca' : 'não marca'} obrigatório; a marcação em Observações é a fonte`,
      });
    }

    indicator.levels.push({
      position: indicator.levels.length + 1,
      name: levelName,
      slug: slugify(levelName),
      description,
      points,
      isMandatoryMinimum,
      note,
      line,
    });
  });

  report.counts.questionRows = dataRows;

  const indicators = [...byCode.values()];
  for (const indicator of indicators) {
    if (indicator.levels.length < 2)
      report.errors.push({
        kind: 'alternativas-insuficientes',
        sheet: QUESTION_SHEET,
        code: indicator.code,
        line: indicator.firstLine,
        detail: `o indicador tem ${indicator.levels.length} alternativa(s); o mínimo é 2`,
      });
    if (indicator.levels.length > 6)
      report.warnings.push({
        kind: 'muitas-alternativas',
        code: indicator.code,
        detail: `${indicator.levels.length} alternativas (a fonte observada tem no máximo 5)`,
      });

    const names = indicator.levels.map((level) => normalize(level.name));
    const duplicated = names.filter((name, i) => names.indexOf(name) !== i);
    if (duplicated.length)
      report.errors.push({
        kind: 'nivel-duplicado',
        code: indicator.code,
        detail: `nível repetido no mesmo indicador: ${[...new Set(duplicated)].join(', ')}`,
      });

    const minimums = indicator.levels.filter((level) => level.isMandatoryMinimum);
    if (minimums.length > 1)
      report.errors.push({
        kind: 'minimo-obrigatorio-invalido',
        code: indicator.code,
        detail: `${minimums.length} níveis marcados como obrigatórios; só pode haver um mínimo exigido`,
      });
    indicator.mandatory = minimums.length === 1;
    indicator.mandatoryPosition = minimums.length === 1 ? minimums[0].position : null;
    // O máximo é o maior ponto possível entre as alternativas — não é o ponto do mínimo
    // obrigatório, que pode valer zero.
    indicator.maxPoints = indicator.levels.reduce((acc, level) => Math.max(acc, level.points), 0);
  }
  return indicators;
}

function parseConsolidated(rows, indicators, report) {
  if (!rows || !rows.length) {
    report.warnings.push({ kind: 'aba-ausente', sheet: CONSOLIDATED_SHEET, detail: 'conferência de máximo/obrigatoriedade não realizada' });
    return;
  }
  const header = headerIndex(rows[0]);
  const byCode = new Map(indicators.map((indicator) => [indicator.code, indicator]));
  const seen = new Set();

  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    if (!row || row.every(isBlank)) return;
    const code = text(row[header.codigo_ajustado]);
    if (!code) return;
    seen.add(code);
    const indicator = byCode.get(code);
    if (!indicator) {
      report.divergences.push({
        kind: 'indicador-fora-do-questionario',
        sheet: CONSOLIDATED_SHEET,
        line,
        code,
        detail: 'indicador listado no Consolidado e ausente na aba Questionário',
      });
      return;
    }
    const max = asNumber(row[header.maximo]);
    if (max !== null && !Number.isNaN(max) && max !== indicator.maxPoints)
      report.divergences.push({
        kind: 'maximo-divergente',
        sheet: CONSOLIDATED_SHEET,
        line,
        code,
        detail: `Consolidado indica máximo ${max}; as alternativas somam no máximo ${indicator.maxPoints}`,
      });
    const mandatory = isYes(row[header.obrigatorio]);
    if (mandatory !== indicator.mandatory)
      report.divergences.push({
        kind: 'obrigatorio-divergente',
        sheet: CONSOLIDATED_SHEET,
        line,
        code,
        detail: `Consolidado indica obrigatório = ${mandatory ? 'Sim' : 'Não'}; a aba Questionário ${indicator.mandatory ? 'marca' : 'não marca'} nível mínimo`,
      });
    const title = text(row[header.indicadores]);
    if (title && normalize(title) !== normalize(indicator.title))
      report.divergences.push({
        kind: 'titulo-divergente',
        sheet: CONSOLIDATED_SHEET,
        line,
        code,
        detail: `"${indicator.title}" (Questionário) × "${title}" (Consolidado)`,
      });
    const ods = text(row[header.ods]);
    if (ods && indicator.ods && normalize(ods) !== normalize(indicator.ods))
      report.divergences.push({ kind: 'ods-divergente', sheet: CONSOLIDATED_SHEET, line, code, detail: `${indicator.ods} × ${ods}` });
  });

  for (const indicator of indicators)
    if (!seen.has(indicator.code))
      report.divergences.push({
        kind: 'indicador-fora-do-consolidado',
        sheet: CONSOLIDATED_SHEET,
        code: indicator.code,
        detail: 'indicador presente na aba Questionário e ausente no Consolidado',
      });
  report.counts.consolidatedRows = seen.size;
}

/** Abas de caderno: denominação oficial + conferência de código, título, máximo e obrigatoriedade. */
function parseSectionSheets(sheets, indicators, report) {
  const sections = [];
  const byCode = new Map(indicators.map((indicator) => [indicator.code, indicator]));
  const sheetOf = { All: GENERAL_SHEET };
  for (const letter of SECTOR_SHEETS) sheetOf[letter] = letter;

  Object.entries(sheetOf).forEach(([section, sheetName], position) => {
    const rows = sheets[sheetName];
    if (!rows || !rows.length) {
      report.warnings.push({ kind: 'aba-ausente', sheet: sheetName, detail: 'caderno não conferido' });
      return;
    }
    const titleRow = rows[0] || [];
    const name = text(titleRow[1]) || text(titleRow[0]);
    if (!name) report.warnings.push({ kind: 'caderno-sem-denominacao', sheet: sheetName });
    sections.push({ section, name: name || sheetName, position, sheet: sheetName });

    const header = headerIndex(rows[1]);
    const codeColumn = header.codigos;
    if (codeColumn === undefined) {
      report.warnings.push({ kind: 'coluna-ausente', sheet: sheetName, detail: 'coluna "Códigos" não encontrada; caderno não conferido' });
      return;
    }
    let found = 0;
    rows.slice(2).forEach((row, offset) => {
      const line = offset + 3;
      if (!row || row.every(isBlank)) return;
      const codeOriginal = text(row[codeColumn]);
      if (!codeOriginal) return;
      const code = codeOriginal.replace(/\s+/g, '');
      found += 1;
      const indicator = byCode.get(code);
      if (!indicator) {
        report.divergences.push({
          kind: 'indicador-do-caderno-ausente-no-questionario',
          sheet: sheetName,
          line,
          code,
          detail: 'código consta no caderno e não na aba Questionário',
        });
        return;
      }
      if (indicator.section !== section)
        report.divergences.push({
          kind: 'caderno-divergente',
          sheet: sheetName,
          line,
          code,
          detail: `aba Questionário associa ao caderno ${indicator.section}`,
        });
      const title = text(row[header.indicadores]);
      if (title && normalize(title) !== normalize(indicator.title))
        report.divergences.push({ kind: 'titulo-divergente', sheet: sheetName, line, code, detail: `"${indicator.title}" × "${title}"` });
      const max = asNumber(row[header.maximo]);
      if (max !== null && !Number.isNaN(max) && max !== indicator.maxPoints)
        report.divergences.push({ kind: 'maximo-divergente', sheet: sheetName, line, code, detail: `caderno indica ${max}; alternativas indicam ${indicator.maxPoints}` });
      const mandatoryCell = header.obrigatorio !== undefined ? row[header.obrigatorio] : null;
      if (mandatoryCell !== null && isYes(mandatoryCell) !== indicator.mandatory)
        report.divergences.push({
          kind: 'obrigatorio-divergente',
          sheet: sheetName,
          line,
          code,
          detail: `caderno indica obrigatório = ${isYes(mandatoryCell) ? 'Sim' : 'Não'}`,
        });
    });
    report.counts.sectionRows = (report.counts.sectionRows || 0) + found;
  });
  return sections;
}

/* ------------------------------------------------------------------ conferências */

function conference(indicators, report) {
  const bySection = new Map();
  for (const indicator of indicators) bySection.set(indicator.section, (bySection.get(indicator.section) || 0) + 1);

  const general = bySection.get('All') || 0;
  const sectoral = [...bySection.entries()].filter(([section]) => section !== 'All');
  const sectoralTotal = sectoral.reduce((acc, [, n]) => acc + n, 0);

  const entry = (label, expected, actual) => ({ label, expected, actual, ok: expected === actual });
  report.conference.push(entry('indicadores únicos', EXPECTED.indicators, indicators.length));
  report.conference.push(entry('indicadores do Caderno Geral', EXPECTED.general, general));
  report.conference.push(entry('indicadores nos cadernos setoriais', EXPECTED.sectoral, sectoralTotal));
  report.conference.push(entry('cadernos setoriais', EXPECTED.sectorals, sectoral.length));
  for (const [section, n] of sectoral.sort()) report.conference.push(entry(`indicadores do caderno ${section}`, EXPECTED.perSectoral, n));
  report.conference.push(
    entry('itens por avaliação (Geral + 1 setorial)', EXPECTED.perAssessment, general + (sectoral.length ? Math.max(...sectoral.map(([, n]) => n)) : 0)),
  );

  report.counts.indicators = indicators.length;
  report.counts.general = general;
  report.counts.sectoral = sectoralTotal;
  report.counts.levels = indicators.reduce((acc, indicator) => acc + indicator.levels.length, 0);
  report.counts.mandatory = indicators.filter((indicator) => indicator.mandatory).length;
  report.counts.bySection = Object.fromEntries([...bySection.entries()].sort());
  report.counts.levelsPerIndicator = indicators.reduce((acc, indicator) => {
    acc[indicator.levels.length] = (acc[indicator.levels.length] || 0) + 1;
    return acc;
  }, {});
  report.counts.zeroPointLevels = indicators.reduce((acc, indicator) => acc + indicator.levels.filter((level) => level.points === 0).length, 0);
  report.counts.zeroPointMandatory = indicators.filter((indicator) => {
    const minimum = indicator.levels.find((level) => level.isMandatoryMinimum);
    return minimum && minimum.points === 0;
  }).length;
  report.counts.maxPointsTotal = indicators.reduce((acc, indicator) => acc + indicator.maxPoints, 0);

  const axisMax = {};
  for (const indicator of indicators) {
    const key = `${indicator.section}/${indicator.axis}`;
    axisMax[key] = (axisMax[key] || 0) + indicator.maxPoints;
  }
  report.counts.maxPointsBySectionAxis = axisMax;

  for (const check of report.conference)
    if (!check.ok)
      report.divergences.push({
        kind: 'conferencia-de-contagem',
        detail: `${check.label}: esperado ${check.expected} pela especificação, encontrado ${check.actual} na fonte`,
      });
}

/* ------------------------------------------------------------------ entrada */

/**
 * @param {string|Buffer} input caminho ou conteúdo do .xlsx
 * @returns {{source, sections, indicators, report}}
 */
function parseCatalog(input, { sourceFile = null } = {}) {
  const source = sourceOf(input, sourceFile);
  const report = {
    source: { file: source.file, hash: source.hash, bytes: source.bytes },
    sheets: [],
    counts: {},
    conference: [],
    errors: [],
    warnings: [],
    divergences: [],
    missingSources: [],
    generatedAt: new Date().toISOString(),
  };

  let workbook;
  try {
    workbook = readWorkbook(source.buffer);
  } catch (err) {
    report.errors.push({ kind: 'arquivo-invalido', detail: err.message });
    return { source, sections: [], indicators: [], report };
  }
  report.sheets = workbook.sheetNames;

  const questionRows = workbook.sheets[QUESTION_SHEET];
  if (!questionRows || !questionRows.length) {
    report.errors.push({
      kind: 'aba-ausente',
      sheet: QUESTION_SHEET,
      detail: `a aba "${QUESTION_SHEET}" é a fonte das alternativas e não foi encontrada (abas no arquivo: ${workbook.sheetNames.join(', ')})`,
    });
    return { source, sections: [], indicators: [], report };
  }

  const indicators = parseIndicators(questionRows, report);
  parseConsolidated(workbook.sheets[CONSOLIDATED_SHEET], indicators, report);
  const sections = parseSectionSheets(workbook.sheets, indicators, report);
  conference(indicators, report);

  // Campos exigidos pela especificação que a planilha não contém: ficam nulos, nunca inventados.
  const withoutDescription = indicators.filter((indicator) => !indicator.description).length;
  if (withoutDescription)
    report.missingSources.push({
      field: 'descrição do indicador e orientação de verificação',
      indicators: withoutDescription,
      detail:
        'a planilha traz descrição por alternativa, não do indicador; descrição e verificação devem vir dos cadernos oficiais (PDF) e permanecem nulas até a conferência',
    });

  // Caderno Geral primeiro, depois os setoriais em ordem alfabética.
  const rank = (section) => (section === 'All' ? '0' : `1${section}`);
  indicators.sort((a, b) => rank(a.section).localeCompare(rank(b.section)) || a.code.localeCompare(b.code));
  indicators.forEach((indicator, index) => {
    indicator.position = index + 1;
  });

  report.summary = {
    indicators: indicators.length,
    levels: report.counts.levels || 0,
    errors: report.errors.length,
    warnings: report.warnings.length,
    divergences: report.divergences.length,
    publishable: report.errors.length === 0,
  };
  return { source, sections, indicators, report };
}

module.exports = { parseCatalog, EXPECTED, slugify, axisOf, sectionOf, QUESTION_SHEET };
