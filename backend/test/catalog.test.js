const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, shutdown } = require('./helpers');
const { parseCatalog } = require('../src/catalog/parse');
const { readWorkbook } = require('../src/catalog/xlsx');

/**
 * Planilha oficial (fora do versionamento, por ser fonte do programa). Fica na pasta
 * `Documentação`; o nome antigo na raiz continua aceito. Sem o arquivo, os testes que dependem
 * dele não verificam nada — por isso `officialSource` é compartilhado com os demais testes.
 */
const { SOURCE, hasSource } = require('./fixtures/official-source');

/* ------------------------------------------------------------------ leitor */

test('leitor de XLSX preserva valores e zeros', () => {
  if (!hasSource) return;
  const workbook = readWorkbook(SOURCE);
  assert.ok(workbook.sheetNames.includes('Questionário'));
  const rows = workbook.sheets['Questionário'];
  const header = rows[0];
  assert.deepEqual(header.slice(0, 5), ['Caderno', 'Eixos', 'Tópicos', 'Códigos', 'codigo_ajustado']);
  // Célula vazia no meio da linha não desloca as colunas seguintes (J vazio, K preenchido).
  assert.deepEqual(rows[1].slice(7, 12), ['Não conforme', 0, null, 'Não', 16]);
  assert.deepEqual(rows[2].slice(7, 12), ['Iniciante', 0, 'Obrigatório', 'Sim', 16]);
  // Zero é número, não ausência.
  assert.equal(typeof rows[1][8], 'number');
  assert.equal(rows[1][8], 0);
});

/* ------------------------------------------------------------------ validação */

test('validação da planilha oficial: contagens, conferências e divergências', () => {
  if (!hasSource) return;
  const { indicators, report } = parseCatalog(SOURCE);

  assert.equal(report.errors.length, 0, JSON.stringify(report.errors.slice(0, 3)));
  assert.equal(report.counts.questionRows, 538, 'linhas de alternativa');
  assert.equal(report.counts.indicators, 139, 'indicadores únicos (agrupados por código, não por linha)');
  assert.equal(report.counts.general, 59);
  assert.equal(report.counts.sectoral, 80);
  assert.equal(report.counts.levels, 538);
  assert.equal(report.counts.mandatory, 50);
  assert.equal(report.counts.maxPointsTotal, 1250);
  assert.ok(report.conference.every((check) => check.ok), 'todas as conferências de contagem conferem com a especificação');
  assert.deepEqual(report.counts.levelsPerIndicator, { 2: 15, 3: 33, 4: 46, 5: 45 });

  // Máximos por caderno e eixo conferem com a aba "Pontuações".
  assert.equal(report.counts.maxPointsBySectionAxis['All/E'], 120);
  assert.equal(report.counts.maxPointsBySectionAxis['All/S'], 170);
  assert.equal(report.counts.maxPointsBySectionAxis['All/G'], 200);
  assert.equal(report.counts.maxPointsBySectionAxis['A/E'], 50);
  assert.equal(report.counts.maxPointsBySectionAxis['H/E'], 80);

  // Divergências entre as abas da própria fonte são registradas, não resolvidas por conta própria.
  const titles = report.divergences.filter((d) => d.kind === 'titulo-divergente');
  assert.ok(titles.length >= 4);
  assert.ok(titles.some((d) => d.code === 'GS04'), 'GS04: "Regularidade" × "Conformidade"');
  assert.ok(titles.some((d) => d.code === 'G1E01'), 'G1E01: "Aproveitamento energético" × "Recursos Naturais"');

  // Descrição do indicador e verificação não existem na planilha: ficam nulas e declaradas.
  assert.ok(report.missingSources.some((m) => /verifica/i.test(m.field)));
  assert.ok(indicators.every((i) => i.description === null && i.verification === null));
});

