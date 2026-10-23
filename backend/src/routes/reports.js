const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const ser = require('../serializers');
const publication = require('../publication');
const { badRequest, forbidden, notFound, conflict, asyncRouter } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const { loadQuestionReport, currentCycle, createCycleForCompany } = require('../services');
const scoring = require('../scoring');
const workflow = require('../workflow');

const router = asyncRouter();
router.use(['/reports', '/auditory'], authenticate);

const trim = (value) => String(value ?? '').trim();

/** Perfis do lado da empresa: não veem o trabalho da auditoria antes da aprovação. */
const COMPANY_SIDE = ['MANAGER', 'EMPLOYEE', 'CONSULTOR'];
const showAuditFor = (role, report) => !COMPANY_SIDE.includes(role) || report.status === workflow.CYCLE.AUDITED;

/* ------------------------------------------------------------------ carregamento */

/**
 * Carrega os itens de um ciclo com as coleções em lote (uma consulta por coleção), em vez de
 * uma consulta por item como antes (diagnóstico A16).
 */
async function loadItems(report, { onlyAnswererId = null } = {}) {
  const items = await db.all(
    `SELECT qr.* FROM question_reports qr JOIN questions q ON q.id = qr.questionId
      WHERE qr.reportId = ? ${onlyAnswererId ? 'AND qr.answererId = ?' : ''}
      ORDER BY q.section = 'All' DESC, q.position, q.code`,
    ...(onlyAnswererId ? [report.id, onlyAnswererId] : [report.id]),
  );
  if (!items.length) return { items: [], bundle: null };

  const ids = items.map((i) => i.id);
  const marks = (list) => list.map(() => '?').join(', ');
  const questionIds = [...new Set(items.map((i) => i.questionId))];
  const questions = await db.all(`SELECT * FROM questions WHERE id IN (${marks(questionIds)})`, ...questionIds);
  const answers = await db.all(`SELECT * FROM answers WHERE questionId IN (${marks(questionIds)}) ORDER BY position, id`, ...questionIds);
  const files = await db.all(
    `SELECT ${ser.ITEM_FILE_COLUMNS}
       FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
      WHERE qrf.questionReportId IN (${marks(ids)}) AND qrf.removedAt IS NULL ORDER BY qrf.createdAt`,
    ...ids,
  );
  const evidences = await db.all(
    `SELECT id, questionReportId, name, url, fileType, sizeBytes, round, createdAt FROM evidences
      WHERE questionReportId IN (${marks(ids)}) ORDER BY createdAt`,
    ...ids,
  );
  const naRows = await db.all(
    `SELECT * FROM na_requests WHERE questionReportId IN (${marks(ids)}) AND withdrawnAt IS NULL ORDER BY requestedAt`,
    ...ids,
  );
  const peopleIds = [
    ...new Set(
      items.flatMap((i) => [i.answererId, i.redflagIssuerId, i.assignedById, i.answeredById, i.auditedById]).filter(Boolean),
    ),
  ];
  const people = peopleIds.length
    ? await db.all(`SELECT id, name, email, role FROM users WHERE id IN (${marks(peopleIds)})`, ...peopleIds)
    : [];

  const group = (rows, key) => {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row[key])) map.set(row[key], []);
      map.get(row[key]).push(row);
    }
    return map;
  };

  return {
    items,
    bundle: {
      report: { id: report.id, companyId: report.companyId, status: report.status, cycle: report.cycle, currentRound: report.currentRound },
      questions: new Map(questions.map((q) => [q.id, q])),
      answersByQuestion: group(answers, 'questionId'),
      answersById: new Map(answers.map((a) => [a.id, a])),
      files: group(files, 'questionReportId'),
      evidences: group(evidences, 'questionReportId'),
      na: new Map(naRows.map((row) => [row.questionReportId, row])), // o último pedido vale
      people: new Map(people.map((p) => [p.id, p])),
    },
  };
}

