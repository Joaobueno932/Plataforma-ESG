/**
 * Migrações do MySQL — versionadas, idempotentes e registradas em `schema_migrations`.
 *
 * O esquema nasce consolidado em `mysql/001_baseline.js` (estado equivalente às migrações
 * 001–010 do histórico SQLite). O histórico SQLite continua em `sqlite/`, com executor próprio
 * (`sqlite/index.js`), usado só para preparar a base herdada antes da transferência feita por
 * `scripts/sqlite-to-mysql.js`. A API em execução nunca aplica aquelas migrações.
 */
const MIGRATIONS = [require('./mysql/001_baseline'), require('./mysql/002_workflow'), require('./mysql/003_publication')];

/** Migrações do histórico SQLite (não executadas; mantidas para leitura e auditoria). */
const SQLITE_HISTORY = [
  '001_baseline',
  '002_identity',
  '003_company_registration',
  '004_cycles',
  '005_history_integrity',
  '006_indexes',
  '007_rounds',
  '008_catalog_versions',
  '009_scoring',
];

const TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  appliedAt VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function appliedIds(db) {
  await db.exec([TABLE]);
  const rows = await db.all('SELECT id FROM schema_migrations');
  return new Set(rows.map((row) => row.id));
}

async function pending(db) {
  const applied = await appliedIds(db);
  return MIGRATIONS.filter((migration) => !applied.has(migration.id));
}

async function migrate(db, { log = () => {} } = {}) {
  const applied = [];
  for (const migration of await pending(db)) {
    await migration.up(db);
    await db.run('INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)', migration.id, new Date().toISOString());
    applied.push(migration.id);
    log(`migração aplicada: ${migration.id}`);
  }
  return applied;
}

module.exports = { migrate, pending, MIGRATIONS, SQLITE_HISTORY };
