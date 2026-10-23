const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const ser = require('../serializers');
const limiter = require('../ratelimit');
const { wrap, badRequest, unauthorized, forbidden, asyncRouter } = require('../http');
const authz = require('../authz');
const {
  authenticate,
  createSession,
  revokeSession,
  revokeUserSessions,
  setSessionCompany,
  signAccess,
  signRefresh,
  bearer,
  verify,
  issuePasswordReset,
  consumePasswordReset,
} = require('../auth');

const router = asyncRouter();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

/** Mensagem única: não revela se o e-mail existe nem se a conta está inativa. */
const INVALID_CREDENTIALS = 'e-mail ou senha inválidos';

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const email = normalizeEmail((req.body || {}).email);
    const { password, keepLogged } = req.body || {};
    if (!email || !password) throw badRequest('e-mail e senha são obrigatórios');
    limiter.hit('login', req, { extra: email });

    const user = await db.one('SELECT * FROM users WHERE lower(email) = ? AND deletedAt IS NULL', email);
    const passwordOk = user && (await bcrypt.compare(String(password), user.password));
    if (!passwordOk) throw unauthorized(INVALID_CREDENTIALS);
    if (user.status !== 'ACTIVE') throw unauthorized(INVALID_CREDENTIALS);

    const principal = await authz.loadPrincipal(user.id);
    if (!principal) throw unauthorized('conta sem perfil concedido; procure a Administração');

    // Usuário da empresa depende da liberação e da situação cadastral da empresa vinculada.
    const companyLinks = principal.links.filter((l) => authz.COMPANY_ROLES.includes(l.role));
    for (const link of companyLinks) {
      const company = await db.one('SELECT access, accessDate, status FROM companies WHERE id = ? AND deletedAt IS NULL', link.companyId);
      if (!company) continue;
      if (company.status !== 'ACTIVE') throw unauthorized('o cadastro da sua empresa está inativo');
      if (!ser.bool(company.access) || new Date(company.accessDate) > new Date())
        throw unauthorized('o acesso da sua empresa ainda não foi liberado');
    }
    if (!principal.isAdmin && !principal.links.length) throw unauthorized('sua conta não possui vínculo vigente com nenhuma empresa');

    limiter.reset('login', req, email);
    const session = await createSession(user.id, {
      keepLogged: !!keepLogged,
      selectedCompanyId: authz.resolveContextCompany(principal, null),
    });
    await db.run('UPDATE users SET updatedAt = ? WHERE id = ?', db.now(), user.id);
    res.status(201).json({
      access_token: signAccess(user, session.id),
      refresh_token: signRefresh(user, session.id),
      sanitizedUser: await ser.userWithProfiles(await db.one('SELECT * FROM users WHERE id = ?', user.id), {
        contextCompanyId: session.selectedCompanyId,
      }),
    });
  }),
);

router.get('/auth/me', authenticate, async (req, res) =>
  res.json(await ser.userWithProfiles(req.principal.user, { contextCompanyId: req.context.companyId })),
);

/** Encerra a sessão; o token deixa de valer na próxima requisição. */
router.post('/auth/logout', authenticate, async (req, res) => {
  await revokeSession(req.session.id, 'logout');
  await authz.audit(req, 'session.logout', { entity: 'sessions', entityId: req.session.id });
  res.json({ message: 'sessão encerrada' });
});

router.post('/auth/refresh', async (req, res, next) => {
  const token = bearer(req);
  const payload = token && verify(token, config.jwtRefreshSecret, 'refresh');
  if (!payload || !payload.sid) return next(unauthorized('refresh token inválido'));
  const session = await db.one('SELECT * FROM sessions WHERE id = ? AND revokedAt IS NULL', payload.sid);
  if (!session || session.userId !== payload.sub) return next(unauthorized('sessão encerrada ou revogada'));
  const principal = await authz.loadPrincipal(payload.sub);
  if (!principal) return next(unauthorized('conta inativa ou sem perfil concedido'));
  res.status(201).json({
    access_token: signAccess(principal.user, session.id),
    refresh_token: signRefresh(principal.user, session.id),
  });
});

