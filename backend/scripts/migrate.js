#!/usr/bin/env node
/** Aplica as migrações pendentes no banco configurado (ver `npm run db:dry-run` antes). */
const config = require('../src/config');
const db = require('../src/db');

async function main() {
  const applied = [];
  await db.init({ runMigrations: true, log: (line) => applied.push(line) });
  console.log(`banco: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);
  console.log(applied.length ? applied.join('\n') : 'nenhuma migração pendente');
  const { n } = await db.one('SELECT count(*) AS n FROM schema_migrations');
  console.log(`migrações registradas: ${n}`);
  const tables = await db.all('SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()');
  console.log(`tabelas no esquema: ${tables[0].n}`);
}

main()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
