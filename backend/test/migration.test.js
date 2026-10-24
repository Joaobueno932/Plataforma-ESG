const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

process.env.NODE_ENV = 'test';

const BASELINE_SQLITE = require('../src/migrations/sqlite/001_baseline');
const sqliteMigrations = require('../src/migrations/sqlite');
const migrations = require('../src/migrations');
const config = require('../src/config');
const db = require('../src/db');

const ROOT = path.resolve(__dirname, '..');

/**
 * Duas garantias, nesta ordem:
 *
 * 1. o histórico SQLite congelado continua levando uma base representativa do sistema antigo
 *    ao estado final, preservando dados, ids e relacionamentos (é o pré-requisito da
 *    transferência);
 * 2. o esquema MySQL recebe essa base por `scripts/sqlite-to-mysql.js` sem perder nada e com
 *    as constraints novas valendo — ciclo por empresa, e-mail e CNPJ ativos únicos, e as
 *    cascatas que apagavam avaliação convertidas em RESTRICT.
 */
function legacyDatabase() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'esg-mig-')), 'legacy.sqlite');
  const legacy = new DatabaseSync(file);
  legacy.exec('PRAGMA foreign_keys = ON');
  BASELINE_SQLITE.up(legacy); // esquema antigo, sem as tabelas novas

  const at = '2026-01-10T12:00:00.000Z';
  legacy.exec(`
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
  return { file, legacy };
}

test('histórico SQLite congelado prepara a base herdada sem perder nada', async (t) => {
  const { file, legacy } = legacyDatabase();
  t.after(() => legacy.close());

  const before = {
    companies: legacy.prepare('SELECT count(*) AS n FROM companies').get().n,
    users: legacy.prepare('SELECT count(*) AS n FROM users').get().n,
    reports: legacy.prepare('SELECT count(*) AS n FROM reports').get().n,
    items: legacy.prepare('SELECT count(*) AS n FROM question_reports').get().n,
    answers: legacy.prepare('SELECT count(*) AS n FROM answers').get().n,
    files: legacy.prepare('SELECT count(*) AS n FROM question_report_files').get().n,
    evidences: legacy.prepare('SELECT count(*) AS n FROM evidences').get().n,
  };

  await t.test('o esquema antigo realmente impedia um segundo ciclo', () => {
    assert.throws(
      () =>
        legacy
          .prepare(
            "INSERT INTO reports (id, companyId, initialYear, finalYear, structure, description, status, createdAt, updatedAt) VALUES ('r1b','c1','x','x','s','d','Pending','x','x')",
          )
          .run(),
      /UNIQUE/i,
    );
  });

  await t.test('aplica o histórico com integridade e sem órfãos', () => {
    legacy.exec('PRAGMA foreign_keys = ON');
    const applied = sqliteMigrations.migrate(legacy);
    assert.deepEqual(applied, migrations.SQLITE_HISTORY);
    assert.equal(Object.values(legacy.prepare('PRAGMA integrity_check').get())[0], 'ok');
    assert.deepEqual(legacy.prepare('PRAGMA foreign_key_check').all(), []);
    // Idempotente: rodar de novo não aplica nada.
    assert.deepEqual(sqliteMigrations.migrate(legacy), []);
  });

  await t.test('dados, ids e relacionamentos preservados', () => {
    const after = {
      companies: legacy.prepare('SELECT count(*) AS n FROM companies').get().n,
      users: legacy.prepare('SELECT count(*) AS n FROM users').get().n,
      reports: legacy.prepare('SELECT count(*) AS n FROM reports').get().n,
      items: legacy.prepare('SELECT count(*) AS n FROM question_reports').get().n,
      answers: legacy.prepare('SELECT count(*) AS n FROM answers').get().n,
      files: legacy.prepare('SELECT count(*) AS n FROM question_report_files').get().n,
      evidences: legacy.prepare('SELECT count(*) AS n FROM evidences').get().n,
    };
    assert.deepEqual(after, before);
    const item = legacy.prepare('SELECT * FROM question_reports WHERE id = ?').get('qr1');
    assert.equal(item.answerText, 'resposta preservada');
    assert.equal(item.selectedAnswerId, 'a2');
    assert.equal(item.answererId, 'u-func');
    assert.equal(item.answeredById, 'u-func', 'autoria conhecida foi preenchida a partir do responsável');
    assert.equal(legacy.prepare('SELECT questionReportId FROM question_report_files WHERE id = ?').get('qrf1').questionReportId, 'qr1');
    assert.equal(legacy.prepare('SELECT questionReportId FROM evidences WHERE id = ?').get('e1').questionReportId, 'qr1');
  });

  await t.test('perfis e vínculos migrados do modelo antigo, profissionais marcados para revisão', () => {
    const profiles = legacy.prepare('SELECT userId, role FROM user_profiles ORDER BY userId').all().map((r) => ({ ...r }));
    assert.equal(profiles.length, 5);
    assert.deepEqual(
      profiles.find((p) => p.userId === 'u-gestor'),
      { userId: 'u-gestor', role: 'MANAGER' },
    );
    const links = legacy.prepare('SELECT userId, companyId, role, needsReview FROM user_company_links ORDER BY userId').all().map((r) => ({ ...r }));
    assert.equal(links.length, 4, 'o administrador não tem vínculo de empresa');
    assert.equal(links.find((l) => l.userId === 'u-cons').needsReview, 1, 'vínculo de consultor exige confirmação');
    assert.equal(links.find((l) => l.userId === 'u-aud').needsReview, 1);
    assert.equal(links.find((l) => l.userId === 'u-gestor').needsReview, 0);
    // Nenhuma designação de ciclo foi inventada.
    assert.equal(legacy.prepare('SELECT count(*) AS n FROM cycle_professionals').get().n, 0);
  });

  await t.test('ciclos, caderno e versão de catálogo registrados', () => {
    const r1 = legacy.prepare('SELECT * FROM reports WHERE id = ?').get('r1');
    assert.equal(r1.cycle, 1);
    assert.equal(r1.section, 'A');
    assert.equal(r1.catalogVersion, 'legacy-demo');
    assert.equal(r1.origin, 'legacy');
    assert.equal(r1.needsReview, 1);
    assert.equal(r1.currentRound, 1);
  });

  await t.test('a trilha registra o que a migração fez', () => {
    const events = legacy.prepare("SELECT action, entity, details FROM audit_events WHERE action = 'migration.backfill'").all().map((r) => ({ ...r }));
    assert.equal(events.length, 5);
    const links = JSON.parse(events.find((e) => e.entity === 'user_company_links').details);
    assert.equal(links.linksNeedingReview, 2);
  });

  await t.test('catálogo herdado fica isolado na versão legacy-demo', () => {
    const version = legacy.prepare("SELECT * FROM catalog_versions WHERE id = 'legacy-demo'").get();
    assert.equal(version.origin, 'demo');
    assert.equal(version.status, 'published');
    assert.equal(legacy.prepare('SELECT count(*) AS n FROM questions WHERE versionId = ?').get('legacy-demo').n, 2);
    assert.equal(legacy.prepare("SELECT count(*) AS n FROM reports WHERE catalogVersionId = 'legacy-demo'").get().n, 2);
    // Ordem e máximo preenchidos a partir do que já existia, sem inventar dados.
    const q = legacy.prepare("SELECT * FROM questions WHERE code = 'CG-E01'").get();
    assert.equal(q.maxPoints, 10);
    assert.equal(q.position, 1);
    assert.ok(q.mandatoryAnswerId, 'o nível mínimo obrigatório aponta para a alternativa');
    assert.equal(legacy.prepare('SELECT title FROM answers WHERE id = ?').get(q.mandatoryAnswerId).title, 'Conforme');
  });

  await t.test('a cópia de trabalho não é o arquivo herdado configurado', () => {
    assert.ok(fs.existsSync(file));
    assert.notEqual(path.resolve(file), path.resolve(config.legacySqliteFile));
  });
});

test('transferência SQLite → MySQL preserva a base herdada e aplica as constraints novas', async (t) => {
  const { file, legacy } = legacyDatabase();
  legacy.close(); // a transferência trabalha sobre uma cópia; o arquivo fica livre

  try {
    await db.init({ runMigrations: true });
  } catch (err) {
    throw new Error(
      `não foi possível conectar ao MySQL de teste (${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}): ` +
        `${err.code || err.message}. Suba o banco com "docker compose up -d mysql" na raiz do projeto.`,
    );
  }
  t.after(() => db.close());

  await t.test('o esquema MySQL nasce consolidado e é idempotente', async () => {
    assert.deepEqual(await db.pendingMigrations(), [], 'baseline já aplicada');
    assert.deepEqual(await migrations.migrate(db), []);
    const { n } = await db.one(
      "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    );
    assert.ok(Number(n) >= 31, `esquema com ${n} tabelas`);
  });

  await t.test('o script transfere tudo, em ensaio e depois aplicando', async () => {
    const run = (args) =>
      execFileSync(process.execPath, ['--no-warnings', '--env-file-if-exists=.env', 'scripts/sqlite-to-mysql.js', ...args], {
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: 'test', LEGACY_SQLITE_FILE: file },
        encoding: 'utf8',
      });

    const dry = run([]);
    assert.match(dry, /modo\s+: ENSAIO/);
    assert.match(dry, /Ensaio concluído/);
    assert.match(dry, /o arquivo de origem não é alterado/);

    const applied = run(['--apply', '--truncate', '--confirm']);
    assert.match(applied, /destino limpo \(\d+ tabelas\)/);
    assert.match(applied, /migrações SQLite aplicadas na cópia: .*009_scoring/);
    assert.match(applied, /referências adiadas preenchidas: 1/, 'mandatoryAnswerId só pode ser preenchido depois das alternativas');
    assert.match(applied, /RESULTADO: todas as tabelas transferidas/);
  });

  await t.test('dados, ids, autoria e relacionamentos chegaram íntegros', async () => {
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM companies')).n), 2);
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM users')).n), 5);
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM question_reports')).n), 3);
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM user_profiles')).n), 5);
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM user_company_links')).n), 4);

    const item = await db.one('SELECT * FROM question_reports WHERE id = ?', 'qr1');
    assert.equal(item.answerText, 'resposta preservada');
    assert.equal(item.selectedAnswerId, 'a2');
    assert.equal(item.answererId, 'u-func');
    assert.equal(item.answeredById, 'u-func');
    assert.equal((await db.one('SELECT questionReportId FROM evidences WHERE id = ?', 'e1')).questionReportId, 'qr1');
    const r1 = await db.one('SELECT * FROM reports WHERE id = ?', 'r1');
    assert.equal(r1.cycle, 1);
    assert.equal(r1.catalogVersionId, 'legacy-demo');
    assert.equal(r1.needsReview, 1);
  });

  await t.test('recertificação liberada, ciclo duplicado barrado', async () => {
    await db.run(
      `INSERT INTO reports (id, companyId, cycle, previousReportId, section, catalogVersion, catalogVersionId, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
       VALUES ('r1b', 'c1', 2, 'r1', 'A', 'legacy-demo', 'legacy-demo', 'x', 'x', 's', 'd', 'Pending', 'x', 'x')`,
    );
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM reports WHERE companyId = ?', 'c1')).n), 2);
    await assert.rejects(
      () =>
        db.run(
          `INSERT INTO reports (id, companyId, cycle, section, catalogVersion, catalogVersionId, initialYear, finalYear, structure, description, status, createdAt, updatedAt)
           VALUES ('r1c', 'c1', 2, 'A', 'legacy-demo', 'legacy-demo', 'x', 'x', 's', 'd', 'Pending', 'x', 'x')`,
        ),
      /ER_DUP_ENTRY|Duplicate entry/i,
      'ciclo duplicado para a mesma empresa continua barrado',
    );
    await db.run('DELETE FROM reports WHERE id = ?', 'r1b');
  });

  await t.test('cascatas que apagavam avaliação viraram RESTRICT', async () => {
    const barrado = /ER_ROW_IS_REFERENCED|foreign key constraint fails/i;
    await assert.rejects(() => db.run('DELETE FROM questions WHERE id = ?', 'q1'), barrado);
    await assert.rejects(() => db.run('DELETE FROM answers WHERE id = ?', 'a2'), barrado);
    await assert.rejects(() => db.run('DELETE FROM companies WHERE id = ?', 'c1'), barrado);
    await assert.rejects(() => db.run('DELETE FROM company_files WHERE id = ?', 'f1'), barrado);
    await assert.rejects(() => db.run('DELETE FROM reports WHERE id = ?', 'r1'), barrado);
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM question_reports')).n), 3, 'o histórico continua lá');
  });

  await t.test('e-mail e CNPJ únicos apenas entre cadastros ativos', async () => {
    await assert.rejects(
      () =>
        db.run(
          "INSERT INTO users (id, name, email, password, role, createdAt, updatedAt) VALUES ('u-dup','Dup','GESTOR@X.COM','h','MANAGER','x','x')",
        ),
      /ER_DUP_ENTRY|Duplicate entry/i,
      'e-mail ativo duplicado é impedido no banco, independente de caixa',
    );
    await assert.rejects(
      () =>
        db.run(
          `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, access, reportAccess, createdAt, updatedAt)
           VALUES ('c-dup','Alfa 2','Alfa 2 Ltda','a2@a.com','11222333000181','x','MEDIA','A',1,0,'x','x')`,
        ),
      /ER_DUP_ENTRY|Duplicate entry/i,
    );
    // Depois de inativar, o mesmo CNPJ pode ser cadastrado de novo (o índice só vale para ativos).
    await db.run('UPDATE companies SET deletedAt = ? WHERE id = ?', '2026-02-01T00:00:00.000Z', 'c2');
    await db.run(
      `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, access, reportAccess, createdAt, updatedAt)
       VALUES ('c2-novo','Beta Nova','Beta Nova Ltda','b2@b.com','44555666000181','x','GRANDE','B',1,0,'x','x')`,
    );
    assert.equal(Number((await db.one('SELECT count(*) AS n FROM companies WHERE cnpj = ?', '44555666000181')).n), 2);
    await db.run('DELETE FROM companies WHERE id = ?', 'c2-novo');
    await db.run('UPDATE companies SET deletedAt = NULL WHERE id = ?', 'c2');
  });
});
