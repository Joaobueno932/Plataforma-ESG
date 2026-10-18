const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

test('módulo usuários', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.login('admin@esgdemo.com.br', 'admin123');

  await t.test('listagem padrão de 5 por página, sem hash de senha', async () => {
    const r = await s.api('GET', '/users?page=1', { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 5);
    assert.equal(r.body.numberOfPages, 2);
    assert.match(r.body.nextPage, /\/users\/\?page=2&perPage=5$/);
    assert.ok(r.body.data.every((u) => u.password === undefined));
  });

  let created;
  await t.test('cadastro exige empresa para funções de empresa e aceita ADMIN sem empresa', async () => {
    const noCompany = await s.api('POST', '/users', { token: admin, body: { name: 'X', email: 'x@x.com', password: '1234', role: 'EMPLOYEE' } });
    assert.equal(noCompany.status, 400);
    const adm = await s.api('POST', '/users', { token: admin, body: { name: 'Outro Admin', email: 'outro@x.com', password: '1234', role: 'ADMIN' } });
    assert.equal(adm.status, 201);
    assert.equal(adm.body.companyId, null);
    const emp = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Novo Funcionário', email: 'novo@x.com', password: '1234', cpf: '123.456.789-09', role: 'EMPLOYEE', companyId: 'demo-company-b' },
    });
    assert.equal(emp.status, 201);
    assert.equal(emp.body.cpf, '12345678909');
    assert.equal(emp.body.company.bussinessName, 'Indústria Exemplo');
    created = emp.body;
    const dup = await s.api('POST', '/users', { token: admin, body: { name: 'Y', email: 'NOVO@x.com', password: '1234', role: 'ADMIN' } });
    assert.equal(dup.status, 409);
  });

  await t.test('busca por nome, edição de função e exclusão', async () => {
    const found = await s.api('GET', '/users?page=1&name=novo', { token: admin });
    assert.equal(found.body.data.length, 1);
    const upd = await s.api('PATCH', `/users/${created.id}`, { token: admin, body: { name: 'Nome Editado', role: 'MANAGER' } });
    assert.equal(upd.body.role, 'MANAGER');
    assert.equal(upd.body.name, 'Nome Editado');
    assert.equal((await s.api('DELETE', `/users/${created.id}`, { token: admin })).status, 200);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'novo@x.com', password: '1234' } })).status, 401);
  });

  await t.test('permissões: não-admin não lista/cria; consultor troca a própria empresa', async () => {
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', '/users', { token: gestor })).status, 403);
    assert.equal((await s.api('POST', '/users', { token: gestor, body: {} })).status, 403);
    const own = await s.api('GET', '/users/getUsers/company', { token: gestor });
    assert.equal(own.status, 200);
    assert.ok(own.body.data.every((u) => u.companyId === 'demo-company-a'));

    const r = await s.api('POST', '/auth/login', { body: { email: 'consultor@esgdemo.com.br', password: '123456' } });
    const consultor = r.body.access_token;
    const myId = r.body.sanitizedUser.id;
    assert.equal((await s.api('GET', '/companies/light/all', { token: consultor })).status, 200);
    const moved = await s.api('PATCH', `/users/changeCompany/${myId}`, { token: consultor, body: { companyId: 'demo-company-b' } });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.company.id, 'demo-company-b');
    const other = await s.api('GET', '/users?page=1&perPage=50', { token: admin });
    const gestorId = other.body.data.find((u) => u.email === 'gestor@esgdemo.com.br').id;
    assert.equal((await s.api('PATCH', `/users/changeCompany/${gestorId}`, { token: consultor, body: { companyId: 'demo-company-b' } })).status, 403);
  });
});
