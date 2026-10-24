const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const { unauthorized } = require('./http');
const authz = require('./authz');

const ROLES = authz.ROLES;

/* ------------------------------------------------------------------ sessões */

/**
 * Sessões são registros no banco: o token carrega apenas o id da sessão (`sid`). Encerrar a
 * sessão, inativar a conta, revogar vínculo ou alterar perfil tem efeito na próxima
 * requisição autorizada, porque principal e sessão são lidos do banco a cada chamada.
 */
async function createSession(userId, { keepLogged = false, selectedCompanyId = null } = {}) {
  const id = db.uuid();
  await db.run(
    'INSERT INTO sessions (id, userId, createdAt, lastSeenAt, keepLogged, selectedCompanyId) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    userId,
    db.now(),
    db.now(),
    keepLogged ? 1 : 0,
    selectedCompanyId,
  );
  return await db.one('SELECT * FROM sessions WHERE id = ?', id);
}

const loadSession = async (id) => db.one('SELECT * FROM sessions WHERE id = ? AND revokedAt IS NULL', id);

async function revokeSession(id, reason) {
  await db.run('UPDATE sessions SET revokedAt = ?, revokedReason = ? WHERE id = ? AND revokedAt IS NULL', db.now(), reason, id);
}

async function revokeUserSessions(userId, reason) {
  await db.run('UPDATE sessions SET revokedAt = ?, revokedReason = ? WHERE userId = ? AND revokedAt IS NULL', db.now(), reason, userId);
}

async function setSessionCompany(sessionId, companyId) {
  await db.run('UPDATE sessions SET selectedCompanyId = ? WHERE id = ?', companyId, sessionId);
}

/* ------------------------------------------------------------------ tokens */

const signAccess = (user, sid) =>
  jwt.sign({ sub: user.id, sid, type: 'access' }, config.jwtSecret, { expiresIn: config.accessTokenTtl });

const signRefresh = (user, sid) =>
  jwt.sign({ sub: user.id, sid, type: 'refresh' }, config.jwtRefreshSecret, { expiresIn: config.refreshTokenTtl });

/** Leitura do cabeçalho e conferência do token são síncronas: não tocam o banco. */
function bearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

function verify(token, secret, type) {
  try {
    const payload = jwt.verify(token, secret);
    if (payload.type !== type) return null;
    return payload;
  } catch {
    return null;
  }
}

/* --------------------------------------------- recuperação de senha (uso único) */

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Token opaco de uso único; somente o hash é persistido. */
async function issuePasswordReset(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.run('UPDATE password_resets SET invalidatedAt = ? WHERE userId = ? AND usedAt IS NULL AND invalidatedAt IS NULL', db.now(), userId);
  await db.run(
    'INSERT INTO password_resets (id, userId, tokenHash, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)',
    db.uuid(),
    userId,
    hashToken(token),
    db.now(),
    expiresAt,
  );
  return { token, expiresAt };
}

/** Consome o token: só vale uma vez e apenas antes de expirar. */
async function consumePasswordReset(token) {
  if (!token) return null;
  const row = await db.one('SELECT * FROM password_resets WHERE tokenHash = ?', hashToken(token));
  if (!row || row.usedAt || row.invalidatedAt) return null;
  if (new Date(row.expiresAt) < new Date()) return null;
  const user = await db.one("SELECT * FROM users WHERE id = ? AND deletedAt IS NULL AND status = 'ACTIVE'", row.userId);
  if (!user) return null;
  await db.run('UPDATE password_resets SET usedAt = ? WHERE id = ?', db.now(), row.id);
  return user;
}

/* ------------------------------------------------------------------ middleware */

/**
 * Exige access token válido de sessão ativa e carrega o principal (perfis e vínculos do
 * banco). Disponibiliza `req.principal`, `req.session`, `req.context.companyId` e, por
 * compatibilidade com as rotas herdadas, `req.user`.
 */
async function authenticate(req, _res, next) {
  const token = bearer(req);
  const payload = token && verify(token, config.jwtSecret, 'access');
  if (!payload) return next(unauthorized());
  const session = payload.sid ? await loadSession(payload.sid) : null;
  if (!session || session.userId !== payload.sub) return next(unauthorized('sessão encerrada ou revogada'));
  const principal = await authz.loadPrincipal(payload.sub);
  if (!principal) return next(unauthorized('conta inativa ou sem perfil concedido'));

  await db.run('UPDATE sessions SET lastSeenAt = ? WHERE id = ?', db.now(), session.id);
  req.principal = principal;
  req.session = session;
  req.user = principal.user;
  req.context = { companyId: authz.resolveContextCompany(principal, session) };
  next();
}

/** Compatibilidade: exige um dos perfis concedidos (sem escopo). Prefira `authz.assertCan`. */
const requireRoles = (...roles) => async (req, _res, next) =>
  req.principal && roles.some((r) => req.principal.roles.includes(r)) ? next() : next(require('./http').forbidden());

module.exports = {
  ROLES,
  createSession,
  loadSession,
  revokeSession,
  revokeUserSessions,
  setSessionCompany,
  signAccess,
  signRefresh,
  bearer,
  verify,
  hashToken,
  issuePasswordReset,
  consumePasswordReset,
  authenticate,
  requireRoles,
  loadUser: async (id) => db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', id),
};
