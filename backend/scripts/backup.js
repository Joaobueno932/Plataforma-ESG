#!/usr/bin/env node
/**
 * Backup, verificação, ensaio de migração e restauração — MySQL.
 *
 *   npm run db:backup                     → dump em storage/backups/
 *   npm run db:verify -- <arquivo.sql>    → confere o dump e as contagens do banco atual
 *   npm run db:dry-run                    → restaura o dump em uma base de ensaio e migra lá
 *   npm run db:restore -- <arquivo.sql>   → restaura no banco de trabalho (exige --confirm)
 *
 * O `mysqldump`/`mysql` é executado dentro do container quando ele existe (padrão no ambiente
 * local), ou no binário local quando `MYSQL_CLIENT=local`. Nenhuma senha aparece na linha de
 * comando: ela vai por variável de ambiente do processo filho (MYSQL_PWD).
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../src/config');
const db = require('../src/db');
const { migrate } = require('../src/migrations');

const CONTAINER = process.env.MYSQL_CONTAINER || 'esg-mysql';
const useContainer = (process.env.MYSQL_CLIENT || 'container') === 'container';

const TABLES = [
  'companies', 'users', 'user_profiles', 'user_company_links', 'sectors', 'catalog_versions',
  'catalog_imports', 'catalog_sections', 'questions', 'answers', 'reports', 'cycle_professionals',
  'cycle_rounds', 'question_reports', 'item_answer_versions', 'item_reviews', 'item_comments',
  'company_files', 'question_report_files', 'evidences', 'na_requests', 'na_request_files',
  'cycle_results', 'cycle_result_axes', 'pendings', 'pending_events', 'publications', 'leads', 'sessions', 'audit_events',
];

/** Executa um cliente mysql (dump ou restore) sem expor a senha nos argumentos. */
function runClient(tool, args, { input = null, output = null } = {}) {
  const env = { ...process.env, MYSQL_PWD: config.db.password };
  const base = useContainer
    ? ['docker', ['exec', '-i', '-e', `MYSQL_PWD=${config.db.password}`, CONTAINER, tool, '-h', '127.0.0.1', '-u', config.db.user, ...args]]
    : [tool, ['-h', config.db.host, '-P', String(config.db.port), '-u', config.db.user, ...args]];
  const [command, commandArgs] = base;
  const result = spawnSync(command, commandArgs, {
    env,
    input: input ?? undefined,
    maxBuffer: 512 * 1024 * 1024,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) throw new Error(`não foi possível executar ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${tool} falhou: ${(result.stderr || '').trim().slice(0, 500)}`);
  if (output) fs.writeFileSync(output, result.stdout);
  return result.stdout;
}

async function counts(database = config.db.name) {
  const rows = await db.all(
    `SELECT table_name AS name, table_rows AS approx FROM information_schema.tables WHERE table_schema = ?`,
    database,
  );
  const out = {};
  for (const row of rows) {
    const { n } = await db.one(`SELECT count(*) AS n FROM \`${database}\`.\`${row.name}\``);
    if (n > 0) out[row.name] = Number(n);
  }
  return out;
}

async function create() {
  fs.mkdirSync(config.backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(config.backupsDir, `esg-${stamp}.sql`);
  runClient('mysqldump', ['--single-transaction', '--routines', '--events', '--add-drop-table', config.db.name], { output: target });
  const size = fs.statSync(target).size;
  console.log(`backup criado: ${target} (${(size / 1024).toFixed(1)} KiB)`);
  console.log(`contagens: ${JSON.stringify(await counts())}`);
  return target;
}

/** Dump mais recente em storage/backups (padrão de `verify` sem argumento). */
function latestDump() {
  if (!fs.existsSync(config.backupsDir)) return null;
  const files = fs.readdirSync(config.backupsDir).filter((f) => f.endsWith('.sql')).sort();
  return files.length ? path.join(config.backupsDir, files[files.length - 1]) : null;
}

async function verify(file = latestDump()) {
  if (!file || !fs.existsSync(file)) throw new Error(`informe um arquivo de dump existente (recebido: ${file || 'nada'})`);
  const text = fs.readFileSync(file, 'utf8');
  const tables = [...text.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]);
  const inserts = (text.match(/INSERT INTO/g) || []).length;
  console.log(`arquivo: ${file}`);
  console.log(`tabelas no dump: ${tables.length} (${tables.slice(0, 8).join(', ')}${tables.length > 8 ? '…' : ''})`);
  console.log(`comandos INSERT: ${inserts}`);
  const migrations = await db.all('SELECT id FROM schema_migrations ORDER BY id');
  console.log(`migrações aplicadas no banco atual: ${migrations.map((m) => m.id).join(', ') || '(nenhuma)'}`);
  console.log(`contagens do banco atual: ${JSON.stringify(await counts())}`);
  const ok = tables.length > 0;
  if (!ok) process.exitCode = 1;
  return ok;
}

/** Restaura o dump em uma base de ensaio e aplica as migrações lá, sem tocar no banco de trabalho. */
async function dryRun(file) {
  const dump = file && fs.existsSync(file) ? file : await create();
  const scratch = `${config.db.name}_dryrun`;
  const before = await counts();

  runClient('mysql', ['-e', `DROP DATABASE IF EXISTS \`${scratch}\`; CREATE DATABASE \`${scratch}\` CHARACTER SET utf8mb4;`]);
  runClient('mysql', [scratch], { input: fs.readFileSync(dump, 'utf8') });

  // Migra a cópia com um pool próprio apontado para a base de ensaio.
  db.configure({ database: scratch });
  const applied = await migrate(db, { log: (line) => console.log(`  ${line}`) });
  const after = await counts(scratch);
  const orphans = await db.all(
    `SELECT table_name AS t, constraint_name AS c FROM information_schema.referential_constraints WHERE constraint_schema = ?`,
    scratch,
  );
  db.configure();

  const preserved = Object.entries(before).every(([table, n]) => (after[table] || 0) >= n);
  console.log(`base de ensaio: ${scratch}`);
  console.log(`dump usado: ${dump}`);
  console.log(`migrações aplicadas na cópia: ${applied.join(', ') || '(nenhuma pendente)'}`);
  console.log(`chaves estrangeiras na cópia: ${orphans.length}`);
  console.log(`antes:  ${JSON.stringify(before)}`);
  console.log(`depois: ${JSON.stringify(after)}`);
  console.log(preserved ? 'RESULTADO: dados preservados' : 'RESULTADO: VERIFICAR — houve perda');
  if (!preserved) process.exitCode = 1;
  return preserved;
}

async function restore(file) {
  if (!process.argv.includes('--confirm'))
    throw new Error('restauração sobrescreve o banco de trabalho; repita o comando com --confirm');
  if (!file || !fs.existsSync(file)) throw new Error('informe o arquivo de dump');
  await verify(file);
  runClient('mysql', [config.db.name], { input: fs.readFileSync(file, 'utf8') });
  console.log(`banco restaurado a partir de ${file}`);
  console.log(`contagens: ${JSON.stringify(await counts())}`);
}

async function main() {
  const [command, arg] = process.argv.slice(2).filter((value) => !value.startsWith('--'));
  await db.init({ runMigrations: false });
  if (command === 'create') await create();
  else if (command === 'verify') await verify(arg);
  else if (command === 'dry-run') await dryRun(arg);
  else if (command === 'restore') await restore(arg);
  else {
    console.log('uso: create | verify <arquivo.sql> | dry-run [arquivo.sql] | restore <arquivo.sql> --confirm');
    process.exitCode = 2;
  }
}

main()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
