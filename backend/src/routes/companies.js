const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { paginate } = require('../pagination');
const { badRequest, notFound, conflict } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const v = require('../validators');
const { createCycleForCompany } = require('../services');

const router = express.Router();
router.use('/companies', authenticate);

const trim = (value) => String(value ?? '').trim();

/** Linha da listagem, no formato consumido pela interface. */
function listRow(c, progress) {
  const p = progress.get(c.id) || { status: 'Pending', answered: 0, total: 0 };
  return {
    id: c.id,
    bussinessName: c.bussinessName,
    legalName: c.legalName,
    cnpj: c.cnpj,
    size: c.size,
    section: c.section,
    status: c.status ?? 'ACTIVE',
    accessDate: c.accessDate,
    report: { status: p.status, _count: { answeredQuestions: p.answered, totalQuestions: p.total } },
  };
}

/**
 * Progresso real por empresa (respondidos × total), em duas consultas — a contagem anterior
 * devolvia o total como se fosse "respondidos" (diagnóstico A19).
 */
function progressByCompany(companyIds) {
  const result = new Map();
  if (!companyIds.length) return result;
  const marks = companyIds.map(() => '?').join(', ');
  const cycles = db.all(
    `SELECT r.id, r.companyId, r.status, r.cycle FROM reports r
      WHERE r.companyId IN (${marks})
        AND r.cycle = (SELECT max(cycle) FROM reports WHERE companyId = r.companyId)`,
    ...companyIds,
  );
  if (!cycles.length) return result;
  const counts = db.all(
    `SELECT reportId,
            count(*) AS total,
            sum(CASE WHEN selectedAnswerId IS NOT NULL OR nonApplicable = 1 THEN 1 ELSE 0 END) AS answered
       FROM question_reports WHERE reportId IN (${cycles.map(() => '?').join(', ')})
      GROUP BY reportId`,
    ...cycles.map((c) => c.id),
  );
  const byReport = new Map(counts.map((c) => [c.reportId, c]));
  for (const cycle of cycles) {
    const c = byReport.get(cycle.id) || { total: 0, answered: 0 };
    result.set(cycle.companyId, { status: cycle.status, answered: c.answered || 0, total: c.total || 0 });
  }
  return result;
}

const findCompany = (id) => {
  const c = db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', id);
  if (!c) throw notFound('company not found');
  return c;
};

/* ------------------------------------------------------------------ listagens */

/**
 * Administração enxerga a carteira completa; os demais perfis enxergam **apenas** as empresas
 * com vínculo vigente (a lista aberta a consultor/auditor era parte da brecha A8).
 */
