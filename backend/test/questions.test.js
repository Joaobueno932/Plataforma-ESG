const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

const answers = (n = 2) =>
  ['Nao_conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Conforme'].slice(0, n).map((title, i) => ({
    title, points: String(i * 2), description: `resposta ${title}`, mandatory: i === 0,
  }));

test('módulo indicadores / cadernos', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.login('admin@esgdemo.com.br', 'admin123');

  await t.test('GET /sectors devolve os 9 cadernos do original', async () => {
    const r = await s.api('GET', '/sectors', { token: admin });
    assert.equal(r.body.length, 9);
    assert.deepEqual(Object.keys(r.body[0]).sort(), ['avatar', 'description', 'section']);
  });

  await t.test('cadastro de caderno com capa enviada', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'capa.jpg');
    const up = await s.api('POST', '/uploads/sectorCovers', { token: admin, form });
    assert.equal(up.status, 201);
    assert.match(up.body.filePath, /^static\/sectorCovers\/caderno_\d+\.jpg$/);
    const r = await s.api('POST', '/sectors', { token: admin, body: { section: 'z', description: 'Novo Setor', avatar: up.body.filePath } });
    assert.equal(r.status, 201);
    assert.equal(r.body.section, 'Z');
    assert.equal((await s.api('POST', '/sectors', { token: admin, body: { section: 'Z', description: 'x', avatar: 'y' } })).status, 409);
  });

  await t.test('novo indicador entra nos relatórios pendentes do caderno', async () => {
    const before = await s.api('GET', '/companies/demo-company-a', { token: admin });
    const count = before.body.report._count.answeredQuestions;
    const r = await s.api('POST', '/questions/section/A', {
      token: admin,
      body: [{ title: 'Indicador novo', description: 'Desc. Verificação: docs', category: 'S', subcategory: 'Sub', answers: answers(3) }],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body[0].code, 'A-S02');
    assert.equal(r.body[0].hasMandatory, true);
    assert.equal(r.body[0].answers.length, 3);
    const after = await s.api('GET', '/companies/demo-company-a', { token: admin });
    assert.equal(after.body.report._count.answeredQuestions, count + 1);
    const other = await s.api('GET', '/companies/demo-company-b', { token: admin });
    assert.equal(other.body.report._count.answeredQuestions, count); // caderno B não muda
    assert.equal((await s.api('POST', '/questions/section/A', { token: admin, body: [{ title: 'x', description: 'x', category: 'S', answers: answers(1) }] })).status, 400);
  });

  await t.test('edição de indicador/resposta e exclusões', async () => {
    const list = await s.api('GET', '/reports/company/questions/' + (await s.api('GET', '/companies/demo-company-a', { token: admin })).body.report.id, { token: admin });
    const q = list.body.find((x) => x.question.title === 'Indicador novo').question;
    const upd = await s.api('PATCH', `/questions/${q.id}`, { token: admin, body: { title: 'Título editado', description: 'Nova desc. Verificação: nova' } });
    assert.equal(upd.body.title, 'Título editado');
    const a = q.answers[1];
    const ua = await s.api('PATCH', `/questions/answer/${q.id}/${a.id}`, { token: admin, body: { points: 4, description: 'alterada', mandatory: true } });
    assert.equal(ua.body.points, 4);
    assert.equal((await s.api('DELETE', `/questions/answer/${a.id}`, { token: admin })).status, 200);
    assert.equal((await s.api('DELETE', `/questions/answer/${q.answers[0].id}`, { token: admin })).status, 400); // mínimo de 2
    assert.equal((await s.api('DELETE', `/questions/${q.id}`, { token: admin })).status, 200);
  });

  await t.test('remoção de caderno: bloqueada com empresas, Geral protegido', async () => {
    assert.equal((await s.api('DELETE', '/questions/section/A', { token: admin })).status, 409);
    assert.equal((await s.api('DELETE', '/questions/section/All', { token: admin })).status, 400);
    assert.equal((await s.api('DELETE', '/questions/section/Z', { token: admin })).status, 200);
    assert.equal((await s.api('GET', '/sectors', { token: admin })).body.length, 9);
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('POST', '/questions/section/A', { token: gestor, body: [] })).status, 403);
  });
});
