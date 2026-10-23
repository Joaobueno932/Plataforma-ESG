const db = require('./db');

const bool = (v) => v === 1 || v === true;

/** Perfil exibido como principal na interface (precedência: ADMIN > CONSULTOR > demais). */
const ROLE_PRECEDENCE = ['ADMIN', 'CONSULTOR', 'SUPERVISOR', 'AUDITOR', 'MANAGER', 'EMPLOYEE'];
const primaryRole = (roles) => ROLE_PRECEDENCE.find((r) => roles.includes(r)) || roles[0] || null;

/**
 * Projeções puras (`user`, `report`, `answer`, `brief`, `person`) são síncronas de propósito:
 * elas só traduzem a linha já carregada. As que leem o banco são assíncronas e devem ser
 * aguardadas — o pool do MySQL não responde de forma síncrona como o driver anterior.
 */
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
    catalogVersionId: r.catalogVersionId ?? null,
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
const currentReportOf = async (companyId) => db.one('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);

async function company(c, { withReport = false, withCycles = false } = {}) {
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
  if (withReport) out.report = report(await currentReportOf(c.id));
  if (withCycles) out.cycles = (await db.all('SELECT * FROM reports WHERE companyId = ? ORDER BY cycle', c.id)).map(report);
  return out;
}

/** Vínculos vigentes do usuário (empresa + função concedida pela Administração). */
const links = async (userId) =>
  (
    await db.all(
      `SELECT l.id, l.companyId, l.role, l.needsReview, l.grantedAt, c.bussinessName, c.legalName, c.status
         FROM user_company_links l JOIN companies c ON c.id = l.companyId
        WHERE l.userId = ? AND l.revokedAt IS NULL AND c.deletedAt IS NULL
        ORDER BY c.bussinessName`,
      userId,
    )
  ).map((l) => ({
      id: l.id,
      companyId: l.companyId,
      role: l.role,
      bussinessName: l.bussinessName,
      legalName: l.legalName,
      companyStatus: l.status,
      needsReview: bool(l.needsReview),
      grantedAt: l.grantedAt,
    }));

const profiles = async (userId) => db.all('SELECT role, grantedAt FROM user_profiles WHERE userId = ? AND revokedAt IS NULL ORDER BY role', userId);

/**
 * Pessoa com perfis concedidos e vínculos vigentes. `role` permanece no formato antigo
 * (perfil principal) para não quebrar a interface; `roles` e `links` são o modelo real.
 */
async function userWithProfiles(u, { contextCompanyId = null } = {}) {
  const granted = (await profiles(u.id)).map((p) => p.role);
  const userLinks = await links(u.id);
  const contextId = contextCompanyId || (userLinks.length === 1 ? userLinks[0].companyId : u.companyId) || null;
  const contextCompany = contextId ? await db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', contextId) : null;
  return {
    ...user(u),
    role: primaryRole(granted) || u.role,
    roles: granted,
    links: userLinks,
    companyId: contextCompany ? contextCompany.id : null,
    company: await company(contextCompany, { withReport: true }),
  };
}

/** Compatibilidade com o formato antigo de GET /users e /auth/me. */
const userWithCompany = (u) => userWithProfiles(u);

/** Alternativa do indicador: ordem, nome, descrição, pontos e apresentação vindos da fonte. */
function answer(a) {
  if (!a) return null;
  return {
    id: a.id,
    questionId: a.questionId,
    position: a.position ?? null,
    title: a.title,
    slug: a.slug ?? null,
    presentation: a.presentation ?? null,
    points: a.points,
    description: a.description,
    mandatory: bool(a.mandatory),
  };
}

/**
 * Indicador com as alternativas **próprias** dele, na ordem da fonte. Não existe mais lista
 * universal de níveis: o que vale é o que está registrado para o indicador da versão.
 */
async function question(q, answersByQuestion = null) {
  const rows = answersByQuestion
    ? answersByQuestion.get(q.id) || []
    : await db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY position, id', q.id);
  return {
    id: q.id,
    versionId: q.versionId ?? null,
    origin: q.origin ?? null,
    code: q.code,
    codeOriginal: q.codeOriginal ?? q.code,
    section: q.section,
    position: q.position ?? null,
    title: q.title,
    description: q.description,
    verification: q.verification ?? null,
    category: q.category,
    subcategory: q.subcategory ?? null,
    topic: q.topic ?? q.subcategory ?? null,
    ods: q.ods ?? null,
    maxPoints: q.maxPoints ?? null,
    hasMandatory: bool(q.hasMandatory),
    mandatoryAnswerId: q.mandatoryAnswerId ?? null,
    answers: rows.map(answer),
  };
}

/**
 * Item do ciclo. Aceita um `bundle` pré-carregado para evitar N+1 nas listagens
 * (ver routes/reports.js → loadItems).
 */
/** Colunas de arquivo vinculado ao indicador (lista e item usam a mesma projeção). */
const ITEM_FILE_COLUMNS = `qrf.id, qrf.questionReportId, qrf.fileId, qrf.round, qrf.addedById, qrf.addedByRole, qrf.createdAt AS linkedAt,
  f.companyId, f.name, f.url, f.fileType, f.sizeBytes, f.description, f.validUntil, f.indefiniteValidity, f.kind,
  f.version, f.uploadedById, f.uploadedByRole, f.createdAt AS uploadedAt`;

function itemFile(f) {
  const validUntil = f.validUntil ?? null;
  return {
    id: f.id,
    fileId: f.fileId,
    round: f.round ?? 1,
    linkedAt: f.linkedAt ?? null,
    addedByRole: f.addedByRole ?? null,
    file: {
      id: f.fileId,
      companyId: f.companyId,
      name: f.name,
      url: f.url,
      fileType: f.fileType,
      sizeBytes: f.sizeBytes ?? null,
      description: f.description ?? null,
      kind: f.kind ?? 'evidencia',
      version: f.version ?? 1,
      validUntil,
      indefiniteValidity: bool(f.indefiniteValidity),
      // Vencimento é informação: não altera pontuação nem reprova automaticamente.
      expired: !!validUntil && !bool(f.indefiniteValidity) && new Date(validUntil) < new Date(),
      uploadedAt: f.uploadedAt ?? null,
    },
  };
}

/**
 * Item do ciclo. Aceita um `bundle` pré-carregado para evitar N+1 nas listagens
 * (ver routes/reports.js → loadItems).
 *
 * `showAudit` controla o que é da auditoria (enquadramento, parecer e evidências do auditor):
 * a empresa só vê esse conteúdo depois da aprovação do supervisor.
 */
async function questionReport(qr, bundle = null, { showAudit = true } = {}) {
  const get = (map, key, fallback) => (bundle ? bundle[map].get(key) || fallback : undefined);
  const q = bundle ? get('questions', qr.questionId) : await db.one('SELECT * FROM questions WHERE id = ?', qr.questionId);
  const rep = bundle ? bundle.report : await db.one('SELECT id, companyId, status, cycle, currentRound FROM reports WHERE id = ?', qr.reportId);
  const files = bundle
    ? get('files', qr.id, [])
    : await db.all(
        `SELECT ${ITEM_FILE_COLUMNS}
           FROM question_report_files qrf JOIN company_files f ON f.id = qrf.fileId
          WHERE qrf.questionReportId = ? AND qrf.removedAt IS NULL ORDER BY qrf.createdAt`,
        qr.id,
      );
  const evidences = !showAudit
    ? []
    : bundle
      ? get('evidences', qr.id, [])
      : await db.all('SELECT id, name, url, fileType, sizeBytes, round, createdAt FROM evidences WHERE questionReportId = ? ORDER BY createdAt', qr.id);
  const answerById = async (id) =>
    !id ? null : bundle ? get('answersById', id) : await db.one('SELECT * FROM answers WHERE id = ?', id);
  const selected = await answerById(qr.selectedAnswerId);
  const audited = showAudit ? await answerById(qr.auditedAnswerId) : null;
  const na = bundle
    ? get('na', qr.id, null)
    : await db.one(
        'SELECT * FROM na_requests WHERE questionReportId = ? AND withdrawnAt IS NULL ORDER BY requestedAt DESC LIMIT 1',
        qr.id,
      );
  const personOf = async (id) => (!id ? null : bundle ? get('people', id) : await db.one('SELECT * FROM users WHERE id = ?', id));
  // Sequencial de propósito: dentro de uma transação todas as consultas compartilham a mesma
  // conexão, e a ordem importa para não concorrer com o comando em curso.
  const redflagIssuer = await personOf(qr.redflagIssuerId);
  const answerer = await personOf(qr.answererId);
  const assignedBy = await personOf(qr.assignedById);
  const answeredBy = await personOf(qr.answeredById);
  const auditedBy = showAudit ? await personOf(qr.auditedById) : null;

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
    redflagIssuer: brief(redflagIssuer),
    answerer: brief(answerer),
    assignedBy: person(assignedBy),
    assignedAt: qr.assignedAt ?? null,
    dueDate: qr.dueDate ?? null,
    answeredBy: brief(answeredBy),
    answeredByRole: qr.answeredByRole ?? null,
    answeredAt: qr.answeredAt ?? null,
    selectedAnswer: answer(selected),
    // Estado da declaração da empresa (rascunho × enviada) e versões, para revisão e concorrência.
    answerState: qr.answerState ?? 'empty',
    answerVersion: qr.answerVersion ?? 0,
    reviewedAnswerVersion: qr.reviewedAnswerVersion ?? null,
    lockVersion: qr.lockVersion ?? 1,
    round: qr.round ?? 1,
    draftUpdatedAt: qr.draftUpdatedAt ?? null,
    submittedAt: qr.submittedAt ?? null,
    submittedByRole: qr.submittedByRole ?? null,
    naRequest: na
      ? {
          id: na.id,
          justification: na.justification ?? null,
          requestedAt: na.requestedAt,
          requestedByRole: na.requestedByRole ?? null,
          // A decisão do auditor fica com a auditoria até a aprovação.
          decision: showAudit ? na.decision ?? null : na.decision ? 'decidido' : null,
          decisionReason: showAudit ? na.decisionReason ?? null : null,
          decidedAt: showAudit ? na.decidedAt ?? null : null,
        }
      : null,
    // Enquadramento auditado: registro separado da declaração, com autor e versão analisada.
    audit: showAudit
      ? {
          auditedAnswer: answer(audited),
          conclusion: qr.auditConclusion ?? null,
          justification: qr.auditJustification ?? null,
          answerVersion: qr.auditedAnswerVersion ?? null,
          valid: qr.auditedAnswerVersion != null && qr.auditedAnswerVersion === qr.answerVersion,
          auditedBy: brief(auditedBy),
          auditedAt: qr.auditedAt ?? null,
        }
      : null,
    question: await question(q, bundle ? bundle.answersByQuestion : null),
    report: rep,
    files: files.map(itemFile),
    evidences,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
  };
}

