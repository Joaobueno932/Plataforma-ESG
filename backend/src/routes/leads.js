const express = require('express');
const db = require('../db');
const { badRequest } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const limiter = require('../ratelimit');
const v = require('../validators');

const router = express.Router();

const parse = (row) => ({ ...row, answers: JSON.parse(row.answers), companyData: JSON.parse(row.companyData), address: JSON.parse(row.address) });

/**
 * Autoavaliação pública: registra o interessado e o resumo das respostas.
 * Rota aberta — com limite de requisições por origem e validação de formato, por gravar
 * dados pessoais.
 */
router.post('/leads', limiter.limit('leads', { max: 5 }), (req, res) => {
  const b = req.body || {};
  for (const f of ['first_name', 'last_name', 'email']) if (!b[f]) throw badRequest(`o campo ${f} é obrigatório`);
  if (!v.isValidEmail(b.email)) throw badRequest('informe um e-mail válido');
  const text = (value, max) => {
    const s = String(value ?? '').trim();
    if (s.length > max) throw badRequest('conteúdo acima do tamanho permitido');
    return s || null;
  };
  const json = (value) => {
    const s = JSON.stringify(value || {});
    if (s.length > 20000) throw badRequest('conteúdo acima do tamanho permitido');
    return s;
  };
  const id = db.uuid();
  db.run(
    `INSERT INTO leads (id, first_name, last_name, email, phone, mobile, role, department, knowledgeMethod, answers, companyData, address, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    text(b.first_name, 120),
    text(b.last_name, 120),
    v.normalizeEmail(b.email),
    text(b.phone, 20),
    text(b.mobile, 20),
    text(b.role, 120),
    text(b.department, 120),
    text(b.knowledgeMethod, 200),
    json(b.answers),
    json(b.companyData),
    json(b.address),
    db.now(),
  );
  res.status(201).json(parse(db.one('SELECT * FROM leads WHERE id = ?', id)));
});

router.get('/leads', authenticate, authz.authorize('leads.read'), (_req, res) => {
  res.json(db.all('SELECT * FROM leads ORDER BY createdAt DESC').map(parse));
});

module.exports = router;
