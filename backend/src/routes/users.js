const express = require('express');
const multer = require('multer');
const config = require('../config');
const images = require('../images');
const { filterPeople, sortPeople } = require('../people');
const passwords = require('../password');
const db = require('../db');
const ser = require('../serializers');
const { paginate } = require('../pagination');
const { wrap, badRequest, forbidden, notFound, conflict, asyncRouter } = require('../http');
const { authenticate, revokeUserSessions } = require('../auth');
const authz = require('../authz');
const limiter = require('../ratelimit');

const router = asyncRouter();
router.use('/users', authenticate);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits = (v) => (v == null ? v : String(v).replace(/\D+/g, ''));
const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
const trim = (v) => String(v ?? '').trim();

async function assertEmail(email, exceptId = null) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) throw badRequest('informe um e-mail válido');
  const existing = await db.one('SELECT id FROM users WHERE lower(email) = ? AND deletedAt IS NULL', normalized);
  if (existing && existing.id !== exceptId) throw conflict('já existe um usuário com esse e-mail');
  return normalized;
}

const findUser = async (id) => {
  const u = await db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', id);
  if (!u) throw notFound('user not found');
  return u;
};

async function assertCompanyExists(companyId) {
  const c = await db.one('SELECT id, status FROM companies WHERE id = ? AND deletedAt IS NULL', companyId);
  if (!c) throw notFound('company not found');
  return c;
}

/** Perfis concedidos ao usuário (um deles deve amparar cada vínculo). */
const grantedRoles = async (userId) => authz.activeProfiles(userId);

async function grantProfiles(req, userId, roles) {
  const unique = authz.assertAccumulation(roles);
  const current = await grantedRoles(userId);
  for (const role of current.filter((r) => !unique.includes(r))) {
    await db.run('UPDATE user_profiles SET revokedAt = ?, revokedById = ? WHERE userId = ? AND role = ? AND revokedAt IS NULL', db.now(), req.principal.user.id, userId, role);
    // Vínculos daquele papel deixam de ter amparo.
    await db.run('UPDATE user_company_links SET revokedAt = ?, revokedById = ? WHERE userId = ? AND role = ? AND revokedAt IS NULL', db.now(), req.principal.user.id, userId, role);
  }
  for (const role of unique) {
    const existing = await db.one('SELECT id, revokedAt FROM user_profiles WHERE userId = ? AND role = ?', userId, role);
    if (!existing)
      await db.run('INSERT INTO user_profiles (id, userId, role, grantedAt, grantedById, origin) VALUES (?, ?, ?, ?, ?, ?)', db.uuid(), userId, role, db.now(), req.principal.user.id, 'admin');
    else if (existing.revokedAt)
      await db.run('UPDATE user_profiles SET revokedAt = NULL, revokedById = NULL, grantedAt = ?, grantedById = ? WHERE id = ?', db.now(), req.principal.user.id, existing.id);
  }
  return unique;
}

async function grantLink(req, userId, companyId, role) {
  await assertCompanyExists(companyId);
  if (!(await grantedRoles(userId)).includes(role)) throw badRequest(`o usuário não possui o perfil ${role} concedido`);
  if (authz.COMPANY_ROLES.includes(role)) {
    const others = await db.all(
      `SELECT id, companyId FROM user_company_links
        WHERE userId = ? AND revokedAt IS NULL AND role IN ('MANAGER', 'EMPLOYEE') AND companyId <> ?`,
      userId,
      companyId,
    );
    if (others.length)
      throw conflict('usuário da empresa tem uma única empresa no escopo inicial; remova o vínculo anterior antes');
  }
  const existing = await db.one('SELECT id, revokedAt FROM user_company_links WHERE userId = ? AND companyId = ? AND role = ?', userId, companyId, role);
  if (existing && !existing.revokedAt) return existing.id;
  if (existing) {
    await db.run('UPDATE user_company_links SET revokedAt = NULL, revokedById = NULL, grantedAt = ?, grantedById = ?, needsReview = 0 WHERE id = ?', db.now(), req.principal.user.id, existing.id);
    return existing.id;
  }
  const id = db.uuid();
  await db.run(
    'INSERT INTO user_company_links (id, userId, companyId, role, grantedAt, grantedById, origin, needsReview) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    id,
    userId,
    companyId,
    role,
    db.now(),
    req.principal.user.id,
    'admin',
  );
  return id;
}

