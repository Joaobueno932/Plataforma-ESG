#!/usr/bin/env node
/**
 * Gera um exemplo de resposta da API de resultado, com motivos de inelegibilidade.
 *
 *   node scripts/result-example.js [arquivo-de-saida.json]
 *
 * Roda em banco **em memória**, com o seed de demonstração: nenhum dado real é usado e o
 * banco de trabalho não é tocado. Serve para documentar o contrato da resposta.
 */
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esg-exemplo-'));
process.env.NODE_ENV = 'test';
process.env.DB_FILE = ':memory:';
process.env.STORAGE_DIR = tmp;
process.env.UPLOADS_DIR = path.join(tmp, 'uploads');
process.env.STATIC_DIR = path.join(tmp, 'static');
process.env.BACKUPS_DIR = path.join(tmp, 'backups');

const db = require('../src/db');
const { seed } = require('../src/seed');
const scoring = require('../src/scoring');

db.use(db.open(':memory:'));
seed();

const report = db.one("SELECT * FROM reports WHERE companyId = 'demo-company-a'");
const items = db.all(
  `SELECT qr.id, qr.questionId, q.code, q.mandatoryAnswerId FROM question_reports qr
     JOIN questions q ON q.id = qr.questionId WHERE qr.reportId = ? ORDER BY q.position`,
  report.id,
);

// Preenche tudo no nível mais alto, exceto um obrigatório deixado abaixo do mínimo — para que
// o exemplo mostre rating matemático válido convivendo com inelegibilidade.
for (const item of items) {
  const levels = db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY position', item.questionId);
  const best = levels[levels.length - 1];
  const worst = levels[0];
  const chosen = item.code === 'CG-E01' ? worst : best;
  db.run(
    "UPDATE question_reports SET selectedAnswerId = ?, auditedAnswerId = ?, auditConclusion = 'met', status = 'Approved', answeredAt = ?, updatedAt = ? WHERE id = ?",
    chosen.id,
    chosen.id,
    db.now(),
    db.now(),
    item.id,
  );
}
// Um pedido de "não se aplica" aceito e outro recusado, para aparecerem no exemplo.
const [primeiro, segundo] = items.slice(1);
db.run(
  `INSERT INTO na_requests (id, questionReportId, reportId, round, justification, requestedAt, decision, decisionReason, decidedAt, origin)
   VALUES (?, ?, ?, 1, ?, ?, 'accepted', ?, ?, 'exemplo')`,
  db.uuid(),
  primeiro.id,
  report.id,
  'A empresa não realiza a atividade coberta por este indicador.',
  db.now(),
  'Justificativa e evidência pertinentes.',
  db.now(),
);
db.run(
  `INSERT INTO na_requests (id, questionReportId, reportId, round, justification, requestedAt, decision, decisionReason, decidedAt, origin)
   VALUES (?, ?, ?, 1, ?, ?, 'refused', ?, ?, 'exemplo')`,
  db.uuid(),
  segundo.id,
  report.id,
  'Pedido sem evidência suficiente.',
  db.now(),
  'A atividade é realizada pela empresa; indicador permanece aplicável.',
  db.now(),
);
db.run("UPDATE reports SET status = 'Audited' WHERE id = ?", report.id);

const result = scoring.resultOfCycle(report.id, { mode: 'audited' });
const example = {
  _nota:
    'Exemplo gerado por scripts/result-example.js em banco em memória com o seed de DEMONSTRAÇÃO. Não contém dados reais.',
  ...result,
  items: result.items.slice(0, 4),
};
const target = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'esg', 'exemplo-resultado-api.json');
fs.writeFileSync(target, `${JSON.stringify(example, null, 2)}\n`);
console.log(`exemplo gravado em ${target}`);
console.log(
  `rating=${result.rating} ratingValid=${result.ratingValid} eligible=${result.eligible} impedimentos=${result.impediments
    .map((impediment) => impediment.kind)
    .join(', ')}`,
);