async function reportById(id) {
  const report = await db.one('SELECT * FROM reports WHERE id = ?', id);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

/** Autoriza a leitura de um ciclo por qualquer perfil com escopo (empresa ou designação). */
async function assertCycleRead(req, report) {
  const direct = await authz.can(req.principal, 'cycle.read', { companyId: report.companyId });
  if (direct.ok) {
    req.actorRole = direct.role;
    return direct.role;
  }
  const professional = await authz.can(req.principal, 'cycle.read.professional', {
    companyId: report.companyId,
    reportId: report.id,
  });
  if (!professional.ok) throw forbidden(professional.reason);
  req.actorRole = professional.role;
  return professional.role;
}

/** Item serializado conforme quem está lendo. */
async function itemView(req, id) {
  const qr = await db.one('SELECT * FROM question_reports WHERE id = ?', id);
  const report = await reportById(qr.reportId);
  return ser.questionReport(qr, null, { showAudit: showAuditFor(req.actorRole, report) });
}

/** Autorização das ações da empresa sobre um indicador (resposta, rascunho e anexos). */
async function assertItemWrite(req, id, action = 'cycle.answer') {
  const { qr, report } = await loadQuestionReport(id);
  const role = await authz.assertCan(req, action, { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  return { qr, report, role };
}

const lockVersionOf = (body) => (body && body.expectedLockVersion !== undefined ? body.expectedLockVersion : undefined);

/* ------------------------------------------------------------------ leitura */

// Sem :reportId, usa o ciclo corrente da empresa em contexto.
router.get(['/reports/company/questions', '/reports/company/questions/:reportId'], async (req, res) => {
  if (!req.params.reportId && !req.context.companyId) throw badRequest('usuário sem empresa em contexto');
  const report = req.params.reportId ? await reportById(req.params.reportId) : await currentCycle(req.context.companyId);
  const role = await assertCycleRead(req, report);
  // Colaborador: somente os indicadores atribuídos a ele (filtro no servidor, não na tela).
  const { items, bundle } = await loadItems(report, { onlyAnswererId: role === 'EMPLOYEE' ? req.principal.user.id : null });
  const showAudit = showAuditFor(role, report);
  res.json(await Promise.all(items.map((item) => ser.questionReport(item, bundle, { showAudit }))));
});

router.get('/reports/questionReports/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  const role = await assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(await ser.questionReport(qr, null, { showAudit: showAuditFor(role, report) }));
});

/**
 * Histórico do indicador: versões enviadas, revisões e decisões (cada uma presa à versão
 * analisada), comentários, pedidos de NA, pendências e arquivos — inclusive desvinculados.
 */
router.get('/reports/questionReports/:id/history', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  const role = await assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  const showAudit = showAuditFor(role, report);
  const people = async (rows, key) => {
    const ids = [...new Set(rows.map((r) => r[key]).filter(Boolean))];
    if (!ids.length) return new Map();
    const found = await db.all(`SELECT id, name, email FROM users WHERE id IN (${ids.map(() => '?').join(', ')})`, ...ids);
    return new Map(found.map((p) => [p.id, { id: p.id, name: p.name, email: p.email }]));
  };

  const versions = await db.all('SELECT * FROM item_answer_versions WHERE questionReportId = ? ORDER BY snapshotAt', qr.id);
  const reviews = (
    await db.all('SELECT * FROM item_reviews WHERE questionReportId = ? ORDER BY reviewedAt', qr.id)
  ).filter((r) => showAudit || r.kind !== 'audit' || r.decision === 'complement');
  const comments = (await db.all('SELECT * FROM item_comments WHERE questionReportId = ? ORDER BY createdAt', qr.id)).filter(
    (c) => showAudit || c.visibility !== 'auditoria',
  );
  const naRequests = await db.all('SELECT * FROM na_requests WHERE questionReportId = ? ORDER BY requestedAt', qr.id);
  const pendings = await db.all('SELECT * FROM pendings WHERE questionReportId = ? ORDER BY createdAt', qr.id);
  const files = await db.all(
    `SELECT ${ser.ITEM_FILE_COLUMNS}, qrf.removedAt
       FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
      WHERE qrf.questionReportId = ? ORDER BY qrf.createdAt`,
    qr.id,
  );
  const reviewers = await people(reviews, 'reviewedById');
  const authors = await people(comments, 'authorId');
  const answeredBy = await people(versions, 'answeredById');

  res.json({
    id: qr.id,
    answerVersion: qr.answerVersion,
    answerState: qr.answerState,
    lockVersion: qr.lockVersion,
    versions: versions.map((v) => ({
      ...v,
      nonApplicable: ser.bool(v.nonApplicable),
      files: JSON.parse(v.files || '[]'),
      answeredBy: answeredBy.get(v.answeredById) || null,
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      kind: r.kind,
      round: r.round,
      answerVersion: r.answerVersion,
      decision: r.decision,
      auditedAnswerId: r.auditedAnswerId,
      conclusion: r.conclusion,
      comment: r.comment,
      reviewedBy: reviewers.get(r.reviewedById) || null,
      reviewedByRole: r.reviewedByRole,
      reviewedAt: r.reviewedAt,
      // Revisão de versão anterior permanece no histórico, mas não vale para a resposta atual.
      current: !r.supersededAt && r.answerVersion === qr.answerVersion,
      supersededAt: r.supersededAt,
      supersededReason: r.supersededReason,
    })),
    comments: comments.map((c) => ({ ...c, author: authors.get(c.authorId) || null })),
    naRequests: naRequests.map((n) => ({
      id: n.id,
      round: n.round,
      justification: n.justification,
      requestedAt: n.requestedAt,
      requestedByRole: n.requestedByRole,
      withdrawnAt: n.withdrawnAt,
      decision: showAudit ? n.decision : n.decision ? 'decidido' : null,
      decisionReason: showAudit ? n.decisionReason : null,
      decidedAt: showAudit ? n.decidedAt : null,
    })),
    pendings,
    files: files.map((f) => ({ ...ser.itemFile(f), removedAt: f.removedAt ?? null })),
  });
});

/**
 * Versões enviadas de um indicador (uma por envio, em ordem). As fotografias da liberação e do
 * retorno ficam no histórico completo (`/history`).
 */
router.get('/reports/questionReports/:id/versions', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(
    (
      await db.all(
        "SELECT * FROM item_answer_versions WHERE questionReportId = ? AND snapshotReason = 'submit' ORDER BY answerVersion, snapshotAt",
        qr.id,
      )
    ).map((v) => ({ ...v, nonApplicable: ser.bool(v.nonApplicable), files: JSON.parse(v.files || '[]') })),
  );
});

