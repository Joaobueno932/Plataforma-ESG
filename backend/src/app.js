const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler, notFound } = require('./http');

/** 429 entra no formato de erro da API. */
const REASON_429 = 'Too Many Requests';

function corsOptions() {
  if (!config.corsOrigins.length) {
    // Desenvolvimento/teste: reflete a origem da requisição. Em produção,
    // `assertOperationalConfig()` exige CORS_ORIGINS e a API não sobe sem ele.
    return { origin: true, credentials: true };
  }
  return {
    origin: (origin, callback) =>
      !origin || config.corsOrigins.includes(origin) ? callback(null, true) : callback(new Error('origem não autorizada')),
    credentials: true,
  };
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) =>
    res.json({
      status: 'ok',
      env: config.env,
      mailDelivery: config.mail.configured ? 'configured' : 'not-configured (outbox file)',
    }),
  );
  app.use('/static', express.static(config.staticDir, { fallthrough: false }));

  app.use(require('./routes/verify'));
  app.use(require('./routes/auth'));
  app.use(require('./routes/users'));
  app.use(require('./routes/companies'));
  app.use(require('./routes/questions'));
  app.use(require('./routes/catalog'));
  app.use(require('./routes/catalog-editor'));
  app.use(require('./routes/reports'));
  app.use(require('./routes/uploads'));
  app.use(require('./routes/leads'));
  app.use(require('./routes/admin'));

  app.use((req, _res, next) => next(notFound(`Cannot ${req.method} ${req.path}`)));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, REASON_429 };
