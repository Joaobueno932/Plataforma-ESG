const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const db = require('../db');
const { badRequest, conflict, notFound, forbidden, asyncRouter } = require('../http');
const { authenticate } = require('../auth');
const authz = require('../authz');
const files = require('../files');
const limiter = require('../ratelimit');

const router = asyncRouter();

const memory = (limit) => multer({ storage: multer.memoryStorage(), limits: { fileSize: limit } }).single('file');
// Mesma restrição comunicada pelo original: sem espaços ou caracteres especiais no nome.
const SAFE_NAME = /^[\w.\-()À-ÿ]+$/;
/** Executáveis e scripts são recusados (especificação § 10). */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.com', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.scr', '.jar', '.vbs', '.js', '.jse', '.wsf', '.dll', '.apk', '.app',
]);

router.post('/uploads/sectorCovers', authenticate, authz.authorize('catalog.manage'), memory(config.maxCoverBytes), async (req, res) => {
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

const FILE_KINDS = ['evidencia', 'cadastral'];

function parseValidity(body) {
  const indefinite = String(body.indefiniteValidity ?? '') === 'true';
  if (indefinite) return { validUntil: null, indefinite: 1 };
  if (!body.validUntil) return { validUntil: null, indefinite: 0 };
  const parsed = new Date(body.validUntil);
  if (Number.isNaN(parsed.getTime())) throw badRequest('validade inválida; use AAAA-MM-DD ou marque prazo indeterminado');
  return { validUntil: parsed.toISOString(), indefinite: 0 };
}

/**
 * Arquivo da empresa (evidência ou documento cadastral) ou da auditoria.
 *
 * O campo `companyId` pode trazer o id do indicador (comportamento do front original), então a
 * empresa é resolvida antes da autorização. A partir daqui o envio obedece ao escopo: perfil com
 * vínculo, ciclo em preenchimento e, para colaborador, apenas indicador atribuído.
 *
 * O auditor designado envia arquivo **da auditoria** (`kind = auditoria`), com autoria própria
 * e visibilidade restrita: ele não envia em nome da empresa.
 *
 * Campos opcionais: `description`, `validUntil` (AAAA-MM-DD) ou `indefiniteValidity=true`,
 * `kind` (evidencia | cadastral) e `replacesFileId` (nova versão de um arquivo existente).
 */
router.post('/uploads/companyFile', authenticate, (req, _res, next) => {
  // Limite por pessoa, antes de receber o arquivo na memória.
  try {
    limiter.hit('upload', req, { extra: req.principal.user.id, max: config.rateLimit.uploadMax, windowMs: 60 * 1000 });
    next();
  } catch (err) {
    next(err);
  }
}, memory(config.maxCompanyFileBytes), async (req, res) => {
  if (!req.file) throw badRequest('arquivo é obrigatório');
  const body = req.body || {};
  const informed = body.questionReportId || body.companyId;
  let companyId = informed;
  let questionReport = null;
  if (!(await db.one('SELECT id FROM companies WHERE id = ? AND deletedAt IS NULL', companyId))) {
    questionReport = await db.one(
      `SELECT qr.id, qr.reportId, qr.answererId, r.companyId, r.status
         FROM question_reports qr JOIN reports r ON r.id = qr.reportId WHERE qr.id = ?`,
      informed,
    );
    if (!questionReport) throw notFound('company not found');
    companyId = questionReport.companyId;
  }

  const auditorScope = questionReport
    ? await authz.can(req.principal, 'audit.evaluate', { companyId, reportId: questionReport.reportId })
    : { ok: false };
  const asAuditor = auditorScope.ok;
  if (asAuditor) {
    req.actorRole = auditorScope.role;
    if (questionReport.status !== 'Auditing') throw forbidden('o envio de arquivos da auditoria só ocorre com o ciclo em auditoria');
  } else {
    await authz.assertCan(req, 'cycle.attach', { companyId });
    if (questionReport) authz.assertItemScope(req, questionReport, { write: true });
    const report = await db.one('SELECT status FROM reports WHERE companyId = ? ORDER BY cycle DESC LIMIT 1', companyId);
    if (report && !authz.isOpenCycle(report))
      throw forbidden('o ciclo está bloqueado para envio de arquivos; solicite o retorno do processo');
  }

  let name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  if (!SAFE_NAME.test(name)) throw badRequest('o nome do arquivo contém caracteres não permitidos');
  if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) throw badRequest('tipo de arquivo não permitido');
  const checked = files.inspect(name, req.file.buffer);
  if (!checked.ok) throw badRequest(checked.reason);

  const kind = asAuditor ? 'auditoria' : FILE_KINDS.includes(body.kind) ? body.kind : 'evidencia';
  const description = String(body.description ?? '').trim().slice(0, 500) || null;
  const { validUntil, indefinite } = parseValidity(body);

  // Nova versão: o arquivo anterior continua existindo (versões enviadas apontam para ele).
  let version = 1;
  let replacesFileId = null;
  if (body.replacesFileId) {
    const previous = await db.one('SELECT id, name, version, kind FROM company_files WHERE id = ? AND companyId = ?', body.replacesFileId, companyId);
    if (!previous) throw badRequest('arquivo a substituir não encontrado');
    if (previous.kind === 'auditoria' && !asAuditor) throw forbidden('arquivos da auditoria não são substituídos pela empresa');
    version = (previous.version || 1) + 1;
    replacesFileId = previous.id;
    if (name === previous.name || (await db.one('SELECT id FROM company_files WHERE companyId = ? AND name = ?', companyId, name)))
      name = files.versionedName(previous.name, version);
  }
  if (await db.one('SELECT id FROM company_files WHERE companyId = ? AND name = ?', companyId, name))
    throw conflict('já existe um arquivo com esse nome');

  const url = `uploads/companyFiles/${companyId}/${name}`;
  const dir = path.join(config.uploadsDir, 'companyFiles', companyId);
  fs.mkdirSync(dir, { recursive: true });
  const diskPath = path.join(dir, name);
  // Grava em arquivo temporário (nome único por requisição): um envio interrompido não deixa
  // arquivo pela metade e dois envios simultâneos nunca escrevem no mesmo lugar.
  const temp = `${diskPath}.${process.pid}.${crypto.randomUUID()}.part`;
  fs.writeFileSync(temp, req.file.buffer);
  const id = db.uuid();
  // Primeiro o banco reserva o nome (restrição única empresa+nome decide quem venceu); só
  // depois o arquivo vai para o lugar definitivo. Quem perde a corrida apaga só o próprio
  // temporário — nunca o arquivo de quem venceu.
  try {
    await db.run(
      `INSERT INTO company_files (id, companyId, name, url, fileType, sizeBytes, sha256, description, validUntil, indefiniteValidity,
                                  uploadedById, uploadedByRole, version, replacesFileId, kind, visibility, inGed, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      id,
      companyId,
      name,
      url,
      checked.mime,
      req.file.size,
      files.sha256(req.file.buffer),
      description,
      validUntil,
      indefinite,
      req.principal.user.id,
      req.actorRole || null,
      version,
      replacesFileId,
      kind,
      asAuditor ? 'auditoria' : 'empresa',
      db.now(),
    );
  } catch (err) {
    fs.rmSync(temp, { force: true }); // só o temporário desta requisição
    if (err && err.code === 'ER_DUP_ENTRY') throw conflict('já existe um arquivo com esse nome');
    throw err;
  }
  try {
    fs.renameSync(temp, diskPath);
  } catch (err) {
    // Sem arquivo no lugar, o registro não pode ficar: desfaz a reserva do nome.
    fs.rmSync(temp, { force: true });
    await db.run('DELETE FROM company_files WHERE id = ?', id);
    throw err;
  }
  await authz.audit(req, 'file.upload', { entity: 'company_files', entityId: id, companyId, details: { name, kind, version, sizeBytes: req.file.size } });
  res.status(201).json({ id, fileType: checked.mime, name, url, sizeBytes: req.file.size, kind, version, description, validUntil, indefiniteValidity: !!indefinite });
});

/**
 * Download autenticado. O escopo é verificado aqui também (não só na tela): além do vínculo
 * com a empresa, o colaborador só baixa arquivo do GED ou vinculado a indicador atribuído a ele.
 */
router.get('/uploads/companyFiles/:companyId/:name', authenticate, async (req, res) => {
  const companyId = req.params.companyId;
  const name = path.basename(req.params.name);
  const file = await db.one('SELECT * FROM company_files WHERE companyId = ? AND name = ?', companyId, name);
  if (!file) throw notFound('arquivo não encontrado');

  const company = await authz.can(req.principal, 'cycle.read', { companyId });
  if (company.ok) req.actorRole = company.role;
  else {
    // Auditor/supervisor designado em algum ciclo da empresa.
    const cycles = await db.all('SELECT id FROM reports WHERE companyId = ?', companyId);
    let allowed = false;
    for (const cycle of cycles) {
      // eslint-disable-next-line no-await-in-loop
      if ((await authz.can(req.principal, 'cycle.read.professional', { companyId, reportId: cycle.id })).ok) {
        allowed = true;
        break;
      }
    }
    if (!allowed) throw forbidden('você não tem acesso aos arquivos desta empresa');
    req.actorRole = req.principal.roles.includes('AUDITOR') ? 'AUDITOR' : 'SUPERVISOR';
  }

  // Arquivo da auditoria: só auditoria, supervisão e Administração.
  if (file.visibility === 'auditoria' && !['AUDITOR', 'SUPERVISOR', 'ADMIN'].includes(req.actorRole))
    throw forbidden('este arquivo pertence ao registro da auditoria');

  if (req.actorRole === 'EMPLOYEE' && !file.inGed) {
    const linked = await db.one(
      `SELECT qrf.id FROM question_report_files qrf JOIN question_reports qr ON qr.id = qrf.questionReportId
        WHERE qrf.fileId = ? AND qr.answererId = ?`,
      file.id,
      req.principal.user.id,
    );
    if (!linked) throw forbidden('você só tem acesso aos arquivos dos indicadores atribuídos a você');
  }

  const diskPath = path.join(config.uploadsDir, 'companyFiles', companyId, name);
  if (!fs.existsSync(diskPath)) throw notFound('arquivo não encontrado');
  // Sempre como anexo e sem adivinhação de tipo: o navegador não executa o conteúdo.
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  res.download(diskPath, name);
});

module.exports = router;
