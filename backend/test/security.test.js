const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');
const limiter = require('../src/ratelimit');

/** Verificações de segurança da revisão de homologação (Prompt 8, item 6). */
test('segurança: cabeçalhos, limite de tentativas e entradas', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);

  await t.test('cabeçalhos de segurança em toda resposta', async () => {
    const res = await fetch(`${s.base}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  await t.test('X-Forwarded-For forjado não escapa do limite de login', async () => {
    const statuses = [];
    for (let i = 0; i < 520; i += 1) {
      const res = await fetch(`${s.base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.${Math.floor(i / 250)}.${i % 250}` },
        body: JSON.stringify({ email: 'alvo@esgdemo.com.br', password: 'errada' }),
      });
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.equal(statuses.at(-1), 429, 'o cabeçalho do cliente não muda o IP considerado');
  });

  await t.test('janelas vencidas são limpas (memória não cresce sem limite)', () => {
    const before = limiter._buckets.size;
    assert.ok(before > 0);
    assert.ok(limiter.sweep(Date.now() + 24 * 60 * 60 * 1000) >= before);
    assert.equal(limiter._buckets.size, 0);
  });

  await t.test('entradas maliciosas são tratadas como dado', async () => {
    const admin = await s.loginAdmin();
    const injection = await s.api('GET', `/companies?bussinessName=${encodeURIComponent("' OR 'x'='x")}`, { token: admin });
    assert.equal(injection.status, 200);
    assert.equal(injection.body.data.length, 0);
    const xss = await s.api('PATCH', '/companies/demo-company-a', { token: admin, body: { bussinessName: '<script>alert(1)</script>' } });
    assert.equal(xss.status, 200);
    assert.equal(xss.body.bussinessName, '<script>alert(1)</script>', 'guardado como texto; a interface escapa ao exibir');
    assert.equal((await s.api('GET', '/uploads/companyFiles/demo-company-a/..%2F..%2F.env', { token: admin })).status, 404, 'sem travessia de diretório');
    const big = await fetch(`${s.base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x'.repeat(3 * 1024 * 1024) }) });
    assert.equal(big.status, 413, 'corpo JSON acima do limite é recusado');
  });
});
