/**
 * Cálculo do resultado: enquadramento auditado, pedidos de "não se aplica" e resultado do ciclo.
 *
 * A declaração da empresa (`selectedAnswerId`) e a **conclusão auditada** passam a ser
 * registros distintos: o auditor pode manter, subir ou descer o nível, ou concluir pelo não
 * atendimento — sem sobrescrever nem assumir a autoria da resposta da empresa.
 *
 * `na_requests` guarda pedido e decisão separadamente, porque só o "não se aplica" **aceito**
 * sai do numerador e do denominador; recusado continua no cálculo e pendente impede
 * classificação final.
 *
 * `cycle_results` guarda o resultado calculado com a **versão da regra** e a política de faixa
 * usadas, para que mudança posterior de regra não reescreva histórico.
 */
const crypto = require('node:crypto');

module.exports = {
  id: '009_scoring',
  up(db, { addColumn }) {
    addColumn(db, 'question_reports', 'auditedAnswerId', 'TEXT REFERENCES answers(id) ON DELETE RESTRICT');
    addColumn(db, 'question_reports', 'auditedById', 'TEXT REFERENCES users(id) ON DELETE RESTRICT');
    addColumn(db, 'question_reports', 'auditedByRole', 'TEXT');
    addColumn(db, 'question_reports', 'auditedAt', 'TEXT');
    // met | not-met | null (sem conclusão registrada)
    addColumn(db, 'question_reports', 'auditConclusion', 'TEXT');
    addColumn(db, 'question_reports', 'auditJustification', 'TEXT');
    addColumn(db, 'question_reports', 'auditedSource', 'TEXT');

    db.exec(`
      CREATE TABLE IF NOT EXISTS na_requests (
        id TEXT PRIMARY KEY,
        questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE RESTRICT,
        reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
        round INTEGER NOT NULL DEFAULT 1,
        justification TEXT,
        requestedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        requestedByRole TEXT,
        requestedAt TEXT NOT NULL,
        decision TEXT,                 -- accepted | refused | null (pendente)
        decisionReason TEXT,
        decidedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
        decidedByRole TEXT,
        decidedAt TEXT,
        origin TEXT,
        withdrawnAt TEXT
      );

      CREATE TABLE IF NOT EXISTS na_request_files (
        id TEXT PRIMARY KEY,
        naRequestId TEXT NOT NULL REFERENCES na_requests(id) ON DELETE RESTRICT,
        fileId TEXT NOT NULL REFERENCES company_files(id) ON DELETE RESTRICT,
        createdAt TEXT NOT NULL,
        UNIQUE (naRequestId, fileId)
      );

      CREATE TABLE IF NOT EXISTS cycle_results (
        id TEXT PRIMARY KEY,
        reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
        round INTEGER NOT NULL DEFAULT 1,
        mode TEXT NOT NULL,                       -- audited | self
        ruleVersion TEXT NOT NULL,
        policyId TEXT NOT NULL,
        policyStatus TEXT,
        catalogVersionId TEXT REFERENCES catalog_versions(id) ON DELETE RESTRICT,
        size TEXT,
        bracket TEXT,
        rating TEXT,
        ratingValid INTEGER NOT NULL DEFAULT 0,
        eligible INTEGER,                         -- 1 | 0 | NULL (não determinável)
        payload TEXT NOT NULL,
        computedAt TEXT NOT NULL,
        computedById TEXT REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS cycle_result_axes (
        id TEXT PRIMARY KEY,
        cycleResultId TEXT NOT NULL REFERENCES cycle_results(id) ON DELETE RESTRICT,
        axis TEXT NOT NULL,
        points INTEGER NOT NULL,
        maxPoints INTEGER NOT NULL,
        percentage REAL,
        band TEXT,
        valid INTEGER NOT NULL DEFAULT 0,
        reasons TEXT,
        UNIQUE (cycleResultId, axis)
      );

      CREATE INDEX IF NOT EXISTS idx_na_requests_item ON na_requests(questionReportId);
      CREATE INDEX IF NOT EXISTS idx_na_requests_report ON na_requests(reportId);
      CREATE INDEX IF NOT EXISTS idx_na_requests_pending ON na_requests(reportId) WHERE decision IS NULL AND withdrawnAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_cycle_results_report ON cycle_results(reportId, mode);
    `);

    addColumn(db, 'reports', 'resultRuleVersion', 'TEXT');
    addColumn(db, 'reports', 'resultPolicyId', 'TEXT');
    addColumn(db, 'reports', 'resultRating', 'TEXT');
    addColumn(db, 'reports', 'resultEligible', 'INTEGER');
    addColumn(db, 'reports', 'resultComputedAt', 'TEXT');

    const now = new Date().toISOString();
    const uuid = () => crypto.randomUUID();

    /**
     * Backfill do que existia, sem inventar autoria:
     *  - `nonApplicable = 1` era marcado pelo auditor na rota antiga: vira pedido de NA com
     *    decisão "accepted" e origem `migration:009` (autoria desconhecida fica nula);
     *  - item `Approved` sem enquadramento auditado = o auditor endossou a declaração;
     *  - item `Rejected` = conclusão de não atendimento.
     */
    const legacyNa = db
      .prepare("SELECT qr.id, qr.reportId FROM question_reports qr WHERE qr.nonApplicable = 1")
      .all();
    const insertNa = db.prepare(
      `INSERT INTO na_requests (id, questionReportId, reportId, round, justification, requestedAt, decision, decisionReason, decidedAt, origin)
       VALUES (?, ?, ?, 1, ?, ?, 'accepted', ?, ?, 'migration:009')`,
    );
    for (const item of legacyNa)
      insertNa.run(
        uuid(),
        item.id,
        item.reportId,
        'Justificativa não registrada no modelo anterior — exige revisão.',
        now,
        'Decisão herdada da rota antiga de "não se aplica"; autoria não registrada.',
        now,
      );

    const endorsed = db
      .prepare("UPDATE question_reports SET auditConclusion = 'met', auditedAnswerId = selectedAnswerId, auditedSource = 'migration:009-endorsed' WHERE status = 'Approved' AND auditedAnswerId IS NULL AND selectedAnswerId IS NOT NULL")
      .run();
    const rejected = db
      .prepare("UPDATE question_reports SET auditConclusion = 'not-met', auditedSource = 'migration:009-rejected' WHERE status = 'Rejected' AND auditConclusion IS NULL")
      .run();

    db.prepare('INSERT INTO audit_events (id, at, action, entity, details) VALUES (?, ?, ?, ?, ?)').run(
      uuid(),
      now,
      'migration.backfill',
      'na_requests',
      JSON.stringify({
        migration: '009_scoring',
        naRequests: legacyNa.length,
        endorsedItems: endorsed.changes,
        rejectedItems: rejected.changes,
        note: 'decisões herdadas do modelo anterior ficam marcadas com origem migration:009 e exigem revisão da auditoria',
      }),
    );
  },
};
