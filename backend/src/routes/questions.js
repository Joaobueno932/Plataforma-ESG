const express = require('express');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, notFound, conflict, asyncRouter } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const { attachQuestionToReports } = require('../services');
const catalog = require('../catalog/import');

const router = asyncRouter();

const CATEGORIES = ['E', 'S', 'G'];

/**
 * Versões oficiais publicadas são imutáveis: alteração vira **versão nova** (importação).
 * A edição manual fica disponível em rascunhos e no catálogo de demonstração.
 */
async function assertEditableVersion(versionId) {
  const version = versionId ? await catalog.versionById(versionId) : await catalog.activeVersion();
  if (!version) throw badRequest('nenhuma versão de catálogo disponível');
  if (version.origin === 'official' && version.status !== 'draft')
    throw conflict(
      `a versão "${version.label}" está ${version.status} e não pode ser editada; importe uma nova versão da planilha para alterar o catálogo`,
    );
  return version;
}

/* ---------- Cadernos (setores) ---------- */

router.get('/sectors', authenticate, async (_req, res) => {
  res.json(await db.all('SELECT section, description, avatar FROM sectors ORDER BY section'));
});

router.post('/sectors', authenticate, authz.authorize('catalog.manage'), async (req, res) => {
  const { section, description, avatar } = req.body || {};
  const code = String(section || '').trim().toUpperCase();
  if (!/^[A-Z]$/.test(code)) throw badRequest('o setor deve ser uma letra de A a Z');
  if (!description || !avatar) throw badRequest('descrição e capa são obrigatórias');
  if (await db.one('SELECT section FROM sectors WHERE section = ?', code)) throw conflict('já existe um caderno para esse setor');
  await db.run('INSERT INTO sectors (section, description, avatar) VALUES (?, ?, ?)', code, String(description).trim(), avatar);
  res.status(201).json(await db.one('SELECT section, description, avatar FROM sectors WHERE section = ?', code));
});

/* ---------- Indicadores ---------- */

router.use('/questions', authenticate, authz.authorize('catalog.manage'));

async function nextCode(versionId, section, category) {
  const prefix = `${section === 'All' ? 'CG' : section}-${category}`;
  const n = (await db.one(
    'SELECT count(*) AS n FROM questions WHERE versionId = ? AND section = ? AND category = ?',
    versionId,
    section,
    category,
  )).n;
  let code = `${prefix}${String(n + 1).padStart(2, '0')}`;
  let extra = n + 2;
  while (await db.one('SELECT id FROM questions WHERE versionId = ? AND code = ?', versionId, code))
    code = `${prefix}${String(extra++).padStart(2, '0')}`;
  return code;
}

/**
 * Cada indicador tem **suas** alternativas: nome, descrição e pontos vêm do indicador, não de
 * uma lista universal de níveis. "Não se aplica" não é nível de maturidade e não entra aqui.
 */
function validateQuestion(q) {
  if (!q || !q.title || !q.description || !q.category) throw badRequest('título, descrição e categoria são obrigatórios');
  if (!CATEGORIES.includes(q.category)) throw badRequest('categoria inválida');
  if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 6) throw badRequest('o indicador deve ter de 2 a 6 respostas');
  const names = [];
  let mandatoryCount = 0;
  for (const a of q.answers) {
    const title = String(a.title ?? '').trim();
    if (!title) throw badRequest('o nome do nível é obrigatório');
    if (/^n[ãa]o\s*se\s*aplica$/i.test(title))
      throw badRequest('"Não se aplica" é decisão de aplicabilidade e não um nível de maturidade');
    const key = title.toLowerCase();
    if (names.includes(key)) throw badRequest(`nível repetido no mesmo indicador: ${title}`);
    names.push(key);
    const points = Number(a.points);
    if (!Number.isFinite(points) || points < 0) throw badRequest('pontuação inválida');
    if (!a.description) throw badRequest('descrição da resposta é obrigatória');
    if (a.mandatory) mandatoryCount += 1;
  }
  if (mandatoryCount > 1) throw badRequest('só pode haver um nível mínimo obrigatório por indicador');
}

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

