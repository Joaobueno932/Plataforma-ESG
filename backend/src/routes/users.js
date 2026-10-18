const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const ser = require('../serializers');
const { paginate } = require('../pagination');
const { wrap, badRequest, unauthorized, forbidden, notFound, conflict } = require('../http');
const { ROLES, authenticate, requireRoles } = require('../auth');

const router = express.Router();
router.use('/users', authenticate);

const COMPANY_ROLES = ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR'];
const digits = (v) => (v == null ? v : String(v).replace(/\D+/g, ''));

function assertCompany(companyId) {
  if (!companyId) return null;
  const c = db.one('SELECT id FROM companies WHERE id = ? AND deletedAt IS NULL', companyId);
  if (!c) throw notFound('company not found');
  return c.id;
}

function assertEmailFree(email, exceptId = null) {
  const u = db.one('SELECT id FROM users WHERE lower(email) = lower(?) AND deletedAt IS NULL', email);
  if (u && u.id !== exceptId) throw conflict('já existe um usuário com esse e-mail');
}

router.get('/users', requireRoles('ADMIN'), (req, res) => {
  const name = (req.query.name || '').trim();
  const rows = db
    .all(
      `SELECT * FROM users WHERE deletedAt IS NULL ${name ? 'AND lower(name) LIKE lower(?)' : ''} ORDER BY createdAt DESC`,
      ...(name ? [`%${name}%`] : []),
    )
    .map(ser.userWithCompany);
  res.json(paginate(req, rows, { defaultPerPage: 5, basePath: '/users' }));
});

router.get('/users/getUsers/company', (req, res) => {
  if (req.user.role === 'ADMIN') throw unauthorized('essa ação é apenas para usuários não admin!');
  const rows = db
    .all('SELECT * FROM users WHERE companyId = ? AND deletedAt IS NULL ORDER BY createdAt DESC', req.user.companyId)
    .map(ser.userWithCompany);
  res.json(paginate(req, rows, { defaultPerPage: 50, basePath: '/users/getUsers/company' }));
});

router.post(
  '/users',
  requireRoles('ADMIN'),
  wrap(async (req, res) => {
    const { name, email, password, cpf, jobTitle, role, companyId } = req.body || {};
    if (!name || !email || !password || !role) throw badRequest('nome, e-mail, senha e função são obrigatórios');
    if (!ROLES.includes(role)) throw badRequest('função inválida');
    if (String(password).length < 4) throw badRequest('a senha deve ter no mínimo 4 caracteres');
    if (COMPANY_ROLES.includes(role) && !companyId) throw badRequest('selecione uma empresa para esta função');
    assertEmailFree(email);
    const id = db.uuid();
    const at = db.now();
    db.run(
      `INSERT INTO users (id, name, email, password, cpf, jobTitle, role, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, String(name).trim(), String(email).trim(), await bcrypt.hash(String(password), 10), digits(cpf) || null,
      jobTitle || null, role, role === 'ADMIN' ? null : assertCompany(companyId), at, at,
    );
    res.status(201).json(ser.userWithCompany(db.one('SELECT * FROM users WHERE id = ?', id)));
  }),
);

/** ADMIN troca a empresa de qualquer usuário; Consultor/Auditor trocam a própria (tela Configurações). */
router.patch(
  '/users/changeCompany/:id',
  wrap(async (req, res) => {
    const target = db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', req.params.id);
    if (!target) throw notFound('user not found');
    const self = req.user.id === target.id && ['CONSULTOR', 'AUDITOR'].includes(req.user.role);
    if (req.user.role !== 'ADMIN' && !self) throw forbidden('você não tem permissão para trocar a empresa deste usuário');
    if (!(req.body || {}).companyId) throw badRequest('selecione uma empresa');
    db.run('UPDATE users SET companyId = ?, updatedAt = ? WHERE id = ?', assertCompany((req.body || {}).companyId), db.now(), target.id);
    res.json(ser.userWithCompany(db.one('SELECT * FROM users WHERE id = ?', target.id)));
  }),
);

router.patch(
  '/users/:id',
  wrap(async (req, res) => {
    const target = db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', req.params.id);
    if (!target) throw notFound('user not found');
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && req.user.id !== target.id) throw forbidden('você não tem permissão para editar este usuário');

    const body = req.body || {};
    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.email !== undefined) {
      assertEmailFree(body.email, target.id);
      patch.email = String(body.email).trim();
    }
    if (body.cpf !== undefined) patch.cpf = digits(body.cpf) || null;
    if (body.jobTitle !== undefined) patch.jobTitle = body.jobTitle || null;
    if (body.avatar !== undefined) patch.avatar = body.avatar || null;
    if (body.password) {
      if (String(body.password).length < 4) throw badRequest('a senha deve ter no mínimo 4 caracteres');
      patch.password = await bcrypt.hash(String(body.password), 10);
    }
    if (body.role !== undefined && body.role !== target.role) {
      if (!isAdmin) throw forbidden('apenas administradores podem alterar a função');
      if (!ROLES.includes(body.role)) throw badRequest('função inválida');
      patch.role = body.role;
    }
    if (body.companyId !== undefined && isAdmin) patch.companyId = assertCompany(body.companyId);

    const keys = Object.keys(patch);
    if (keys.length) {
      db.run(
        `UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
        ...keys.map((k) => patch[k]), db.now(), target.id,
      );
    }
    res.json(ser.userWithCompany(db.one('SELECT * FROM users WHERE id = ?', target.id)));
  }),
);

router.delete('/users/:id', requireRoles('ADMIN'), (req, res) => {
  const target = db.one('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL', req.params.id);
  if (!target) throw notFound('user not found');
  if (target.id === req.user.id) throw badRequest('você não pode remover o próprio usuário');
  // Exclusão lógica (o modelo original possui deletedAt); libera o e-mail para recadastro.
  db.run('UPDATE users SET deletedAt = ?, email = ? WHERE id = ?', db.now(), `${target.email}#deleted-${Date.now()}`, target.id);
  res.json(ser.user({ ...target, deletedAt: db.now() }));
});

module.exports = router;
