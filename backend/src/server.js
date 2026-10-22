const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');

// Em produção a API não sobe com segredo padrão nem com CORS aberto.
config.assertOperationalConfig();

const applied = [];
db.use(db.open(config.dbFile, { log: (line) => applied.push(line) }));
for (const line of applied) console.log(line);

if (!config.isProduction) seedIfEmpty();
if (!config.mail.configured) console.warn('Aviso: envio de e-mail não configurado — links de recuperação vão para storage/mail-outbox.log');

createApp().listen(config.port, () => {
  console.log(`API ESG-FIEMS (${config.env}) ouvindo em http://localhost:${config.port}`);
});