router.post('/questions/section/:section', async (req, res) => {
  const section = req.params.section;
  if (!await db.one('SELECT section FROM sectors WHERE section = ?', section)) throw notFound('sector not found');
  const body = Array.isArray(req.body) ? req.body : [req.body];
  const versionId = (body[0] && body[0].versionId) || (req.query.versionId || '').trim() || null;
  const version = await assertEditableVersion(versionId);
  body.forEach(validateQuestion);
  // Sequencial dentro da transação: a conexão é única e não aceita consultas em paralelo.
  const created = await db.transaction(async () => {
    const result = [];
    for (const q of body) {
      const id = db.uuid();
      const levels = q.answers.map((a, index) => ({
        title: String(a.title).trim(),
        points: Number(a.points),
        description: String(a.description).trim(),
        mandatory: !!a.mandatory,
        position: Number.isFinite(Number(a.position)) ? Number(a.position) : index + 1,
      }));
      const hasMandatory = levels.some((a) => a.mandatory) || !!q.hasMandatory;
      const maxPoints = levels.reduce((acc, a) => Math.max(acc, a.points), 0);
      const topic = q.topic || q.subcategory || null;
      const position = ((await db.one('SELECT max(position) AS p FROM questions WHERE versionId = ?', version.id)).p || 0) + 1;
      await db.run(
        `INSERT INTO questions (id, versionId, code, codeOriginal, section, title, description, verification, category, subcategory, topic,
                                ods, maxPoints, hasMandatory, position, origin, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        version.id,
        q.code ? String(q.code).trim() : await nextCode(version.id, section, q.category),
        q.codeOriginal ? String(q.codeOriginal).trim() : null,
        section,
        q.title.trim(),
        q.description.trim(),
        q.verification ? String(q.verification).trim() : null,
        q.category,
        topic,
        topic,
        q.ods ? String(q.ods).trim() : null,
        maxPoints,
        hasMandatory ? 1 : 0,
        position,
        version.origin === 'official' ? 'official' : 'demo',
        db.now(),
      );
      let mandatoryAnswerId = null;
      for (const a of levels) {
        const answerId = db.uuid();
        await db.run(
          'INSERT INTO answers (id, questionId, title, points, description, mandatory, position, slug, presentation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          answerId,
          id,
          a.title,
          a.points,
          a.description,
          a.mandatory ? 1 : 0,
          a.position,
          slugify(a.title),
          slugify(a.title),
        );
        if (a.mandatory) mandatoryAnswerId = answerId;
      }
      if (mandatoryAnswerId) await db.run('UPDATE questions SET mandatoryAnswerId = ? WHERE id = ?', mandatoryAnswerId, id);
      const row = await db.one('SELECT * FROM questions WHERE id = ?', id);
      await attachQuestionToReports(row);
      await authz.audit(req, 'catalog.question.create', { entity: 'questions', entityId: id, details: { versionId: version.id, code: row.code } });
      result.push(await ser.question(row));
    }
    return result;
  });
  res.status(201).json(created);
});

router.patch('/questions/answer/:questionId/:answerId', async (req, res) => {
  const a = await db.one('SELECT * FROM answers WHERE id = ? AND questionId = ?', req.params.answerId, req.params.questionId);
  if (!a) throw notFound('answer not found');
  const owner = await db.one('SELECT versionId FROM questions WHERE id = ?', a.questionId);
  await assertEditableVersion(owner ? owner.versionId : null);
  const { points, description, mandatory } = req.body || {};
  await db.run(
    'UPDATE answers SET points = ?, description = ?, mandatory = ? WHERE id = ?',
    points !== undefined ? Number(points) : a.points,
    description !== undefined ? String(description) : a.description,
    mandatory !== undefined ? (mandatory ? 1 : 0) : a.mandatory,
    a.id,
  );
  if (mandatory) await db.run('UPDATE answers SET mandatory = 0 WHERE questionId = ? AND id <> ?', a.questionId, a.id);
  const minimum = await db.one('SELECT id FROM answers WHERE questionId = ? AND mandatory = 1', a.questionId);
  const maxPoints = (await db.one('SELECT max(points) AS p FROM answers WHERE questionId = ?', a.questionId)).p || 0;
  await db.run(
    'UPDATE questions SET hasMandatory = ?, mandatoryAnswerId = ?, maxPoints = ? WHERE id = ?',
    minimum ? 1 : 0,
    minimum ? minimum.id : null,
    maxPoints,
    a.questionId,
  );
  await authz.audit(req, 'catalog.answer.update', {
    entity: 'answers',
    entityId: a.id,
    details: { before: { points: a.points, mandatory: a.mandatory }, after: { points, mandatory } },
  });
  res.json(ser.answer(await db.one('SELECT * FROM answers WHERE id = ?', a.id)));
});

router.delete('/questions/answer/:answerId', async (req, res) => {
  const a = await db.one('SELECT * FROM answers WHERE id = ?', req.params.answerId);
  if (!a) throw notFound('answer not found');
  const owner = await db.one('SELECT versionId FROM questions WHERE id = ?', a.questionId);
  await assertEditableVersion(owner ? owner.versionId : null);
  // Histórico de avaliação não é apagado por edição administrativa (verificado antes de tudo).
  const inUse = (await db.one('SELECT count(*) AS n FROM question_reports WHERE selectedAnswerId = ?', a.id)).n;
  const inVersions = (await db.one('SELECT count(*) AS n FROM item_answer_versions WHERE selectedAnswerId = ?', a.id)).n;
  if (inUse || inVersions)
    throw conflict('esta alternativa já foi escolhida em avaliações e não pode ser excluída; publique uma nova versão do catálogo');
  if ((await db.one('SELECT count(*) AS n FROM answers WHERE questionId = ?', a.questionId)).n <= 2) throw badRequest('o indicador deve manter ao menos 2 respostas');
  await db.transaction(async () => {
    // O indicador aponta para o nível mínimo obrigatório: solta a referência antes de excluir
    // e recalcula mínimo e máximo com o que sobrou.
    await db.run('UPDATE questions SET mandatoryAnswerId = NULL WHERE mandatoryAnswerId = ?', a.id);
    await db.run('DELETE FROM answers WHERE id = ?', a.id);
    const minimum = await db.one('SELECT id FROM answers WHERE questionId = ? AND mandatory = 1', a.questionId);
    const maxPoints = (await db.one('SELECT max(points) AS p FROM answers WHERE questionId = ?', a.questionId)).p || 0;
    await db.run(
      'UPDATE questions SET hasMandatory = ?, mandatoryAnswerId = ?, maxPoints = ? WHERE id = ?',
      minimum ? 1 : 0,
      minimum ? minimum.id : null,
      maxPoints,
      a.questionId,
    );
  });
  await authz.audit(req, 'catalog.answer.delete', { entity: 'answers', entityId: a.id, details: { questionId: a.questionId } });
  res.json({ id: a.id, deleted: true });
});

/** "Deletar caderno": remove o caderno setorial e seus indicadores. */
router.delete('/questions/section/:section', async (req, res) => {
  const section = req.params.section;
  if (section === 'All') throw badRequest('o Caderno Geral não pode ser removido');
  if (!await db.one('SELECT section FROM sectors WHERE section = ?', section)) throw notFound('sector not found');
  if ((await db.one('SELECT count(*) AS n FROM companies WHERE section = ? AND deletedAt IS NULL', section)).n > 0)
    throw conflict('existem empresas vinculadas a esse caderno setorial');
  const usedInCycles = (await db.one(
    `SELECT count(*) AS n FROM question_reports qr JOIN questions q ON q.id = qr.questionId WHERE q.section = ?`,
    section,
  )).n;
  if (usedInCycles) throw conflict('este caderno já foi aplicado em avaliações e não pode ser excluído');
  await db.transaction(async () => {
    await db.run('UPDATE questions SET mandatoryAnswerId = NULL, hasMandatory = 0 WHERE section = ?', section);
    await db.run('DELETE FROM answers WHERE questionId IN (SELECT id FROM questions WHERE section = ?)', section);
    await db.run('DELETE FROM questions WHERE section = ?', section);
    await db.run('DELETE FROM sectors WHERE section = ?', section);
  });
  await authz.audit(req, 'catalog.section.delete', { entity: 'sectors', entityId: section });
  res.json({ section, deleted: true });
});

router.patch('/questions/:id', async (req, res) => {
  const q = await db.one('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!q) throw notFound('question not found');
  await assertEditableVersion(q.versionId);
  const { title, description } = req.body || {};
  await db.run('UPDATE questions SET title = ?, description = ? WHERE id = ?', title ? String(title).trim() : q.title, description ? String(description).trim() : q.description, q.id);
  res.json(await ser.question(await db.one('SELECT * FROM questions WHERE id = ?', q.id)));
});

router.delete('/questions/:id', async (req, res) => {
  const q = await db.one('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!q) throw notFound('question not found');
  await assertEditableVersion(q.versionId);
  // Antes, a cascata apagava os itens de relatório junto com o indicador (diagnóstico A15).
  const usedInCycles = (await db.one('SELECT count(*) AS n FROM question_reports WHERE questionId = ?', q.id)).n;
  if (usedInCycles)
    throw conflict('este indicador já integra avaliações e não pode ser excluído; publique uma nova versão do catálogo');
  await db.transaction(async () => {
    await db.run('UPDATE questions SET mandatoryAnswerId = NULL, hasMandatory = 0 WHERE id = ?', q.id);
    await db.run('DELETE FROM answers WHERE questionId = ?', q.id);
    await db.run('DELETE FROM questions WHERE id = ?', q.id);
  });
  await authz.audit(req, 'catalog.question.delete', { entity: 'questions', entityId: q.id });
  res.json({ id: q.id, deleted: true });
});

module.exports = router;
