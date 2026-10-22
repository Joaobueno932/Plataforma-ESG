const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { authenticate } = require('../auth');
const authz = require('../authz');

const router = express.Router();
router.use('/admin', authenticate);

/**
 * Registros legados que precisam de revisão da Administração — nada foi inventado na
 * migração: vínculos de profissionais que no modelo antigo podiam ser trocados pelo próprio
 * usuário, empresas de demonstração e ciclos abertos com catálogo demonstrativo e sem
 * designação de auditoria aparecem aqui para conferência.
 */
router.get('/admin/review', authz.authorize('review.read'), (_req, res) => {
  const links = db.all(
    `SELECT l.id, l.userId, u.name AS userName, l.companyId, c.bussinessName, l.role, l.origin, l.grantedAt
       FROM user_company_links l JOIN users u ON u.id = l.userId JOIN companies c ON c.id = l.companyId
      WHERE l.needsReview = 1 AND l.revokedAt IS NULL ORDER BY u.name`,
  );
  const companies = db.all(
    'SELECT id, bussinessName, cnpj, origin, status FROM companies WHERE needsReview = 1 AND deletedAt IS NULL ORDER BY bussinessName',
  );
  const cycles = db.all(
    `SELECT r.id, r.companyId, c.bussinessName, r.cycle, r.status, r.catalogVersion, r.origin
       FROM reports r JOIN companies c ON c.id = r.companyId
      WHERE r.needsReview = 1 ORDER BY c.bussinessName, r.cycle`,
  );
  const cyclesWithoutProfessionals = db.all(
    `SELECT r.id, r.companyId, r.cycle, r.status FROM reports r
      WHERE r.status IN ('Auditing')
        AND NOT EXISTS (SELECT 1 FROM cycle_professionals cp WHERE cp.reportId = r.id AND cp.revokedAt IS NULL)`,
  );
  res.json({
    links,
    companies,
    cycles,
    cyclesWithoutProfessionals,
    migrations: db.all('SELECT id, appliedAt FROM schema_migrations ORDER BY id'),
    counts: {
      links: links.length,
      companies: companies.length,
      cycles: cycles.length,
      cyclesWithoutProfessionals: cyclesWithoutProfessionals.length,
    },
  });
});

/** Trilha de eventos (autoria das ações administrativas e de fluxo). */
router.get('/admin/events', authz.authorize('review.read'), (req, res) => {
  const entity = String(req.query.entity || '').trim();
  const entityId = String(req.query.entityId || '').trim();
  const where = [];
  const params = [];
  if (entity) {
    where.push('entity = ?');
    params.push(entity);
  }
  if (entityId) {
    where.push('entityId = ?');
    params.push(entityId);
  }
  const rows = db.all(
    `SELECT e.*, u.name AS actorName FROM audit_events e LEFT JOIN users u ON u.id = e.actorId
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY at DESC LIMIT 200`,
    ...params,
  );
  res.json(rows.map((r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null })));
});

/** Matriz de permissões efetivamente implementada (fonte: src/authz.js). */
router.get('/admin/permissions', authz.authorize('review.read'), (_req, res) => {
  res.json({
    roles: authz.ROLES,
    allowedAccumulation: authz.ALLOWED_ACCUMULATION,
    companyRoles: authz.COMPANY_ROLES,
    professionalRoles: authz.PROFESSIONAL_ROLES,
    openCycleStates: authz.OPEN_CYCLE_STATES,
    actions: Object.fromEntries(Object.entries(authz.ACTIONS).map(([k, v]) => [k, { roles: v.roles, scope: v.scope, requiresOpenCycle: !!v.requiresOpenCycle }])),
  });
});

module.exports = router;
