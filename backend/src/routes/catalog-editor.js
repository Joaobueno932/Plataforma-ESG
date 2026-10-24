/**
 * Editor do catálogo (somente Administração). Toda alteração acontece em uma edição em
 * rascunho; a publicação usa a rota já existente `POST /catalog/versions/:id/publish`.
 */
const db = require('../db');
const ser = require('../serializers');
const { badRequest, asyncRouter } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const editor = require('../catalog/editor');

const router = asyncRouter();
router.use(['/catalog/editions', '/catalog/editor'], authenticate, authz.authorize('catalog.manage'));

const view = async (versionId) => {
  const { version, sections, indicators } = await editor.editorView(versionId);
  return {
    version,
    sections: sections.map((s) => ({
      ...s,
      indicators: indicators.filter((i) => i.question.section === s.section).length,
    })),
    indicators: await Promise.all(indicators.map(({ question, levels }) => ser.question(question, new Map([[question.id, levels]])))),
  };
};

/** Nova edição a partir da versão em vigor (ou da informada). */
router.post('/catalog/editions', async (req, res) => {
  const body = req.body || {};
  const version = await editor.createEdition({ label: body.label, fromVersionId: body.fromVersionId || null, actorId: req.principal.user.id });
  await authz.audit(req, 'catalog.edition', { entity: 'catalog_versions', entityId: version.id, details: { label: version.label, from: body.fromVersionId || 'ativa' } });
  res.status(201).json(await view(version.id));
});

router.get('/catalog/editor/:versionId', async (req, res) => {
  res.json(await view(req.params.versionId));
});

/* ---------- cadernos ---------- */

router.post('/catalog/editor/:versionId/sections', async (req, res) => {
  const section = await editor.addSection(req.params.versionId, req.body || {});
  await authz.audit(req, 'catalog.section.add', { entity: 'catalog_sections', entityId: section.section, details: { versionId: req.params.versionId, name: section.name } });
  res.status(201).json(await view(req.params.versionId));
});

router.patch('/catalog/editor/:versionId/sections/:section', async (req, res) => {
  await editor.updateSection(req.params.versionId, req.params.section, req.body || {});
  await authz.audit(req, 'catalog.section.update', { entity: 'catalog_sections', entityId: req.params.section, details: { versionId: req.params.versionId } });
  res.json(await view(req.params.versionId));
});

router.delete('/catalog/editor/:versionId/sections/:section', async (req, res) => {
  await editor.removeSection(req.params.versionId, req.params.section);
  await authz.audit(req, 'catalog.section.remove', { entity: 'catalog_sections', entityId: req.params.section, details: { versionId: req.params.versionId } });
  res.json(await view(req.params.versionId));
});

router.put('/catalog/editor/:versionId/sections/:section/order', async (req, res) => {
  await editor.reorder(req.params.versionId, req.params.section, (req.body || {}).ids);
  res.json(await view(req.params.versionId));
});

/** Capa do caderno (arquivo enviado por `POST /uploads/sectorCovers`). */
router.put('/catalog/editor/:versionId/sections/:section/cover', async (req, res) => {
  const avatar = String((req.body || {}).avatar || '');
  if (!/^static\/sectorCovers\/[\w.\-]+$/.test(avatar)) throw badRequest('capa inválida; envie a imagem antes');
  const section = await db.one('SELECT name FROM catalog_sections WHERE versionId = ? AND section = ?', req.params.versionId, req.params.section);
  if (!section) throw badRequest('caderno não encontrado nesta edição');
  if (await db.one('SELECT section FROM sectors WHERE section = ?', req.params.section))
    await db.run('UPDATE sectors SET avatar = ? WHERE section = ?', avatar, req.params.section);
  else await db.run('INSERT INTO sectors (section, description, avatar) VALUES (?, ?, ?)', req.params.section, section.name, avatar);
  res.json(await view(req.params.versionId));
});

/* ---------- indicadores e alternativas ---------- */

router.post('/catalog/editor/:versionId/indicators', async (req, res) => {
  const id = await editor.addIndicator(req.params.versionId, req.body || {});
  await authz.audit(req, 'catalog.indicator.add', { entity: 'questions', entityId: id, details: { versionId: req.params.versionId } });
  res.status(201).json({ id, ...(await view(req.params.versionId)) });
});

router.patch('/catalog/editor/indicators/:id', async (req, res) => {
  const question = await db.one('SELECT versionId FROM questions WHERE id = ?', req.params.id);
  await editor.updateIndicator(req.params.id, req.body || {});
  await authz.audit(req, 'catalog.indicator.update', { entity: 'questions', entityId: req.params.id, details: { fields: Object.keys(req.body || {}) } });
  res.json(await view(question.versionId));
});

router.delete('/catalog/editor/indicators/:id', async (req, res) => {
  const question = await db.one('SELECT versionId FROM questions WHERE id = ?', req.params.id);
  await editor.removeIndicator(req.params.id);
  await authz.audit(req, 'catalog.indicator.remove', { entity: 'questions', entityId: req.params.id });
  res.json(await view(question.versionId));
});

module.exports = router;
