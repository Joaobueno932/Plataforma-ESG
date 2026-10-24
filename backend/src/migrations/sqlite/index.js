/**
 * Executor **congelado** das migrações SQLite da reconstrução anterior.
 *
 * A aplicação roda em MySQL (`src/migrations/mysql/001_baseline.js`). Este executor existe
 * apenas para preparar a base SQLite herdada antes da transferência: uma base parada em
 * qualquer ponto do histórico 001–009 é levada ao estado final e só então copiada por
 * `scripts/sqlite-to-mysql.js`. Nada aqui é usado em tempo de execução pela API.
 *
 * Migrações que reconstroem tabelas (SQLite não altera constraints com ALTER TABLE) declaram
 * `rebuildsTables: true`: a execução desliga `foreign_keys` durante a reconstrução e roda
 * `PRAGMA foreign_key_check` **antes** do COMMIT — se houver referência órfã, a migração é
 * desfeita por inteiro.
 */
const MIGRATIONS = [
  require('./001_baseline'),
  require('./002_identity'),
  require('./003_company_registration'),
  require('./004_cycles'),
  require('./005_history_integrity'),
  require('./006_indexes'),
  require('./007_rounds'),
  require('./008_catalog_versions'),
  require('./009_scoring'),
];

const hasTable = (db, name) =>
  !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);

const columns = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

const hasColumn = (db, table, column) => columns(db, table).includes(column);

function addColumn(db, table, column, definition) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** Reconstrói uma tabela preservando dados, ids e relacionamentos (SQLite doc 2.1 "Making Other Kinds Of Table Schema Changes"). */
function rebuild(db, table, createSql, { copy = null, indexes = [] } = {}) {
  const tmp = `${table}__new`;
  const cols = copy || columns(db, table).join(', ');
  db.exec(createSql.replace(new RegExp(`CREATE TABLE ${table}\\b`), `CREATE TABLE ${tmp}`));
  db.exec(`INSERT INTO ${tmp} (${cols}) SELECT ${cols} FROM ${table}`);
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${tmp} RENAME TO ${table}`);
  for (const sql of indexes) db.exec(sql);
}

function pending(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT id FROM schema_migrations').all().map((r) => r.id));
  return MIGRATIONS.filter((m) => !applied.has(m.id));
}

function migrate(db, { log = () => {} } = {}) {
  const applied = [];
  for (const migration of pending(db)) {
    const rebuilds = migration.rebuildsTables === true;
    if (rebuilds) db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      migration.up(db, { hasTable, hasColumn, columns, addColumn, rebuild });
      if (rebuilds) {
        const orphans = db.prepare('PRAGMA foreign_key_check').all();
        if (orphans.length) throw new Error(`referências órfãs após reconstrução: ${JSON.stringify(orphans.slice(0, 5))}`);
      }
      db.prepare('INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      db.exec('COMMIT');
      applied.push(migration.id);
      log(`migração SQLite aplicada: ${migration.id}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`migração ${migration.id} falhou e foi desfeita: ${err.message}`);
    } finally {
      if (rebuilds) db.exec('PRAGMA foreign_keys = ON');
    }
  }
  return applied;
}

module.exports = { migrate, pending, MIGRATIONS, helpers: { hasTable, hasColumn, columns, addColumn, rebuild } };
