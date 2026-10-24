/**
 * Publicação automática do resultado aprovado.
 *
 * - `register` roda **dentro** da transação da aprovação do supervisor: grava a publicação
 *   (uma por ciclo e rodada), ligada ao resultado gravado, e o registro do certificado quando a
 *   avaliação é elegível. Nada de liberação manual posterior.
 * - `generate` roda **depois** do COMMIT: monta o relatório em área privada. Se falhar, a
 *   publicação fica `failed` com o erro registrado e é tentada de novo automaticamente (na
 *   subida da API e no primeiro acesso), com limite de tentativas — sem nova decisão humana.
 *
 * Certificado: a especificação prevê validade de dois anos (Manual § 8.6) e deixa pendentes o
 * modelo oficial e se a plataforma emite ou só armazena o documento. Por isso a concessão é
 * registrada (código verificável, emissão, início e fim da validade, escopo, rating), mas o
 * documento fica `awaiting-official-template` — nenhum certificado é apresentado sem o modelo.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const reportPdf = require('./report-pdf');

const MAX_ATTEMPTS = 5;
const VALIDITY = { id: 'manual-8.6-dois-anos', years: 2, source: 'Manual do Programa § 8.6 (citado na especificação, TEL de certificação)' };

let generatorOverride = null;
/** Somente para testes isolados: substitui o gerador (ex.: simular falha). */
function setGeneratorForTests(fn) {
  generatorOverride = fn;
}

const dirOf = (publication) => path.join(config.storageDir, 'publications', publication.reportId, publication.id);

function certificateCode() {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `ESG-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/** Grava a publicação na mesma transação da aprovação. Idempotente por (ciclo, rodada). */
async function register({ report, stored, req }) {
  const existing = await db.one('SELECT * FROM publications WHERE reportId = ? AND round = ?', report.id, report.currentRound || 1);
  if (existing) return existing;
  const result = stored.result;
  const eligible = result.eligible === true;
  const approvedAt = db.now();
  const until = new Date(approvedAt);
  until.setUTCFullYear(until.getUTCFullYear() + VALIDITY.years);
  const id = db.uuid();
  await db.run(
    `INSERT INTO publications (id, reportId, round, cycleResultId, status, templateVersion, rating, eligible, ruleVersion, policyId, catalogVersionId,
                               certificateStatus, certificateCode, certificateValidFrom, certificateValidUntil, validityPolicy,
                               approvedById, approvedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    report.id,
    report.currentRound || 1,
    stored.id,
    reportPdf.TEMPLATE_VERSION,
    result.ratingValid ? result.rating : null,
    result.eligible === null ? null : eligible ? 1 : 0,
    result.ruleVersion,
    result.policy.id,
    report.catalogVersionId,
    eligible ? 'awaiting-official-template' : 'not-eligible',
    eligible ? certificateCode() : null,
    eligible ? approvedAt : null,
    eligible ? until.toISOString() : null,
    eligible ? VALIDITY.id : null,
    req.principal.user.id,
    approvedAt,
    approvedAt,
    approvedAt,
  );
  // Compatibilidade com a flag antiga de acesso ao relatório: liberada pela própria aprovação.
  await db.run('UPDATE companies SET reportAccess = 1, updatedAt = ? WHERE id = ?', db.now(), report.companyId);
  return db.one('SELECT * FROM publications WHERE id = ?', id);
}

/** Dados do relatório, todos lidos dos registros gravados (nada recalculado). */
async function reportData(publication) {
  const stored = await db.one('SELECT payload FROM cycle_results WHERE id = ?', publication.cycleResultId);
  const result = JSON.parse(stored.payload);
  const report = await db.one('SELECT * FROM reports WHERE id = ?', publication.reportId);
  const company = await db.one('SELECT * FROM companies WHERE id = ?', report.companyId);
  const sector = await db.one('SELECT description FROM sectors WHERE section = ?', report.section);
  const team = { AUDITOR: [], SUPERVISOR: [], CONSULTOR: [] };
  for (const row of await db.all(
    `SELECT cp.role, u.name FROM cycle_professionals cp JOIN users u ON u.id = cp.userId WHERE cp.reportId = ? AND cp.revokedAt IS NULL ORDER BY u.name`,
    report.id,
  ))
    team[row.role].push(row.name);
  for (const row of await db.all(
    `SELECT u.name FROM user_company_links l JOIN users u ON u.id = l.userId WHERE l.companyId = ? AND l.role = 'CONSULTOR' AND l.revokedAt IS NULL ORDER BY u.name`,
    report.companyId,
  ))
    team.CONSULTOR.push(row.name);
  const naDecisions = (
    await db.all(
      `SELECT q.code, n.decision, n.justification, n.decisionReason FROM na_requests n
         JOIN question_reports qr ON qr.id = n.questionReportId JOIN questions q ON q.id = qr.questionId
        WHERE n.reportId = ? AND n.withdrawnAt IS NULL AND n.decision IS NOT NULL ORDER BY q.position, q.code`,
      report.id,
    )
  ).map((n) => ({ code: n.code, decision: n.decision === 'accepted' ? 'aceito' : 'recusado', justification: n.justification, reason: n.decisionReason }));
  const findings = (
    await db.all(
      `SELECT q.code, p.description, p.status FROM pendings p
         LEFT JOIN question_reports qr ON qr.id = p.questionReportId LEFT JOIN questions q ON q.id = qr.questionId
        WHERE p.reportId = ? AND p.kind = 'constatacao-auditoria' ORDER BY p.createdAt`,
      report.id,
    )
  ).map((f) => ({ code: f.code || 'geral', description: f.description, status: f.status }));
  return { publication, result, report, company, sectionName: sector ? sector.description : '', team, items: result.items || [], naDecisions, findings };
}

