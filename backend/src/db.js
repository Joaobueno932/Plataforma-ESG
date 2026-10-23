/**
 * Acesso ao banco — MySQL (mysql2), com pool de conexões.
 *
 * A API mantém os mesmos nomes de antes (`one`, `all`, `run`, `transaction`), agora
 * assíncronos. Transações usam `AsyncLocalStorage`: dentro de `db.transaction(...)`, qualquer
 * `db.one/all/run` executado na mesma cadeia de await usa **a conexão da transação**, sem
 * precisar passá-la de mão em mão.
 *
 * Valores sempre vão como parâmetros (`?`) — nenhuma interpolação de entrada em SQL.
 */
const crypto = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const mysql = require('mysql2/promise');
const config = require('./config');
const { migrate, pending } = require('./migrations');

const storage = new AsyncLocalStorage();
let pool = null;
let currentOptions = null;

const poolOptions = (overrides = {}) => ({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  connectionLimit: config.db.poolSize,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4_0900_ai_ci',
  dateStrings: true,
  // DECIMAL (e portanto SUM/AVG) chega como número, não como texto: a API devolve
  // `answeredQuestions: 0`, não `"0"`, e o cálculo de pontuação recebe número.
  decimalNumbers: true,
  multipleStatements: false,
  timezone: 'Z',
  ...overrides,
});

/** Cria (ou recria) o pool. Chamado na subida da API e nos testes. */
function configure(overrides = {}) {
  // O pool anterior é encerrado: conexões abertas (keep-alive) impediriam o processo de sair.
  if (pool) pool.end().catch(() => {});
  currentOptions = poolOptions(overrides);
  pool = mysql.createPool(currentOptions);
  return pool;
}

const get = () => pool || configure();

/** Conexão em uso: a da transação corrente, se houver; senão o pool. */
const connection = () => {
  const store = storage.getStore();
  return (store && store.conn) || get();
};

async function execute(sql, params) {
  const conn = connection();
  if (params && params.length) {
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
  const [rows] = await conn.query(sql);
  return rows;
}

/** Linhas da consulta. */
const all = async (sql, ...params) => {
  const rows = await execute(sql, params);
  return Array.isArray(rows) ? rows : [];
};

/** Primeira linha (ou `undefined`). */
const one = async (sql, ...params) => {
  const rows = await all(sql, ...params);
  return rows[0];
};

/** INSERT/UPDATE/DELETE. Devolve `{changes, insertId}`. */
const run = async (sql, ...params) => {
  const result = await execute(sql, params);
  return { changes: result.affectedRows ?? 0, insertId: result.insertId ?? null, info: result.info };
};

/** Executa DDL ou múltiplos comandos separados (um por vez, sem multipleStatements). */
async function exec(sqlOrList) {
  const statements = Array.isArray(sqlOrList)
    ? sqlOrList
    : String(sqlOrList)
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);
  const conn = connection();
  for (const statement of statements) await conn.query(statement);
}

/**
 * Transação. O callback recebe a conexão (útil para `FOR UPDATE`), mas o código interno pode
 * continuar usando `db.one/all/run` normalmente.
 */
async function transaction(fn) {
  const store = storage.getStore();
  if (store && store.conn) return fn(store.conn); // transação já aberta: participa dela
  const conn = await get().getConnection();
  try {
    await conn.beginTransaction();
    const result = await storage.run({ conn }, () => fn(conn));
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* conexão possivelmente perdida: o rollback implícito do servidor resolve */
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** Bloqueia uma linha para leitura-e-escrita dentro de uma transação (controle de concorrência). */
async function forUpdate(table, id) {
  const store = storage.getStore();
  if (!store || !store.conn) throw new Error('forUpdate exige uma transação aberta');
  const [rows] = await store.conn.execute(`SELECT * FROM ${table} WHERE id = ? FOR UPDATE`, [id]);
  return rows[0];
}

/** Sobe o banco: cria o pool e aplica as migrações pendentes. */
async function init({ runMigrations = true, log = () => {}, overrides = {} } = {}) {
  configure(overrides);
  await one('SELECT 1 AS ok');
  if (runMigrations) return migrate({ all, one, run, exec, transaction }, { log });
  return [];
}

async function close() {
  if (pool) await pool.end();
  pool = null;
}

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/**
 * Apaga o conteúdo das tabelas preservando o esquema (usado pelos testes e pela transferência).
 * `schema_migrations` fica de fora: o registro do que já foi aplicado é parte do esquema, não
 * dado de trabalho — limpá-lo faria o banco parecer não migrado.
 */
const PRESERVED_TABLES = new Set(['schema_migrations']);

async function truncateAll() {
  const rows = (
    await all("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'")
  ).filter((row) => !PRESERVED_TABLES.has(row.name));
  if (!rows.length) return 0;
  await exec('SET FOREIGN_KEY_CHECKS = 0');
  for (const row of rows) await exec(`TRUNCATE TABLE \`${row.name}\``);
  await exec('SET FOREIGN_KEY_CHECKS = 1');
  return rows.length;
}

module.exports = {
  configure,
  init,
  close,
  get,
  connection,
  all,
  one,
  run,
  exec,
  transaction,
  forUpdate,
  truncateAll,
  uuid,
  now,
  pendingMigrations: () => pending({ all, one, run, exec }),
  /** Somente para diagnóstico: driver em uso. */
  driver: 'mysql',
};