router.get('/companies', (req, res) => {
  const scope = authz.visibleCompanyIds(req.principal);
  if (scope && !scope.length) return res.json(paginate(req, [], { defaultPerPage: 5, basePath: '/companies' }));
  const term = trim(req.query.bussinessName || req.query.q).toLowerCase();
  const size = trim(req.query.size);
  const section = trim(req.query.section);
  const status = trim(req.query.status).toUpperCase();

  const where = ['deletedAt IS NULL'];
  const params = [];
  if (scope) {
    where.push(`id IN (${scope.map(() => '?').join(', ')})`);
    params.push(...scope);
  }
  if (term) {
    where.push('(lower(bussinessName) LIKE ? OR lower(legalName) LIKE ? OR cnpj LIKE ?)');
    params.push(`%${term}%`, `%${term}%`, `%${v.onlyDigits(term) || term}%`);
  }
  if (size) {
    where.push('size = ?');
    params.push(size);
  }
  if (section) {
    where.push('section = ?');
    params.push(section);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const rows = db.all(`SELECT * FROM companies WHERE ${where.join(' AND ')} ORDER BY createdAt DESC`, ...params);
  const progress = progressByCompany(rows.map((r) => r.id));
  const data = rows.map((c) => listRow(c, progress));
  if (req.query.nonPaginate === 'true')
    return res.json({ ...paginate(req, data, { defaultPerPage: data.length || 1, basePath: '/companies' }), data });
  res.json(paginate(req, data, { defaultPerPage: 5, basePath: '/companies' }));
});

/** Empresas selecionáveis como contexto (somente vínculos vigentes; Administração: todas). */
router.get('/companies/light/all', (req, res) => {
  const scope = authz.visibleCompanyIds(req.principal);
  if (!scope)
    return res.json(db.all('SELECT id, legalName, bussinessName FROM companies WHERE deletedAt IS NULL ORDER BY bussinessName'));
  if (!scope.length) return res.json([]);
  res.json(
    db.all(
      `SELECT id, legalName, bussinessName FROM companies
        WHERE deletedAt IS NULL AND id IN (${scope.map(() => '?').join(', ')}) ORDER BY bussinessName`,
      ...scope,
    ),
  );
});

/** GED da empresa em contexto. */
router.get('/companies/get/files', (req, res) => {
  const companyId = trim(req.query.companyId) || req.context.companyId;
  authz.assertCompanyScope(req, companyId, 'cycle.ged.read');
  res.json(
    db.all(
      'SELECT id, companyId, name, url, fileType, createdAt FROM company_files WHERE companyId = ? AND inGed = 1 ORDER BY name',
      companyId,
    ),
  );
});

router.get('/companies/:id', (req, res) => {
  const c = findCompany(req.params.id);
  const role = authz.assertCompanyScope(req, c.id, 'company.read');
  const out = ser.company(c, { withReport: true, withCycles: true });
  const progress = progressByCompany([c.id]).get(c.id);
  if (out.report && progress) out.report._count = { answeredQuestions: progress.answered, totalQuestions: progress.total };
  // A relação de pessoas da empresa não é aberta ao colaborador.
  const canSeePeople = authz.can(req.principal, 'company.users.read', { companyId: c.id }).ok;
  out.users = canSeePeople
    ? db
        .all(
          `SELECT DISTINCT u.id, u.name, u.email, u.jobTitle, u.status, l.role
             FROM user_company_links l JOIN users u ON u.id = l.userId
            WHERE l.companyId = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL ORDER BY u.name`,
          c.id,
        )
        .map((u) => ({ ...u, companyId: c.id }))
    : [];
  out.viewerRole = role;
  res.json(out);
});

/* ------------------------------------------------------------------ cadastro */

router.post('/companies', authz.authorize('companies.manage'), (req, res) => {
  const b = req.body || {};
  for (const field of ['legalName', 'bussinessName', 'email', 'cnpj', 'accessDate', 'size', 'section'])
    if (!b[field]) throw badRequest(`o campo ${field} é obrigatório`);
  if (!v.COMPANY_SIZES.includes(b.size)) throw badRequest('porte inválido');
  if (!v.isValidEmail(b.email)) throw badRequest('informe um e-mail válido');
  const cnpj = v.onlyDigits(b.cnpj);
  if (!v.isValidCnpj(cnpj)) throw badRequest('CNPJ inválido: confira os 14 dígitos e os dígitos verificadores');
  if (!db.one('SELECT section FROM sectors WHERE section = ? AND section <> ?', b.section, 'All'))
    throw badRequest('caderno setorial inválido');
  const duplicated = db.one('SELECT id, bussinessName FROM companies WHERE cnpj = ? AND deletedAt IS NULL', cnpj);
  if (duplicated) throw conflict(`já existe uma empresa com esse CNPJ (${duplicated.bussinessName}); edite o cadastro existente`);

  const id = db.uuid();
  db.transaction(() => {
    const at = db.now();
    db.run(
      `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, avatar, access, reportAccess, status, origin, createdById, updatedById, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'ACTIVE', 'registered', ?, ?, ?, ?)`,
      id,
      trim(b.bussinessName),
      trim(b.legalName),
      v.normalizeEmail(b.email),
      cnpj,
      new Date(b.accessDate).toISOString(),
      b.size,
      b.section,
      b.avatar || null,
      req.principal.user.id,
      req.principal.user.id,
      at,
      at,
    );
    createCycleForCompany(db.one('SELECT * FROM companies WHERE id = ?', id), { createdById: req.principal.user.id });
  });
  authz.audit(req, 'company.create', { entity: 'companies', entityId: id, companyId: id, details: { section: b.section, size: b.size } });
  res.status(201).json(ser.company(findCompany(id), { withReport: true, withCycles: true }));
});

router.patch('/companies/:id', authz.authorize('companies.manage'), (req, res) => {
  const c = findCompany(req.params.id);
  const b = req.body || {};
  const patch = {};
  for (const field of ['bussinessName', 'legalName', 'avatar'])
    if (b[field] !== undefined) patch[field] = b[field] === '' && field === 'avatar' ? null : trim(b[field]) || null;
  if (b.email !== undefined) {
    if (!v.isValidEmail(b.email)) throw badRequest('informe um e-mail válido');
    patch.email = v.normalizeEmail(b.email);
  }
  if (b.cnpj !== undefined && b.cnpj !== '') {
    const cnpj = v.onlyDigits(b.cnpj);
    if (!v.isValidCnpj(cnpj)) throw badRequest('CNPJ inválido: confira os 14 dígitos e os dígitos verificadores');
    const other = db.one('SELECT id FROM companies WHERE cnpj = ? AND deletedAt IS NULL', cnpj);
    if (other && other.id !== c.id) throw conflict('já existe uma empresa com esse CNPJ; edite o cadastro existente');
    patch.cnpj = cnpj;
  }
  if (b.size !== undefined) {
    if (!v.COMPANY_SIZES.includes(b.size)) throw badRequest('porte inválido');
    patch.size = b.size;
  }
  if (b.section !== undefined && b.section !== c.section) {
    if (!db.one('SELECT section FROM sectors WHERE section = ? AND section <> ?', b.section, 'All'))
      throw badRequest('caderno setorial inválido');
    // Troca de caderno vale para a próxima avaliação: ciclos existentes mantêm o seu caderno.
    patch.section = b.section;
  }
  if (b.accessDate !== undefined) patch.accessDate = new Date(b.accessDate).toISOString();
  if (b.access !== undefined) patch.access = b.access ? 1 : 0;
  if (b.status !== undefined) {
    const status = String(b.status).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw badRequest('situação cadastral inválida');
    patch.status = status;
    patch.statusChangedAt = db.now();
    patch.statusChangedById = req.principal.user.id;
  }

  const keys = Object.keys(patch);
  if (keys.length) {
    patch.updatedById = req.principal.user.id;
    const fields = Object.keys(patch);
    db.run(
      `UPDATE companies SET ${fields.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
      ...fields.map((k) => patch[k]),
      db.now(),
      c.id,
    );
    authz.audit(req, 'company.update', {
      entity: 'companies',
      entityId: c.id,
      companyId: c.id,
      details: { fields: keys, before: Object.fromEntries(keys.map((k) => [k, c[k] ?? null])), after: Object.fromEntries(keys.map((k) => [k, patch[k]])) },
    });
  }
  res.json(ser.company(findCompany(c.id), { withReport: true, withCycles: true }));
});

/**
 * Inativação cadastral. Não há exclusão: avaliações, arquivos, vínculos e autoria permanecem
 * (as chaves estrangeiras passaram a RESTRICT justamente para impedir perda de histórico).
 */
router.delete('/companies/:id', authz.authorize('companies.manage'), (req, res) => {
  const c = findCompany(req.params.id);
  db.run(
    "UPDATE companies SET status = 'INACTIVE', access = 0, statusChangedAt = ?, statusChangedById = ?, updatedAt = ? WHERE id = ?",
    db.now(),
    req.principal.user.id,
    db.now(),
    c.id,
  );
  db.run(
    `UPDATE sessions SET revokedAt = ?, revokedReason = 'company-inactivated'
      WHERE revokedAt IS NULL AND userId IN (
        SELECT userId FROM user_company_links WHERE companyId = ? AND revokedAt IS NULL AND role IN ('MANAGER', 'EMPLOYEE'))`,
    db.now(),
    c.id,
  );
  authz.audit(req, 'company.inactivate', { entity: 'companies', entityId: c.id, companyId: c.id });
  res.json({ id: c.id, deleted: true, inactivated: true });
});

module.exports = router;
