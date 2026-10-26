/**
 * Editor administrativo do catálogo, com versionamento.
 *
 * Toda edição acontece em uma **nova edição** (rascunho) criada a partir da versão em vigor:
 * cadernos, indicadores e alternativas são copiados com ids novos e editados ali. A versão
 * publicada nunca muda — ciclos já abertos continuam com o catálogo que congelaram. Publicar a
 * edição (rota de publicação já existente) a torna a versão dos ciclos novos.
 *
 * Isso permite à Administração editar, excluir e incluir indicadores e alternativas, mudar as
 * cores dos cartões e criar cadernos setoriais do zero, sem planilha.
 */
const db = require('../db');
const { badRequest, conflict, notFound } = require('../http');
const catalog = require('./import');
const presentation = require('./presentation');

const CATEGORIES = ['E', 'S', 'G'];
const SECTION_CODE = /^[A-Z][A-Z0-9]{0,7}$/;
const trim = (value) => String(value ?? '').trim();

async function draftOf(versionId) {
  const version = await catalog.versionById(versionId);
  if (!version) throw notFound('versão de catálogo não encontrada');
  if (version.status !== 'draft')
    throw conflict(`a versão "${version.label}" está ${version.status}; crie uma nova edição para alterar o catálogo`);
  return version;
}

async function questionOf(questionId) {
  const question = await db.one('SELECT * FROM questions WHERE id = ?', questionId);
  if (!question) throw notFound('indicador não encontrado');
  await draftOf(question.versionId);
  return question;
}

/**
 * Nova edição: copia a versão de origem (padrão: a em vigor) para um rascunho editável.
 * O `mandatoryAnswerId` é remapeado para a alternativa copiada correspondente.
 */
async function createEdition({ label, fromVersionId = null, actorId = null }) {
  const source = fromVersionId ? await catalog.versionById(fromVersionId) : await catalog.activeVersion();
  if (!source) throw notFound('não há versão de catálogo para copiar');
  const name = trim(label) || `edicao-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
  if (await db.one('SELECT id FROM catalog_versions WHERE label = ?', name)) throw conflict(`já existe uma versão com o rótulo "${name}"`);

  const versionId = db.uuid();
  await db.transaction(async () => {
    await db.run(
      `INSERT INTO catalog_versions (id, label, origin, status, sourceFile, sourceHash, sourceSheets, counts, notes, createdAt, createdById)
       VALUES (?, ?, 'edited', 'draft', ?, NULL, NULL, NULL, ?, ?, ?)`,
      versionId,
      name,
      source.sourceFile,
      `Edição administrativa criada a partir de "${source.label}".`,
      db.now(),
      actorId,
    );
    const sections = await db.all('SELECT * FROM catalog_sections WHERE versionId = ? ORDER BY position', source.id);
    const sectionRows = sections.length
      ? sections
      : (await db.all('SELECT DISTINCT q.section, s.description AS name FROM questions q LEFT JOIN sectors s ON s.section = q.section WHERE q.versionId = ?', source.id)).map(
          (row, index) => ({ section: row.section, name: row.name || row.section, position: index + 1 }),
        );
    for (const section of sectionRows)
      await db.run(
        'INSERT INTO catalog_sections (id, versionId, section, name, position) VALUES (?, ?, ?, ?, ?)',
        db.uuid(),
        versionId,
        section.section,
        section.name,
        section.position,
      );

    const questions = await db.all('SELECT * FROM questions WHERE versionId = ? ORDER BY position, code', source.id);
    for (const q of questions) {
      const questionId = db.uuid();
      await db.run(
        `INSERT INTO questions (id, versionId, code, codeOriginal, section, title, description, verification, category, subcategory, topic, ods,
                                maxPoints, hasMandatory, position, origin, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        questionId,
        versionId,
        q.code,
        q.codeOriginal,
        q.section,
        q.title,
        q.description,
        q.verification,
        q.category,
        q.subcategory,
        q.topic,
        q.ods,
        q.maxPoints,
        q.hasMandatory,
        q.position,
        q.origin,
        db.now(),
      );
      const answers = await db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY position, id', q.id);
      let mandatory = null;
      for (const a of answers) {
        const answerId = db.uuid();
        await db.run(
          'INSERT INTO answers (id, questionId, title, points, description, mandatory, position, slug, presentation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          answerId,
          questionId,
          a.title,
          a.points,
          a.description,
          a.mandatory,
          a.position,
          a.slug,
          a.presentation,
        );
        if (q.mandatoryAnswerId === a.id) mandatory = answerId;
      }
      if (mandatory) await db.run('UPDATE questions SET mandatoryAnswerId = ? WHERE id = ?', mandatory, questionId);
    }
  });
  return catalog.versionById(versionId);
}

