/**
 * Autorização centralizada.
 *
 * Toda ação é verificada no servidor contra: usuário ativo, perfil concedido, vínculo vigente
 * com a empresa, designação no ciclo (auditor/supervisor), atribuição do indicador
 * (colaborador) e estado do processo. Ocultar menu ou botão não autoriza nada.
 *
 * A autorização devolve a **função efetivamente exercida** (`role`), que é registrada na
 * autoria das ações: quem acumula ADMIN + CONSULTOR age como consultor nos vínculos
 * autorizados, e o perfil ADMIN isolado nunca recebe permissão de aprovação.
 */
const db = require('./db');
const { forbidden, notFound, badRequest, conflict } = require('./http');

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR'];
/** Usuário da empresa: uma empresa no escopo inicial (especificação § 5). */
const COMPANY_ROLES = ['MANAGER', 'EMPLOYEE'];
/** Profissionais: várias empresas autorizadas, vínculos editáveis pela Administração. */
const PROFESSIONAL_ROLES = ['CONSULTOR', 'AUDITOR', 'SUPERVISOR'];
/** Único acúmulo permitido. Qualquer outra combinação é bloqueada, inclusive entre empresas. */
const ALLOWED_ACCUMULATION = ['ADMIN', 'CONSULTOR'];
/** Papéis que exigem designação no ciclo, além do vínculo com a empresa. */
const CYCLE_ASSIGNED_ROLES = ['AUDITOR', 'SUPERVISOR'];

/** Estados do ciclo em que a empresa pode responder/anexar (bloqueio após o envio). */
const OPEN_CYCLE_STATES = ['Pending'];

/**
 * Matriz de permissões. `roles` está em ordem de precedência: a primeira função que o
 * principal exercer com escopo válido é a função efetivamente exercida.
 *
 * scope:
 *   'global'  → só perfil (Administração tem alcance global aprovado);
 *   'company' → exige vínculo vigente com a empresa (ADMIN dispensa, por alcance global);
 *   'cycle'   → exige, além do vínculo, designação vigente no ciclo para auditor/supervisor.
 */
