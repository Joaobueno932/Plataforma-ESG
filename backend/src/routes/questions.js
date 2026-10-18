const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, notFound, conflict } = require('../http');
const { authenticate, requireRoles } = require('../auth');
const { attachQuestionToReports } = require('../services');

const router = express.Router();

const LEVELS = ['Nao_conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Conforme'];
const CATEGORIES = ['E', 'S', 'G'];

/* ---------- Cadernos (setores) ---------- */

router.get('/sectors', authenticate, (_req, res) => {
  res.json(db.all('SELECT section, description, avatar FROM sectors ORDER BY section'));
});

router.post('/sectors', authenticate, requireRoles('ADMIN'), (req, res) => {
  const { section, description, avatar } = req.body || {};
  const code = String(section || '').trim().toUpperCase();
  if (!/^[A-Z]$/.test(code)) throw badRequest('o setor deve ser uma letra de A a Z');
  if (!description || !avatar) throw badRequest('descrição e capa são obrigatórias');
  if (db.one('SELECT section FROM sectors WHERE section = ?', code)) throw conflict('já existe um caderno para esse setor');
  db.run('INSERT INTO sectors (section, description, avatar) VALUES (?, ?, ?)', code, String(description).trim(), avatar);
  res.status(201).json(db.one('SELECT section, description, avatar FROM sectors WHERE section = ?', code));
});

/* ---------- Indicadores ---------- */

router.use('/questions', authenticate, requireRoles('ADMIN'));

function nextCode(section, category) {
  const prefix = `${section === 'All' ? 'CG' : section}-${category}`;
  const n = db.one('SELECT count(*) AS n FROM questions WHERE section = ? AND category = ?', section, category).n;
  return `${prefix}${String(n + 1).padStart(2, '0')}`;
}

function validateQuestion(q) {
  if (!q || !q.title || !q.description || !q.category) throw badRequest('título, descrição e categoria são obrigatórios');
  if (!CATEGORIES.includes(q.category)) throw badRequest('categoria inválida');
  if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 6) throw badRequest('o indicador deve ter de 2 a 6 respostas');
  for (const a of q.answers) {
    if (!LEVELS.includes(a.title)) throw badRequest('nível de maturidade inválido');
    if (!Number.isFinite(Number(a.points))) throw badRequest('pontuação inválida');
    if (!a.description) throw badRequest('descrição da resposta é obrigatória');
  }
}

router.post('/questions/section/:section', (req, res) => {
  const section = req.params.section;
  if (!db.one('SELECT section FROM sectors WHERE section = ?', section)) throw notFound('sector not found');
  const items = Array.isArray(req.body) ? req.body : [req.body];
  items.forEach(validateQuestion);
  const created = db.transaction(() =>
    items.map((q) => {
      const id = db.uuid();
      const hasMandatory = q.answers.some((a) => a.mandatory) || !!q.hasMandatory;
      db.run(
        `INSERT INTO questions (id, code, section, title, description, category, subcategory, hasMandatory, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, nextCode(section, q.category), section, q.title.trim(), q.description.trim(), q.category, q.subcategory || null, hasMandatory ? 1 : 0, db.now(),
      );
      for (const a of q.answers)
        db.run('INSERT INTO answers (id, questionId, title, points, description, mandatory) VALUES (?, ?, ?, ?, ?, ?)',
          db.uuid(), id, a.title, Number(a.points), a.description.trim(), a.mandatory ? 1 : 0);
      const row = db.one('SELECT * FROM questions WHERE id = ?', id);
      attachQuestionToReports(row);
      return ser.question(row);
    }),
  );
  res.status(201).json(created);
});

router.patch('/questions/answer/:questionId/:answerId', (req, res) => {
  const a = db.one('SELECT * FROM answers WHERE id = ? AND questionId = ?', req.params.answerId, req.params.questionId);
  if (!a) throw notFound('answer not found');
  const { points, description, mandatory } = req.body || {};
  db.run(
    'UPDATE answers SET points = ?, description = ?, mandatory = ? WHERE id = ?',
    points !== undefined ? Number(points) : a.points,
    description !== undefined ? String(description) : a.description,
    mandatory !== undefined ? (mandatory ? 1 : 0) : a.mandatory,
    a.id,
  );
  const anyMandatory = db.one('SELECT count(*) AS n FROM answers WHERE questionId = ? AND mandatory = 1', a.questionId).n > 0;
  db.run('UPDATE questions SET hasMandatory = ? WHERE id = ?', anyMandatory ? 1 : 0, a.questionId);
  res.json(ser.answer(db.one('SELECT * FROM answers WHERE id = ?', a.id)));
});

router.delete('/questions/answer/:answerId', (req, res) => {
  const a = db.one('SELECT * FROM answers WHERE id = ?', req.params.answerId);
  if (!a) throw notFound('answer not found');
  if (db.one('SELECT count(*) AS n FROM answers WHERE questionId = ?', a.questionId).n <= 2) throw badRequest('o indicador deve manter ao menos 2 respostas');
  db.run('DELETE FROM answers WHERE id = ?', a.id);
  res.json({ id: a.id, deleted: true });
});

/** "Deletar caderno": remove o caderno setorial e seus indicadores. */
router.delete('/questions/section/:section', (req, res) => {
  const section = req.params.section;
  if (section === 'All') throw badRequest('o Caderno Geral não pode ser removido');
  if (!db.one('SELECT section FROM sectors WHERE section = ?', section)) throw notFound('sector not found');
  if (db.one('SELECT count(*) AS n FROM companies WHERE section = ? AND deletedAt IS NULL', section).n > 0)
    throw conflict('existem empresas vinculadas a esse caderno setorial');
  db.transaction(() => {
    db.run('DELETE FROM questions WHERE section = ?', section);
    db.run('DELETE FROM sectors WHERE section = ?', section);
  });
  res.json({ section, deleted: true });
});

router.patch('/questions/:id', (req, res) => {
  const q = db.one('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!q) throw notFound('question not found');
  const { title, description } = req.body || {};
  db.run('UPDATE questions SET title = ?, description = ? WHERE id = ?', title ? String(title).trim() : q.title, description ? String(description).trim() : q.description, q.id);
  res.json(ser.question(db.one('SELECT * FROM questions WHERE id = ?', q.id)));
});

router.delete('/questions/:id', (req, res) => {
  const q = db.one('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!q) throw notFound('question not found');
  db.run('DELETE FROM questions WHERE id = ?', q.id);
  res.json({ id: q.id, deleted: true });
});

module.exports = router;
