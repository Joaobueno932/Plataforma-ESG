const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, shutdown, DEMO_PASSWORD, ADMIN_PASSWORD, tmp } = require('./helpers');

/** Último link de recuperação gravado no outbox (envio real de e-mail não configurado). */
function lastResetToken() {
  const log = fs.readFileSync(path.join(tmp, 'mail-outbox.log'), 'utf8').trim().split('\n');
  return log[log.length - 1].match(/token=([a-f0-9]+)/)[1];
}

test('módulo auth e sessões', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);

  await t.test('login devolve tokens, perfis concedidos e vínculos vigentes', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'admin@esgdemo.com.br', password: ADMIN_PASSWORD } });
    assert.equal(r.status, 201);
    assert.ok(r.body.access_token && r.body.refresh_token);
    assert.equal(r.body.sanitizedUser.role, 'ADMIN');
    assert.deepEqual(r.body.sanitizedUser.roles, ['ADMIN']);
    assert.deepEqual(r.body.sanitizedUser.links, []);
    assert.equal(r.body.sanitizedUser.password, undefined);
    assert.equal(r.body.sanitizedUser.status, 'ACTIVE');
  });

  await t.test('senha errada → 401 no formato NestJS, sem revelar o cadastro', async () => {
    const r = await s.api('POST', '/auth/login', { body: { email: 'admin@esgdemo.com.br', password: 'x' } });
    assert.equal(r.status, 401);
    assert.deepEqual(Object.keys(r.body).sort(), ['error', 'message', 'statusCode']);
    assert.equal(r.body.message, 'e-mail ou senha inválidos');
    const inexistente = await s.api('POST', '/auth/login', { body: { email: 'ninguem@esgdemo.com.br', password: 'x' } });
    assert.equal(inexistente.body.message, 'e-mail ou senha inválidos');
  });

  await t.test('/auth/me exige token e nunca expõe hash de senha', async () => {
    assert.equal((await s.api('GET', '/auth/me')).status, 401);
    const token = await s.login('gestor@esgdemo.com.br');
    const me = await s.api('GET', '/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.password, undefined);
    assert.equal(me.body.company.section, 'A');
    assert.equal(me.body.company.report.status, 'Pending');
    assert.equal(me.body.company.report.cycle, 1);
    assert.deepEqual(me.body.roles, ['MANAGER']);
  });

  await t.test('refresh usa a sessão; access token não serve como refresh', async () => {
    const r = await s.session('admin@esgdemo.com.br', ADMIN_PASSWORD);
    const ok = await s.api('POST', '/auth/refresh', { token: r.refresh });
    assert.equal(ok.status, 201);
    assert.ok(ok.body.access_token);
    assert.equal((await s.api('POST', '/auth/refresh', { token: r.token })).status, 401);
  });

  await t.test('logout revoga a sessão: token e refresh deixam de valer', async () => {
    const r = await s.session('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', '/auth/me', { token: r.token })).status, 200);
    assert.equal((await s.api('POST', '/auth/logout', { token: r.token })).status, 200);
    const after = await s.api('GET', '/auth/me', { token: r.token });
    assert.equal(after.status, 401);
    assert.equal(after.body.message, 'sessão encerrada ou revogada');
    assert.equal((await s.api('POST', '/auth/refresh', { token: r.refresh })).status, 401);
  });

  await t.test('troca de senha pelo próprio usuário exige a senha atual', async () => {
    const r = await s.session('consultor@esgdemo.com.br');
    const semAtual = await s.api('PATCH', `/users/${r.user.id}`, { token: r.token, body: { password: 'nova-senha-1' } });
    assert.equal(semAtual.status, 400);
    const curta = await s.api('PATCH', `/users/${r.user.id}`, { token: r.token, body: { password: 'curta', currentPassword: DEMO_PASSWORD } });
    assert.equal(curta.status, 400);
    const ok = await s.api('PATCH', `/users/${r.user.id}`, { token: r.token, body: { password: 'nova-senha-1', currentPassword: DEMO_PASSWORD } });
    assert.equal(ok.status, 200);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'consultor@esgdemo.com.br', password: 'nova-senha-1' } })).status, 201);
    // A troca de senha encerra as sessões anteriores.
    assert.equal((await s.api('GET', '/auth/me', { token: r.token })).status, 401);
  });

  await t.test('recuperação de senha: link de uso único, reutilização recusada', async () => {
    const f = await s.api('POST', '/auth/forgotPassword/', { body: { email: 'funcionario@esgdemo.com.br' } });
    assert.equal(f.status, 201);
    assert.equal(f.body.delivery, 'outbox-file');
    const token = lastResetToken();
    const ok = await s.api('POST', '/auth/changePassword', { token, body: { newPassword: 'redefinida-1' } });
    assert.equal(ok.status, 201);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'funcionario@esgdemo.com.br', password: 'redefinida-1' } })).status, 201);
    const reuse = await s.api('POST', '/auth/changePassword', { token, body: { newPassword: 'outra-senha-1' } });
    assert.equal(reuse.status, 401);
    assert.match(reuse.body.message, /já utilizado/);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'funcionario@esgdemo.com.br', password: 'outra-senha-1' } })).status, 401);
  });

  await t.test('e-mail inexistente responde igual e não gera link', async () => {
    const before = fs.readFileSync(path.join(tmp, 'mail-outbox.log'), 'utf8').length;
    const r = await s.api('POST', '/auth/forgotPassword/', { body: { email: 'nao-existe@esgdemo.com.br' } });
    assert.equal(r.status, 201);
    assert.equal(fs.readFileSync(path.join(tmp, 'mail-outbox.log'), 'utf8').length, before);
  });

  await t.test('/health informa o ambiente e que o envio de e-mail não está configurado', async () => {
    const r = await s.api('GET', '/health');
    assert.equal(r.body.status, 'ok');
    assert.equal(r.body.env, 'test');
    assert.match(r.body.mailDelivery, /not-configured/);
  });
});