/* ------------------------------------------------------------------ listagens */

router.get('/users', authz.authorize('users.read'), async (req, res) => {
  // Busca por nome, e-mail ou função, filtros e ordenação: `people.js` (mesmas regras da Equipe).
  const rows = await db.all('SELECT * FROM users WHERE deletedAt IS NULL');
  const found = sortPeople(filterPeople(rows, req.query), req.query, { sort: 'createdAt', dir: 'desc' });
  // Pagina antes de serializar: cada pessoa custa algumas consultas (perfis, vínculos, empresa),
  // e serializar a base inteira para devolver 5 linhas esgotava o pool de conexões (503 sob carga).
  const result = paginate(req, found, { defaultPerPage: 5, basePath: '/users', withTotals: true });
  result.data = await Promise.all(result.data.map((u) => ser.userWithProfiles(u)));
  res.json(result);
});

/**
 * Pessoas da empresa em contexto — usada pelo gestor para delegar indicadores.
 * Projeção reduzida: identificação e função, sem CPF nem dados pessoais acessórios.
 */
router.get('/users/getUsers/company', async (req, res) => {
  const companyId = trim(req.query.companyId) || req.context.companyId;
  await authz.assertCompanyScope(req, companyId, 'company.users.read');
  // `createdAt` e `avatar` fazem parte da projeção: a tela Equipe mostra a data de cadastro e a
  // foto (antes a data não vinha e a interface exibia "undefined NaN, NaN").
  const rows = (
    await db.all(
      `SELECT DISTINCT u.id, u.name, u.email, u.jobTitle, u.status, u.avatar, u.createdAt, l.role
         FROM user_company_links l JOIN users u ON u.id = l.userId
        WHERE l.companyId = ? AND l.revokedAt IS NULL AND u.deletedAt IS NULL`,
      companyId,
    )
  ).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    jobTitle: u.jobTitle ?? null,
    status: u.status,
    avatar: u.avatar ?? null,
    createdAt: u.createdAt ?? null,
    role: u.role,
    companyId,
  }));
  const found = sortPeople(filterPeople(rows, req.query), req.query, { sort: 'name', dir: 'asc' });
  res.json(paginate(req, found, { defaultPerPage: 50, basePath: '/users/getUsers/company', withTotals: true }));
});

router.get('/users/:id', async (req, res) => {
  const target = await findUser(req.params.id);
  if (target.id !== req.principal.user.id) await authz.assertCan(req, 'users.read');
  res.json(await ser.userWithProfiles(target));
});

/* ------------------------------------------------------------------ cadastro */

