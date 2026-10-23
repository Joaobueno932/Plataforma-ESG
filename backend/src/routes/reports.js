const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, forbidden, notFound, conflict } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const { loadQuestionReport, currentCycle } = require('../services');

const router = express.Router();
router.use(['/reports', '/auditory'], authenticate);

const APPROVED_FOR_AUDIT = ['ApprovedByManager', 'ApprovedByConsultor'];
const AUDIT_FINAL = ['Approved', 'Rejected'];
const trim = (value) => String(value ?? '').trim();

/* ------------------------------------------------------------------ carregamento */

/**
 * Carrega os itens de um ciclo com as coleções em lote (uma consulta por coleção), em vez de
 * uma consulta por item como antes (diagnóstico A16).
 */
function loadItems(report, { onlyAnswererId = null } = {}) {
  const items = db.all(
    `SELECT qr.* FROM question_reports qr JOIN questions q ON q.id = qr.questionId
      WHERE qr.reportId = ? ${onlyAnswererId ? 'AND qr.answererId = ?' : ''}
      ORDER BY q.section = 'All' DESC, q.position, q.code`,
    ...(onlyAnswererId ? [report.id, onlyAnswererId] : [report.id]),
  );
  if (!items.length) return { items: [], bundle: null };

  const ids = items.map((i) => i.id);
  const marks = (list) => list.map(() => '?').join(', ');
  const questionIds = [...new Set(items.map((i) => i.questionId))];
  const questions = db.all(`SELECT * FROM questions WHERE id IN (${marks(questionIds)})`, ...questionIds);
  const answers = db.all(`SELECT * FROM answers WHERE questionId IN (${marks(questionIds)}) ORDER BY position, rowid`, ...questionIds);
  const files = db.all(
    `SELECT qrf.id, qrf.questionReportId, qrf.fileId, f.companyId, f.name, f.url, f.fileType
       FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
      WHERE qrf.questionReportId IN (${marks(ids)}) ORDER BY qrf.createdAt`,
    ...ids,
  );
  const evidences = db.all(
    `SELECT id, questionReportId, name, url, fileType FROM evidences
      WHERE questionReportId IN (${marks(ids)}) ORDER BY createdAt`,
    ...ids,
  );
  const peopleIds = [
    ...new Set(
      items.flatMap((i) => [i.answererId, i.redflagIssuerId, i.assignedById, i.answeredById]).filter(Boolean),
    ),
  ];
  const people = peopleIds.length
    ? db.all(`SELECT id, name, email, role FROM users WHERE id IN (${marks(peopleIds)})`, ...peopleIds)
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
      report: { id: report.id, companyId: report.companyId, status: report.status, cycle: report.cycle },
      questions: new Map(questions.map((q) => [q.id, q])),
      answersByQuestion: group(answers, 'questionId'),
      answersById: new Map(answers.map((a) => [a.id, a])),
      files: group(files, 'questionReportId'),
      evidences: group(evidences, 'questionReportId'),
      people: new Map(people.map((p) => [p.id, p])),
    },
  };
}

