#!/usr/bin/env node
/**
 * Transfere a base SQLite da reconstrução anterior para o MySQL, **preservando ids, autoria e
 * datas**. Não cria nada que não exista na origem e não apaga nada do destino sem pedido.
 *
 *   npm run db:transfer                      → ensaio (lê a origem, confere, não grava)
 *   npm run db:transfer -- --apply           → grava no MySQL configurado
 *   npm run db:transfer -- --apply --truncate → limpa as tabelas do destino antes (pede --confirm)
 *
 * A ordem das tabelas respeita as chaves estrangeiras. Colunas que só existem no destino
 * recebem o padrão do esquema; colunas que só existem na origem são relatadas e ignoradas.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../src/config');
const db = require('../src/db');
const sqliteMigrations = require('../src/migrations/sqlite');

/** Ordem segura para inserção (pais antes dos filhos). */
const ORDER = [
  'sectors',
  'companies',
  'users',
  'user_profiles',
  'user_company_links',
  'sessions',
  'password_resets',
  'catalog_versions',
  'catalog_imports',
  'catalog_sections',
  'questions',
  'answers',
  'reports',
  'cycle_professionals',
  'cycle_rounds',
  'question_reports',
  'item_answer_versions',
  'company_files',
  'question_report_files',
  'evidences',
  'na_requests',
  'na_request_files',
  'cycle_results',
  'cycle_result_axes',
  'leads',
  'audit_events',
];

/**
 * Colunas que apontam para linhas gravadas **depois** (referência circular ou para a própria
 * tabela). Entram como NULL na inserção e são preenchidas no fim, em uma única transação.
 */
const DEFERRED_COLUMNS = {
  questions: ['mandatoryAnswerId'], // aponta para answers, inserida depois
  reports: ['previousReportId'], // ciclo anterior da mesma tabela
  company_files: ['replacesFileId'], // versão anterior do mesmo arquivo
};

/** Colunas da origem que não existem no destino (ou vice-versa) são tratadas aqui. */
const BOOLEAN_COLUMNS = new Set([
  'access', 'reportAccess', 'needsReview', 'keepLogged', 'mandatory', 'hasMandatory', 'inGed',
  'nonApplicable', 'nonCompliant', 'indefiniteValidity', 'ratingValid', 'eligible', 'valid',
]);

/**
 * Abre a origem em **cópia**: o arquivo herdado nunca é alterado. Na cópia são aplicadas as
 * migrações SQLite congeladas, para que uma base parada em qualquer ponto do histórico chegue
 * ao estado que o esquema MySQL espera antes da transferência.
 */
function openLegacy(file) {
  if (!fs.existsSync(file)) throw new Error(`base SQLite não encontrada: ${file}`);
  const copyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esg-transfer-'));
  const copy = path.join(copyDir, path.basename(file));
  fs.copyFileSync(file, copy);
  const legacy = new DatabaseSync(copy);
  legacy.exec('PRAGMA foreign_keys = ON');
  const applied = sqliteMigrations.migrate(legacy);
  return { legacy, copy, applied };
}

const legacyTables = (legacy) =>
  legacy
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name);

const legacyColumns = (legacy, table) => legacy.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

