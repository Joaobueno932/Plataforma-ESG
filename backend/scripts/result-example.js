#!/usr/bin/env node
/**
 * Gera um exemplo de resposta da API de resultado, com motivos de inelegibilidade.
 *
 *   npm run result:example [-- arquivo-de-saida.json]
 *
 * Roda na **base de testes** (`plataforma_esg_test`), que é limpa antes de semear os dados de
 * DEMONSTRAÇÃO: o banco de trabalho não é tocado e nenhum dado real é usado.
 */
process.env.NODE_ENV = 'test';

const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/db');
const { seed } = require('../src/seed');
const scoring = require('../src/scoring');

async function main() {
  await db.init({ runMigrations: true });
  await db.truncateAll();
  await seed();

  const report = await db.one("SELECT * FROM reports WHERE companyId = 'demo-company-a'");
  const items = await db.all(
    `SELECT qr.id, qr.questionId, q.code, q.mandatoryAnswerId FROM question_reports qr
       JOIN questions q ON q.id = qr.questionId WHERE qr.reportId = ? ORDER BY q.position`,
    report.id,
  );

  // Preenche tudo no nível mais alto, exceto um obrigatório deixado abaixo do mínimo — para que
  // o exemplo mostre rating matemático válido convivendo com inelegibilidade.
  for (const item of items) {
    const levels = await db.all('SELECT * FROM answers WHERE questionId = ? ORDER BY position', item.questionId);
    const best = levels[levels.length - 1];
    const worst = levels[0];
    const chosen = item.code === 'CG-E01' ? worst : best;
    await db.run(
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
  await db.run(
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
  await db.run(
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
  await db.run("UPDATE reports SET status = 'Audited' WHERE id = ?", report.id);

  const result = await scoring.resultOfCycle(report.id, { mode: 'audited' });
  const example = {
    _nota:
      'Exemplo gerado por scripts/result-example.js na base de testes com o seed de DEMONSTRAÇÃO. Não contém dados reais.',
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
}

main()
  .catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
