#!/usr/bin/env node
/** Aplica as migrações pendentes no banco de trabalho (ver scripts/backup.js dry-run antes). */
const config = require('../src/config');
const db = require('../src/db');

const applied = [];
db.use(db.open(config.dbFile, { log: (line) => applied.push(line) }));
console.log(applied.length ? applied.join('\n') : 'nenhuma migração pendente');
const rows = db.one('SELECT count(*) AS n FROM schema_migrations').n;
console.log(`migrações registradas: ${rows}`);
