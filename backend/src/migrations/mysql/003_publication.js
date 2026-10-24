/**
 * Publicação automática (Prompt 7) — somente adições.
 *
 * Uma publicação por ciclo e rodada aprovada (`UNIQUE(reportId, round)`): clique duplo ou
 * requisição repetida não cria outra. Ela aponta para o resultado gravado na aprovação
 * (`cycle_results`), e os documentos ficam em área privada, com hash e situação de geração.
 *
 * Certificado: registro da concessão (código verificável, validade pela política vigente). O
 * documento oficial depende do modelo aprovado pela FIEMS; até lá a situação é
 * `awaiting-official-template` e nenhum certificado é apresentado.
 */
const statements = [
  `CREATE TABLE IF NOT EXISTS publications (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    reportId VARCHAR(36) NOT NULL,
    round INT NOT NULL,
    cycleResultId VARCHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    lastError TEXT NULL,
    lastAttemptAt VARCHAR(32) NULL,
    reportPath VARCHAR(512) NULL,
    reportSha256 CHAR(64) NULL,
    reportBytes INT NULL,
    reportGeneratedAt VARCHAR(32) NULL,
    templateVersion VARCHAR(64) NOT NULL,
    rating VARCHAR(16) NULL,
    eligible TINYINT(1) NULL,
    ruleVersion VARCHAR(64) NOT NULL,
    policyId VARCHAR(64) NOT NULL,
    catalogVersionId VARCHAR(36) NULL,
    certificateStatus VARCHAR(32) NOT NULL,
    certificateCode VARCHAR(32) NULL,
    certificateValidFrom VARCHAR(32) NULL,
    certificateValidUntil VARCHAR(32) NULL,
    validityPolicy VARCHAR(64) NULL,
    approvedById VARCHAR(36) NULL,
    approvedAt VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32) NOT NULL,
    updatedAt VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_publication_round (reportId, round),
    UNIQUE KEY uq_publication_certificate (certificateCode),
    KEY idx_publications_status (status),
    CONSTRAINT fk_publications_report FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE RESTRICT,
    CONSTRAINT fk_publications_result FOREIGN KEY (cycleResultId) REFERENCES cycle_results(id) ON DELETE RESTRICT,
    CONSTRAINT fk_publications_approver FOREIGN KEY (approvedById) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const HARMLESS = /Duplicate (column name|key name|foreign key constraint)|already exists/i;

module.exports = {
  id: 'mysql_003_publication',
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
