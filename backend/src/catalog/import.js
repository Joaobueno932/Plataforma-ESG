/**
 * Importação do catálogo oficial em versões rastreáveis.
 *
 * Fluxo em dois passos, como manda a especificação § 14: **prévia com validação e relatório**
 * e, só depois, **confirmação administrativa** que publica a versão.
 *
 *   preview()      → lê, valida e devolve o relatório; não grava catálogo
 *   createDraft()  → grava a versão em rascunho (indicadores e alternativas próprias dela)
 *   publish()      → publica o rascunho; arquiva a versão oficial anterior
 *
 * Uma versão publicada nunca é alterada: os ciclos apontam para as linhas da versão com que
 * foram abertos, então publicar outra versão não recalcula nem apaga ciclo anterior.
 */
const db = require('../db');
const { badRequest, conflict, notFound } = require('../http');
const { parseCatalog } = require('./parse');

const LEGACY_VERSION_ID = 'legacy-demo';

const nowIso = () => db.now();

const versionById = (id) => db.one('SELECT * FROM catalog_versions WHERE id = ?', id);

/** Versão oficial em uso: a última publicada. Sem nenhuma, cai no catálogo demonstrativo. */
function activeVersion() {
  const official = db.one(
    "SELECT * FROM catalog_versions WHERE status = 'published' AND origin = 'official' ORDER BY publishedAt DESC, createdAt DESC LIMIT 1",
  );
  return official || versionById(LEGACY_VERSION_ID) || null;
}

