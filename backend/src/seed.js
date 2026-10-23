/**
 * Dados iniciais do ambiente local — **demonstração**, não dados reais.
 *
 * - Cadernos (setores A–H + Geral): rótulos observados no sistema antigo. A denominação
 *   oficial completa está na planilha e entra com a importação do catálogo (docs/esg/regras.md C11).
 * - Indicadores: DEMONSTRATIVOS (diagnóstico A1). O catálogo oficial tem 59 indicadores gerais
 *   + 10 por caderno setorial e entra na etapa E3.
 * - Pessoas e empresas: fictícias, uma por perfil, para exercitar os fluxos. As empresas são
 *   marcadas com `origin = 'demo'` e aparecem em GET /admin/review.
 */
const passwords = require('./password');
const db = require('./db');
const { createCycleForCompany } = require('./services');

const slug = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const SECTORS = [
  ['All', 'Caderno Geral', 'static/sectorCovers/caderno_geral.jpeg'],
  ['A', 'Alimentos e Bebidas', 'static/sectorCovers/caderno_a.jpeg'],
  ['B', 'Indústria Frigorífica e Derivados', 'static/sectorCovers/caderno_b.jpeg'],
  ['C', 'Construção Civil', 'static/sectorCovers/caderno_c.jpeg'],
  ['D', 'Indústrias de Transformação Diversas', 'static/sectorCovers/caderno_d.jpeg'],
  ['E', 'Energia, Telecomunicações, Resíduos e Similares', 'static/sectorCovers/caderno_e.jpeg'],
  ['F', 'Extração de Minerais Metálicos, Não Metálicos/Agroindústria', 'static/sectorCovers/caderno_f.jpeg'],
  ['G', 'Papel e Celulose', 'static/sectorCovers/caderno_g.jpeg'],
  ['H', 'Calçados e Componentes para Calçados, Couro, Confecções Têxteis e Artefatos', 'static/sectorCovers/caderno_h.jpeg'],
];

const LEVELS = [
  ['Nao_conforme', 0, 'A empresa não atende ao requisito.'],
  ['Iniciante', 2, 'A empresa reconhece o tema, mas não possui ações estruturadas.'],
  ['Sensibilizada', 4, 'Existem ações pontuais, ainda sem formalização.'],
  ['Consciente', 6, 'Existem práticas formalizadas e comunicadas internamente.'],
  ['Engajado', 8, 'As práticas são monitoradas por indicadores e metas.'],
  ['Conforme', 10, 'As práticas são auditáveis, com melhoria contínua comprovada.'],
];

// [section, category, subcategory, title, description, mandatoryLevel]
const DEMO_QUESTIONS = [
  ['All', 'E', 'Licenciamento', 'Licenciamento ambiental', 'A empresa mantém as licenças ambientais aplicáveis vigentes. Verificação: licenças de operação válidas e protocolos de renovação.', 'Conforme'],
  ['All', 'E', 'Resíduos', 'Gestão de resíduos sólidos', 'A empresa possui plano de gerenciamento de resíduos sólidos. Verificação: PGRS, manifestos de transporte e certificados de destinação.', null],
  ['All', 'S', 'Saúde e Segurança', 'Saúde e segurança do trabalho', 'A empresa cumpre as normas regulamentadoras de SST aplicáveis. Verificação: PGR, PCMSO e registros de treinamento.', 'Conforme'],
  ['All', 'S', 'Diversidade', 'Diversidade e inclusão', 'A empresa promove ações de diversidade e inclusão. Verificação: política publicada e indicadores de diversidade.', null],
  ['All', 'G', 'Ética', 'Código de ética e conduta', 'A empresa possui código de ética divulgado aos colaboradores. Verificação: documento aprovado e evidências de comunicação.', null],
  ['All', 'G', 'Compliance', 'Programa de integridade', 'A empresa mantém canal de denúncias e programa anticorrupção. Verificação: canal ativo e relatórios de tratamento.', null],
  ...SECTORS.filter(([s]) => s !== 'All').flatMap(([s, desc]) => [
    [s, 'E', 'Eficiência', `Eficiência no uso de recursos (${desc})`, 'A empresa monitora o consumo de água e energia do setor. Verificação: séries históricas de consumo e metas de redução.', null],
    [s, 'S', 'Comunidade', `Relacionamento com a comunidade (${desc})`, 'A empresa desenvolve ações junto à comunidade do entorno. Verificação: registros das ações e canais de diálogo.', null],
  ]),
];

