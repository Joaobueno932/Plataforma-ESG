const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');
const publication = require('./publication');

// Em produção a API não sobe com segredo padrão, sem banco configurado nem com CORS aberto.
config.assertOperationalConfig();

async function start() {
  const applied = [];
  await db.init({ runMigrations: config.runMigrations, log: (line) => applied.push(line) });
  for (const line of applied) console.log(line);
  console.log(`banco: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);

  if (config.seedOnEmpty) await seedIfEmpty();
  if (!config.mail.configured)
    console.warn('Aviso: envio de e-mail não configurado — links de recuperação vão para storage/mail-outbox.log');

  const server = createApp().listen(config.port, () => {
    console.log(`API ESG-FIEMS (${config.env}) ouvindo em http://localhost:${config.port}`);
    // Retoma publicações que ficaram pendentes ou falharam (ex.: reinício durante a geração).
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

start().catch((err) => {
  console.error(`falha ao subir a API: ${err.message}`);
  process.exit(1);
});