/** Conteúdo completo de uma versão para o editor: cadernos com indicadores e alternativas. */
async function editorView(versionId) {
  const version = await catalog.versionById(versionId);
  if (!version) throw notFound('versão de catálogo não encontrada');
  const sections = await db.all(
    `SELECT cs.section, cs.name, cs.position, s.avatar FROM catalog_sections cs LEFT JOIN sectors s ON s.section = cs.section
      WHERE cs.versionId = ? ORDER BY cs.section = 'All' DESC, cs.position, cs.section`,
    versionId,
  );
  const indicators = await catalog.indicatorsOf(versionId);
  const usedBy = Number((await db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', versionId)).n);
  return { version: { ...version, editable: version.status === 'draft', cycles: usedBy }, sections, indicators };
}

/* ------------------------------------------------------------------ cadernos */

async function addSection(versionId, { section, name }) {
  await draftOf(versionId);
  const code = trim(section).toUpperCase();
  const title = trim(name);
  if (!SECTION_CODE.test(code) || code === 'ALL') throw badRequest('código do caderno inválido; use letras e números, começando por letra (ex.: I)');
  if (!title) throw badRequest('informe o nome do caderno');
  if (await db.one('SELECT id FROM catalog_sections WHERE versionId = ? AND section = ?', versionId, code))
    throw conflict(`o caderno ${code} já existe nesta edição`);
  const position = Number((await db.one('SELECT coalesce(max(position), 0) AS p FROM catalog_sections WHERE versionId = ?', versionId)).p) + 1;
  await db.run('INSERT INTO catalog_sections (id, versionId, section, name, position) VALUES (?, ?, ?, ?, ?)', db.uuid(), versionId, code, title, position);
  return { section: code, name: title, position };
}

async function updateSection(versionId, section, { name }) {
  await draftOf(versionId);
  const title = trim(name);
  if (!title) throw badRequest('informe o nome do caderno');
  const result = await db.run('UPDATE catalog_sections SET name = ? WHERE versionId = ? AND section = ?', title, versionId, section);
  if (!result.changes) throw notFound('caderno não encontrado nesta edição');
  return { section, name: title };
}

async function removeSection(versionId, section) {
  await draftOf(versionId);
  if (section === 'All') throw badRequest('o Caderno Geral não pode ser removido');
  await db.transaction(async () => {
    await db.run('UPDATE questions SET mandatoryAnswerId = NULL WHERE versionId = ? AND section = ?', versionId, section);
    await db.run('DELETE FROM answers WHERE questionId IN (SELECT id FROM questions WHERE versionId = ? AND section = ?)', versionId, section);
    await db.run('DELETE FROM questions WHERE versionId = ? AND section = ?', versionId, section);
    await db.run('DELETE FROM catalog_sections WHERE versionId = ? AND section = ?', versionId, section);
  });
  return { section, removed: true };
}

/* ------------------------------------------------------------------ alternativas */

/**
 * Valida a lista de alternativas de um indicador: de 2 a 6, nomes distintos, pontos ≥ 0, no
 * máximo um mínimo obrigatório, cor no formato #RRGGBB. "Não se aplica" não é alternativa.
 */
function validateAnswers(list) {
  if (!Array.isArray(list) || list.length < 2 || list.length > 6) throw badRequest('o indicador deve ter de 2 a 6 alternativas');
  const names = new Set();
  let mandatory = 0;
  const answers = list.map((raw, index) => {
    const title = trim(raw.title);
    if (!title) throw badRequest(`a alternativa ${index + 1} precisa de nome`);
    if (/^n[ãa]o\s*se\s*aplica$/i.test(title)) throw badRequest('"Não se aplica" é decisão de aplicabilidade, não alternativa de maturidade');
    if (names.has(title.toLowerCase())) throw badRequest(`alternativa repetida: ${title}`);
    names.add(title.toLowerCase());
    const points = Number(raw.points);
    if (!Number.isFinite(points) || points < 0 || points > 1000) throw badRequest(`pontuação inválida em "${title}"`);
    const description = trim(raw.description);
    if (!description) throw badRequest(`descreva a alternativa "${title}"`);
    if (raw.mandatory) mandatory += 1;
    let stored;
    try {
      stored = presentation.serialize({ color: raw.color || null });
    } catch (err) {
      throw badRequest(`${err.message} (alternativa "${title}")`);
    }
    return { id: raw.id || null, title, points, description, mandatory: !!raw.mandatory, presentation: stored, position: index + 1 };
  });
  if (mandatory > 1) throw badRequest('só pode haver um nível de maturidade mínima exigida por indicador');
  return answers;
}

/** Substitui as alternativas na ordem enviada (mantém ids informados, cria as novas, remove as ausentes). */
async function writeAnswers(question, list) {
  const answers = validateAnswers(list);
  await db.run('UPDATE questions SET mandatoryAnswerId = NULL WHERE id = ?', question.id);
  const existing = new Set((await db.all('SELECT id FROM answers WHERE questionId = ?', question.id)).map((row) => row.id));
  const kept = new Set();
  let mandatoryId = null;
  for (const a of answers) {
    let id = a.id && existing.has(a.id) ? a.id : null;
    if (id)
      await db.run(
        'UPDATE answers SET title = ?, points = ?, description = ?, mandatory = ?, position = ?, presentation = ? WHERE id = ?',
        a.title,
        a.points,
        a.description,
        a.mandatory ? 1 : 0,
        a.position,
        a.presentation,
        id,
      );
    else {
      id = db.uuid();
      await db.run(
        'INSERT INTO answers (id, questionId, title, points, description, mandatory, position, slug, presentation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        id,
        question.id,
        a.title,
        a.points,
        a.description,
        a.mandatory ? 1 : 0,
        a.position,
        a.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'),
        a.presentation,
      );
    }
    kept.add(id);
    if (a.mandatory) mandatoryId = id;
  }
  for (const id of existing) if (!kept.has(id)) await db.run('DELETE FROM answers WHERE id = ?', id);
  const maxPoints = Math.max(...answers.map((a) => a.points));
  await db.run('UPDATE questions SET mandatoryAnswerId = ?, hasMandatory = ?, maxPoints = ? WHERE id = ?', mandatoryId, mandatoryId ? 1 : 0, maxPoints, question.id);
}

/* ------------------------------------------------------------------ indicadores */

function indicatorFields(body, { partial = false } = {}) {
  const out = {};
  const text = (key, { required = false, max = 5000 } = {}) => {
    if (body[key] === undefined) {
      if (required && !partial) throw badRequest(`informe ${key === 'title' ? 'o título' : key === 'description' ? 'a descrição' : key}`);
      return;
    }
    const value = trim(body[key]);
    if (required && !value) throw badRequest(`informe ${key === 'title' ? 'o título' : 'a descrição'}`);
    if (value.length > max) throw badRequest(`${key} pode ter até ${max} caracteres`);
    out[key] = value || null;
  };
  text('title', { required: true, max: 255 });
  text('description', { required: true });
  text('verification');
  text('topic', { max: 255 });
  text('ods', { max: 255 });
  if (body.category !== undefined || !partial) {
    if (!CATEGORIES.includes(body.category)) throw badRequest('eixo inválido; use E, S ou G');
    out.category = body.category;
  }
  if (body.code !== undefined) {
    const code = trim(body.code).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9 .\-]{1,31}$/.test(code)) throw badRequest('código inválido');
    out.code = code;
  }
  return out;
}

