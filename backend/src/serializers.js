const db = require('./db');

const bool = (v) => v === 1 || v === true;

/** Perfil exibido como principal na interface (precedência: ADMIN > CONSULTOR > demais). */
const ROLE_PRECEDENCE = ['ADMIN', 'CONSULTOR', 'SUPERVISOR', 'AUDITOR', 'MANAGER', 'EMPLOYEE'];
const primaryRole = (roles) => ROLE_PRECEDENCE.find((r) => roles.includes(r)) || roles[0] || null;

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
    status: u.status ?? 'ACTIVE',
    role: u.role,
    jobTitle: u.jobTitle ?? null,
    companyId: u.companyId ?? null,
  };
}

/** Dados mínimos de identificação de pessoa (listas e autoria), sem dados pessoais extras. */
const brief = (u) => (u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null);
const person = (u) => (u ? { id: u.id, name: u.name } : null);

function report(r) {
  if (!r) return null;
  return {
    id: r.id,
    companyId: r.companyId,
    cycle: r.cycle ?? 1,
    previousReportId: r.previousReportId ?? null,
    section: r.section ?? null,
    catalogVersion: r.catalogVersion ?? null,
    updatedAt: r.updatedAt,
    initialYear: r.initialYear,
    finalYear: r.finalYear,
    evaluation: r.evaluation ?? null,
    structure: r.structure,
    auditRequestedAt: r.auditRequestedAt ?? null,
    auditReleasedAt: r.auditReleasedAt ?? null,
    auditoryStart: r.auditoryStart ?? null,
    auditoryEnd: r.auditoryEnd ?? null,
    description: r.description,
    status: r.status,
    origin: r.origin ?? null,
    needsReview: bool(r.needsReview),
    createdAt: r.createdAt,
  };
}

/** Ciclo corrente da empresa (o de maior número). */
const currentReportOf = (companyId) =>
  db.one('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);

function company(c, { withReport = false, withCycles = false } = {}) {
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
    status: c.status ?? 'ACTIVE',
    origin: c.origin ?? null,
    needsReview: bool(c.needsReview),
    avatar: c.avatar ?? null,
  };
  if (withReport) out.report = report(currentReportOf(c.id));
  if (withCycles) out.cycles = db.all('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle', c.id).map(report);
  return out;
}

/** Vínculos vigentes do usuário (empresa + função concedida pela Administração). */
const links = (userId) =>
  db
    .all(
      `SELECT l.id, l.companyId, l.role, l.needsReview, l.grantedAt, c.bussinessName, c.legalName, c.status
         FROM user_company_links l JOIN companies c ON c.id = l.companyId
        WHERE l.userId = ? AND l.revokedAt IS NULL AND c.deletedAt IS NULL
        ORDER BY c.bussinessName`,
      userId,
    )
    .map((l) => ({
      id: l.id,
      companyId: l.companyId,
      role: l.role,
      bussinessName: l.bussinessName,
      legalName: l.legalName,
      companyStatus: l.status,
      needsReview: bool(l.needsReview),
      grantedAt: l.grantedAt,
    }));

const profiles = (userId) =>
  db.all('SELECT role, grantedAt FROM user_profiles WHERE userId = ? AND revokedAt IS NULL ORDER BY role', userId);

/**
 * Pessoa com perfis concedidos e vínculos vigentes. `role` permanece no formato antigo
 * (perfil principal) para não quebrar a interface; `roles` e `links` são o modelo real.
 */
function userWithProfiles(u, { contextCompanyId = null } = {}) {
  const granted = profiles(u.id).map((p) => p.role);
  const userLinks = links(u.id);
  const contextId = contextCompanyId || (userLinks.length === 1 ? userLinks[0].companyId : u.companyId) || null;
  const contextCompany = contextId ? db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', contextId) : null;
  return {
    ...user(u),
    role: primaryRole(granted) || u.role,
    roles: granted,
    links: userLinks,
    companyId: contextCompany ? contextCompany.id : null,
    company: company(contextCompany, { withReport: true }),
  };
}

/** Compatibilidade com o formato antigo de GET /users e /auth/me. */
const userWithCompany = (u) => userWithProfiles(u);

function answer(a) {
  return { id: a.id, questionId: a.questionId, title: a.title, points: a.points, description: a.description, mandatory: bool(a.mandatory) };
}

