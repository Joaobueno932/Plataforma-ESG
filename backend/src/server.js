const cluster = require('node:cluster');
const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');
const publication = require('./publication');

// Em produção a API não sobe com segredo padrão, sem banco configurado nem com CORS aberto.
config.assertOperationalConfig();

/**
 * Processos da API (`WEB_CONCURRENCY`, padrão 1). O Node atende em uma única thread: na carga,
 * um processo saturava ~1 núcleo enquanto o banco tinha folga. Com N processos, o principal
 * aplica migrações e seed uma vez e cria os trabalhadores; a retomada de publicações roda em um
 * só trabalhador, para não gerar o mesmo documento duas vezes.
 */
async function primary() {
  const applied = [];
  await db.init({ runMigrations: config.runMigrations, log: (line) => applied.push(line) });
  for (const line of applied) console.log(line);
  if (config.seedOnEmpty) await seedIfEmpty();
  await db.close();
  console.log(`API ESG-FIEMS: ${config.workers} processo(s) · pool de ${config.db.poolSize} conexões por processo`);
  for (let i = 1; i <= config.workers; i += 1) cluster.fork({ WORKER_INDEX: String(i) });
  cluster.on('exit', (worker, code, signal) => {
    if (signal === 'SIGTERM' || code === 0) return;
    console.error(`processo ${worker.process.pid} encerrou (${signal || code}); iniciando substituto`);
    cluster.fork({ WORKER_INDEX: worker.process.env?.WORKER_INDEX || '0' });
  });
  const stop = (signal) => {
    console.log(`${signal} recebido: encerrando os processos`);
    for (const w of Object.values(cluster.workers)) w.process.kill('SIGTERM');
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

async function start({ runMigrations, sweep }) {
  const applied = [];
  await db.init({ runMigrations, log: (line) => applied.push(line) });
  for (const line of applied) console.log(line);
  console.log(`banco: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);

  if (runMigrations && config.seedOnEmpty) await seedIfEmpty();
  if (!config.mail.configured && sweep)
    console.warn('Aviso: envio de e-mail não configurado — links de recuperação vão para storage/mail-outbox.log');

  const server = createApp().listen(config.port, () => {
    console.log(`API ESG-FIEMS (${config.env}) ouvindo em http://localhost:${config.port}${cluster.isWorker ? ` · processo ${process.env.WORKER_INDEX}` : ''}`);
    // Retoma publicações que ficaram pendentes ou falharam (ex.: reinício durante a geração).
    if (sweep)
      publication
        .sweep((line) => console.log(line))
        .catch((err) => console.error(`retomada de publicações falhou: ${err.message}`));
  });

  const shutdown = async (signal) => {
    console.log(`${signal} recebido: encerrando`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const run =
  config.workers > 1 && cluster.isPrimary
    ? primary()
    : start({ runMigrations: cluster.isPrimary, sweep: cluster.isPrimary || process.env.WORKER_INDEX === '1' });

run.catch((err) => {
  console.error(`falha ao subir a API: ${err.message}`);
  process.exit(1);
});