const DEMO_COMPANIES = [
  { id: 'demo-company-a', bussinessName: 'Empresa Demonstração', legalName: 'Empresa Demonstração Ltda', email: 'contato@demo.local', cnpj: '11222333000181', size: 'MEDIA', section: 'A' },
  { id: 'demo-company-b', bussinessName: 'Indústria Exemplo', legalName: 'Indústria Exemplo S.A.', email: 'contato@exemplo.local', cnpj: '44555666000181', size: 'GRANDE', section: 'B' },
];

/** [nome, e-mail, senha, perfis, empresas] — senhas de demonstração, mínimo de 8 caracteres. */
const DEMO_USERS = [
  ['Administrador ESG', 'admin@esgdemo.com.br', 'admin123', ['ADMIN'], []],
  ['Gestora Demonstração', 'gestor@esgdemo.com.br', 'esgdemo123', ['MANAGER'], ['demo-company-a']],
  ['Funcionário Demonstração', 'funcionario@esgdemo.com.br', 'esgdemo123', ['EMPLOYEE'], ['demo-company-a']],
  ['Consultor Demonstração', 'consultor@esgdemo.com.br', 'esgdemo123', ['CONSULTOR'], ['demo-company-a', 'demo-company-b']],
  ['Auditora Demonstração', 'auditor@esgdemo.com.br', 'esgdemo123', ['AUDITOR'], ['demo-company-a']],
  ['Supervisor Demonstração', 'supervisor@esgdemo.com.br', 'esgdemo123', ['SUPERVISOR'], ['demo-company-a']],
  ['Gestor Exemplo', 'gestor.exemplo@esgdemo.com.br', 'esgdemo123', ['MANAGER'], ['demo-company-b']],
  // Único acúmulo permitido: ADMIN + CONSULTOR.
  ['Admin Consultora', 'admin.consultor@esgdemo.com.br', 'esgdemo123', ['ADMIN', 'CONSULTOR'], ['demo-company-b']],
];

