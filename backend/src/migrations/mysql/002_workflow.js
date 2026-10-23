/**
 * Fluxo de respostas, revisão e auditoria (Prompt 5) — somente adições.
 *
 * - `item_reviews` passa a guardar também as decisões do auditor (`kind = 'audit'`), presas à
 *   versão exata da resposta analisada, com o nível auditado e a conclusão. Assim o histórico de
 *   pareceres sobrevive a novas versões da resposta.
 * - `company_files` ganha visibilidade (arquivos da auditoria não são da empresa) e o hash do
 *   conteúdo, para identificar o mesmo arquivo usado em versões diferentes.
 * - `question_report_files` já tinha `removedAt`: desvincular passa a ser marcação, não exclusão,
 *   para que a versão enviada continue apontando para o que foi enviado.
 */
const statements = [
  "ALTER TABLE item_reviews ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'review' AFTER reportId",
  'ALTER TABLE item_reviews ADD COLUMN auditedAnswerId VARCHAR(36) NULL AFTER decision',
  'ALTER TABLE item_reviews ADD COLUMN conclusion VARCHAR(16) NULL AFTER auditedAnswerId',
  'ALTER TABLE item_reviews ADD CONSTRAINT fk_reviews_audited_answer FOREIGN KEY (auditedAnswerId) REFERENCES answers(id) ON DELETE RESTRICT',
  'CREATE INDEX idx_reviews_kind ON item_reviews (questionReportId, kind, answerVersion)',

  "ALTER TABLE company_files ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'empresa' AFTER kind",
  'ALTER TABLE company_files ADD COLUMN sha256 CHAR(64) NULL AFTER sizeBytes',

  'CREATE INDEX idx_qrf_active ON question_report_files (questionReportId, removedAt)',
  'CREATE INDEX idx_na_item_open ON na_requests (questionReportId, withdrawnAt, decision)',
];

const HARMLESS = /Duplicate (column name|key name|foreign key constraint)|already exists/i;

module.exports = {
  id: 'mysql_002_workflow',
  async up(db) {
    for (const statement of statements) {
      try {
        await db.exec([statement]);
      } catch (err) {
        if (!HARMLESS.test(err.message)) throw err;
      }
    }
  },
  statements,
};