router.get('/reports/:reportId', async (req, res) => {
  const report = await reportById(req.params.reportId);
  await assertCycleRead(req, report);
  res.json(await ser.reportDetail(report));
});

/**
 * Situação do fluxo: o que impede liberar ou concluir, para a interface não oferecer uma ação
 * que a API vai recusar.
 */
router.get('/reports/:reportId/workflow', async (req, res) => {
  const report = await reportById(req.params.reportId);
  const role = await assertCycleRead(req, report);
  const items = await db.all(
    `SELECT qr.*, q.code FROM question_reports qr JOIN questions q ON q.id = qr.questionId WHERE qr.reportId = ? ORDER BY q.position, q.code`,
    report.id,
  );
  const visible = role === 'EMPLOYEE' ? items.filter((i) => i.answererId === req.principal.user.id) : items;
  const releaseBlockers = visible.map((i) => ({ id: i.id, code: i.code, reason: workflow.releaseBlocker(i) })).filter((b) => b.reason);
  const professionals = await db.all('SELECT role FROM cycle_professionals WHERE reportId = ? AND revokedAt IS NULL', report.id);
  res.json({
    reportId: report.id,
    status: report.status,
    round: report.currentRound || 1,
    lockVersion: report.lockVersion,
    locked: report.status !== workflow.CYCLE.FILLING,
    auditRequestedAt: report.auditRequestedAt ?? null,
    professionals: { auditor: professionals.some((p) => p.role === 'AUDITOR'), supervisor: professionals.some((p) => p.role === 'SUPERVISOR') },
    counts: {
      total: visible.length,
      submitted: visible.filter((i) => i.answerState === 'submitted').length,
      drafts: visible.filter((i) => i.answerState === 'draft').length,
      empty: visible.filter((i) => i.answerState === 'empty').length,
    },
    releaseBlockers,
    auditBlockers: showAuditFor(role, report) && report.status === workflow.CYCLE.AUDITING ? await workflow.auditBlockers(report) : [],
  });
});

/**
 * Recertificação: abre o próximo ciclo, ligado ao anterior, com o caderno atual da empresa e a
 * versão do catálogo em vigor. O ciclo anterior (resultado, documentos, histórico) não muda.
 */
router.post('/reports/company/:companyId/cycles', authz.authorize('companies.manage'), async (req, res) => {
  const company = await db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', req.params.companyId);
  if (!company) throw notFound('company not found');
  const last = await db.one('SELECT id, status, cycle FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', company.id);
  if (last && last.status !== workflow.CYCLE.AUDITED)
    throw conflict('a empresa já possui um ciclo em andamento; conclua-o antes de abrir outro');
  const id = await createCycleForCompany(company, { createdById: req.principal.user.id, previousReportId: last ? last.id : null });
  await authz.audit(req, 'cycle.open', { entity: 'reports', entityId: id, companyId: company.id, details: { previous: last ? last.id : null } });
  res.status(201).json(ser.report(await reportById(id)));
});

/** Ciclos da empresa (histórico e relação entre eles). */
router.get('/reports/company/:companyId/cycles', async (req, res) => {
  await authz.assertCompanyScope(req, req.params.companyId, 'company.read');
  res.json((await db.all('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle', req.params.companyId)).map(ser.report));
});

/**
 * Resultado do ciclo calculado pelo **motor único** do backend (src/scoring).
 *
 * `mode=audited` é a conclusão da auditoria; `mode=self` é o autodiagnóstico da empresa, sempre
 * preliminar. Antes da aprovação, a empresa acompanha o andamento (`self`) — o resultado
 * auditado fica restrito a quem conduz o processo.
 */
router.get('/reports/:reportId/result', async (req, res) => {
  const report = await reportById(req.params.reportId);
  const role = await assertCycleRead(req, report);
  const mode = (req.query.mode || 'audited') === 'self' ? 'self' : 'audited';
  if (mode === 'audited' && COMPANY_SIDE.includes(role) && report.status !== workflow.CYCLE.AUDITED)
    throw forbidden(
      'o resultado auditado fica disponível para a empresa após a aprovação do supervisor; use mode=self para acompanhar o andamento',
    );
  const result = await scoring.resultOfCycle(report.id, { mode, policyId: (req.query.policy || '').trim() || null });
  res.json(result);
});

/** Resultados gravados (histórico; mudança de regra não reescreve o que já foi concluído). */
router.get('/reports/:reportId/result/history', async (req, res) => {
  const report = await reportById(req.params.reportId);
  await assertCycleRead(req, report);
  res.json(await scoring.storedHistory(report.id));
});

