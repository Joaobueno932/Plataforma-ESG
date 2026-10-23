/**
 * Validação de arquivos enviados: extensão permitida **e** conteúdo compatível com ela.
 *
 * A extensão sozinha não basta (um executável renomeado para .pdf continua executável), e o
 * `Content-Type` vem do navegador — não é prova de nada. Aqui o começo do arquivo é conferido
 * contra a assinatura esperada para o tipo declarado pela extensão.
 */
const crypto = require('node:crypto');
const path = require('node:path');

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Tipos aceitos como evidência ou documento da empresa, com a assinatura de cada um. */
const TYPES = {
  '.pdf': { mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  '.png': { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  '.jpg': { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  '.jpeg': { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  '.gif': { mime: 'image/gif', magic: [[0x47, 0x49, 0x46, 0x38]] },
  '.webp': { mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [ZIP] },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: [ZIP] },
  '.pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', magic: [ZIP] },
  '.odt': { mime: 'application/vnd.oasis.opendocument.text', magic: [ZIP] },
  '.ods': { mime: 'application/vnd.oasis.opendocument.spreadsheet', magic: [ZIP] },
  '.doc': { mime: 'application/msword', magic: [OLE] },
  '.xls': { mime: 'application/vnd.ms-excel', magic: [OLE] },
  '.ppt': { mime: 'application/vnd.ms-powerpoint', magic: [OLE] },
  '.csv': { mime: 'text/csv', text: true },
  '.txt': { mime: 'text/plain', text: true },
};

/** Assinaturas de executáveis e scripts, recusadas qualquer que seja a extensão. */
const EXECUTABLE = [
  [0x4d, 0x5a], // MZ — PE/DOS (Windows)
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xcf, 0xfa, 0xed, 0xfe], // Mach-O
  [0xfe, 0xed, 0xfa, 0xce],
  [0x23, 0x21], // #! script
];

const startsWith = (buffer, bytes) => bytes.every((byte, i) => buffer[i] === byte);

/** Texto puro: sem byte nulo nos primeiros 8 KiB. */
const looksLikeText = (buffer) => !buffer.subarray(0, 8192).includes(0x00);

/**
 * @returns {{ok: true, ext: string, mime: string} | {ok: false, reason: string}}
 */
function inspect(name, buffer) {
  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return { ok: false, reason: `tipo de arquivo não permitido (${ext || 'sem extensão'}); envie PDF, imagem, documento, planilha ou texto` };
  if (!buffer || !buffer.length) return { ok: false, reason: 'o arquivo está vazio' };
  if (EXECUTABLE.some((sig) => startsWith(buffer, sig))) return { ok: false, reason: 'arquivos executáveis não são aceitos' };
  if (type.text) {
    if (!looksLikeText(buffer)) return { ok: false, reason: `o conteúdo não corresponde a um arquivo ${ext}` };
  } else if (!type.magic.some((sig) => startsWith(buffer, sig))) {
    return { ok: false, reason: `o conteúdo não corresponde a um arquivo ${ext}` };
  }
  return { ok: true, ext, mime: type.mime };
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Nome da versão seguinte de um arquivo, preservando o anterior: `licenca.pdf` → `licenca_v2.pdf`. */
function versionedName(name, version) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).replace(/_v\d+$/, '');
  return `${base}_v${version}${ext}`;
}

module.exports = { TYPES, inspect, sha256, versionedName };
