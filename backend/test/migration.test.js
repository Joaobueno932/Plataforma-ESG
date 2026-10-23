const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const BASELINE = require('../src/migrations/001_baseline');
const { migrate } = require('../src/migrations');

/**
 * Migração sobre cópia representativa do banco anterior: esquema herdado (com
 * `reports.companyId UNIQUE` e cascatas), dados preenchidos, e então as migrações.
 * Verifica preservação de dados, ids e relacionamentos, e as constraints novas.
 */
function legacyDatabase() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'esg-mig-')), 'legacy.sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  BASELINE.up(db); // esquema antigo, sem as tabelas novas

  const at = '2026-01-10T12:00:00.000Z';
  db.exec(`
    INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, access, reportAccess, createdAt, updatedAt)
    VALUES ('c1', 'Alfa', 'Alfa Ltda', 'a@a.com', '11222333000181', '${at}', 'MEDIA', 'A', 1, 0, '${at}', '${at}'),
           ('c2', 'Beta', 'Beta Ltda', 'b@b.com', '44555666000181', '${at}', 'GRANDE', 'B', 1, 0, '${at}', '${at}');

    INSERT INTO users (id, name, email, password, role, companyId, createdAt, updatedAt) VALUES
      ('u-admin', 'Admin', 'admin@x.com', 'hash', 'ADMIN', NULL, '${at}', '${at}'),
      ('u-gestor', 'Gestor', 'gestor@x.com', 'hash', 'MANAGER', 'c1', '${at}', '${at}'),
      ('u-func', 'Func', 'func@x.com', 'hash', 'EMPLOYEE', 'c1', '${at}', '${at}'),
      ('u-cons', 'Consultor', 'cons@x.com', 'hash', 'CONSULTOR', 'c2', '${at}', '${at}'),
      ('u-aud', 'Auditor', 'aud@x.com', 'hash', 'AUDITOR', 'c1', '${at}', '${at}');

    INSERT INTO sectors (section, description, avatar) VALUES ('All', 'Geral', 'x'), ('A', 'A', 'x'), ('B', 'B', 'x');

    INSERT INTO questions (id, code, section, title, description, category, hasMandatory, createdAt)
    VALUES ('q1', 'CG-E01', 'All', 'Licenciamento', 'desc', 'E', 1, '${at}'),
           ('q2', 'A-S01', 'A', 'Comunidade', 'desc', 'S', 0, '${at}');

    INSERT INTO answers (id, questionId, title, points, description, mandatory) VALUES
      ('a1', 'q1', 'Nao_conforme', 0, 'd', 0),
      ('a2', 'q1', 'Conforme', 10, 'd', 1),
      ('a3', 'q2', 'Nao_conforme', 0, 'd', 0),
      ('a4', 'q2', 'Conforme', 10, 'd', 0);

    INSERT INTO reports (id, companyId, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
    VALUES ('r1', 'c1', '${at}', '${at}', 'Programa', 'Caderno', 'Pending', '${at}', '${at}'),
           ('r2', 'c2', '${at}', '${at}', 'Programa', 'Caderno', 'Pending', '${at}', '${at}');

    INSERT INTO question_reports (id, reportId, questionId, status, selectedAnswerId, answererId, answerText, createdAt, updatedAt)
    VALUES ('qr1', 'r1', 'q1', 'ApprovedByManager', 'a2', 'u-func', 'resposta preservada', '${at}', '${at}'),
           ('qr2', 'r1', 'q2', 'Pending', NULL, NULL, NULL, '${at}', '${at}'),
           ('qr3', 'r2', 'q1', 'Pending', NULL, NULL, NULL, '${at}', '${at}');

    INSERT INTO company_files (id, companyId, name, url, fileType, inGed, createdAt)
    VALUES ('f1', 'c1', 'licenca.pdf', 'uploads/companyFiles/c1/licenca.pdf', 'application/pdf', 1, '${at}');

    INSERT INTO question_report_files (id, questionReportId, fileId, createdAt) VALUES ('qrf1', 'qr1', 'f1', '${at}');
    INSERT INTO evidences (id, questionReportId, name, url, fileType, createdAt) VALUES ('e1', 'qr1', 'parecer.pdf', 'u/p.pdf', 'application/pdf', '${at}');
  `);
  return { file, db };
}

