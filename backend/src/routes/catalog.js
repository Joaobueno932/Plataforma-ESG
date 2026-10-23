const express = require('express');
const multer = require('multer');
const config = require('../config');
const db = require('../db');
const ser = require('../serializers');
const { badRequest, notFound } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const catalog = require('../catalog/import');

const router = express.Router();
router.use('/catalog', authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }).single('file');
const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

function fileOf(req) {
  if (!req.file) throw badRequest('envie a planilha (.xlsx) no campo "file"');
  if (!/\.xlsx$/i.test(req.file.originalname || '')) throw badRequest('o arquivo deve ser .xlsx');
  if (req.file.mimetype && !XLSX_TYPES.includes(req.file.mimetype)) throw badRequest(`tipo de arquivo não aceito: ${req.file.mimetype}`);
  return { buffer: req.file.buffer, name: Buffer.from(req.file.originalname, 'latin1').toString('utf8') };
}

const versionRow = (v) => ({
  id: v.id,
  label: v.label,
  origin: v.origin,
  status: v.status,
  sourceFile: v.sourceFile,
  sourceHash: v.sourceHash,
  counts: v.counts ? JSON.parse(v.counts) : null,
  notes: v.notes,
  createdAt: v.createdAt,
  publishedAt: v.publishedAt,
  archivedAt: v.archivedAt,
  indicators: db.one('SELECT count(*) AS n FROM questions WHERE versionId = ?', v.id).n,
  levels: db.one('SELECT count(*) AS n FROM answers a JOIN questions q ON q.id = a.questionId WHERE q.versionId = ?', v.id).n,
  cycles: db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', v.id).n,
});

/* ------------------------------------------------------------------ leitura */

router.get('/catalog/versions', authz.authorize('catalog.manage'), (_req, res) => {
  const versions = db.all('SELECT * FROM catalog_versions ORDER BY createdAt DESC').map(versionRow);
  const active = catalog.activeVersion();
  res.json({ active: active ? active.id : null, data: versions });
});

router.get('/catalog/versions/:id', authz.authorize('catalog.manage'), (req, res) => {
  const version = catalog.versionById(req.params.id);
  if (!version) throw notFound('versão de catálogo não encontrada');
  const imports = db
    .all('SELECT id, sourceFile, sourceHash, startedAt, finishedAt, status, errorCount, warningCount, divergenceCount FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC', version.id)
    .map((row) => ({ ...row }));
  res.json({
    ...versionRow(version),
    sections: db.all('SELECT section, name, position FROM catalog_sections WHERE versionId = ? ORDER BY position', version.id),
    imports,
  });
});

/** Relatório completo da importação (erros, avisos, divergências e conferências). */
router.get('/catalog/versions/:id/report', authz.authorize('catalog.manage'), (req, res) => {
  const row = db.one('SELECT report FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC LIMIT 1', req.params.id);
  if (!row) throw notFound('relatório de importação não encontrado');
  res.json(JSON.parse(row.report));
});

router.get('/catalog/imports', authz.authorize('catalog.manage'), (_req, res) => {
  res.json(
    db
      .all(
        `SELECT i.id, i.versionId, v.label, i.sourceFile, i.sourceHash, i.sourceBytes, i.startedAt, i.finishedAt, i.status,
                i.errorCount, i.warningCount, i.divergenceCount, u.name AS actorName
           FROM catalog_imports i LEFT JOIN catalog_versions v ON v.id = i.versionId
           LEFT JOIN users u ON u.id = i.actorId
          ORDER BY i.startedAt DESC LIMIT 100`,
      )
      .map((row) => ({ ...row })),
  );
});

router.get('/catalog/imports/:id', authz.authorize('catalog.manage'), (req, res) => {
  const row = db.one('SELECT * FROM catalog_imports WHERE id = ?', req.params.id);
  if (!row) throw notFound('importação não encontrada');
  res.json({ ...row, report: JSON.parse(row.report) });
});

/** Indicadores da versão, com as alternativas próprias de cada um. */
router.get('/catalog/versions/:id/indicators', (req, res) => {
  const version = catalog.versionById(req.params.id);
  if (!version) throw notFound('versão de catálogo não encontrada');
  // Catálogo é leitura administrativa; empresas veem os indicadores pelo ciclo.
  authz.assertCan(req, 'catalog.manage');
  const section = (req.query.section || '').trim() || null;
  res.json(catalog.indicatorsOf(version.id, { section }).map(({ question, levels }) => ser.question(question, new Map([[question.id, levels]]))));
});

/** Níveis de maturidade **da versão** — substitui a lista universal de níveis e pontos. */
router.get('/catalog/levels', (req, res) => {
  const version = (req.query.versionId && catalog.versionById(req.query.versionId)) || catalog.activeVersion();
  if (!version) throw notFound('nenhuma versão de catálogo disponível');
  res.json({ versionId: version.id, label: version.label, levels: catalog.levelsOf(version.id) });
});

/* ------------------------------------------------------------------ importação */

/** Prévia: lê, valida e devolve o relatório. Não grava catálogo. */
router.post('/catalog/preview', authz.authorize('catalog.manage'), upload, (req, res) => {
  const file = fileOf(req);
  const result = catalog.preview(file.buffer, { sourceFile: file.name, actorId: req.principal.user.id });
  authz.audit(req, 'catalog.preview', { entity: 'catalog_imports', entityId: result.importId, details: { file: file.name, summary: result.report.summary } });
  res.status(201).json(result);
});

/** Importa como **rascunho** (ainda não vale para ciclos novos). */
router.post('/catalog/imports', authz.authorize('catalog.manage'), upload, (req, res) => {
  const file = fileOf(req);
  const { version, report, reused } = catalog.createDraft(file.buffer, {
    sourceFile: file.name,
    label: req.body ? req.body.label : null,
    actorId: req.principal.user.id,
    force: String((req.body || {}).force) === 'true',
  });
  authz.audit(req, 'catalog.import', { entity: 'catalog_versions', entityId: version.id, details: { file: file.name, reused, summary: report.summary } });
  res.status(reused ? 200 : 201).json({ version: versionRow(version), report, reused });
});

/** Confirmação administrativa: publica o rascunho. */
router.post('/catalog/versions/:id/publish', authz.authorize('catalog.manage'), (req, res) => {
  const acknowledge = (req.body || {}).acknowledge === true;
  const version = catalog.publish(req.params.id, { actorId: req.principal.user.id, acknowledge });
  authz.audit(req, 'catalog.publish', { entity: 'catalog_versions', entityId: version.id, details: { label: version.label, acknowledge } });
  res.status(201).json(versionRow(version));
});

router.delete('/catalog/versions/:id', authz.authorize('catalog.manage'), (req, res) => {
  const result = catalog.discardDraft(req.params.id);
  authz.audit(req, 'catalog.discard', { entity: 'catalog_versions', entityId: req.params.id });
  res.json(result);
});

module.exports = router;
