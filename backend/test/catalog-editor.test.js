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

/**
 * Lápis "Editar maturidades" a partir de um indicador do ciclo: a edição vai para o mesmo
 * indicador na edição em rascunho; a versão congelada do ciclo e as respostas não mudam; publicada,
 * vale para ciclos novos de qualquer setor (Caderno Geral), sem duplicar o indicador.
 */
test('maturidades editadas a partir do indicador do ciclo', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');

  const itens = (await s.api('GET', '/reports/company/questions/', { token: gestor })).body;
  const geral = itens.find((i) => i.question.code === 'CG-E01');
  const outro = itens.find((i) => i.question.code === 'CG-S01');
  const ultimo = itens.find((i) => i.question.code === 'CG-G02');
  const antes = (await s.api('GET', `/reports/questionReports/${geral.id}`, { token: gestor })).body.question.answers;
  let draft;
  let indicator;

  await t.test('somente a Administração edita maturidades (proteção no servidor)', async () => {
    const r = await s.api('POST', `/catalog/editor/for-question/${geral.question.id}`, { token: gestor });
    assert.equal(r.status, 403);
  });

  await t.test('localiza o mesmo indicador na edição em rascunho, criada a partir da versão em vigor', async () => {
    const r = await s.api('POST', `/catalog/editor/for-question/${geral.question.id}`, { token: admin });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.created, true);
    assert.equal(r.body.version.status, 'draft');
    assert.equal(r.body.indicator.code, 'CG-E01');
    assert.equal(r.body.indicator.section, 'All', 'indicador do Caderno Geral');
    assert.notEqual(r.body.indicator.id, geral.question.id, 'não edita a versão congelada do ciclo');
    assert.ok(r.body.source.cycles >= 1, 'informa quantos ciclos usam a versão congelada');
    draft = r.body.version;
    indicator = r.body.indicator;

    const segundo = await s.api('POST', `/catalog/editor/for-question/${outro.question.id}`, { token: admin });
    assert.equal(segundo.status, 200);
    assert.equal(segundo.body.created, false);
    assert.equal(segundo.body.version.id, draft.id, 'reaproveita a edição em rascunho');
  });

  await t.test('"Conforme" recebe a cor oficial dos cadernos', async () => {
    const conforme = indicator.answers.find((a) => a.title === 'Conforme');
    assert.ok(conforme, 'o indicador de demonstração tem o nível Conforme');
    assert.equal(conforme.color, '#40AD49');
    assert.equal(conforme.colorSource, 'caderno');
  });

  await t.test('edita título, descrição, pontuação, cor; exclui, adiciona e reordena', async () => {
    const ordered = [...indicator.answers].sort((a, b) => a.position - b.position);
    const [primeiro, segundo, ...resto] = ordered;
    const removido = resto.pop();
    const novas = [
      { ...segundo, title: 'Iniciante revisado', description: 'Texto revisado.', points: 1, color: '#6E7D8F' },
      primeiro, // movido para a 2ª posição
      ...resto,
      { id: null, title: 'Exemplar', description: 'Nível acrescentado pela Administração.', points: 12, color: '#40AD49' },
    ].map(({ id, title, description, points, mandatory, color }) => ({ id, title, description, points, mandatory, color }));
    const r = await s.api('PATCH', `/catalog/editor/indicators/${indicator.id}`, { token: admin, body: { answers: novas } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const salvo = r.body.indicators.find((i) => i.id === indicator.id);
    const titles = [...salvo.answers].sort((a, b) => a.position - b.position).map((a) => a.title);
    assert.deepEqual(titles, ['Iniciante revisado', primeiro.title, ...resto.map((a) => a.title), 'Exemplar'], 'ordem gravada');
    assert.ok(!titles.includes(removido.title), 'nível excluído');
    const revisado = salvo.answers.find((a) => a.title === 'Iniciante revisado');
    assert.equal(revisado.id, segundo.id, 'nível editado preserva o id');
    assert.equal(revisado.points, 1);
    assert.equal(revisado.description, 'Texto revisado.');
    assert.equal(revisado.color, '#6E7D8F');
    assert.equal(salvo.maxPoints, 12, 'máximo recalculado');

    const copias = (await s.api('GET', `/catalog/editor/${draft.id}`, { token: admin })).body.indicators.filter((i) => i.code === 'CG-E01');
    assert.equal(copias.length, 1, 'nenhuma duplicação do indicador');
  });

  await t.test('o ciclo aberto continua com a versão congelada (respostas e pontuações preservadas)', async () => {
    const depois = (await s.api('GET', `/reports/questionReports/${geral.id}`, { token: gestor })).body.question.answers;
    assert.deepEqual(
      depois.map((a) => [a.id, a.title, a.points, a.description]),
      antes.map((a) => [a.id, a.title, a.points, a.description]),
    );
  });

  await t.test('indicador ausente na edição em rascunho é informado, não recriado', async () => {
    const naEdicao = (await s.api('GET', `/catalog/editor/${draft.id}`, { token: admin })).body.indicators.find((i) => i.code === 'CG-G02');
    assert.equal((await s.api('DELETE', `/catalog/editor/indicators/${naEdicao.id}`, { token: admin })).status, 200);
    const r = await s.api('POST', `/catalog/editor/for-question/${ultimo.question.id}`, { token: admin });
    assert.equal(r.status, 404);
    assert.match(r.body.message || r.body.error || '', /CG-G02/);
  });

  await t.test('publicada, a edição do Caderno Geral vale para empresas de qualquer setor', async () => {
    const publica = await s.api('POST', `/catalog/versions/${draft.id}/publish`, { token: admin, body: { acknowledge: true } });
    assert.equal(publica.status, 201, JSON.stringify(publica.body));
    const empresa = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Setor B Ltda', bussinessName: 'Setor B', email: 'setorb@teste.com', cnpj: '12.345.678/0001-95', accessDate: '2026-10-01', size: 'MEDIA', section: 'B' },
    });
    assert.equal(empresa.status, 201, JSON.stringify(empresa.body));
    const novos = (await s.api('GET', `/reports/company/questions/${empresa.body.report.id}`, { token: admin })).body;
    const cge01 = novos.filter((i) => i.question.code === 'CG-E01');
    assert.equal(cge01.length, 1);
    assert.ok(cge01[0].question.answers.some((a) => a.title === 'Exemplar'), 'ciclo novo recebe as maturidades editadas');
    const ainda = (await s.api('GET', `/reports/questionReports/${geral.id}`, { token: gestor })).body.question.answers;
    assert.ok(!ainda.some((a) => a.title === 'Exemplar'), 'ciclo antigo segue na versão dele');
  });
});
