const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');

/**
 * Listagem resumida (`?view=resumo`), criada na correção do gargalo medido na carga: mesmo
 * escopo e mesmas ocultações da listagem completa, com uma fração do tamanho.
 */
test('listagem resumida do ciclo', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const gestor = await s.login('gestor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const reportId = await s.reportIdOf('demo-company-a');

  await t.test('mesmos itens e ordem, payload menor', async () => {
    const full = await s.api('GET', `/reports/company/questions/${reportId}`, { token: gestor });
    const summary = await s.api('GET', `/reports/company/questions/${reportId}?view=resumo`, { token: gestor });
    assert.equal(summary.status, 200);
    assert.deepEqual(summary.body.map((i) => i.id), full.body.map((i) => i.id));
    assert.ok(JSON.stringify(summary.body).length < JSON.stringify(full.body).length / 3);
    assert.equal(summary.body[0].question.answers, undefined, 'sem as alternativas');
    assert.equal(summary.body[0].summary, true);
  });

  await t.test('colaborador continua vendo só os seus; outra empresa continua barrada', async () => {
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: gestor })).body;
    await s.api('PATCH', `/reports/addanswerer/${items[0].id}`, { token: gestor, body: { user: await s.userId('funcionario@esgdemo.com.br') } });
    const own = (await s.api('GET', `/reports/company/questions/${reportId}?view=resumo`, { token: funcionario })).body;
    assert.deepEqual(own.map((i) => i.id), [items[0].id]);
    const outra = await s.login('gestor.exemplo@esgdemo.com.br');
    assert.equal((await s.api('GET', `/reports/company/questions/${reportId}?view=resumo`, { token: outra })).status, 403);
  });
});

/**
 * GET /users serializa só a página pedida (antes serializava a base inteira e esgotava o pool sob
 * carga): mesmo formato, mesma ordem e páginas que, juntas, cobrem todas as pessoas sem repetir.
 */
test('listagem de pessoas paginada antes da serialização', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const first = (await s.api('GET', '/users?page=1&perPage=3', { token: admin })).body;
  assert.equal(first.page, 1);
  assert.equal(first.contentCount, first.data.length);
  assert.ok(first.data.length <= 3);
  assert.ok(Array.isArray(first.data[0].roles) && 'links' in first.data[0] && 'company' in first.data[0], 'pessoa serializada completa');
  const seen = [];
  for (let page = 1; page <= first.numberOfPages; page++) {
    const r = await s.api('GET', `/users?page=${page}&perPage=3`, { token: admin });
    assert.equal(r.status, 200);
    seen.push(...r.body.data.map((u) => u.id));
  }
  const all = (await s.api('GET', `/users?perPage=1000`, { token: admin })).body.data.map((u) => u.id);
  assert.deepEqual(seen, all);
  assert.equal(new Set(seen).size, seen.length);
  const beyond = (await s.api('GET', `/users?page=${first.numberOfPages + 1}&perPage=3`, { token: admin })).body;
  assert.deepEqual(beyond.data, []);
});