test('migração sobre banco representativo preserva dados e aplica as constraints', async (t) => {
  const { file, db } = legacyDatabase();
  t.after(() => db.close());

  const before = {
    companies: db.prepare('SELECT count(*) AS n FROM companies').get().n,
    users: db.prepare('SELECT count(*) AS n FROM users').get().n,
    reports: db.prepare('SELECT count(*) AS n FROM reports').get().n,
    items: db.prepare('SELECT count(*) AS n FROM question_reports').get().n,
    answers: db.prepare('SELECT count(*) AS n FROM answers').get().n,
    files: db.prepare('SELECT count(*) AS n FROM question_report_files').get().n,
    evidences: db.prepare('SELECT count(*) AS n FROM evidences').get().n,
  };

  await t.test('o esquema antigo realmente impedia um segundo ciclo', () => {
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO reports (id, companyId, initialYear, finalYear, structure, description, status, createdAt, updatedAt) VALUES ('r1b','c1','x','x','s','d','Pending','x','x')",
          )
          .run(),
      /UNIQUE/i,
    );
  });

  await t.test('aplica as migrações com integridade e sem órfãos', () => {
    db.exec('PRAGMA foreign_keys = ON');
    const applied = migrate(db);
    assert.deepEqual(applied, [
      '001_baseline',
      '002_identity',
      '003_company_registration',
      '004_cycles',
      '005_history_integrity',
      '006_indexes',
      '007_rounds',
      '008_catalog_versions',
    ]);
    assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0], 'ok');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    // Idempotente: rodar de novo não aplica nada.
    assert.deepEqual(migrate(db), []);
  });

  await t.test('dados, ids e relacionamentos preservados', () => {
    const after = {
      companies: db.prepare('SELECT count(*) AS n FROM companies').get().n,
      users: db.prepare('SELECT count(*) AS n FROM users').get().n,
      reports: db.prepare('SELECT count(*) AS n FROM reports').get().n,
      items: db.prepare('SELECT count(*) AS n FROM question_reports').get().n,
      answers: db.prepare('SELECT count(*) AS n FROM answers').get().n,
      files: db.prepare('SELECT count(*) AS n FROM question_report_files').get().n,
      evidences: db.prepare('SELECT count(*) AS n FROM evidences').get().n,
    };
    assert.deepEqual(after, before);
    const item = db.prepare('SELECT * FROM question_reports WHERE id = ?').get('qr1');
    assert.equal(item.answerText, 'resposta preservada');
    assert.equal(item.selectedAnswerId, 'a2');
    assert.equal(item.answererId, 'u-func');
    assert.equal(item.answeredById, 'u-func', 'autoria conhecida foi preenchida a partir do responsável');
    assert.equal(db.prepare('SELECT questionReportId FROM question_report_files WHERE id = ?').get('qrf1').questionReportId, 'qr1');
    assert.equal(db.prepare('SELECT questionReportId FROM evidences WHERE id = ?').get('e1').questionReportId, 'qr1');
  });

  await t.test('perfis e vínculos migrados do modelo antigo, profissionais marcados para revisão', () => {
    const profiles = db.prepare('SELECT userId, role FROM user_profiles ORDER BY userId').all().map((r) => ({ ...r }));
    assert.equal(profiles.length, 5);
    assert.deepEqual(
      profiles.find((p) => p.userId === 'u-gestor'),
      { userId: 'u-gestor', role: 'MANAGER' },
    );
    const links = db.prepare('SELECT userId, companyId, role, needsReview FROM user_company_links ORDER BY userId').all().map((r) => ({ ...r }));
    assert.equal(links.length, 4, 'o administrador não tem vínculo de empresa');
    assert.equal(links.find((l) => l.userId === 'u-cons').needsReview, 1, 'vínculo de consultor exige confirmação');
    assert.equal(links.find((l) => l.userId === 'u-aud').needsReview, 1);
    assert.equal(links.find((l) => l.userId === 'u-gestor').needsReview, 0);
    // Nenhuma designação de ciclo foi inventada.
    assert.equal(db.prepare('SELECT count(*) AS n FROM cycle_professionals').get().n, 0);
  });

  await t.test('ciclos: UNIQUE(companyId) removido, caderno e versão registrados', () => {
    const r1 = db.prepare('SELECT * FROM reports WHERE id = ?').get('r1');
    assert.equal(r1.cycle, 1);
    assert.equal(r1.section, 'A');
    assert.equal(r1.catalogVersion, 'legacy-demo');
    assert.equal(r1.origin, 'legacy');
    assert.equal(r1.needsReview, 1);
    assert.equal(r1.currentRound, 1);
    db.prepare(
      `INSERT INTO reports (id, companyId, cycle, previousReportId, section, catalogVersion, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
       VALUES ('r1b', 'c1', 2, 'r1', 'A', 'legacy-demo', 'x', 'x', 's', 'd', 'Pending', 'x', 'x')`,
    ).run();
    assert.equal(db.prepare('SELECT count(*) AS n FROM reports WHERE companyId = ?').get('c1').n, 2);
    assert.throws(
      () =>
        db
          .prepare(
            `INSERT INTO reports (id, companyId, cycle, section, catalogVersion, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
             VALUES ('r1c', 'c1', 2, 'A', 'legacy-demo', 'x', 'x', 's', 'd', 'Pending', 'x', 'x')`,
          )
          .run(),
      /UNIQUE/i,
      'ciclo duplicado para a mesma empresa continua barrado',
    );
    db.prepare('DELETE FROM reports WHERE id = ?').run('r1b');
  });

  await t.test('cascatas que apagavam avaliação viraram RESTRICT', () => {
    assert.throws(() => db.prepare('DELETE FROM questions WHERE id = ?').run('q1'), /FOREIGN KEY/i);
    assert.throws(() => db.prepare('DELETE FROM answers WHERE id = ?').run('a2'), /FOREIGN KEY/i);
    assert.throws(() => db.prepare('DELETE FROM companies WHERE id = ?').run('c1'), /FOREIGN KEY/i);
    assert.throws(() => db.prepare('DELETE FROM company_files WHERE id = ?').run('f1'), /FOREIGN KEY/i);
    assert.throws(() => db.prepare('DELETE FROM reports WHERE id = ?').run('r1'), /FOREIGN KEY/i);
    // O histórico continua lá depois das tentativas.
    assert.equal(db.prepare('SELECT count(*) AS n FROM question_reports').get().n, before.items);
  });

  await t.test('e-mail duplicado passa a ser impedido no banco', () => {
    assert.throws(
      () =>
        db
          .prepare("INSERT INTO users (id, name, email, password, role, createdAt, updatedAt) VALUES ('u-dup','Dup','GESTOR@X.COM','h','MANAGER','x','x')")
          .run(),
      /UNIQUE/i,
    );
  });

  await t.test('a trilha registra o que a migração fez', () => {
    const events = db.prepare("SELECT action, entity, details FROM audit_events WHERE action = 'migration.backfill'").all().map((r) => ({ ...r }));
    assert.equal(events.length, 4);
    const links = JSON.parse(events.find((e) => e.entity === 'user_company_links').details);
    assert.equal(links.linksNeedingReview, 2);
  });

  await t.test('catálogo herdado fica isolado na versão legacy-demo', () => {
    const version = db.prepare("SELECT * FROM catalog_versions WHERE id = 'legacy-demo'").get();
    assert.equal(version.origin, 'demo');
    assert.equal(version.status, 'published');
    const questions = db.prepare('SELECT count(*) AS n FROM questions WHERE versionId = ?').get('legacy-demo').n;
    assert.equal(questions, 2, 'os indicadores herdados foram atribuídos à versão demonstrativa');
    const cycles = db.prepare("SELECT count(*) AS n FROM reports WHERE catalogVersionId = 'legacy-demo'").get().n;
    assert.equal(cycles, 2);
    // Ordem e máximo preenchidos a partir do que já existia, sem inventar dados.
    const q = db.prepare("SELECT * FROM questions WHERE code = 'CG-E01'").get();
    assert.equal(q.maxPoints, 10);
    assert.equal(q.position, 1);
    assert.ok(q.mandatoryAnswerId, 'o nível mínimo obrigatório aponta para a alternativa');
    assert.equal(db.prepare('SELECT title FROM answers WHERE id = ?').get(q.mandatoryAnswerId).title, 'Conforme');
  });

  await t.test('arquivo da migração em cópia isolada não tocou o banco de trabalho', () => {
    assert.ok(fs.existsSync(file));
    assert.notEqual(path.resolve(file), path.resolve(require('../src/config').dbFile));
  });
});