async function nextCode(versionId, section, category) {
  const prefix = `${section === 'All' ? 'CG' : section}-${category}`;
  const rows = await db.all('SELECT code FROM questions WHERE versionId = ? AND code LIKE ?', versionId, `${prefix}%`);
  const numbers = rows.map((r) => Number(String(r.code).slice(prefix.length))).filter(Number.isFinite);
  return `${prefix}${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(2, '0')}`;
}

async function addIndicator(versionId, body) {
  await draftOf(versionId);
  const section = trim(body.section).toUpperCase() === 'ALL' ? 'All' : trim(body.section).toUpperCase();
  if (!(await db.one('SELECT id FROM catalog_sections WHERE versionId = ? AND section = ?', versionId, section)))
    throw badRequest('caderno inexistente nesta edição; crie o caderno antes');
  const fields = indicatorFields(body);
  const code = fields.code || (await nextCode(versionId, section, fields.category));
  if (await db.one('SELECT id FROM questions WHERE versionId = ? AND code = ?', versionId, code)) throw conflict(`já existe o indicador ${code} nesta edição`);
  const position = Number((await db.one('SELECT coalesce(max(position), 0) AS p FROM questions WHERE versionId = ?', versionId)).p) + 1;
  const id = db.uuid();
  await db.transaction(async () => {
    await db.run(
      `INSERT INTO questions (id, versionId, code, codeOriginal, section, title, description, verification, category, subcategory, topic, ods,
                              maxPoints, hasMandatory, position, origin, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'manual', ?)`,
      id,
      versionId,
      code,
      code,
      section,
      fields.title,
      fields.description,
      fields.verification ?? null,
      fields.category,
      fields.topic ?? null,
      fields.topic ?? null,
      fields.ods ?? null,
      position,
      db.now(),
    );
    await writeAnswers({ id }, body.answers);
  });
  return id;
}

