const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

// Isola banco e uploads de cada execução de teste.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esg-test-'));
process.env.DB_FILE = ':memory:';
process.env.UPLOADS_DIR = path.join(tmp, 'uploads');
process.env.STORAGE_DIR = tmp;
process.env.STATIC_DIR = path.join(tmp, 'static');

const db = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

async function startServer() {
  db.use(db.open(':memory:'));
  seed();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
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
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  }

  async function login(email, password = '123456') {
    const r = await api('POST', '/auth/login', { body: { email, password } });
    if (r.status !== 201) throw new Error(`login falhou para ${email}: ${JSON.stringify(r.body)}`);
    return r.body.access_token;
  }

  return { server, api, login, close: () => new Promise((r) => server.close(r)) };
}

module.exports = { startServer };