/** Gera (ou regenera) os documentos da publicação. Nunca lança: registra a falha. */
async function generate(publicationId) {
  const publication = await db.one('SELECT * FROM publications WHERE id = ?', publicationId);
  if (!publication || publication.status === 'available') return publication;
  await db.run('UPDATE publications SET attempts = attempts + 1, lastAttemptAt = ?, updatedAt = ? WHERE id = ?', db.now(), db.now(), publication.id);
  try {
    const data = await reportData(publication);
    const target = path.join(dirOf(publication), 'relatorio-auditoria.pdf');
    if (generatorOverride) await generatorOverride(data, target);
    else await reportPdf.write(data, target);
    const buffer = fs.readFileSync(target);
    await db.run(
      `UPDATE publications SET status = 'available', lastError = NULL, reportPath = ?, reportSha256 = ?, reportBytes = ?, reportGeneratedAt = ?, updatedAt = ?
        WHERE id = ?`,
      path.relative(config.storageDir, target),
      crypto.createHash('sha256').update(buffer).digest('hex'),
      buffer.length,
      db.now(),
      db.now(),
      publication.id,
    );
  } catch (err) {
    // Registro técnico, sem dados sensíveis: só a mensagem do erro.
    await db.run("UPDATE publications SET status = 'failed', lastError = ?, updatedAt = ? WHERE id = ?", String(err.message).slice(0, 500), db.now(), publication.id);
  }
  return db.one('SELECT * FROM publications WHERE id = ?', publication.id);
}

/** Garante a publicação disponível: tenta de novo, com limite, o que ficou pendente ou falhou. */
async function ensure(publication) {
  if (!publication || publication.status === 'available') return publication;
  if (publication.attempts >= MAX_ATTEMPTS) return publication;
  return generate(publication.id);
}

/** Na subida da API: retoma publicações pendentes ou com falha (ex.: reinício no meio da geração). */
async function sweep(log = () => {}) {
  const rows = await db.all("SELECT id FROM publications WHERE status IN ('pending', 'failed') AND attempts < ?", MAX_ATTEMPTS);
  for (const row of rows) {
    const done = await generate(row.id);
    log(`publicação ${row.id}: ${done.status}`);
  }
  return rows.length;
}

const latestOf = async (reportId) => db.one('SELECT * FROM publications WHERE reportId = ? ORDER BY round DESC LIMIT 1', reportId);

/** Visão pública da publicação (sem caminhos de arquivo). */
function view(publication) {
  if (!publication) return null;
  const certificateLabel = {
    'not-eligible': 'Sem certificado: avaliação não elegível',
    'awaiting-official-template': 'Concessão registrada; documento aguarda o modelo oficial da FIEMS',
    issued: 'Certificado emitido',
  }[publication.certificateStatus];
  return {
    id: publication.id,
    reportId: publication.reportId,
    round: publication.round,
    status: publication.status,
    attempts: publication.attempts,
    retrying: publication.status !== 'available' && publication.attempts < MAX_ATTEMPTS,
    approvedAt: publication.approvedAt,
    rating: publication.rating,
    eligible: publication.eligible === null ? null : !!publication.eligible,
    ruleVersion: publication.ruleVersion,
    policyId: publication.policyId,
    report: {
      available: publication.status === 'available',
      generatedAt: publication.reportGeneratedAt,
      bytes: publication.reportBytes,
      sha256: publication.reportSha256,
      templateVersion: publication.templateVersion,
    },
    certificate: {
      status: publication.certificateStatus,
      label: certificateLabel,
      code: publication.certificateCode,
      validFrom: publication.certificateValidFrom,
      validUntil: publication.certificateValidUntil,
      validityPolicy: publication.validityPolicy,
      documentAvailable: publication.certificateStatus === 'issued',
    },
  };
}

module.exports = { MAX_ATTEMPTS, VALIDITY, register, generate, ensure, sweep, latestOf, view, dirOf, reportData, setGeneratorForTests };