/* ------------------------------------------------------------------ preenchimento */

/** Arquivos citados no corpo antigo (`filesToCreate` por url, `filesToAdd` por id). */
async function fileIdsFromLegacy(body, report) {
  const ids = [];
  for (const f of Array.isArray(body.filesToCreate) ? body.filesToCreate : []) {
    const file = await db.one('SELECT id FROM company_files WHERE companyId = ? AND url = ?', report.companyId, f && f.url);
    if (file) ids.push(file.id); // o upload (POST /uploads/companyFile) já registrou o arquivo
  }
  for (const id of Array.isArray(body.filesToAdd) ? body.filesToAdd : []) ids.push(id);
  for (const id of Array.isArray(body.fileIds) ? body.fileIds : []) ids.push(id);
  return [...new Set(ids)];
}

/** Rascunho: grava sem enviar para revisão. */
router.patch('/reports/questionReports/:id/draft', async (req, res) => {
  const { report } = await assertItemWrite(req, req.params.id);
  const b = req.body || {};
  await workflow.saveDraft(req, req.params.id, {
    answerId: b.answerId,
    answerText: b.answerText,
    fileIds: await fileIdsFromLegacy(b, report),
    removeFileIds: b.removeFileIds,
    naRequest: b.naRequest,
    expectedLockVersion: lockVersionOf(b),
  });
  res.json(await itemView(req, req.params.id));
});

/** Envio da versão atual para revisão do gestor/consultor. */
router.post('/reports/questionReports/:id/submit', async (req, res) => {
  await assertItemWrite(req, req.params.id);
  await workflow.submit(req, req.params.id, { expectedLockVersion: lockVersionOf(req.body) });
  res.status(201).json(await itemView(req, req.params.id));
});

/**
 * Rota herdada: grava e envia em um passo (o formulário antigo não tinha rascunho). Com
 * `draft: true` apenas salva. "Não se aplica" vira **pedido** à auditoria, com justificativa.
 */
router.patch('/reports/answerQuestion/:id', async (req, res) => {
  const { report } = await assertItemWrite(req, req.params.id);
  const b = req.body || {};
  const nonApplicable = !!b.nonApplicable;
  if (!nonApplicable && !b.answerId && !b.draft) throw badRequest('selecione uma resposta');
  const fileIds = await fileIdsFromLegacy(b, report);
  await workflow.saveDraft(req, req.params.id, {
    answerId: nonApplicable ? null : b.answerId,
    answerText: b.answerText ?? null,
    fileIds,
    naRequest: nonApplicable ? { justification: b.naJustification ?? b.answerText ?? '' } : undefined,
    expectedLockVersion: lockVersionOf(b),
  });
  if (b.addToGed && fileIds.length)
    await db.run(`UPDATE company_files SET inGed = 1 WHERE companyId = ? AND id IN (${fileIds.map(() => '?').join(', ')})`, report.companyId, ...fileIds);
  if (!b.draft) await workflow.submit(req, req.params.id);
  res.json(await itemView(req, req.params.id));
});

/** Anexa arquivos do GED ao indicador — sujeito ao mesmo bloqueio da resposta (A7). */
router.patch('/reports/editQuestionReport/:id', async (req, res) => {
  const { report } = await assertItemWrite(req, req.params.id, 'cycle.attach');
  const ids = await fileIdsFromLegacy(req.body || {}, report);
  await workflow.attach(req, req.params.id, ids);
  await authz.audit(req, 'item.attach', { entity: 'question_reports', entityId: req.params.id, companyId: report.companyId, details: { files: ids.length } });
  res.json(await itemView(req, req.params.id));
});

/** Desvincula arquivo do indicador (marcação; a versão enviada continua apontando para ele). */
router.delete('/reports/questionFiles/:id', async (req, res) => {
  const link = await db.one('SELECT * FROM question_report_files WHERE id = ?', req.params.id);
  if (!link || link.removedAt) throw notFound('file not found');
  const { report } = await assertItemWrite(req, link.questionReportId, 'cycle.attach');
  await workflow.detach(req, link.id);
  await authz.audit(req, 'item.detach', { entity: 'question_report_files', entityId: link.id, companyId: report.companyId, details: { fileId: link.fileId } });
  res.json({ id: link.id, deleted: true });
});

/* ------------------------------------------------------------------ revisão interna */

/**
 * Revisão do gestor ou do consultor. A aprovação vale para a versão enviada no momento
 * (`answerVersion`); se a resposta mudar, volta à revisão.
 */
