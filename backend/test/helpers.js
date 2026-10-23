const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

// Isola armazenamento de arquivos de cada execução de teste.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esg-test-'));
process.env.NODE_ENV = 'test';
process.env.UPLOADS_DIR = path.join(tmp, 'uploads');
process.env.STORAGE_DIR = tmp;
process.env.STATIC_DIR = path.join(tmp, 'static');
process.env.BACKUPS_DIR = path.join(tmp, 'backups');
// Limite alto: os testes fazem muitos logins em sequência.
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '500';

const config = require('../src/config');
const db = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

/** Senhas do seed de demonstração. */
const DEMO_PASSWORD = 'esgdemo123';
const ADMIN_PASSWORD = 'admin123';

let initialized = false;

/**
 * Os testes rodam no MySQL, na **base de testes** (`plataforma_esg_test`), que é limpa a cada
 * `startServer()`. Sem o banco no ar, a falha é explícita — nenhum teste é silenciosamente
 * ignorado.
 */
async function ensureDatabase() {
  if (initialized) return;
  try {
    await db.init({ runMigrations: true });
  } catch (err) {
    throw new Error(
      `não foi possível conectar ao MySQL de teste (${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}): ` +
        `${err.code || err.message}. Suba o banco com "docker compose up -d mysql" na raiz do projeto.`,
    );
  }
  initialized = true;
}

async function startServer() {
  await ensureDatabase();
  await db.truncateAll();
  await seed();

  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, url, { token, body, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + url, { method, headers, body: payload });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }

  async function session(email, password = DEMO_PASSWORD) {
    const r = await api('POST', '/auth/login', { body: { email, password } });
    if (r.status !== 201) throw new Error(`login falhou para ${email}: ${JSON.stringify(r.body)}`);
    return { token: r.body.access_token, refresh: r.body.refresh_token, user: r.body.sanitizedUser };
  }

  const login = async (email, password = DEMO_PASSWORD) => (await session(email, password)).token;
  const loginAdmin = () => login('admin@esgdemo.com.br', ADMIN_PASSWORD);

  const userId = async (email) => (await db.one('SELECT id FROM users WHERE lower(email) = lower(?)', email)).id;
  const reportIdOf = async (companyId, cycle = null) =>
    (
      await db.one(
        cycle
          ? 'SELECT id FROM reports WHERE companyId = ? AND cycle = ?'
          : 'SELECT id FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1',
        ...(cycle ? [companyId, cycle] : [companyId]),
      )
    ).id;

  return {
    server,
    api,
    login,
    loginAdmin,
    session,
    db,
    userId,
    reportIdOf,
    base,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Encerra o pool ao fim da suíte (evita processo pendurado). */
async function shutdown() {
  if (initialized) await db.close();
  initialized = false;
}

module.exports = { startServer, shutdown, DEMO_PASSWORD, ADMIN_PASSWORD, tmp };