test('alternativas próprias de cada indicador, sem escala universal', () => {
  if (!hasSource) return;
  const { indicators } = parseCatalog(SOURCE);
  const byCode = new Map(indicators.map((i) => [i.code, i]));

  // Binário com nível "Conforme" de ZERO ponto que é o mínimo obrigatório.
  const binary = byCode.get('AS02');
  assert.equal(binary.levels.length, 2);
  assert.deepEqual(binary.levels.map((l) => [l.name, l.points, l.isMandatoryMinimum]), [
    ['Não conforme', 0, false],
    ['Conforme', 0, true],
  ]);
  assert.equal(binary.maxPoints, 0, 'indicador obrigatório pode valer zero ponto');
  assert.equal(binary.mandatory, true);
  assert.equal(binary.mandatoryPosition, 2);

  // Quatro alternativas.
  const four = byCode.get('AE02');
  assert.equal(four.levels.length, 4);
  assert.deepEqual(four.levels.map((l) => l.points), [0, 6, 8, 10]);
  assert.equal(four.mandatory, false);

  // Cinco alternativas.
  const five = byCode.get('AE01');
  assert.equal(five.levels.length, 5);
  assert.deepEqual(five.levels.map((l) => l.name), ['Não conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajada']);
  assert.deepEqual(five.levels.map((l) => l.points), [0, 4, 6, 8, 10]);

  // Mínimo obrigatório intermediário com pontos > 0.
  const intermediate = byCode.get('AE03');
  const minimum = intermediate.levels.find((l) => l.isMandatoryMinimum);
  assert.equal(minimum.name, 'Iniciante');
  assert.equal(minimum.points, 4);
  assert.ok(minimum.position > 1 && minimum.position < intermediate.levels.length);

  // Mínimo obrigatório em nível de zero ponto, com máximo 10: não se infere pela pontuação.
  const ge01 = byCode.get('GE01');
  assert.equal(ge01.maxPoints, 10);
  const ge01Minimum = ge01.levels.find((l) => l.isMandatoryMinimum);
  assert.equal(ge01Minimum.points, 0);
  assert.equal(ge01Minimum.name, 'Iniciante');
  assert.notEqual(ge01.levels[ge01.levels.length - 1].name, ge01Minimum.name);

  // O mesmo rótulo tem pontos diferentes conforme o indicador.
  const consciente = indicators.flatMap((i) => i.levels).filter((l) => l.slug === 'consciente');
  assert.ok(new Set(consciente.map((l) => l.points)).size > 1, '"Consciente" não vale sempre o mesmo');

  // Códigos oficiais preservados (sem conversão para os códigos genéricos do seed).
  assert.equal(ge01.codeOriginal, 'GE 01');
  assert.ok(indicators.every((i) => !/^CG-/.test(i.code)));
  assert.ok(byCode.has('G1E01'), 'caderno G usa G1xx para não colidir com o Geral');

  // "Não se aplica" não é nível de maturidade.
  assert.ok(!indicators.flatMap((i) => i.levels).some((l) => /n[ãa]o\s*se\s*aplica/i.test(l.name)));
});

/* ------------------------------------------------------------------ maturidade mínima exigida */

/**
 * Mapeamento oficial: indicador → nível mínimo, lido da marca visível "OBRIGATÓRIO" de cada
 * página dos cadernos em PDF (tools/minimum_crosscheck.py). É independente da planilha.
 */
const OFFICIAL_MINIMUMS = require('./fixtures/minimos-oficiais.json').indicadores;

