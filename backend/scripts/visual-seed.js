#!/usr/bin/env node
/**
 * Prepara a base **isolada** de inspeção visual: limpa a base de testes e aplica o seed de
 * demonstração. Nunca toca o banco de trabalho (exige NODE_ENV=test, que aponta para a base
 * `<DB_NAME>_test`).
 *
 *   NODE_ENV=test node --env-file=.env scripts/visual-seed.js
 */
const config = require('../src/config');
const db = require('../src/db');
const { seed } = require('../src/seed');

(async () => {
  if (config.env !== 'test') throw new Error('rode com NODE_ENV=test: este script limpa a base e só pode usar a base de testes');
  await db.init({ runMigrations: true });
  await db.truncateAll();
  await seed();
  console.log(`base isolada pronta: ${config.db.name}`);
})()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
