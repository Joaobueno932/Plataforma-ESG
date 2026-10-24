const test = require('node:test');
const assert = require('node:assert/strict');
const { computeResult } = require('../src/scoring/engine');
const { POLICIES, RULE_VERSION } = require('../src/scoring/policies');
const { startServer, shutdown } = require('./helpers');

/* ------------------------------------------------------------------ fixtures */

/** Indicador de 5 níveis (0, 4, 6, 8, 10), como a maioria do catálogo oficial. */
function indicator({
  code,
  axis = 'E',
  section = 'All',
  points = [0, 4, 6, 8, 10],
  mandatoryPosition = null,
  declaredPosition = null,
  auditedPosition = null,
  auditConclusion = null,
  na = null,
  maxPoints = null,
  title = null,
}) {
  const levels = points.map((value, index) => ({ id: `${code}-${index + 1}`, position: index + 1, name: `N${index + 1}`, points: value }));
  const at = (position) => (position == null ? null : levels.find((level) => level.position === position));
  const declared = at(declaredPosition);
  const audited = at(auditedPosition);
  const minimum = at(mandatoryPosition);
  return {
    code,
    title: title || `Indicador ${code}`,
    section,
    axis,
    maxPoints: maxPoints === null ? Math.max(...points) : maxPoints,
    levels,
    mandatory: {
      required: !!minimum,
      minimumPosition: minimum ? minimum.position : null,
      minimumName: minimum ? minimum.name : null,
      minimumPoints: minimum ? minimum.points : null,
    },
    declared: declared ? { answerId: declared.id, position: declared.position, points: declared.points, name: declared.name } : null,
    audited: audited ? { answerId: audited.id, position: audited.position, points: audited.points, name: audited.name } : null,
    auditConclusion,
    na: na || { requested: false, decision: null },
  };
}

/** Monta um eixo com pontos obtidos e máximo exatos, para testar limites de faixa. */
function axisWith(axis, obtained, max, { size = 'MEDIA' } = {}) {
  const items = [];
  let remainingObtained = obtained;
  let remainingMax = max;
  let index = 0;
  while (remainingMax > 0) {
    const chunkMax = Math.min(10, remainingMax);
    const chunkPoints = Math.min(chunkMax, remainingObtained);
    items.push(
      indicator({
        code: `${axis}${String(++index).padStart(2, '0')}`,
        axis,
        points: [0, chunkPoints, chunkMax].filter((value, i, list) => list.indexOf(value) === i).sort((a, b) => a - b),
        declaredPosition: 1,
        auditedPosition: 1,
        maxPoints: chunkMax,
      }),
    );
    // ajusta o nível auditado para refletir exatamente os pontos do bloco
    const last = items[items.length - 1];
    last.levels = [
      { id: `${last.code}-1`, position: 1, name: 'obtido', points: chunkPoints },
      { id: `${last.code}-2`, position: 2, name: 'máximo', points: chunkMax },
    ];
    last.maxPoints = chunkMax;
    last.declared = { answerId: `${last.code}-1`, position: 1, points: chunkPoints, name: 'obtido' };
    last.audited = { ...last.declared };
    remainingObtained -= chunkPoints;
    remainingMax -= chunkMax;
  }
  return { items, size };
}

const resultFor = (axis, obtained, max, size = 'MEDIA', policyId = undefined) => {
  const { items } = axisWith(axis, obtained, max);
  // completa os outros dois eixos com base válida para o rating existir
  for (const other of ['E', 'S', 'G'].filter((a) => a !== axis)) items.push(...axisWith(other, max, max).items);
  return computeResult({ items, size, mode: 'audited', policyId });
};

/* ------------------------------------------------------------------ faixas e limites */

