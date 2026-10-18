const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

test('módulo empresas', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.login('admin@esgdemo.com.br', 'admin123');

  await t.test('listagem paginada no formato do original', async () => {
    const r = await s.api('GET', '/companies?page=1&perPage=50', { token: admin });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body).sort(), ['contentCount', 'data', 'nextPage', 'numberOfPages', 'page', 'previousPage']);
    assert.equal(r.body.nextPage, 'no next page');
    const row = r.body.data[0];
    assert.deepEqual(Object.keys(row).sort(), ['accessDate', 'bussinessName', 'id', 'report']);
    assert.ok(row.report._count.answeredQuestions > 0);
  });

  await t.test('cadastro cria relatório com Caderno Geral + setorial', async () => {
    const r = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Nova Ltda', bussinessName: 'Nova', email: 'n@n.com', cnpj: '12.345.678/0001-95', accessDate: '2024-08-01', size: 'MICRO_PEQUENA', section: 'C' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.cnpj, '12345678000195');
    assert.equal(r.body.report.status, 'Pending');
    assert.equal(r.body.report.structure, 'Programa ESG-FIEMS (Setorial C)');
    const qs = await s.api('GET', `/reports/company/questions/${r.body.report.id}`, { token: admin });
    const sections = new Set(qs.body.map((q) => q.question.section));
    assert.deepEqual([...sections].sort(), ['All', 'C']);
    // CNPJ duplicado
    const dup = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'X', bussinessName: 'X', email: 'x@x.com', cnpj: '12345678000195', accessDate: '2024-08-01', size: 'MEDIA', section: 'C' },
    });
    assert.equal(dup.status, 409);
  });

  await t.test('busca por nome, edição e exclusão', async () => {
    const search = await s.api('GET', '/companies?page=1&perPage=50&bussinessName=nova', { token: admin });
    assert.equal(search.body.data.length, 1);
    const id = search.body.data[0].id;
    const upd = await s.api('PATCH', `/companies/${id}`, { token: admin, body: { bussinessName: 'Nova Editada', avatar: 'https://x/y.png' } });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.bussinessName, 'Nova Editada');
    assert.equal((await s.api('DELETE', `/companies/${id}`, { token: admin })).status, 200);
    assert.equal((await s.api('GET', `/companies/${id}`, { token: admin })).status, 404);
    assert.equal((await s.api('GET', `/companies/${id}`, { token: admin })).body.message, 'company not found');
  });

  await t.test('não-admin só vê a própria empresa', async () => {
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', '/companies?page=1&perPage=50', { token: gestor })).status, 403);
    assert.equal((await s.api('GET', '/companies/demo-company-a', { token: gestor })).status, 200);
    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: gestor })).status, 403);
    const files = await s.api('GET', '/companies/get/files', { token: admin });
    assert.equal(files.body.message, 'essa ação é apenas para usuários não admin!');
  });
});
