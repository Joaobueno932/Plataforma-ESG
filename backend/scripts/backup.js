#!/usr/bin/env node
/**
 * Backup, verificação, ensaio de restauração e restauração — banco **e arquivos vinculados**.
 *
 *   npm run db:backup                          → storage/backups/esg-<data>/ (dump + arquivos + manifesto)
 *   npm run db:verify   [-- <pasta>]           → confere hashes e se todo arquivo citado no banco está no backup
 *   npm run db:dry-run  [-- <pasta>]           → restaura banco e arquivos em área de ensaio e compara
 *   npm run db:restore  -- <pasta> --confirm   → restaura no banco e no armazenamento de trabalho
 *
 * Arquivos incluídos: evidências e documentos da empresa (`uploads/`) e documentos publicados
 * (`publications/`). O manifesto guarda tamanho e SHA-256 de cada arquivo e do dump.
 *
 * Cliente MySQL: no container `esg-mysql` quando o banco é o do compose (porta 3307) ou com
 * `MYSQL_CLIENT=container`; caso contrário, o binário local (`MYSQL_BIN_DIR` ou PATH). A senha
 * nunca vai na linha de comando: vai pela variável de ambiente MYSQL_PWD do processo filho.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../src/config');
const db = require('../src/db');
const { migrate } = require('../src/migrations');

const CONTAINER = process.env.MYSQL_CONTAINER || 'esg-mysql';
const useContainer = process.env.MYSQL_CLIENT ? process.env.MYSQL_CLIENT === 'container' : Number(config.db.port) === 3307;
const binary = (tool) => (process.env.MYSQL_BIN_DIR ? path.join(process.env.MYSQL_BIN_DIR, tool) : tool);

/** Áreas de arquivo do backup: nome → pasta de trabalho. */
const AREAS = { uploads: () => config.uploadsDir, publications: () => path.join(config.storageDir, 'publications') };

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function runClient(tool, args, { input = null, output = null } = {}) {
  const env = { ...process.env, MYSQL_PWD: config.db.password };
  const [command, commandArgs] = useContainer
    ? ['docker', ['exec', '-i', '-e', `MYSQL_PWD=${config.db.password}`, CONTAINER, tool, '-h', '127.0.0.1', '-u', config.db.user, ...args]]
    : [binary(tool), ['-h', config.db.host, '-P', String(config.db.port), '-u', config.db.user, ...args]];
  const result = spawnSync(command, commandArgs, { env, input: input ?? undefined, maxBuffer: 1024 * 1024 * 1024, encoding: 'utf8', shell: false });
  if (result.error) throw new Error(`não foi possível executar ${command}: ${result.error.message} (defina MYSQL_BIN_DIR se o cliente não estiver no PATH)`);
  if (result.status !== 0) throw new Error(`${tool} falhou: ${(result.stderr || '').trim().slice(0, 500)}`);
  if (output) fs.writeFileSync(output, result.stdout);
  return result.stdout;
}

async function counts(database = config.db.name) {
  const rows = await db.all("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'", database);
  const out = {};
  for (const row of rows) {
    const { n } = await db.one(`SELECT count(*) AS n FROM \`${database}\`.\`${row.name}\``);
    if (Number(n) > 0) out[row.name] = Number(n);
  }
  return out;
}

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (!entry.name.endsWith('.part')) out.push(path.relative(base, full));
  }
  return out;
}