function reportById(id) {
  const report = db.one('SELECT * FROM reports WHERE id = ?', id);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

/** Autoriza a leitura de um ciclo por qualquer perfil com escopo (empresa ou designação). */
function assertCycleRead(req, report) {
  const direct = authz.can(req.principal, 'cycle.read', { companyId: report.companyId });
  if (direct.ok) {
    req.actorRole = direct.role;
    return direct.role;
  }
  const professional = authz.can(req.principal, 'cycle.read.professional', {
    companyId: report.companyId,
    reportId: report.id,
  });
  if (!professional.ok) throw forbidden(professional.reason);
  req.actorRole = professional.role;
  return professional.role;
}

/** Ações da empresa exigem ciclo aberto: depois do envio, só um retorno registrado reabre. */
function assertOpenCycle(report) {
  if (!authz.isOpenCycle(report))
    throw forbidden(
      'o ciclo está bloqueado para edição; a empresa deve solicitar o retorno do processo ao consultor ou à Administração',
    );
}

const touch = (qrId, fields) => {
  const keys = Object.keys(fields);
  db.run(
    `UPDATE question_reports SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
    ...keys.map((k) => fields[k]),
    db.now(),
    qrId,
  );
};

function setRedflag(qrId, text, userId) {
  db.run(
    'UPDATE question_reports SET redflag = ?, redflag_date = ?, redflagIssuerId = ?, updatedAt = ? WHERE id = ?',
    text,
    db.now(),
    userId,
    db.now(),
    qrId,
  );
}

/** Fotografa a resposta de cada indicador do ciclo: a versão analisada fica preservada. */
function snapshotRound(report, reason) {
  const items = db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
  for (const item of items) {
    const files = db.all('SELECT fileId FROM question_report_files WHERE questionReportId = ?', item.id).map((f) => f.fileId);
    db.run(
      `INSERT INTO item_answer_versions (id, questionReportId, reportId, round, status, selectedAnswerId, answerText,
                                         nonApplicable, answeredById, answeredByRole, answeredAt, files, snapshotAt, snapshotReason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      db.uuid(),
      item.id,
      report.id,
      report.currentRound || 1,
      item.status,
      item.selectedAnswerId,
      item.answerText,
      item.nonApplicable,
      item.answeredById,
      item.answeredByRole,
      item.answeredAt,
      JSON.stringify(files),
      db.now(),
      reason,
    );
  }
  return items.length;
}

function openRound(report, req, reason) {
  const round = (report.currentRound || 1) + 1;
  db.run('UPDATE cycle_rounds SET closedAt = ? WHERE reportId = ? AND round = ? AND closedAt IS NULL', db.now(), report.id, report.currentRound || 1);
  db.run(
    'INSERT INTO cycle_rounds (id, reportId, round, openedAt, openedById, openedByRole, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
    db.uuid(),
    report.id,
    round,
    db.now(),
    req.principal.user.id,
    req.actorRole,
    reason,
  );
  db.run('UPDATE reports SET currentRound = ?, updatedAt = ? WHERE id = ?', round, db.now(), report.id);
  return round;
}

/* ------------------------------------------------------------------ leitura */

// Sem :reportId, usa o ciclo corrente da empresa em contexto.
router.get(['/reports/company/questions', '/reports/company/questions/:reportId'], (req, res) => {
  if (!req.params.reportId && !req.context.companyId) throw badRequest('usuário sem empresa em contexto');
  const report = req.params.reportId ? reportById(req.params.reportId) : currentCycle(req.context.companyId);
  const role = assertCycleRead(req, report);
  // Colaborador: somente os indicadores atribuídos a ele (filtro no servidor, não na tela).
  const { items, bundle } = loadItems(report, { onlyAnswererId: role === 'EMPLOYEE' ? req.principal.user.id : null });
  res.json(items.map((item) => ser.questionReport(item, bundle)));
});

router.get('/reports/questionReports/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(ser.questionReport(qr));
});

router.get('/reports/:reportId', (req, res) => {
  const report = reportById(req.params.reportId);
  assertCycleRead(req, report);
  res.json(ser.reportDetail(report));
});

/** Ciclos da empresa (histórico e relação entre eles). */
router.get('/reports/company/:companyId/cycles', (req, res) => {
  authz.assertCompanyScope(req, req.params.companyId, 'company.read');
  res.json(db.all('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle', req.params.companyId).map(ser.report));
});

/** Versões preservadas de um indicador (o que foi submetido em cada rodada). */
router.get('/reports/questionReports/:id/versions', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(
    db.all('SELECT * FROM item_answer_versions WHERE questionReportId = ? ORDER BY round, snapshotAt', qr.id).map((v) => ({
      ...v,
      nonApplicable: ser.bool(v.nonApplicable),
      files: JSON.parse(v.files || '[]'),
    })),
  );
});

/* ------------------------------------------------------------------ resposta */

