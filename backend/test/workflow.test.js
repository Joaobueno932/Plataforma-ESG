const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

test('fluxo completo do relatório: resposta → validação → auditoria → supervisão', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const admin = await s.login('admin@esgdemo.com.br', 'admin123');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const gestor = await s.login('gestor@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const auditor = await s.login('auditor@esgdemo.com.br');
  const supervisor = await s.login('supervisor@esgdemo.com.br');

  const company = (await s.api('GET', '/companies/demo-company-a', { token: admin })).body;
  const reportId = company.report.id;
  const employeeId = company.users.find((u) => u.role === 'EMPLOYEE').id;
  let items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin })).body;
  const [first, second, ...rest] = items;

  await t.test('não-admin lista o relatório da própria empresa sem informar id', async () => {
    const r = await s.api('GET', '/reports/company/questions/', { token: gestor });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, items.length);
    const det = await s.api('GET', `/reports/${reportId}`, { token: gestor });
    assert.equal(det.body.managers[0].name, 'Gestora Demonstração');
  });

  await t.test('gestor atribui responsável; funcionário responde com arquivo (GED)', async () => {
    assert.equal((await s.api('PATCH', `/reports/addanswerer/${first.id}`, { token: gestor, body: { user: employeeId } })).status, 200);
    const form = new FormData();
    form.append('companyId', 'demo-company-a');
    form.append('file', new Blob(['conteudo']), 'evidencia.pdf');
    const up = await s.api('POST', '/uploads/companyFile', { token: funcionario, form });
    assert.equal(up.status, 201);
    assert.equal(up.body.url, 'uploads/companyFiles/demo-company-a/evidencia.pdf');
    const dupForm = new FormData();
    dupForm.append('companyId', 'demo-company-a');
    dupForm.append('file', new Blob(['x']), 'evidencia.pdf');
    assert.equal((await s.api('POST', '/uploads/companyFile', { token: funcionario, form: dupForm })).status, 409);

    const answerId = first.question.answers.find((a) => a.title === 'Conforme').id;
    const r = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, {
      token: funcionario,
      body: { answerId, answerText: 'Temos licença vigente', filesToCreate: [up.body], addToGed: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'PendingValidationByManager');
    assert.equal(r.body.selectedAnswer.id, answerId);
    assert.equal(r.body.files[0].file.name, 'evidencia.pdf');
    const ged = await s.api('GET', '/companies/get/files', { token: gestor });
    assert.deepEqual(ged.body.map((f) => f.name), ['evidencia.pdf']);
    const dl = await fetch(`http://127.0.0.1:${s.server.address().port}/${up.body.url}`, { headers: { Authorization: `Bearer ${gestor}` } });
    assert.equal(await dl.text(), 'conteudo');
  });

  await t.test('funcionário não responde indicador de outro responsável', async () => {
    await s.api('PATCH', `/reports/addanswerer/${second.id}`, { token: gestor, body: { user: company.users.find((u) => u.role === 'MANAGER').id } });
    const r = await s.api('PATCH', `/reports/answerQuestion/${second.id}`, { token: funcionario, body: { nonApplicable: true } });
    assert.equal(r.status, 403);
  });

  await t.test('gestor reprova com comentário; consultor aprova', async () => {
    assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: false } })).status, 400);
    const rej = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: false, redflag: 'Anexar licença atualizada' } });
    assert.equal(rej.body.status, 'RejectedByManager');
    assert.equal(rej.body.redflagIssuer.role, 'MANAGER');
    const ok = await s.api('POST', `/reports/validateanswer/${first.id}`, { token: consultor, body: { veredict: true } });
    assert.equal(ok.body.status, 'ApprovedByConsultor');
  });

  await t.test('submissão para auditoria exige todos aprovados (403 com a mensagem do original)', async () => {
    const r = await s.api('POST', '/reports/submit/demo-company-a', { token: admin });
    assert.equal(r.status, 403);
    assert.equal(r.body.message, 'Ainda existem questões que precisam ser aprovadas pelo cosultor.');
    for (const it of [second, ...rest]) {
      await s.api('PATCH', `/reports/answerQuestion/${it.id}`, { token: gestor, body: { nonApplicable: true } });
      await s.api('POST', `/reports/validateanswer/${it.id}`, { token: gestor, body: { veredict: true } });
    }
    const ok = await s.api('POST', '/reports/submit/demo-company-a', { token: admin });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.status, 'Auditing');
    items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin })).body;
    assert.ok(items.every((i) => i.status === 'Auditing'));
    assert.equal((await s.api('POST', `/reports/validateanswer/${first.id}`, { token: gestor, body: { veredict: true } })).status, 403);
  });

  await t.test('auditor pede complemento; empresa complementa; auditor aprova com evidência', async () => {
    const req = await s.api('POST', `/auditory/evaluatequestion/${first.id}`, { token: auditor, body: { status: 'PendingRevision', redflag: 'Falta assinatura' } });
    assert.equal(req.body.status, 'PendingRevision');
    const again = await s.api('PATCH', `/reports/answerQuestion/${first.id}`, {
      token: funcionario,
      body: { answerId: first.question.answers.find((a) => a.title === 'Conforme').id, answerText: 'Licença assinada' },
    });
    assert.equal(again.body.status, 'Auditing');
    const form = new FormData();
    form.append('companyId', first.id); // o front original envia o id da questão aqui
    form.append('file', new Blob(['ev']), 'parecer.pdf');
    const up = await s.api('POST', '/uploads/companyFile', { token: auditor, form });
    assert.equal(up.status, 201);
    const ok = await s.api('POST', `/auditory/evaluatequestion/${first.id}`, {
      token: auditor,
      body: { status: 'Approved', redflag: 'Conforme', evidence: [{ fileType: 'application/pdf', name: up.body.name, url: up.body.url }] },
    });
    assert.equal(ok.body.status, 'Approved');
    assert.equal(ok.body.evidences.length, 1);
    assert.equal((await s.api('POST', '/auditory/submitToSupervisor', { token: auditor })).status, 403);
    for (const it of items.slice(1)) assert.equal((await s.api('POST', `/auditory/nonApplicable/${it.id}`, { token: auditor })).status, 201);
    assert.equal((await s.api('POST', '/auditory/submitToSupervisor', { token: auditor })).status, 201);
  });

  await t.test('supervisor finaliza; admin libera o relatório', async () => {
    assert.equal((await s.api('POST', '/auditory/givereportaccess/demo-company-a', { token: admin })).status, 403);
    const fin = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor });
    assert.equal(fin.status, 201);
    assert.equal(fin.body.status, 'Audited');
    assert.equal(fin.body.evaluation, 'Conforme');
    assert.equal((await s.api('POST', '/auditory/givereportaccess/demo-company-a', { token: admin })).status, 201);
    const list = await s.api('GET', '/companies?page=1&perPage=50', { token: admin });
    assert.equal(list.body.data.find((c) => c.id === 'demo-company-a').report.status, 'Audited');
  });

  await t.test('lembretes (red flag) e reabertura pelo admin', async () => {
    const other = (await s.api('GET', '/reports/company/questions/', { token: await s.login('gestor.exemplo@esgdemo.com.br') })).body[0];
    const add = await s.api('PATCH', `/reports/redflag/${other.id}`, { token: admin, body: { redflag: 'Lembrar de revisar' } });
    assert.equal(add.body.redflag, 'Lembrar de revisar');
    assert.equal((await s.api('DELETE', `/reports/redflag/${other.id}`, { token: admin })).body.redflag, null);
    assert.equal((await s.api('PATCH', `/reports/changeQuestionStatus/${other.id}/Pending`, { token: admin })).body.status, 'Pending');
  });
});
