const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');

const answers = (n = 2) =>
  ['Nao_conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Conforme'].slice(0, n).map((title, i) => ({
    title,
    points: String(i * 2),
    description: `resposta ${title}`,
    mandatory: i === 0,
  }));

test('módulo indicadores / cadernos', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();

  await t.test('GET /sectors devolve os 9 cadernos', async () => {
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

  let novo;
  await t.test('novo indicador entra nos ciclos em preenchimento do caderno', async () => {
    const before = (await s.api('GET', '/companies/demo-company-a', { token: admin })).body.report._count.totalQuestions;
    const r = await s.api('POST', '/questions/section/A', {
      token: admin,
      body: [{ title: 'Indicador novo', description: 'Desc. Verificação: docs', category: 'S', subcategory: 'Sub', answers: answers(3) }],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body[0].code, 'A-S02');
    assert.equal(r.body[0].hasMandatory, true);
    assert.equal(r.body[0].answers.length, 3);
    novo = r.body[0];
    const after = await s.api('GET', '/companies/demo-company-a', { token: admin });
    assert.equal(after.body.report._count.totalQuestions, before + 1);
    const other = await s.api('GET', '/companies/demo-company-b', { token: admin });
    assert.equal(other.body.report._count.totalQuestions, before, 'caderno B não muda');
    assert.equal(
      (await s.api('POST', '/questions/section/A', { token: admin, body: [{ title: 'x', description: 'x', category: 'S', answers: answers(1) }] })).status,
      400,
    );
  });

  await t.test('edição registra a alteração na trilha', async () => {
    const upd = await s.api('PATCH', `/questions/${novo.id}`, { token: admin, body: { title: 'Título editado', description: 'Nova desc. Verificação: nova' } });
    assert.equal(upd.body.title, 'Título editado');
    const a = novo.answers[1];
    const ua = await s.api('PATCH', `/questions/answer/${novo.id}/${a.id}`, { token: admin, body: { points: 4, description: 'alterada', mandatory: true } });
    assert.equal(ua.body.points, 4);
    const events = await s.api('GET', `/admin/events?entity=answers&entityId=${a.id}`, { token: admin });
    assert.ok(events.body.some((e) => e.action === 'catalog.answer.update' && e.details.after.points === 4));
  });

  await t.test('exclusões não apagam histórico de avaliação', async () => {
    // Indicador já integra os ciclos abertos: a exclusão é recusada.
    const del = await s.api('DELETE', `/questions/${novo.id}`, { token: admin });
    assert.equal(del.status, 409);
    assert.match(del.body.message, /já integra avaliações/);

    // Alternativa ainda não escolhida pode sair; o mínimo de 2 continua valendo.
    assert.equal((await s.api('DELETE', `/questions/answer/${novo.answers[1].id}`, { token: admin })).status, 200);
    assert.equal((await s.api('DELETE', `/questions/answer/${novo.answers[0].id}`, { token: admin })).status, 400);

    // Depois de escolhida em uma avaliação, a alternativa não pode mais ser excluída.
    const reportId = await s.reportIdOf('demo-company-a');
    const items = await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin });
    const item = items.body.find((i) => i.questionId === novo.id);
    const escolhida = item.question.answers[0];
    const gestor = await s.login('gestor@esgdemo.com.br');
    const resp = await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: gestor, body: { answerId: escolhida.id, answerText: 'ok' } });
    assert.equal(resp.status, 200);
    const bloqueada = await s.api('DELETE', `/questions/answer/${escolhida.id}`, { token: admin });
    assert.equal(bloqueada.status, 409);
    assert.match(bloqueada.body.message, /já foi escolhida/);
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