router.post('/reports/validateanswer/:id', async (req, res) => {
  const { report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.validate', { companyId: report.companyId });
  const { veredict, redflag, comment, answerVersion } = req.body || {};
  await workflow.review(req, req.params.id, { veredict: !!veredict, comment: comment ?? redflag, answerVersion });
  res.status(201).json(await itemView(req, req.params.id));
});

/* ------------------------------------------------------------------ delegação */

/** Gestor delega o indicador a pessoa autorizada da empresa e registra prazo. */
router.patch('/reports/addanswerer/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'item.assign', { companyId: report.companyId });
  if (!authz.isOpenCycle(report)) throw forbidden('o ciclo está bloqueado para edição; a delegação só muda durante o preenchimento');
  const body = req.body || {};
  const userId = body.user || body.userId;
  if (!userId) throw badRequest('informe o responsável');
  const link = await db.one(
    `SELECT l.role FROM user_company_links l JOIN users u ON u.id = l.userId
      WHERE l.userId = ? AND l.companyId = ? AND l.revokedAt IS NULL AND l.role IN ('MANAGER', 'EMPLOYEE')
        AND u.deletedAt IS NULL AND u.status = 'ACTIVE'`,
    userId,
    report.companyId,
  );
  if (!link) throw badRequest('responsável inválido: a pessoa precisa ter vínculo vigente com a empresa');
  let dueDate = null;
  if (body.dueDate) {
    const parsed = new Date(body.dueDate);
    if (Number.isNaN(parsed.getTime())) throw badRequest('prazo inválido');
    dueDate = parsed.toISOString();
  }
  await db.run(
    'UPDATE question_reports SET answererId = ?, assignedById = ?, assignedAt = ?, dueDate = ?, lockVersion = lockVersion + 1, updatedAt = ? WHERE id = ?',
    userId,
    req.principal.user.id,
    db.now(),
    dueDate,
    db.now(),
    qr.id,
  );
  await authz.audit(req, 'item.assign', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { userId, dueDate } });
  res.json(await itemView(req, qr.id));
});

/* ------------------------------------------------------------------ lembretes */

router.patch('/reports/redflag/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  const text = trim((req.body || {}).redflag);
  if (!text) throw badRequest('o lembrete não pode ser vazio');
  await db.run(
    'UPDATE question_reports SET redflag = ?, redflag_date = ?, redflagIssuerId = ?, updatedAt = ? WHERE id = ?',
    text,
    db.now(),
    req.principal.user.id,
    db.now(),
    qr.id,
  );
  res.json(await itemView(req, qr.id));
});

router.delete('/reports/redflag/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  // Observação técnica do auditor não é lembrete da empresa e não pode ser apagada por aqui.
  if (qr.redflagIssuerId) {
    const issuerIsAuditor = await db.one(
      "SELECT id FROM user_profiles WHERE userId = ? AND role = 'AUDITOR' AND revokedAt IS NULL",
      qr.redflagIssuerId,
    );
    if (issuerIsAuditor) throw forbidden('a observação registrada pela auditoria não pode ser removida pela empresa');
  }
  await db.run('UPDATE question_reports SET redflag = NULL, redflag_date = NULL, redflagIssuerId = NULL, updatedAt = ? WHERE id = ?', db.now(), qr.id);
  res.json(await itemView(req, qr.id));
});

/**
 * Reabertura administrativa de um item: permitida apenas enquanto o ciclo está em
 * preenchimento. Durante a auditoria, o caminho é o retorno registrado do processo.
 */
router.patch('/reports/changeQuestionStatus/:id/:status', async (req, res) => {
  const { report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.answer', { companyId: report.companyId });
  if (!req.principal.isAdmin) throw forbidden('ação restrita à Administração');
  if (req.params.status !== 'Pending') throw badRequest('status inválido: a reabertura devolve o item para "Pending"');
  await workflow.reopenItem(req, req.params.id);
  res.json(await itemView(req, req.params.id));
});

/* ------------------------------------------------------------------ pendências */

router.get('/reports/:reportId/pendings', async (req, res) => {
  const report = await reportById(req.params.reportId);
  const role = await assertCycleRead(req, report);
  const rows = await db.all(
    `SELECT p.*, q.code, qr.answererId FROM pendings p
       LEFT JOIN question_reports qr ON qr.id = p.questionReportId
       LEFT JOIN questions q ON q.id = qr.questionId
      WHERE p.reportId = ? ORDER BY p.status = 'aberta' DESC, p.dueDate IS NULL, p.dueDate, p.createdAt`,
    report.id,
  );
  // Colaborador: só as pendências dos seus indicadores ou atribuídas a ele.
  const visible =
    role === 'EMPLOYEE'
      ? rows.filter((p) => p.responsibleId === req.principal.user.id || p.answererId === req.principal.user.id)
      : rows;
  const now = new Date();
  res.json(
    visible.map(({ answererId, ...p }) => ({
      ...p,
      // Prazo vencido é sinalização: não altera pontuação nem reprova.
      overdue: !!p.dueDate && ['aberta', 'em-andamento'].includes(p.status) && new Date(p.dueDate) < now,
    })),
  );
});

router.post('/reports/:reportId/pendings', async (req, res) => {
  const report = await reportById(req.params.reportId);
  await assertCycleRead(req, report);
  const id = await workflow.createPending(req, report, req.body || {});
  res.status(201).json(await db.one('SELECT * FROM pendings WHERE id = ?', id));
});

router.patch('/reports/pendings/:id', async (req, res) => {
  const pending = await db.one('SELECT * FROM pendings WHERE id = ?', req.params.id);
  if (!pending) throw notFound('pendência não encontrada');
  const report = await reportById(pending.reportId);
  const role = await assertCycleRead(req, report);
  if (role === 'EMPLOYEE' && pending.responsibleId !== req.principal.user.id) throw forbidden('você não pode alterar esta pendência');
  await workflow.updatePending(req, pending.id, req.body || {});
  res.json({
    ...(await db.one('SELECT * FROM pendings WHERE id = ?', pending.id)),
    events: await db.all('SELECT * FROM pending_events WHERE pendingId = ? ORDER BY at', pending.id),
  });
});

/* ------------------------------------------------------------------ auditoria: solicitar × liberar */

/** Solicitação de auditoria: gestor manifesta a intenção (a Administração ainda precisa liberar). */
router.post('/reports/requestAudit/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  let role;
  const asManager = await authz.can(req.principal, 'cycle.requestAudit', { companyId: report.companyId });
  if (asManager.ok) role = req.actorRole = asManager.role;
  else role = await authz.assertCan(req, 'cycle.releaseAudit', {}); // Administração também pode registrar a solicitação
  if (!authz.isOpenCycle(report)) throw forbidden('o ciclo está bloqueado para edição');
  await db.run('UPDATE reports SET auditRequestedAt = ?, auditRequestedById = ?, updatedAt = ? WHERE id = ?', db.now(), req.principal.user.id, db.now(), report.id);
  await authz.audit(req, 'cycle.auditRequested', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { role } });
  res.status(201).json(await ser.reportDetail(await reportById(report.id)));
});

