const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

/**
 * Fluxo do ciclo com as regras decididas pelo responsável:
 *  - solicitar auditoria (gestor) é diferente de liberar o processo (Administração FIEMS);
 *  - depois da liberação, respostas e anexos ficam bloqueados;
 *  - o pedido de complemento do auditor, sozinho, não desbloqueia a empresa;
 *  - consultor e Administração retornam o processo; o gestor não;
 *  - o supervisor consulta e aprova; a Administração não aprova resultado.
 */
test('fluxo do ciclo: resposta → validação → liberação → auditoria → supervisão', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const auditor = await s.login('auditor@esgdemo.com.br');
  const supervisor = await s.login('supervisor@esgdemo.com.br');
  const reportId = s.reportIdOf('demo-company-a');

  let items = [];
  let first;

  await t.test('empresa lista o ciclo corrente sem informar id', async () => {
    const r = await s.api('GET', '/reports/company/questions/', { token: gestor });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 8);
    items = r.body;
    first = items[0];
  });

  await t.test('gestor delega indicador com prazo; colaborador responde com arquivo', async () => {
    const atribuicao = await s.api('PATCH', `/reports/addanswerer/${first.id}`, {
      token: gestor,
      body: { user: s.userId('funcionario@esgdemo.com.br'), dueDate: '2026-12-01' },
    });
    assert.equal(atribuicao.status, 200);
    assert.equal(atribuicao.body.answerer.email, 'funcionario@esgdemo.com.br');
    assert.ok(atribuicao.body.dueDate.startsWith('2026-12-01'));
    assert.equal(atribuicao.body.assignedBy.name, 'Gestora Demonstração');

    const form = new FormData();
    form.append('companyId', 'demo-company-a');
    form.append('file', new Blob([Buffer.from('conteudo')]), 'licenca.pdf');
    const up = await s.api('POST', '/uploads/companyFile', { token: funcionario, form });
    assert.equal(up.status, 201);

    const conforme = first.question.answers.find((a) => a.title === 'Conforme');
    const r = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, {
      token: funcionario,
      body: { answerId: conforme.id, answerText: 'Licença vigente', filesToCreate: [up.body], addToGed: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'PendingValidationByManager');
    assert.equal(r.body.files.length, 1);
    assert.equal(r.body.answeredByRole, 'EMPLOYEE');
    assert.equal(r.body.answeredBy.email, 'funcionario@esgdemo.com.br');
  });

  await t.test('colaborador não responde nem consulta indicador de outro responsável', async () => {
    const outro = items[1];
    assert.equal((await s.api('GET', `/reports/questionReports/${outro.id}`, { token: funcionario })).status, 403);
    const r = await s.api('PATCH', `/reports/answerQuestion/${outro.id}`, { token: funcionario, body: { answerId: outro.question.answers[0].id } });
    assert.equal(r.status, 403);
    const lista = await s.api('GET', '/reports/company/questions/', { token: funcionario });
    assert.deepEqual(lista.body.map((i) => i.id), [first.id]);
  });

  await t.test('gestor reprova com comentário; consultor aprova', async () => {
    const reprova = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: false, redflag: 'Falta anexo do protocolo' } });
    assert.equal(reprova.status, 201);
    assert.equal(reprova.body.status, 'RejectedByManager');
    const aprova = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true } });
    assert.equal(aprova.body.status, 'ApprovedByConsultor');
  });

  await t.test('liberação exige solicitação registrada e todos os itens aprovados', async () => {
    const semSolicitacao = await s.api('POST', `/reports/releaseAudit/demo-company-a`, { token: admin });
    assert.equal(semSolicitacao.status, 400);
    assert.match(semSolicitacao.body.message, /solicitação de auditoria/);

    const solicitaAuditor = await s.api('POST', '/reports/requestAudit/demo-company-a', { token: auditor });
    assert.equal(solicitaAuditor.status, 403, 'auditor não solicita auditoria');
    const solicita = await s.api('POST', '/reports/requestAudit/demo-company-a', { token: gestor });
    assert.equal(solicita.status, 201);
    assert.ok(solicita.body.auditRequestedAt);
    assert.equal(solicita.body.status, 'Pending', 'solicitar não libera o processo');

    const incompleto = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(incompleto.status, 403);

    // Gestor não libera: a liberação operacional é da Administração FIEMS.
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: gestor })).status, 403);

    for (const item of items.slice(1)) {
      await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: gestor, body: { answerId: item.question.answers[0].id } });
      await s.api('POST', `/reports/validateanswer/${item.id}`, { token: gestor, body: { veredict: true } });
    }
    const liberado = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(liberado.status, 201);
    assert.equal(liberado.body.status, 'Auditing');
    assert.ok(liberado.body.auditReleasedAt);
  });

  await t.test('a versão enviada fica preservada e o ciclo bloqueado para a empresa', async () => {
    const versions = await s.api('GET', `/reports/questionReports/${first.id}/versions`, { token: gestor });
    assert.equal(versions.status, 200);
    assert.equal(versions.body.length, 1);
    assert.equal(versions.body[0].snapshotReason, 'audit-release');
    assert.equal(versions.body[0].answerText, 'Licença vigente');

    const resposta = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: gestor, body: { answerId: first.question.answers[0].id } });
    assert.equal(resposta.status, 403);
    assert.match(resposta.body.message, /bloqueado/);

    const anexo = await s.api('PATCH', `/reports/editQuestionReport/${first.id}`, { token: gestor, body: { filesToAdd: [] } });
    assert.equal(anexo.status, 403, 'anexos têm o mesmo bloqueio das respostas');

    const form = new FormData();
    form.append('companyId', 'demo-company-a');
    form.append('file', new Blob([Buffer.from('x')]), 'outro.pdf');
    assert.equal((await s.api('POST', '/uploads/companyFile', { token: gestor, form })).status, 403);

    const link = (await s.api('GET', `/reports/questionReports/${first.id}`, { token: gestor })).body.files[0];
    assert.equal((await s.api('DELETE', `/reports/questionFiles/${link.id}`, { token: gestor })).status, 403);
  });

  await t.test('auditor designado avalia; pedido de complemento não desbloqueia a empresa', async () => {
    const complemento = await s.api('POST', `/auditory/evaluatequestion/${first.id}`, { token: auditor, body: { status: 'PendingRevision', redflag: 'Falta assinatura' } });
    assert.equal(complemento.status, 201);
    assert.equal(complemento.body.status, 'PendingRevision');

    const tentativa = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: gestor, body: { answerId: first.question.answers[0].id } });
    assert.equal(tentativa.status, 403, 'complemento do auditor, sozinho, não reabre a resposta');
    const tentativaConsultor = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: consultor, body: { answerId: first.question.answers[0].id } });
    assert.equal(tentativaConsultor.status, 403);
    const tentativaAdmin = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: admin, body: { answerId: first.question.answers[0].id } });
    assert.equal(tentativaAdmin.status, 403, 'Administração também respeita o bloqueio antes do retorno registrado');
  });

  await t.test('a empresa solicita o retorno; gestor não retorna; consultor retorna', async () => {
    const pedido = await s.api('POST', '/reports/requestReturn/demo-company-a', { token: gestor, body: { reason: 'precisamos anexar a assinatura' } });
    assert.equal(pedido.status, 201);
    assert.equal(pedido.body.unlocked, false);
    assert.equal((await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: gestor, body: { answerId: first.question.answers[0].id } })).status, 403);

    assert.equal((await s.api('POST', '/reports/return/demo-company-a', { token: gestor, body: { reason: 'x' } })).status, 403);
    assert.equal((await s.api('POST', '/reports/return/demo-company-a', { token: supervisor, body: { reason: 'x' } })).status, 403);

    const retorno = await s.api('POST', '/reports/return/demo-company-a', { token: consultor, body: { reason: 'complemento solicitado pela auditoria' } });
    assert.equal(retorno.status, 201);
    assert.equal(retorno.body.status, 'Pending');
    assert.equal(retorno.body.round, 2);

    const nova = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token: gestor, body: { answerId: first.question.answers[0].id, answerText: 'Licença assinada' } });
    assert.equal(nova.status, 200);
    const versions = await s.api('GET', `/reports/questionReports/${first.id}/versions`, { token: gestor });
    assert.equal(versions.body.length, 2);
    assert.equal(versions.body[0].answerText, 'Licença vigente', 'a versão analisada continua legível');
  });

  await t.test('supervisor aprova o resultado; Administração não aprova', async () => {
    // Nova liberação para concluir a auditoria.
    await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: true } });
    await s.api('POST', '/reports/requestAudit/demo-company-a', { token: gestor });
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin })).status, 201);

    for (const item of items) {
      const r = await s.api('POST', `/auditory/evaluatequestion/${item.id}`, { token: auditor, body: { status: 'Approved', redflag: 'Conforme' } });
      assert.equal(r.status, 201);
    }
    assert.equal((await s.api('POST', '/auditory/submitToSupervisor/demo-company-a', { token: auditor })).status, 201);

    const porAdmin = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: admin });
    assert.equal(porAdmin.status, 403, 'o perfil ADMIN não aprova resultado');
    const porAuditor = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: auditor });
    assert.equal(porAuditor.status, 403);

    const fim = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor });
    assert.equal(fim.status, 201);
    assert.equal(fim.body.status, 'Audited');
  });

  await t.test('supervisor não faz o trabalho técnico do auditor', async () => {
    const reportB = s.reportIdOf('demo-company-b');
    const itemsB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: admin })).body;
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemsB[0].id}`, { token: supervisor, body: { status: 'Approved', redflag: 'x' } })).status, 403);
    assert.equal((await s.api('POST', `/auditory/nonApplicable/${itemsB[0].id}`, { token: supervisor })).status, 403);
    assert.equal((await s.api('POST', `/auditory/nonApplicable/${itemsB[0].id}`, { token: admin })).status, 403);
  });

  await t.test('reabertura administrativa de item só com o ciclo em preenchimento', async () => {
    const reportB = s.reportIdOf('demo-company-b');
    const itemB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: admin })).body[0];
    const ok = await s.api('PATCH', `/reports/changeQuestionStatus/${itemB.id}/Pending`, { token: admin });
    assert.equal(ok.status, 200);
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${itemB.id}/Auditing`, { token: admin })).status, 400);
    const emAuditoria = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin })).body[0];
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${emAuditoria.id}/Pending`, { token: admin })).status, 403);
  });

  await t.test('observação da auditoria não é apagada pela empresa', async () => {
    const item = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin })).body.find((i) => i.redflagIssuer);
    const r = await s.api('DELETE', `/reports/redflag/${item.id}`, { token: gestor });
    assert.equal(r.status, 403);
  });
});
