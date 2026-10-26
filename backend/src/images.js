/**
 * Imagens enviadas pelos usuários (fotos de perfil e logos de empresa): validação do conteúdo
 * real, remoção de metadados e armazenamento.
 *
 * - **Tipo real** pela assinatura dos bytes (JPEG, PNG, WebP) — a extensão e o `mimetype`
 *   informados pelo navegador não são considerados.
 * - **Integridade**: a estrutura de blocos/segmentos do formato é percorrida até o fim; arquivo
 *   truncado ou com blocos inconsistentes é recusado.
 * - **Dimensões** lidas do cabeçalho do formato e limitadas.
 * - **Metadados removidos** (EXIF — inclusive GPS —, XMP, comentários, textos): a foto publicada
 *   não carrega dados além da imagem.
 * - **Armazenamento** em `static/<tipo>/<128 bits aleatórios>.<ext>`: nome gerado pelo servidor
 *   (nada vindo do cliente entra no caminho), servido com `nosniff`; só o caminho vai para o
 *   banco (`users.avatar`, `companies.avatar`). SVG não é aceito (pode conter script). Nenhum
 *   conteúdo enviado é executado.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { badRequest } = require('./http');

/** Tipos de imagem: diretório e dimensões aceitas (o tamanho em bytes vem do `config`). */
const KINDS = {
  avatar: { dir: 'avatars', min: 32, max: 4096 },
  logo: { dir: 'logos', min: 16, max: 4096 },
};
const storedPattern = (dir) => new RegExp(`^static/${dir}/[0-9a-f]{32}\\.(jpg|png|webp)$`);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function detect(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/* ------------------------------------------------------------------ PNG */

const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function png(buf) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let ended = false;
  const kept = [buf.subarray(0, 8)];
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (!/^[A-Za-z]{4}$/.test(type) || end > buf.length) throw badRequest('imagem PNG corrompida');
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    }
    if (!PNG_DROP.has(type)) kept.push(buf.subarray(offset, end));
    offset = end;
    if (type === 'IEND') {
      ended = true;
      break;
    }
  }
  if (!ended || !width || !height) throw badRequest('imagem PNG incompleta');
  return { width, height, clean: Buffer.concat(kept) };
}

/* ------------------------------------------------------------------ JPEG */

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function jpg(buf) {
  let offset = 2;
  let width = 0;
  let height = 0;
  const kept = [buf.subarray(0, 2)];
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) throw badRequest('imagem JPEG corrompida');
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1; // preenchimento
      continue;
    }
    const length = buf.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > buf.length) throw badRequest('imagem JPEG corrompida');
    if (SOF.has(marker)) {
      height = buf.readUInt16BE(offset + 5);
      width = buf.readUInt16BE(offset + 7);
    }
    if (marker === 0xda) {
      // Início dos dados da imagem: daqui até o fim (EOI) não há metadados a remover.
      const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
      if (eoi < end) throw badRequest('imagem JPEG incompleta');
      kept.push(buf.subarray(offset, eoi + 2));
      if (!width || !height) throw badRequest('imagem JPEG sem dimensões');
      return { width, height, clean: Buffer.concat(kept) };
    }
    // APP1–APP13 e APP15 (EXIF, XMP, IPTC…) e comentários saem; APP0 (JFIF) e APP14 (Adobe) ficam.
    const drop = (marker >= 0xe1 && marker <= 0xed) || marker === 0xef || marker === 0xfe;
    if (!drop) kept.push(buf.subarray(offset, end));
    offset = end;
  }
  throw badRequest('imagem JPEG incompleta');
}

/* ------------------------------------------------------------------ WebP */

function webp(buf) {
  const riffEnd = 8 + buf.readUInt32LE(4);
  if (riffEnd > buf.length) throw badRequest('imagem WebP incompleta');
  let offset = 12;
  let width = 0;
  let height = 0;
  const kept = [];
  let vp8x = null;
  while (offset + 8 <= riffEnd) {
    const type = buf.toString('latin1', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const data = offset + 8;
    const end = data + size + (size % 2);
    if (data + size > riffEnd) throw badRequest('imagem WebP corrompida');
    if (type === 'VP8X') {
      width = 1 + buf.readUIntLE(data + 4, 3);
      height = 1 + buf.readUIntLE(data + 7, 3);
    } else if (type === 'VP8 ' && !width) {
      if (buf[data + 3] !== 0x9d || buf[data + 4] !== 0x01 || buf[data + 5] !== 0x2a) throw badRequest('imagem WebP corrompida');
      width = buf.readUInt16LE(data + 6) & 0x3fff;
      height = buf.readUInt16LE(data + 8) & 0x3fff;
    } else if (type === 'VP8L' && !width) {
      if (buf[data] !== 0x2f) throw badRequest('imagem WebP corrompida');
      const bits = buf.readUInt32LE(data + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
    }
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(offset, Math.min(end, riffEnd)));
      if (type === 'VP8X') vp8x = chunk;
      kept.push(chunk);
    }
    offset = end;
  }
  if (!width || !height) throw badRequest('imagem WebP sem dimensões');
  if (vp8x) vp8x[8] &= ~(0x08 | 0x04); // sem as marcas de EXIF e XMP
  const body = Buffer.concat(kept);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return { width, height, clean: Buffer.concat([header, body]) };
}

/** Valida e limpa a imagem enviada. Devolve `{ ext, width, height, buffer }`. */
function inspect(buffer, kind = 'avatar') {
  const LIMITS = KINDS[kind];
  if (!buffer || !buffer.length) throw badRequest('envie uma imagem');
  const ext = detect(buffer);
  if (!ext) throw badRequest('formato não suportado; envie JPEG, PNG ou WebP');
  let parsed;
  try {
    parsed = { jpg, png, webp }[ext](buffer);
  } catch (err) {
    if (err.statusCode) throw err;
    throw badRequest('imagem corrompida ou incompleta');
  }
  const { width, height } = parsed;
  if (width < LIMITS.min || height < LIMITS.min) throw badRequest(`a imagem deve ter ao menos ${LIMITS.min}×${LIMITS.min} pixels`);
  if (width > LIMITS.max || height > LIMITS.max) throw badRequest(`a imagem pode ter até ${LIMITS.max}×${LIMITS.max} pixels`);
  return { ext, width, height, buffer: parsed.clean };
}

/** Grava a imagem já validada; devolve o caminho a guardar no banco. */
function store({ ext, buffer }, kind = 'avatar') {
  const { dir } = KINDS[kind];
  const folder = path.join(config.staticDir, dir);
  fs.mkdirSync(folder, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(folder, name), buffer, { flag: 'wx' });
  return `static/${dir}/${name}`;
}

/**
 * Apaga uma imagem gravada por este módulo. Qualquer outro valor — inclusive URLs externas de
 * logos antigas — é ignorado: nada fora do diretório do tipo é tocado.
 */
function discard(stored, kind = 'avatar') {
  const { dir } = KINDS[kind];
  if (!isStored(stored, kind)) return;
  fs.rm(path.join(config.staticDir, dir, path.basename(stored)), { force: true }, () => {});
}

const isStored = (value, kind = 'avatar') => storedPattern(KINDS[kind].dir).test(String(value || ''));

/** Caminho local de uma imagem gravada (para quem precisa ler o arquivo, ex.: relatório em PDF). */
const localPath = (stored, kind) => (isStored(stored, kind) ? path.join(config.staticDir, KINDS[kind].dir, path.basename(stored)) : null);

module.exports = { inspect, store, discard, isStored, localPath, KINDS };
