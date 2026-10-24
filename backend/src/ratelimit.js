const config = require('./config');
const { HttpError } = require('./http');

/**
 * Limite de tentativas em memória para rotas públicas (login, recuperação de senha, leads).
 * Suficiente para uma única instância; com mais de um processo, trocar por armazenamento
 * compartilhado (registrado em docs/esg/progresso.md).
 */
const buckets = new Map();

const keyOf = (name, req, extra) => `${name}|${req.ip || 'unknown'}|${extra || ''}`;

function hit(name, req, { extra = '', max: configured = config.rateLimit.maxAttempts, windowMs = config.rateLimit.windowMs } = {}) {
  // Com vários processos (cluster), cada um guarda seu contador: o limite é dividido entre eles
  // para o total não ficar mais permissivo do que o configurado.
  const max = Math.max(1, Math.ceil(configured / config.workers));
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

/**
 * Limpeza periódica das janelas vencidas. Sem ela, tentativas vindas de muitos endereços ou
 * e-mails diferentes fariam o mapa crescer sem limite (memória que nunca volta).
 */
function sweep(now = Date.now()) {
  let removed = 0;
  for (const [key, entry] of buckets) if (entry.resetAt <= now) {
    buckets.delete(key);
    removed += 1;
  }
  return removed;
}
setInterval(sweep, 60 * 1000).unref();

const limit = (name, options) => (req, _res, next) => {
  try {
    hit(name, req, options);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { hit, reset, limit, sweep, _buckets: buckets };
