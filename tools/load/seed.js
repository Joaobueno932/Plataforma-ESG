// Massa de dados de CARGA, identificada e removível (empresas "CARGA-NNN", e-mails @carga.invalid).
// Grava direto na base isolada `plataforma_esg_load` com os módulos da própria API.
//
//   node tools/load/seed.js            → recria a massa (limpa a base de carga antes)
//   LOAD_COMPANIES=120 node tools/load/seed.js
//
// Catálogo: a planilha oficial é importada e publicada (69 indicadores por ciclo), para o volume
// refletir o uso real — não o seed demonstrativo de 8 indicadores.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
Object.assign(process.env, {
  NODE_ENV: 'development',
  DB_HOST: process.env.LOAD_DB_HOST || '127.0.0.1',
  DB_PORT: process.env.LOAD_DB_PORT || '3307',
  DB_NAME: 'plataforma_esg_load',
  DB_USER: process.env.LOAD_DB_USER || 'esg',
  DB_PASSWORD: process.env.LOAD_DB_PASSWORD || 'esg-local-dev',
});
const db = require(path.join(BACKEND, 'src', 'db'));
const catalog = require(path.join(BACKEND, 'src', 'catalog', 'import'));
const { createCycleForCompany } = require(path.join(BACKEND, 'src', 'services'));
const bcrypt = require(path.join(BACKEND, 'node_modules', 'bcryptjs'));

const COMPANIES = Number(process.env.LOAD_COMPANIES || 60);
const PASSWORD = 'Carga-Ensaio-2026';
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SIZES = ['MICRO_PEQUENA', 'MEDIA', 'GRANDE'];
const PER_PROFESSIONAL = 10;
const OUT = path.join(__dirname, 'out');

