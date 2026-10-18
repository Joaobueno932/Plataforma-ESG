const db = require('./db');
const { forbidden, notFound } = require('./http');

/** Seções que compõem o relatório de uma empresa: Caderno Geral ("All") + caderno setorial. */
const sectionsFor = (section) => ['All', section];

function createReportForCompany(company) {
  const sector = db.one('SELECT * FROM sectors WHERE section = ?', company.section);
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const at = db.now();
  const id = db.uuid();
  db.run(
    `INSERT INTO reports (id, companyId, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
    id, company.id, start.toISOString(), end.toISOString(),
    `Programa ESG-FIEMS (Setorial ${company.section})`,
    `Caderno Setorial ${company.section} + Caderno Geral`,
    at, at,
  );
  const questions = db.all(
    `SELECT id FROM questions WHERE section IN (?, ?)`,
    ...sectionsFor(sector ? sector.section : company.section),
  );
  for (const q of questions) addQuestionReport(id, q.id);
  return id;
}

function addQuestionReport(reportId, questionId) {
  const at = db.now();
  db.run(
    `INSERT OR IGNORE INTO question_reports (id, reportId, questionId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'Pending', ?, ?)`,
    db.uuid(), reportId, questionId, at, at,
  );
}

/** Um indicador novo entra nos relatórios em andamento das empresas do caderno correspondente. */
function attachQuestionToReports(question) {
  const reports = db.all(
    `SELECT r.id FROM reports r JOIN companies c ON c.id = r.companyId
      WHERE c.deletedAt IS NULL AND r.status = 'Pending' ${question.section === 'All' ? '' : 'AND c.section = ?'}`,
    ...(question.section === 'All' ? [] : [question.section]),
  );
  for (const r of reports) addQuestionReport(r.id, question.id);
}

function loadQuestionReport(id) {
  const qr = db.one('SELECT * FROM question_reports WHERE id = ?', id);
  if (!qr) throw notFound('question report not found');
  const report = db.one('SELECT * FROM reports WHERE id = ?', qr.reportId);
  return { qr, report };
}

/** ADMIN vê tudo; os demais papéis só enxergam a própria empresa. */
function assertCompanyAccess(user, companyId) {
  if (user.role === 'ADMIN') return;
  if (user.companyId !== companyId) throw forbidden('você não tem acesso aos dados desta empresa');
}

module.exports = { createReportForCompany, attachQuestionToReports, addQuestionReport, loadQuestionReport, assertCompanyAccess };
