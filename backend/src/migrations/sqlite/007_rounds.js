/**
 * Rodadas do ciclo e preservação da versão enviada.
 *
 * O bloqueio depois do envio para auditoria só é honesto se a versão analisada ficar
 * preservada: na liberação do processo e em cada retorno autorizado, a resposta de cada
 * indicador é fotografada em `item_answer_versions`. Edições posteriores criam a versão
 * seguinte, sem sobrescrever o material analisado (regra F4 de docs/esg/regras.md).
 *
 * O histórico completo de comentários, transições e pedidos de "não se aplica" continua na
 * etapa de fluxo (E4) — aqui entra apenas o necessário para que o retorno registrado exista.
 */
module.exports = {
  id: '007_rounds',
  up(db, { addColumn }) {
    addColumn(db, 'reports', 'currentRound', 'INTEGER NOT NULL DEFAULT 1');

    db.exec(`
      CREATE TABLE IF NOT EXISTS cycle_rounds (
        id TEXT PRIMARY KEY,
        reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
        round INTEGER NOT NULL,
        openedAt TEXT NOT NULL,
        openedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        openedByRole TEXT,
        reason TEXT,
        closedAt TEXT,
        UNIQUE (reportId, round)
      );

      CREATE TABLE IF NOT EXISTS item_answer_versions (
        id TEXT PRIMARY KEY,
        questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE RESTRICT,
        reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
        round INTEGER NOT NULL,
        status TEXT,
        selectedAnswerId TEXT REFERENCES answers(id) ON DELETE RESTRICT,
        answerText TEXT,
        nonApplicable INTEGER NOT NULL DEFAULT 0,
        answeredById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        answeredByRole TEXT,
        answeredAt TEXT,
        files TEXT,
        snapshotAt TEXT NOT NULL,
        snapshotReason TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rounds_report ON cycle_rounds(reportId);
      CREATE INDEX IF NOT EXISTS idx_versions_item ON item_answer_versions(questionReportId, round);
      CREATE INDEX IF NOT EXISTS idx_versions_report ON item_answer_versions(reportId, round);
    `);

    // Rodada 1 para os ciclos existentes (sem inventar autoria: openedById fica nulo).
    const now = new Date().toISOString();
    const uuid = () => require('node:crypto').randomUUID();
    for (const report of db.prepare('SELECT id, createdAt FROM reports').all()) {
      db.prepare('INSERT OR IGNORE INTO cycle_rounds (id, reportId, round, openedAt, reason) VALUES (?, ?, 1, ?, ?)').run(
        uuid(),
        report.id,
        report.createdAt || now,
        'migration:007 (rodada inicial do ciclo legado)',
      );
    }
  },
};