test('faixas: limites comparados com precisão, sem arredondamento', () => {
  // 79,95% continua abaixo de 80%: 7995/10000.
  const quase = resultFor('E', 7995, 10000);
  assert.equal(quase.axes.E.percentage, 79.95);
  assert.equal(quase.axes.E.band, 'B', '79,95% não é A');
  assert.equal(quase.axes.E.percentageDisplay, 79.95);

  assert.equal(resultFor('E', 7999, 10000).axes.E.band, 'B', '79,99% não é A');
  assert.equal(resultFor('E', 8000, 10000).axes.E.band, 'A', '80% é A');
  assert.equal(resultFor('E', 5999, 10000).axes.E.band, 'C', '59,99% não é B');
  assert.equal(resultFor('E', 6000, 10000).axes.E.band, 'B', '60% é B');

  // Média e grande: C começa em 40%.
  assert.equal(resultFor('E', 3999, 10000, 'MEDIA').axes.E.band, 'Abaixo de C', '39,99% está abaixo de C');
  assert.equal(resultFor('E', 4000, 10000, 'MEDIA').axes.E.band, 'C', '40% é C');
  assert.equal(resultFor('E', 3000, 10000, 'MEDIA').axes.E.band, 'Abaixo de C');

  // Micro e pequena: abaixo de 30% as duas políticas concordam.
  assert.equal(resultFor('E', 2999, 10000, 'MICRO_PEQUENA').axes.E.band, 'Abaixo de C', '29,99% está abaixo de C');
  // De 30% a 39,99% as políticas divergem: a tabela do documento indicaria C, a conservadora
  // indicaria abaixo de C. O motor **não afirma** a faixa nessa janela (política pendente).
  for (const obtained of [3000, 3500, 3999]) {
    const disputado = resultFor('E', obtained, 10000, 'MICRO_PEQUENA');
    assert.equal(disputado.axes.E.bandIfValid, 'C', 'a tabela do documento indicaria C');
    assert.equal(disputado.axes.E.band, null, 'mas a faixa não é publicada enquanto a política estiver pendente');
    assert.equal(disputado.axes.E.valid, false);
    assert.ok(disputado.axes.E.pendingRatification);
  }
  // A partir de 40% as duas concordam novamente.
  assert.equal(resultFor('E', 4000, 10000, 'MICRO_PEQUENA').axes.E.band, 'C', '40% é C para qualquer política');
});

test('as duas políticas de C são modeladas; divergência não é publicada como ratificada', () => {
  const documento = resultFor('E', 3500, 10000, 'MICRO_PEQUENA', 'rn04-2026-10');
  const conservadora = resultFor('E', 3500, 10000, 'MICRO_PEQUENA', 'c-40-todos');
  assert.equal(documento.axes.E.bandIfValid, 'C');
  assert.equal(conservadora.axes.E.bandIfValid, 'Abaixo de C');

  // 35% para micro/pequena cai exatamente na faixa em disputa: o eixo fica marcado como
  // dependente de ratificação e não produz classificação válida.
  assert.ok(documento.axes.E.pendingRatification, 'eixo marcado como dependente de ratificação');
  assert.equal(documento.axes.E.valid, false);
  assert.equal(documento.rating, null);
  assert.ok(documento.impediments.some((i) => i.kind === 'politica-pendente'));
  assert.equal(documento.eligible, null, 'não se afirma elegibilidade sobre política pendente');
  assert.equal(POLICIES['rn04-2026-10'].status, 'pending-ratification');

  // Acima de 40% as duas políticas concordam: sem pendência.
  const acima = resultFor('E', 4500, 10000, 'MICRO_PEQUENA');
  assert.equal(acima.axes.E.pendingRatification, null);
  assert.equal(acima.axes.E.valid, true);
  assert.equal(acima.axes.E.band, 'C');
});