async function seed() {
  await db.transaction(async () => {
    for (const [section, description, avatar] of SECTORS)
      await db.run('INSERT IGNORE INTO sectors (section, description, avatar) VALUES (?, ?, ?)', section, description, avatar);

    // Catálogo de DEMONSTRAÇÃO: fica na versão 'legacy-demo', separada das versões oficiais
    // importadas da planilha (ver src/catalog/). A versão é criada aqui porque é dado de
    // demonstração, não de migração.
    await db.run(
      `INSERT IGNORE INTO catalog_versions (id, label, origin, status, notes, counts, createdAt, publishedAt)
       VALUES ('legacy-demo', 'legacy-demo', 'demo', 'published', ?, ?, ?, ?)`,
      'Catálogo demonstrativo da reconstrução anterior (não oficial). Preservado para os ciclos de demonstração.',
      JSON.stringify({ indicators: DEMO_QUESTIONS.length }),
      db.now(),
      db.now(),
    );

    const counters = {};
    let position = 0;
    for (const [section, category, subcategory, title, description, mandatory] of DEMO_QUESTIONS) {
      const key = `${section}-${category}`;
      counters[key] = (counters[key] || 0) + 1;
      const id = db.uuid();
      position += 1;
      const code = `${section === 'All' ? 'CG' : section}-${category}${String(counters[key]).padStart(2, '0')}`;
      const maxPoints = LEVELS.reduce((acc, [, points]) => Math.max(acc, points), 0);
      await db.run(
        `INSERT INTO questions (id, versionId, code, codeOriginal, section, title, description, category, subcategory, topic,
                                maxPoints, hasMandatory, position, origin, createdAt)
         VALUES (?, 'legacy-demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo', ?)`,
        id, code, code, section, title, description, category, subcategory, subcategory, maxPoints, mandatory ? 1 : 0, position, db.now(),
      );
      let mandatoryAnswerId = null;
      // Sequencial: dentro de uma transação a conexão é única e não aceita consultas em paralelo.
      for (const [index, [level, points, text]] of LEVELS.entries()) {
        const answerId = db.uuid();
        const isMinimum = level === mandatory;
        await db.run(
          'INSERT INTO answers (id, questionId, title, points, description, mandatory, position, slug, presentation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          answerId, id, level, points, text, isMinimum ? 1 : 0, index + 1, slug(level), slug(level),
        );
        if (isMinimum) mandatoryAnswerId = answerId;
      }
      if (mandatoryAnswerId) await db.run('UPDATE questions SET mandatoryAnswerId = ? WHERE id = ?', mandatoryAnswerId, id);
    }

    const at = db.now();
    for (const c of DEMO_COMPANIES) {
      await db.run(
        `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, avatar, access, reportAccess, status, origin, needsReview, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0, 'ACTIVE', 'demo', 1, ?, ?)`,
        c.id, c.bussinessName, c.legalName, c.email, c.cnpj, '2024-07-01T00:00:00.000Z', c.size, c.section, at, at,
      );
    }

    const userIds = {};
    for (const [name, email, password, roles, companies] of DEMO_USERS) {
      const id = db.uuid();
      userIds[email] = id;
      const primary = roles.includes('ADMIN') ? 'ADMIN' : roles[0];
      await db.run(
        `INSERT INTO users (id, name, email, password, role, companyId, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
        id, name, email, passwords.hashSync(password), primary,
        companies.length && ['MANAGER', 'EMPLOYEE'].includes(primary) ? companies[0] : null, at, at,
      );
      for (const role of roles)
        await db.run('INSERT INTO user_profiles (id, userId, role, grantedAt, origin) VALUES (?, ?, ?, ?, ?)', db.uuid(), id, role, at, 'seed');
      for (const role of roles.filter((r) => r !== 'ADMIN'))
        for (const companyId of companies)
          await db.run(
            'INSERT INTO user_company_links (id, userId, companyId, role, grantedAt, origin, needsReview) VALUES (?, ?, ?, ?, ?, ?, 0)',
            db.uuid(), id, companyId, role, at, 'seed',
          );
    }

    // Ciclo 1 de cada empresa, com o caderno e a versão de catálogo congelados.
    for (const c of DEMO_COMPANIES) {
      const reportId = await createCycleForCompany(await db.one('SELECT * FROM companies WHERE id = ?', c.id), {
        createdById: userIds['admin@esgdemo.com.br'],
        catalogVersionId: 'legacy-demo',
      });
      await db.run('INSERT IGNORE INTO cycle_rounds (id, reportId, round, openedAt, openedById, reason) VALUES (?, ?, 1, ?, ?, ?)', db.uuid(), reportId, at, userIds['admin@esgdemo.com.br'], 'seed');
      if (c.id === 'demo-company-a') {
        // Designações do ciclo (auditor e supervisor são designados, não apenas vinculados).
        for (const [email, role] of [['auditor@esgdemo.com.br', 'AUDITOR'], ['supervisor@esgdemo.com.br', 'SUPERVISOR']])
          await db.run(
            'INSERT INTO cycle_professionals (id, reportId, userId, role, assignedAt, assignedById) VALUES (?, ?, ?, ?, ?, ?)',
            db.uuid(), reportId, userIds[email], role, at, userIds['admin@esgdemo.com.br'],
          );
      }
    }
  });
}

async function seedIfEmpty() {
  const { n } = await db.one('SELECT count(*) AS n FROM users');
  if (Number(n) === 0) {
    await seed();
    console.log('Banco inicializado com dados de demonstração (admin@esgdemo.com.br / admin123).');
    return true;
  }
  return false;
}

module.exports = { seed, seedIfEmpty, DEMO_USERS, DEMO_COMPANIES };

if (require.main === module) {
  db.init({ runMigrations: true })
    .then(seedIfEmpty)
    .then((seeded) => console.log(seeded ? 'seed aplicado' : 'banco já possui usuários: seed não aplicado'))
    .catch((err) => {
      console.error(`erro: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