/**
 * Seleção de contexto: escolhe **um vínculo vigente**. Nunca cria nem amplia acesso — a
 * troca arbitrária de empresa pelo próprio profissional (diagnóstico A8) deixou de existir.
 */
router.patch('/auth/context', authenticate, async (req, res) => {
  const companyId = (req.body || {}).companyId;
  if (!companyId) throw badRequest('informe a empresa do vínculo');
  const allowed = req.principal.linkedTo(companyId) || req.principal.isAdmin;
  if (!allowed) throw forbidden('você não possui vínculo vigente com esta empresa');
  const company = await db.one('SELECT id FROM companies WHERE id = ? AND deletedAt IS NULL', companyId);
  if (!company) throw badRequest('empresa não encontrada');
  await setSessionCompany(req.session.id, companyId);
  await authz.audit(req, 'session.context', { entity: 'sessions', entityId: req.session.id, companyId });
  res.json(await ser.userWithProfiles(req.principal.user, { contextCompanyId: companyId }));
});

/** Empresas que o usuário pode selecionar como contexto (apenas vínculos vigentes). */
router.get('/auth/context/options', authenticate, async (req, res) => {
  if (req.principal.isAdmin && !req.principal.links.length) {
    return res.json(
      await db.all("SELECT id AS companyId, bussinessName, legalName FROM companies WHERE deletedAt IS NULL AND status = 'ACTIVE' ORDER BY bussinessName"),
    );
  }
  res.json(await ser.links(req.principal.user.id));
});

/**
 * Recuperação de senha: token opaco de uso único.
 * **Envio real de e-mail não está configurado** (`config.mail.transport === 'outbox-file'`):
 * o link é gravado em storage/mail-outbox.log. A resposta é sempre a mesma.
 */
router.post('/auth/forgotPassword', async (req, res) => {
  const email = normalizeEmail((req.body || {}).email);
  if (!email) throw badRequest('e-mail é obrigatório');
  limiter.hit('forgotPassword', req, { extra: email, max: 5 });

  const user = await db.one("SELECT * FROM users WHERE lower(email) = ? AND deletedAt IS NULL AND status = 'ACTIVE'", email);
  if (user) {
    const { token } = await issuePasswordReset(user.id);
    const link = `${config.frontendUrl}/recovery-password?token=${token}`;
    const line = `[${db.now()}] Para: ${user.email} | Redefinição de senha ESG-FIEMS: ${link}\n`;
    fs.mkdirSync(config.storageDir, { recursive: true });
    fs.appendFileSync(path.join(config.storageDir, 'mail-outbox.log'), line);
    if (!config.isProduction) console.log(line.trim());
  }
  res.status(201).json({
    message: 'se o e-mail estiver cadastrado, as instruções foram enviadas',
    delivery: config.mail.configured ? 'email' : 'outbox-file',
  });
});

/** Consome o token de recuperação (uma única vez) e encerra as sessões abertas. */
router.post(
  '/auth/changePassword',
  wrap(async (req, res) => {
    const token = bearer(req) || (req.body || {}).token;
    const user = await consumePasswordReset(token);
    if (!user) throw unauthorized('link de redefinição inválido, expirado ou já utilizado');
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) throw badRequest('a senha deve ter no mínimo 8 caracteres');
    await db.run('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', await bcrypt.hash(String(newPassword), 10), db.now(), user.id);
    await revokeUserSessions(user.id, 'password-reset');
    await db.run(
      'INSERT INTO audit_events (id, at, actorId, action, entity, entityId) VALUES (?, ?, ?, ?, ?, ?)',
      db.uuid(),
      db.now(),
      user.id,
      'password.reset',
      'users',
      user.id,
    );
    res.status(201).json({ message: 'senha alterada' });
  }),
);

module.exports = router;
