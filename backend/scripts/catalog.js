#!/usr/bin/env node
/**
 * Importação do catálogo oficial pela linha de comando (uso operacional).
 *
 *   npm run catalog -- preview "<arquivo.xlsx>"            → valida e mostra o relatório
 *   npm run catalog -- import  "<arquivo.xlsx>" [rótulo]   → grava como rascunho
 *   npm run catalog -- publish <versão> [--acknowledge]    → confirmação administrativa
 *   npm run catalog -- versions                            → versões registradas
 *   npm run catalog -- report <versão>                     → relatório da importação
 *
 * O ator é identificado por ADMIN_EMAIL (padrão: primeiro administrador ativo), para que a
 * autoria da importação fique registrada.
 */
const path = require('node:path');
const db = require('../src/db');
const catalog = require('../src/catalog/import');

async function actorId() {
  const email = process.env.ADMIN_EMAIL;
  const row = email
    ? await db.one('SELECT id FROM users WHERE lower(email) = lower(?) AND deletedAt IS NULL', email)
    : await db.one(
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

async function main() {
  const [command, arg, extra] = process.argv.slice(2);
  await db.init({ runMigrations: false });

  if (command === 'preview') {
    if (!arg) throw new Error('informe o arquivo .xlsx');
    const result = await catalog.preview(path.resolve(arg), { sourceFile: path.basename(arg), actorId: await actorId() });
    printReport(result.report);
    if (result.alreadyImportedAs)
      console.log(`\natenção: este arquivo já foi importado como "${result.alreadyImportedAs.label}" (${result.alreadyImportedAs.status})`);
  } else if (command === 'import') {
    if (!arg) throw new Error('informe o arquivo .xlsx');
    const { version, report, reused } = await catalog.createDraft(path.resolve(arg), {
      sourceFile: path.basename(arg),
      label: extra || null,
      actorId: await actorId(),
    });
    printReport(report);
    console.log(`\nversão ${reused ? 'já existente' : 'criada'}: ${version.label} (${version.id}) — ${version.status}`);
  } else if (command === 'publish') {
    if (!arg) throw new Error('informe o id ou o rótulo da versão');
    const version = (await catalog.versionById(arg)) || (await db.one('SELECT * FROM catalog_versions WHERE label = ?', arg));
    if (!version) throw new Error('versão não encontrada');
    const published = await catalog.publish(version.id, { actorId: await actorId(), acknowledge: process.argv.includes('--acknowledge') });
    console.log(`versão publicada: ${published.label} (${published.id})`);
  } else if (command === 'versions') {
    for (const v of await db.all('SELECT * FROM catalog_versions ORDER BY createdAt')) {
      const indicators = (await db.one('SELECT count(*) AS n FROM questions WHERE versionId = ?', v.id)).n;
      const cycles = (await db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', v.id)).n;
      console.log(`${v.status.padEnd(9)} ${v.origin.padEnd(8)} ${v.label.padEnd(24)} indicadores=${String(indicators).padStart(3)} ciclos=${cycles}`);
    }
    const active = await catalog.activeVersion();
    console.log(`\nem vigor: ${active ? active.label : '(nenhuma)'}`);
  } else if (command === 'report') {
    const row = await db.one('SELECT report FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC LIMIT 1', arg);
    if (!row) throw new Error('relatório não encontrado');
    printReport(JSON.parse(row.report));
  } else {
    console.log('uso: preview <arquivo> | import <arquivo> [rótulo] | publish <versão> [--acknowledge] | versions | report <versão>');
    process.exitCode = 2;
  }
}

main()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