test('maturidade mínima exigida: a planilha confere com os cadernos oficiais', () => {
  if (!hasSource) return;
  const { indicators } = parseCatalog(SOURCE);
  const official = new Map(OFFICIAL_MINIMUMS.map((m) => [m.codigo, m]));
  assert.equal(official.size, 50);

  for (const indicator of indicators) {
    const minimum = indicator.levels.find((l) => l.isMandatoryMinimum);
    const expected = official.get(indicator.code);
    if (!expected) {
      // Sem exigência nos cadernos: nenhum nível marcado — o indicador continua sendo respondido.
      assert.equal(indicator.mandatory, false, `${indicator.code} não tem mínimo nos cadernos`);
      assert.equal(minimum, undefined, `${indicator.code} sem nível mínimo`);
      continue;
    }
    assert.equal(indicator.mandatory, true, `${indicator.code} tem mínimo (${expected.fonte})`);
    assert.equal(minimum.name, expected.maturidadeMinima, `${indicator.code}: nível mínimo (${expected.fonte})`);
    assert.equal(minimum.position, expected.posicao, `${indicator.code}: posição do nível mínimo`);
    assert.equal(indicator.section, expected.setor ?? 'All', `${indicator.code}: caderno`);
  }

  // Caderno Geral e setoriais; o nível exigido varia entre indicadores e entre cadernos.
  const count = (section) => OFFICIAL_MINIMUMS.filter((m) => (m.setor ?? 'All') === section).length;
  assert.deepEqual(
    ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(count),
    [29, 5, 5, 3, 1, 1, 1, 1, 4],
  );
  const levels = new Set(OFFICIAL_MINIMUMS.map((m) => m.maturidadeMinima));
  assert.deepEqual([...levels].sort(), ['Conforme', 'Consciente', 'Iniciante', 'Sensibilizada']);
  assert.equal(official.get('GE01').maturidadeMinima, 'Iniciante');
  assert.equal(official.get('GS01').maturidadeMinima, 'Conforme');
  assert.equal(official.get('BG01').maturidadeMinima, 'Consciente');
  assert.equal(official.get('AS01').maturidadeMinima, 'Sensibilizada');
  // Resíduo invisível do modelo nos PDFs não conta como exigência (ex.: GE06, GG01).
  assert.ok(!official.has('GE06') && !official.has('GG01'));
});

/* ------------------------------------------------------------------ importação pela API */