/** Arquivos que o banco diz existir: uploads (company_files.url) e publicações (reportPath). */
async function referencedFiles(database = config.db.name) {
  const refs = [];
  for (const row of await db.all(`SELECT url FROM \`${database}\`.company_files`)) refs.push({ area: 'uploads', path: row.url.replace(/^uploads\//, '') });
  const hasPublications = await db.one("SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = ? AND table_name = 'publications'", database);
  if (hasPublications)
    for (const row of await db.all(`SELECT reportPath FROM \`${database}\`.publications WHERE reportPath IS NOT NULL`))
      refs.push({ area: 'publications', path: row.reportPath.replace(/^publications[\\/]/, '') });
  return refs.map((r) => ({ ...r, path: r.path.split(/[\\/]/).join(path.sep) }));
}

async function create() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(config.backupsDir, `esg-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  const dump = path.join(dir, 'database.sql');
  runClient('mysqldump', ['--single-transaction', '--routines', '--events', '--add-drop-table', '--hex-blob', config.db.name], { output: dump });

  const files = [];
  for (const [area, source] of Object.entries(AREAS)) {
    for (const rel of walk(source())) {
      const target = path.join(dir, 'files', area, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(source(), rel), target);
      files.push({ area, path: rel, bytes: fs.statSync(target).size, sha256: sha256(target) });
    }
  }
  const manifest = {
    format: 'esg-backup-v2',
    createdAt: new Date().toISOString(),
    database: { name: config.db.name, file: 'database.sql', bytes: fs.statSync(dump).size, sha256: sha256(dump), counts: await counts() },
    files,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`backup criado: ${dir}`);
  console.log(`banco: ${(manifest.database.bytes / 1024).toFixed(1)} KiB · arquivos: ${files.length}`);
  console.log(`contagens: ${JSON.stringify(manifest.database.counts)}`);
  return dir;
}

function latestBackup() {
  if (!fs.existsSync(config.backupsDir)) return null;
  const dirs = fs
    .readdirSync(config.backupsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(config.backupsDir, e.name, 'manifest.json')))
    .map((e) => e.name)
    .sort();
  return dirs.length ? path.join(config.backupsDir, dirs[dirs.length - 1]) : null;
}

function readManifest(dir) {
  const file = path.join(dir || '', 'manifest.json');
  if (!dir || !fs.existsSync(file)) throw new Error(`informe uma pasta de backup com manifest.json (recebido: ${dir || 'nada'})`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Confere integridade do backup e se ele cobre todos os arquivos citados pelo banco atual. */
async function verify(dir = latestBackup(), { database = config.db.name, log = console.log } = {}) {
  const manifest = readManifest(dir);
  const problems = [];
  const dump = path.join(dir, manifest.database.file);
  if (!fs.existsSync(dump) || sha256(dump) !== manifest.database.sha256) problems.push('dump ausente ou alterado');
  for (const f of manifest.files) {
    const file = path.join(dir, 'files', f.area, f.path);
    if (!fs.existsSync(file)) problems.push(`arquivo ausente no backup: ${f.area}/${f.path}`);
    else if (sha256(file) !== f.sha256) problems.push(`arquivo alterado no backup: ${f.area}/${f.path}`);
  }
  const listed = new Set(manifest.files.map((f) => `${f.area}|${f.path}`));
  const refs = await referencedFiles(database);
  const missing = refs.filter((r) => !listed.has(`${r.area}|${r.path}`));
  for (const m of missing) problems.push(`citado no banco e fora do backup: ${m.area}/${m.path}`);
  log(`backup: ${dir}`);
  log(`dump: ${(manifest.database.bytes / 1024).toFixed(1)} KiB · arquivos: ${manifest.files.length} · referências no banco: ${refs.length}`);
  log(problems.length ? `PROBLEMAS (${problems.length}):\n  ${problems.slice(0, 20).join('\n  ')}` : 'RESULTADO: backup íntegro e completo');
  if (problems.length) process.exitCode = 1;
  return { ok: !problems.length, problems, manifest };
}

/** Restaura banco e arquivos em área de ensaio (base `<nome>_dryrun` e pasta temporária). */
async function dryRun(dirArg) {
  const dir = dirArg && fs.existsSync(dirArg) ? dirArg : await create();
  const manifest = readManifest(dir);
  const scratch = `${config.db.name}_dryrun`;
  runClient('mysql', ['-e', `DROP DATABASE IF EXISTS \`${scratch}\`; CREATE DATABASE \`${scratch}\` CHARACTER SET utf8mb4;`]);
  runClient('mysql', [scratch], { input: fs.readFileSync(path.join(dir, manifest.database.file), 'utf8') });

  // Arquivos restaurados em pasta temporária e conferidos por hash.
  const fileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'esg-restore-'));
  let fileErrors = 0;
  for (const f of manifest.files) {
    const target = path.join(fileRoot, f.area, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(dir, 'files', f.area, f.path), target);
    if (sha256(target) !== f.sha256) fileErrors += 1;
  }

  db.configure({ database: scratch });
  const applied = await migrate(db, { log: (line) => console.log(`  ${line}`) });
  const after = await counts(scratch);
  const refs = await referencedFiles(scratch);
  const unresolved = refs.filter((r) => !fs.existsSync(path.join(fileRoot, r.area, r.path)));
  const fks = await db.all('SELECT constraint_name FROM information_schema.referential_constraints WHERE constraint_schema = ?', scratch);
  db.configure();

  const before = manifest.database.counts;
  const preserved = Object.entries(before).every(([table, n]) => (after[table] || 0) >= n);
  const ok = preserved && !fileErrors && !unresolved.length;
  console.log(`base de ensaio: ${scratch} · arquivos restaurados em ${fileRoot}`);
  console.log(`migrações aplicadas na cópia: ${applied.join(', ') || '(nenhuma pendente)'} · chaves estrangeiras: ${fks.length}`);
  console.log(`antes:  ${JSON.stringify(before)}`);
  console.log(`depois: ${JSON.stringify(after)}`);
  console.log(`arquivos: ${manifest.files.length} restaurados · ${fileErrors} com hash divergente · ${unresolved.length} referência(s) sem arquivo`);
  console.log(ok ? 'RESULTADO: banco, arquivos e vínculos preservados' : 'RESULTADO: VERIFICAR — houve perda');
  if (!ok) process.exitCode = 1;
  fs.rmSync(fileRoot, { recursive: true, force: true });
  return ok;
}

async function restore(dir) {
  if (!process.argv.includes('--confirm')) throw new Error('restauração sobrescreve banco e arquivos de trabalho; repita o comando com --confirm');
  const manifest = readManifest(dir);
  const check = await verify(dir, { log: () => {} });
  if (check.problems.some((p) => !p.startsWith('citado no banco'))) throw new Error(`backup inconsistente: ${check.problems[0]}`);
  runClient('mysql', [config.db.name], { input: fs.readFileSync(path.join(dir, manifest.database.file), 'utf8') });
  for (const f of manifest.files) {
    const target = path.join(AREAS[f.area](), f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(dir, 'files', f.area, f.path), target);
  }
  console.log(`restaurado a partir de ${dir}: banco + ${manifest.files.length} arquivo(s)`);
  console.log(`contagens: ${JSON.stringify(await counts())}`);
}

async function main() {
  const [command, arg] = process.argv.slice(2).filter((value) => !value.startsWith('--'));
  await db.init({ runMigrations: false });
  if (command === 'create') await create();
  else if (command === 'verify') await verify(arg || latestBackup());
  else if (command === 'dry-run') await dryRun(arg);
  else if (command === 'restore') await restore(arg);
  else {
    console.log('uso: create | verify [pasta] | dry-run [pasta] | restore <pasta> --confirm');
    process.exitCode = 2;
  }
}

if (require.main === module)
  main()
    .catch((err) => {
      console.error(`erro: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => db.close());

module.exports = { create, verify, dryRun, restore, referencedFiles };
