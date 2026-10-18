const db = require('./db');

const bool = (v) => v === 1 || v === true;

function user(u) {
  if (!u) return null;
  return {
    id: u.id,
    avatar: u.avatar ?? null,
    name: u.name,
    email: u.email,
    cpf: u.cpf ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt ?? null,
    role: u.role,
    jobTitle: u.jobTitle ?? null,
    companyId: u.companyId ?? null,
  };
}

function report(r) {
  if (!r) return null;
  return {
    id: r.id,
    companyId: r.companyId,
    updatedAt: r.updatedAt,
    initialYear: r.initialYear,
    finalYear: r.finalYear,
    evaluation: r.evaluation ?? null,
    structure: r.structure,
    auditoryStart: r.auditoryStart ?? null,
    auditoryEnd: r.auditoryEnd ?? null,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
  };
}

function company(c, { withReport = false } = {}) {
  if (!c) return null;
  const out = {
    id: c.id,
    bussinessName: c.bussinessName,
    legalName: c.legalName,
    accessDate: c.accessDate,
    email: c.email,
    reportAccess: bool(c.reportAccess),
    size: c.size,
    cnpj: c.cnpj,
    section: c.section,
    access: bool(c.access),
    avatar: c.avatar ?? null,
  };
  if (withReport) out.report = report(db.one('SELECT * FROM reports WHERE companyId = ?', c.id));
  return out;
}

/** Usuário com a empresa (e relatório) aninhados — formato de GET /users e /auth/me. */
function userWithCompany(u) {
  const c = u.companyId ? db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', u.companyId) : null;
  return { ...user(u), company: company(c, { withReport: true }) };
}

const brief = (u) => (u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null);

function answer(a) {
  return { id: a.id, questionId: a.questionId, title: a.title, points: a.points, description: a.description, mandatory: bool(a.mandatory) };
}

function question(q) {
  return {
    id: q.id,
    code: q.code,
    section: q.section,
    title: q.title,
    description: q.description,
    category: q.category,
    subcategory: q.subcategory ?? null,
    hasMandatory: bool(q.hasMandatory),
    answers: db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY points', q.id).map(answer),
  };
}

function questionReport(qr) {
  const q = db.one('SELECT * FROM questions WHERE id = ?', qr.questionId);
  const rep = db.one('SELECT id, companyId, status FROM reports WHERE id = ?', qr.reportId);
  const files = db
    .all(
      `SELECT qrf.id, qrf.fileId, f.companyId, f.name, f.url, f.fileType
         FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
        WHERE qrf.questionReportId = ? ORDER BY qrf.createdAt`,
      qr.id,
    )
    .map((f) => ({ id: f.id, fileId: f.fileId, file: { id: f.fileId, companyId: f.companyId, name: f.name, url: f.url, fileType: f.fileType } }));
  const evidences = db.all('SELECT id, name, url, fileType FROM evidences WHERE questionReportId = ? ORDER BY createdAt', qr.id);
  const selected = qr.selectedAnswerId ? db.one('SELECT * FROM answers WHERE id = ?', qr.selectedAnswerId) : null;
  return {
    id: qr.id,
    reportId: qr.reportId,
    questionId: qr.questionId,
    status: qr.status,
    nonApplicable: bool(qr.nonApplicable),
    nonCompliant: bool(qr.nonCompliant),
    answerText: qr.answerText ?? null,
    redflag: qr.redflag ?? null,
    redflag_date: qr.redflag_date ?? null,
    redflagIssuer: brief(qr.redflagIssuerId && db.one('SELECT * FROM users WHERE id = ?', qr.redflagIssuerId)),
    answerer: brief(qr.answererId && db.one('SELECT * FROM users WHERE id = ?', qr.answererId)),
    selectedAnswer: selected ? answer(selected) : null,
    question: question(q),
    report: rep,
    files,
    evidences,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
  };
}

/** Relatório com os participantes por papel (exibidos em "Detalhes da Empresa"). */
function reportDetail(r) {
  const people = (role) => db.all('SELECT id, name FROM users WHERE companyId = ? AND role = ? AND deletedAt IS NULL ORDER BY name', r.companyId, role);
  return {
    ...report(r),
    consultors: people('CONSULTOR'),
    managers: people('MANAGER'),
    facilitators: people('EMPLOYEE'),
    auditor: people('AUDITOR'),
    supervisor: people('SUPERVISOR'),
  };
}

module.exports = { bool, user, report, company, userWithCompany, brief, answer, question, questionReport, reportDetail };
