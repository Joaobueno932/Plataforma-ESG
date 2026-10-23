/**
 * Erros no mesmo formato observado na API original (NestJS):
 *   {"message":"company not found","error":"Not Found","statusCode":404}
 */
const REASONS = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const badRequest = (m) => new HttpError(400, m);
const unauthorized = (m = 'Unauthorized') => new HttpError(401, m);
const forbidden = (m = 'Forbidden resource') => new HttpError(403, m);
const notFound = (m) => new HttpError(404, m);
const conflict = (m) => new HttpError(409, m);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DB_UNAVAILABLE = ['PROTOCOL_SEQUENCE_TIMEOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'POOL_ENQUEUELIMIT'];

function errorHandler(err, req, res, _next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') err = new HttpError(413, 'arquivo excede o tamanho máximo permitido');
  if (err instanceof SyntaxError && 'body' in err) err = badRequest('JSON inválido');
  // Erros de cliente do body-parser/multer (corpo grande demais, formato inválido) não são 500.
  if (err && err.type === 'entity.too.large') err = new HttpError(413, 'conteúdo excede o tamanho máximo permitido');
  else if (err && !(err instanceof HttpError) && Number.isInteger(err.status) && err.status >= 400 && err.status < 500)
    err = new HttpError(err.status, err.expose && err.message ? err.message : 'requisição inválida');
  else if (err && err.name === 'MulterError') err = badRequest(`envio de arquivo inválido: ${err.code}`);
  // Banco lento ou indisponível: resposta previsível e rápida, com sugestão de nova tentativa.
  if (err && !(err instanceof HttpError) && (DB_UNAVAILABLE.includes(err.code) || /Queue limit reached|Query inactivity timeout/i.test(err.message || ''))) {
    console.error(`banco indisponível: ${err.code || err.message}`);
    res.set('Retry-After', '5');
    return res.status(503).json({ statusCode: 503, error: 'Service Unavailable', message: 'serviço temporariamente indisponível; tente novamente em instantes' });
  }
  if (!(err instanceof HttpError)) {
    console.error(err);
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
  res.status(err.statusCode).json({ message: err.message, error: REASONS[err.statusCode] || 'Error', statusCode: err.statusCode });
}

/**
 * Router do Express com tratamento de promessa rejeitada.
 *
 * Com o acesso ao banco assíncrono, todo handler devolve promessa; o Express 4 não captura
 * rejeição sozinho. Este router envolve cada handler/middleware em `wrap`, de modo que o erro
 * chegue ao `errorHandler` em vez de virar "unhandled rejection".
 */
function asyncRouter() {
  const express = require('express');
  const router = express.Router();
  const methods = ['use', 'get', 'post', 'put', 'patch', 'delete', 'all'];
  for (const method of methods) {
    const original = router[method].bind(router);
    router[method] = (...args) =>
      original(...args.map((arg) => (typeof arg === 'function' && arg.length < 4 ? wrap(arg) : arg)));
  }
  return router;
}

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, wrap, asyncRouter, errorHandler };
