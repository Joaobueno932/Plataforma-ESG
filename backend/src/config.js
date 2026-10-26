const path = require('node:path');

const root = path.resolve(__dirname, '..');

/**
 * Configuração separada por ambiente (NODE_ENV):
 *   development (padrão) e test  → valores locais de conveniência;
 *   production                   → segredos, banco e origens obrigatórios, sem valores embutidos.
 *
 * `assertOperationalConfig()` é chamado na subida do servidor: em produção, a API não sobe
 * com segredo padrão, sem banco configurado nem com CORS aberto.
 *
 * As variáveis são lidas do ambiente; em desenvolvimento, os scripts do npm carregam
 * `backend/.env` com `--env-file-if-exists`.
 */
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

const DEV_SECRETS = {
  jwtSecret: 'dev-only-access-secret',
  jwtRefreshSecret: 'dev-only-refresh-secret',
};

const secret = (name, devKey) => process.env[name] || (isProduction ? null : DEV_SECRETS[devKey]);
const list = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
const number = (value, fallback) => (Number.isFinite(Number(value)) && String(value).trim() !== '' ? Number(value) : fallback);

/** Banco de dados (MySQL). Em teste, usa a base de testes, nunca a de trabalho. */
const database = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: number(process.env.DB_PORT, 3307),
  name: isTest ? process.env.DB_NAME_TEST || 'plataforma_esg_test' : process.env.DB_NAME || 'plataforma_esg',
  user: process.env.DB_USER || 'esg',
  password: process.env.DB_PASSWORD || '',
  poolSize: number(process.env.DB_POOL_SIZE, isTest ? 5 : 10),
    /** Tempo máximo de cada consulta. */
    queryTimeoutMs: number(process.env.DB_QUERY_TIMEOUT_MS, 15000),
    /** Requisições aguardando conexão livre, por processo; acima disso responde 503 na hora. */
    queueLimit: number(process.env.DB_QUEUE_LIMIT, 200),
};

const config = {
  env,
  isProduction,
  isTest,
  port: number(process.env.PORT, 3333),
  db: database,
  storageDir: process.env.STORAGE_DIR || path.join(root, 'storage'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'storage', 'uploads'),
  backupsDir: process.env.BACKUPS_DIR || path.join(root, 'storage', 'backups'),
  staticDir: process.env.STATIC_DIR || path.join(root, 'static'),
  /** Arquivo SQLite da reconstrução anterior, usado apenas pela transferência de dados. */
  legacySqliteFile: process.env.LEGACY_SQLITE_FILE || path.join(root, 'storage', 'esg.sqlite'),
  jwtSecret: secret('JWT_SECRET', 'jwtSecret'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'jwtRefreshSecret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '1h',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '30d',
  /** Validade do link de recuperação (token opaco de uso único, ver src/auth.js). */
  resetTokenTtl: process.env.RESET_TOKEN_TTL || '1h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  /** Origens permitidas no CORS. Vazio fora de produção = reflete a origem da requisição. */
  corsOrigins: list(process.env.CORS_ORIGINS),
  maxCompanyFileBytes: number(process.env.MAX_COMPANY_FILE_BYTES, 50 * 1024 * 1024),
  maxCoverBytes: number(process.env.MAX_COVER_BYTES, 100 * 1024 * 1024),
  /** Foto de perfil: a interface já recorta e reduz para 512×512 antes de enviar. */
  maxAvatarBytes: number(process.env.MAX_AVATAR_BYTES, 2 * 1024 * 1024),
  /** Logo de empresa (exibida na plataforma e no relatório em PDF). */
  maxLogoBytes: number(process.env.MAX_LOGO_BYTES, 5 * 1024 * 1024),
  /** Aplicar migrações na subida da API. */
  runMigrations: String(process.env.RUN_MIGRATIONS ?? 'true') !== 'false',
  /** Semear dados de demonstração quando o banco estiver vazio (nunca em produção). */
  seedOnEmpty: !isProduction && String(process.env.SEED_ON_EMPTY ?? 'true') !== 'false',
  /**
   * Envio real de e-mail NÃO está configurado: o link de recuperação é gravado em
   * storage/mail-outbox.log. Enquanto `mail.transport` for 'outbox-file', a recuperação por
   * e-mail não pode ser declarada pronta.
   */
  mail: {
    transport: process.env.MAIL_TRANSPORT || 'outbox-file',
    get configured() {
      return this.transport !== 'outbox-file';
    },
  },
  /**
   * Proxies confiáveis à frente da API (número de saltos, ex.: TRUST_PROXY=1 atrás de um nginx).
   * Padrão: nenhum — `X-Forwarded-For` enviado pelo cliente é ignorado.
   */
  /** Processos da API (cluster). Cada processo tem o próprio pool de conexões. */
  workers: Math.max(1, number(process.env.WEB_CONCURRENCY, 1)),
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY || false,
  /** Tentativas por janela (login, recuperação de senha e leads). */
  rateLimit: {
    windowMs: number(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxAttempts: number(process.env.RATE_LIMIT_MAX, 10),
    /** Envios de arquivo por pessoa por minuto. */
    uploadMax: number(process.env.UPLOAD_RATE_MAX, 60),
  },
};

function assertOperationalConfig() {
  if (!config.isProduction) return [];
  const problems = [];
  if (!config.jwtSecret) problems.push('defina JWT_SECRET');
  if (!config.jwtRefreshSecret) problems.push('defina JWT_REFRESH_SECRET');
  if (!config.corsOrigins.length) problems.push('defina CORS_ORIGINS com as origens autorizadas');
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) problems.push('defina DB_HOST, DB_NAME e DB_USER');
  if (!config.db.password) problems.push('defina DB_PASSWORD');
  if (problems.length) throw new Error(`configuração operacional incompleta: ${problems.join('; ')}`);
  return problems;
}

module.exports = Object.assign(config, { assertOperationalConfig });
