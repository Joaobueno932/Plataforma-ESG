/**
 * Motor de cálculo do resultado — funções de domínio puras (sem banco, sem HTTP).
 *
 * Ordem das verificações, conforme as decisões do responsável e a especificação § 13:
 *   1. requisitos **obrigatórios aplicáveis** (comparação de nível por ordem, nunca por pontos);
 *   2. pontos obtidos e máximo aplicável **por eixo** (Geral e setorial no mesmo eixo);
 *   3. faixa por eixo, com precisão inteira antes de qualquer arredondamento;
 *   4. elegibilidade, separada do rating matemático e da decisão final.
 *
 * Nunca: média de níveis, média entre eixos, "não respondido" virando "não conforme", nem
 * correção silenciosa de dado inválido para permitir conclusão.
 */
const {
  RULE_VERSION,
  MINIMUM_BAND,
  BAND_ORDER,
  bracketOf,
  defaultPolicy,
  policyById,
  bandFor,
  thresholdsFor,
} = require('./policies');

const AXES = ['E', 'S', 'G'];

/** Motivos que impedem uma classificação final válida. */
const REASONS = {
  NO_ANSWER: 'sem-resposta',
  NO_AUDIT_DECISION: 'sem-decisao-auditada',
  NA_PENDING: 'na-pendente',
  NO_BASE: 'sem-base-para-classificacao',
  INVALID_VALUE: 'valor-invalido',
  POLICY_PENDING: 'politica-pendente',
};

const IMPEDIMENTS = {
  MANDATORY_UNMET: 'obrigatorio-nao-atendido',
  AXIS_BELOW_MINIMUM: 'eixo-abaixo-do-minimo',
  NO_BASE: 'sem-base-para-classificacao',
  PENDING_DECISION: 'decisao-pendente',
  NA_PENDING: 'na-pendente',
  POLICY_PENDING: 'politica-pendente',
  INVALID_VALUE: 'valor-invalido',
};

const isInteger = (value) => Number.isInteger(value);
const isNonNegativeInteger = (value) => isInteger(value) && value >= 0;

/**
 * Enquadramento considerado em cada modo:
 *  - `audited`: a conclusão do auditor. Sem decisão do auditor, o item fica pendente.
 *  - `self`: a declaração da empresa (autodiagnóstico), sempre preliminar.
 */
function framingOf(item, mode) {
  if (mode === 'self') {
    if (!item.declared) return { kind: 'missing', reason: REASONS.NO_ANSWER };
    return { kind: 'declared', position: item.declared.position, points: item.declared.points, name: item.declared.name };
  }
  if (item.auditConclusion === 'not-met') {
    // O auditor concluiu pelo não atendimento: vale a conclusão dele, com zero ponto, e o
    // indicador continua no denominador.
    return { kind: 'audit-not-met', position: 0, points: 0, name: item.auditConclusionLabel || 'não atendido' };
  }
  if (item.audited) return { kind: 'audited', position: item.audited.position, points: item.audited.points, name: item.audited.name };
  return { kind: 'missing', reason: REASONS.NO_AUDIT_DECISION };
}

/** Situação de aplicabilidade: só o "não se aplica" **aceito pelo auditor** exclui do cálculo. */
function applicabilityOf(item, mode) {
  const na = item.na || {};
  if (na.decision === 'accepted') return { applicable: false, state: 'na-aceita' };
  if (na.requested && !na.decision) return { applicable: true, state: 'na-pendente', pending: true };
  if (na.decision === 'refused') return { applicable: true, state: 'na-recusada' };
  return { applicable: true, state: 'aplicavel' };
}

/**
 * @param {object} input
 * @param {Array} input.items indicadores do ciclo, já normalizados
 * @param {string} input.size porte da empresa (MICRO_PEQUENA | MEDIA | GRANDE)
 * @param {'audited'|'self'} [input.mode]
 * @param {string} [input.policyId]
 */
