/**
 * Dados iniciais do ambiente local.
 *
 * - Cadernos (setores A–H + Geral): idênticos aos observados no staging (GET /sectors).
 * - Indicadores: DEMONSTRATIVOS. O banco de indicadores original (64 do Caderno Geral +
 *   10 por caderno) não pôde ser recuperado: a API de staging responde 404/500 para os
 *   relatórios. Substitua por meio da tela "Cadastrar novo indicador" ou deste arquivo.
 * - Usuários/empresas: fictícios, um por papel, para exercitar todos os fluxos.
 */
const bcrypt = require('bcryptjs');
const db = require('./db');
const { createReportForCompany } = require('./services');

const SECTORS = [
  ['All', 'Caderno Geral', 'static/sectorCovers/caderno_geral.jpeg'],
  ['A', 'Alimentos e Bebidas', 'static/sectorCovers/caderno_a.jpeg'],
  ['B', 'Frigoríficos e Derivados', 'static/sectorCovers/caderno_b.jpeg'],
  ['C', 'Construção Civil', 'static/sectorCovers/caderno_c.jpeg'],
  ['D', 'Industria de Transformação Diversas', 'static/sectorCovers/caderno_d.jpeg'],
  ['E', 'Energia, Telecomunicações, Resíduos e Similares', 'static/sectorCovers/caderno_e.jpeg'],
  ['F', 'Extração de minerais metálicos, não metálicos, pesca, agropecuária e similares', 'static/sectorCovers/caderno_f.jpeg'],
  ['G', 'Papel e Celulose', 'static/sectorCovers/caderno_g.jpeg'],
  ['H', 'Calçados, Componentes para Calçados, Couro, Confecções Têxteis e Artefatos', 'static/sectorCovers/caderno_h.jpeg'],
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
  { id: 'demo-company-b', bussinessName: 'Indústria Exemplo', legalName: 'Indústria Exemplo S.A.', email: 'contato@exemplo.local', cnpj: '44555666000199', size: 'GRANDE', section: 'B' },
];

const DEMO_USERS = [
  ['Administrador ESG', 'admin@esgdemo.com.br', 'admin123', 'ADMIN', null],
  ['Gestora Demonstração', 'gestor@esgdemo.com.br', '123456', 'MANAGER', 'demo-company-a'],
  ['Funcionário Demonstração', 'funcionario@esgdemo.com.br', '123456', 'EMPLOYEE', 'demo-company-a'],
  ['Consultor Demonstração', 'consultor@esgdemo.com.br', '123456', 'CONSULTOR', 'demo-company-a'],
  ['Auditora Demonstração', 'auditor@esgdemo.com.br', '123456', 'AUDITOR', 'demo-company-a'],
  ['Supervisor Demonstração', 'supervisor@esgdemo.com.br', '123456', 'SUPERVISOR', 'demo-company-a'],
  ['Gestor Exemplo', 'gestor.exemplo@esgdemo.com.br', '123456', 'MANAGER', 'demo-company-b'],
];

function seed() {
  db.transaction(() => {
    for (const [section, description, avatar] of SECTORS)
      db.run('INSERT OR IGNORE INTO sectors (section, description, avatar) VALUES (?, ?, ?)', section, description, avatar);

    const counters = {};
    for (const [section, category, subcategory, title, description, mandatory] of DEMO_QUESTIONS) {
      const key = `${section}-${category}`;
      counters[key] = (counters[key] || 0) + 1;
      const id = db.uuid();
      const code = `${section === 'All' ? 'CG' : section}-${category}${String(counters[key]).padStart(2, '0')}`;
      db.run(
        `INSERT INTO questions (id, code, section, title, description, category, subcategory, hasMandatory, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, code, section, title, description, category, subcategory, mandatory ? 1 : 0, db.now(),
      );
      for (const [level, points, text] of LEVELS)
        db.run('INSERT INTO answers (id, questionId, title, points, description, mandatory) VALUES (?, ?, ?, ?, ?, ?)', db.uuid(), id, level, points, text, level === mandatory ? 1 : 0);
    }

    const at = db.now();
    for (const c of DEMO_COMPANIES) {
      db.run(
        `INSERT INTO companies (id, bussinessName, legalName, email, cnpj, accessDate, size, section, avatar, access, reportAccess, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0, ?, ?)`,
        c.id, c.bussinessName, c.legalName, c.email, c.cnpj, '2024-07-01T00:00:00.000Z', c.size, c.section, at, at,
      );
      createReportForCompany(db.one('SELECT * FROM companies WHERE id = ?', c.id));
    }

    for (const [name, email, password, role, companyId] of DEMO_USERS)
      db.run(
        'INSERT INTO users (id, name, email, password, role, companyId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        db.uuid(), name, email, bcrypt.hashSync(password, 10), role, companyId, at, at,
      );
  });
}

function seedIfEmpty() {
  if (db.one('SELECT count(*) AS n FROM users').n === 0) {
    seed();
    console.log('Banco inicializado com dados de demonstração (admin@esgdemo.com.br / admin123).');
  }
}

module.exports = { seed, seedIfEmpty };

if (require.main === module) {
  db.get();
  seedIfEmpty();
}
