/**
 * Cadastro da empresa conforme a especificação § 4: situação cadastral (ativa/inativa, que
 * preserva avaliações e histórico), autoria do cadastro e unicidade de CNPJ entre as
 * empresas não excluídas. O CNPJ já era texto sem máscara — permanece texto.
 *
 * `companies.access` continua sendo a liberação de acesso ao sistema (porta de login);
 * `companies.status` é a situação cadastral. São coisas distintas.
 */
module.exports = {
  id: '003_company_registration',
  up(db, { addColumn }) {
    addColumn(db, 'companies', 'status', "TEXT NOT NULL DEFAULT 'ACTIVE'");
    addColumn(db, 'companies', 'statusChangedAt', 'TEXT');
    addColumn(db, 'companies', 'statusChangedById', 'TEXT');
    addColumn(db, 'companies', 'origin', 'TEXT');
    addColumn(db, 'companies', 'createdById', 'TEXT');
    addColumn(db, 'companies', 'updatedById', 'TEXT');
    addColumn(db, 'companies', 'needsReview', 'INTEGER NOT NULL DEFAULT 0');

    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cnpj_active ON companies(cnpj) WHERE deletedAt IS NULL');

    // As empresas do seed de demonstração não são empresas reais (especificação § 14:
    // "o exemplo de avaliação não deve ser migrado como empresa real").
    const demo = db
      .prepare("UPDATE companies SET origin = 'demo', needsReview = 1 WHERE id IN ('demo-company-a', 'demo-company-b') AND origin IS NULL")
      .run();
    db.prepare("UPDATE companies SET origin = 'legacy', needsReview = 1 WHERE origin IS NULL").run();

    db.prepare('INSERT INTO audit_events (id, at, action, entity, details) VALUES (?, ?, ?, ?, ?)').run(
      require('node:crypto').randomUUID(),
      new Date().toISOString(),
      'migration.backfill',
      'companies',
      JSON.stringify({ migration: '003_company_registration', demoCompanies: demo.changes, note: 'empresas sem origem registrada marcadas para revisão' }),
    );
  },
};
