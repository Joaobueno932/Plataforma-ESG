const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown, fileForm, pdf } = require('./helpers');

/**
 * Percurso real do ciclo (Prompt 5), com as tentativas proibidas:
 *  - rascunho ≠ envio; não respondido ≠ não conforme;
 *  - revisão presa à versão exata da resposta; alteração invalida só a aprovação antiga;
 *  - liberação pela Administração com pré-requisitos e congelamento;
 *  - bloqueio total durante a auditoria, inclusive rotas antigas e anexos;
 *  - complemento do auditor sem desbloqueio; enquadramento auditado separado da declaração;
 *  - NA com justificativa e evidência, recusa mantém o indicador no cálculo;
 *  - retorno só por consultor e Administração, preservando versões e pareceres;
 *  - conclusão do auditor → aguardando supervisor; supervisor só aprova; ADMIN não aprova;
 *  - requisições concorrentes não perdem atualização nem aprovam duas vezes.
 */
test('fluxo do ciclo: rascunho → envio → revisão → liberação → auditoria → retorno → supervisão', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const auditor = await s.login('auditor@esgdemo.com.br');
  const supervisor = await s.login('supervisor@esgdemo.com.br');
  const reportId = await s.reportIdOf('demo-company-a');

  const level = (item, title) => item.question.answers.find((a) => a.title === title);
  const item = async (id, token = admin) => (await s.api('GET', `/reports/questionReports/${id}`, { token })).body;
  const upload = async (token, name, fields = {}, content = pdf(name)) =>
    s.api('POST', '/uploads/companyFile', { token, form: fileForm('demo-company-a', name, content, fields) });

  let items = [];
  let first; // Licenciamento ambiental — obrigatório (mínimo "Conforme")
  let residuos; // Gestão de resíduos — sem obrigatório
  let sst; // Saúde e segurança — obrigatório; usado para o pedido de NA

  await t.test('empresa lista o ciclo corrente sem informar id; nada respondido', async () => {
    const r = await s.api('GET', '/reports/company/questions/', { token: gestor });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 8);
    items = r.body;
    [first, residuos, sst] = items;
    assert.ok(items.every((i) => i.answerState === 'empty' && i.answerVersion === 0 && typeof i.lockVersion === 'number'));
  });

  await t.test('rascunho é diferente de envio; rascunho não conta como resposta', async () => {
    const atribuicao = await s.api('PATCH', `/reports/addanswerer/${first.id}`, {
      token: gestor,
      body: { user: await s.userId('funcionario@esgdemo.com.br'), dueDate: '2026-12-01' },
    });
    assert.equal(atribuicao.status, 200);
    assert.equal(atribuicao.body.answerer.email, 'funcionario@esgdemo.com.br');
    assert.ok(atribuicao.body.dueDate.startsWith('2026-12-01'));
    assert.equal(atribuicao.body.assignedBy.name, 'Gestora Demonstração');

    const up = await upload(funcionario, 'licenca.pdf', { description: 'Licença de operação', validUntil: '2027-06-30' });
    assert.equal(up.status, 201);
    assert.equal(up.body.kind, 'evidencia');
    assert.equal(up.body.version, 1);
    assert.ok(up.body.sizeBytes > 0);

    const rascunho = await s.api('PATCH', `/reports/questionReports/${first.id}/draft`, {
      token: funcionario,
      body: { answerId: level(first, 'Conforme').id, answerText: 'Licença vigente', fileIds: [up.body.id] },
    });
    assert.equal(rascunho.status, 200);
    assert.equal(rascunho.body.answerState, 'draft');
    assert.equal(rascunho.body.status, 'Pending');
    assert.equal(rascunho.body.answerVersion, 0);
    assert.equal(rascunho.body.files.length, 1);
    assert.equal(rascunho.body.files[0].file.description, 'Licença de operação');
    assert.equal(rascunho.body.files[0].file.expired, false);

    // Autodiagnóstico: o rascunho não aparece como nível declarado (nem como não conforme).
    const self = await s.api('GET', `/reports/${reportId}/result?mode=self`, { token: gestor });
    assert.equal(self.status, 200);
    const linha = self.body.items.find((i) => i.title === first.question.title);
    assert.equal(linha.declaredLevel, null);
    assert.equal(linha.declaredPoints, null);

    // Revisar um rascunho não é possível.
    assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true } })).status, 409);

    const envio = await s.api('POST', `/reports/questionReports/${first.id}/submit`, { token: funcionario });
    assert.equal(envio.status, 201);
    assert.equal(envio.body.answerState, 'submitted');
    assert.equal(envio.body.answerVersion, 1);
    assert.equal(envio.body.status, 'PendingValidationByManager');
    assert.equal(envio.body.answeredByRole, 'EMPLOYEE');
    assert.equal(envio.body.answeredBy.email, 'funcionario@esgdemo.com.br');

    const repetido = await s.api('POST', `/reports/questionReports/${first.id}/submit`, { token: funcionario });
    assert.equal(repetido.status, 201);
    assert.equal(repetido.body.answerVersion, 1, 'reenviar a mesma versão não cria versão nova');
  });

  await t.test('arquivos: conteúdo conferido no servidor, executáveis recusados', async () => {
    const exe = await upload(gestor, 'disfarcado.pdf', {}, Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]));
    assert.equal(exe.status, 400);
    assert.match(exe.body.message, /executáveis/);
    const falso = await upload(gestor, 'falso.pdf', {}, Buffer.from('texto qualquer'));
    assert.equal(falso.status, 400);
    assert.match(falso.body.message, /não corresponde/);
    assert.equal((await upload(gestor, 'programa.exe')).status, 400);
    const vencido = await upload(gestor, 'alvara-antigo.pdf', { validUntil: '2020-01-31' });
    assert.equal(vencido.status, 201);
    const indeterminado = await upload(gestor, 'estatuto.pdf', { kind: 'cadastral', indefiniteValidity: 'true' });
    assert.equal(indeterminado.status, 201);
    assert.equal(indeterminado.body.kind, 'cadastral');
    assert.equal(indeterminado.body.indefiniteValidity, true);
  });

  await t.test('colaborador não responde nem consulta indicador de outro responsável', async () => {
    assert.equal((await s.api('GET', `/reports/questionReports/${residuos.id}`, { token: funcionario })).status, 403);
    const r = await s.api('PATCH', `/reports/answerQuestion/${residuos.id}`, { token: funcionario, body: { answerId: residuos.question.answers[0].id } });
    assert.equal(r.status, 403);
    assert.equal((await s.api('PATCH', `/reports/questionReports/${residuos.id}/draft`, { token: funcionario, body: { answerText: 'x' } })).status, 403);
    const lista = await s.api('GET', '/reports/company/questions/', { token: funcionario });
    assert.deepEqual(lista.body.map((i) => i.id), [first.id]);
  });

  await t.test('revisão vale para a versão exata; alteração invalida só a aprovação antiga', async () => {
    const aprova = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true, answerVersion: 1 } });
    assert.equal(aprova.status, 201);
    assert.equal(aprova.body.status, 'ApprovedByConsultor');
    assert.equal(aprova.body.reviewedAnswerVersion, 1);

    // A empresa muda a resposta antes do envio à auditoria: a aprovação da v1 não vale para a nova.
    const muda = await s.api('PATCH', `/reports/questionReports/${first.id}/draft`, { token: funcionario, body: { answerText: 'Licença vigente até 2027' } });
    assert.equal(muda.status, 200);
    assert.equal(muda.body.answerState, 'draft');
    assert.equal(muda.body.status, 'Pending');
    assert.equal(muda.body.reviewedAnswerVersion, null);

    const historico = (await s.api('GET', `/reports/questionReports/${first.id}/history`, { token: gestor })).body;
    const antiga = historico.reviews.find((r) => r.kind === 'review' && r.answerVersion === 1);
    assert.equal(antiga.decision, 'approved', 'a aprovação histórica é preservada');
    assert.equal(antiga.current, false);
    assert.ok(antiga.supersededReason);
    assert.equal(antiga.reviewedBy.email, 'consultor@esgdemo.com.br');

    assert.equal((await s.api('POST', `/reports/questionReports/${first.id}/submit`, { token: funcionario })).body.answerVersion, 2);
    const versaoVelha = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true, answerVersion: 1 } });
    assert.equal(versaoVelha.status, 409, 'aprovar a versão antiga não vale para a resposta atual');
    assert.match(versaoVelha.body.message, /alterada/);

    assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: false } })).status, 400);
    const reprova = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: false, redflag: 'Falta anexo do protocolo' } });
    assert.equal(reprova.status, 201);
    assert.equal(reprova.body.status, 'RejectedByManager');
    const aprovaV2 = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true, answerVersion: 2 } });
    assert.equal(aprovaV2.body.status, 'ApprovedByConsultor');
    assert.equal(aprovaV2.body.reviewedAnswerVersion, 2);

    const versions = (await s.api('GET', `/reports/questionReports/${first.id}/versions`, { token: gestor })).body;
    assert.deepEqual(versions.map((v) => [v.answerVersion, v.answerText]), [[1, 'Licença vigente'], [2, 'Licença vigente até 2027']]);
  });

  await t.test('tela antiga não sobrescreve versão nova; edições simultâneas não se perdem', async () => {
    const base = await s.api('PATCH', `/reports/questionReports/${residuos.id}/draft`, { token: gestor, body: { answerText: 'base' } });
    const lock = base.body.lockVersion;
    const [a, b] = await Promise.all([
      s.api('PATCH', `/reports/questionReports/${residuos.id}/draft`, { token: gestor, body: { answerText: 'gestor', expectedLockVersion: lock } }),
      s.api('PATCH', `/reports/questionReports/${residuos.id}/draft`, { token: consultor, body: { answerText: 'consultor', expectedLockVersion: lock } }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const vencedor = a.status === 200 ? 'gestor' : 'consultor';
    assert.equal((await item(residuos.id)).answerText, vencedor, 'o texto gravado é o de quem venceu, sem mistura');
    const atrasada = await s.api('PATCH', `/reports/questionReports/${residuos.id}/draft`, { token: gestor, body: { answerText: 'velha', expectedLockVersion: lock } });
    assert.equal(atrasada.status, 409);
    assert.match(atrasada.body.message, /recarregue/);
  });

  await t.test('pedido de NA exige justificativa e evidência; decisão fica com a auditoria', async () => {
    const curto = await s.api('PATCH', `/reports/questionReports/${sst.id}/draft`, { token: gestor, body: { naRequest: { justification: 'curta' } } });
    assert.equal(curto.status, 200);
    assert.equal(curto.body.naRequest.decision, null);
    const semJustificativa = await s.api('POST', `/reports/questionReports/${sst.id}/submit`, { token: gestor });
    assert.equal(semJustificativa.status, 400);
    assert.match(semJustificativa.body.message, /justificativa/);

    await s.api('PATCH', `/reports/questionReports/${sst.id}/draft`, {
      token: gestor,
      body: { naRequest: { justification: 'A unidade não possui empregados próprios; atividade terceirizada integralmente.' } },
    });
    const semEvidencia = await s.api('POST', `/reports/questionReports/${sst.id}/submit`, { token: gestor });
    assert.equal(semEvidencia.status, 400);
    assert.match(semEvidencia.body.message, /evidência/);

    const contrato = await upload(gestor, 'contrato-terceirizacao.pdf');
    await s.api('PATCH', `/reports/questionReports/${sst.id}/draft`, { token: gestor, body: { fileIds: [contrato.body.id] } });
    const enviado = await s.api('POST', `/reports/questionReports/${sst.id}/submit`, { token: gestor });
    assert.equal(enviado.status, 201);
    assert.equal(enviado.body.nonApplicable, false, 'o pedido não retira o indicador do cálculo');
    assert.ok(enviado.body.naRequest.justification.startsWith('A unidade'));
    assert.equal((await s.api('POST', `/reports/validateanswer/${sst.id}`, { token: consultor, body: { veredict: true } })).status, 201);
  });

  await t.test('liberação exige solicitação, designação da equipe e todos os itens aprovados', async () => {
    const semSolicitacao = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(semSolicitacao.status, 400);
    assert.match(semSolicitacao.body.message, /solicitação de auditoria/);

    assert.equal((await s.api('POST', '/reports/requestAudit/demo-company-a', { token: auditor })).status, 403, 'auditor não solicita auditoria');
    const solicita = await s.api('POST', '/reports/requestAudit/demo-company-a', { token: gestor });
    assert.equal(solicita.status, 201);
    assert.equal(solicita.body.status, 'Pending', 'solicitar não libera o processo');

    const incompleto = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(incompleto.status, 403);
    assert.match(incompleto.body.message, /Faltam \d+ indicador/);
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: gestor })).status, 403, 'gestor não libera');

    for (const i of items.slice(1)) {
      if (i.id === sst.id) continue;
      const r = await s.api('PATCH', `/reports/answerQuestion/${i.id}`, { token: gestor, body: { answerId: level(i, 'Engajado').id } });
      assert.equal(r.status, 200);
      assert.equal((await s.api('POST', `/reports/validateanswer/${i.id}`, { token: consultor, body: { veredict: true } })).status, 201);
    }
    const situacao = (await s.api('GET', `/reports/${reportId}/workflow`, { token: gestor })).body;
    assert.deepEqual(situacao.releaseBlockers, []);
    assert.equal(situacao.locked, false);

    // Sem supervisor designado não há liberação.
    const supervisorId = await s.userId('supervisor@esgdemo.com.br');
    assert.equal((await s.api('DELETE', `/reports/${reportId}/professionals/${supervisorId}`, { token: admin })).status, 200);
    const semEquipe = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(semEquipe.status, 400);
    assert.match(semEquipe.body.message, /supervisor/);
    assert.equal((await s.api('POST', `/reports/${reportId}/professionals`, { token: admin, body: { userId: supervisorId, role: 'SUPERVISOR' } })).status, 201);

    const liberado = await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin });
    assert.equal(liberado.status, 201);
    assert.equal(liberado.body.status, 'Auditing');
    assert.ok(liberado.body.auditReleasedAt);
    assert.equal((await s.api('GET', `/reports/${reportId}/workflow`, { token: gestor })).body.locked, true);
  });

  await t.test('durante a auditoria nada muda pela empresa, consultor ou Administração — nem por rota antiga', async () => {
    const link = (await item(first.id, gestor)).files[0];
    for (const [quem, token] of [['gestor', gestor], ['consultor', consultor], ['admin', admin]]) {
      const antiga = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, { token, body: { answerId: first.question.answers[0].id } });
      assert.equal(antiga.status, 403, `${quem}: rota antiga de resposta`);
      assert.match(antiga.body.message, /bloqueado/);
      assert.equal((await s.api('PATCH', `/reports/questionReports/${first.id}/draft`, { token, body: { answerText: 'x' } })).status, 403, `${quem}: rascunho`);
      assert.equal((await s.api('POST', `/reports/questionReports/${first.id}/submit`, { token })).status, 403, `${quem}: envio`);
      assert.equal((await s.api('PATCH', `/reports/editQuestionReport/${first.id}`, { token, body: { filesToAdd: [] } })).status, 403, `${quem}: anexo`);
      assert.equal((await s.api('DELETE', `/reports/questionFiles/${link.id}`, { token })).status, 403, `${quem}: desvincular`);
      assert.equal((await upload(token, `bloqueado-${quem}.pdf`)).status, 403, `${quem}: upload`);
      assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token, body: { veredict: true } })).status, 403, `${quem}: revisão`);
    }
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${first.id}/Pending`, { token: admin })).status, 403);
    assert.equal(
      (await s.api('PATCH', `/reports/addanswerer/${residuos.id}`, { token: gestor, body: { user: await s.userId('gestor@esgdemo.com.br') } })).status,
      403,
    );
  });

  await t.test('auditor: complemento sem desbloqueio; enquadramento separado da declaração', async () => {
    const complemento = await s.api('POST', `/auditory/questionReports/${first.id}/complement`, {
      token: auditor,
      body: { description: 'Falta assinatura do responsável técnico na licença', dueDate: '2026-11-30' },
    });
    assert.equal(complemento.status, 201);
    assert.equal(complemento.body.status, 'PendingRevision');
    assert.equal((await s.api('PATCH', `/reports/questionReports/${first.id}/draft`, { token: gestor, body: { answerText: 'x' } })).status, 403);

    const pendencias = (await s.api('GET', `/reports/${reportId}/pendings`, { token: gestor })).body;
    const solicitada = pendencias.find((p) => p.questionReportId === first.id && p.kind === 'evidencia-solicitada');
    assert.ok(solicitada, 'o complemento vira pendência visível à empresa');
    assert.equal(solicitada.createdByRole, 'AUDITOR');
    assert.equal(solicitada.code, 'CG-E01');
    // Colaborador vê a pendência do indicador dele.
    assert.ok((await s.api('GET', `/reports/${reportId}/pendings`, { token: funcionario })).body.some((p) => p.id === solicitada.id));
    // Somente a auditoria encerra o que a auditoria abriu.
    assert.equal((await s.api('PATCH', `/reports/pendings/${solicitada.id}`, { token: gestor, body: { status: 'resolvida' } })).status, 403);
    assert.equal((await s.api('PATCH', `/reports/pendings/${solicitada.id}`, { token: gestor, body: { status: 'em-andamento', note: 'providenciando' } })).status, 200);

    // Auditor enquadra acima do declarado: a declaração e sua autoria ficam intactas.
    const acima = await s.api('POST', `/auditory/questionReports/${residuos.id}/decision`, {
      token: auditor,
      body: { auditedAnswerId: level(residuos, 'Conforme').id, justification: 'PGRS implantado com metas e manifestos completos' },
    });
    assert.equal(acima.status, 201);
    assert.equal(acima.body.status, 'Approved');
    assert.equal(acima.body.selectedAnswer.title, 'Engajado', 'a resposta original não é sobrescrita');
    assert.equal(acima.body.answeredBy.email, 'gestor@esgdemo.com.br', 'a autoria da resposta é preservada');
    assert.equal(acima.body.audit.auditedAnswer.title, 'Conforme');
    assert.equal(acima.body.audit.auditedBy.email, 'auditor@esgdemo.com.br');
    assert.equal(acima.body.audit.valid, true);

    // A empresa ainda não vê o enquadramento auditado.
    const vistaEmpresa = await item(residuos.id, gestor);
    assert.equal(vistaEmpresa.audit, null);
    assert.equal(vistaEmpresa.selectedAnswer.title, 'Engajado');

    // NA recusada: o indicador continua no cálculo; o auditor conclui pelo não atendimento.
    assert.equal((await s.api('POST', `/auditory/questionReports/${sst.id}/decision`, { token: auditor, body: { conclusion: 'not-met', justification: 'x' } })).status, 409, 'decidir o NA antes');
    const recusa = await s.api('POST', `/auditory/nonApplicable/${sst.id}`, {
      token: auditor,
      body: { decision: 'refused', reason: 'Há empregados próprios na manutenção; SST é aplicável' },
    });
    assert.equal(recusa.status, 201);
    assert.equal(recusa.body.nonApplicable, false);
    assert.equal(recusa.body.naRequest.decision, 'refused');
    const naoAtende = await s.api('POST', `/auditory/questionReports/${sst.id}/decision`, {
      token: auditor,
      body: { conclusion: 'not-met', justification: 'Sem PGR e sem PCMSO apresentados' },
    });
    assert.equal(naoAtende.status, 201);
    assert.equal(naoAtende.body.status, 'Rejected');

    // Supervisor e Administração não fazem trabalho técnico.
    for (const token of [supervisor, admin]) {
      assert.equal((await s.api('POST', `/auditory/questionReports/${first.id}/decision`, { token, body: { conclusion: 'not-met', justification: 'x' } })).status, 403);
      assert.equal((await s.api('POST', `/auditory/nonApplicable/${sst.id}`, { token, body: { decision: 'accepted', reason: 'x' } })).status, 403);
      assert.equal((await s.api('POST', `/auditory/questionReports/${first.id}/complement`, { token, body: { description: 'x' } })).status, 403);
    }

    const cedo = await s.api('POST', '/auditory/submitToSupervisor/demo-company-a', { token: auditor });
    assert.equal(cedo.status, 403);
    assert.match(cedo.body.message, /CG-E01 \(complemento solicitado/);
  });

  await t.test('retorno: empresa só pede; gestor, auditor e supervisor não retornam; consultor retorna', async () => {
    const pedido = await s.api('POST', '/reports/requestReturn/demo-company-a', { token: gestor, body: { reason: 'precisamos anexar a assinatura' } });
    assert.equal(pedido.status, 201);
    assert.equal(pedido.body.unlocked, false);
    for (const token of [gestor, auditor, supervisor, funcionario])
      assert.equal((await s.api('POST', '/reports/return/demo-company-a', { token, body: { reason: 'x' } })).status, 403);
    assert.equal((await s.api('POST', '/reports/return/demo-company-a', { token: consultor, body: {} })).status, 400, 'motivo obrigatório');

    const retorno = await s.api('POST', '/reports/return/demo-company-a', {
      token: consultor,
      body: { reason: 'complemento solicitado pela auditoria', items: [first.id] },
    });
    assert.equal(retorno.status, 201);
    assert.equal(retorno.body.status, 'Pending');
    assert.equal(retorno.body.round, 2);
    assert.deepEqual(retorno.body.affectedItems, [first.id]);

    // Decisão de versão não alterada continua valendo.
    assert.equal((await item(residuos.id, auditor)).audit.valid, true);

    const nova = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, {
      token: funcionario,
      body: { answerId: level(first, 'Conforme').id, answerText: 'Licença assinada' },
    });
    assert.equal(nova.status, 200);
    assert.equal(nova.body.answerVersion, 3);
    assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true, answerVersion: 3 } })).status, 201);

    const versions = (await s.api('GET', `/reports/questionReports/${first.id}/versions`, { token: gestor })).body;
    assert.equal(versions.length, 3);
    assert.equal(versions[0].answerText, 'Licença vigente', 'a versão analisada continua legível');
    const historico = (await s.api('GET', `/reports/questionReports/${first.id}/history`, { token: admin })).body;
    assert.ok(historico.versions.some((v) => v.snapshotReason === 'audit-release'));
    assert.ok(historico.versions.some((v) => v.snapshotReason === 'return'));
    assert.ok(historico.reviews.some((r) => r.kind === 'audit' && r.decision === 'complement'), 'o pedido do auditor fica no histórico');
  });

  await t.test('retorno pela Administração e retorno concorrente com avaliação do auditor', async () => {
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin })).status, 201);
    const depois = await item(residuos.id, auditor);
    assert.equal(depois.status, 'Approved', 'a decisão sobre a versão não alterada foi mantida na nova liberação');
    assert.equal((await item(first.id, auditor)).status, 'Auditing', 'a resposta alterada volta para a auditoria');

    const [retorno, decisao] = await Promise.all([
      s.api('POST', '/reports/return/demo-company-a', { token: admin, body: { reason: 'ajuste solicitado pela Administração' } }),
      s.api('POST', `/auditory/questionReports/${first.id}/decision`, { token: auditor, body: { auditedAnswerId: level(first, 'Conforme').id, justification: 'Licença assinada' } }),
    ]);
    assert.equal(retorno.status, 201);
    assert.equal(retorno.body.round, 3);
    assert.ok([201, 403].includes(decisao.status), `decisão concorrente: ${decisao.status}`);
    const estado = await item(first.id, auditor);
    if (decisao.status === 201) assert.equal(estado.audit.valid, true, 'decisão gravada antes do retorno continua valendo');
    else assert.equal(estado.audit.auditedAnswer, null, 'decisão recusada não deixou rastro parcial');
    assert.equal((await s.api('GET', `/reports/${reportId}/workflow`, { token: admin })).body.status, 'Pending');
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin })).status, 201);
  });

  await t.test('conclusão exige decisões válidas e leva a aguardando supervisor', async () => {
    const pendentes = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: auditor })).body.filter((i) => i.status === 'Auditing');
    assert.ok(pendentes.length > 0);
    for (const i of pendentes) {
      const r = await s.api('POST', `/auditory/evaluatequestion/${i.id}`, { token: auditor, body: { status: 'Approved', redflag: 'Conforme evidências' } });
      assert.equal(r.status, 201);
    }
    const conclui = await s.api('POST', '/auditory/submitToSupervisor/demo-company-a', { token: auditor });
    assert.equal(conclui.status, 201);
    assert.equal(conclui.body.status, 'AwaitingSupervisor');

    const tarde = await s.api('POST', `/auditory/questionReports/${first.id}/decision`, { token: auditor, body: { conclusion: 'not-met', justification: 'x' } });
    assert.equal(tarde.status, 403);
    assert.match(tarde.body.message, /aguarda a aprovação do supervisor/);
    assert.equal((await s.api('PATCH', `/reports/questionReports/${first.id}/draft`, { token: gestor, body: { answerText: 'x' } })).status, 403);
  });

  await t.test('supervisor aprova; Administração e auditor não; aprovação simultânea não duplica', async () => {
    assert.equal((await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: admin })).status, 403, 'o perfil ADMIN não aprova');
    assert.equal((await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: auditor })).status, 403);
    assert.equal((await s.api('POST', '/reports/return/demo-company-a', { token: supervisor, body: { reason: 'x' } })).status, 403, 'supervisor não devolve');

    const [a, b] = await Promise.all([
      s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor }),
      s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const fim = a.status === 201 ? a : b;
    assert.equal(fim.body.status, 'Audited');
    assert.equal(fim.body.result.eligible, false, 'obrigatório não atendido (SST) impede a elegibilidade');
    assert.ok(fim.body.result.impediments.some((i) => i.kind === 'obrigatorio-nao-atendido'));

    const historico = (await s.api('GET', `/reports/${reportId}/result/history`, { token: admin })).body;
    assert.equal(historico.length, 1, 'clique duplo não grava dois resultados');

    // Depois da aprovação, a empresa vê o enquadramento auditado.
    const vista = await item(residuos.id, gestor);
    assert.equal(vista.audit.auditedAnswer.title, 'Conforme');
    assert.equal(vista.selectedAnswer.title, 'Engajado');

    const corrige = await s.api('POST', '/reports/return/demo-company-a', { token: consultor, body: { reason: 'correção' } });
    assert.equal(corrige.status, 409, 'ciclo concluído não volta por retorno comum');
    assert.match(corrige.body.message, /revisão identificada/);
  });

  await t.test('supervisor não faz o trabalho técnico do auditor', async () => {
    const reportB = await s.reportIdOf('demo-company-b');
    const itemsB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: admin })).body;
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemsB[0].id}`, { token: supervisor, body: { status: 'Approved', redflag: 'x' } })).status, 403);
    assert.equal((await s.api('POST', `/auditory/nonApplicable/${itemsB[0].id}`, { token: supervisor })).status, 403);
    assert.equal((await s.api('POST', `/auditory/nonApplicable/${itemsB[0].id}`, { token: admin })).status, 403);
  });

  await t.test('reabertura administrativa de item só com o ciclo em preenchimento', async () => {
    const reportB = await s.reportIdOf('demo-company-b');
    const itemB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: admin })).body[0];
    const ok = await s.api('PATCH', `/reports/changeQuestionStatus/${itemB.id}/Pending`, { token: admin });
    assert.equal(ok.status, 200);
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${itemB.id}/Auditing`, { token: admin })).status, 400);
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${first.id}/Pending`, { token: admin })).status, 403);
  });

  await t.test('observação da auditoria não é apagada pela empresa', async () => {
    const r = await s.api('DELETE', `/reports/redflag/${first.id}`, { token: gestor });
    assert.equal(r.status, 403);
  });
});
