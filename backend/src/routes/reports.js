const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, forbidden, notFound } = require('../http');
const { authenticate, requireRoles } = require('../auth');
const { loadQuestionReport, assertCompanyAccess } = require('../services');

const router = express.Router();
router.use(['/reports', '/auditory'], authenticate);

const APPROVED_FOR_AUDIT = ['ApprovedByManager', 'ApprovedByConsultor'];
const AUDIT_FINAL = ['Approved', 'Rejected'];
const LOCKED = ['Auditing', 'Approved', 'Rejected'];

const qrList = (reportId) =>
  db
    .all(
      `SELECT qr.* FROM question_reports qr JOIN questions q ON q.id = qr.questionId
        WHERE qr.reportId = ? ORDER BY q.section = 'All' DESC, q.code`,
      reportId,
    )
    .map(ser.questionReport);

function reportOfCompany(companyId) {
  const r = db.one('SELECT * FROM reports WHERE companyId = ?', companyId);
  if (!r) throw notFound("a report with this id wasn't found!");
  return r;
}

function setRedflag(qrId, text, userId) {
  db.run('UPDATE question_reports SET redflag = ?, redflag_date = ?, redflagIssuerId = ?, updatedAt = ? WHERE id = ?', text, db.now(), userId, db.now(), qrId);
}

const touch = (qrId, fields) => {
  const keys = Object.keys(fields);
  db.run(`UPDATE question_reports SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`, ...keys.map((k) => fields[k]), db.now(), qrId);
};

/* ---------- Leitura ---------- */

// Sem :reportId, usa o relatório da empresa do usuário (papéis não-admin).
router.get(['/reports/company/questions', '/reports/company/questions/:reportId'], (req, res) => {
  let report;
  if (req.params.reportId) {
    report = db.one('SELECT * FROM reports WHERE id = ?', req.params.reportId);
    if (!report) throw notFound("a report with this id wasn't found!");
  } else {
    if (!req.user.companyId) throw badRequest('usuário sem empresa vinculada');
    report = reportOfCompany(req.user.companyId);
  }
  assertCompanyAccess(req.user, report.companyId);
  res.json(qrList(report.id));
});

router.get('/reports/questionReports/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  res.json(ser.questionReport(qr));
});

router.get('/reports/:reportId', (req, res) => {
  const report = db.one('SELECT * FROM reports WHERE id = ?', req.params.reportId);
  if (!report) throw notFound("a report with this id wasn't found!");
  assertCompanyAccess(req.user, report.companyId);
  res.json(ser.reportDetail(report));
});

/* ---------- Resposta da empresa ---------- */

router.patch('/reports/answerQuestion/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  if (!['EMPLOYEE', 'MANAGER', 'CONSULTOR', 'ADMIN'].includes(req.user.role)) throw forbidden('seu perfil não pode responder indicadores');
  if (req.user.role === 'EMPLOYEE' && qr.answererId && qr.answererId !== req.user.id) throw forbidden('este indicador está atribuído a outro usuário');
  const auditing = report.status === 'Auditing';
  if (LOCKED.includes(qr.status) || (auditing && qr.status !== 'PendingRevision')) throw forbidden('este indicador não pode mais ser respondido');

  const b = req.body || {};
  const nonApplicable = !!b.nonApplicable;
  if (!nonApplicable) {
    if (!b.answerId) throw badRequest('selecione uma resposta');
    if (!db.one('SELECT id FROM answers WHERE id = ? AND questionId = ?', b.answerId, qr.questionId)) throw badRequest('resposta inválida para este indicador');
  }
  db.transaction(() => {
    for (const f of Array.isArray(b.filesToCreate) ? b.filesToCreate : []) {
      const file = db.one('SELECT id FROM company_files WHERE companyId = ? AND url = ?', report.companyId, f.url);
      if (!file) continue; // o upload (POST /uploads/companyFile) já registrou o arquivo
      if (b.addToGed) db.run('UPDATE company_files SET inGed = 1 WHERE id = ?', file.id);
      db.run('INSERT INTO question_report_files (id, questionReportId, fileId, createdAt) VALUES (?, ?, ?, ?)', db.uuid(), qr.id, file.id, db.now());
    }
    for (const fileId of Array.isArray(b.filesToAdd) ? b.filesToAdd : []) {
      if (!db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId)) continue;
      db.run('INSERT INTO question_report_files (id, questionReportId, fileId, createdAt) VALUES (?, ?, ?, ?)', db.uuid(), qr.id, fileId, db.now());
    }
    touch(qr.id, {
      selectedAnswerId: nonApplicable ? null : b.answerId,
      answerText: b.answerText ?? null,
      nonApplicable: nonApplicable ? 1 : 0,
      nonCompliant: b.nonCompliant ? 1 : 0,
      answererId: qr.answererId || req.user.id,
      // Durante a auditoria, um complemento volta para o auditor; fora dela vai para validação do gestor.
      status: auditing ? 'Auditing' : 'PendingValidationByManager',
    });
  });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** Upload GED: vincula arquivos já existentes da empresa à questão. */
