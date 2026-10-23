const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');

/**
 * Editor do catálogo: a Administração edita, exclui e inclui indicadores e alternativas, muda
 * as cores dos cartões e cria um caderno setorial do zero — sempre em uma edição em rascunho,
 * sem tocar a versão publicada nem os ciclos já abertos.
 */
test('editor do catálogo com versionamento', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');

  const ANSWERS = [
    { title: 'Não conforme', points: 0, description: 'Não há programa de reúso.' },
    { title: 'Iniciante', points: 0, description: 'Mapeamento inicial do consumo.', mandatory: true },
    { title: 'Consciente', points: 6, description: 'Metas de redução definidas.' },
    { title: 'Engajada', points: 10, description: 'Reúso implantado e monitorado.', color: '#1f8a3c' },
  ];

  let edition;
  let indicatorId;

  await t.test('somente a Administração usa o editor', async () => {
    assert.equal((await s.api('POST', '/catalog/editions', { token: gestor, body: {} })).status, 403);
  });

  await t.test('nova edição copia a versão em vigor, com cores oficiais nos cartões', async () => {
    const r = await s.api('POST', '/catalog/editions', { token: admin, body: { label: 'edicao-teste' } });
    assert.equal(r.status, 201);
    edition = r.body.version;
    assert.equal(edition.status, 'draft');
    assert.equal(edition.origin, 'edited');
    assert.equal(edition.editable, true);
    assert.equal(r.body.indicators.length, 22, 'todos os indicadores da versão de origem');
    const naoConforme = r.body.indicators[0].question?.answers ?? r.body.indicators[0].answers;
    const first = naoConforme.find((a) => /conforme/i.test(a.title) && a.points === 0);
    assert.equal(first.color, '#D2232A', 'cor oficial do caderno para "Não conforme"');
    assert.equal(first.colorSource, 'caderno');
    assert.equal((await s.api('POST', '/catalog/editions', { token: admin, body: { label: 'edicao-teste' } })).status, 409, 'rótulo único');
  });

  await t.test('cria um caderno setorial do zero e um indicador com cartões coloridos', async () => {
    assert.equal((await s.api('POST', `/catalog/editor/${edition.id}/sections`, { token: admin, body: { section: 'all', name: 'x' } })).status, 400);
    const caderno = await s.api('POST', `/catalog/editor/${edition.id}/sections`, { token: admin, body: { section: 'I', name: 'Saneamento e Reúso' } });
    assert.equal(caderno.status, 201);
    assert.ok(caderno.body.sections.some((sec) => sec.section === 'I' && sec.name === 'Saneamento e Reúso'));

    const r = await s.api('POST', `/catalog/editor/${edition.id}/indicators`, {
      token: admin,
      body: { section: 'I', category: 'E', title: 'Reúso de água', description: 'A indústria mantém programa de reúso de água.', verification: 'Medições mensais.', topic: 'Água', answers: ANSWERS },
    });
    assert.equal(r.status, 201);
    indicatorId = r.body.id;
    const criado = r.body.indicators.find((i) => i.id === indicatorId);
    assert.equal(criado.code, 'I-E01', 'código gerado pelo caderno e eixo');
    assert.equal(criado.maxPoints, 10);
    assert.equal(criado.hasMandatory, true);
    assert.equal(criado.answers.find((a) => a.title === 'Iniciante').mandatory, true);
    assert.deepEqual(criado.answers.map((a) => a.color), ['#D2232A', '#6E7D8F', '#FFBC24', '#1F8A3C']);
    assert.equal(criado.answers[3].colorSource, 'administracao', 'cor escolhida pela Administração prevalece');
  });

  await t.test('valida as alternativas no servidor', async () => {
    const tenta = (answers) => s.api('PATCH', `/catalog/editor/indicators/${indicatorId}`, { token: admin, body: { answers } });
    assert.equal((await tenta(ANSWERS.slice(0, 1))).status, 400, 'mínimo de 2 alternativas');
    assert.equal((await tenta([...ANSWERS, { ...ANSWERS[0] }])).status, 400, 'nome repetido');
    assert.equal((await tenta(ANSWERS.map((a) => ({ ...a, mandatory: true })))).status, 400, 'um único mínimo obrigatório');
    assert.equal((await tenta([{ ...ANSWERS[0], color: 'vermelho' }, ANSWERS[1]])).status, 400, 'cor no formato #RRGGBB');
    assert.equal((await tenta([{ title: 'Não se aplica', points: 0, description: 'x' }, ANSWERS[1]])).status, 400, 'NA não é alternativa');
  });

  await t.test('edita texto, cores e alternativas; exclui indicador', async () => {
    const atual = (await s.api('GET', `/catalog/editor/${edition.id}`, { token: admin })).body.indicators.find((i) => i.id === indicatorId);
    const novas = atual.answers.map((a) => ({ ...a, color: a.title === 'Consciente' ? '#FFBC24' : a.color }));
    novas.splice(1, 1); // remove "Iniciante"
    const r = await s.api('PATCH', `/catalog/editor/indicators/${indicatorId}`, {
      token: admin,
      body: { title: 'Reúso e eficiência hídrica', answers: novas },
    });
    assert.equal(r.status, 200);
    const editado = r.body.indicators.find((i) => i.id === indicatorId);
    assert.equal(editado.title, 'Reúso e eficiência hídrica');
    assert.equal(editado.answers.length, 3);
    assert.equal(editado.hasMandatory, false, 'sem o mínimo removido, o indicador fica sem obrigatório');
    assert.equal(editado.answers[0].id, atual.answers[0].id, 'alternativas mantidas preservam o id');

    const extra = await s.api('POST', `/catalog/editor/${edition.id}/indicators`, {
      token: admin,
      body: { section: 'I', category: 'S', title: 'Comunidade', description: 'Ações locais.', answers: ANSWERS.slice(0, 2) },
    });
    assert.equal(extra.status, 201);
    const removido = await s.api('DELETE', `/catalog/editor/indicators/${extra.body.id}`, { token: admin });
    assert.equal(removido.status, 200);
    assert.ok(!removido.body.indicators.some((i) => i.id === extra.body.id));
  });

  await t.test('descartar uma edição em rascunho remove tudo, inclusive mínimos obrigatórios', async () => {
    const extra = await s.api('POST', '/catalog/editions', { token: admin, body: { label: 'edicao-descartavel' } });
    assert.equal(extra.status, 201);
    const descarta = await s.api('DELETE', `/catalog/versions/${extra.body.version.id}`, { token: admin });
    assert.equal(descarta.status, 200, JSON.stringify(descarta.body));
  });

  await t.test('publicar a edição vale para ciclos novos; ciclos abertos mantêm a versão deles', async () => {
    const reportA = await s.reportIdOf('demo-company-a');
    const antes = (await s.api('GET', `/reports/${reportA}`, { token: admin })).body.catalogVersionId;

    const publica = await s.api('POST', `/catalog/versions/${edition.id}/publish`, { token: admin, body: {} });
    assert.equal(publica.status, 201);
    assert.equal(publica.body.status, 'published');

    assert.equal((await s.api('GET', `/reports/${reportA}`, { token: admin })).body.catalogVersionId, antes, 'ciclo aberto não muda de versão');
    const editavel = await s.api('PATCH', `/catalog/editor/indicators/${indicatorId}`, { token: admin, body: { title: 'x' } });
    assert.equal(editavel.status, 409, 'versão publicada não é editada');

    // Empresa do caderno novo recebe Geral + caderno I da edição publicada.
    const sectors = (await s.api('GET', '/sectors', { token: admin })).body;
    assert.ok(sectors.some((sec) => sec.section === 'I'), 'o caderno novo passa a existir para cadastro de empresas');
    const empresa = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Saneamento Teste Ltda', bussinessName: 'Saneamento Teste', email: 'san@teste.com', cnpj: '12.345.678/0001-95', accessDate: '2026-10-01', size: 'MEDIA', section: 'I' },
    });
    assert.equal(empresa.status, 201);
    const itens = (await s.api('GET', `/reports/company/questions/${empresa.body.report.id}`, { token: admin })).body;
    assert.equal(itens.length, 6 + 1, '6 do Caderno Geral + 1 do caderno I');
    const reuso = itens.find((i) => i.question.code === 'I-E01');
    assert.equal(reuso.question.answers[2].color, '#1F8A3C');
  });
});