test('importação: prévia, rascunho, publicação e proteção das versões', async (t) => {
  if (!hasSource) return;
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const file = fs.readFileSync(SOURCE);

  const form = () => {
    const f = new FormData();
    f.append('file', new Blob([file]), 'Indicadores Programa ESG FIEMS 1.xlsx');
    return f;
  };

  let versionId;

  await t.test('somente a Administração importa catálogo', async () => {
    const gestor = await s.login('gestor@esgdemo.com.br');
    assert.equal((await s.api('POST', '/catalog/preview', { token: gestor, form: form() })).status, 403);
    assert.equal((await s.api('GET', '/catalog/versions', { token: gestor })).status, 403);
  });

  await t.test('prévia valida e devolve relatório sem gravar catálogo', async () => {
    const before = (await s.db.one('SELECT count(*) AS n FROM questions')).n;
    const r = await s.api('POST', '/catalog/preview', { token: admin, form: form() });
    assert.equal(r.status, 201);
    assert.equal(r.body.report.summary.indicators, 139);
    assert.equal(r.body.report.summary.errors, 0);
    assert.equal(r.body.report.summary.publishable, true);
    assert.ok(r.body.report.divergences.length >= 4);
    assert.equal((await s.db.one('SELECT count(*) AS n FROM questions')).n, before, 'a prévia não grava indicadores');
    // O resultado da leitura fica registrado (arquivo, origem e hash).
    const run = await s.db.one('SELECT * FROM catalog_imports WHERE id = ?', r.body.importId);
    assert.equal(run.status, 'preview');
    assert.equal(run.sourceHash, r.body.source.hash);
    assert.match(run.sourceFile, /Indicadores Programa ESG FIEMS/);
  });

  await t.test('rascunho não entra nos ciclos e não vira versão ativa', async () => {
    const r = await s.api('POST', '/catalog/imports', { token: admin, form: form() });
    assert.equal(r.status, 201);
    versionId = r.body.version.id;
    assert.equal(r.body.version.status, 'draft');
    assert.equal(r.body.version.origin, 'official');
    assert.equal(r.body.version.indicators, 139);
    assert.equal(r.body.version.levels, 538);

    const versions = await s.api('GET', '/catalog/versions', { token: admin });
    assert.equal(versions.body.active, 'legacy-demo', 'enquanto não publicada, a versão ativa segue a anterior');

    // Novo ciclo continua usando a versão publicada (demonstrativa), não o rascunho.
    const nova = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Durante Rascunho Ltda', bussinessName: 'Durante Rascunho', email: 'd@d.com', cnpj: '11444777000161', accessDate: '2024-08-01', size: 'MEDIA', section: 'C' },
    });
    assert.equal(nova.status, 201);
    assert.equal(nova.body.report.catalogVersion, 'legacy-demo');
  });

  await t.test('reimportar o mesmo arquivo não duplica o catálogo', async () => {
    const again = await s.api('POST', '/catalog/imports', { token: admin, form: form() });
    assert.equal(again.status, 200);
    assert.equal(again.body.reused, true);
    assert.equal(again.body.version.id, versionId);
    assert.equal((await s.db.one('SELECT count(*) AS n FROM questions WHERE origin = ?', 'official')).n, 139);
  });

  await t.test('publicar exige confirmação explícita quando há divergências', async () => {
    const sem = await s.api('POST', `/catalog/versions/${versionId}/publish`, { token: admin, body: {} });
    assert.equal(sem.status, 409);
    assert.match(sem.body.message, /divergência/);
    const com = await s.api('POST', `/catalog/versions/${versionId}/publish`, { token: admin, body: { acknowledge: true } });
    assert.equal(com.status, 201);
    assert.equal(com.body.status, 'published');

    const versions = await s.api('GET', '/catalog/versions', { token: admin });
    assert.equal(versions.body.active, versionId);
    const legacy = versions.body.data.find((v) => v.id === 'legacy-demo');
    assert.equal(legacy.status, 'published', 'a versão demonstrativa permanece como está, com seus ciclos');
  });

  await t.test('versão publicada é protegida contra edição manual', async () => {
    const indicators = await s.api('GET', `/catalog/versions/${versionId}/indicators?section=A`, { token: admin });
    assert.equal(indicators.status, 200);
    assert.equal(indicators.body.length, 69, 'Geral + caderno A');
    const ge01 = indicators.body.find((q) => q.code === 'GE01');
    assert.equal(ge01.answers.length, 5);
    assert.deepEqual(ge01.answers.map((a) => a.position), [1, 2, 3, 4, 5]);
    assert.equal(ge01.maxPoints, 10);
    assert.equal(ge01.topic, 'Compliance');
    assert.equal(ge01.ods, '16');
    assert.equal(ge01.answers.find((a) => a.mandatory).title, 'Iniciante');
    assert.equal(ge01.mandatoryAnswerId, ge01.answers.find((a) => a.mandatory).id);

    const edit = await s.api('PATCH', `/questions/${ge01.id}`, { token: admin, body: { title: 'tentativa' } });
    assert.equal(edit.status, 409);
    assert.match(edit.body.message, /nova versão/);
    const answer = ge01.answers[0];
    assert.equal((await s.api('PATCH', `/questions/answer/${ge01.id}/${answer.id}`, { token: admin, body: { points: 10 } })).status, 409);
    assert.equal((await s.api('DELETE', `/questions/${ge01.id}`, { token: admin })).status, 409);
    assert.equal((await s.api('POST', '/questions/section/A', { token: admin, body: [{ title: 'x', description: 'y', category: 'E', answers: [{ title: 'Não conforme', points: 0, description: 'a' }, { title: 'Conforme', points: 10, description: 'b' }] }] })).status, 409);
  });

  await t.test('ciclo novo usa a versão publicada, com 69 itens e códigos oficiais', async () => {
    const nova = await s.api('POST', '/companies', {
      token: admin,
      body: { legalName: 'Oficial Ltda', bussinessName: 'Oficial', email: 'o@o.com', cnpj: '12345678000195', accessDate: '2024-08-01', size: 'MICRO_PEQUENA', section: 'B' },
    });
    assert.equal(nova.status, 201);
    assert.equal(nova.body.report.catalogVersionId, versionId);
    const items = await s.api('GET', `/reports/company/questions/${nova.body.report.id}`, { token: admin });
    assert.equal(items.body.length, 69);
    const codes = items.body.map((i) => i.question.code);
    assert.ok(codes.includes('GE01') && codes.includes('BE01'));
    assert.ok(!codes.some((c) => /^CG-/.test(c)), 'nenhum código genérico do seed');
    assert.ok(!codes.some((c) => /^A/.test(c)), 'nenhum indicador de outro caderno setorial');
    assert.equal(items.body[0].question.section, 'All', 'Caderno Geral primeiro');
    // Alternativas dinâmicas: cada indicador traz as suas.
    const sizes = new Set(items.body.map((i) => i.question.answers.length));
    assert.ok(sizes.size > 1, 'os indicadores do ciclo têm quantidades diferentes de alternativas');

    // Maturidade mínima exigida pela API: Caderno Geral + setorial B, nível dos cadernos oficiais.
    const expected = OFFICIAL_MINIMUMS.filter((m) => m.setor === null || m.setor === 'B');
    const withMinimum = items.body.filter((i) => i.question.hasMandatory);
    assert.deepEqual(withMinimum.map((i) => i.question.code).sort(), expected.map((m) => m.codigo).sort());
    for (const item of withMinimum) {
      const flagged = item.question.answers.filter((a) => a.mandatory);
      const official = expected.find((m) => m.codigo === item.question.code);
      assert.equal(flagged.length, 1, `${item.question.code}: um único nível mínimo`);
      assert.equal(flagged[0].title, official.maturidadeMinima, `${item.question.code}: nível (${official.fonte})`);
      assert.equal(item.question.mandatoryAnswerId, flagged[0].id, `${item.question.code}: mandatoryAnswerId aponta para o nível`);
    }
    // Sem exigência: nenhuma alternativa marcada, mas o indicador está no ciclo para ser respondido.
    const ge06 = items.body.find((i) => i.question.code === 'GE06');
    assert.ok(ge06, 'GE06 faz parte do ciclo');
    assert.equal(ge06.question.hasMandatory, false);
    assert.ok(!ge06.question.answers.some((a) => a.mandatory));
  });

  await t.test('níveis expostos pela versão, sem lista universal', async () => {
    const r = await s.api('GET', `/catalog/levels?versionId=${versionId}`, { token: admin });
    assert.equal(r.status, 200);
    const names = [...new Set(r.body.levels.map((l) => l.name))].sort();
    assert.deepEqual(names, ['Conforme', 'Consciente', 'Engajada', 'Iniciante', 'Não conforme', 'Sensibilizada']);
    const conforme = r.body.levels.filter((l) => l.name === 'Conforme');
    assert.ok(conforme.length > 1 && new Set(conforme.map((l) => l.points)).size > 1, 'o mesmo nível aparece com pontos diferentes');
  });

  await t.test('publicar nova versão não altera respostas nem critérios do ciclo anterior', async () => {
    // Ciclo na versão demonstrativa, com uma resposta registrada.
    const gestor = await s.login('gestor@esgdemo.com.br');
    const items = (await s.api('GET', '/reports/company/questions/', { token: gestor })).body;
    const item = items[0];
    const chosen = item.question.answers[1];
    await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: gestor, body: { answerId: chosen.id, answerText: 'resposta do ciclo antigo' } });

    const before = (await s.api('GET', `/reports/questionReports/${item.id}`, { token: gestor })).body;
    assert.equal(before.selectedAnswer.id, chosen.id);
    assert.equal(before.question.versionId, 'legacy-demo');

    // Publica outra versão oficial (mesmo conteúdo, outro rótulo) com force.
    const f = new FormData();
    f.append('file', new Blob([file]), 'Indicadores Programa ESG FIEMS 1.xlsx');
    f.append('label', 'oficial-revisao-2');
    f.append('force', 'true');
    const draft = await s.api('POST', '/catalog/imports', { token: admin, form: f });
    assert.equal(draft.status, 201);
    assert.equal((await s.api('POST', `/catalog/versions/${draft.body.version.id}/publish`, { token: admin, body: { acknowledge: true } })).status, 201);

    const after = (await s.api('GET', `/reports/questionReports/${item.id}`, { token: gestor })).body;
    assert.equal(after.selectedAnswer.id, chosen.id, 'a resposta continua apontando para a mesma alternativa');
    assert.equal(after.selectedAnswer.points, before.selectedAnswer.points, 'os pontos do critério não mudaram');
    assert.equal(after.question.title, before.question.title);
    assert.equal(after.question.answers.length, before.question.answers.length);
    assert.equal(after.question.versionId, 'legacy-demo', 'o ciclo continua na versão com que foi aberto');
    assert.equal(after.report.status, before.report.status);

    // A versão anterior virou arquivada, sem perder os indicadores.
    const versions = await s.api('GET', '/catalog/versions', { token: admin });
    const previous = versions.body.data.find((v) => v.id === versionId);
    assert.equal(previous.status, 'archived');
    assert.equal(previous.indicators, 139);
    assert.equal(previous.cycles >= 1, true, 'os ciclos abertos nela continuam apontando para ela');
    assert.equal(versions.body.active, draft.body.version.id);
  });

  await t.test('rascunho com erro é recusado e registrado', async () => {
    const broken = new FormData();
    broken.append('file', new Blob([Buffer.from('não é um xlsx')]), 'quebrado.xlsx');
    const r = await s.api('POST', '/catalog/imports', { token: admin, form: broken });
    assert.equal(r.status, 400);
    const run = await s.db.one("SELECT * FROM catalog_imports WHERE status = 'rejected' ORDER BY startedAt DESC LIMIT 1");
    assert.ok(run, 'a tentativa fica registrada');
    assert.ok(JSON.parse(run.report).errors.length > 0);
  });

  await t.test('relatório da versão fica disponível para consulta', async () => {
    const r = await s.api('GET', `/catalog/versions/${versionId}/report`, { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.counts.indicators, 139);
    assert.ok(Array.isArray(r.body.conference) && r.body.conference.length >= 13);
    const list = await s.api('GET', '/catalog/imports', { token: admin });
    assert.ok(list.body.length >= 3);
    assert.ok(list.body.every((row) => row.sourceHash && row.sourceFile));
  });
});

