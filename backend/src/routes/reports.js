const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, forbidden, notFound, conflict, asyncRouter } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const { loadQuestionReport, currentCycle } = require('../services');
const scoring = require('../scoring');

const router = asyncRouter();
router.use(['/reports', '/auditory'], authenticate);

const APPROVED_FOR_AUDIT = ['ApprovedByManager', 'ApprovedByConsultor'];
const AUDIT_FINAL = ['Approved', 'Rejected'];
const trim = (value) => String(value ?? '').trim();

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
    `SELECT qrf.id, qrf.questionReportId, qrf.fileId, f.companyId, f.name, f.url, f.fileType
       FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
      WHERE qrf.questionReportId IN (${marks(ids)}) ORDER BY qrf.createdAt`,
    ...ids,
  );
  const evidences = await db.all(
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

/** Ações da empresa exigem ciclo aberto: depois do envio, só um retorno registrado reabre. */
function assertOpenCycle(report) {
  if (!authz.isOpenCycle(report))
    throw forbidden(
      'o ciclo está bloqueado para edição; a empresa deve solicitar o retorno do processo ao consultor ou à Administração',
    );
}

const touch = async (qrId, fields) => {
  const keys = Object.keys(fields);
  await db.run(
    `UPDATE question_reports SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
    ...keys.map((k) => fields[k]),
    db.now(),
    qrId,
  );
};

async function setRedflag(qrId, text, userId) {
  await db.run(
    'UPDATE question_reports SET redflag = ?, redflag_date = ?, redflagIssuerId = ?, updatedAt = ? WHERE id = ?',
    text,
    db.now(),
    userId,
    db.now(),
    qrId,
  );
}

/** Fotografa a resposta de cada indicador do ciclo: a versão analisada fica preservada. */
async function snapshotRound(report, reason) {
  const items = await db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
  for (const item of items) {
    const files = (await db.all('SELECT fileId FROM question_report_files WHERE questionReportId = ?', item.id)).map((f) => f.fileId);
    await db.run(
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

async function openRound(report, req, reason) {
  const round = (report.currentRound || 1) + 1;
  await db.run('UPDATE cycle_rounds SET closedAt = ? WHERE reportId = ? AND round = ? AND closedAt IS NULL', db.now(), report.id, report.currentRound || 1);
  await db.run(
    'INSERT INTO cycle_rounds (id, reportId, round, openedAt, openedById, openedByRole, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
    db.uuid(),
    report.id,
    round,
    db.now(),
    req.principal.user.id,
    req.actorRole,
    reason,
  );
  await db.run('UPDATE reports SET currentRound = ?, updatedAt = ? WHERE id = ?', round, db.now(), report.id);
  return round;
}

/* ------------------------------------------------------------------ leitura */

// Sem :reportId, usa o ciclo corrente da empresa em contexto.
router.get(['/reports/company/questions', '/reports/company/questions/:reportId'], async (req, res) => {
  if (!req.params.reportId && !req.context.companyId) throw badRequest('usuário sem empresa em contexto');
  const report = req.params.reportId ? await reportById(req.params.reportId) : await currentCycle(req.context.companyId);
  const role = await assertCycleRead(req, report);
  // Colaborador: somente os indicadores atribuídos a ele (filtro no servidor, não na tela).
  const { items, bundle } = await loadItems(report, { onlyAnswererId: role === 'EMPLOYEE' ? req.principal.user.id : null });
  res.json(await Promise.all(items.map((item) => ser.questionReport(item, bundle))));
});

router.get('/reports/questionReports/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(await ser.questionReport(qr));
});

router.get('/reports/:reportId', async (req, res) => {
  const report = await reportById(req.params.reportId);
  await assertCycleRead(req, report);
  res.json(await ser.reportDetail(report));
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
 * auditado fica restrito a quem conduz o processo, conforme a decisão de só apresentar
 * resultado à empresa depois da aprovação.
 */
router.get('/reports/:reportId/result', async (req, res) => {
  const report = await reportById(req.params.reportId);
  const role = await assertCycleRead(req, report);
  const mode = (req.query.mode || 'audited') === 'self' ? 'self' : 'audited';
  const companyRole = ['MANAGER', 'EMPLOYEE'].includes(role);
  if (mode === 'audited' && companyRole && report.status !== 'Audited')
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

/** Versões preservadas de um indicador (o que foi submetido em cada rodada). */
router.get('/reports/questionReports/:id/versions', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await assertCycleRead(req, report);
  authz.assertItemScope(req, qr);
  res.json(
    (await db.all('SELECT * FROM item_answer_versions WHERE questionReportId = ? ORDER BY round, snapshotAt', qr.id)).map((v) => ({
      ...v,
      nonApplicable: ser.bool(v.nonApplicable),
      files: JSON.parse(v.files || '[]'),
    })),
  );
});

/* ------------------------------------------------------------------ resposta */

router.patch('/reports/answerQuestion/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  const role = await authz.assertCan(req, 'cycle.answer', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  await assertOpenCycle(report);

  const b = req.body || {};
  const nonApplicable = !!b.nonApplicable;
  if (!nonApplicable) {
    if (!b.answerId) throw badRequest('selecione uma resposta');
    if (!await db.one('SELECT id FROM answers WHERE id = ? AND questionId = ?', b.answerId, qr.questionId))
      throw badRequest('resposta inválida para este indicador');
  }
  await db.transaction(async () => {
    for (const f of Array.isArray(b.filesToCreate) ? b.filesToCreate : []) {
      const file = await db.one('SELECT id FROM company_files WHERE companyId = ? AND url = ?', report.companyId, f.url);
      if (!file) continue; // o upload (POST /uploads/companyFile) já registrou o arquivo
      if (b.addToGed) await db.run('UPDATE company_files SET inGed = 1 WHERE id = ?', file.id);
      await linkFile(qr.id, file.id, req);
    }
    for (const fileId of Array.isArray(b.filesToAdd) ? b.filesToAdd : []) {
      if (!await db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId)) continue;
      await linkFile(qr.id, fileId, req);
    }
    await touch(qr.id, {
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
    await authz.audit(req, 'item.answer', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { round: report.currentRound || 1 } });
  });
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

async function linkFile(questionReportId, fileId, req) {
  if (await db.one('SELECT id FROM question_report_files WHERE questionReportId = ? AND fileId = ?', questionReportId, fileId)) return;
  await db.run(
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
router.patch('/reports/editQuestionReport/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.attach', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  await assertOpenCycle(report);
  const ids = Array.isArray((req.body || {}).filesToAdd) ? req.body.filesToAdd : [];
  for (const fileId of ids) {
    if (!await db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId))
      throw badRequest('arquivo não encontrado no GED da empresa');
    await linkFile(qr.id, fileId, req);
  }
  await authz.audit(req, 'item.attach', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { files: ids.length } });
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/questionFiles/:id', async (req, res) => {
  const link = await db.one('SELECT * FROM question_report_files WHERE id = ?', req.params.id);
  if (!link) throw notFound('file not found');
  const { qr, report } = await loadQuestionReport(link.questionReportId);
  await authz.assertCan(req, 'cycle.attach', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  await assertOpenCycle(report);
  await db.run('DELETE FROM question_report_files WHERE id = ?', link.id);
  await authz.audit(req, 'item.detach', { entity: 'question_report_files', entityId: link.id, companyId: report.companyId, details: { fileId: link.fileId } });
  res.json({ id: link.id, deleted: true });
});

/* ------------------------------------------------------------------ validação interna */

router.post('/reports/validateanswer/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  const role = await authz.assertCan(req, 'cycle.validate', { companyId: report.companyId });
  await assertOpenCycle(report);
  const { veredict, redflag } = req.body || {};
  if (!veredict && !redflag) throw badRequest('informe um comentário para reprovar');
  const by = role === 'MANAGER' ? 'Manager' : 'Consultor';
  await touch(qr.id, { status: `${veredict ? 'Approved' : 'Rejected'}By${by}` });
  if (redflag) await setRedflag(qr.id, String(redflag), req.principal.user.id);
  await authz.audit(req, 'item.validate', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { veredict: !!veredict } });
  res.status(201).json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ delegação */

/** Gestor delega o indicador a pessoa autorizada da empresa e registra prazo. */
router.patch('/reports/addanswerer/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'item.assign', { companyId: report.companyId });
  await assertOpenCycle(report);
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
  await touch(qr.id, { answererId: userId, assignedById: req.principal.user.id, assignedAt: db.now(), dueDate });
  await authz.audit(req, 'item.assign', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { userId, dueDate } });
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ lembretes */

router.patch('/reports/redflag/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  const text = trim((req.body || {}).redflag);
  if (!text) throw badRequest('o lembrete não pode ser vazio');
  await setRedflag(qr.id, text, req.principal.user.id);
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/redflag/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.remind', { companyId: report.companyId });
  authz.assertItemScope(req, qr, { write: true });
  // Observação técnica do auditor não é lembrete da empresa e não pode ser apagada por aqui.
  if (qr.redflagIssuerId) {
    const issuer = await db.one('SELECT id FROM users WHERE id = ?', qr.redflagIssuerId);
    const issuerIsAuditor =
      issuer &&
      await db.one("SELECT id FROM user_profiles WHERE userId = ? AND role = 'AUDITOR' AND revokedAt IS NULL", issuer.id);
    if (issuerIsAuditor) throw forbidden('a observação registrada pela auditoria não pode ser removida pela empresa');
  }
  await touch(qr.id, { redflag: null, redflag_date: null, redflagIssuerId: null });
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/**
 * Reabertura administrativa de um item: permitida apenas enquanto o ciclo está em
 * preenchimento. A Administração não desfaz enquadramento técnico por edição (decisão do
 * responsável); durante a auditoria, o caminho é o retorno registrado do processo.
 */
router.patch('/reports/changeQuestionStatus/:id/:status', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'cycle.answer', { companyId: report.companyId });
  if (!req.principal.isAdmin) throw forbidden('ação restrita à Administração');
  if (req.params.status !== 'Pending') throw badRequest('status inválido: a reabertura devolve o item para "Pending"');
  await assertOpenCycle(report);
  await touch(qr.id, { status: 'Pending' });
  await authz.audit(req, 'item.reopen', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId });
  res.json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ------------------------------------------------------------------ auditoria: solicitar × liberar */

/** Solicitação de auditoria: gestor manifesta a intenção (a Administração ainda precisa liberar). */
router.post('/reports/requestAudit/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  let role;
  const asManager = await authz.can(req.principal, 'cycle.requestAudit', { companyId: report.companyId });
  if (asManager.ok) role = req.actorRole = asManager.role;
  else role = await authz.assertCan(req, 'cycle.releaseAudit', {}); // Administração também pode registrar a solicitação
  await assertOpenCycle(report);
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
  if (!authz.isOpenCycle(report)) throw conflict('o ciclo não está em preenchimento');
  if (!report.auditRequestedAt) throw badRequest('registre a solicitação de auditoria da empresa antes de liberar o processo');
  const items = await db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  // Itens já decididos pelo auditor em rodada anterior permanecem decididos; os demais
  // precisam da validação interna concluída.
  const releasable = [...APPROVED_FOR_AUDIT, ...AUDIT_FINAL];
  if (!items.length || !items.every((i) => releasable.includes(i.status)))
    throw forbidden('Ainda existem questões que precisam ser aprovadas pelo cosultor.');
  await db.transaction(async () => {
    // A versão enviada é fotografada antes de qualquer alteração posterior.
    await snapshotRound(report, 'audit-release');
    await db.run(
      "UPDATE reports SET status = 'Auditing', auditoryStart = ?, auditReleasedAt = ?, auditReleasedById = ?, updatedAt = ? WHERE id = ?",
      db.now(),
      db.now(),
      req.principal.user.id,
      db.now(),
      report.id,
    );
    await db.run(
      `UPDATE question_reports SET status = 'Auditing', updatedAt = ?
        WHERE reportId = ? AND status NOT IN ('Approved', 'Rejected')`,
      db.now(),
      report.id,
    );
    await authz.audit(req, 'cycle.auditReleased', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { round: report.currentRound || 1 } });
  });
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
  if (authz.isOpenCycle(report)) throw conflict('o ciclo já está em preenchimento');
  const reason = trim((req.body || {}).reason);
  if (!reason) throw badRequest('registre o motivo do retorno');
  let round;
  await db.transaction(async () => {
    await snapshotRound(report, 'return');
    round = await openRound(report, req, reason);
    await db.run("UPDATE reports SET status = 'Pending', updatedAt = ? WHERE id = ?", db.now(), report.id);
    // Itens em complemento voltam a aguardar resposta; os que ainda não tinham decisão do
    // auditor retornam à validação interna registrada na foto da liberação. As decisões já
    // tomadas pelo auditor (aprovado/reprovado) permanecem como estão.
    await db.run(
      `UPDATE question_reports SET status = 'Pending', updatedAt = ?
        WHERE reportId = ? AND status = 'PendingRevision'`,
      db.now(),
      report.id,
    );
    await db.run(
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
    await authz.audit(req, 'cycle.returned', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { reason, round } });
  });
  res.status(201).json({ ...(await ser.reportDetail(await reportById(report.id))), round });
});

/* ------------------------------------------------------------------ auditoria */

router.post('/auditory/evaluatequestion/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'audit.evaluate', { companyId: report.companyId, reportId: report.id });
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  const { status, redflag, evidence } = req.body || {};
  if (!['Approved', 'Rejected', 'PendingRevision'].includes(status)) throw badRequest('status inválido');
  if (!redflag) throw badRequest('O campo de Observação é obrigátorio');
  await db.transaction(async () => {
    await touch(qr.id, { status });
    await setRedflag(qr.id, String(redflag), req.principal.user.id);
    for (const e of Array.isArray(evidence) ? evidence : [])
      await db.run(
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
    await authz.audit(req, 'audit.evaluate', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { status } });
  });
  res.status(201).json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/**
 * Decisão de aplicabilidade pelo auditor. O pedido com justificativa da empresa e o registro
 * completo da decisão (aceite/recusa com fundamento) entram na etapa de fluxo (E4): aqui a
 * correção é de autorização — supervisor e Administração não decidem aplicabilidade.
 */
router.post('/auditory/nonApplicable/:id', async (req, res) => {
  const { qr, report } = await loadQuestionReport(req.params.id);
  await authz.assertCan(req, 'audit.applicability', { companyId: report.companyId, reportId: report.id });
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  await touch(qr.id, { nonApplicable: 1, selectedAnswerId: null, status: 'Approved' });
  await authz.audit(req, 'audit.applicability', { entity: 'question_reports', entityId: qr.id, companyId: report.companyId, details: { decision: 'accepted' } });
  res.status(201).json(await ser.questionReport(await db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** Auditor encerra sua etapa e envia ao supervisor. */
router.post(['/auditory/submitToSupervisor', '/auditory/submitToSupervisor/:companyId'], async (req, res) => {
  const companyId = req.params.companyId || req.context.companyId;
  if (!companyId) throw badRequest('informe a empresa do ciclo');
  const report = await currentCycle(companyId);
  await authz.assertCan(req, 'audit.conclude', { companyId: report.companyId, reportId: report.id });
  const items = await db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam ser avaliados antes de submeter');
  await db.run('UPDATE reports SET auditoryEnd = ?, updatedAt = ? WHERE id = ?', db.now(), db.now(), report.id);
  await authz.audit(req, 'audit.concluded', { entity: 'reports', entityId: report.id, companyId: report.companyId });
  res.status(201).json(await ser.reportDetail(await reportById(report.id)));
});

/**
 * Supervisor consulta e aprova o trabalho concluído pelo auditor.
 *
 * A média herdada saiu: o resultado vem do motor único (`src/scoring`), que verifica primeiro
 * os obrigatórios aplicáveis, calcula pontos e máximo aplicável por eixo, define a faixa com
 * precisão inteira e mantém separados rating matemático, elegibilidade e impedimentos. O
 * resultado é gravado com a versão da regra e a política de faixa usadas.
 *
 * A publicação automática do resultado, do relatório e do certificado é a etapa E6.
 */
router.post('/auditory/finishAuditory/:companyId', async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  await authz.assertCan(req, 'supervision.approve', { companyId: report.companyId, reportId: report.id });
  const items = await db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam estar aprovados ou rejeitados');
  let stored;
  await db.transaction(async () => {
    await db.run(
      "UPDATE reports SET status = 'Audited', auditoryEnd = coalesce(auditoryEnd, ?), updatedAt = ? WHERE id = ?",
      db.now(),
      db.now(),
      report.id,
    );
    stored = await scoring.persistResult(report.id, { mode: 'audited', computedById: req.principal.user.id });
    // `evaluation` era o rótulo da média antiga; passa a guardar o rating matemático (ou nada,
    // quando não há classificação válida), sem substituir o resultado estruturado.
    await db.run('UPDATE reports SET evaluation = ? WHERE id = ?', stored.result.rating, report.id);
    await authz.audit(req, 'supervision.approved', {
      entity: 'reports',
      entityId: report.id,
      companyId: report.companyId,
      details: {
        ruleVersion: stored.result.ruleVersion,
        policy: stored.result.policy.id,
        rating: stored.result.rating,
        eligible: stored.result.eligible,
        impediments: stored.result.impediments.map((impediment) => impediment.kind),
      },
    });
  });
  res.status(201).json({ ...(await ser.reportDetail(await reportById(report.id))), result: stored.result });
});

/**
 * Liberação do relatório à empresa. A decisão do responsável é que isso seja **automático** na
 * aprovação do supervisor; a troca acontece na etapa de publicação (E6). Até lá a rota segue
 * restrita à Administração e registrada na trilha.
 */
router.post('/auditory/givereportaccess/:companyId', authz.authorize('cycle.releaseAudit'), async (req, res) => {
  const report = await currentCycle(req.params.companyId);
  if (report.status !== 'Audited') throw forbidden('o relatório só pode ser liberado após a auditoria');
  await db.run('UPDATE companies SET reportAccess = 1, updatedAt = ? WHERE id = ?', db.now(), req.params.companyId);
  await authz.audit(req, 'cycle.reportReleased', { entity: 'companies', entityId: req.params.companyId, companyId: req.params.companyId });
  res.status(201).json({ companyId: req.params.companyId, reportAccess: true });
});

module.exports = router;
