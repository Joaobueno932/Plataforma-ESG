const path = require('node:path');

const root = path.resolve(__dirname, '..');

/**
 * Configuração separada por ambiente (NODE_ENV):
 *   development (padrão) e test  → segredos locais de conveniência;
 *   production                   → segredos e origens obrigatórios, sem valores embutidos.
 *
 * `assertOperationalConfig()` é chamado na subida do servidor: em produção, a API não sobe
 * com segredo padrão nem com CORS aberto.
 */
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const DEV_SECRETS = {
  jwtSecret: 'dev-only-access-secret',
  jwtRefreshSecret: 'dev-only-refresh-secret',
};

const secret = (name, devKey) => process.env[name] || (isProduction ? null : DEV_SECRETS[devKey]);

const list = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);

const config = {
  env,
  isProduction,
  port: Number(process.env.PORT || 3333),
  storageDir: process.env.STORAGE_DIR || path.join(root, 'storage'),
  dbFile: process.env.DB_FILE || path.join(root, 'storage', 'esg.sqlite'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'storage', 'uploads'),
  backupsDir: process.env.BACKUPS_DIR || path.join(root, 'storage', 'backups'),
  staticDir: process.env.STATIC_DIR || path.join(root, 'static'),
  jwtSecret: secret('JWT_SECRET', 'jwtSecret'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'jwtRefreshSecret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '1h',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '30d',
  /** Validade do link de recuperação (token opaco de uso único, ver src/auth.js). */
  resetTokenTtl: process.env.RESET_TOKEN_TTL || '1h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  /** Origens permitidas no CORS. Vazio em desenvolvimento = reflete a origem da requisição. */
  corsOrigins: list(process.env.CORS_ORIGINS || (isProduction ? '' : '')),
  maxCompanyFileBytes: Number(process.env.MAX_COMPANY_FILE_BYTES || 50 * 1024 * 1024),
  maxCoverBytes: Number(process.env.MAX_COVER_BYTES || 100 * 1024 * 1024),
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
  /** Tentativas por janela (login e recuperação de senha). */
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    maxAttempts: Number(process.env.RATE_LIMIT_MAX || 10),
  },
};

function assertOperationalConfig() {
  if (!config.isProduction) return [];
  const problems = [];
  if (!config.jwtSecret) problems.push('defina JWT_SECRET');
  if (!config.jwtRefreshSecret) problems.push('defina JWT_REFRESH_SECRET');
  if (!config.corsOrigins.length) problems.push('defina CORS_ORIGINS com as origens autorizadas');
  if (problems.length) throw new Error(`configuração operacional incompleta: ${problems.join('; ')}`);
  return problems;
}

module.exports = Object.assign(config, { assertOperationalConfig });
