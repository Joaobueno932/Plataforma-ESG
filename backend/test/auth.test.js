const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

test('módulo auth', async (t) => {
  const s = await startServer();
  t.after(s.close);

  await t.test('login devolve tokens e usuário sanitizado (formato do original)', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'admin@esgdemo.com.br', password: 'admin123' } });
    assert.equal(r.status, 201);
    assert.ok(r.body.access_token && r.body.refresh_token);
    assert.equal(r.body.sanitizedUser.role, 'ADMIN');
    assert.equal(r.body.sanitizedUser.password, undefined);
    assert.deepEqual(Object.keys(r.body.sanitizedUser).sort(), ['avatar', 'companyId', 'cpf', 'createdAt', 'deletedAt', 'email', 'id', 'jobTitle', 'name', 'role', 'updatedAt']);
  });

  await t.test('senha errada → 401 no formato NestJS', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'admin@esgdemo.com.br', password: 'x' } });
    assert.equal(r.status, 401);
    assert.deepEqual(Object.keys(r.body).sort(), ['error', 'message', 'statusCode']);
    assert.equal(r.body.error, 'Unauthorized');
  });

  await t.test('/auth/me exige token e nunca expõe hash de senha', async () => {
    assert.equal((await s.api('GET', '/auth/me')).status, 401);
    const token = await s.login('gestor@esgdemo.com.br');
    const me = await s.api('GET', '/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.password, undefined);
    assert.equal(me.body.company.section, 'A');
    assert.equal(me.body.company.report.status, 'Pending');
  });

  await t.test('refresh token gera novo access token; access token não serve como refresh', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'admin@esgdemo.com.br', password: 'admin123' } });
    const ok = await s.api('POST', '/auth/refresh', { token: r.body.refresh_token });
    assert.equal(ok.status, 201);
    assert.ok(ok.body.access_token);
    const bad = await s.api('POST', '/auth/refresh', { token: r.body.access_token });
    assert.equal(bad.status, 401);
  });

  await t.test('troca de senha pelo próprio usuário (Configurações)', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'consultor@esgdemo.com.br', password: '123456' } });
    const id = r.body.sanitizedUser.id;
    const p = await s.api('PATCH', `/users/${id}`, { token: r.body.access_token, body: { password: 'nova-senha' } });
    assert.equal(p.status, 200);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'consultor@esgdemo.com.br', password: 'nova-senha' } })).status, 201);
  });

  await t.test('esqueci a senha → token de redefinição → changePassword', async () => {
    const f = await s.api('POST', '/auth/forgotPassword/', { body: { email: 'funcionario@esgdemo.com.br' } });
    assert.equal(f.status, 201);
    const { signReset, loadUser } = require('../src/auth');
    const db = require('../src/db');
    const user = loadUser(db.one("SELECT id FROM users WHERE email = 'funcionario@esgdemo.com.br'").id);
    const c = await s.api('POST', '/auth/changePassword', { token: signReset(user), body: { newPassword: 'redefinida' } });
    assert.equal(c.status, 201);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'funcionario@esgdemo.com.br', password: 'redefinida' } })).status, 201);
  });
});