function computeResult({ items = [], size = null, mode = 'audited', policyId = null, computedAt = null } = {}) {
  const policy = (policyId && policyById(policyId)) || defaultPolicy();
  const alternatives = Object.values(require('./policies').POLICIES).filter((p) => p.id !== policy.id);
  const bracket = bracketOf(size);

  const result = {
    ruleVersion: RULE_VERSION,
    mode,
    policy: { id: policy.id, label: policy.label, status: policy.status, statusDetail: policy.statusDetail, source: policy.source },
    size,
    bracket,
    thresholds: bracket ? thresholdsFor(policy, bracket) : null,
    axes: {},
    rating: null,
    ratingValid: false,
    ratingKind: mode === 'self' ? 'preliminar' : 'matematico',
    mandatory: { applicable: 0, met: 0, unmet: [], excludedByNa: 0 },
    nonApplicable: { requested: 0, accepted: 0, refused: 0, pending: [] },
    completeness: { total: items.length, answered: 0, unanswered: 0, pendingAuditDecisions: 0, pendingNa: 0 },
    impediments: [],
    invalid: [],
    eligible: null,
    computedAt: computedAt || new Date().toISOString(),
  };

  if (!bracket) {
    result.impediments.push({
      kind: IMPEDIMENTS.INVALID_VALUE,
      detail: `porte da empresa inválido ou ausente (${size === null ? 'não informado' : size}); sem porte não há faixa aplicável`,
    });
  }

  const axisData = {};
  for (const axis of AXES) axisData[axis] = { points: 0, max: 0, applicable: 0, excluded: 0, zeroMax: 0, reasons: new Set(), items: [] };

  for (const item of items) {
    const axis = AXES.includes(item.axis) ? item.axis : null;
    if (!axis) {
      result.invalid.push({ code: item.code, detail: `eixo inválido: ${item.axis}` });
      result.impediments.push({ kind: IMPEDIMENTS.INVALID_VALUE, code: item.code, detail: `eixo inválido: ${item.axis}` });
      continue;
    }
    const bucket = axisData[axis];
    const applicability = applicabilityOf(item, mode);
    const framing = framingOf(item, mode);

    if (item.na && item.na.requested) {
      result.nonApplicable.requested += 1;
      if (item.na.decision === 'accepted') result.nonApplicable.accepted += 1;
      else if (item.na.decision === 'refused') result.nonApplicable.refused += 1;
      else {
        result.nonApplicable.pending.push({ code: item.code, title: item.title, axis, requestedAt: item.na.requestedAt || null });
        result.completeness.pendingNa += 1;
      }
    }

    if (item.declared) result.completeness.answered += 1;
    else result.completeness.unanswered += 1;

    // Aplicabilidade aceita: fora do numerador **e** do denominador, e fora da verificação
    // de obrigatoriedade (o indicador não se aplica à empresa).
    if (!applicability.applicable) {
      bucket.excluded += 1;
      if (item.mandatory && item.mandatory.required) result.mandatory.excludedByNa += 1;
      bucket.items.push({ code: item.code, axis, state: applicability.state, counted: false });
      continue;
    }

    // Obrigatoriedade: comparação pela ordem do nível, nunca pelos pontos.
    if (item.mandatory && item.mandatory.required) {
      result.mandatory.applicable += 1;
      const minimumPosition = item.mandatory.minimumPosition;
      if (!isInteger(minimumPosition) || minimumPosition < 1) {
        result.invalid.push({ code: item.code, detail: 'nível mínimo obrigatório inválido' });
        result.impediments.push({ kind: IMPEDIMENTS.INVALID_VALUE, code: item.code, detail: 'nível mínimo obrigatório inválido' });
      } else if (framing.kind === 'missing') {
        // Sem decisão não se afirma atendimento nem descumprimento.
        bucket.reasons.add(framing.reason);
      } else if (framing.kind === 'audit-not-met' || framing.position < minimumPosition) {
        result.mandatory.unmet.push({
          code: item.code,
          title: item.title,
          axis,
          section: item.section,
          requiredLevel: item.mandatory.minimumName || null,
          requiredPosition: minimumPosition,
          actualLevel: framing.name || null,
          actualPosition: framing.kind === 'audit-not-met' ? null : framing.position,
          reason: framing.kind === 'audit-not-met' ? 'conclusão de não atendimento pelo auditor' : 'nível abaixo do mínimo exigido',
        });
      } else {
        result.mandatory.met += 1;
      }
    }

    if (applicability.pending) bucket.reasons.add(REASONS.NA_PENDING);

    if (framing.kind === 'missing') {
      bucket.reasons.add(framing.reason);
      if (framing.reason === REASONS.NO_AUDIT_DECISION) result.completeness.pendingAuditDecisions += 1;
      // Item sem decisão continua aplicável: entra no denominador, sem pontos, e o eixo fica
      // sem classificação válida. "Não respondido" nunca é convertido em "não conforme".
      if (isNonNegativeInteger(item.maxPoints)) bucket.max += item.maxPoints;
      bucket.applicable += 1;
      bucket.items.push({ code: item.code, axis, state: 'sem-decisao', counted: true, points: null, max: item.maxPoints });
      continue;
    }

    if (!isNonNegativeInteger(item.maxPoints) || !isNonNegativeInteger(framing.points)) {
      result.invalid.push({ code: item.code, detail: `pontuação inválida (obtido ${framing.points}, máximo ${item.maxPoints})` });
      result.impediments.push({ kind: IMPEDIMENTS.INVALID_VALUE, code: item.code, detail: 'pontuação inválida' });
      bucket.reasons.add(REASONS.INVALID_VALUE);
      continue;
    }
    if (framing.points > item.maxPoints) {
      result.invalid.push({ code: item.code, detail: `ponto obtido (${framing.points}) acima do máximo do indicador (${item.maxPoints})` });
      result.impediments.push({ kind: IMPEDIMENTS.INVALID_VALUE, code: item.code, detail: 'ponto obtido acima do máximo' });
      bucket.reasons.add(REASONS.INVALID_VALUE);
      continue;
    }

    bucket.points += framing.points;
    bucket.max += item.maxPoints;
    bucket.applicable += 1;
    if (item.maxPoints === 0) bucket.zeroMax += 1;
    bucket.items.push({ code: item.code, axis, state: applicability.state, counted: true, points: framing.points, max: item.maxPoints });
  }

  // ----------------------------------------------------------------- eixos
  for (const axis of AXES) {
    const bucket = axisData[axis];
    const reasons = [...bucket.reasons];
    const hasBase = bucket.max > 0;
    if (!hasBase) reasons.push(REASONS.NO_BASE);

    const percentageExact = hasBase ? (bucket.points * 100) / bucket.max : null;
    const band = hasBase && bracket ? bandFor(bucket.points, bucket.max, policy, bracket) : null;

    // Divergência entre as políticas modeladas no caso concreto.
    let pendingRatification = null;
    if (hasBase && bracket) {
      const others = alternatives
        .map((other) => ({ policy: other.id, band: bandFor(bucket.points, bucket.max, other, bracket) }))
        .filter((other) => other.band !== band);
      if (others.length) {
        pendingRatification = { band, alternatives: others, detail: 'a faixa depende de política ainda não ratificada pela FIEMS' };
        reasons.push(REASONS.POLICY_PENDING);
      }
    }

    const valid = hasBase && !!bracket && reasons.length === 0;
    result.axes[axis] = {
      axis,
      points: bucket.points,
      max: bucket.max,
      percentage: percentageExact,
      percentageDisplay: percentageExact === null ? null : Number(percentageExact.toFixed(2)),
      exact: { points: bucket.points, max: bucket.max },
      band: valid ? band : null,
      bandIfValid: band,
      valid,
      reasons,
      pendingRatification,
      base: {
        applicable: bucket.applicable,
        excludedByNa: bucket.excluded,
        zeroMaxIndicators: bucket.zeroMax,
        hasBase,
      },
    };
  }

  // ----------------------------------------------------------------- rating
  const axisList = AXES.map((axis) => result.axes[axis]);
  result.ratingValid = axisList.every((axis) => axis.valid);
  result.rating = result.ratingValid ? axisList.map((axis) => axis.band).join('') : null;
  result.ratingByAxis = Object.fromEntries(AXES.map((axis) => [axis, result.axes[axis].band]));

  // ----------------------------------------------------------------- impedimentos
  for (const unmet of result.mandatory.unmet)
    result.impediments.push({
      kind: IMPEDIMENTS.MANDATORY_UNMET,
      code: unmet.code,
      axis: unmet.axis,
      detail: `requisito obrigatório não atendido: ${unmet.code} — ${unmet.title} (exigido "${unmet.requiredLevel}", registrado "${unmet.actualLevel}")`,
    });

  for (const axis of axisList) {
    if (!axis.base.hasBase)
      result.impediments.push({
        kind: IMPEDIMENTS.NO_BASE,
        axis: axis.axis,
        detail: `eixo ${axis.axis} sem base para classificação (máximo aplicável igual a zero)`,
      });
    if (axis.reasons.includes(REASONS.NO_ANSWER) || axis.reasons.includes(REASONS.NO_AUDIT_DECISION))
      result.impediments.push({
        kind: IMPEDIMENTS.PENDING_DECISION,
        axis: axis.axis,
        detail:
          mode === 'self'
            ? `eixo ${axis.axis} com indicador sem resposta`
            : `eixo ${axis.axis} com indicador sem decisão da auditoria`,
      });
    if (axis.reasons.includes(REASONS.NA_PENDING))
      result.impediments.push({
        kind: IMPEDIMENTS.NA_PENDING,
        axis: axis.axis,
        detail: `eixo ${axis.axis} com pedido de "não se aplica" aguardando decisão do auditor`,
      });
    if (axis.pendingRatification)
      result.impediments.push({
        kind: IMPEDIMENTS.POLICY_PENDING,
        axis: axis.axis,
        detail: `faixa do eixo ${axis.axis} depende do limite ainda não ratificado (política ${policy.id} indica ${axis.pendingRatification.band}; ${axis.pendingRatification.alternatives
          .map((alternative) => `${alternative.policy} indica ${alternative.band}`)
          .join(', ')})`,
      });
    if (axis.valid && !BAND_ORDER.includes(axis.band))
      result.impediments.push({
        kind: IMPEDIMENTS.AXIS_BELOW_MINIMUM,
        axis: axis.axis,
        detail: `eixo ${axis.axis} abaixo da faixa mínima (${axis.band}); a faixa mínima para concessão é ${MINIMUM_BAND}`,
      });
  }

  // ----------------------------------------------------------------- elegibilidade
  const unmetMandatory = result.mandatory.unmet.length > 0;
  const belowMinimum = axisList.some((axis) => axis.valid && !BAND_ORDER.includes(axis.band));
  const undecidable =
    !result.ratingValid ||
    !bracket ||
    result.invalid.length > 0 ||
    result.impediments.some((impediment) =>
      [IMPEDIMENTS.PENDING_DECISION, IMPEDIMENTS.NA_PENDING, IMPEDIMENTS.POLICY_PENDING, IMPEDIMENTS.NO_BASE].includes(impediment.kind),
    );

  if (unmetMandatory || belowMinimum) result.eligible = false;
  else if (undecidable || mode === 'self') result.eligible = null;
  else result.eligible = true;

  result.eligibility = {
    value: result.eligible,
    label: result.eligible === true ? 'elegível' : result.eligible === false ? 'inelegível' : 'não determinável',
    blockedBy: result.impediments
      .filter((impediment) => [IMPEDIMENTS.MANDATORY_UNMET, IMPEDIMENTS.AXIS_BELOW_MINIMUM].includes(impediment.kind))
      .map((impediment) => impediment.detail),
    undeterminedBy: undecidable
      ? result.impediments
          .filter((impediment) =>
            [IMPEDIMENTS.PENDING_DECISION, IMPEDIMENTS.NA_PENDING, IMPEDIMENTS.POLICY_PENDING, IMPEDIMENTS.NO_BASE, IMPEDIMENTS.INVALID_VALUE].includes(
              impediment.kind,
            ),
          )
          .map((impediment) => impediment.detail)
      : [],
  };

  /**
   * Decisão final (certificação) **não** é calculada aqui: depende da aprovação do supervisor.
   * O motor entrega rating matemático, elegibilidade e impedimentos separados.
   */
  result.certificationAllowed = result.eligible === true;
  return result;
}

module.exports = { computeResult, AXES, REASONS, IMPEDIMENTS, framingOf, applicabilityOf };
