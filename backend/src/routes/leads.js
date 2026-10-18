const express = require('express');
const db = require('../db');
const { badRequest } = require('../http');
const { authenticate, requireRoles } = require('../auth');

const router = express.Router();

const parse = (row) => ({ ...row, answers: JSON.parse(row.answers), companyData: JSON.parse(row.companyData), address: JSON.parse(row.address) });

/** Autoavaliação pública: registra o interessado e o resumo das respostas. */
router.post('/leads', (req, res) => {
  const b = req.body || {};
  for (const f of ['first_name', 'last_name', 'email']) if (!b[f]) throw badRequest(`o campo ${f} é obrigatório`);
  const id = db.uuid();
  db.run(
    `INSERT INTO leads (id, first_name, last_name, email, phone, mobile, role, department, knowledgeMethod, answers, companyData, address, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, b.first_name, b.last_name, b.email, b.phone || null, b.mobile || null, b.role || null, b.department || null,
    b.knowledgeMethod || null, JSON.stringify(b.answers || {}), JSON.stringify(b.companyData || {}), JSON.stringify(b.address || {}), db.now(),
  );
  res.status(201).json(parse(db.one('SELECT * FROM leads WHERE id = ?', id)));
});

router.get('/leads', authenticate, requireRoles('ADMIN'), (_req, res) => {
  res.json(db.all('SELECT * FROM leads ORDER BY createdAt DESC').map(parse));
});

module.exports = router;
