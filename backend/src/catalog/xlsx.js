/**
 * Leitor mínimo de XLSX (somente leitura), sem dependências externas.
 *
 * Um .xlsx é um ZIP com XML dentro. Aqui o ZIP é lido pelo diretório central (tamanhos
 * confiáveis mesmo quando o cabeçalho local usa data descriptor) e as entradas são
 * descomprimidas com `zlib.inflateRawSync`. Em seguida são lidos `workbook.xml`,
 * `sharedStrings.xml` e as planilhas.
 *
 * Regras de conversão (importantes para o catálogo):
 *  - números permanecem números, **inclusive zero** (0 nunca é tratado como ausência);
 *  - célula vazia vira `null`;
 *  - texto vem de sharedStrings (concatenando as partes de texto rico) ou de `inlineStr`;
 *  - fórmulas usam o valor em cache (`<v>`), que é o que o Excel gravou.
 *
 * Não escreve arquivos, não executa nada do conteúdo e não segue referências externas.
 */
const fs = require('node:fs');
const zlib = require('node:zlib');

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/** Lê o diretório central do ZIP e devolve um mapa nome → descritor. */
function readZipDirectory(buffer) {
  let eocd = -1;
  const minStart = Math.max(0, buffer.length - 66560); // 64KiB de comentário + cabeçalho
  for (let i = buffer.length - 22; i >= minStart; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('arquivo não é um ZIP/XLSX válido (fim do diretório central não encontrado)');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, { name, method, compressedSize, uncompressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntry(buffer, entry) {
  if (!entry) return null;
  const { localOffset } = entry;
  if (buffer.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) throw new Error(`entrada corrompida: ${entry.name}`);
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const data = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return zlib.inflateRawSync(data);
  throw new Error(`método de compressão não suportado (${entry.method}) em ${entry.name}`);
}

/**
 * Varre elementos de uma tag, tratando corretamente a forma **auto-fechada**
 * (`<c r="J2"/>`, célula vazia). Sem isso, uma célula vazia "engole" a célula seguinte e as
 * colunas saem deslocadas — foi o primeiro defeito encontrado e corrigido aqui.
 */
function* elements(xml, tag) {
  const open = new RegExp(`<${tag}(?:\\s([^>]*?))?(/)?>`, 'g');
  const close = `</${tag}>`;
  let match;
  while ((match = open.exec(xml))) {
    const attrs = match[1] || '';
    if (match[2]) {
      yield { attrs, body: '' };
      continue;
    }
    const end = xml.indexOf(close, open.lastIndex);
    const body = end < 0 ? xml.slice(open.lastIndex) : xml.slice(open.lastIndex, end);
    yield { attrs, body };
    open.lastIndex = end < 0 ? xml.length : end + close.length;
  }
}

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decodeXml = (text) =>
  text.replace(/&(#x?[0-9a-fA-F]+|lt|gt|amp|quot|apos);/g, (match, code) => {
    if (code[0] === '#') return String.fromCodePoint(Number(code[1] === 'x' ? `0${code.slice(1)}` : code.slice(1)));
    return ENTITIES[code] ?? match;
  });

/** Texto de um bloco XML, juntando todos os `<t>` (texto rico vem em partes). */
function textOf(xml) {
  let out = '';
  for (const { body } of elements(xml, 't')) out += decodeXml(body);
  return out;
}

function readSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  for (const { body } of elements(xml, 'si')) strings.push(textOf(body));
  return strings;
}

/** "BC" → 54 (índice da coluna, base 0). */
function columnIndex(ref) {
  let index = 0;
  for (const char of ref) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

const firstTag = (xml, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1] : null;
};

function parseSheet(xml, sharedStrings) {
  const rows = [];
  for (const row of elements(xml, 'row')) {
    const attrs = row.attrs;
    const body = row.body;
    const rowNumber = Number((/r="(\d+)"/.exec(attrs) || [])[1] || rows.length + 1);
    const cells = [];
    for (const cell of elements(body, 'c')) {
      const cellAttrs = cell.attrs;
      const cellBody = cell.body;
      const ref = (/r="([A-Z]+)\d+"/.exec(cellAttrs) || [])[1];
      const type = (/t="([^"]+)"/.exec(cellAttrs) || [])[1] || 'n';
      const index = ref ? columnIndex(ref) : cells.length;

      let value = null;
      if (type === 's') {
        const raw = firstTag(cellBody, 'v');
        value = raw === null ? null : sharedStrings[Number(raw)] ?? null;
      } else if (type === 'inlineStr') {
        value = textOf(cellBody);
      } else if (type === 'str') {
        const raw = firstTag(cellBody, 'v');
        value = raw === null ? null : decodeXml(raw);
      } else if (type === 'b') {
        const raw = firstTag(cellBody, 'v');
        value = raw === null ? null : raw === '1';
      } else if (type === 'e') {
        const raw = firstTag(cellBody, 'v');
        value = raw === null ? null : { error: decodeXml(raw) };
      } else {
        const raw = firstTag(cellBody, 'v');
        if (raw === null || raw === '') value = null;
        else {
          const n = Number(raw);
          value = Number.isNaN(n) ? decodeXml(raw) : n; // zero é preservado
        }
      }
      while (cells.length < index) cells.push(null);
      cells[index] = value;
    }
    while (rows.length < rowNumber - 1) rows.push([]);
    rows[rowNumber - 1] = cells;
  }
  return rows;
}

/**
 * @param {string|Buffer} input caminho do arquivo ou conteúdo
 * @returns {{sheetNames: string[], sheets: Record<string, Array<Array<any>>>}}
 */
function readWorkbook(input) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const entries = readZipDirectory(buffer);
  const asText = (name) => {
    const data = readEntry(buffer, entries.get(name));
    return data ? data.toString('utf8') : null;
  };

  const workbookXml = asText('xl/workbook.xml');
  if (!workbookXml) throw new Error('planilha sem xl/workbook.xml: arquivo não é um XLSX');
  const relsXml = asText('xl/_rels/workbook.xml.rels') || '';

  const targets = new Map();
  for (const m of relsXml.matchAll(/<Relationship\s[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g)) {
    let target = decodeXml(m[2]).replace(/^\/?xl\//, '').replace(/^\//, '');
    targets.set(m[1], `xl/${target}`);
  }

  const sharedStrings = readSharedStrings(asText('xl/sharedStrings.xml'));
  const sheetNames = [];
  const sheets = {};
  let fallbackIndex = 0;
  for (const m of workbookXml.matchAll(/<sheet\s[^>]*\/?>/g)) {
    const tag = m[0];
    const name = decodeXml((/name="([^"]*)"/.exec(tag) || [])[1] || '');
    const rid = (/r:id="([^"]+)"/.exec(tag) || [])[1];
    fallbackIndex += 1;
    const path = (rid && targets.get(rid)) || `xl/worksheets/sheet${fallbackIndex}.xml`;
    const sheetXml = asText(path);
    sheetNames.push(name);
    sheets[name] = sheetXml ? parseSheet(sheetXml, sharedStrings) : [];
  }
  return { sheetNames, sheets };
}

module.exports = { readWorkbook, readZipDirectory, columnIndex, decodeXml, elements };
