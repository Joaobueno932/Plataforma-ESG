const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const ser = require('../serializers');
const { wrap, badRequest, unauthorized } = require('../http');
const { authenticate, signAccess, signRefresh, signReset, bearer, verify, loadUser } = require('../auth');

const router = express.Router();

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest('e-mail e senha são obrigatórios');
    const user = db.one('SELECT * FROM users WHERE lower(email) = lower(?) AND deletedAt IS NULL', String(email).trim());
    if (!user || !(await bcrypt.compare(String(password), user.password))) throw unauthorized('e-mail ou senha inválidos');
    if (user.companyId) {
      const company = db.one('SELECT access, accessDate FROM companies WHERE id = ? AND deletedAt IS NULL', user.companyId);
      if (company && (!ser.bool(company.access) || new Date(company.accessDate) > new Date()))
        throw unauthorized('o acesso da sua empresa ainda não foi liberado');
    }
    db.run('UPDATE users SET updatedAt = ? WHERE id = ?', db.now(), user.id);
    res.status(201).json({ access_token: signAccess(user), sanitizedUser: ser.user(loadUser(user.id)), refresh_token: signRefresh(user) });
  }),
);

router.get('/auth/me', authenticate, (req, res) => res.json(ser.userWithCompany(req.user)));

router.post('/auth/refresh', (req, res, next) => {
  const token = bearer(req);
  const payload = token && verify(token, config.jwtRefreshSecret, 'refresh');
  const user = payload && loadUser(payload.sub);
  if (!user) return next(unauthorized('refresh token inválido'));
  res.status(201).json({ access_token: signAccess(user), refresh_token: signRefresh(user) });
});

/**
 * Sem servidor de e-mail no ambiente local: o link de redefinição é gravado em
 * storage/mail-outbox.log e no console (o original enviava e-mail).
 */
router.post('/auth/forgotPassword', (req, res) => {
  const email = String((req.body || {}).email || '').trim();
  if (!email) throw badRequest('e-mail é obrigatório');
  const user = db.one('SELECT * FROM users WHERE lower(email) = lower(?) AND deletedAt IS NULL', email);
  if (user) {
    const link = `${config.frontendUrl}/recovery-password?token=${signReset(user)}`;
    const line = `[${db.now()}] Para: ${user.email} | Redefinição de senha ESG-FIEMS: ${link}\n`;
    fs.mkdirSync(config.storageDir, { recursive: true });
    fs.appendFileSync(path.join(config.storageDir, 'mail-outbox.log'), line);
    console.log(line.trim());
  }
  // Mesmo retorno para e-mails inexistentes, para não revelar cadastros.
  res.status(201).json({ message: 'se o e-mail estiver cadastrado, as instruções foram enviadas' });
});

router.post(
  '/auth/changePassword',
  wrap(async (req, res) => {
    const token = bearer(req);
    const payload = token && verify(token, config.jwtResetSecret, 'reset');
    const user = payload && loadUser(payload.sub);
    if (!user) throw unauthorized('link de redefinição inválido ou expirado');
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 4) throw badRequest('a senha deve ter no mínimo 4 caracteres');
    db.run('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', await bcrypt.hash(String(newPassword), 10), db.now(), user.id);
    res.status(201).json({ message: 'senha alterada' });
  }),
);

module.exports = router;