router.patch('/reports/answerQuestion/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  const role = authz.assertCan(req, 'cycle.answer', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  assertOpenCycle(report);

  const b = req.body || {};
  const nonApplicable = !!b.nonApplicable;
  if (!nonApplicable) {
    if (!b.answerId) throw badRequest('selecione uma resposta');
    if (!db.one('SELECT id FROM answers WHERE id = ? AND questionId = ?', b.answerId, qr.questionId))
      throw badRequest('resposta inválida para este indicador');
  }
  db.transaction(() => {
    for (const f of Array.isArray(b.filesToCreate) ? b.filesToCreate : []) {
      const file = db.one('SELECT id FROM company_files WHERE companyId = ? AND url = ?', report.companyId, f.url);
      if (!file) continue; // o upload (POST /uploads/companyFile) já registrou o arquivo
      if (b.addToGed) db.run('UPDATE company_files SET inGed = 1 WHERE id = ?', file.id);
      linkFile(qr.id, file.id, req);
    }
    for (const fileId of Array.isArray(b.filesToAdd) ? b.filesToAdd : []) {
      if (!db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId)) continue;
      linkFile(qr.id, fileId, req);
    }
    touch(qr.id, {
      selectedAnswerId: nonApplicable ? null : b.answerId,
      answerText: b.answerText ?? null,
      nonApplicable: nonApplicable ? 1 : 0,
      nonCompliant: b.nonCompliant ? 1 : 0,
      answererId: qr.answererId || req.principal.user.id,
      answeredById: req.principal.user.id,
      answeredByRole: role,
      answeredAt: db.now(),
      status: 'PendingValidationByManager',
    });
    authz.audit(req, 'item.answer', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { round: report.currentRound || 1 } });
  });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

function linkFile(questionReportId, fileId, req) {
  if (db.one('SELECT id FROM question_report_files WHERE questionReportId = ? AND fileId = ?', questionReportId, fileId)) return;
  db.run(
    'INSERT INTO question_report_files (id, questionReportId, fileId, addedById, addedByRole, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    db.uuid(),
    questionReportId,
    fileId,
    req.principal.user.id,
    req.actorRole,
    db.now(),
  );
}

/** Anexa arquivos do GED ao indicador — sujeito ao mesmo bloqueio da resposta (A7). */
router.patch('/reports/editQuestionReport/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'cycle.attach', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  assertOpenCycle(report);
  const ids = Array.isArray((req.body || {}).filesToAdd) ? req.body.filesToAdd : [];
  for (const fileId of ids) {
    if (!db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId))
      throw badRequest('arquivo não encontrado no GED da empresa');
    linkFile(qr.id, fileId, req);
  }
  authz.audit(req, 'item.attach', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { files: ids.length } });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/questionFiles/:id', (req, res) => {
  const link = db.one('SELECT * FROM question_report_files WHERE id = ?', req.params.id);
  if (!link) throw notFound('file not found');
  const { qr, report } = loadQuestionReport(link.questionReportId);
  authz.assertCan(req, 'cycle.attach', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  assertOpenCycle(report);
  db.run('DELETE FROM question_report_files WHERE id = ?', link.id);
  authz.audit(req, 'item.detach', { entity: 'question_report_files', entityId: link.id, companyId: report.companyId, details: { fileId: link.fileId } });
  res.json({ id: link.id, deleted: true });
});

/* ------------------------------------------------------------------ validação interna */

router.post('/reports/validateanswer/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  const role = authz.assertCan(req, 'cycle.validate', { companyId: report.companyId });
  assertOpenCycle(report);
  const { veredict, redflag } = req.body || {};
  if (!veredict && !redflag) throw badRequest('informe um comentário para reprovar');
  const by = role === 'MANAGER' ? 'Manager' : 'Consultor';
  touch(qr.id, { status: `${veredict ? 'Approved' : 'Rejected'}By${by}` });
  if (redflag) setRedflag(qr.id, String(redflag), req.principal.user.id);
  authz.audit(req, 'item.validate', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { veredict: !!veredict } });
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ delegação */

