/**
 * Ponte entre o banco e o motor de cálculo: carrega o ciclo em lote, normaliza os itens e
 * devolve o resultado estruturado. É o **único** lugar que calcula resultado — dashboard,
 * relatório e certificação consomem daqui (o frontend apenas apresenta).
 */
const db = require('../db');
const { notFound } = require('../http');
const { computeResult } = require('./engine');
const policies = require('./policies');

/** Carrega tudo do ciclo em poucas consultas (sem uma consulta por indicador). */
async function loadCycleItems(reportId) {
  const items = await db.all(
    `SELECT qr.id, qr.questionId, qr.status, qr.selectedAnswerId, qr.auditedAnswerId, qr.auditConclusion,
            qr.auditedSource, qr.nonApplicable, qr.answerState,
            q.code, q.codeOriginal, q.title, q.section, q.category AS axis, q.maxPoints, q.mandatoryAnswerId,
            q.hasMandatory
       FROM question_reports qr JOIN questions q ON q.id = qr.questionId
      WHERE qr.reportId = ?
      ORDER BY q.section = 'All' DESC, q.position, q.code`,
    reportId,
  );
  if (!items.length) return [];

  const questionIds = [...new Set(items.map((item) => item.questionId))];
  const marks = (list) => list.map(() => '?').join(', ');
  const answers = await db.all(
    `SELECT id, questionId, title, points, position, mandatory FROM answers WHERE questionId IN (${marks(questionIds)})
      ORDER BY position, id`,
    ...questionIds,
  );
  const byQuestion = new Map();
  for (const answer of answers) {
    if (!byQuestion.has(answer.questionId)) byQuestion.set(answer.questionId, []);
    byQuestion.get(answer.questionId).push(answer);
  }

  const naRows = await db.all(
    `SELECT questionReportId, decision, requestedAt, decidedAt, justification, origin
       FROM na_requests WHERE reportId = ? AND withdrawnAt IS NULL
      ORDER BY requestedAt`,
    reportId,
  );
  const naByItem = new Map();
  for (const row of naRows) naByItem.set(row.questionReportId, row); // o último pedido vale

  return items.map((item) => {
    const levels = byQuestion.get(item.questionId) || [];
    const byId = new Map(levels.map((level) => [level.id, level]));
    const minimum = item.mandatoryAnswerId ? byId.get(item.mandatoryAnswerId) : levels.find((level) => level.mandatory === 1);
    // Rascunho não é declaração: só a versão enviada conta. Itens herdados (sem estado de
    // rascunho registrado) mantêm a resposta que já tinham.
    const declaredLevel = item.selectedAnswerId && item.answerState !== 'draft' ? byId.get(item.selectedAnswerId) : null;
    const auditedLevel = item.auditedAnswerId ? byId.get(item.auditedAnswerId) : null;

    /**
     * Enquadramento auditado: usa o nível registrado pelo auditor. Nos itens herdados do
     * modelo anterior, "Approved" significa endosso da declaração e "Rejected" significa
     * conclusão de não atendimento (ver migração 009).
     */
    let audited = null;
    let auditConclusion = item.auditConclusion || null;
    if (auditedLevel) audited = { answerId: auditedLevel.id, position: auditedLevel.position, points: auditedLevel.points, name: auditedLevel.title };
    else if (!auditConclusion && item.status === 'Approved' && declaredLevel) {
      audited = { answerId: declaredLevel.id, position: declaredLevel.position, points: declaredLevel.points, name: declaredLevel.title };
      auditConclusion = 'met';
    } else if (!auditConclusion && item.status === 'Rejected') auditConclusion = 'not-met';

    const na = naByItem.get(item.id);
    return {
      questionReportId: item.id,
      code: item.codeOriginal || item.code,
      title: item.title,
      section: item.section,
      axis: item.axis,
      maxPoints: item.maxPoints,
      status: item.status,
      mandatory: {
        required: !!(minimum || item.hasMandatory === 1),
        minimumPosition: minimum ? minimum.position : null,
        minimumName: minimum ? minimum.title : null,
        minimumPoints: minimum ? minimum.points : null,
      },
      levels: levels.map((level) => ({ id: level.id, position: level.position, name: level.title, points: level.points })),
      declared: declaredLevel
        ? { answerId: declaredLevel.id, position: declaredLevel.position, points: declaredLevel.points, name: declaredLevel.title }
        : null,
      audited,
      auditConclusion,
      auditedSource: item.auditedSource || null,
      na: na
        ? { requested: true, decision: na.decision || null, requestedAt: na.requestedAt, decidedAt: na.decidedAt || null, origin: na.origin || null }
        : { requested: false, decision: null },
    };
  });
}

