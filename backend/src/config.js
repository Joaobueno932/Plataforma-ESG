const path = require('node:path');

const root = path.resolve(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT || 3333),
  storageDir: process.env.STORAGE_DIR || path.join(root, 'storage'),
  dbFile: process.env.DB_FILE || path.join(root, 'storage', 'esg.sqlite'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'storage', 'uploads'),
  staticDir: process.env.STATIC_DIR || path.join(root, 'static'),
  jwtSecret: process.env.JWT_SECRET || 'esg-fiems-local-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'esg-fiems-local-refresh-secret',
  jwtResetSecret: process.env.JWT_RESET_SECRET || 'esg-fiems-local-reset-secret',
  accessTokenTtl: '1h',
  refreshTokenTtl: '30d',
  resetTokenTtl: '1h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  maxCompanyFileBytes: 50 * 1024 * 1024,
  maxCoverBytes: 100 * 1024 * 1024,
};