/* ------------------------------------------------------------------ validações sintéticas */

test('validações de importação sobre planilhas construídas', async (t) => {
  const { buildWorkbook } = require('./fixtures/xlsx-writer');

  await t.test('código duplicado em cadernos diferentes e campos ausentes', () => {
    const { report } = parseCatalog(
      buildWorkbook([
        ['Geral', 'Environmental (Ambiental)', 'Compliance', 'GE 01', 'GE01', 'Indicador 1', 'desc a', 'Não conforme', 0, null, 'Não', '16'],
        ['Geral', 'Environmental (Ambiental)', 'Compliance', 'GE 01', 'GE01', 'Indicador 1', 'desc b', 'Conforme', 10, 'Obrigatório', 'Sim', '16'],
        ['A', 'Social', 'Produto', 'AS 01', 'GE01', 'Outro indicador', 'desc c', 'Não conforme', 0, null, 'Não', '12'],
        ['A', 'Social', 'Produto', 'AS 02', 'AS02', '', 'desc d', 'Conforme', 10, null, 'Não', '12'],
      ]),
      { sourceFile: 'sintetico.xlsx' },
    );
    const kinds = report.errors.map((e) => e.kind);
    assert.ok(kinds.includes('indicador-inconsistente'), 'mesmo código com título/caderno diferentes é erro');
    assert.ok(kinds.includes('campo-ausente'), 'título em branco é erro');
    assert.equal(report.summary.publishable, false);
  });

  await t.test('pontuação inválida, alternativa única e dois mínimos obrigatórios', () => {
    const { report } = parseCatalog(
      buildWorkbook([
        ['Geral', 'Social', 'Trabalho', 'GS 01', 'GS01', 'Indicador', 'desc', 'Não conforme', 'dez', null, 'Não', '8'],
        ['Geral', 'Social', 'Trabalho', 'GS 02', 'GS02', 'Sozinho', 'desc', 'Conforme', 0, null, 'Não', '8'],
        ['Geral', 'Social', 'Trabalho', 'GS 03', 'GS03', 'Dois mínimos', 'desc 1', 'Iniciante', 0, 'Obrigatório', 'Sim', '8'],
        ['Geral', 'Social', 'Trabalho', 'GS 03', 'GS03', 'Dois mínimos', 'desc 2', 'Conforme', 10, 'Obrigatório', 'Sim', '8'],
      ]),
    );
    const kinds = report.errors.map((e) => e.kind);
    assert.ok(kinds.includes('numero-invalido'));
    assert.ok(kinds.includes('alternativas-insuficientes'));
    assert.ok(kinds.includes('minimo-obrigatorio-invalido'));
  });

  await t.test('zero é valor: pontuação 0 não é tratada como ausência', () => {
    const { indicators, report } = parseCatalog(
      buildWorkbook([
        ['Geral', 'Governance (Governança)', 'Ética', 'GG 01', 'GG01', 'Indicador zero', 'desc 1', 'Não conforme', 0, null, 'Não', '16'],
        ['Geral', 'Governance (Governança)', 'Ética', 'GG 01', 'GG01', 'Indicador zero', 'desc 2', 'Conforme', 0, 'Obrigatório', 'Sim', '16'],
      ]),
    );
    assert.equal(report.errors.length, 0);
    assert.equal(indicators[0].maxPoints, 0);
    assert.equal(indicators[0].mandatory, true);
    assert.deepEqual(indicators[0].levels.map((l) => l.points), [0, 0]);
  });

  await t.test('divergência entre obrigatório calculado e marcação de observações', () => {
    const { report } = parseCatalog(
      buildWorkbook([
        ['Geral', 'Social', 'Trabalho', 'GS 10', 'GS10', 'Indicador', 'desc 1', 'Não conforme', 0, null, 'Sim', '8'],
        ['Geral', 'Social', 'Trabalho', 'GS 10', 'GS10', 'Indicador', 'desc 2', 'Conforme', 10, null, 'Não', '8'],
      ]),
    );
    assert.ok(report.divergences.some((d) => d.kind === 'obrigatorio-derivado-divergente'));
  });

  await t.test('contagens fora do esperado aparecem como divergência de conferência, não como erro', () => {
    const { report } = parseCatalog(
      buildWorkbook([
        ['Geral', 'Social', 'Trabalho', 'GS 01', 'GS01', 'Indicador', 'desc 1', 'Não conforme', 0, null, 'Não', '8'],
        ['Geral', 'Social', 'Trabalho', 'GS 01', 'GS01', 'Indicador', 'desc 2', 'Conforme', 10, null, 'Não', '8'],
      ]),
    );
    assert.equal(report.errors.length, 0, 'a contagem é conferência, não constante do sistema');
    const counts = report.divergences.filter((d) => d.kind === 'conferencia-de-contagem');
    assert.ok(counts.length > 0);
    assert.ok(counts.some((d) => /indicadores únicos/.test(d.detail)));
    assert.equal(report.summary.publishable, true, 'estrutura válida segue publicável, com a divergência registrada');
  });

  await t.test('arquivo sem a aba de alternativas', () => {
    const { report } = parseCatalog(buildWorkbook([], { sheetName: 'Outra' }));
    assert.ok(report.errors.some((e) => e.kind === 'aba-ausente'));
  });
});
