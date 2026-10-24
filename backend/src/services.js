const db = require('./db');
const { notFound, badRequest } = require('./http');
const catalog = require('./catalog/import');

/** Seções que compõem uma avaliação: Caderno Geral ("All") + o caderno setorial atribuído. */
const sectionsFor = (section) => ['All', section];

/**
 * Versão do catálogo congelada no ciclo: a última versão oficial publicada (ou o catálogo
 * demonstrativo, enquanto nenhuma oficial tiver sido publicada). O ciclo guarda o id e o
 * rótulo, de modo que publicar outra versão não altere ciclos já abertos.
 */
async function currentCatalogVersion() {
  const version = await catalog.activeVersion();
  return version ? version.label : catalog.LEGACY_VERSION_ID;
}

/**
 * Abre um ciclo (avaliação) para a empresa: numeração sequencial, caderno e versão de
 * catálogo congelados e relação com o ciclo anterior.
 */
async function createCycleForCompany(company, { createdById = null, previousReportId = null, catalogVersionId = null } = {}) {
  const sector = await db.one('SELECT section FROM sectors WHERE section = ?', company.section);
  const section = sector ? sector.section : company.section;
  const version = catalogVersionId ? await catalog.versionById(catalogVersionId) : await catalog.activeVersion();
  if (!version) throw badRequest('nenhuma versão de catálogo disponível');
  if (version.status !== 'published') throw badRequest(`a versão de catálogo "${version.label}" não está publicada`);
  const last = await db.one('SELECT id, cycle, status FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', company.id);
  if (last && !previousReportId && last.status !== 'Audited')
    throw badRequest('a empresa já possui um ciclo em andamento; conclua-o antes de abrir outro');

  const cycle = last ? last.cycle + 1 : 1;
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const at = db.now();
  const id = db.uuid();
  await db.run(
    `INSERT INTO reports (id, companyId, cycle, previousReportId, section, catalogVersion, catalogVersionId, initialYear, finalYear,
                          structure, description, status, origin, needsReview, createdById, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'registered', 0, ?, ?, ?)`,
    id,
    company.id,
    cycle,
    previousReportId || (last ? last.id : null),
    section,
    version.label,
    version.id,
    start.toISOString(),
    end.toISOString(),
    `Programa ESG-FIEMS (Setorial ${section})`,
    `Caderno Setorial ${section} + Caderno Geral`,
    createdById,
    at,
    at,
  );
  // Somente os indicadores da versão congelada no ciclo.
  const questions = await db.all(
    'SELECT id FROM questions WHERE versionId = ? AND section IN (?, ?) ORDER BY position, code',
    version.id,
    ...sectionsFor(section),
  );
  if (!questions.length) throw badRequest(`a versão de catálogo "${version.label}" não tem indicadores para o caderno ${section}`);
  for (const q of questions) await addQuestionReport(id, q.id);
  return id;
}

async function addQuestionReport(reportId, questionId) {
  const at = db.now();
  await db.run(
    `INSERT IGNORE INTO question_reports (id, reportId, questionId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'Pending', ?, ?)`,
    db.uuid(),
    reportId,
    questionId,
    at,
    at,
  );
}

/**
 * Um indicador novo entra nos ciclos em preenchimento do caderno correspondente — e somente
 * nos ciclos **da mesma versão de catálogo**, para não contaminar ciclos de outra versão nem
 * os rascunhos.
 */
async function attachQuestionToReports(question) {
  if (!question.versionId) return;
  const reports = await db.all(
    `SELECT r.id FROM reports r JOIN companies c ON c.id = r.companyId
      WHERE c.deletedAt IS NULL AND r.status = 'Pending' AND r.catalogVersionId = ?
        AND (? = 'All' OR r.section = ?)`,
    question.versionId,
    question.section,
    question.section,
  );
  for (const r of reports) await addQuestionReport(r.id, question.id);
}

async function loadQuestionReport(id) {
  const qr = await db.one('SELECT * FROM question_reports WHERE id = ?', id);
  if (!qr) throw notFound('question report not found');
  const report = await db.one('SELECT * FROM reports WHERE id = ?', qr.reportId);
  return { qr, report };
}

/** Ciclo corrente (maior número) da empresa. */
async function currentCycle(companyId) {
  const report = await db.one('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

module.exports = {
  sectionsFor,
  currentCatalogVersion,
  activeCatalogVersion: async () => catalog.activeVersion(),
  createCycleForCompany,
  /** @deprecated use createCycleForCompany */
  createReportForCompany: async (company, options) => createCycleForCompany(company, options),
  attachQuestionToReports,
  addQuestionReport,
  loadQuestionReport,
  currentCycle,
};