/** Gestor delega o indicador a pessoa autorizada da empresa e registra prazo. */
router.patch('/reports/addanswerer/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'item.assign', { companyId: report.companyId });
  assertOpenCycle(report);
  const body = req.body || {};
  const userId = body.user || body.userId;
  if (!userId) throw badRequest('informe o responsável');
  const link = db.one(
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
  touch(qr.id, { answererId: userId, assignedById: req.principal.user.id, assignedAt: db.now(), dueDate });
  authz.audit(req, 'item.assign', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { userId, dueDate } });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ lembretes */

router.patch('/reports/redflag/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  const text = trim((req.body || {}).redflag);
  if (!text) throw badRequest('o lembrete não pode ser vazio');
  setRedflag(qr.id, text, req.principal.user.id);
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/redflag/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  // Observação técnica do auditor não é lembrete da empresa e não pode ser apagada por aqui.
  if (qr.redflagIssuerId) {
    const issuer = db.one('SELECT id FROM users WHERE id = ?', qr.redflagIssuerId);
    const issuerIsAuditor =
      issuer &&
      db.one("SELECT id FROM user_profiles WHERE userId = ? AND role = 'AUDITOR' AND revokedAt IS NULL", issuer.id);
    if (issuerIsAuditor) throw forbidden('a observação registrada pela auditoria não pode ser removida pela empresa');
  }
  touch(qr.id, { redflag: null, redflag_date: null, redflagIssuerId: null });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/**
 * Reabertura administrativa de um item: permitida apenas enquanto o ciclo está em
 * preenchimento. A Administração não desfaz enquadramento técnico por edição (decisão do
 * responsável); durante a auditoria, o caminho é o retorno registrado do processo.
 */
router.patch('/reports/changeQuestionStatus/:id/:status', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'cycle.answer', { companyId: report.companyId });
  if (!req.principal.isAdmin) throw forbidden('ação restrita à Administração');
  if (req.params.status !== 'Pending') throw badRequest('status inválido: a reabertura devolve o item para "Pending"');
  assertOpenCycle(report);
  touch(qr.id, { status: 'Pending' });
  authz.audit(req, 'item.reopen', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ auditoria: solicitar × liberar */

/** Solicitação de auditoria: gestor manifesta a intenção (a Administração ainda precisa liberar). */
router.post('/reports/requestAudit/:companyId', (req, res) => {
  const report = currentCycle(req.params.companyId);
  let role;
  const asManager = authz.can(req.principal, 'cycle.requestAudit', { companyId: report.companyId });
  if (asManager.ok) role = req.actorRole = asManager.role;
  else role = authz.assertCan(req, 'cycle.releaseAudit', {}); // Administração também pode registrar a solicitação
  assertOpenCycle(report);
  db.run('UPDATE reports SET auditRequestedAt = ?, auditRequestedById = ?, updatedAt = ? WHERE id = ?', db.now(), req.principal.user.id, db.now(), report.id);
  authz.audit(req, 'cycle.auditRequested', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { role } });
  res.status(201).json(ser.reportDetail(reportById(report.id)));
});

/**
 * Liberação operacional do processo para auditoria — cabe à Administração FIEMS.
 * Liberar não é aprovação técnica: nenhum parecer, enquadramento ou resultado é decidido aqui.
 */
router.post(['/reports/releaseAudit/:companyId', '/reports/submit/:companyId'], authz.authorize('cycle.releaseAudit'), (req, res) => {
  const report = currentCycle(req.params.companyId);
  if (!authz.isOpenCycle(report)) throw conflict('o ciclo não está em preenchimento');
  if (!report.auditRequestedAt) throw badRequest('registre a solicitação de auditoria da empresa antes de liberar o processo');
  const items = db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  // Itens já decididos pelo auditor em rodada anterior permanecem decididos; os demais
  // precisam da validação interna concluída.
  const releasable = [...APPROVED_FOR_AUDIT, ...AUDIT_FINAL];
  if (!items.length || !items.every((i) => releasable.includes(i.status)))
    throw forbidden('Ainda existem questões que precisam ser aprovadas pelo cosultor.');
  db.transaction(() => {
    // A versão enviada é fotografada antes de qualquer alteração posterior.
    snapshotRound(report, 'audit-release');
    db.run(
      "UPDATE reports SET status = 'Auditing', auditoryStart = ?, auditReleasedAt = ?, auditReleasedById = ?, updatedAt = ? WHERE id = ?",
      db.now(),
      db.now(),
      req.principal.user.id,
      db.now(),
      report.id,
    );
    db.run(
      `UPDATE question_reports SET status = 'Auditing', updatedAt = ?
        WHERE reportId = ? AND status NOT IN ('Approved', 'Rejected')`,
      db.now(),
      report.id,
    );
    authz.audit(req, 'cycle.auditReleased', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { round: report.currentRound || 1 } });
  });
  res.status(201).json(ser.reportDetail(reportById(report.id)));
});

/** Designação de auditor e supervisor no ciclo (somente Administração). */
router.post('/reports/:reportId/professionals', authz.authorize('cycle.assignProfessionals'), (req, res) => {
  const report = reportById(req.params.reportId);
  const { userId, role } = req.body || {};
  if (!userId || !authz.CYCLE_ASSIGNED_ROLES.includes(role)) throw badRequest('informe o usuário e o papel (AUDITOR ou SUPERVISOR)');
  const link = db.one(
    `SELECT l.id FROM user_company_links l JOIN users u ON u.id = l.userId
      WHERE l.userId = ? AND l.companyId = ? AND l.role = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL AND u.status = 'ACTIVE'`,
    userId,
    report.companyId,
    role,
  );
  if (!link) throw badRequest('o profissional precisa ter vínculo vigente com a empresa nesse papel');
  // Um mesmo profissional não acumula auditor e supervisor; e consultor da empresa não audita.
  const conflicting = db.one(
    `SELECT role FROM user_company_links
      WHERE userId = ? AND companyId = ? AND revokedAt IS NULL AND role IN ('CONSULTOR', 'AUDITOR', 'SUPERVISOR') AND role <> ?`,
    userId,
    report.companyId,
    role,
  );
  if (conflicting) throw conflict(`o mesmo profissional não pode atuar como ${conflicting.role} e ${role} nesta empresa`);

  const existing = db.one('SELECT id, revokedAt FROM cycle_professionals WHERE reportId = ? AND userId = ? AND role = ?', report.id, userId, role);
  if (existing && !existing.revokedAt) return res.status(200).json(ser.reportDetail(report));
  if (existing)
    db.run('UPDATE cycle_professionals SET revokedAt = NULL, revokedById = NULL, assignedAt = ?, assignedById = ? WHERE id = ?', db.now(), req.principal.user.id, existing.id);
  else
    db.run(
      'INSERT INTO cycle_professionals (id, reportId, userId, role, assignedAt, assignedById) VALUES (?, ?, ?, ?, ?, ?)',
      db.uuid(),
      report.id,
      userId,
      role,
      db.now(),
      req.principal.user.id,
    );
  db.run('UPDATE reports SET needsReview = 0, updatedAt = ? WHERE id = ?', db.now(), report.id);
  authz.audit(req, 'cycle.assign', { entity: 'cycle_professionals', entityId: report.id, companyId: report.companyId, details: { userId, role } });
  res.status(201).json(ser.reportDetail(reportById(report.id)));
});

router.delete('/reports/:reportId/professionals/:userId', authz.authorize('cycle.assignProfessionals'), (req, res) => {
  const report = reportById(req.params.reportId);
  const rows = db.all('SELECT id FROM cycle_professionals WHERE reportId = ? AND userId = ? AND revokedAt IS NULL', report.id, req.params.userId);
  if (!rows.length) throw notFound('designação não encontrada');
  for (const row of rows)
    db.run('UPDATE cycle_professionals SET revokedAt = ?, revokedById = ? WHERE id = ?', db.now(), req.principal.user.id, row.id);
  authz.audit(req, 'cycle.unassign', { entity: 'cycle_professionals', entityId: report.id, companyId: report.companyId, details: { userId: req.params.userId } });
  res.json({ reportId: report.id, userId: req.params.userId, revoked: true });
});

/* ------------------------------------------------------------------ retorno do processo */

/** A empresa solicita o retorno; o pedido fica registrado e **não** desbloqueia nada. */
router.post('/reports/requestReturn/:companyId', (req, res) => {
  const report = currentCycle(req.params.companyId);
  authz.assertCan(req, 'cycle.requestReturn', { companyId: report.companyId });
  const reason = trim((req.body || {}).reason);
  if (!reason) throw badRequest('descreva o motivo do pedido de retorno');
  authz.audit(req, 'cycle.returnRequested', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { reason } });
  res.status(201).json({ reportId: report.id, requested: true, unlocked: false });
});

