const db = require('./db');
const { notFound, badRequest } = require('./http');

/** Seções que compõem uma avaliação: Caderno Geral ("All") + o caderno setorial atribuído. */
const sectionsFor = (section) => ['All', section];

/**
 * Versão do catálogo congelada no ciclo. O catálogo ainda é o demonstrativo herdado
 * (diagnóstico A1); a importação da planilha oficial e o versionamento de catálogo são a
 * etapa seguinte (docs/esg/progresso.md, E3). Enquanto isso, o ciclo registra a versão com
 * que foi aberto, de modo que a troca futura não altere ciclos existentes.
 */
const currentCatalogVersion = () => process.env.CATALOG_VERSION || 'legacy-demo';

/**
 * Abre um ciclo (avaliação) para a empresa: numeração sequencial, caderno e versão de
 * catálogo congelados e relação com o ciclo anterior.
 */
function createCycleForCompany(company, { createdById = null, previousReportId = null } = {}) {
  const sector = db.one('SELECT section FROM sectors WHERE section = ?', company.section);
  const section = sector ? sector.section : company.section;
  const last = db.one('SELECT id, cycle, status FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', company.id);
  if (last && !previousReportId && last.status !== 'Audited')
    throw badRequest('a empresa já possui um ciclo em andamento; conclua-o antes de abrir outro');

  const cycle = last ? last.cycle + 1 : 1;
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const at = db.now();
  const id = db.uuid();
  db.run(
    `INSERT INTO reports (id, companyId, cycle, previousReportId, section, catalogVersion, initialYear, finalYear,
                          structure, description, status, origin, needsReview, createdById, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'registered', 0, ?, ?, ?)`,
    id,
    company.id,
    cycle,
    previousReportId || (last ? last.id : null),
    section,
    currentCatalogVersion(),
    start.toISOString(),
    end.toISOString(),
    `Programa ESG-FIEMS (Setorial ${section})`,
    `Caderno Setorial ${section} + Caderno Geral`,
    createdById,
    at,
    at,
  );
  const questions = db.all('SELECT id FROM questions WHERE section IN (?, ?)', ...sectionsFor(section));
  for (const q of questions) addQuestionReport(id, q.id);
  return id;
}

function addQuestionReport(reportId, questionId) {
  const at = db.now();
  db.run(
    `INSERT OR IGNORE INTO question_reports (id, reportId, questionId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'Pending', ?, ?)`,
    db.uuid(),
    reportId,
    questionId,
    at,
    at,
  );
}

/** Um indicador novo entra nos ciclos em preenchimento do caderno correspondente. */
function attachQuestionToReports(question) {
  const reports = db.all(
    `SELECT r.id FROM reports r JOIN companies c ON c.id = r.companyId
      WHERE c.deletedAt IS NULL AND r.status = 'Pending'
        AND (? = 'All' OR r.section = ?)`,
    question.section,
    question.section,
  );
  for (const r of reports) addQuestionReport(r.id, question.id);
}

function loadQuestionReport(id) {
  const qr = db.one('SELECT * FROM question_reports WHERE id = ?', id);
  if (!qr) throw notFound('question report not found');
  const report = db.one('SELECT * FROM reports WHERE id = ?', qr.reportId);
  return { qr, report };
}

/** Ciclo corrente (maior número) da empresa. */
function currentCycle(companyId) {
  const report = db.one('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

module.exports = {
  sectionsFor,
  currentCatalogVersion,
  createCycleForCompany,
  /** @deprecated use createCycleForCompany */
  createReportForCompany: (company, options) => createCycleForCompany(company, options),
  attachQuestionToReports,
  addQuestionReport,
  loadQuestionReport,
  currentCycle,
};