function question(q, answersByQuestion = null) {
  const rows = answersByQuestion
    ? answersByQuestion.get(q.id) || []
    : db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY points', q.id);
  return {
    id: q.id,
    code: q.code,
    section: q.section,
    title: q.title,
    description: q.description,
    category: q.category,
    subcategory: q.subcategory ?? null,
    hasMandatory: bool(q.hasMandatory),
    answers: rows.map(answer),
  };
}

/**
 * Item do ciclo. Aceita um `bundle` pré-carregado para evitar N+1 nas listagens
 * (ver routes/reports.js → loadItems).
 */
function questionReport(qr, bundle = null) {
  const get = (map, key, fallback) => (bundle ? bundle[map].get(key) || fallback : undefined);
  const q = bundle ? get('questions', qr.questionId) : db.one('SELECT * FROM questions WHERE id = ?', qr.questionId);
  const rep = bundle ? bundle.report : db.one('SELECT id, companyId, status, cycle FROM reports WHERE id = ?', qr.reportId);
  const files = bundle
    ? get('files', qr.id, [])
    : db.all(
        `SELECT qrf.id, qrf.fileId, f.companyId, f.name, f.url, f.fileType
           FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
          WHERE qrf.questionReportId = ? ORDER BY qrf.createdAt`,
        qr.id,
      );
  const evidences = bundle
    ? get('evidences', qr.id, [])
    : db.all('SELECT id, name, url, fileType FROM evidences WHERE questionReportId = ? ORDER BY createdAt', qr.id);
  const selected = qr.selectedAnswerId
    ? bundle
      ? get('answersById', qr.selectedAnswerId)
      : db.one('SELECT * FROM answers WHERE id = ?', qr.selectedAnswerId)
    : null;
  const personOf = (id) => (!id ? null : bundle ? get('people', id) : db.one('SELECT * FROM users WHERE id = ?', id));

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
    redflagIssuer: brief(personOf(qr.redflagIssuerId)),
    answerer: brief(personOf(qr.answererId)),
    assignedBy: person(personOf(qr.assignedById)),
    assignedAt: qr.assignedAt ?? null,
    dueDate: qr.dueDate ?? null,
    answeredBy: brief(personOf(qr.answeredById)),
    answeredByRole: qr.answeredByRole ?? null,
    answeredAt: qr.answeredAt ?? null,
    selectedAnswer: selected ? answer(selected) : null,
    question: question(q, bundle ? bundle.answersByQuestion : null),
    report: rep,
    files: files.map((f) => ({
      id: f.id,
      fileId: f.fileId,
      file: { id: f.fileId, companyId: f.companyId, name: f.name, url: f.url, fileType: f.fileType },
    })),
    evidences,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
  };
}

/** Participantes do ciclo: vínculos da empresa + designações do ciclo. */
function reportDetail(r) {
  const byRole = (role) =>
    db
      .all(
        `SELECT u.id, u.name FROM user_company_links l JOIN users u ON u.id = l.userId
          WHERE l.companyId = ? AND l.role = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL AND u.status = 'ACTIVE'
          ORDER BY u.name`,
        r.companyId,
        role,
      )
      .map(plainPerson);
  const assigned = (role) =>
    db
      .all(
        `SELECT u.id, u.name FROM cycle_professionals cp JOIN users u ON u.id = cp.userId
          WHERE cp.reportId = ? AND cp.role = ? AND cp.revokedAt IS NULL AND u.deletedAt IS NULL
          ORDER BY u.name`,
        r.id,
        role,
      )
      .map(plainPerson);
  return {
    ...report(r),
    consultors: byRole('CONSULTOR'),
    managers: byRole('MANAGER'),
    facilitators: byRole('EMPLOYEE'),
    // Auditor e supervisor do ciclo vêm da designação, não do simples vínculo.
    auditor: assigned('AUDITOR'),
    supervisor: assigned('SUPERVISOR'),
  };
}

const plainPerson = (u) => ({ id: u.id, name: u.name });

module.exports = {
  bool,
  user,
  primaryRole,
  report,
  currentReportOf,
  company,
  links,
  profiles,
  userWithProfiles,
  userWithCompany,
  brief,
  person,
  answer,
  question,
  questionReport,
  reportDetail,
};
