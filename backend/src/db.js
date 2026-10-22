const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const { migrate, pending } = require('./migrations');

let instance = null;

/**
 * Abre o banco e aplica as migrações pendentes. O esquema não é mais declarado aqui:
 * ver `src/migrations/` (001_baseline guarda a base herdada).
 */
function open(file = config.dbFile, { log } = {}) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db, log ? { log } : undefined);
  return db;
}

function get() {
  if (!instance) instance = open();
  return instance;
}

/** Replace the shared connection (used by tests with an in-memory database). */
function use(db) {
  instance = db;
  return db;
}

function transaction(fn) {
  const db = get();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Convert node:sqlite null-prototype rows into plain objects. */
const plain = (row) => (row ? { ...row } : row);
const all = (sql, ...params) => get().prepare(sql).all(...params).map(plain);
const one = (sql, ...params) => plain(get().prepare(sql).get(...params));
const run = (sql, ...params) => get().prepare(sql).run(...params);

module.exports = { open, get, use, transaction, uuid, now, all, one, run, pendingMigrations: pending };