test('exemplo do documento: E 92/150, S 142/180, G 134/220 → BBB matemático', () => {
  const items = [
    ...axisWith('E', 92, 150).items,
    ...axisWith('S', 142, 180).items,
    ...axisWith('G', 134, 220).items,
  ];
  const result = computeResult({ items, size: 'MEDIA', mode: 'audited' });
  assert.equal(result.axes.E.points, 92);
  assert.equal(result.axes.E.max, 150);
  assert.equal(result.axes.S.points, 142);
  assert.equal(result.axes.S.max, 180);
  assert.equal(result.axes.G.points, 134);
  assert.equal(result.axes.G.max, 220);
  assert.equal(result.axes.E.percentageDisplay, 61.33);
  assert.equal(result.axes.S.percentageDisplay, 78.89);
  assert.equal(result.axes.G.percentageDisplay, 60.91);
  assert.equal(result.rating, 'BBB');
  assert.equal(result.ratingValid, true);
  // Elegibilidade é verificação separada: sem obrigatório pendente aqui, é elegível.
  assert.equal(result.eligible, true);
  assert.equal(result.ruleVersion, RULE_VERSION);
});

test('rating sai na ordem E, S, G', () => {
  const items = [...axisWith('E', 10, 10).items, ...axisWith('S', 7, 10).items, ...axisWith('G', 5, 10).items];
  const result = computeResult({ items, size: 'MEDIA', mode: 'audited' });
  assert.equal(result.rating, 'ABC');
  assert.deepEqual(result.ratingByAxis, { E: 'A', S: 'B', G: 'C' });
});

/* ------------------------------------------------------------------ obrigatórios */

