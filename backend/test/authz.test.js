const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown, DEMO_PASSWORD } = require('./helpers');

/**
 * Matriz de negação: duas empresas, dois ciclos, acesso direto por id, arquivo e exportação,
 * colaborador sem atribuição, profissional com vários vínculos, autoatribuição, remoção de
 * vínculo, conta inativa, alteração de perfil, acúmulo ADMIN + CONSULTOR, ADMIN isolado sem
 * aprovação, sessão revogada e recuperação reutilizada.
 */
test('autorização: escopo, vínculos, contexto e negações', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();

  await t.test('duas empresas e dois ciclos por empresa', async () => {
    // Conclui o ciclo 1 da empresa B para abrir o ciclo 2 (recertificação).
    const reportB1 = await s.reportIdOf('demo-company-b');
    await s.db.run("UPDATE reports SET status = 'Audited' WHERE id = ?", reportB1);
    const company = await s.db.one('SELECT * FROM companies WHERE id = ?', 'demo-company-b');
    const { createCycleForCompany } = require('../src/services');
    const reportB2 = await createCycleForCompany(company, { createdById: await s.userId('admin@esgdemo.com.br') });

    const cycles = await s.api('GET', '/reports/company/demo-company-b/cycles', { token: admin });
    assert.equal(cycles.status, 200);
    assert.deepEqual(cycles.body.map((c) => c.cycle), [1, 2]);
    assert.equal(cycles.body[1].previousReportId, reportB1, 'o ciclo novo aponta para o anterior');
    assert.equal(cycles.body[1].id, reportB2);
    // Um ciclo em andamento impede abrir outro.
    await assert.rejects(() => createCycleForCompany(company, {}), /ciclo em andamento/);
  });

  await t.test('acesso direto por id: empresa A não alcança a empresa B', async () => {
    const gestorA = await s.login('gestor@esgdemo.com.br');
    const reportB = await s.reportIdOf('demo-company-b');
    const itemB = (await s.db.one('SELECT id FROM question_reports WHERE reportId = ?', reportB)).id;

    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: gestorA })).status, 403);
    assert.equal((await s.api('GET', `/reports/${reportB}`, { token: gestorA })).status, 403);
    assert.equal((await s.api('GET', `/reports/company/questions/${reportB}`, { token: gestorA })).status, 403);
    assert.equal((await s.api('GET', `/reports/questionReports/${itemB}`, { token: gestorA })).status, 403);
    assert.equal((await s.api('GET', '/reports/company/demo-company-b/cycles', { token: gestorA })).status, 403);
    assert.equal((await s.api('GET', '/companies/get/files?companyId=demo-company-b', { token: gestorA })).status, 403);
    // Exportação da listagem também é escopada.
    const lista = await s.api('GET', '/companies?nonPaginate=true', { token: gestorA });
    assert.deepEqual(lista.body.data.map((c) => c.id), ['demo-company-a']);
  });

  await t.test('arquivo: download verifica empresa e atribuição do indicador', async () => {
    const gestorA = await s.login('gestor@esgdemo.com.br');
    const funcionario = await s.login('funcionario@esgdemo.com.br');
    const gestorB = await s.login('gestor.exemplo@esgdemo.com.br');

    const itemsA = (await s.api('GET', '/reports/company/questions/', { token: gestorA })).body;
    const [primeiro, segundo] = itemsA;
    await s.api('PATCH', `/reports/addanswerer/${primeiro.id}`, { token: gestorA, body: { user: await s.userId('funcionario@esgdemo.com.br') } });

    const form = new FormData();
    form.append('companyId', 'demo-company-a');
    form.append('file', new Blob([Buffer.from('evidencia')]), 'evidencia-a.pdf');
    const up = await s.api('POST', '/uploads/companyFile', { token: gestorA, form });
    assert.equal(up.status, 201);
    // Vinculada a um indicador que NÃO é do colaborador, e fora do GED.
    await s.api('PATCH', `/reports/answerQuestion/${segundo.id}`, {
      token: gestorA,
      body: { answerId: segundo.question.answers[0].id, filesToCreate: [up.body] },
    });

    assert.equal((await s.api('GET', `/${up.body.url}`, { token: gestorA })).status, 200);
    assert.equal((await s.api('GET', `/${up.body.url}`, { token: gestorB })).status, 403, 'empresa B não baixa arquivo da empresa A');
    assert.equal((await s.api('GET', `/${up.body.url}`, { token: funcionario })).status, 403, 'colaborador não baixa arquivo de indicador que não é seu');
    assert.equal((await s.api('GET', `/${up.body.url}`)).status, 401);
  });

  await t.test('colaborador não recebe acesso implícito a indicador sem responsável', async () => {
    const funcionario = await s.login('funcionario@esgdemo.com.br');
    const itemsA = (await s.api('GET', '/reports/company/questions/', { token: await s.login('gestor@esgdemo.com.br') })).body;
    const semResponsavel = itemsA.find((i) => !i.answerer);
    assert.ok(semResponsavel, 'há indicador sem responsável no ciclo');
    assert.equal((await s.api('GET', `/reports/questionReports/${semResponsavel.id}`, { token: funcionario })).status, 403);
    const r = await s.api('PATCH', `/reports/answerQuestion/${semResponsavel.id}`, {
      token: funcionario,
      body: { answerId: semResponsavel.question.answers[0].id },
    });
    assert.equal(r.status, 403);
  });

  await t.test('autoatribuição é bloqueada', async () => {
    const funcionario = await s.login('funcionario@esgdemo.com.br');
    const itemsA = (await s.api('GET', '/reports/company/questions/', { token: await s.login('gestor@esgdemo.com.br') })).body;
    const alvo = itemsA[2];
    const r = await s.api('PATCH', `/reports/addanswerer/${alvo.id}`, { token: funcionario, body: { user: await s.userId('funcionario@esgdemo.com.br') } });
    assert.equal(r.status, 403, 'colaborador não delega indicador (nem para si)');
    // Consultor também não delega: a delegação é do gestor (ver docs/esg/regras.md).
    const consultor = await s.login('consultor@esgdemo.com.br');
    assert.equal((await s.api('PATCH', `/reports/addanswerer/${alvo.id}`, { token: consultor, body: { user: await s.userId('funcionario@esgdemo.com.br') } })).status, 403);
    // E o gestor só delega a quem tem vínculo vigente com a empresa.
    const gestorA = await s.login('gestor@esgdemo.com.br');
    const forasteiro = await s.api('PATCH', `/reports/addanswerer/${alvo.id}`, {
      token: gestorA,
      body: { user: await s.userId('gestor.exemplo@esgdemo.com.br') },
    });
    assert.equal(forasteiro.status, 400);
  });

  await t.test('profissional com vários vínculos troca de contexto sem ampliar acesso', async () => {
    const r = await s.session('consultor@esgdemo.com.br', DEMO_PASSWORD);
    assert.equal(r.user.links.length, 2);
    const options = await s.api('GET', '/auth/context/options', { token: r.token });
    assert.deepEqual(options.body.map((o) => o.companyId).sort(), ['demo-company-a', 'demo-company-b']);

    const trocaB = await s.api('PATCH', '/auth/context', { token: r.token, body: { companyId: 'demo-company-b' } });
    assert.equal(trocaB.status, 200);
    assert.equal(trocaB.body.companyId, 'demo-company-b');
    const listaB = await s.api('GET', '/reports/company/questions/', { token: r.token });
    assert.ok(listaB.body.every((i) => i.report.companyId === 'demo-company-b'), 'sem dados da empresa anterior');

    const trocaA = await s.api('PATCH', '/auth/context', { token: r.token, body: { companyId: 'demo-company-a' } });
    assert.equal(trocaA.body.companyId, 'demo-company-a');
    const listaA = await s.api('GET', '/reports/company/questions/', { token: r.token });
    assert.ok(listaA.body.every((i) => i.report.companyId === 'demo-company-a'));

    // Empresa sem vínculo não entra no contexto, mesmo existindo.
    const nova = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Terceira Ltda', bussinessName: 'Terceira', email: 't@t.com', cnpj: '11444777000161', accessDate: '2024-08-01', size: 'MEDIA', section: 'E' },
    });
    assert.equal(nova.status, 201);
    const semVinculo = await s.api('PATCH', '/auth/context', { token: r.token, body: { companyId: nova.body.id } });
    assert.equal(semVinculo.status, 403);
    assert.equal((await s.api('GET', `/companies/${nova.body.id}`, { token: r.token })).status, 403);
  });

  await t.test('remoção de vínculo retira o acesso na requisição seguinte', async () => {
    const consultor = await s.session('consultor@esgdemo.com.br', 'nova-consultor-1').catch(() => null);
    const sess = consultor || (await s.session('consultor@esgdemo.com.br', DEMO_PASSWORD));
    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: sess.token })).status, 200);

    const userId = await s.userId('consultor@esgdemo.com.br');
    const links = (await s.api('GET', `/users/${userId}`, { token: admin })).body.links;
    const linkB = links.find((l) => l.companyId === 'demo-company-b');
    const revoga = await s.api('DELETE', `/users/${userId}/links/${linkB.id}`, { token: admin });
    assert.equal(revoga.status, 200);

    // A sessão anterior foi revogada (permissões carregadas não continuam valendo).
    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: sess.token })).status, 401);
    const novo = await s.session('consultor@esgdemo.com.br', DEMO_PASSWORD);
    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: novo.token })).status, 403);
    assert.equal((await s.api('GET', '/companies/demo-company-a', { token: novo.token })).status, 200);
  });

  await t.test('conta inativa não entra e perde a sessão', async () => {
    const sess = await s.session('gestor.exemplo@esgdemo.com.br');
    const userId = await s.userId('gestor.exemplo@esgdemo.com.br');
    assert.equal((await s.api('DELETE', `/users/${userId}`, { token: admin })).status, 200);
    assert.equal((await s.api('GET', '/auth/me', { token: sess.token })).status, 401);
    const login = await s.api('POST', '/auth/login', { body: { email: 'gestor.exemplo@esgdemo.com.br', password: DEMO_PASSWORD } });
    assert.equal(login.status, 401);
    await s.api('POST', `/users/${userId}/activate`, { token: admin });
  });

  await t.test('alteração de perfil muda o que a pessoa pode fazer', async () => {
    const userId = await s.userId('gestor.exemplo@esgdemo.com.br');
    const antes = await s.session('gestor.exemplo@esgdemo.com.br');
    assert.equal((await s.api('GET', '/users', { token: antes.token })).status, 403);

    assert.equal((await s.api('PUT', `/users/${userId}/profiles`, { token: admin, body: { roles: ['EMPLOYEE'] } })).status, 200);
    assert.equal((await s.api('GET', '/auth/me', { token: antes.token })).status, 401, 'sessão revogada ao mudar o perfil');
    await s.api('POST', `/users/${userId}/links`, { token: admin, body: { companyId: 'demo-company-b', role: 'EMPLOYEE' } });
    const depois = await s.session('gestor.exemplo@esgdemo.com.br');
    assert.deepEqual(depois.user.roles, ['EMPLOYEE']);
    // Como colaborador, não valida respostas nem solicita auditoria.
    const itemB = (await s.db.one('SELECT id FROM question_reports WHERE reportId = ?', await s.reportIdOf('demo-company-b'))).id;
    assert.equal((await s.api('POST', `/reports/validateanswer/${itemB}`, { token: depois.token, body: { veredict: true } })).status, 403);
    assert.equal((await s.api('POST', '/reports/requestAudit/demo-company-b', { token: depois.token })).status, 403);
  });

  await t.test('ADMIN + CONSULTOR age como consultor nos vínculos e nunca aprova', async () => {
    const sess = await s.session('admin.consultor@esgdemo.com.br');
    assert.deepEqual(sess.user.roles.sort(), ['ADMIN', 'CONSULTOR']);
    // Função efetivamente exercida: consultor na empresa vinculada (autoria registrada).
    const reportB = await s.reportIdOf('demo-company-b');
    const itemB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: sess.token })).body[0];
    const resposta = await s.api('PATCH', `/reports/answerQuestion/${itemB.id}`, {
      token: sess.token,
      body: { answerId: itemB.question.answers[0].id, answerText: 'preenchido pela consultoria' },
    });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.answeredByRole, 'CONSULTOR');
    assert.equal(resposta.body.answeredBy.email, 'admin.consultor@esgdemo.com.br');

    // Mesmo acumulando ADMIN, não recebe poder de auditoria nem de supervisão.
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemB.id}`, { token: sess.token, body: { status: 'Approved', redflag: 'x' } })).status, 403);
    assert.equal((await s.api('POST', '/auditory/finishAuditory/demo-company-b', { token: sess.token })).status, 403);
    // E continua administrando cadastros.
    assert.equal((await s.api('GET', '/users?page=1', { token: sess.token })).status, 200);
  });

  await t.test('ADMIN isolado: acesso operacional amplo, nenhuma aprovação', async () => {
    const reportB = await s.reportIdOf('demo-company-b');
    const itemB = (await s.api('GET', `/reports/company/questions/${reportB}`, { token: admin })).body[1];
    // Preenche em nome da empresa, com autoria.
    const resposta = await s.api('PATCH', `/reports/answerQuestion/${itemB.id}`, { token: admin, body: { answerId: itemB.question.answers[0].id } });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.answeredByRole, 'ADMIN');
    // Não valida, não audita, não aprova resultado, não decide aplicabilidade.
    assert.equal((await s.api('POST', `/reports/validateanswer/${itemB.id}`, { token: admin, body: { veredict: true } })).status, 403);
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemB.id}`, { token: admin, body: { status: 'Approved', redflag: 'x' } })).status, 403);
    assert.equal((await s.api('POST', `/auditory/nonApplicable/${itemB.id}`, { token: admin })).status, 403);
    assert.equal((await s.api('POST', '/auditory/finishAuditory/demo-company-b', { token: admin })).status, 403);
  });

  await t.test('auditor precisa de designação no ciclo, não só de vínculo', async () => {
    const auditor = await s.session('auditor@esgdemo.com.br');
    const reportA = await s.reportIdOf('demo-company-a');
    await s.db.run("UPDATE reports SET status = 'Auditing' WHERE id = ?", reportA);
    const itemA = (await s.db.one('SELECT id FROM question_reports WHERE reportId = ?', reportA)).id;
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemA}`, { token: auditor.token, body: { status: 'Approved', redflag: 'ok' } })).status, 201);

    // Sem designação no ciclo: vínculo com a empresa não basta.
    const novoAuditor = await s.api('POST', '/users', {
      token: admin,
      body: { name: 'Auditor Sem Designação', email: 'auditor.semdesignacao@x.com', password: 'senha-123', roles: ['AUDITOR'], companyIds: ['demo-company-a'] },
    });
    assert.equal(novoAuditor.status, 201);
    const sem = await s.session('auditor.semdesignacao@x.com', 'senha-123');
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemA}`, { token: sem.token, body: { status: 'Approved', redflag: 'ok' } })).status, 403);
    assert.equal((await s.api('GET', `/reports/${reportA}`, { token: sem.token })).status, 403);

    const designa = await s.api('POST', `/reports/${reportA}/professionals`, { token: admin, body: { userId: novoAuditor.body.id, role: 'AUDITOR' } });
    assert.equal(designa.status, 201);
    assert.equal((await s.api('GET', `/reports/${reportA}`, { token: sem.token })).status, 200);
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemA}`, { token: sem.token, body: { status: 'Approved', redflag: 'ok' } })).status, 201);

    const remove = await s.api('DELETE', `/reports/${reportA}/professionals/${novoAuditor.body.id}`, { token: admin });
    assert.equal(remove.status, 200);
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${itemA}`, { token: sem.token, body: { status: 'Approved', redflag: 'ok' } })).status, 403);
    await s.db.run("UPDATE reports SET status = 'Pending' WHERE id = ?", reportA);
  });

  await t.test('o mesmo profissional não acumula consultor e auditor na mesma empresa', async () => {
    const consultorId = await s.userId('consultor@esgdemo.com.br');
    const reportA = await s.reportIdOf('demo-company-a');
    const r = await s.api('POST', `/reports/${reportA}/professionals`, { token: admin, body: { userId: consultorId, role: 'AUDITOR' } });
    assert.equal(r.status, 400, 'sem vínculo de auditor não há designação');
  });

  await t.test('registros legados ficam listados para revisão da Administração', async () => {
    const review = await s.api('GET', '/admin/review', { token: admin });
    assert.equal(review.status, 200);
    assert.ok(review.body.companies.some((c) => c.origin === 'demo'), 'empresas de demonstração marcadas');
    // O esquema MySQL nasce consolidado; o histórico SQLite fica registrado à parte.
    assert.deepEqual(review.body.migrations.map((m) => m.id), ['mysql_001_baseline']);
    assert.ok(review.body.legacySqliteHistory.length >= 9, 'histórico da base anterior continua declarado');
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('GET', '/admin/review', { token: gestor })).status, 403);
  });

  await t.test('matriz de permissões publicada bate com a implementação', async () => {
    const r = await s.api('GET', '/admin/permissions', { token: admin });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.allowedAccumulation.sort(), ['ADMIN', 'CONSULTOR']);
    assert.deepEqual(r.body.actions['supervision.approve'].roles, ['SUPERVISOR']);
    assert.deepEqual(r.body.actions['audit.evaluate'].roles, ['AUDITOR']);
    assert.deepEqual(r.body.actions['cycle.releaseAudit'].roles, ['ADMIN']);
    assert.deepEqual(r.body.actions['cycle.requestAudit'].roles, ['MANAGER']);
    assert.deepEqual(r.body.actions['cycle.return'].roles, ['CONSULTOR', 'ADMIN']);
    assert.ok(!r.body.actions['supervision.approve'].roles.includes('ADMIN'));
  });
});
