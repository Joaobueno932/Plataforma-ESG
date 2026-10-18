const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const { unauthorized, forbidden } = require('./http');

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR'];

const signAccess = (user) => jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
const signRefresh = (user) => jwt.sign({ sub: user.id, type: 'refresh' }, config.jwtRefreshSecret, { expiresIn: config.refreshTokenTtl });
const signReset = (user) => jwt.sign({ sub: user.id, type: 'reset' }, config.jwtResetSecret, { expiresIn: config.resetTokenTtl });

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

function loadUser(id) {
  return db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', id);
}

/** Exige access token válido; disponibiliza req.user (linha completa). */
function authenticate(req, _res, next) {
  const token = bearer(req);
  const payload = token && verify(token, config.jwtSecret, 'access');
  const user = payload && loadUser(payload.sub);
  if (!user) return next(unauthorized());
  req.user = user;
  next();
}

const requireRoles = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(forbidden());

module.exports = { ROLES, signAccess, signRefresh, signReset, bearer, verify, loadUser, authenticate, requireRoles };