/**
 * Retorno autorizado: consultor ou Administração. Preserva a versão enviada (foto da rodada)
 * e abre uma nova rodada. O gestor não retorna o processo; o pedido de complemento do auditor,
 * por si só, também não desbloqueia.
 */
router.post('/reports/return/:companyId', (req, res) => {
  const report = currentCycle(req.params.companyId);
  authz.assertCan(req, 'cycle.return', { companyId: report.companyId });
  if (authz.isOpenCycle(report)) throw conflict('o ciclo já está em preenchimento');
  const reason = trim((req.body || {}).reason);
  if (!reason) throw badRequest('registre o motivo do retorno');
  let round;
  db.transaction(() => {
    snapshotRound(report, 'return');
    round = openRound(report, req, reason);
    db.run("UPDATE reports SET status = 'Pending', updatedAt = ? WHERE id = ?", db.now(), report.id);
    // Itens em complemento voltam a aguardar resposta; os que ainda não tinham decisão do
    // auditor retornam à validação interna registrada na foto da liberação. As decisões já
    // tomadas pelo auditor (aprovado/reprovado) permanecem como estão.
    db.run(
      `UPDATE question_reports SET status = 'Pending', updatedAt = ?
        WHERE reportId = ? AND status = 'PendingRevision'`,
      db.now(),
      report.id,
    );
    db.run(
      `UPDATE question_reports SET status = COALESCE((
            SELECT v.status FROM item_answer_versions v
             WHERE v.questionReportId = question_reports.id AND v.snapshotReason = 'audit-release'
             ORDER BY v.round DESC, v.snapshotAt DESC LIMIT 1
          ), 'PendingValidationByManager'),
          updatedAt = ?
        WHERE reportId = ? AND status = 'Auditing'`,
      db.now(),
      report.id,
    );
    authz.audit(req, 'cycle.returned', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { reason, round } });
  });
  res.status(201).json({ ...ser.reportDetail(reportById(report.id)), round });
});