const ACTIONS = {
  // Cadastros e configuração — somente Administração FIEMS.
  'users.read': { roles: ['ADMIN'], scope: 'global' },
  'users.manage': { roles: ['ADMIN'], scope: 'global' },
  'users.profiles.manage': { roles: ['ADMIN'], scope: 'global' },
  'users.links.manage': { roles: ['ADMIN'], scope: 'global' },
  'companies.read.all': { roles: ['ADMIN'], scope: 'global' },
  'companies.manage': { roles: ['ADMIN'], scope: 'global' },
  'catalog.manage': { roles: ['ADMIN'], scope: 'global' },
  'leads.read': { roles: ['ADMIN'], scope: 'global' },
  'review.read': { roles: ['ADMIN'], scope: 'global' },

  // Leitura por empresa.
  'company.read': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR', 'ADMIN'], scope: 'company' },
  'company.users.read': { roles: ['MANAGER', 'CONSULTOR', 'ADMIN'], scope: 'company' },
  'cycle.read': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'], scope: 'company' },
  'cycle.read.professional': { roles: ['AUDITOR', 'SUPERVISOR'], scope: 'cycle' },
  'cycle.export': { roles: ['MANAGER', 'CONSULTOR', 'ADMIN'], scope: 'company' },

  // Preenchimento pela empresa (consultor e administração atuam com autoria registrada).
  'cycle.answer': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'], scope: 'company', requiresOpenCycle: true },
  'cycle.attach': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'], scope: 'company', requiresOpenCycle: true },
  'cycle.remind': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'], scope: 'company' },
  'cycle.ged.read': { roles: ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'], scope: 'company' },

  // Delegação de indicador e prazo: gestor da empresa; Administração apenas operacional.
  'item.assign': { roles: ['MANAGER', 'ADMIN'], scope: 'company' },

  // Validação interna (herdada do sistema antigo, mantida sem ampliação).
  'cycle.validate': { roles: ['MANAGER', 'CONSULTOR'], scope: 'company' },

  // Auditoria: solicitar (gestor) é diferente de liberar o processo (Administração FIEMS).
  'cycle.requestAudit': { roles: ['MANAGER'], scope: 'company' },
  'cycle.releaseAudit': { roles: ['ADMIN'], scope: 'global' },
  'cycle.assignProfessionals': { roles: ['ADMIN'], scope: 'global' },
  'cycle.return': { roles: ['CONSULTOR', 'ADMIN'], scope: 'company' },
  'cycle.requestReturn': { roles: ['MANAGER'], scope: 'company' },

  // Trabalho técnico: só o auditor designado. Supervisor consulta e aprova.
  'audit.evaluate': { roles: ['AUDITOR'], scope: 'cycle' },
  'audit.applicability': { roles: ['AUDITOR'], scope: 'cycle' },
  'audit.conclude': { roles: ['AUDITOR'], scope: 'cycle' },
  'supervision.approve': { roles: ['SUPERVISOR'], scope: 'cycle' },
};

/* ------------------------------------------------------------------ principal */

async function activeProfiles(userId) {
  return (await db.all('SELECT role FROM user_profiles WHERE userId = ? AND revokedAt IS NULL', userId)).map((r) => r.role);
}

async function activeLinks(userId) {
  return await db.all(
    `SELECT l.id, l.companyId, l.role, l.needsReview, c.bussinessName, c.legalName, c.status
       FROM user_company_links l
       JOIN companies c ON c.id = l.companyId
      WHERE l.userId = ? AND l.revokedAt IS NULL AND c.deletedAt IS NULL
      ORDER BY c.bussinessName`,
    userId,
  );
}

/** Principal = identidade + perfis concedidos + vínculos vigentes. Nada vem do token. */
async function loadPrincipal(userId) {
  const user = await db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', userId);
  if (!user || user.status !== 'ACTIVE') return null;
  const roles = await activeProfiles(user.id);
  if (!roles.length) return null;
  const links = await activeLinks(user.id);
  return {
    user,
    roles,
    links,
    isAdmin: roles.includes('ADMIN'),
    rolesIn(companyId) {
      const own = links.filter((l) => l.companyId === companyId).map((l) => l.role);
      return roles.includes('ADMIN') ? [...own, 'ADMIN'] : own;
    },
    linkedTo(companyId) {
      return links.some((l) => l.companyId === companyId);
    },
  };
}

/** Empresa em contexto: vínculo escolhido na sessão, ou o único vínculo existente. */
function resolveContextCompany(principal, session) {
  const selected = session && session.selectedCompanyId;
  if (selected && principal.linkedTo(selected)) return selected;
  const companyRole = principal.links.filter((l) => COMPANY_ROLES.includes(l.role));
  if (companyRole.length === 1) return companyRole[0].companyId;
  if (principal.links.length === 1) return principal.links[0].companyId;
  return null;
}

/* ------------------------------------------------------------------ decisão */

const assignmentOf = async (reportId, userId, role) => db.one(
    'SELECT id FROM cycle_professionals WHERE reportId = ? AND userId = ? AND role = ? AND revokedAt IS NULL',
    reportId,
    userId,
    role,
  );

/**
 * @returns {{ok: true, role: string} | {ok: false, reason: string}}
 */
async function can(principal, action, ctx = {}) {
  const spec = ACTIONS[action];
  if (!spec) throw new Error(`ação desconhecida na matriz de autorização: ${action}`);
  if (!principal) return { ok: false, reason: 'sessão inválida' };

  const candidates = spec.roles.filter((role) => principal.roles.includes(role));
  if (!candidates.length) return { ok: false, reason: 'perfil não autorizado para esta ação' };

  if (spec.scope === 'global') {
    const role = candidates.find((r) => r === 'ADMIN') || candidates[0];
    return { ok: true, role };
  }

  const companyId = ctx.companyId;
  if (!companyId) return { ok: false, reason: 'empresa não identificada' };

  for (const role of candidates) {
    // Alcance global da Administração: dispensa vínculo, mas nunca autoriza aprovação técnica
    // (as ações técnicas não listam ADMIN na matriz).
    const scoped = role === 'ADMIN' ? true : principal.links.some((l) => l.companyId === companyId && l.role === role);
    if (!scoped) continue;
    if (spec.scope === 'cycle' && CYCLE_ASSIGNED_ROLES.includes(role)) {
      if (!ctx.reportId) return { ok: false, reason: 'ciclo não identificado' };
      if (!(await assignmentOf(ctx.reportId, principal.user.id, role))) continue;
    }
    return { ok: true, role };
  }
  return { ok: false, reason: 'sem vínculo vigente ou designação para esta empresa/ciclo' };
}

/** Lança 403 quando a ação não é permitida; devolve a função efetivamente exercida. */
async function assertCan(req, action, ctx = {}) {
  const decision = await can(req.principal, action, ctx);
  if (!decision.ok) throw forbidden(decision.reason);
  req.actorRole = decision.role;
  return decision.role;
}

/** Middleware para rotas cujo contexto não depende do corpo/parâmetros da requisição. */
const authorize = (action, resolve) => async (req, _res, next) => {
  try {
    await assertCan(req, action, resolve ? resolve(req) : {});
    next();
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ escopos de leitura */

/** Empresas que o principal pode enxergar (Administração: todas). */
function visibleCompanyIds(principal) {
  if (principal.isAdmin) return null; // null = sem restrição
  return [...new Set(principal.links.map((l) => l.companyId))];
}

async function assertCompanyScope(req, companyId, action = 'company.read') {
  if (!companyId) throw badRequest('empresa não identificada');
  const company = await db.one('SELECT id, deletedAt FROM companies WHERE id = ?', companyId);
  if (!company || company.deletedAt) throw notFound('company not found');
  return assertCan(req, action, { companyId });
}

/**
 * Colaborador vê e responde somente os indicadores atribuídos a ele — inclusive por id direto,
 * arquivo e exportação. Indicador sem responsável não concede acesso implícito.
 */
function assertItemScope(req, questionReport, { write = false } = {}) {
  const role = req.actorRole;
  if (role !== 'EMPLOYEE') return;
  if (!questionReport.answererId || questionReport.answererId !== req.principal.user.id)
    throw forbidden(
      write ? 'este indicador não está atribuído a você' : 'você só tem acesso aos indicadores atribuídos a você',
    );
}

const isOpenCycle = (report) => OPEN_CYCLE_STATES.includes(report.status);

/* ------------------------------------------------------------------ perfis e vínculos */

/** Regra de acúmulo: um perfil livre, ou exatamente ADMIN + CONSULTOR. */
function assertAccumulation(roles) {
  const unique = [...new Set(roles)];
  for (const role of unique) if (!ROLES.includes(role)) throw badRequest(`função inválida: ${role}`);
  if (unique.length <= 1) return unique;
  if (unique.length === 2 && unique.every((r) => ALLOWED_ACCUMULATION.includes(r))) return unique;
  throw conflict(
    `acúmulo de perfis não permitido (${unique.sort().join(' + ')}); o único acúmulo autorizado é ADMIN + CONSULTOR`,
  );
}

/** Não é permitido inativar/remover o último administrador ativo sem substituto. */
async function assertNotLastActiveAdmin(userId) {
  const admins = await db.all(
    `SELECT u.id FROM users u
       JOIN user_profiles p ON p.userId = u.id AND p.role = 'ADMIN' AND p.revokedAt IS NULL
      WHERE u.deletedAt IS NULL AND u.status = 'ACTIVE'`,
  );
  if (admins.length <= 1 && admins.some((a) => a.id === userId))
    throw conflict('não é possível desativar ou remover o último administrador ativo sem substituto');
}

/* ------------------------------------------------------------------ trilha */

async function audit(req, action, { entity = null, entityId = null, companyId = null, details = null } = {}) {
  await db.run(
    'INSERT INTO audit_events (id, at, actorId, actorRole, action, entity, entityId, companyId, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    db.uuid(),
    db.now(),
    req.principal ? req.principal.user.id : null,
    req.actorRole || null,
    action,
    entity,
    entityId,
    companyId,
    details ? JSON.stringify(details) : null,
  );
}

module.exports = {
  ROLES,
  COMPANY_ROLES,
  PROFESSIONAL_ROLES,
  ALLOWED_ACCUMULATION,
  CYCLE_ASSIGNED_ROLES,
  OPEN_CYCLE_STATES,
  ACTIONS,
  loadPrincipal,
  resolveContextCompany,
  activeProfiles,
  activeLinks,
  can,
  assertCan,
  authorize,
  visibleCompanyIds,
  assertCompanyScope,
  assertItemScope,
  isOpenCycle,
  assertAccumulation,
  assertNotLastActiveAdmin,
  audit,
};
