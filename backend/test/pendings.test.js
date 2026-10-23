const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');

/**
 * Pendências: vínculo ao indicador, tipo, responsável, prazo, situação e histórico. O tipo
 * define quem abre; prazo vencido sinaliza mas não altera a pontuação.
 */
test('pendências do ciclo', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const gestor = await s.login('gestor@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const reportId = await s.reportIdOf('demo-company-a');
  const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: gestor })).body;
  const funcionarioId = await s.userId('funcionario@esgdemo.com.br');
  await s.api('PATCH', `/reports/addanswerer/${items[0].id}`, { token: gestor, body: { user: funcionarioId } });

  let orientacao;
  await t.test('o tipo define quem abre a pendência', async () => {
    const r = await s.api('POST', `/reports/${reportId}/pendings`, {
      token: consultor,
      body: { kind: 'orientacao-consultoria', description: 'Organizar as licenças por unidade', questionReportId: items[0].id, dueDate: '2020-01-01' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.responsibleId, funcionarioId, 'responsável padrão é quem responde o indicador');
    orientacao = r.body;

    const constatacao = await s.api('POST', `/reports/${reportId}/pendings`, { token: gestor, body: { kind: 'constatacao-auditoria', description: 'x' } });
    assert.equal(constatacao.status, 403, 'constatação é da auditoria');
    assert.equal((await s.api('POST', `/reports/${reportId}/pendings`, { token: gestor, body: { kind: 'qualquer', description: 'x' } })).status, 400);
    assert.equal((await s.api('POST', `/reports/${reportId}/pendings`, { token: gestor, body: { kind: 'falta-resposta', description: '' } })).status, 400);
    const falta = await s.api('POST', `/reports/${reportId}/pendings`, { token: gestor, body: { kind: 'falta-resposta', description: 'Responder resíduos', questionReportId: items[1].id } });
    assert.equal(falta.status, 201);
  });

  await t.test('prazo vencido é sinalizado e não altera a pontuação', async () => {
    const lista = (await s.api('GET', `/reports/${reportId}/pendings`, { token: gestor })).body;
    assert.equal(lista.find((p) => p.id === orientacao.id).overdue, true);
    const antes = (await s.api('GET', `/reports/${reportId}/result?mode=self`, { token: gestor })).body;
    assert.equal(antes.completeness.answered, 0);
    assert.ok(antes.items.every((i) => i.declaredPoints === null), 'nada respondido continua sem pontos, não vira reprovação');
  });

  await t.test('colaborador vê só o que é seu; histórico registra cada mudança', async () => {
    const minhas = (await s.api('GET', `/reports/${reportId}/pendings`, { token: funcionario })).body;
    assert.deepEqual(minhas.map((p) => p.id), [orientacao.id]);

    const andamento = await s.api('PATCH', `/reports/pendings/${orientacao.id}`, { token: funcionario, body: { status: 'em-andamento', note: 'separando documentos' } });
    assert.equal(andamento.status, 200);
    const resolve = await s.api('PATCH', `/reports/pendings/${orientacao.id}`, { token: consultor, body: { status: 'resolvida', note: 'licenças organizadas' } });
    assert.equal(resolve.status, 200);
    assert.deepEqual(resolve.body.events.map((e) => e.toStatus), ['aberta', 'em-andamento', 'resolvida']);
    assert.equal((await s.api('PATCH', `/reports/pendings/${orientacao.id}`, { token: consultor, body: { status: 'aberta' } })).status, 409, 'encerrada não reabre');
  });
});