router.post(
  '/users',
  authz.authorize('users.manage'),
  wrap(async (req, res) => {
    const body = req.body || {};
    const name = trim(body.name);
    const password = String(body.password || '');
    const roles = Array.isArray(body.roles) && body.roles.length ? body.roles : body.role ? [body.role] : [];
    const companyIds = Array.isArray(body.companyIds)
      ? body.companyIds
      : body.companyId
        ? [body.companyId]
        : [];

    if (!name || !body.email || !password || !roles.length) throw badRequest('nome, e-mail, senha e perfil são obrigatórios');
    if (password.length < 8) throw badRequest('a senha deve ter no mínimo 8 caracteres');
    const email = await assertEmail(body.email);
    const unique = authz.assertAccumulation(roles);

    const needsCompany = unique.filter((r) => r !== 'ADMIN');
    if (needsCompany.length && !companyIds.length) throw badRequest('selecione ao menos uma empresa para os perfis informados');
    const companyRoles = unique.filter((r) => authz.COMPANY_ROLES.includes(r));
    if (companyRoles.length && companyIds.length > 1)
      throw badRequest('usuário da empresa tem uma única empresa no escopo inicial');

    const id = db.uuid();
    const at = db.now();
    await db.transaction(async () => {
      await db.run(
        `INSERT INTO users (id, name, email, password, cpf, jobTitle, role, companyId, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
        id,
        name,
        email,
        await passwords.hash(password), // nativo e assíncrono: não trava o event loop
        digits(body.cpf) || null,
        trim(body.jobTitle) || null,
        ser.primaryRole(unique),
        companyRoles.length ? companyIds[0] : null,
        at,
        at,
      );
      await grantProfiles(req, id, unique);
      for (const role of needsCompany) for (const companyId of companyIds) await grantLink(req, id, companyId, role);
    });
    await authz.audit(req, 'user.create', { entity: 'users', entityId: id, details: { roles: unique, companies: companyIds.length } });
    res.status(201).json(await ser.userWithProfiles(await findUser(id)));
  }),
);

/* ---------------------------------------------- perfis e vínculos (Administração) */

router.put('/users/:id/profiles', authz.authorize('users.profiles.manage'), async (req, res) => {
  const target = await findUser(req.params.id);
  const roles = Array.isArray((req.body || {}).roles) ? req.body.roles : [];
  if (!roles.length) throw badRequest('informe ao menos um perfil');
  const before = await grantedRoles(target.id);
  if (before.includes('ADMIN') && !roles.includes('ADMIN')) await authz.assertNotLastActiveAdmin(target.id);
  await db.transaction(async () => {
    const unique = await grantProfiles(req, target.id, roles);
    await db.run('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?', ser.primaryRole(unique), db.now(), target.id);
  });
  await revokeUserSessions(target.id, 'profiles-changed');
  await authz.audit(req, 'user.profiles', { entity: 'users', entityId: target.id, details: { before, after: await grantedRoles(target.id) } });
  res.json(await ser.userWithProfiles(await findUser(target.id)));
});

router.post('/users/:id/links', authz.authorize('users.links.manage'), async (req, res) => {
  const target = await findUser(req.params.id);
  const { companyId, role } = req.body || {};
  if (!companyId || !role) throw badRequest('informe empresa e perfil do vínculo');
  let linkId;
  await db.transaction(async () => {
    linkId = await grantLink(req, target.id, companyId, role);
    if (authz.COMPANY_ROLES.includes(role)) await db.run('UPDATE users SET companyId = ?, updatedAt = ? WHERE id = ?', companyId, db.now(), target.id);
  });
  await revokeUserSessions(target.id, 'links-changed');
  await authz.audit(req, 'user.link.grant', { entity: 'user_company_links', entityId: linkId, companyId, details: { userId: target.id, role } });
  res.status(201).json(await ser.userWithProfiles(await findUser(target.id)));
});

router.delete('/users/:id/links/:linkId', authz.authorize('users.links.manage'), async (req, res) => {
  const target = await findUser(req.params.id);
  const link = await db.one('SELECT * FROM user_company_links WHERE id = ? AND userId = ?', req.params.linkId, target.id);
  if (!link) throw notFound('vínculo não encontrado');
  await db.transaction(async () => {
    await db.run('UPDATE user_company_links SET revokedAt = ?, revokedById = ? WHERE id = ? AND revokedAt IS NULL', db.now(), req.principal.user.id, link.id);
    // Designações de ciclo dependem do vínculo: caem com ele.
    await db.run(
      `UPDATE cycle_professionals SET revokedAt = ?, revokedById = ?
        WHERE userId = ? AND role = ? AND revokedAt IS NULL
          AND reportId IN (SELECT id FROM reports WHERE companyId = ?)`,
      db.now(),
      req.principal.user.id,
      target.id,
      link.role,
      link.companyId,
    );
    if (authz.COMPANY_ROLES.includes(link.role) && target.companyId === link.companyId)
      await db.run('UPDATE users SET companyId = NULL, updatedAt = ? WHERE id = ?', db.now(), target.id);
  });
  await revokeUserSessions(target.id, 'link-revoked');
  await authz.audit(req, 'user.link.revoke', { entity: 'user_company_links', entityId: link.id, companyId: link.companyId, details: { userId: target.id, role: link.role } });
  res.json({ id: link.id, revoked: true });
});

/**
 * Rota herdada. A troca de empresa deixou de ser autoatendimento: só a Administração move o
 * vínculo. O profissional troca de **contexto** em PATCH /auth/context, entre vínculos vigentes.
 */
router.patch('/users/changeCompany/:id', async (req, res) => {
  if (req.principal.user.id === req.params.id && !req.principal.isAdmin)
    throw forbidden('a troca de empresa não é autoatendimento; selecione um vínculo vigente em /auth/context');
  await authz.assertCan(req, 'users.links.manage');
  const target = await findUser(req.params.id);
  const companyId = (req.body || {}).companyId;
  if (!companyId) throw badRequest('selecione uma empresa');
  const roles = (await grantedRoles(target.id)).filter((r) => r !== 'ADMIN');
  if (!roles.length) throw badRequest('o usuário não possui perfil que dependa de vínculo');
  await db.transaction(async () => {
    for (const role of roles) {
      if (authz.COMPANY_ROLES.includes(role))
        await db.run('UPDATE user_company_links SET revokedAt = ?, revokedById = ? WHERE userId = ? AND role = ? AND revokedAt IS NULL', db.now(), req.principal.user.id, target.id, role);
      await grantLink(req, target.id, companyId, role);
    }
    await db.run('UPDATE users SET companyId = ?, updatedAt = ? WHERE id = ?', companyId, db.now(), target.id);
  });
  await revokeUserSessions(target.id, 'links-changed');
  await authz.audit(req, 'user.link.move', { entity: 'users', entityId: target.id, companyId });
  res.json(await ser.userWithProfiles(await findUser(target.id)));
});

/* ------------------------------------------------------------------ edição */

router.patch(
  '/users/:id',
  wrap(async (req, res) => {
    const target = await findUser(req.params.id);
    const isSelf = req.principal.user.id === target.id;
    const isAdmin = req.principal.isAdmin;
    if (!isAdmin && !isSelf) throw forbidden('você não tem permissão para editar este usuário');
    if (isAdmin && !isSelf) await authz.assertCan(req, 'users.manage');
    else req.actorRole = ser.primaryRole(req.principal.roles);

    const body = req.body || {};
    const patch = {};
    const changes = {};
    if (body.name !== undefined) patch.name = trim(body.name);
    if (body.email !== undefined && normalizeEmail(body.email) !== normalizeEmail(target.email)) {
      if (!isAdmin) throw forbidden('a alteração de e-mail é feita pela Administração');
      patch.email = await assertEmail(body.email, target.id);
      changes.email = { before: target.email, after: patch.email };
    }
    if (body.cpf !== undefined) patch.cpf = digits(body.cpf) || null;
    if (body.jobTitle !== undefined) patch.jobTitle = trim(body.jobTitle) || null;
    // Foto: só pela rota de envio (validada e gravada pelo servidor). Aqui apenas a remoção
    // (null) ou o mesmo valor atual são aceitos — nada de URL arbitrária no perfil.
    if (body.avatar !== undefined && (body.avatar || null) !== (target.avatar ?? null)) {
      if (body.avatar) throw badRequest('envie a foto por POST /users/:id/avatar');
      patch.avatar = null;
    }

    if (body.password) {
      if (String(body.password).length < 8) throw badRequest('a senha deve ter no mínimo 8 caracteres');
      if (isSelf) {
        const current = String(body.currentPassword || '');
        if (!current || !(await passwords.compare(current, target.password))) throw badRequest('informe a senha atual para trocar a senha');
      }
      patch.password = await passwords.hash(body.password);
    }

    // Perfil e vínculo não se alteram por aqui (nem por autodeclaração).
    if (body.role !== undefined || body.roles !== undefined) {
      if (!isAdmin) throw forbidden('apenas a Administração altera perfis');
      const roles = Array.isArray(body.roles) ? body.roles : [body.role];
      if (roles.filter(Boolean).length) {
        const before = await grantedRoles(target.id);
        if (before.includes('ADMIN') && !roles.includes('ADMIN')) await authz.assertNotLastActiveAdmin(target.id);
        const unique = await grantProfiles(req, target.id, roles.filter(Boolean));
        patch.role = ser.primaryRole(unique);
        changes.roles = { before, after: unique };
        await revokeUserSessions(target.id, 'profiles-changed');
      }
    }
    if (body.companyId !== undefined && isAdmin && body.companyId) {
      for (const role of (await grantedRoles(target.id)).filter((r) => r !== 'ADMIN')) {
        if (authz.COMPANY_ROLES.includes(role))
          await db.run('UPDATE user_company_links SET revokedAt = ?, revokedById = ? WHERE userId = ? AND role = ? AND revokedAt IS NULL', db.now(), req.principal.user.id, target.id, role);
        await grantLink(req, target.id, body.companyId, role);
      }
      patch.companyId = body.companyId;
      changes.companyId = { before: target.companyId, after: body.companyId };
      await revokeUserSessions(target.id, 'links-changed');
    }

    const keys = Object.keys(patch);
    if (keys.length)
      await db.run(
        `UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
        ...keys.map((k) => patch[k]),
        db.now(),
        target.id,
      );
    if (patch.password) await revokeUserSessions(target.id, 'password-changed');
    if (Object.keys(changes).length || keys.length)
      await authz.audit(req, 'user.update', { entity: 'users', entityId: target.id, details: { fields: keys.filter((k) => k !== 'password'), changes } });
    res.json(await ser.userWithProfiles(await findUser(target.id)));
  }),
);

/* ------------------------------------------------------------------ foto de perfil */

const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxAvatarBytes, files: 1 } }).single('file');

