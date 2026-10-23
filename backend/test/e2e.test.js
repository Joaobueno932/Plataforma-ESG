const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown, fileForm } = require('./helpers');

/**
 * Percurso de homologação com usuários de teste isolados, criados pela própria Administração:
 * cadastro → delegação → respostas → revisão → liberação → auditoria → aprovação → documentos,
 * e então recertificação. Cada passo cita o critério de aceite (ACE) da especificação.
 */
test('homologação: ciclo completo com usuários isolados', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const PASS = 'senha-forte-123';
  const people = {};
  let company;
  let reportId;
  const tokens = {};

  await t.test('ACE01 — Administração cadastra a empresa; CNPJ duplicado é recusado; edição guarda histórico', async () => {
    const body = { legalName: 'Homologação Teste Ltda', bussinessName: 'Homologação Teste', email: 'homolog@teste.local', cnpj: '12.345.678/0001-95', accessDate: '2026-10-01', size: 'MEDIA', section: 'B' };
    const r = await s.api('POST', '/companies', { token: admin, body });
    assert.equal(r.status, 201);
    company = r.body;
    reportId = company.report.id;
    assert.equal((await s.api('POST', '/companies', { token: admin, body: { ...body, bussinessName: 'Outra' } })).status, 409);
    const edit = await s.api('PATCH', `/companies/${company.id}`, { token: admin, body: { bussinessName: 'Homologação Teste S.A.' } });
    assert.equal(edit.status, 200);
    const events = (await s.api('GET', '/admin/events?entity=companies', { token: admin })).body;
    const list = Array.isArray(events) ? events : events.data || [];
    assert.ok(list.some((e) => e.action === 'company.update' && e.entityId === company.id), 'alteração registrada na trilha');
  });

  await t.test('ACE03 — profissionais com várias empresas; vínculo novo não remove os anteriores', async () => {
    const create = async (key, name, roles, companyIds) => {
      const r = await s.api('POST', '/users', { token: admin, body: { name, email: `${key}@homolog.local`, password: PASS, roles, companyIds } });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      people[key] = r.body;
    };
    await create('gestor', 'Gestor Homolog', ['MANAGER'], [company.id]);
    await create('colab', 'Colaborador Homolog', ['EMPLOYEE'], [company.id]);
    await create('consultor', 'Consultor Homolog', ['CONSULTOR'], [company.id, 'demo-company-a']);
    await create('auditor', 'Auditor Homolog', ['AUDITOR'], [company.id]);
    await create('supervisor', 'Supervisor Homolog', ['SUPERVISOR'], [company.id]);
    const terceira = await s.api('POST', `/users/${people.consultor.id}/links`, { token: admin, body: { companyId: 'demo-company-b', role: 'CONSULTOR' } });
    assert.ok([200, 201].includes(terceira.status));
    assert.deepEqual(terceira.body.links.map((l) => l.companyId).sort(), [company.id, 'demo-company-a', 'demo-company-b'].sort());
    for (const key of Object.keys(people)) tokens[key] = await s.login(`${key}@homolog.local`, PASS);
    // Gestor não gerencia contas.
    assert.equal((await s.api('POST', '/users', { token: tokens.gestor, body: { name: 'x', email: 'x@x.local', password: PASS, roles: ['EMPLOYEE'], companyIds: [company.id] } })).status, 403);
  });

  await t.test('ACE05 — o ciclo usa o Caderno Geral e só o setorial da empresa', async () => {
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: tokens.gestor })).body;
    assert.ok(items.length > 0);
    assert.ok(items.every((i) => ['All', 'B'].includes(i.question.section)));
  });

  await t.test('designação, delegação e respostas de cada perfil', async () => {
    for (const role of ['AUDITOR', 'SUPERVISOR'])
      assert.equal(
        (await s.api('POST', `/reports/${reportId}/professionals`, { token: admin, body: { userId: people[role.toLowerCase()].id, role } })).status,
        201,
      );
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: tokens.gestor })).body;
    const [primeiro, ...resto] = items;
    assert.equal((await s.api('PATCH', `/reports/addanswerer/${primeiro.id}`, { token: tokens.gestor, body: { user: people.colab.id } })).status, 200);

    // Colaborador: só o seu; evidência com metadados.
    assert.deepEqual((await s.api('GET', `/reports/company/questions/${reportId}`, { token: tokens.colab })).body.map((i) => i.id), [primeiro.id]);
    assert.equal((await s.api('PATCH', `/reports/answerQuestion/${resto[0].id}`, { token: tokens.colab, body: { answerId: resto[0].question.answers[0].id } })).status, 403);
    const up = await s.api('POST', '/uploads/companyFile', { token: tokens.colab, form: fileForm(company.id, 'licenca-homolog.pdf', undefined, { description: 'Licença', indefiniteValidity: 'true' }) });
    assert.equal(up.status, 201);
    const top = (item) => item.question.answers.reduce((a, b) => (b.points > a.points ? b : a));
    const r1 = await s.api('PATCH', `/reports/answerQuestion/${primeiro.id}`, { token: tokens.colab, body: { answerId: top(primeiro).id, answerText: 'ok', fileIds: [up.body.id] } });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.answeredByRole, 'EMPLOYEE');

    // Consultor preenche pela empresa vinculada; autoria registrada como consultor.
    for (const item of resto) {
      const r = await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: tokens.consultor, body: { answerId: top(item).id, answerText: 'ok' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.answeredByRole, 'CONSULTOR');
    }
    for (const item of items) assert.equal((await s.api('POST', `/reports/validateanswer/${item.id}`, { token: tokens.gestor, body: { veredict: true } })).status, 201);
  });

  await t.test('ACE02 — empresa A (demo) não alcança dados nem arquivos da empresa de homologação', async () => {
    const outro = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', `/companies/${company.id}`, { token: outro })).status, 403);
    assert.equal((await s.api('GET', `/reports/${reportId}`, { token: outro })).status, 403);
    assert.equal((await s.api('GET', `/reports/company/questions/${reportId}`, { token: outro })).status, 403);
    assert.equal((await s.api('GET', `/uploads/companyFiles/${company.id}/licenca-homolog.pdf`, { token: outro })).status, 403);
    assert.equal((await s.api('GET', `/reports/${reportId}/pendings`, { token: outro })).status, 403);
    const busca = (await s.api('GET', '/companies?bussinessName=Homolog', { token: outro })).body;
    assert.equal(busca.data.length, 0, 'busca não revela a outra empresa');
  });

  await t.test('liberação pela Administração, auditoria, conclusão e aprovação', async () => {
    assert.equal((await s.api('POST', `/reports/requestAudit/${company.id}`, { token: tokens.gestor })).status, 201);
    assert.equal((await s.api('POST', `/reports/releaseAudit/${company.id}`, { token: admin })).status, 201);
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: tokens.auditor })).body;
    for (const item of items)
      assert.equal((await s.api('POST', `/auditory/evaluatequestion/${item.id}`, { token: tokens.auditor, body: { status: 'Approved', redflag: 'comprovado' } })).status, 201);
    assert.equal((await s.api('POST', `/auditory/submitToSupervisor/${company.id}`, { token: tokens.auditor })).status, 201);
    assert.equal((await s.api('POST', `/auditory/finishAuditory/${company.id}`, { token: admin })).status, 403);
    const fim = await s.api('POST', `/auditory/finishAuditory/${company.id}`, { token: tokens.supervisor });
    assert.equal(fim.status, 201);
    assert.equal(fim.body.publication.status, 'available');
    assert.equal(fim.body.publication.eligible, true);
  });

  await t.test('ACE13 — documentos liberados automaticamente; números iguais', async () => {
    const result = (await s.api('GET', `/reports/${reportId}/result`, { token: tokens.gestor })).body;
    const pub = (await s.api('GET', `/reports/${reportId}/publication`, { token: tokens.gestor })).body;
    assert.equal(pub.rating, result.rating);
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: tokens.gestor })).status, 200);
  });

  await t.test('ACE05/ACE15 — trocar caderno e recertificar não reescrevem o ciclo concluído', async () => {
    const before = (await s.api('GET', `/reports/${reportId}/result/history`, { token: admin })).body;
    assert.equal((await s.api('PATCH', `/companies/${company.id}`, { token: admin, body: { section: 'C' } })).status, 200);
    const ciclo1 = (await s.api('GET', `/reports/${reportId}`, { token: admin })).body;
    assert.equal(ciclo1.section, 'B', 'o ciclo concluído mantém o caderno');
    assert.deepEqual((await s.api('GET', `/reports/${reportId}/result/history`, { token: admin })).body, before, 'resultado não recalculado');

    assert.equal((await s.api('POST', `/reports/company/${company.id}/cycles`, { token: tokens.gestor })).status, 403, 'só a Administração abre ciclo');
    const novo = await s.api('POST', `/reports/company/${company.id}/cycles`, { token: admin });
    assert.equal(novo.status, 201);
    assert.equal(novo.body.cycle, 2);
    assert.equal(novo.body.previousReportId, reportId);
    assert.equal(novo.body.section, 'C', 'o novo ciclo usa o caderno atual');
    assert.equal((await s.api('POST', `/reports/company/${company.id}/cycles`, { token: admin })).status, 409, 'um ciclo em andamento por vez');
    assert.equal((await s.api('GET', `/reports/${reportId}/publication`, { token: tokens.gestor })).status, 200, 'documentos do ciclo anterior continuam');
  });

  await t.test('ACE03 — remover vínculo retira o acesso', async () => {
    const link = (await s.api('GET', `/users/${people.consultor.id}`, { token: admin })).body.links.find((l) => l.companyId === company.id);
    const del = await s.api('DELETE', `/users/${people.consultor.id}/links/${link.id}`, { token: admin });
    assert.ok([200, 204].includes(del.status), JSON.stringify(del.body));
    // A remoção do vínculo também encerra as sessões da pessoa: 401 (sessão revogada) ou 403.
    assert.ok([401, 403].includes((await s.api('GET', `/reports/${reportId}`, { token: tokens.consultor })).status));
    const novaSessao = await s.login('consultor@homolog.local', PASS);
    assert.equal((await s.api('GET', `/reports/${reportId}`, { token: novaSessao })).status, 403, 'mesmo com sessão nova, sem vínculo não há acesso');
  });

  await t.test('ACE04 — conta inativa não entra; papel não vem do navegador', async () => {
    assert.equal((await s.api('DELETE', `/users/${people.colab.id}`, { token: admin })).status, 200);
    assert.equal((await s.api('POST', '/auth/login', { body: { email: 'colab@homolog.local', password: PASS } })).status, 401);
    // Cookie/campo "role" no cliente não muda nada: os perfis vêm do banco a cada requisição.
    const tentativa = await fetch(`${s.base}/users`, { headers: { Authorization: `Bearer ${tokens.gestor}`, Cookie: 'userRole=ADMIN' } });
    assert.equal(tentativa.status, 403);
  });
});