/** Participantes do ciclo: vínculos da empresa + designações do ciclo. */
async function reportDetail(r) {
  const byRole = async (role) =>
    (
      await db.all(
        `SELECT u.id, u.name FROM user_company_links l JOIN users u ON u.id = l.userId
          WHERE l.companyId = ? AND l.role = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL AND u.status = 'ACTIVE'
          ORDER BY u.name`,
        r.companyId,
        role,
      )
    ).map(plainPerson);
  const assigned = async (role) =>
    (
      await db.all(
        `SELECT u.id, u.name FROM cycle_professionals cp JOIN users u ON u.id = cp.userId
          WHERE cp.reportId = ? AND cp.role = ? AND cp.revokedAt IS NULL AND u.deletedAt IS NULL
          ORDER BY u.name`,
        r.id,
        role,
      )
    ).map(plainPerson);
  return {
    ...report(r),
    consultors: await byRole('CONSULTOR'),
    managers: await byRole('MANAGER'),
    facilitators: await byRole('EMPLOYEE'),
    // Auditor e supervisor do ciclo vêm da designação, não do simples vínculo.
    auditor: await assigned('AUDITOR'),
    supervisor: await assigned('SUPERVISOR'),
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
  itemFile,
  ITEM_FILE_COLUMNS,
};