/* ------------------------------------------------------------------ auditoria */

router.post('/auditory/evaluatequestion/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'audit.evaluate', { companyId: report.companyId, reportId: report.id });
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  const { status, redflag, evidence } = req.body || {};
  if (!['Approved', 'Rejected', 'PendingRevision'].includes(status)) throw badRequest('status inválido');
  if (!redflag) throw badRequest('O campo de Observação é obrigátorio');
  db.transaction(() => {
    touch(qr.id, { status });
    setRedflag(qr.id, String(redflag), req.principal.user.id);
    for (const e of Array.isArray(evidence) ? evidence : [])
      db.run(
        'INSERT INTO evidences (id, questionReportId, name, url, fileType, addedById, addedByRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        db.uuid(),
        qr.id,
        e.name,
        e.url,
        e.fileType || null,
        req.principal.user.id,
        req.actorRole,
        db.now(),
      );
    authz.audit(req, 'audit.evaluate', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { status } });
  });
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/**
 * Decisão de aplicabilidade pelo auditor. O pedido com justificativa da empresa e o registro
 * completo da decisão (aceite/recusa com fundamento) entram na etapa de fluxo (E4): aqui a
 * correção é de autorização — supervisor e Administração não decidem aplicabilidade.
 */
router.post('/auditory/nonApplicable/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  authz.assertCan(req, 'audit.applicability', { companyId: report.companyId, reportId: report.id });
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  touch(qr.id, { nonApplicable: 1, selectedAnswerId: null, status: 'Approved' });
  authz.audit(req, 'audit.applicability', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { decision: 'accepted' } });
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** Auditor encerra sua etapa e envia ao supervisor. */
router.post(['/auditory/submitToSupervisor', '/auditory/submitToSupervisor/:companyId'], (req, res) => {
  const companyId = req.params.companyId || req.context.companyId;
  if (!companyId) throw badRequest('informe a empresa do ciclo');
  const report = currentCycle(companyId);
  authz.assertCan(req, 'audit.conclude', { companyId: report.companyId, reportId: report.id });
  const items = db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam ser avaliados antes de submeter');
  db.run('UPDATE reports SET auditoryEnd = ?, updatedAt = ? WHERE id = ?', db.now(), db.now(), report.id);
  authz.audit(req, 'audit.concluded', { entity: 'reports', entityId: report.id, companyId: report.companyId });
  res.status(201).json(ser.reportDetail(reportById(report.id)));
});