/**
 * Liberação operacional do processo para auditoria — cabe à Administração FIEMS.
 * Liberar não é aprovação técnica: nenhum parecer, enquadramento ou resultado é decidido aqui.
 */
router.post(['/reports/releaseAudit/:companyId', '/reports/submit/:companyId'], authz.authorize('cycle.releaseAudit'), async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  await workflow.releaseAudit(req, report.id);
  res.status(201).json(await ser.reportDetail(await reportById(report.id)));
});

/** Designação de auditor e supervisor no ciclo (somente Administração). */
router.post('/reports/:reportId/professionals', authz.authorize('cycle.assignProfessionals'), async (req, res) => {
  const report = await reportById(req.params.reportId);
  const { userId, role } = req.body || {};
  if (!userId || !authz.CYCLE_ASSIGNED_ROLES.includes(role)) throw badRequest('informe o usuário e o papel (AUDITOR ou SUPERVISOR)');
  const link = await db.one(
    `SELECT l.id FROM user_company_links l JOIN users u ON u.id = l.userId
      WHERE l.userId = ? AND l.companyId = ? AND l.role = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL AND u.status = 'ACTIVE'`,
    userId,
    report.companyId,
    role,
  );
  if (!link) throw badRequest('o profissional precisa ter vínculo vigente com a empresa nesse papel');
  // Um mesmo profissional não acumula auditor e supervisor; e consultor da empresa não audita.
  const conflicting = await db.one(
    `SELECT role FROM user_company_links
      WHERE userId = ? AND companyId = ? AND revokedAt IS NULL AND role IN ('CONSULTOR', 'AUDITOR', 'SUPERVISOR') AND role <> ?`,
    userId,
    report.companyId,
    role,
  );
  if (conflicting) throw conflict(`o mesmo profissional não pode atuar como ${conflicting.role} e ${role} nesta empresa`);

  const existing = await db.one('SELECT id, revokedAt FROM cycle_professionals WHERE reportId = ? AND userId = ? AND role = ?', report.id, userId, role);
  if (existing && !existing.revokedAt) return res.status(200).json(await ser.reportDetail(report));
  if (existing)
    await db.run('UPDATE cycle_professionals SET revokedAt = NULL, revokedById = NULL, assignedAt = ?, assignedById = ? WHERE id = ?', db.now(), req.principal.user.id, existing.id);
  else
    await db.run(
      'INSERT INTO cycle_professionals (id, reportId, userId, role, assignedAt, assignedById) VALUES (?, ?, ?, ?, ?, ?)',
      db.uuid(),
      report.id,
      userId,
      role,
      db.now(),
      req.principal.user.id,
    );
  await db.run('UPDATE reports SET needsReview = 0, updatedAt = ? WHERE id = ?', db.now(), report.id);
  await authz.audit(req, 'cycle.assign', { entity: 'cycle_professionals', entityId: report.id, companyId: report.companyId, details: { userId, role } });
  res.status(201).json(await ser.reportDetail(await reportById(report.id)));
});

