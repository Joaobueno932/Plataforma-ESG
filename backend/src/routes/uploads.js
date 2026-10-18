const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const db = require('../db');
const { badRequest, conflict, notFound } = require('../http');
const { authenticate, requireRoles } = require('../auth');
const { assertCompanyAccess } = require('../services');

const router = express.Router();

const memory = (limit) => multer({ storage: multer.memoryStorage(), limits: { fileSize: limit } }).single('file');
// Mesma restrição comunicada pelo original: sem espaços ou caracteres especiais no nome.
const SAFE_NAME = /^[\w.\-()À-ÿ]+$/;

router.post('/uploads/sectorCovers', authenticate, requireRoles('ADMIN'), memory(config.maxCoverBytes), (req, res) => {
  if (!req.file) throw badRequest('arquivo é obrigatório');
  if (!/^image\//.test(req.file.mimetype)) throw badRequest('a capa deve ser uma imagem');
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const name = `caderno_${Date.now()}${ext}`;
  const dir = path.join(config.staticDir, 'sectorCovers');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), req.file.buffer);
  res.status(201).json({ filePath: `static/sectorCovers/${name}` });
});

/**
 * Arquivo de evidência da empresa. O front original às vezes envia o id da
 * questão no campo companyId (envio de evidência pelo auditor); ambos são aceitos.
 */
router.post('/uploads/companyFile', authenticate, memory(config.maxCompanyFileBytes), (req, res) => {
  if (!req.file) throw badRequest('arquivo é obrigatório');
  let companyId = (req.body || {}).companyId;
  if (!db.one('SELECT id FROM companies WHERE id = ?', companyId)) {
    const viaQr = db.one('SELECT r.companyId FROM question_reports qr JOIN reports r ON r.id = qr.reportId WHERE qr.id = ?', companyId);
    if (!viaQr) throw notFound('company not found');
    companyId = viaQr.companyId;
  }
  assertCompanyAccess(req.user, companyId);
  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  if (!SAFE_NAME.test(name)) throw badRequest('o nome do arquivo contém caracteres não permitidos');
  const url = `uploads/companyFiles/${companyId}/${name}`;
  if (db.one('SELECT id FROM company_files WHERE companyId = ? AND name = ?', companyId, name)) throw conflict('já existe um arquivo com esse nome');
  const dir = path.join(config.uploadsDir, 'companyFiles', companyId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), req.file.buffer);
  db.run('INSERT INTO company_files (id, companyId, name, url, fileType, inGed, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)', db.uuid(), companyId, name, url, req.file.mimetype, db.now());
  res.status(201).json({ fileType: req.file.mimetype, name, url });
});

/** Download autenticado (o front busca `${API}/${url}` com Bearer). */
router.get('/uploads/companyFiles/:companyId/:name', authenticate, (req, res) => {
  assertCompanyAccess(req.user, req.params.companyId);
  const file = path.join(config.uploadsDir, 'companyFiles', req.params.companyId, path.basename(req.params.name));
  if (!fs.existsSync(file)) throw notFound('arquivo não encontrado');
  res.download(file, path.basename(file));
});

module.exports = router;