/** CNPJ válido (dígitos verificadores) a partir de um número de ordem. */
function cnpj(n) {
  const base = `9${String(n).padStart(7, '0')}0001`.split('').map(Number);
  const dv = (digits) => {
    const weights = digits.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = digits.reduce((s, d, i) => s + d * weights[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

async function main() {
  await db.init({ runMigrations: true });
  await db.truncateAll();
  const at = db.now();
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const users = [];

  const addUser = async (name, email, role, companies) => {
    const id = db.uuid();
    await db.run(
      "INSERT INTO users (id, name, email, password, role, companyId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
      id, name, email, hash, role, ['MANAGER', 'EMPLOYEE'].includes(role) ? companies[0] : null, at, at,
    );
    await db.run('INSERT INTO user_profiles (id, userId, role, grantedAt, origin) VALUES (?, ?, ?, ?, ?)', db.uuid(), id, role, at, 'carga');
    if (role !== 'ADMIN')
      for (const companyId of companies)
        await db.run('INSERT INTO user_company_links (id, userId, companyId, role, grantedAt, origin, needsReview) VALUES (?, ?, ?, ?, ?, ?, 0)', db.uuid(), id, companyId, role, at, 'carga');
    users.push({ id, email, role, companies });
    return id;
  };

  const adminId = await addUser('CARGA Administração', 'admin@carga.invalid', 'ADMIN', []);

  // Catálogo oficial publicado.
  const xlsx = fs.readdirSync(ROOT).find((f) => /^Indicadores.*\.xlsx$/i.test(f));
  if (!xlsx) throw new Error('planilha oficial não encontrada na raiz do projeto');
  const { version } = await catalog.createDraft(fs.readFileSync(path.join(ROOT, xlsx)), { sourceFile: xlsx, label: 'carga-oficial', actorId: adminId });
  await catalog.publish(version.id, { actorId: adminId, acknowledge: true });

  // Empresas e ciclos.
  const companies = [];
  for (let i = 1; i <= COMPANIES; i += 1) {
    const id = `carga-${String(i).padStart(3, '0')}`;
    const section = SECTIONS[(i - 1) % SECTIONS.length];
    await db.run(
      `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, avatar, access, reportAccess, status, origin, needsReview, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0, 'ACTIVE', 'carga', 0, ?, ?)`,
      id, `CARGA-${String(i).padStart(3, '0')} Indústria de Ensaio`, `CARGA ${String(i).padStart(3, '0')} Ltda`, `empresa${i}@carga.invalid`, cnpj(i),
      at, SIZES[i % SIZES.length], section, at, at,
    );
    const company = await db.one('SELECT * FROM companies WHERE id = ?', id);
    const reportId = await createCycleForCompany(company, { createdById: adminId });
    await db.run('INSERT IGNORE INTO cycle_rounds (id, reportId, round, openedAt, openedById, reason) VALUES (?, ?, 1, ?, ?, ?)', db.uuid(), reportId, at, adminId, 'carga');
    companies.push({ id, reportId, section });
    const n = String(i).padStart(3, '0');
    await addUser(`CARGA Gestor ${n}`, `gestor.${n}@carga.invalid`, 'MANAGER', [id]);
    await addUser(`CARGA Colaborador ${n}a`, `colab.${n}a@carga.invalid`, 'EMPLOYEE', [id]);
    await addUser(`CARGA Colaborador ${n}b`, `colab.${n}b@carga.invalid`, 'EMPLOYEE', [id]);
  }

  // Profissionais com várias empresas (blocos de 10), e designação de auditor e supervisor.
  for (let g = 0; g * PER_PROFESSIONAL < companies.length; g += 1) {
    const block = companies.slice(g * PER_PROFESSIONAL, (g + 1) * PER_PROFESSIONAL);
    const ids = block.map((c) => c.id);
    await addUser(`CARGA Consultor ${g + 1}`, `consultor.${g + 1}@carga.invalid`, 'CONSULTOR', ids);
    const auditor = await addUser(`CARGA Auditor ${g + 1}`, `auditor.${g + 1}@carga.invalid`, 'AUDITOR', ids);
    const supervisor = await addUser(`CARGA Supervisor ${g + 1}`, `supervisor.${g + 1}@carga.invalid`, 'SUPERVISOR', ids);
    for (const c of block)
      for (const [userId, role] of [[auditor, 'AUDITOR'], [supervisor, 'SUPERVISOR']])
        await db.run('INSERT INTO cycle_professionals (id, reportId, userId, role, assignedAt, assignedById) VALUES (?, ?, ?, ?, ?, ?)', db.uuid(), c.reportId, userId, role, at, adminId);
  }

  // Volume de trabalho já feito: em cada empresa, metade dos indicadores com resposta enviada
  // e aprovada (versão 1), parte em rascunho, e dois indicadores atribuídos a cada colaborador.
  for (const c of companies) {
    const items = await db.all('SELECT qr.id, qr.questionId FROM question_reports qr WHERE qr.reportId = ? ORDER BY qr.id', c.reportId);
    const colabs = users.filter((u) => u.role === 'EMPLOYEE' && u.companies[0] === c.id);
    const gestor = users.find((u) => u.role === 'MANAGER' && u.companies[0] === c.id);
    for (const [index, item] of items.entries()) {
      const answer = await db.one('SELECT id FROM answers WHERE questionId = ? ORDER BY points DESC LIMIT 1', item.questionId);
      const assignee = index < colabs.length * 2 ? colabs[index % colabs.length].id : gestor.id;
      if (index % 2 === 0) {
        await db.run(
          `UPDATE question_reports SET selectedAnswerId = ?, answerText = 'resposta de carga', answerState = 'submitted', answerVersion = 1,
                  reviewedAnswerVersion = 1, status = 'ApprovedByManager', answererId = ?, answeredById = ?, answeredByRole = 'MANAGER',
                  answeredAt = ?, submittedAt = ?, submittedById = ?, submittedByRole = 'MANAGER', updatedAt = ? WHERE id = ?`,
          answer.id, assignee, gestor.id, at, at, gestor.id, at, item.id,
        );
        await db.run(
          `INSERT INTO item_answer_versions (id, questionReportId, reportId, round, answerVersion, status, selectedAnswerId, answerText, nonApplicable,
                                             answeredById, answeredByRole, answeredAt, files, snapshotAt, snapshotReason)
           VALUES (?, ?, ?, 1, 1, 'PendingValidationByManager', ?, 'resposta de carga', 0, ?, 'MANAGER', ?, '[]', ?, 'submit')`,
          db.uuid(), item.id, c.reportId, answer.id, gestor.id, at, at,
        );
      } else if (index % 4 === 1) {
        await db.run("UPDATE question_reports SET selectedAnswerId = ?, answerText = 'rascunho de carga', answerState = 'draft', answererId = ?, draftById = ?, draftUpdatedAt = ? WHERE id = ?", answer.id, assignee, gestor.id, at, item.id);
      } else {
        await db.run('UPDATE question_reports SET answererId = ? WHERE id = ?', assignee, item.id);
      }
    }
    await db.run(
      "INSERT INTO pendings (id, reportId, round, kind, description, responsibleId, status, createdById, createdByRole, createdAt) VALUES (?, ?, 1, 'falta-resposta', 'pendência de carga', ?, 'aberta', ?, 'MANAGER', ?)",
      db.uuid(), c.reportId, gestor.id, gestor.id, at,
    );
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'massa.json'), JSON.stringify({ password: PASSWORD, companies, users }, null, 2));
  const counts = {};
  for (const t of ['companies', 'users', 'question_reports', 'answers', 'questions', 'item_answer_versions', 'pendings', 'cycle_professionals'])
    counts[t] = Number((await db.one(`SELECT count(*) AS n FROM ${t}`)).n);
  console.log(`massa de carga pronta (versão ${version.label}):`, JSON.stringify(counts));
  await db.close();
}

main().catch(async (err) => {
  console.error('erro:', err.message);
  process.exitCode = 1;
  await db.close().catch(() => {});
});