async function targetColumns(table) {
  const rows = await db.all(
    `SELECT column_name AS name, extra FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
    table,
  );
  // colunas geradas não podem receber valor
  return rows.filter((row) => !String(row.extra || '').includes('GENERATED')).map((row) => row.name);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const truncate = process.argv.includes('--truncate');
  const confirm = process.argv.includes('--confirm');
  const file = process.env.LEGACY_SQLITE_FILE || config.legacySqliteFile;

  const { legacy, copy, applied } = openLegacy(file);
  await db.init({ runMigrations: true });

  console.log(`origem : ${file}`);
  console.log(`cópia  : ${copy} (o arquivo de origem não é alterado)`);
  console.log(`destino: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);
  console.log(apply ? 'modo   : APLICAR' : 'modo   : ENSAIO (nada é gravado)');
  console.log(applied.length ? `migrações SQLite aplicadas na cópia: ${applied.join(', ')}` : 'cópia já estava no estado final do histórico SQLite');

  const present = new Set(legacyTables(legacy));
  const summary = [];
  const skippedColumns = {};
  const deferred = []; // { table, id, values: {coluna: valor} }

  if (apply && truncate) {
    if (!confirm) throw new Error('--truncate apaga as tabelas do destino; repita com --confirm');
    const count = await db.truncateAll();
    console.log(`destino limpo (${count} tabelas)`);
  }

  for (const table of ORDER) {
    if (!present.has(table)) {
      summary.push({ table, origem: '-', destino: '-', nota: 'ausente na origem' });
      continue;
    }
    const rows = legacy.prepare(`SELECT * FROM ${table}`).all().map((row) => ({ ...row }));
    const target = await targetColumns(table);
    const source = legacyColumns(legacy, table);
    const postponed = (DEFERRED_COLUMNS[table] || []).filter((column) => source.includes(column) && target.includes(column));
    const usable = source.filter((column) => target.includes(column) && !postponed.includes(column));
    const extra = source.filter((column) => !target.includes(column));
    if (extra.length) skippedColumns[table] = extra;

    const cell = (column, value) => {
      if (value === undefined) return null;
      if (BOOLEAN_COLUMNS.has(column) && typeof value === 'number') return value ? 1 : 0;
      if (typeof value === 'bigint') return Number(value);
      return value;
    };

    let inserted = 0;
    if (apply && rows.length) {
      const columnList = usable.map((column) => `\`${column}\``).join(', ');
      const marks = usable.map(() => '?').join(', ');
      // Em lote, dentro de uma transação por tabela: a falha de uma tabela não deixa meia carga.
      await db.transaction(async () => {
        for (const row of rows) {
          const values = usable.map((column) => cell(column, row[column]));
          await db.run(`INSERT INTO \`${table}\` (${columnList}) VALUES (${marks})`, ...values);
          inserted += 1;
          const later = postponed.filter((column) => row[column] !== null && row[column] !== undefined);
          if (later.length)
            deferred.push({
              table,
              id: row.id,
              values: Object.fromEntries(later.map((column) => [column, cell(column, row[column])])),
            });
        }
      });
    }
    const { n } = await db.one(`SELECT count(*) AS n FROM \`${table}\``);
    summary.push({ table, origem: rows.length, destino: Number(n), nota: apply ? `${inserted} inserida(s)` : 'ensaio' });
  }

  // Referências que só existem depois de toda a carga (circulares e para a própria tabela).
  if (deferred.length) {
    await db.transaction(async () => {
      for (const item of deferred) {
        const columns = Object.keys(item.values);
        await db.run(
          `UPDATE \`${item.table}\` SET ${columns.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
          ...columns.map((c) => item.values[c]),
          item.id,
        );
      }
    });
    console.log(`referências adiadas preenchidas: ${deferred.length}`);
  }

  console.log('\ntabela                      origem  destino  nota');
  for (const row of summary)
    console.log(`${String(row.table).padEnd(26)} ${String(row.origem).padStart(6)} ${String(row.destino).padStart(8)}  ${row.nota}`);

  if (Object.keys(skippedColumns).length) {
    console.log('\ncolunas da origem sem correspondência no destino (ignoradas):');
    for (const [table, columns] of Object.entries(skippedColumns)) console.log(`  ${table}: ${columns.join(', ')}`);
  }

  const divergent = summary.filter((row) => apply && typeof row.origem === 'number' && row.destino < row.origem);
  if (divergent.length) {
    console.log('\nATENÇÃO: destino com menos linhas que a origem em: ' + divergent.map((row) => row.table).join(', '));
    process.exitCode = 1;
  } else if (apply) {
    console.log('\nRESULTADO: todas as tabelas transferidas com contagem igual ou maior que a origem');
  } else {
    console.log('\nEnsaio concluído. Repita com --apply para gravar.');
  }
  legacy.close();
}

main()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