/** A própria pessoa troca a sua foto; a de outra pessoa, só a Administração (`users.manage`). */
async function assertAvatarEditor(req, target) {
  if (req.principal.user.id === target.id) return;
  if (!req.principal.isAdmin) throw forbidden('você não tem permissão para alterar a foto deste usuário');
  await authz.assertCan(req, 'users.manage');
}

router.post('/users/:id/avatar', async (req, res) => {
  const target = await findUser(req.params.id);
  await assertAvatarEditor(req, target);
  limiter.hit('upload', req, { extra: req.principal.user.id, max: config.rateLimit.uploadMax, windowMs: 60 * 1000 });
  await new Promise((resolve, reject) => avatarUpload(req, res, (err) => (err ? reject(err) : resolve())));
  if (!req.file) throw badRequest('envie a imagem no campo "file"');
  const image = images.inspect(req.file.buffer, 'avatar');
  const stored = images.store(image, 'avatar');
  await db.run('UPDATE users SET avatar = ?, updatedAt = ? WHERE id = ?', stored, db.now(), target.id);
  images.discard(target.avatar, 'avatar');
  await authz.audit(req, 'user.avatar', { entity: 'users', entityId: target.id, details: { action: 'set', width: image.width, height: image.height, format: image.ext } });
  res.status(201).json(await ser.userWithProfiles(await findUser(target.id)));
});