async function reportById(reportId) {
  const report = await db.one('SELECT * FROM reports WHERE id = ?', reportId);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

/**
 * Resultado de um ciclo.
 * @param {string} reportId
 * @param {{mode?: 'audited'|'self', policyId?: string}} options
 */
async function resultOfCycle(reportId, { mode = 'audited', policyId = null } = {}) {
  const report = await reportById(reportId);
  const company = await db.one('SELECT id, size, bussinessName, cnpj, section FROM companies WHERE id = ?', report.companyId);
  const items = await loadCycleItems(reportId);
  const result = computeResult({ items, size: company ? company.size : null, mode, policyId });
  return {
    ...result,
    cycle: {
      reportId: report.id,
      companyId: report.companyId,
      company: company ? { id: company.id, bussinessName: company.bussinessName, size: company.size, section: company.section } : null,
      cycle: report.cycle,
      round: report.currentRound || 1,
      status: report.status,
      section: report.section,
      catalogVersion: report.catalogVersion,
      catalogVersionId: report.catalogVersionId,
    },
    items: items.map((item) => ({
      code: item.code,
      title: item.title,
      axis: item.axis,
      section: item.section,
      maxPoints: item.maxPoints,
      status: item.status,
      mandatory: item.mandatory.required,
      minimumLevel: item.mandatory.minimumName,
      declaredLevel: item.declared ? item.declared.name : null,
      declaredPoints: item.declared ? item.declared.points : null,
      auditedLevel: item.audited ? item.audited.name : null,
      auditedPoints: item.audited ? item.audited.points : null,
      auditConclusion: item.auditConclusion,
      na: item.na,
    })),
  };
}

/**
 * Grava o resultado com a versão da regra usada, para que alteração posterior de regra ou de
 * catálogo não reescreva o histórico.
 */
async function persistResult(reportId, { mode = 'audited', policyId = null, computedById = null } = {}) {
  const report = await reportById(reportId);
  const result = await resultOfCycle(reportId, { mode, policyId });
  const id = db.uuid();
  await db.run(
    `INSERT INTO cycle_results (id, reportId, round, mode, ruleVersion, policyId, policyStatus, catalogVersionId, size, bracket,
                                rating, ratingValid, eligible, payload, computedAt, computedById)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    reportId,
    report.currentRound || 1,
    mode,
    result.ruleVersion,
    result.policy.id,
    result.policy.status,
    report.catalogVersionId,
    result.size,
    result.bracket,
    result.rating,
    result.ratingValid ? 1 : 0,
    result.eligible === null ? null : result.eligible ? 1 : 0,
    JSON.stringify(result),
    result.computedAt,
    computedById,
  );
  for (const axis of Object.values(result.axes))
    await db.run(
      `INSERT INTO cycle_result_axes (id, cycleResultId, axis, points, maxPoints, percentage, band, valid, reasons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      db.uuid(),
      id,
      axis.axis,
      axis.points,
      axis.max,
      axis.percentage,
      axis.band,
      axis.valid ? 1 : 0,
      JSON.stringify(axis.reasons),
    );
  if (mode === 'audited')
    await db.run(
      'UPDATE reports SET resultRuleVersion = ?, resultPolicyId = ?, resultRating = ?, resultEligible = ?, resultComputedAt = ?, updatedAt = ? WHERE id = ?',
      result.ruleVersion,
      result.policy.id,
      result.rating,
      result.eligible === null ? null : result.eligible ? 1 : 0,
      result.computedAt,
      db.now(),
      reportId,
    );
  return { id, result };
}

/** Resultado gravado mais recente (histórico preservado). */
async function storedResult(reportId, { mode = 'audited' } = {}) {
  const row = await db.one(
    'SELECT * FROM cycle_results WHERE reportId = ? AND mode = ? ORDER BY computedAt DESC LIMIT 1',
    reportId,
    mode,
  );
  return row ? { ...row, payload: JSON.parse(row.payload) } : null;
}

const storedHistory = async (reportId) => db.all(
    `SELECT id, round, mode, ruleVersion, policyId, policyStatus, rating, ratingValid, eligible, computedAt
       FROM cycle_results WHERE reportId = ? ORDER BY computedAt DESC`,
    reportId,
  );

module.exports = { loadCycleItems, resultOfCycle, persistResult, storedResult, storedHistory, policies, computeResult };