/**
 * Supervisor consulta e aprova o trabalho concluído pelo auditor.
 * A pontuação continua sendo a média herdada — o cálculo oficial por eixo, com máximo
 * aplicável, obrigatórios e rating, é a etapa E5 (docs/esg/progresso.md). A publicação
 * automática e o certificado são E6.
 */
router.post('/auditory/finishAuditory/:companyId', (req, res) => {
  const report = currentCycle(req.params.companyId);
  authz.assertCan(req, 'supervision.approve', { companyId: report.companyId, reportId: report.id });
  const items = db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam estar aprovados ou rejeitados');
  const selectedIds = items.filter((i) => !i.nonApplicable && i.selectedAnswerId).map((i) => i.selectedAnswerId);
  const points = selectedIds.length
    ? db.all(`SELECT points FROM answers WHERE id IN (${selectedIds.map(() => '?').join(', ')})`, ...selectedIds).map((a) => a.points)
    : [];
  const avg = points.length ? points.reduce((a, b) => a + b, 0) / points.length : 0;
  const evaluation = ['Nao_conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Conforme'][Math.min(5, Math.round(avg / 2))];
  db.run(
    "UPDATE reports SET status = 'Audited', evaluation = ?, auditoryEnd = coalesce(auditoryEnd, ?), updatedAt = ? WHERE id = ?",
    evaluation,
    db.now(),
    db.now(),
    report.id,
  );
  authz.audit(req, 'supervision.approved', { entity: 'reports', entityId: report.id, companyId: report.companyId });
  res.status(201).json(ser.reportDetail(reportById(report.id)));
});

/**
 * Liberação do relatório à empresa. A decisão do responsável é que isso seja **automático** na
 * aprovação do supervisor; a troca acontece na etapa de publicação (E6). Até lá a rota segue
 * restrita à Administração e registrada na trilha.
 */
router.post('/auditory/givereportaccess/:companyId', authz.authorize('cycle.releaseAudit'), (req, res) => {
  const report = currentCycle(req.params.companyId);
  if (report.status !== 'Audited') throw forbidden('o relatório só pode ser liberado após a auditoria');
  db.run('UPDATE companies SET reportAccess = 1, updatedAt = ? WHERE id = ?', db.now(), req.params.companyId);
  authz.audit(req, 'cycle.reportReleased', { entity: 'companies', entityId: req.params.companyId, companyId: req.params.companyId });
  res.status(201).json({ companyId: req.params.companyId, reportAccess: true });
});

module.exports = router;