router.patch('/reports/editQuestionReport/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  const ids = Array.isArray((req.body || {}).filesToAdd) ? req.body.filesToAdd : [];
  for (const fileId of ids) {
    if (!db.one('SELECT id FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId)) throw badRequest('arquivo não encontrado no GED da empresa');
    if (!db.one('SELECT id FROM question_report_files WHERE questionReportId = ? AND fileId = ?', qr.id, fileId))
      db.run('INSERT INTO question_report_files (id, questionReportId, fileId, createdAt) VALUES (?, ?, ?, ?)', db.uuid(), qr.id, fileId, db.now());
  }
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/questionFiles/:id', (req, res) => {
  const link = db.one('SELECT * FROM question_report_files WHERE id = ?', req.params.id);
  if (!link) throw notFound('file not found');
  const { report } = loadQuestionReport(link.questionReportId);
  assertCompanyAccess(req.user, report.companyId);
  db.run('DELETE FROM question_report_files WHERE id = ?', link.id);
  res.json({ id: link.id, deleted: true });
});

/* ---------- Validação (Gestor / Consultor) ---------- */

router.post('/reports/validateanswer/:id', requireRoles('MANAGER', 'CONSULTOR'), (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  if (LOCKED.includes(qr.status)) throw forbidden('este indicador está em auditoria');
  const { veredict, redflag } = req.body || {};
  if (!veredict && !redflag) throw badRequest('informe um comentário para reprovar');
  const by = req.user.role === 'MANAGER' ? 'Manager' : 'Consultor';
  touch(qr.id, { status: `${veredict ? 'Approved' : 'Rejected'}By${by}` });
  if (redflag) setRedflag(qr.id, String(redflag), req.user.id);
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.patch('/reports/addanswerer/:id', requireRoles('MANAGER', 'CONSULTOR', 'ADMIN'), (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  const user = db.one('SELECT * FROM users WHERE id = ? AND companyId = ? AND deletedAt IS NULL', (req.body || {}).user, report.companyId);
  if (!user || !['MANAGER', 'EMPLOYEE'].includes(user.role)) throw badRequest('responsável inválido');
  touch(qr.id, { answererId: user.id });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/* ---------- Lembretes (red flag) ---------- */

router.patch('/reports/redflag/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  const text = String((req.body || {}).redflag || '').trim();
  if (!text) throw badRequest('o lembrete não pode ser vazio');
  setRedflag(qr.id, text, req.user.id);
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.delete('/reports/redflag/:id', (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  touch(qr.id, { redflag: null, redflag_date: null, redflagIssuerId: null });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** "REABRIR INDICADOR" (ADMIN). */
router.patch('/reports/changeQuestionStatus/:id/:status', requireRoles('ADMIN'), (req, res) => {
  const { qr } = loadQuestionReport(req.params.id);
  if (!['Pending', 'Auditing'].includes(req.params.status)) throw badRequest('status inválido');
  touch(qr.id, { status: req.params.status });
  res.json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** "Submeter para Auditoria" (ADMIN) — exige todos os indicadores aprovados por gestor/consultor. */
router.post('/reports/submit/:companyId', requireRoles('ADMIN'), (req, res) => {
  const report = reportOfCompany(req.params.companyId);
  const items = db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  if (!items.length || !items.every((i) => APPROVED_FOR_AUDIT.includes(i.status)))
    throw forbidden('Ainda existem questões que precisam ser aprovadas pelo cosultor.');
  db.transaction(() => {
    db.run("UPDATE reports SET status = 'Auditing', auditoryStart = ?, updatedAt = ? WHERE id = ?", db.now(), db.now(), report.id);
    db.run("UPDATE question_reports SET status = 'Auditing', updatedAt = ? WHERE reportId = ?", db.now(), report.id);
  });
  res.status(201).json(ser.reportDetail(db.one('SELECT * FROM reports WHERE id = ?', report.id)));
});

/* ---------- Auditoria ---------- */

router.post('/auditory/evaluatequestion/:id', requireRoles('AUDITOR', 'SUPERVISOR'), (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  const { status, redflag, evidence } = req.body || {};
  if (!['Approved', 'Rejected', 'PendingRevision'].includes(status)) throw badRequest('status inválido');
  if (!redflag) throw badRequest('O campo de Observação é obrigátorio');
  db.transaction(() => {
    touch(qr.id, { status });
    setRedflag(qr.id, String(redflag), req.user.id);
    for (const e of Array.isArray(evidence) ? evidence : [])
      db.run('INSERT INTO evidences (id, questionReportId, name, url, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?)', db.uuid(), qr.id, e.name, e.url, e.fileType || null, db.now());
  });
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

router.post('/auditory/nonApplicable/:id', requireRoles('AUDITOR', 'SUPERVISOR'), (req, res) => {
  const { qr, report } = loadQuestionReport(req.params.id);
  assertCompanyAccess(req.user, report.companyId);
  if (report.status !== 'Auditing') throw forbidden('o relatório não está em auditoria');
  touch(qr.id, { nonApplicable: 1, selectedAnswerId: null, status: 'Approved' });
  res.status(201).json(ser.questionReport(db.one('SELECT * FROM question_reports WHERE id = ?', qr.id)));
});

/** Auditor encerra sua etapa e envia ao supervisor. */
router.post('/auditory/submitToSupervisor', requireRoles('AUDITOR'), (req, res) => {
  const report = reportOfCompany(req.user.companyId);
  const items = db.all('SELECT status FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam ser avaliados antes de submeter');
  db.run('UPDATE reports SET auditoryEnd = ?, updatedAt = ? WHERE id = ?', db.now(), db.now(), report.id);
  res.status(201).json(ser.reportDetail(db.one('SELECT * FROM reports WHERE id = ?', report.id)));
});

/** Supervisor finaliza a auditoria; a avaliação é o nível médio obtido nos indicadores aplicáveis. */
router.post('/auditory/finishAuditory/:companyId', requireRoles('SUPERVISOR', 'ADMIN'), (req, res) => {
  const report = reportOfCompany(req.params.companyId);
  assertCompanyAccess(req.user, report.companyId);
  const items = db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
  if (report.status !== 'Auditing' || !items.every((i) => AUDIT_FINAL.includes(i.status)))
    throw forbidden('todos os indicadores precisam estar aprovados ou rejeitados');
  const scored = items.filter((i) => !i.nonApplicable && i.selectedAnswerId).map((i) => db.one('SELECT points FROM answers WHERE id = ?', i.selectedAnswerId).points);
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
  const evaluation = ['Nao_conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Conforme'][Math.min(5, Math.round(avg / 2))];
  db.run("UPDATE reports SET status = 'Audited', evaluation = ?, auditoryEnd = coalesce(auditoryEnd, ?), updatedAt = ? WHERE id = ?", evaluation, db.now(), db.now(), report.id);
  res.status(201).json(ser.reportDetail(db.one('SELECT * FROM reports WHERE id = ?', report.id)));
});

router.post('/auditory/givereportaccess/:companyId', requireRoles('ADMIN'), (req, res) => {
  const report = reportOfCompany(req.params.companyId);
  if (report.status !== 'Audited') throw forbidden('o relatório só pode ser liberado após a auditoria');
  db.run('UPDATE companies SET reportAccess = 1, updatedAt = ? WHERE id = ?', db.now(), req.params.companyId);
  res.status(201).json({ companyId: req.params.companyId, reportAccess: true });
});

module.exports = router;