router.delete('/users/:id/avatar', async (req, res) => {
  const target = await findUser(req.params.id);
  await assertAvatarEditor(req, target);
  if (target.avatar) {
    await db.run('UPDATE users SET avatar = NULL, updatedAt = ? WHERE id = ?', db.now(), target.id);
    images.discard(target.avatar, 'avatar');
    await authz.audit(req, 'user.avatar', { entity: 'users', entityId: target.id, details: { action: 'remove' } });
  }
  res.json(await ser.userWithProfiles(await findUser(target.id)));
});

/* ------------------------------------------------------------------ situação */

/** Inativação preserva autoria e histórico; a conta deixa de entrar na próxima requisição. */
router.delete('/users/:id', authz.authorize('users.manage'), async (req, res) => {
  const target = await findUser(req.params.id);
  if (target.id === req.principal.user.id) throw badRequest('você não pode inativar o próprio usuário');
  await authz.assertNotLastActiveAdmin(target.id);
  await db.run("UPDATE users SET status = 'INACTIVE', statusChangedAt = ?, statusChangedById = ?, updatedAt = ? WHERE id = ?", db.now(), req.principal.user.id, db.now(), target.id);
  await revokeUserSessions(target.id, 'user-inactivated');
  await authz.audit(req, 'user.inactivate', { entity: 'users', entityId: target.id });
  res.json({ ...ser.user(await findUser(target.id)), deleted: true });
});

router.post('/users/:id/activate', authz.authorize('users.manage'), async (req, res) => {
  const target = await findUser(req.params.id);
  await db.run("UPDATE users SET status = 'ACTIVE', statusChangedAt = ?, statusChangedById = ?, updatedAt = ? WHERE id = ?", db.now(), req.principal.user.id, db.now(), target.id);
  await authz.audit(req, 'user.activate', { entity: 'users', entityId: target.id });
  res.json(await ser.userWithProfiles(await findUser(target.id)));
});

module.exports = router;