router.delete('/reports/:reportId/professionals/:userId', authz.authorize('cycle.assignProfessionals'), async (req, res) => {
  const report = await reportById(req.params.reportId);
  const rows = await db.all('SELECT id FROM cycle_professionals WHERE reportId = ? AND userId = ? AND revokedAt IS NULL', report.id, req.params.userId);
  if (!rows.length) throw notFound('designação não encontrada');
  for (const row of rows)
    await db.run('UPDATE cycle_professionals SET revokedAt = ?, revokedById = ? WHERE id = ?', db.now(), req.principal.user.id, row.id);
  await authz.audit(req, 'cycle.unassign', { entity: 'cycle_professionals', entityId: report.id, companyId: report.companyId, details: { userId: req.params.userId } });
  res.json({ reportId: report.id, userId: req.params.userId, revoked: true });
});

/* ------------------------------------------------------------------ retorno do processo */

/** A empresa solicita o retorno; o pedido fica registrado e **não** desbloqueia nada. */
router.post('/reports/requestReturn/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  await authz.assertCan(req, 'cycle.requestReturn', { companyId: report.companyId });
  const reason = trim((req.body || {}).reason);
  if (!reason) throw badRequest('descreva o motivo do pedido de retorno');
  await authz.audit(req, 'cycle.returnRequested', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { reason } });
  res.status(201).json({ reportId: report.id, requested: true, unlocked: false });
});

/**
 * Retorno autorizado: consultor ou Administração. Preserva a versão enviada (foto da rodada)
 * e abre uma nova rodada. O gestor não retorna o processo; o pedido de complemento do auditor,
 * por si só, também não desbloqueia.
 */
router.post('/reports/return/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  await authz.assertCan(req, 'cycle.return', { companyId: report.companyId });
  const body = req.body || {};
  const outcome = await workflow.returnCycle(req, report.id, { reason: body.reason, items: body.items });
  res.status(201).json({ ...(await ser.reportDetail(await reportById(report.id))), round: outcome.round, affectedItems: outcome.affectedItems });
});

/* ------------------------------------------------------------------ auditoria */

async function assertAuditor(req, id, action = 'audit.evaluate') {
  const { qr, report } = await loadQuestionReport(id);
  await authz.assertCan(req, action, { companyId: report.companyId, reportId: report.id });
  return { qr, report };
}

/** Evidências citadas pelo auditor no corpo antigo (`evidence: [{url}]`). */
async function evidenceIdsFromLegacy(list, report) {
  const ids = [];
  for (const e of Array.isArray(list) ? list : []) {
    if (e && e.fileId) ids.push(e.fileId);
    else if (e && e.url) {
      const file = await db.one('SELECT id FROM company_files WHERE companyId = ? AND url = ?', report.companyId, e.url);
      if (file) ids.push(file.id);
    }
  }
  return ids;
}

/**
 * Enquadramento auditado. `auditedAnswerId` pode ser diferente da declaração (para cima ou
 * para baixo); `conclusion: 'not-met'` registra o não atendimento sem comprovação.
 */
router.post('/auditory/questionReports/:id/decision', async (req, res) => {
  const { report } = await assertAuditor(req, req.params.id);
  const b = req.body || {};
  await workflow.auditDecision(req, req.params.id, {
    auditedAnswerId: b.auditedAnswerId,
    conclusion: b.conclusion,
    justification: b.justification,
    evidenceFileIds: [...(Array.isArray(b.evidenceFileIds) ? b.evidenceFileIds : []), ...(await evidenceIdsFromLegacy(b.evidence, report))],
    expectedLockVersion: lockVersionOf(b),
  });
  res.status(201).json(await itemView(req, req.params.id));
});

/** Pedido de complemento: vira pendência; não desbloqueia a empresa. */
router.post('/auditory/questionReports/:id/complement', async (req, res) => {
  await assertAuditor(req, req.params.id);
  const b = req.body || {};
  await workflow.requestComplement(req, req.params.id, { description: b.description, dueDate: b.dueDate });
  res.status(201).json(await itemView(req, req.params.id));
});

/**
 * Rota herdada de avaliação. "Approved" endossa o nível declarado; "Rejected" registra o não
 * atendimento; "PendingRevision" é o pedido de complemento.
 */
router.post('/auditory/evaluatequestion/:id', async (req, res) => {
  const { qr, report } = await assertAuditor(req, req.params.id);
  const { status, redflag, evidence } = req.body || {};
  if (!['Approved', 'Rejected', 'PendingRevision'].includes(status)) throw badRequest('status inválido');
  if (!trim(redflag)) throw badRequest('O campo de Observação é obrigátorio');
  if (status === 'PendingRevision') await workflow.requestComplement(req, qr.id, { description: redflag });
  else {
    if (status === 'Approved' && !qr.selectedAnswerId)
      throw badRequest('a empresa não declarou nível para este indicador; informe o nível auditado ou conclua pelo não atendimento');
    await workflow.auditDecision(req, qr.id, {
      auditedAnswerId: status === 'Approved' ? qr.selectedAnswerId : undefined,
      conclusion: status === 'Rejected' ? 'not-met' : undefined,
      justification: redflag,
      evidenceFileIds: await evidenceIdsFromLegacy(evidence, report),
    });
  }
  res.status(201).json(await itemView(req, qr.id));
});

/**
 * Decisão de aplicabilidade pelo auditor designado, sobre o pedido da empresa. Supervisor e
 * Administração não decidem aplicabilidade.
 */
