/**
 * Índices de apoio à autorização e às listagens (o catálogo real tem 69 indicadores por
 * ciclo; as consultas por empresa, ciclo, item e arquivo passam a ter índice).
 */
module.exports = {
  id: '006_indexes',
  up(db) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_company_files_company ON company_files(companyId);
      CREATE INDEX IF NOT EXISTS idx_company_files_ged ON company_files(companyId) WHERE inGed = 1;
      CREATE INDEX IF NOT EXISTS idx_companies_section ON companies(section) WHERE deletedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_questions_code ON questions(section, code);
      CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(userId) WHERE usedAt IS NULL AND invalidatedAt IS NULL;
    `);
  },
};
