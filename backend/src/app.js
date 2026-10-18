const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler, notFound } = require('./http');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/static', express.static(config.staticDir, { fallthrough: false }));

  app.use(require('./routes/auth'));
  app.use(require('./routes/users'));
  app.use(require('./routes/companies'));
  app.use(require('./routes/questions'));
  app.use(require('./routes/reports'));
  app.use(require('./routes/uploads'));
  app.use(require('./routes/leads'));

  app.use((req, _res, next) => next(notFound(`Cannot ${req.method} ${req.path}`)));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
