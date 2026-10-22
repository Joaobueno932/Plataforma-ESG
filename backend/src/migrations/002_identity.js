/**
 * Separa identidade, concessão de perfil e vínculo com empresa; introduz sessões
 * revogáveis, recuperação de senha de uso único e trilha de eventos.
 *
 * Backfill honesto: o perfil e a empresa que estavam em `users` viram uma concessão e um
 * vínculo. Vínculos de CONSULTOR/AUDITOR/SUPERVISOR nascem com `needsReview = 1`, porque no
 * modelo antigo o próprio profissional podia trocar a empresa (diagnóstico A8) — não há como
 * afirmar que foram concedidos pela Administração. Nada é inventado: nenhuma designação de
 * ciclo é criada aqui.
 */
module.exports = {
  id: '002_identity',
  up(db, { addColumn }) {
    addColumn(db, 'users', 'status', "TEXT NOT NULL DEFAULT 'ACTIVE'");
    addColumn(db, 'users', 'statusChangedAt', 'TEXT');
    addColumn(db, 'users', 'statusChangedById', 'TEXT');

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role TEXT NOT NULL,
        grantedAt TEXT NOT NULL,
        grantedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        revokedAt TEXT,
        revokedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        origin TEXT,
        UNIQUE (userId, role)
      );

      CREATE TABLE IF NOT EXISTS user_company_links (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        companyId TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        role TEXT NOT NULL,
        grantedAt TEXT NOT NULL,
        grantedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        revokedAt TEXT,
        revokedById TEXT REFERENCES users(id) ON DELETE SET NULL,
        origin TEXT,
        needsReview INTEGER NOT NULL DEFAULT 0,
        UNIQUE (userId, companyId, role)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        createdAt TEXT NOT NULL,
        lastSeenAt TEXT,
        expiresAt TEXT,
        revokedAt TEXT,
        revokedReason TEXT,
        selectedCompanyId TEXT REFERENCES companies(id) ON DELETE SET NULL,
        keepLogged INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        tokenHash TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        usedAt TEXT,
        invalidatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        actorId TEXT REFERENCES users(id) ON DELETE SET NULL,
        actorRole TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        entityId TEXT,
        companyId TEXT,
        details TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users(lower(email)) WHERE deletedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(userId) WHERE revokedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_links_user ON user_company_links(userId) WHERE revokedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_links_company ON user_company_links(companyId) WHERE revokedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId) WHERE revokedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity, entityId);
    `);

    const now = new Date().toISOString();
    const users = db.prepare('SELECT id, role, companyId, createdAt FROM users').all();
    const insProfile = db.prepare(
      'INSERT OR IGNORE INTO user_profiles (id, userId, role, grantedAt, origin) VALUES (?, ?, ?, ?, ?)',
    );
    const insLink = db.prepare(
      'INSERT OR IGNORE INTO user_company_links (id, userId, companyId, role, grantedAt, origin, needsReview) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const uuid = () => require('node:crypto').randomUUID();
    const professional = new Set(['CONSULTOR', 'AUDITOR', 'SUPERVISOR']);
    let review = 0;
    for (const u of users) {
      insProfile.run(uuid(), u.id, u.role, u.createdAt || now, 'migration:002');
      if (u.companyId) {
        const needsReview = professional.has(u.role) ? 1 : 0;
        review += needsReview;
        insLink.run(uuid(), u.id, u.companyId, u.role, u.createdAt || now, 'migration:002', needsReview);
      }
    }
    db.prepare('INSERT INTO audit_events (id, at, action, entity, details) VALUES (?, ?, ?, ?, ?)').run(
      uuid(),
      now,
      'migration.backfill',
      'user_company_links',
      JSON.stringify({
        migration: '002_identity',
        users: users.length,
        linksNeedingReview: review,
        note: 'vínculos de consultor/auditor/supervisor migrados do campo users.companyId exigem confirmação pela Administração',
      }),
    );
  },
};