test('obrigatório é comparado pela ordem do nível, não pelos pontos', () => {
  // Mínimo no nível 2, que vale ZERO ponto; o nível 1 também vale zero.
  const base = {
    code: 'GE01',
    axis: 'E',
    points: [0, 0, 6, 8, 10],
    mandatoryPosition: 2,
  };
  const atendido = computeResult({
    items: [indicator({ ...base, declaredPosition: 2, auditedPosition: 2 }), ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(atendido.mandatory.applicable, 1);
  assert.equal(atendido.mandatory.unmet.length, 0, 'nível 2 com zero ponto atende o mínimo');

  const naoAtendido = computeResult({
    items: [indicator({ ...base, declaredPosition: 1, auditedPosition: 1 }), ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(naoAtendido.mandatory.unmet.length, 1);
  assert.equal(naoAtendido.mandatory.unmet[0].code, 'GE01');
  assert.equal(naoAtendido.mandatory.unmet[0].requiredLevel, 'N2');
  assert.equal(naoAtendido.eligible, false);

  // Nível acima do mínimo também atende.
  const acima = computeResult({
    items: [indicator({ ...base, declaredPosition: 5, auditedPosition: 5 }), ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(acima.mandatory.unmet.length, 0);
});

test('pontuação alta não remove o impedimento de obrigatório não atendido', () => {
  const items = [
    indicator({ code: 'GE01', axis: 'E', points: [0, 0, 6, 8, 10], mandatoryPosition: 2, declaredPosition: 1, auditedPosition: 1 }),
    ...axisWith('E', 90, 90).items,
    ...axisWith('S', 100, 100).items,
    ...axisWith('G', 100, 100).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.rating, 'AAA', 'o rating matemático continua existindo');
  assert.equal(result.ratingValid, true);
  assert.equal(result.eligible, false, 'e a elegibilidade cai pelo obrigatório');
  assert.ok(result.impediments.some((i) => i.kind === 'obrigatorio-nao-atendido' && i.code === 'GE01'));
  assert.equal(result.certificationAllowed, false);
  assert.equal(result.eligibility.label, 'inelegível');
  assert.ok(result.eligibility.blockedBy.length === 1);
});

test('indicador de zero ponto conta para obrigatoriedade sem aumentar o denominador', () => {
  const binario = indicator({
    code: 'AS02',
    axis: 'S',
    section: 'A',
    points: [0, 0],
    mandatoryPosition: 2,
    declaredPosition: 2,
    auditedPosition: 2,
    maxPoints: 0,
  });
  const items = [binario, ...axisWith('S', 10, 10).items, ...axisWith('E', 10, 10).items, ...axisWith('G', 10, 10).items];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.S.max, 10, 'o indicador de máximo zero não entra no denominador');
  assert.equal(result.axes.S.base.zeroMaxIndicators, 1);
  assert.equal(result.mandatory.applicable, 1);
  assert.equal(result.mandatory.unmet.length, 0);

  // O mesmo indicador abaixo do mínimo bloqueia, mesmo valendo zero ponto.
  const bloqueado = computeResult({
    items: [{ ...binario, declared: { ...binario.levels[0] }, audited: { ...binario.levels[0] } }, ...axisWith('S', 10, 10).items, ...axisWith('E', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(bloqueado.mandatory.unmet.length, 1);
  assert.equal(bloqueado.eligible, false);
});

/* ------------------------------------------------------------------ aplicabilidade (NA) */

test('NA aceita sai do numerador e do denominador; recusada permanece; pendente bloqueia', () => {
  const alvo = (na) =>
    indicator({ code: 'GE05', axis: 'E', points: [0, 4, 6, 8, 10], declaredPosition: 1, auditedPosition: 1, na });

  const aceita = computeResult({
    items: [alvo({ requested: true, decision: 'accepted' }), ...axisWith('E', 10, 10).items, ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(aceita.axes.E.max, 10, 'o máximo do indicador excluído não entra');
  assert.equal(aceita.axes.E.points, 10);
  assert.equal(aceita.axes.E.base.excludedByNa, 1);
  assert.equal(aceita.nonApplicable.accepted, 1);
  assert.equal(aceita.axes.E.valid, true);

  const recusada = computeResult({
    items: [alvo({ requested: true, decision: 'refused' }), ...axisWith('E', 10, 10).items, ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(recusada.axes.E.max, 20, 'recusada continua aplicável');
  assert.equal(recusada.axes.E.points, 10);
  assert.equal(recusada.nonApplicable.refused, 1);
  assert.equal(recusada.axes.E.valid, true);
  assert.equal(recusada.axes.E.percentage, 50);

  const pendente = computeResult({
    items: [alvo({ requested: true, decision: null }), ...axisWith('E', 10, 10).items, ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(pendente.axes.E.valid, false);
  assert.ok(pendente.axes.E.reasons.includes('na-pendente'));
  assert.equal(pendente.rating, null);
  assert.equal(pendente.eligible, null);
  assert.equal(pendente.nonApplicable.pending.length, 1);
  assert.ok(pendente.impediments.some((i) => i.kind === 'na-pendente'));
});

test('NA aceita também retira o indicador da verificação de obrigatoriedade', () => {
  const items = [
    indicator({
      code: 'GE03',
      axis: 'E',
      points: [0, 0],
      maxPoints: 0,
      mandatoryPosition: 2,
      declaredPosition: 1,
      auditedPosition: 1,
      na: { requested: true, decision: 'accepted' },
    }),
    ...axisWith('E', 10, 10).items,
    ...axisWith('S', 10, 10).items,
    ...axisWith('G', 10, 10).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.mandatory.applicable, 0);
  assert.equal(result.mandatory.excludedByNa, 1);
  assert.equal(result.mandatory.unmet.length, 0);
  assert.equal(result.eligible, true);
});

test('conclusão de não atendimento pelo auditor vale, com zero ponto e sem sair do denominador', () => {
  const items = [
    indicator({ code: 'GE08', axis: 'E', points: [0, 0, 8, 10], mandatoryPosition: 2, declaredPosition: 3, auditConclusion: 'not-met' }),
    ...axisWith('E', 10, 10).items,
    ...axisWith('S', 10, 10).items,
    ...axisWith('G', 10, 10).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.E.points, 10, 'a declaração de nível 3 não conta: vale a conclusão do auditor');
  assert.equal(result.axes.E.max, 20, 'o indicador continua no denominador');
  assert.equal(result.mandatory.unmet.length, 1);
  assert.equal(result.mandatory.unmet[0].reason, 'conclusão de não atendimento pelo auditor');
  assert.equal(result.eligible, false);
});

/* ------------------------------------------------------------------ bases inválidas */

test('denominador zero não gera classificação nem divisão por zero', () => {
  const items = [
    indicator({ code: 'GS01', axis: 'S', points: [0, 0], maxPoints: 0, declaredPosition: 2, auditedPosition: 2 }),
    ...axisWith('E', 10, 10).items,
    ...axisWith('G', 10, 10).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.S.max, 0);
  assert.equal(result.axes.S.percentage, null);
  assert.equal(result.axes.S.band, null);
  assert.equal(result.axes.S.valid, false);
  assert.ok(result.axes.S.reasons.includes('sem-base-para-classificacao'));
  assert.equal(result.rating, null);
  assert.ok(result.impediments.some((i) => i.kind === 'sem-base-para-classificacao' && i.axis === 'S'));
  assert.equal(result.eligible, null);
});

test('sem resposta e sem decisão auditada não viram "não conforme"', () => {
  const items = [
    indicator({ code: 'GE10', axis: 'E', points: [0, 6, 10], declaredPosition: null }),
    ...axisWith('E', 10, 10).items,
    ...axisWith('S', 10, 10).items,
    ...axisWith('G', 10, 10).items,
  ];
  const audited = computeResult({ items, size: 'MEDIA', mode: 'audited' });
  assert.equal(audited.axes.E.max, 20, 'o indicador sem decisão continua aplicável');
  assert.equal(audited.axes.E.points, 10, 'e não recebe zero como se fosse não conforme');
  assert.ok(audited.axes.E.reasons.includes('sem-decisao-auditada'));
  assert.equal(audited.axes.E.valid, false);
  assert.equal(audited.completeness.pendingAuditDecisions, 1);
  assert.equal(audited.completeness.unanswered, 1);
  assert.equal(audited.mandatory.unmet.length, 0, 'sem decisão não se afirma descumprimento');
  assert.equal(audited.eligible, null);

  const self = computeResult({ items, size: 'MEDIA', mode: 'self' });
  assert.ok(self.axes.E.reasons.includes('sem-resposta'));
  assert.equal(self.ratingKind, 'preliminar');
  assert.equal(self.eligible, null);
});

test('valor inválido não é corrigido em silêncio', () => {
  const quebrado = indicator({ code: 'GG01', axis: 'G', points: [0, 10], declaredPosition: 2, auditedPosition: 2 });
  quebrado.audited = { ...quebrado.audited, points: 25 }; // acima do máximo do indicador
  const result = computeResult({
    items: [quebrado, ...axisWith('E', 10, 10).items, ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items],
    size: 'MEDIA',
  });
  assert.equal(result.invalid.length, 1);
  assert.ok(result.impediments.some((i) => i.kind === 'valor-invalido' && i.code === 'GG01'));
  assert.equal(result.axes.G.points, 10, 'o valor inválido não entra na soma');
  assert.equal(result.axes.G.valid, false);
  assert.equal(result.eligible, null);
});

test('porte ausente ou inválido não produz faixa', () => {
  const result = computeResult({ items: axisWith('E', 10, 10).items, size: null });
  assert.equal(result.bracket, null);
  assert.equal(result.axes.E.band, null);
  assert.equal(result.rating, null);
  assert.ok(result.impediments.some((i) => i.kind === 'valor-invalido'));
});

test('eixo abaixo da faixa mínima impede concessão mesmo com rating válido', () => {
  const items = [...axisWith('E', 2, 10).items, ...axisWith('S', 10, 10).items, ...axisWith('G', 10, 10).items];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.E.band, 'Abaixo de C');
  assert.equal(result.ratingValid, true);
  assert.equal(result.rating, 'Abaixo de CAA');
  assert.equal(result.eligible, false);
  assert.ok(result.impediments.some((i) => i.kind === 'eixo-abaixo-do-minimo' && i.axis === 'E'));
});

test('sem média de níveis nem média entre eixos', () => {
  // Dois indicadores no mesmo eixo: 10/10 e 0/10 → 50%, não "média dos níveis".
  const items = [
    indicator({ code: 'A1', axis: 'E', points: [0, 10], declaredPosition: 2, auditedPosition: 2 }),
    indicator({ code: 'A2', axis: 'E', points: [0, 10], declaredPosition: 1, auditedPosition: 1 }),
    ...axisWith('S', 10, 10).items,
    ...axisWith('G', 2, 10).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.E.points, 10);
  assert.equal(result.axes.E.max, 20);
  assert.equal(result.axes.E.percentage, 50);
  // Eixos independentes: G ruim não é compensado por S bom.
  assert.equal(result.axes.S.band, 'A');
  assert.equal(result.axes.G.band, 'Abaixo de C');
  assert.equal(result.rating, 'CAAbaixo de C');
  assert.equal(result.eligible, false);
});

test('Geral e setorial somam no mesmo eixo', () => {
  const items = [
    indicator({ code: 'GE01', axis: 'E', section: 'All', points: [0, 10], declaredPosition: 2, auditedPosition: 2 }),
    indicator({ code: 'AE01', axis: 'E', section: 'A', points: [0, 10], declaredPosition: 1, auditedPosition: 1 }),
    ...axisWith('S', 10, 10).items,
    ...axisWith('G', 10, 10).items,
  ];
  const result = computeResult({ items, size: 'MEDIA' });
  assert.equal(result.axes.E.max, 20, 'Caderno Geral + setorial no mesmo eixo');
  assert.equal(result.axes.E.points, 10);
  assert.equal(result.axes.E.base.applicable, 2);
});

/* ------------------------------------------------------------------ integração com o ciclo */

test('resultado do ciclo pela API, persistência e histórico', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const scoring = require('../src/scoring');
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const auditor = await s.login('auditor@esgdemo.com.br');
  const supervisor = await s.login('supervisor@esgdemo.com.br');
  const reportId = await s.reportIdOf('demo-company-a');

  await t.test('empresa acompanha o andamento, mas não o resultado auditado antes da aprovação', async () => {
    const self = await s.api('GET', `/reports/${reportId}/result?mode=self`, { token: gestor });
    assert.equal(self.status, 200);
    assert.equal(self.body.mode, 'self');
    assert.equal(self.body.ratingKind, 'preliminar');
    assert.equal(self.body.completeness.total, 8);
    assert.equal(self.body.completeness.answered, 0);
    assert.equal(self.body.rating, null, 'sem respostas não há classificação');
    assert.ok(self.body.axes.E.reasons.includes('sem-resposta'));

    const auditado = await s.api('GET', `/reports/${reportId}/result`, { token: gestor });
    assert.equal(auditado.status, 403);
    assert.match(auditado.body.message, /após a aprovação/);
    // Quem conduz o processo acompanha o cálculo durante a auditoria.
    assert.equal((await s.api('GET', `/reports/${reportId}/result`, { token: admin })).status, 200);
    assert.equal((await s.api('GET', `/reports/${reportId}/result`, { token: auditor })).status, 200);
  });

  await t.test('resultado reflete declaração, enquadramento auditado e obrigatórios', async () => {
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: admin })).body;
    // Responde todos os indicadores no nível máximo, menos um obrigatório.
    for (const item of items) {
      const ordered = [...item.question.answers].sort((a, b) => a.position - b.position);
      const mandatory = ordered.find((a) => a.mandatory);
      const chosen = mandatory && item.question.code === 'CG-E01' ? ordered[0] : ordered[ordered.length - 1];
      const r = await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: gestor, body: { answerId: chosen.id } });
      assert.equal(r.status, 200);
      await s.api('POST', `/reports/validateanswer/${item.id}`, { token: gestor, body: { veredict: true } });
    }
    const self = await s.api('GET', `/reports/${reportId}/result?mode=self`, { token: gestor });
    assert.equal(self.body.completeness.answered, 8);
    assert.equal(self.body.mandatory.unmet.length, 1, 'o obrigatório respondido abaixo do mínimo aparece');
    assert.equal(self.body.mandatory.unmet[0].code, 'CG-E01');
    assert.equal(self.body.eligible, false);
    assert.ok(self.body.eligibility.blockedBy[0].includes('CG-E01'));
  });

  await t.test('aprovação do supervisor grava o resultado com a versão da regra', async () => {
    await s.api('POST', '/reports/requestAudit/demo-company-a', { token: gestor });
    assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin })).status, 201);
    const items = (await s.api('GET', `/reports/company/questions/${reportId}`, { token: auditor })).body;
    for (const item of items)
      assert.equal(
        (await s.api('POST', `/auditory/evaluatequestion/${item.id}`, { token: auditor, body: { status: 'Approved', redflag: 'Conforme' } })).status,
        201,
      );
    assert.equal((await s.api('POST', '/auditory/submitToSupervisor/demo-company-a', { token: auditor })).status, 201);

    const fim = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor });
    assert.equal(fim.status, 201);
    assert.equal(fim.body.status, 'Audited');
    assert.ok(fim.body.result, 'a aprovação devolve o resultado calculado');
    assert.equal(fim.body.result.ruleVersion, RULE_VERSION);
    assert.equal(fim.body.result.policy.id, 'rn04-2026-10');
    assert.equal(fim.body.result.eligible, false, 'obrigatório não atendido impede elegibilidade');
    assert.ok(fim.body.result.impediments.some((i) => i.kind === 'obrigatorio-nao-atendido'));

    const stored = await scoring.storedResult(reportId);
    assert.ok(stored, 'resultado gravado');
    assert.equal(stored.ruleVersion, RULE_VERSION);
    assert.equal(stored.policyId, 'rn04-2026-10');
    assert.equal(stored.eligible, 0);
    assert.equal(stored.payload.axes.E.points, fim.body.result.axes.E.points);
    const axes = await s.db.all('SELECT axis, points, maxPoints, band FROM cycle_result_axes WHERE cycleResultId = ? ORDER BY axis', stored.id);
    assert.equal(axes.length, 3);

    // Agora a empresa vê o resultado auditado.
    const empresa = await s.api('GET', `/reports/${reportId}/result`, { token: gestor });
    assert.equal(empresa.status, 200);
    assert.equal(empresa.body.rating, fim.body.result.rating);
    const history = await s.api('GET', `/reports/${reportId}/result/history`, { token: consultor });
    assert.equal(history.status, 200);
    assert.equal(history.body.length, 1);
    assert.equal(history.body[0].ruleVersion, RULE_VERSION);
  });

  await t.test('mudar a política não reescreve o resultado já gravado', async () => {
    const stored = await scoring.storedResult(reportId);
    const recalculado = await s.api('GET', `/reports/${reportId}/result?policy=c-40-todos`, { token: admin });
    assert.equal(recalculado.status, 200);
    assert.equal(recalculado.body.policy.id, 'c-40-todos');
    const depois = await scoring.storedResult(reportId);
    assert.equal(depois.id, stored.id, 'nenhum resultado novo foi gravado por consulta');
    assert.equal(depois.policyId, 'rn04-2026-10');
    assert.equal(depois.payload.computedAt, stored.payload.computedAt);
  });

  await t.test('exemplo de resposta da API com motivos de inelegibilidade', async () => {
    const r = await s.api('GET', `/reports/${reportId}/result`, { token: admin });
    const body = r.body;
    assert.deepEqual(Object.keys(body.axes).sort(), ['E', 'G', 'S']);
    for (const axis of Object.values(body.axes))
      assert.deepEqual(Object.keys(axis).sort(), [
        'axis',
        'band',
        'bandIfValid',
        'base',
        'exact',
        'max',
        'pendingRatification',
        'percentage',
        'percentageDisplay',
        'points',
        'reasons',
        'valid',
      ]);
    assert.ok(body.cycle.catalogVersion);
    assert.ok(Array.isArray(body.items) && body.items.length === 8);
    assert.ok(body.eligibility.blockedBy.length >= 1);
    // registro para o relatório da etapa
    require('node:fs').writeFileSync(
      require('node:path').join(require('../src/config').storageDir, 'exemplo-resultado-api.json'),
      JSON.stringify({ ...body, items: body.items.slice(0, 3) }, null, 2),
    );
  });
});
