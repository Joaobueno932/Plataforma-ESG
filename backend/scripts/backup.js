#!/usr/bin/env node
/**
 * Backup, restauração e verificação do banco — usados **antes** de aplicar migrações.
 *
 *   node scripts/backup.js create            → cópia consistente em storage/backups/
 *   node scripts/backup.js verify <arquivo>  → integrity_check + foreign_key_check + contagens
 *   node scripts/backup.js dry-run [arquivo] → aplica as migrações em CÓPIA isolada e compara
 *   node scripts/backup.js restore <arquivo> → restaura a cópia sobre o banco de trabalho
 *
 * `dry-run` é o passo obrigatório antes de migrar o banco de trabalho: nenhuma migração é
 * aplicada no banco original durante a verificação.
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../src/config');
const { migrate, pending } = require('../src/migrations');

const TABLES = [
  'companies', 'users', 'user_profiles', 'user_company_links', 'sectors', 'questions', 'answers',
  'reports', 'question_reports', 'company_files', 'question_report_files', 'evidences', 'leads',
  'cycle_professionals', 'cycle_rounds', 'item_answer_versions', 'sessions', 'audit_events',
];

const exists = (db, table) => !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);

function counts(db) {
  const out = {};
  for (const t of TABLES) if (exists(db, t)) out[t] = db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
  return out;
}

/** Cópia consistente: usa VACUUM INTO, que respeita o WAL em andamento. */
function create() {
  if (!fs.existsSync(config.dbFile)) throw new Error(`banco não encontrado: ${config.dbFile}`);
  fs.mkdirSync(config.backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(config.backupsDir, `esg-${stamp}.sqlite`);
  const db = new DatabaseSync(config.dbFile, { readOnly: true });
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const before = counts(db);
  db.close();
  console.log(`backup criado: ${target}`);
  console.log(`contagens: ${JSON.stringify(before)}`);
  return target;
}

function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const integrity = db.prepare('PRAGMA integrity_check').get();
  const orphans = db.prepare('PRAGMA foreign_key_check').all();
  const rows = counts(db);
  const migrations = exists(db, 'schema_migrations') ? db.prepare('SELECT id FROM schema_migrations ORDER BY id').all().map((r) => r.id) : [];
  db.close();
  const ok = Object.values(integrity)[0] === 'ok' && orphans.length === 0;
  console.log(`arquivo: ${file}`);
  console.log(`integrity_check: ${Object.values(integrity)[0]}`);
  console.log(`foreign_key_check: ${orphans.length ? JSON.stringify(orphans.slice(0, 5)) : 'ok'}`);
  console.log(`migrações aplicadas: ${migrations.join(', ') || '(nenhuma)'}`);
  console.log(`contagens: ${JSON.stringify(rows)}`);
  if (!ok) process.exitCode = 1;
  return { ok, rows, migrations };
}

/** Aplica as migrações numa cópia e compara as contagens com o original. */
function dryRun(source = config.dbFile) {
  fs.mkdirSync(config.backupsDir, { recursive: true });
  const copy = path.join(config.backupsDir, `dry-run-${Date.now()}.sqlite`);
  const origin = new DatabaseSync(source, { readOnly: true });
  origin.exec(`VACUUM INTO '${copy.replace(/'/g, "''")}'`);
  const before = counts(origin);
  const pendingIds = (() => {
    const probe = new DatabaseSync(copy);
    const list = pending(probe).map((m) => m.id);
    probe.close();
    return list;
  })();
  origin.close();

  const db = new DatabaseSync(copy);
  db.exec('PRAGMA foreign_keys = ON');
  const applied = migrate(db, { log: (l) => console.log(`  ${l}`) });
  const integrity = Object.values(db.prepare('PRAGMA integrity_check').get())[0];
  const orphans = db.prepare('PRAGMA foreign_key_check').all();
  const after = counts(db);
  db.close();

  const preserved = Object.entries(before).every(([table, n]) => after[table] >= n);
  console.log(`cópia: ${copy}`);
  console.log(`pendentes antes: ${pendingIds.join(', ') || '(nenhuma)'}`);
  console.log(`aplicadas: ${applied.join(', ') || '(nenhuma)'}`);
  console.log(`integrity_check: ${integrity} | foreign_key_check: ${orphans.length ? 'FALHOU' : 'ok'}`);
  console.log(`antes:  ${JSON.stringify(before)}`);
  console.log(`depois: ${JSON.stringify(after)}`);
  console.log(preserved && integrity === 'ok' && !orphans.length ? 'RESULTADO: dados preservados' : 'RESULTADO: VERIFICAR — houve perda ou inconsistência');
  if (!(preserved && integrity === 'ok' && !orphans.length)) process.exitCode = 1;
  return { copy, before, after, applied };
}

function restore(file) {
  if (!fs.existsSync(file)) throw new Error(`cópia não encontrada: ${file}`);
  const check = verify(file);
  if (!check.ok) throw new Error('a cópia não passou na verificação; restauração abortada');
  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${config.dbFile}${suffix}`;
    if (fs.existsSync(p)) fs.renameSync(p, `${p}.replaced-${Date.now()}`);
  }
  fs.copyFileSync(file, config.dbFile);
  console.log(`banco restaurado a partir de ${file}`);
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === 'create') create();
  else if (command === 'verify') verify(arg || config.dbFile);
  else if (command === 'dry-run') dryRun(arg || config.dbFile);
  else if (command === 'restore') restore(arg);
  else {
    console.log('uso: node scripts/backup.js create | verify <arquivo> | dry-run [arquivo] | restore <arquivo>');
    process.exitCode = 2;
  }
} catch (err) {
  console.error(`erro: ${err.message}`);
  process.exitCode = 1;
}
