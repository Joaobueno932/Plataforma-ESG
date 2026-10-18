const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { paginate } = require('../pagination');
const { badRequest, unauthorized, notFound, conflict } = require('../http');
const { authenticate, requireRoles } = require('../auth');
const { createReportForCompany, assertCompanyAccess } = require('../services');

const router = express.Router();
router.use('/companies', authenticate);

const SIZES = ['MICRO_PEQUENA', 'MEDIA', 'GRANDE'];
const digits = (v) => String(v || '').replace(/\D+/g, '');

/** Linha da listagem: {id, bussinessName, accessDate, report:{status,_count:{answeredQuestions}}}. */
function listRow(c) {
  const r = db.one('SELECT id, status FROM reports WHERE companyId = ?', c.id);
  const count = r ? db.one('SELECT count(*) AS n FROM question_reports WHERE reportId = ?', r.id).n : 0;
  return { id: c.id, bussinessName: c.bussinessName, accessDate: c.accessDate, report: { status: r ? r.status : 'Pending', _count: { answeredQuestions: count } } };
}

function detail(c) {
  const users = db.all('SELECT * FROM users WHERE companyId = ? AND deletedAt IS NULL ORDER BY name', c.id).map(ser.user);
  const out = { ...ser.company(c, { withReport: true }), users };
  if (out.report) out.report._count = listRow(c).report._count;
  return out;
}

const findCompany = (id) => {
  const c = db.one('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', id);
  if (!c) throw notFound('company not found');
  return c;
};

router.get('/companies', requireRoles('ADMIN'), (req, res) => {
  const name = (req.query.bussinessName || '').trim();
  const rows = db
    .all(
      `SELECT * FROM companies WHERE deletedAt IS NULL ${name ? 'AND lower(bussinessName) LIKE lower(?)' : ''} ORDER BY createdAt DESC`,
      ...(name ? [`%${name}%`] : []),
    )
    .map(listRow);
  if (req.query.nonPaginate === 'true') return res.json({ ...paginate(req, rows, { defaultPerPage: rows.length || 1, basePath: '/companies' }), data: rows });
  res.json(paginate(req, rows, { defaultPerPage: 5, basePath: '/companies' }));
});

// Também usado por Consultor/Auditor para trocar a empresa vinculada (tela Configurações).
router.get('/companies/light/all', requireRoles('ADMIN', 'CONSULTOR', 'AUDITOR'), (_req, res) => {
  res.json(db.all('SELECT id, legalName, bussinessName FROM companies WHERE deletedAt IS NULL ORDER BY bussinessName'));
});

/** Arquivos do GED da empresa do usuário logado. */
router.get('/companies/get/files', (req, res) => {
  if (req.user.role === 'ADMIN') throw unauthorized('essa ação é apenas para usuários não admin!');
  res.json(db.all('SELECT id, companyId, name, url, fileType, createdAt FROM company_files WHERE companyId = ? AND inGed = 1 ORDER BY name', req.user.companyId));
});

router.get('/companies/:id', (req, res) => {
  const c = findCompany(req.params.id);
  assertCompanyAccess(req.user, c.id);
  res.json(detail(c));
});

router.post('/companies', requireRoles('ADMIN'), (req, res) => {
  const b = req.body || {};
  for (const f of ['legalName', 'bussinessName', 'email', 'cnpj', 'accessDate', 'size', 'section'])
    if (!b[f]) throw badRequest(`o campo ${f} é obrigatório`);
  if (!SIZES.includes(b.size)) throw badRequest('tamanho de empresa inválido');
  const cnpj = digits(b.cnpj);
  if (cnpj.length !== 14) throw badRequest('o CNPJ deve ter 14 dígitos');
  if (!db.one('SELECT section FROM sectors WHERE section = ? AND section <> ?', b.section, 'All')) throw badRequest('caderno setorial inválido');
  if (db.one('SELECT id FROM companies WHERE cnpj = ? AND deletedAt IS NULL', cnpj)) throw conflict('já existe uma empresa com esse CNPJ');

  const id = db.uuid();
  db.transaction(() => {
    const at = db.now();
    db.run(
      `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, avatar, access, reportAccess, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      id, b.bussinessName.trim(), b.legalName.trim(), b.email.trim(), cnpj, new Date(b.accessDate).toISOString(),
      b.size, b.section, b.avatar || null, at, at,
    );
    createReportForCompany(db.one('SELECT * FROM companies WHERE id = ?', id));
  });
  res.status(201).json(detail(findCompany(id)));
});

router.patch('/companies/:id', requireRoles('ADMIN'), (req, res) => {
  const c = findCompany(req.params.id);
  const b = req.body || {};
  const patch = {};
  for (const f of ['bussinessName', 'legalName', 'email', 'avatar']) if (b[f] !== undefined) patch[f] = b[f] === '' && f === 'avatar' ? null : b[f];
  if (b.cnpj !== undefined && b.cnpj !== '') {
    const cnpj = digits(b.cnpj);
    if (cnpj.length !== 14) throw badRequest('o CNPJ deve ter 14 dígitos');
    const other = db.one('SELECT id FROM companies WHERE cnpj = ? AND deletedAt IS NULL', cnpj);
    if (other && other.id !== c.id) throw conflict('já existe uma empresa com esse CNPJ');
    patch.cnpj = cnpj;
  }
  if (b.size !== undefined) {
    if (!SIZES.includes(b.size)) throw badRequest('tamanho de empresa inválido');
    patch.size = b.size;
  }
  if (b.accessDate !== undefined) patch.accessDate = new Date(b.accessDate).toISOString();
  if (b.access !== undefined) patch.access = b.access ? 1 : 0;
  const keys = Object.keys(patch);
  if (keys.length) db.run(`UPDATE companies SET ${keys.map((k) => `${k} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`, ...keys.map((k) => patch[k]), db.now(), c.id);
  res.json(detail(findCompany(c.id)));
});

router.delete('/companies/:id', requireRoles('ADMIN'), (req, res) => {
  const c = findCompany(req.params.id);
  db.transaction(() => {
    db.run('UPDATE users SET deletedAt = ?, email = email || ? WHERE companyId = ? AND deletedAt IS NULL', db.now(), `#deleted-${Date.now()}`, c.id);
    db.run('UPDATE companies SET deletedAt = ?, cnpj = cnpj || ? WHERE id = ?', db.now(), `#deleted-${Date.now()}`, c.id);
  });
  res.json({ id: c.id, deleted: true });
});

module.exports = router;