async function updateIndicator(questionId, body) {
  const question = await questionOf(questionId);
  const fields = indicatorFields(body, { partial: true });
  if (fields.code && fields.code !== question.code && (await db.one('SELECT id FROM questions WHERE versionId = ? AND code = ? AND id <> ?', question.versionId, fields.code, question.id)))
    throw conflict(`já existe o indicador ${fields.code} nesta edição`);
  await db.transaction(async () => {
    const columns = { ...fields };
    if (fields.topic !== undefined) columns.subcategory = fields.topic;
    const keys = Object.keys(columns);
    if (keys.length) await db.run(`UPDATE questions SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => columns[k]), question.id);
    if (body.answers !== undefined) await writeAnswers(question, body.answers);
  });
  return question.id;
}

async function removeIndicator(questionId) {
  const question = await questionOf(questionId);
  await db.transaction(async () => {
    await db.run('UPDATE questions SET mandatoryAnswerId = NULL WHERE id = ?', question.id);
    await db.run('DELETE FROM answers WHERE questionId = ?', question.id);
    await db.run('DELETE FROM questions WHERE id = ?', question.id);
  });
  return { id: question.id, removed: true };
}

/** Reordena os indicadores de um caderno na ordem informada. */
async function reorder(versionId, section, ids) {
  await draftOf(versionId);
  if (!Array.isArray(ids) || !ids.length) throw badRequest('informe a nova ordem');
  const rows = await db.all('SELECT id, position FROM questions WHERE versionId = ? AND section = ? ORDER BY position', versionId, section);
  if (rows.length !== ids.length || !rows.every((r) => ids.includes(r.id))) throw badRequest('a ordem deve conter todos os indicadores do caderno');
  const positions = rows.map((r) => r.position).sort((a, b) => a - b);
  await db.transaction(async () => {
    for (const [index, id] of ids.entries()) await db.run('UPDATE questions SET position = ? WHERE id = ?', positions[index], id);
  });
  return { section, order: ids };
}

/**
 * Edição das maturidades a partir de um indicador em uso (ex.: aberto em um ciclo).
 *
 * O indicador do ciclo pertence a uma versão **congelada** — editá-lo no lugar alteraria
 * respostas, pontuações e auditorias já registradas. Em vez disso, localiza o **mesmo indicador**
 * (código + caderno) na edição administrativa em rascunho mais recente, criando-a a partir da
 * versão em vigor se não houver. Um indicador do Caderno Geral existe uma única vez por versão,
 * então a edição publicada vale para empresas de todos os setores, sem duplicação.
 */
async function draftForQuestion(questionId, { actorId = null } = {}) {
  const source = await db.one('SELECT id, versionId, code, section, title FROM questions WHERE id = ?', questionId);
  if (!source) throw notFound('indicador não encontrado');
  const frozen = await catalog.versionById(source.versionId);

  let created = false;
  let version = frozen?.status === 'draft' ? frozen : await db.one("SELECT * FROM catalog_versions WHERE status = 'draft' AND origin = 'edited' ORDER BY createdAt DESC LIMIT 1");
  if (!version) {
    version = await createEdition({ actorId });
    created = true;
  }
  const question = await db.one('SELECT id FROM questions WHERE versionId = ? AND code = ? AND section = ?', version.id, source.code, source.section);
  if (!question)
    throw notFound(
      `o indicador ${source.code} não existe na edição em rascunho "${version.label}" (pode ter sido removido nela ou não fazer parte da versão em vigor)`,
    );
  const cycles = Number((await db.one('SELECT count(*) AS n FROM reports WHERE catalogVersionId = ?', source.versionId)).n);
  return {
    version: { id: version.id, label: version.label, status: version.status },
    created,
    questionId: question.id,
    source: { versionId: source.versionId, label: frozen?.label ?? null, status: frozen?.status ?? null, cycles },
  };
}

module.exports = {
  draftForQuestion,
  createEdition,
  editorView,
  addSection,
  updateSection,
  removeSection,
  addIndicator,
  updateIndicator,
  removeIndicator,
  reorder,
  validateAnswers,
};