router.post('/auditory/nonApplicable/:id', async (req, res) => {
  await assertAuditor(req, req.params.id, 'audit.applicability');
  const b = req.body || {};
  await workflow.decideNa(req, req.params.id, { decision: b.decision || 'accepted', reason: b.reason ?? b.justification });
  res.status(201).json(await itemView(req, req.params.id));
});

/** Auditor encerra sua etapa: o ciclo passa a aguardar a aprovação do supervisor. */
router.post(['/auditory/submitToSupervisor', '/auditory/submitToSupervisor/:companyId'], async (req, res) => {
  const companyId = req.params.companyId || req.context.companyId;
  if (!companyId) throw badRequest('informe a empresa do ciclo');
  const report = await currentCycle(companyId);
  await authz.assertCan(req, 'audit.conclude', { companyId: report.companyId, reportId: report.id });
  await workflow.concludeAudit(req, report.id);
  res.status(201).json(await ser.reportDetail(await reportById(report.id)));
});

/**
 * Supervisor consulta e aprova o trabalho concluído pelo auditor. O resultado vem do motor
 * único (`src/scoring`) e é gravado com a versão da regra; a aprovação dispara a liberação
 * final (contrato de publicação).
 */
router.post('/auditory/finishAuditory/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  await authz.assertCan(req, 'supervision.approve', { companyId: report.companyId, reportId: report.id });
  // A publicação é registrada na mesma transação da aprovação; os documentos são gerados logo
  // depois do COMMIT. Falha de geração não desfaz a aprovação: fica registrada e é retomada.
  const outcome = await workflow.approve(req, report.id, { onApproved: publication.register });
  const published = await publication.generate(outcome.publication.id);
  await authz.audit(req, 'publication.generated', {
    entity: 'publications',
    entityId: published.id,
    companyId: report.companyId,
    details: { status: published.status, certificate: published.certificateStatus },
  });
  res.status(201).json({
    ...(await ser.reportDetail(await reportById(report.id))),
    result: outcome.stored.result,
    publication: publication.view(published),
  });
});

/* ------------------------------------------------------------------ publicação */

/**
 * Situação da publicação do ciclo. Só existe depois da aprovação do supervisor; antes disso,
 * não há resultado nem documento para a empresa.
 */
router.get('/reports/:reportId/publication', async (req, res) => {
  const report = await reportById(req.params.reportId);
  await assertCycleRead(req, report);
  let pub = await publication.latestOf(report.id);
  if (!pub) throw notFound('o resultado ainda não foi aprovado pelo supervisor; não há publicação');
  pub = await publication.ensure(pub);
  res.json(publication.view(pub));
});

/**
 * Relatório de auditoria (PDF). Autorização conferida a cada download (revogar vínculo retira o
 * acesso mesmo a documentos já gerados). O relatório completo traz todos os indicadores, por
 * isso não é entregue ao colaborador, que vê só os indicadores atribuídos a ele.
 */
router.get('/reports/:reportId/publication/report.pdf', async (req, res) => {
  const report = await reportById(req.params.reportId);
  const role = await assertCycleRead(req, report);
  if (role === 'EMPLOYEE')
    throw forbidden('o relatório completo contém indicadores de outros responsáveis; consulte o gestor da empresa');
  let pub = await publication.latestOf(report.id);
  if (!pub) throw notFound('o resultado ainda não foi aprovado pelo supervisor; não há relatório');
  pub = await publication.ensure(pub);
  if (pub.status !== 'available') {
    res.set('Retry-After', '30');
    return res.status(503).json({
      statusCode: 503,
      error: 'Service Unavailable',
      message: pub.attempts >= publication.MAX_ATTEMPTS
        ? 'o relatório não pôde ser gerado; a falha técnica foi registrada para correção (a aprovação permanece válida)'
        : 'o relatório está sendo gerado; tente novamente em instantes',
    });
  }
  const file = path.join(config.storageDir, pub.reportPath);
  if (!fs.existsSync(file)) {
    // Arquivo perdido (ex.: volume trocado): volta para geração automática.
    await db.run("UPDATE publications SET status = 'failed', lastError = 'arquivo ausente no armazenamento', updatedAt = ? WHERE id = ?", db.now(), pub.id);
    throw notFound('o relatório está sendo regenerado; tente novamente em instantes');
  }
  await authz.audit(req, 'publication.download', { entity: 'publications', entityId: pub.id, companyId: report.companyId });
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  res.download(file, `relatorio-auditoria-ciclo-${report.cycle}.pdf`);
});

/**
 * Rota antiga de liberação manual do relatório. A liberação passou a ser **automática** na
 * aprovação do supervisor; não há mais passo administrativo posterior.
 */
router.post('/auditory/givereportaccess/:companyId', async (_req, res) => {
  res.status(410).json({
    statusCode: 410,
    error: 'Gone',
    message: 'a liberação do resultado e do relatório é automática na aprovação do supervisor; não há liberação manual',
  });
});

module.exports = router;
