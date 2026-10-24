/**
 * Catálogo oficial versionado (especificação § 14).
 *
 * `questions`/`answers` continuam sendo as tabelas do catálogo, agora **por versão**: cada
 * versão tem suas próprias linhas de indicador e de alternativa, de modo que publicar uma
 * versão nova não altera nenhum ciclo anterior (os ciclos apontam para as linhas da versão com
 * que foram abertos). O catálogo demonstrativo herdado vira a versão `legacy-demo`, marcada
 * como demonstração e separada dos dados oficiais.
 *
 * Campos que faltavam para representar a fonte: código oficial (com e sem espaço), tópico,
 * orientação de verificação, ODS, máximo do indicador, nível mínimo obrigatório (apontando para
 * a alternativa, não inferido pela pontuação) e a ordem/apresentação de cada alternativa.
 */
const crypto = require('node:crypto');

const LEGACY_VERSION_ID = 'legacy-demo';

module.exports = {
  id: '008_catalog_versions',
  up(db, { addColumn }) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS catalog_versions (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL UNIQUE,
        origin TEXT NOT NULL DEFAULT 'official',   -- official | demo
        status TEXT NOT NULL DEFAULT 'draft',      -- draft | published | archived
        sourceFile TEXT,
        sourceHash TEXT,
        sourceSheets TEXT,
        counts TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        createdById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        publishedAt TEXT,
        publishedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        archivedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS catalog_imports (
        id TEXT PRIMARY KEY,
        versionId TEXT REFERENCES catalog_versions(id) ON DELETE RESTRICT,
        sourceFile TEXT NOT NULL,
        sourceHash TEXT NOT NULL,
        sourceBytes INTEGER,
        startedAt TEXT NOT NULL,
        finishedAt TEXT,
        actorId TEXT REFERENCES users(id) ON DELETE RESTRICT,
        status TEXT NOT NULL,                      -- preview | draft | rejected | published
        errorCount INTEGER NOT NULL DEFAULT 0,
        warningCount INTEGER NOT NULL DEFAULT 0,
        divergenceCount INTEGER NOT NULL DEFAULT 0,
        report TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS catalog_sections (
        id TEXT PRIMARY KEY,
        versionId TEXT NOT NULL REFERENCES catalog_versions(id) ON DELETE RESTRICT,
        section TEXT NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE (versionId, section)
      );

      CREATE INDEX IF NOT EXISTS idx_catalog_versions_status ON catalog_versions(status, origin);
      CREATE INDEX IF NOT EXISTS idx_catalog_imports_version ON catalog_imports(versionId);
      CREATE INDEX IF NOT EXISTS idx_catalog_imports_hash ON catalog_imports(sourceHash);
    `);

    addColumn(db, 'questions', 'versionId', 'TEXT REFERENCES catalog_versions(id) ON DELETE RESTRICT');
    addColumn(db, 'questions', 'codeOriginal', 'TEXT');
    addColumn(db, 'questions', 'topic', 'TEXT');
    addColumn(db, 'questions', 'verification', 'TEXT');
    addColumn(db, 'questions', 'ods', 'TEXT');
    addColumn(db, 'questions', 'maxPoints', 'INTEGER');
    addColumn(db, 'questions', 'mandatoryAnswerId', 'TEXT');
    addColumn(db, 'questions', 'position', 'INTEGER');
    addColumn(db, 'questions', 'origin', "TEXT NOT NULL DEFAULT 'demo'");

    addColumn(db, 'answers', 'position', 'INTEGER');
    addColumn(db, 'answers', 'slug', 'TEXT');
    addColumn(db, 'answers', 'presentation', 'TEXT');

    const now = new Date().toISOString();
    const uuid = () => crypto.randomUUID();

    // Versão do catálogo demonstrativo herdado (os ciclos legados já registram 'legacy-demo').
    db.prepare(
      `INSERT OR IGNORE INTO catalog_versions (id, label, origin, status, notes, counts, createdAt, publishedAt)
       VALUES (?, ?, 'demo', 'published', ?, ?, ?, ?)`,
    ).run(
      LEGACY_VERSION_ID,
      LEGACY_VERSION_ID,
      'Catálogo demonstrativo da reconstrução anterior (não oficial). Preservado para os ciclos já abertos.',
      JSON.stringify({ indicators: db.prepare('SELECT count(*) AS n FROM questions').get().n }),
      now,
      now,
    );

    db.prepare("UPDATE questions SET versionId = ?, origin = 'demo' WHERE versionId IS NULL").run(LEGACY_VERSION_ID);

    // Ordem e máximo dos indicadores herdados, a partir do que já existe.
    const legacy = db
      .prepare("SELECT id, code FROM questions WHERE versionId = ? ORDER BY CASE WHEN section = 'All' THEN 0 ELSE 1 END, section, code")
      .all(LEGACY_VERSION_ID);
    const setQuestion = db.prepare('UPDATE questions SET position = ?, topic = COALESCE(topic, subcategory), codeOriginal = COALESCE(codeOriginal, code), maxPoints = ?, mandatoryAnswerId = ? WHERE id = ?');
    const levelsOf = db.prepare('SELECT id, points, mandatory FROM answers WHERE questionId = ? ORDER BY points, rowid');
    const setAnswer = db.prepare('UPDATE answers SET position = ?, slug = COALESCE(slug, ?) WHERE id = ?');
    legacy.forEach((question, index) => {
      const levels = levelsOf.all(question.id);
      const mandatory = levels.find((l) => l.mandatory === 1);
      const max = levels.reduce((acc, l) => Math.max(acc, l.points), 0);
      setQuestion.run(index + 1, max, mandatory ? mandatory.id : null, question.id);
      levels.forEach((level, position) => setAnswer.run(position + 1, null, level.id));
    });
    db.prepare("UPDATE answers SET slug = lower(replace(replace(replace(title, ' ', '-'), 'ã', 'a'), 'ç', 'c')) WHERE slug IS NULL").run();

    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_version_code ON questions(versionId, code)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_questions_version_section ON questions(versionId, section)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_answers_question_position ON answers(questionId, position)');

    addColumn(db, 'reports', 'catalogVersionId', 'TEXT REFERENCES catalog_versions(id) ON DELETE RESTRICT');
    db.prepare('UPDATE reports SET catalogVersionId = ? WHERE catalogVersionId IS NULL AND (catalogVersion IS NULL OR catalogVersion = ?)').run(
      LEGACY_VERSION_ID,
      LEGACY_VERSION_ID,
    );

    db.prepare('INSERT INTO audit_events (id, at, action, entity, details) VALUES (?, ?, ?, ?, ?)').run(
      uuid(),
      now,
      'migration.backfill',
      'catalog_versions',
      JSON.stringify({
        migration: '008_catalog_versions',
        legacyVersion: LEGACY_VERSION_ID,
        questions: legacy.length,
        note: 'catálogo demonstrativo isolado em uma versão própria; a importação oficial cria novas versões sem tocar nos ciclos existentes',
      }),
    );
  },
  LEGACY_VERSION_ID,
};
