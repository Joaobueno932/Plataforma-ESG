const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, DEMO_PASSWORD } = require('./helpers');

test('módulo pessoas, perfis e vínculos', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.loginAdmin();

  await t.test('listagem paginada sem hash de senha, com perfis e vínculos', async () => {
    const r = await s.api('GET', '/users?page=1', { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 5);
    assert.equal(r.body.numberOfPages, 2);
    assert.match(r.body.nextPage, /\/users\/\?page=2&perPage=5$/);
    assert.ok(r.body.data.every((u) => u.password === undefined));
    assert.ok(r.body.data.every((u) => Array.isArray(u.roles) && Array.isArray(u.links)));
  });

  let created;
  await t.test('cadastro: empresa obrigatória para perfis com vínculo, ADMIN sem empresa', async () => {
    const semEmpresa = await s.api('POST', '/users', { token: admin, body: { name: 'X', email: 'x@x.com', password: 'senha-123', role: 'EMPLOYEE' } });
    assert.equal(semEmpresa.status, 400);
    const senhaCurta = await s.api('POST', '/users', { token: admin, body: { name: 'X', email: 'x@x.com', password: '1234', role: 'ADMIN' } });
    assert.equal(senhaCurta.status, 400);

    const adm = await s.api('POST', '/users', { token: admin, body: { name: 'Outro Admin', email: 'outro@x.com', password: 'senha-123', role: 'ADMIN' } });
    assert.equal(adm.status, 201);
    assert.equal(adm.body.companyId, null);
    assert.deepEqual(adm.body.roles, ['ADMIN']);

    const emp = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Novo Funcionário', email: ' NOVO@x.com ', password: 'senha-123', cpf: '123.456.789-09', role: 'EMPLOYEE', companyId: 'demo-company-b' },
    });
    assert.equal(emp.status, 201);
    assert.equal(emp.body.email, 'novo@x.com'); // normalizado
    assert.equal(emp.body.cpf, '12345678909');
    assert.equal(emp.body.links.length, 1);
    assert.equal(emp.body.links[0].companyId, 'demo-company-b');
    created = emp.body;

    const dup = await s.api('POST', '/users', { token: admin, body: { name: 'Y', email: 'Novo@X.com', password: 'senha-123', role: 'ADMIN' } });
    assert.equal(dup.status, 409);
  });

  await t.test('cargo não é exigido de consultor, auditor e supervisor', async () => {
    const r = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Auditor Sem Cargo', email: 'auditor2@x.com', password: 'senha-123', roles: ['AUDITOR'], companyIds: ['demo-company-a', 'demo-company-b'] },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.jobTitle, null);
    assert.equal(r.body.links.length, 2, 'profissional pode ter várias empresas autorizadas');
  });

  await t.test('usuário da empresa tem uma única empresa no escopo inicial', async () => {
    const r = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Dois Vínculos', email: 'dois@x.com', password: 'senha-123', roles: ['MANAGER'], companyIds: ['demo-company-a', 'demo-company-b'] },
    });
    assert.equal(r.status, 400);
    const link = await s.api('POST', `/users/${created.id}/links`, { token: admin, body: { companyId: 'demo-company-a', role: 'EMPLOYEE' } });
    assert.equal(link.status, 409);
    assert.match(link.body.message, /única empresa no escopo inicial/);
  });

  await t.test('acúmulo de perfis: só ADMIN + CONSULTOR', async () => {
    const proibido = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Auditor Supervisor', email: 'as@x.com', password: 'senha-123', roles: ['AUDITOR', 'SUPERVISOR'], companyIds: ['demo-company-a'] },
    });
    assert.equal(proibido.status, 409);
    assert.match(proibido.body.message, /ADMIN \+ CONSULTOR/);

    const permitido = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Admin Consultor', email: 'ac@x.com', password: 'senha-123', roles: ['ADMIN', 'CONSULTOR'], companyIds: ['demo-company-a'] },
    });
    assert.equal(permitido.status, 201);
    assert.deepEqual(permitido.body.roles.sort(), ['ADMIN', 'CONSULTOR']);
    assert.equal(permitido.body.role, 'ADMIN');

    // Também bloqueado ao alterar perfis depois, e inclusive entre empresas diferentes.
    const auditorId = s.userId('auditor@esgdemo.com.br');
    const tentativa = await s.api('PUT', `/users/${auditorId}/profiles`, { token: admin, body: { roles: ['AUDITOR', 'CONSULTOR'] } });
    assert.equal(tentativa.status, 409);
  });

  await t.test('busca, alteração de perfil e inativação com histórico', async () => {
    const found = await s.api('GET', '/users?page=1&name=novo', { token: admin });
    assert.equal(found.body.data.length, 1);

    const upd = await s.api('PATCH', `/users/${created.id}`, { token: admin, body: { name: 'Nome Editado' } });
    assert.equal(upd.body.name, 'Nome Editado');
    const perfis = await s.api('PUT', `/users/${created.id}/profiles`, { token: admin, body: { roles: ['MANAGER'] } });
    assert.equal(perfis.status, 200);
    assert.deepEqual(perfis.body.roles, ['MANAGER']);
    assert.equal(perfis.body.links.length, 0, 'vínculo do perfil antigo deixa de ter amparo');

    await s.api('POST', `/users/${created.id}/links`, { token: admin, body: { companyId: 'demo-company-b', role: 'MANAGER' } });
    const inativo = await s.api('DELETE', `/users/${created.id}`, { token: admin });
    assert.equal(inativo.status, 200);
    assert.equal(inativo.body.status, 'INACTIVE');
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'novo@x.com', password: 'senha-123' } })).status, 401);
    // O cadastro continua existindo (autoria preservada) e pode ser reativado.
    const reativado = await s.api('POST', `/users/${created.id}/activate`, { token: admin });
    assert.equal(reativado.body.status, 'ACTIVE');
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'novo@x.com', password: 'senha-123' } })).status, 201);
  });

  await t.test('último administrador ativo é protegido', async () => {
    const outro = s.userId('outro@x.com');
    assert.equal((await s.api('DELETE', `/users/${outro}`, { token: admin })).status, 200);
    const acId = s.userId('ac@x.com');
    assert.equal((await s.api('PUT', `/users/${acId}/profiles`, { token: admin, body: { roles: ['CONSULTOR'] } })).status, 200);
    const adminConsultor = s.userId('admin.consultor@esgdemo.com.br');
    assert.equal((await s.api('DELETE', `/users/${adminConsultor}`, { token: admin })).status, 200);
    // Agora resta apenas o administrador logado.
    const self = s.userId('admin@esgdemo.com.br');
    const tentativa = await s.api('PUT', `/users/${self}/profiles`, { token: admin, body: { roles: ['CONSULTOR'] } });
    assert.equal(tentativa.status, 409);
    assert.match(tentativa.body.message, /último administrador ativo/);
  });

  await t.test('somente a Administração gerencia contas; gestor apenas consulta a própria empresa', async () => {
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', '/users', { token: gestor })).status, 403);
    assert.equal((await s.api('POST', '/users', { token: gestor, body: {} })).status, 403);
    assert.equal((await s.api('PUT', `/users/${s.userId('gestor@esgdemo.com.br')}/profiles`, { token: gestor, body: { roles: ['ADMIN'] } })).status, 403);
    assert.equal((await s.api('POST', `/users/${s.userId('gestor@esgdemo.com.br')}/links`, { token: gestor, body: { companyId: 'demo-company-b', role: 'MANAGER' } })).status, 403);

    const own = await s.api('GET', '/users/getUsers/company', { token: gestor });
    assert.equal(own.status, 200);
    assert.ok(own.body.data.every((u) => u.companyId === 'demo-company-a'));
    assert.ok(own.body.data.every((u) => u.cpf === undefined), 'projeção reduzida: sem CPF');
  });

  await t.test('troca de empresa não é autoatendimento', async () => {
    const r = await s.session('consultor@esgdemo.com.br', DEMO_PASSWORD);
    const tentativa = await s.api('PATCH', `/users/changeCompany/${r.user.id}`, { token: r.token, body: { companyId: 'demo-company-b' } });
    assert.equal(tentativa.status, 403);
    assert.match(tentativa.body.message, /não é autoatendimento/);
    const outro = await s.api('PATCH', `/users/changeCompany/${s.userId('gestor@esgdemo.com.br')}`, { token: r.token, body: { companyId: 'demo-company-b' } });
    assert.equal(outro.status, 403);
  });
});