function recordImport({ versionId = null, source, actorId, status, report }) {
  const id = db.uuid();
  db.run(
    `INSERT INTO catalog_imports (id, versionId, sourceFile, sourceHash, sourceBytes, startedAt, finishedAt, actorId, status, errorCount, warningCount, divergenceCount, report)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    versionId,
    source.file,
    source.hash,
    source.bytes,
    report.generatedAt,
    nowIso(),
    actorId || null,
    status,
    report.errors.length,
    report.warnings.length,
    report.divergences.length,
    JSON.stringify(report),
  );
  return id;
}

/** Lê e valida sem gravar catálogo (o resultado da leitura fica registrado). */
function preview(input, { sourceFile = null, actorId = null, record = true } = {}) {
  const { source, report, indicators, sections } = parseCatalog(input, { sourceFile });
  const existing = db.one(
    `SELECT v.id, v.label, v.status FROM catalog_versions v WHERE v.sourceHash = ? ORDER BY v.createdAt DESC LIMIT 1`,
    source.hash,
  );
  const importId = record ? recordImport({ source, actorId, status: 'preview', report }) : null;
  return {
    importId,
    source: { file: source.file, hash: source.hash, bytes: source.bytes },
    alreadyImportedAs: existing || null,
    report,
    sections,
    sample: indicators.slice(0, 3).map(summarize),
  };
}

const summarize = (indicator) => ({
  section: indicator.section,
  code: indicator.code,
  codeOriginal: indicator.codeOriginal,
  axis: indicator.axis,
  topic: indicator.topic,
  title: indicator.title,
  ods: indicator.ods,
  maxPoints: indicator.maxPoints,
  mandatory: indicator.mandatory,
  mandatoryPosition: indicator.mandatoryPosition,
  levels: indicator.levels.map((level) => ({
    position: level.position,
    name: level.name,
    slug: level.slug,
    points: level.points,
    isMandatoryMinimum: level.isMandatoryMinimum,
    description: level.description,
  })),
});

/**
 * Grava uma versão em **rascunho**. Repetir o mesmo arquivo não duplica o catálogo: devolve o
 * rascunho existente, ou recusa quando o arquivo já foi publicado.
 */
function createDraft(input, { sourceFile = null, label = null, actorId = null, force = false } = {}) {
  const { source, report, indicators, sections } = parseCatalog(input, { sourceFile });

  if (report.errors.length) {
    recordImport({ source, actorId, status: 'rejected', report });
    throw badRequest(
      `a planilha tem ${report.errors.length} erro(s) e não pode ser importada; consulte o relatório da prévia`,
    );
  }

  const sameSource = db.one('SELECT * FROM catalog_versions WHERE sourceHash = ? ORDER BY createdAt DESC LIMIT 1', source.hash);
  if (sameSource && !force) {
    if (sameSource.status === 'draft')
      return { version: sameSource, report: JSON.parse(db.one('SELECT report FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC LIMIT 1', sameSource.id).report), reused: true };
    throw conflict(
      `este arquivo já foi importado como a versão "${sameSource.label}" (${sameSource.status}); use outro arquivo ou confirme a reimportação explicitamente`,
    );
  }

  const versionLabel = (label || '').trim() || defaultLabel(source);
  if (db.one('SELECT id FROM catalog_versions WHERE label = ?', versionLabel))
    throw conflict(`já existe uma versão com o rótulo "${versionLabel}"`);

  const versionId = db.uuid();
  db.transaction(() => {
    db.run(
      `INSERT INTO catalog_versions (id, label, origin, status, sourceFile, sourceHash, sourceSheets, counts, notes, createdAt, createdById)
       VALUES (?, ?, 'official', 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      versionId,
      versionLabel,
      source.file,
      source.hash,
      JSON.stringify(report.sheets),
      JSON.stringify(report.counts),
      buildNotes(report),
      nowIso(),
      actorId,
    );
    for (const section of sections)
      db.run('INSERT INTO catalog_sections (id, versionId, section, name, position) VALUES (?, ?, ?, ?, ?)', db.uuid(), versionId, section.section, section.name, section.position);

    for (const indicator of indicators) {
      const questionId = db.uuid();
      db.run(
        `INSERT INTO questions (id, versionId, code, codeOriginal, section, title, description, verification, category, subcategory, topic, ods,
                                maxPoints, hasMandatory, position, origin, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'official', ?)`,
        questionId,
        versionId,
        indicator.code,
        indicator.codeOriginal,
        indicator.section,
        indicator.title,
        indicator.description ?? '',
        indicator.verification,
        indicator.axis,
        indicator.topic,
        indicator.topic,
        indicator.ods,
        indicator.maxPoints,
        indicator.mandatory ? 1 : 0,
        indicator.position,
        nowIso(),
      );
      let mandatoryAnswerId = null;
      for (const level of indicator.levels) {
        const answerId = db.uuid();
        db.run(
          `INSERT INTO answers (id, questionId, title, points, description, mandatory, position, slug, presentation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          answerId,
          questionId,
          level.name,
          level.points,
          level.description,
          level.isMandatoryMinimum ? 1 : 0,
          level.position,
          level.slug,
          level.slug,
        );
        if (level.isMandatoryMinimum) mandatoryAnswerId = answerId;
      }
      // O mínimo obrigatório aponta para o nível exigido — nunca é inferido da pontuação.
      if (mandatoryAnswerId) db.run('UPDATE questions SET mandatoryAnswerId = ? WHERE id = ?', mandatoryAnswerId, questionId);
    }
    recordImport({ versionId, source, actorId, status: 'draft', report });
  });

  return { version: versionById(versionId), report, reused: false };
}

const defaultLabel = (source) => {
  const base = `oficial-${new Date().toISOString().slice(0, 10)}`;
  let label = base;
  let n = 2;
  while (db.one('SELECT id FROM catalog_versions WHERE label = ?', label)) label = `${base}-${n++}`;
  return label;
};

function buildNotes(report) {
  const notes = [];
  if (report.divergences.length) notes.push(`${report.divergences.length} divergência(s) entre as abas da fonte registradas no relatório.`);
  if (report.warnings.length) notes.push(`${report.warnings.length} aviso(s).`);
  for (const missing of report.missingSources) notes.push(`Fonte ausente: ${missing.field} (${missing.indicators} indicadores) — ${missing.detail}`);
  return notes.join(' ') || null;
}

/**
 * Publica o rascunho. Com divergências registradas, exige confirmação explícita
 * (`acknowledge`) — o administrador assume a divergência, que continua no relatório.
 */
function publish(versionId, { actorId = null, acknowledge = false } = {}) {
  const version = versionById(versionId);
  if (!version) throw notFound('versão de catálogo não encontrada');
  if (version.status === 'published') return version;
  if (version.status !== 'draft') throw conflict(`a versão "${version.label}" está ${version.status} e não pode ser publicada`);

  const lastImport = db.one('SELECT * FROM catalog_imports WHERE versionId = ? ORDER BY startedAt DESC LIMIT 1', versionId);
  const report = lastImport ? JSON.parse(lastImport.report) : null;
  if (report && report.errors.length) throw conflict('a versão tem erros registrados e não pode ser publicada');
  if (report && (report.divergences.length || report.missingSources.length) && !acknowledge)
    throw conflict(
      `a versão tem ${report.divergences.length} divergência(s) e ${report.missingSources.length} fonte(s) ausente(s); confirme explicitamente (acknowledge) para publicar`,
    );

  const indicators = db.one('SELECT count(*) AS n FROM questions WHERE versionId = ?', versionId).n;
  if (!indicators) throw conflict('a versão não tem indicadores');

  db.transaction(() => {
    db.run(
      "UPDATE catalog_versions SET status = 'archived', archivedAt = ? WHERE status = 'published' AND origin = 'official' AND id <> ?",
      nowIso(),
      versionId,
    );
    db.run("UPDATE catalog_versions SET status = 'published', publishedAt = ?, publishedById = ? WHERE id = ?", nowIso(), actorId, versionId);
    // Denominação oficial dos cadernos da versão publicada (sem apagar capas já cadastradas).
    for (const section of db.all('SELECT section, name FROM catalog_sections WHERE versionId = ?', versionId)) {
      const existing = db.one('SELECT section FROM sectors WHERE section = ?', section.section);
      if (existing) db.run('UPDATE sectors SET description = ? WHERE section = ?', section.name, section.section);
      else db.run('INSERT INTO sectors (section, description, avatar) VALUES (?, ?, ?)', section.section, section.name, 'static/sectorCovers/caderno_geral.jpeg');
    }
    if (lastImport) db.run("UPDATE catalog_imports SET status = 'published' WHERE id = ?", lastImport.id);
  });
  return versionById(versionId);
}

function discardDraft(versionId) {
  const version = versionById(versionId);
  if (!version) throw notFound('versão de catálogo não encontrada');
  if (version.status !== 'draft') throw conflict('somente rascunhos podem ser descartados');
  const used = db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', versionId).n;
  if (used) throw conflict('a versão já está em uso por avaliações e não pode ser descartada');
  db.transaction(() => {
    db.run('DELETE FROM answers WHERE questionId IN (SELECT id FROM questions WHERE versionId = ?)', versionId);
    db.run('DELETE FROM questions WHERE versionId = ?', versionId);
    db.run('DELETE FROM catalog_sections WHERE versionId = ?', versionId);
    db.run("UPDATE catalog_imports SET status = 'rejected' WHERE versionId = ?", versionId);
    db.run('UPDATE catalog_imports SET versionId = NULL WHERE versionId = ?', versionId);
    db.run('DELETE FROM catalog_versions WHERE id = ?', versionId);
  });
  return { id: versionId, discarded: true };
}

/** Indicadores de uma versão, com as alternativas próprias de cada um. */
function indicatorsOf(versionId, { section = null } = {}) {
  const questions = db.all(
    `SELECT * FROM questions WHERE versionId = ? ${section ? 'AND section IN (?, ?)' : ''} ORDER BY position, code`,
    ...(section ? [versionId, 'All', section] : [versionId]),
  );
  if (!questions.length) return [];
  const marks = questions.map(() => '?').join(', ');
  const answers = db.all(
    `SELECT * FROM answers WHERE questionId IN (${marks}) ORDER BY position, rowid`,
    ...questions.map((q) => q.id),
  );
  const byQuestion = new Map();
  for (const answer of answers) {
    if (!byQuestion.has(answer.questionId)) byQuestion.set(answer.questionId, []);
    byQuestion.get(answer.questionId).push(answer);
  }
  return questions.map((question) => ({ question, levels: byQuestion.get(question.id) || [] }));
}

/** Níveis distintos usados por uma versão (substitui a antiga lista universal de níveis). */
function levelsOf(versionId) {
  return db.all(
    `SELECT a.title AS name, a.slug, a.points, count(*) AS indicators
       FROM answers a JOIN questions q ON q.id = a.questionId
      WHERE q.versionId = ?
      GROUP BY a.title, a.slug, a.points
      ORDER BY a.points, a.title`,
    versionId,
  );
}

module.exports = {
  LEGACY_VERSION_ID,
  activeVersion,
  versionById,
  preview,
  createDraft,
  publish,
  discardDraft,
  indicatorsOf,
  levelsOf,
  summarize,
};
