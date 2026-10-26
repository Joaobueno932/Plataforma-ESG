const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');

test('módulo empresas', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();

  await t.test('listagem paginada com progresso real e filtros', async () => {
    const r = await s.api('GET', '/companies?page=1&perPage=50', { token: admin });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body).sort(), ['contentCount', 'data', 'nextPage', 'numberOfPages', 'page', 'previousPage']);
    assert.equal(r.body.nextPage, 'no next page');
    const row = r.body.data[0];
    assert.deepEqual(Object.keys(row).sort(), ['accessDate', 'avatar', 'bussinessName', 'cnpj', 'id', 'legalName', 'report', 'section', 'size', 'status']);
    // Nenhum indicador respondido ainda: respondidos = 0 e total = 8 (6 gerais + 2 do setorial).
    assert.equal(row.report._count.answeredQuestions, 0);
    assert.equal(row.report._count.totalQuestions, 8);

    const porPorte = await s.api('GET', '/companies?size=GRANDE&perPage=50', { token: admin });
    assert.deepEqual(porPorte.body.data.map((c) => c.bussinessName), ['Indústria Exemplo']);
    const porCaderno = await s.api('GET', '/companies?section=A&perPage=50', { token: admin });
    assert.deepEqual(porCaderno.body.data.map((c) => c.bussinessName), ['Empresa Demonstração']);
  });

  await t.test('cadastro valida CNPJ (dígitos verificadores) e abre o ciclo 1', async () => {
    const invalido = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'X', bussinessName: 'X', email: 'x@x.com', cnpj: '12345678000100', accessDate: '2024-08-01', size: 'MEDIA', section: 'C' },
    });
    assert.equal(invalido.status, 400);
    assert.match(invalido.body.message, /CNPJ inválido/);

    const r = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Nova Ltda', bussinessName: 'Nova', email: 'N@N.com', cnpj: '12.345.678/0001-95', accessDate: '2024-08-01', size: 'MICRO_PEQUENA', section: 'C' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.cnpj, '12345678000195'); // texto sem máscara
    assert.equal(r.body.email, 'n@n.com'); // e-mail normalizado
    assert.equal(r.body.status, 'ACTIVE');
    assert.equal(r.body.origin, 'registered');
    assert.equal(r.body.report.cycle, 1);
    assert.equal(r.body.report.section, 'C');
    assert.equal(r.body.report.catalogVersion, 'legacy-demo');
    assert.equal(r.body.report.structure, 'Programa ESG-FIEMS (Setorial C)');
    const qs = await s.api('GET', `/reports/company/questions/${r.body.report.id}`, { token: admin });
    assert.deepEqual([...new Set(qs.body.map((q) => q.question.section))].sort(), ['All', 'C']);

    const dup = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'X', bussinessName: 'X', email: 'x@x.com', cnpj: '12345678000195', accessDate: '2024-08-01', size: 'MEDIA', section: 'C' },
    });
    assert.equal(dup.status, 409);
    assert.match(dup.body.message, /edite o cadastro existente/);
  });

  await t.test('busca, edição com histórico e inativação que preserva a avaliação', async () => {
    const search = await s.api('GET', '/companies?page=1&perPage=50&bussinessName=nova', { token: admin });
    assert.equal(search.body.data.length, 1);
    const id = search.body.data[0].id;

    // Logo só por envio de arquivo (POST /companies/:id/logo): URL nova é recusada.
    assert.equal((await s.api('PATCH', `/companies/${id}`, { token: admin, body: { avatar: 'https://x/y.png' } })).status, 400);
    const upd = await s.api('PATCH', `/companies/${id}`, { token: admin, body: { bussinessName: 'Nova Editada' } });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.bussinessName, 'Nova Editada');
    const events = await s.api('GET', `/admin/events?entity=companies&entityId=${id}`, { token: admin });
    assert.ok(events.body.some((e) => e.action === 'company.update' && e.details.before.bussinessName === 'Nova'));

    const del = await s.api('DELETE', `/companies/${id}`, { token: admin });
    assert.equal(del.status, 200);
    assert.equal(del.body.inactivated, true);
    const after = await s.api('GET', `/companies/${id}`, { token: admin });
    assert.equal(after.status, 200);
    assert.equal(after.body.status, 'INACTIVE');
    // A avaliação continua existindo (nada é apagado em cascata).
    assert.equal(after.body.cycles.length, 1);
  });

  await t.test('troca de caderno vale para a próxima avaliação; ciclo existente mantém o seu', async () => {
    const before = await s.api('GET', '/companies/demo-company-a', { token: admin });
    assert.equal(before.body.report.section, 'A');
    const upd = await s.api('PATCH', '/companies/demo-company-a', { token: admin, body: { section: 'D' } });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.section, 'D');
    assert.equal(upd.body.report.section, 'A', 'o ciclo em andamento conserva o caderno com que foi aberto');
    await s.api('PATCH', '/companies/demo-company-a', { token: admin, body: { section: 'A' } });
  });

  await t.test('escopo: cada perfil só enxerga as empresas com vínculo vigente', async () => {
    const gestor = await s.login('gestor@esgdemo.com.br');
    const lista = await s.api('GET', '/companies?page=1&perPage=50', { token: gestor });
    assert.equal(lista.status, 200);
    assert.deepEqual(lista.body.data.map((c) => c.id), ['demo-company-a']);
    assert.equal((await s.api('GET', '/companies/demo-company-a', { token: gestor })).status, 200);
    assert.equal((await s.api('GET', '/companies/demo-company-b', { token: gestor })).status, 403);

    const light = await s.api('GET', '/companies/light/all', { token: gestor });
    assert.deepEqual(light.body.map((c) => c.id), ['demo-company-a']);

    // Administração sem vínculo não tem empresa em contexto: precisa informar qual.
    const semContexto = await s.api('GET', '/companies/get/files', { token: admin });
    assert.equal(semContexto.status, 400);
    assert.equal((await s.api('GET', '/companies/get/files?companyId=demo-company-a', { token: admin })).status, 200);
  });
});
