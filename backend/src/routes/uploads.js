const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const db = require('../db');
const { badRequest, conflict, notFound, forbidden } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');

const router = express.Router();

const memory = (limit) => multer({ storage: multer.memoryStorage(), limits: { fileSize: limit } }).single('file');
// Mesma restrição comunicada pelo original: sem espaços ou caracteres especiais no nome.
const SAFE_NAME = /^[\w.\-()À-ÿ]+$/;
/** Executáveis e scripts são recusados (especificação § 10). */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.com', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.scr', '.jar', '.vbs', '.js', '.jse', '.wsf', '.dll', '.apk', '.app',
]);

router.post('/uploads/sectorCovers', authenticate, authz.authorize('catalog.manage'), memory(config.maxCoverBytes), (req, res) => {
  if (!req.file) throw badRequest('arquivo é obrigatório');
  if (!/^image\//.test(req.file.mimetype)) throw badRequest('a capa deve ser uma imagem');
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  if (BLOCKED_EXTENSIONS.has(ext)) throw badRequest('tipo de arquivo não permitido');
  const name = `caderno_${Date.now()}${ext}`;
  const dir = path.join(config.staticDir, 'sectorCovers');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), req.file.buffer);
  res.status(201).json({ filePath: `static/sectorCovers/${name}` });
});

/**
 * Arquivo de evidência da empresa.
 *
 * O campo `companyId` pode trazer o id do indicador (comportamento do front original), então a
 * empresa é resolvida antes da autorização. A partir daqui o envio obedece ao escopo: perfil com
 * vínculo, ciclo em preenchimento e, para colaborador, apenas indicador atribuído. O auditor não
 * envia arquivo em nome da empresa — a evidência da auditoria é registrada na avaliação do item.
 */
router.post('/uploads/companyFile', authenticate, memory(config.maxCompanyFileBytes), (req, res) => {
  if (!req.file) throw badRequest('arquivo é obrigatório');
  const informed = (req.body || {}).companyId;
  let companyId = informed;
  let questionReport = null;
  if (!db.one('SELECT id FROM companies WHERE id = ? AND deletedAt IS NULL', companyId)) {
    questionReport = db.one(
      `SELECT qr.id, qr.answererId, r.companyId, r.status
         FROM question_reports qr JOIN reports r ON r.id = qr.reportId WHERE qr.id = ?`,
      informed,
    );
    if (!questionReport) throw notFound('company not found');
    companyId = questionReport.companyId;
  }

  const auditorScope = questionReport
    ? authz.can(req.principal, 'audit.evaluate', { companyId, reportId: db.one('SELECT reportId FROM question_reports WHERE id = ?', questionReport.id).reportId })
    : { ok: false };
  if (auditorScope.ok) {
    req.actorRole = auditorScope.role; // evidência da auditoria
  } else {
    authz.assertCan(req, 'cycle.attach', { companyId });
    if (questionReport) authz.assertItemScope(req, questionReport, { write: true });
    const report = db.one('SELECT status FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);
    if (report && !authz.isOpenCycle(report))
      throw forbidden('o ciclo está bloqueado para envio de arquivos; solicite o retorno do processo');
  }

  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  if (!SAFE_NAME.test(name)) throw badRequest('o nome do arquivo contém caracteres não permitidos');
  if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) throw badRequest('tipo de arquivo não permitido');
  const url = `uploads/companyFiles/${companyId}/${name}`;
  if (db.one('SELECT id FROM company_files WHERE companyId = ? AND name = ?', companyId, name))
    throw conflict('já existe um arquivo com esse nome');
  const dir = path.join(config.uploadsDir, 'companyFiles', companyId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), req.file.buffer);
  db.run(
    'INSERT INTO company_files (id, companyId, name, url, fileType, inGed, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)',
    db.uuid(),
    companyId,
    name,
    url,
    req.file.mimetype,
    db.now(),
  );
  authz.audit(req, 'file.upload', { entity: 'company_files', entityId: name, companyId });
  res.status(201).json({ fileType: req.file.mimetype, name, url });
});

/**
 * Download autenticado. O escopo é verificado aqui também (não só na tela): além do vínculo
 * com a empresa, o colaborador só baixa arquivo do GED ou vinculado a indicador atribuído a ele.
 */
router.get('/uploads/companyFiles/:companyId/:name', authenticate, (req, res) => {
  const companyId = req.params.companyId;
  const name = path.basename(req.params.name);
  const file = db.one('SELECT * FROM company_files WHERE companyId = ? AND name = ?', companyId, name);
  if (!file) throw notFound('arquivo não encontrado');

  const company = authz.can(req.principal, 'cycle.read', { companyId });
  if (company.ok) req.actorRole = company.role;
  else {
    // Auditor/supervisor designado em algum ciclo da empresa.
    const cycles = db.all('SELECT id FROM reports WHERE companyId = ?', companyId);
    const allowed = cycles.some((c) => authz.can(req.principal, 'cycle.read.professional', { companyId, reportId: c.id }).ok);
    if (!allowed) throw forbidden('você não tem acesso aos arquivos desta empresa');
    req.actorRole = req.principal.roles.includes('AUDITOR') ? 'AUDITOR' : 'SUPERVISOR';
  }

  if (req.actorRole === 'EMPLOYEE' && !file.inGed) {
    const linked = db.one(
      `SELECT qrf.id FROM question_report_files qrf JOIN question_reports qr ON qr.id = qrf.questionReportId
        WHERE qrf.fileId = ? AND qr.answererId = ?`,
      file.id,
      req.principal.user.id,
    );
    if (!linked) throw forbidden('você só tem acesso aos arquivos dos indicadores atribuídos a você');
  }

  const diskPath = path.join(config.uploadsDir, 'companyFiles', companyId, name);
  if (!fs.existsSync(diskPath)) throw notFound('arquivo não encontrado');
  res.download(diskPath, name);
});

module.exports = router;
