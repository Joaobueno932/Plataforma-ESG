/**
 * Múltiplos ciclos por empresa (especificação § 14 e § 11).
 *
 * **Não é uma mudança aditiva**: `reports.companyId` era `UNIQUE`, o que limitava a empresa a
 * uma avaliação para sempre. SQLite não remove constraint com ALTER TABLE, então a tabela é
 * reconstruída preservando dados, ids, relacionamentos e índices; `PRAGMA foreign_key_check`
 * roda antes do COMMIT (ver `migrations/index.js`).
 *
 * O ciclo passa a guardar: número, versão do catálogo congelada, caderno setorial, relação com
 * o ciclo anterior, quem solicitou a auditoria (gestor) e quem liberou o processo
 * (Administração FIEMS) — solicitar e liberar são ações distintas.
 *
 * `cycle_professionals` registra as designações de auditor e supervisor por ciclo. O ciclo
 * legado **não** recebe designações inventadas: fica marcado `needsReview = 1`.
 */
const CREATE_REPORTS = `
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  cycle INTEGER NOT NULL DEFAULT 1,
  previousReportId TEXT REFERENCES reports(id) ON DELETE RESTRICT,
  section TEXT,
  catalogVersion TEXT,
  initialYear TEXT NOT NULL,
  finalYear TEXT NOT NULL,
  evaluation TEXT,
  structure TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  auditRequestedAt TEXT,
  auditRequestedById TEXT REFERENCES users(id) ON DELETE SET NULL,
  auditReleasedAt TEXT,
  auditReleasedById TEXT REFERENCES users(id) ON DELETE SET NULL,
  auditoryStart TEXT,
  auditoryEnd TEXT,
  origin TEXT,
  needsReview INTEGER NOT NULL DEFAULT 0,
  createdById TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (companyId, cycle)
)`;

module.exports = {
  id: '004_cycles',
  rebuildsTables: true,
  up(db, { rebuild, columns }) {
    const legacyColumns = columns(db, 'reports').join(', ');
    rebuild(db, 'reports', CREATE_REPORTS, {
      copy: legacyColumns,
      indexes: ['CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(companyId)'],
    });

    db.exec(`
      CREATE TABLE IF NOT EXISTS cycle_professionals (
        id TEXT PRIMARY KEY,
        reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role TEXT NOT NULL,
        assignedAt TEXT NOT NULL,
        assignedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        revokedAt TEXT,
        revokedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE (reportId, userId, role)
      );
      CREATE INDEX IF NOT EXISTS idx_cycle_prof_report ON cycle_professionals(reportId) WHERE revokedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_cycle_prof_user ON cycle_professionals(userId) WHERE revokedAt IS NULL;
    `);

    // Ciclo legado: preserva origem e o que se sabe dele; o caderno vem do cadastro da empresa.
    db.exec(`
      UPDATE reports SET
        cycle = 1,
        section = COALESCE(section, (SELECT c.section FROM companies c WHERE c.id = reports.companyId)),
        catalogVersion = COALESCE(catalogVersion, 'legacy-demo'),
        origin = COALESCE(origin, 'legacy'),
        needsReview = 1
      WHERE origin IS NULL OR section IS NULL OR catalogVersion IS NULL
    `);

    const count = db.prepare('SELECT count(*) AS n FROM reports').get().n;
    db.prepare('INSERT INTO audit_events (id, at, action, entity, details) VALUES (?, ?, ?, ?, ?)').run(
      require('node:crypto').randomUUID(),
      new Date().toISOString(),
      'migration.backfill',
      'reports',
      JSON.stringify({
        migration: '004_cycles',
        cycles: count,
        catalogVersion: 'legacy-demo',
        note: 'ciclos legados sem designação de auditor/supervisor e com catálogo demonstrativo: exigem revisão da Administração',
      }),
    );
  },
};
