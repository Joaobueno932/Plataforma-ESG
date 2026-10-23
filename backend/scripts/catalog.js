#!/usr/bin/env node
/**
 * Importação do catálogo oficial pela linha de comando (uso operacional).
 *
 *   node scripts/catalog.js preview "<arquivo.xlsx>"            → valida e mostra o relatório
 *   node scripts/catalog.js import  "<arquivo.xlsx>" [rótulo]   → grava como rascunho
 *   node scripts/catalog.js publish <versão> [--acknowledge]    → confirmação administrativa
 *   node scripts/catalog.js versions                            → versões registradas
 *   node scripts/catalog.js report <versão>                     → relatório da importação
 *
 * O ator é identificado por ADMIN_EMAIL (padrão: primeiro administrador ativo), para que a
 * autoria da importação fique registrada.
 */
const path = require('node:path');
const config = require('../src/config');
const db = require('../src/db');
const catalog = require('../src/catalog/import');

db.use(db.open(config.dbFile));

function actorId() {
  const email = process.env.ADMIN_EMAIL;
  const row = email
    ? db.one('SELECT id FROM users WHERE lower(email) = lower(?) AND deletedAt IS NULL', email)
    : db.one(
        `SELECT u.id FROM users u JOIN user_profiles p ON p.userId = u.id AND p.role = 'ADMIN' AND p.revokedAt IS NULL
          WHERE u.deletedAt IS NULL AND u.status = 'ACTIVE' ORDER BY u.createdAt LIMIT 1`,
      );
  return row ? row.id : null;
}

function printReport(report) {
  console.log(`\narquivo: ${report.source.file}`);
  console.log(`sha256:  ${report.source.hash}`);
  console.log(`abas:    ${report.sheets.join(', ')}`);
  console.log(`\ncontagens: ${JSON.stringify(report.counts.bySection)}`);
  console.log(
    `indicadores ${report.counts.indicators} | alternativas ${report.counts.levels} | com mínimo obrigatório ${report.counts.mandatory} | soma dos máximos ${report.counts.maxPointsTotal}`,
  );
  console.log('\nconferência com a especificação:');
  for (const check of report.conference)
    console.log(`  ${check.ok ? 'ok ' : 'DIV'} ${check.label}: esperado ${check.expected}, encontrado ${check.actual}`);
  const show = (title, items, format) => {
    console.log(`\n${title}: ${items.length}`);
    for (const item of items.slice(0, 20)) console.log(`  - ${format(item)}`);
    if (items.length > 20) console.log(`  … e mais ${items.length - 20}`);
  };
  show('erros', report.errors, (e) => `${e.kind}${e.code ? ` [${e.code}]` : ''}${e.line ? ` linha ${e.line}` : ''}: ${e.detail || ''}`);
  show('divergências', report.divergences, (d) => `${d.kind}${d.code ? ` [${d.code}]` : ''}: ${d.detail || ''}`);
  show('avisos', report.warnings, (w) => `${w.kind}${w.code ? ` [${w.code}]` : ''}: ${w.detail || ''}`);
  show('fontes ausentes', report.missingSources, (m) => `${m.field} (${m.indicators}): ${m.detail}`);
  console.log(`\npublicável: ${report.summary.publishable ? 'sim' : 'não'}`);
}

const [command, arg, extra] = process.argv.slice(2);
try {
  if (command === 'preview') {
    if (!arg) throw new Error('informe o arquivo .xlsx');
    const result = catalog.preview(path.resolve(arg), { sourceFile: path.basename(arg), actorId: actorId() });
    printReport(result.report);
    if (result.alreadyImportedAs)
      console.log(`\natenção: este arquivo já foi importado como "${result.alreadyImportedAs.label}" (${result.alreadyImportedAs.status})`);
  } else if (command === 'import') {
    if (!arg) throw new Error('informe o arquivo .xlsx');
    const { version, report, reused } = catalog.createDraft(path.resolve(arg), {
      sourceFile: path.basename(arg),
      label: extra || null,
      actorId: actorId(),
    });
    printReport(report);
    console.log(`\nversão ${reused ? 'já existente' : 'criada'}: ${version.label} (${version.id}) — ${version.status}`);
  } else if (command === 'publish') {
    if (!arg) throw new Error('informe o id ou o rótulo da versão');
    const version = catalog.versionById(arg) || db.one('SELECT * FROM catalog_versions WHERE label = ?', arg);
    if (!version) throw new Error('versão não encontrada');
    const published = catalog.publish(version.id, { actorId: actorId(), acknowledge: process.argv.includes('--acknowledge') });
    console.log(`versão publicada: ${published.label} (${published.id})`);
  } else if (command === 'versions') {
    for (const v of db.all('SELECT * FROM catalog_versions ORDER BY createdAt')) {
      const indicators = db.one('SELECT count(*) AS n FROM questions WHERE versionId = ?', v.id).n;
      const cycles = db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', v.id).n;
      console.log(`${v.status.padEnd(9)} ${v.origin.padEnd(8)} ${v.label.padEnd(24)} indicadores=${String(indicators).padStart(3)} ciclos=${cycles}`);
    }
    const active = catalog.activeVersion();
    console.log(`\nem vigor: ${active ? active.label : '(nenhuma)'}`);
  } else if (command === 'report') {
    const row = db.one('SELECT report FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC LIMIT 1', arg);
    if (!row) throw new Error('relatório não encontrado');
    printReport(JSON.parse(row.report));
  } else {
    console.log('uso: node scripts/catalog.js preview <arquivo> | import <arquivo> [rótulo] | publish <versão> [--acknowledge] | versions | report <versão>');
    process.exitCode = 2;
  }
} catch (err) {
  console.error(`erro: ${err.message}`);
  process.exitCode = 1;
}
