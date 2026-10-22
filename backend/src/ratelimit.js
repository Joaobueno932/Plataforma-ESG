const config = require('./config');
const { HttpError } = require('./http');

/**
 * Limite de tentativas em memória para rotas públicas (login, recuperação de senha, leads).
 * Suficiente para uma única instância; com mais de um processo, trocar por armazenamento
 * compartilhado (registrado em docs/esg/progresso.md).
 */
const buckets = new Map();

const keyOf = (name, req, extra) => `${name}|${req.ip || 'unknown'}|${extra || ''}`;

function hit(name, req, { extra = '', max = config.rateLimit.maxAttempts, windowMs = config.rateLimit.windowMs } = {}) {
  const key = keyOf(name, req, extra);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) {
    const seconds = Math.ceil((entry.resetAt - now) / 1000);
    throw new HttpError(429, `muitas tentativas; tente novamente em ${seconds}s`);
  }
}

/** Zera o contador após um sucesso (ex.: login correto). */
function reset(name, req, extra = '') {
  buckets.delete(keyOf(name, req, extra));
}

const limit = (name, options) => (req, _res, next) => {
  try {
    hit(name, req, options);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { hit, reset, limit, _buckets: buckets };
