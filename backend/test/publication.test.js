const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, shutdown } = require('./helpers');
const config = require('../src/config');
const publication = require('../src/publication');
const reportPdf = require('../src/publication/report-pdf');

/**
 * Leva o ciclo da empresa A até "aguardando supervisor". `levelFor(item)` escolhe o nível
 * declarado (e endossado pelo auditor) de cada indicador.
 */
async function toAwaitingSupervisor(s, levelFor) {
  const gestor = await s.login('gestor@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const admin = await s.loginAdmin();
  const auditor = await s.login('auditor@esgdemo.com.br');
  const items = (await s.api('GET', '/reports/company/questions/', { token: gestor })).body;
  for (const item of items) {
    const level = levelFor(item);
    assert.equal((await s.api('PATCH', `/reports/answerQuestion/${item.id}`, { token: gestor, body: { answerId: level.id, answerText: 'ok' } })).status, 200);
    assert.equal((await s.api('POST', `/reports/validateanswer/${item.id}`, { token: consultor, body: { veredict: true } })).status, 201);
  }
  assert.equal((await s.api('POST', '/reports/requestAudit/demo-company-a', { token: gestor })).status, 201);
  assert.equal((await s.api('POST', '/reports/releaseAudit/demo-company-a', { token: admin })).status, 201);
  for (const item of items)
    assert.equal((await s.api('POST', `/auditory/evaluatequestion/${item.id}`, { token: auditor, body: { status: 'Approved', redflag: 'conforme evidências' } })).status, 201);
  assert.equal((await s.api('POST', '/auditory/submitToSupervisor/demo-company-a', { token: auditor })).status, 201);
  return { gestor, consultor, admin, auditor, items };
}

const top = (item) => item.question.answers.reduce((a, b) => (b.points > a.points ? b : a));

test('publicação automática: avaliação elegível', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const reportId = await s.reportIdOf('demo-company-a');
  const { gestor, admin } = await toAwaitingSupervisor(s, top);
  const supervisor = await s.login('supervisor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  let captured = null;

  await t.test('antes da aprovação não há publicação nem documento', async () => {
    assert.equal((await s.api('GET', `/reports/${reportId}/publication`, { token: gestor })).status, 404);
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: admin })).status, 404);
    assert.equal((await s.api('GET', `/reports/${reportId}/result`, { token: gestor })).status, 403, 'empresa não vê o auditado antes');
    assert.equal((await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: admin })).status, 403, 'ADMIN não aprova');
  });

  await t.test('aprovação do supervisor publica sozinha; clique duplo não duplica', async () => {
    publication.setGeneratorForTests(async (data, target) => {
      captured = data;
      await reportPdf.write(data, target);
    });
    const [a, b] = await Promise.all([
      s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor }),
      s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor }),
    ]);
    publication.setGeneratorForTests(null);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const fim = a.status === 201 ? a : b;
    assert.equal(fim.body.publication.status, 'available', 'documentos prontos sem liberação manual');
    assert.equal(fim.body.publication.eligible, true);
    assert.equal(fim.body.publication.certificate.status, 'awaiting-official-template', 'concessão registrada, sem certificado inventado');
    assert.match(fim.body.publication.certificate.code, /^ESG-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    const from = new Date(fim.body.publication.certificate.validFrom);
    const until = new Date(fim.body.publication.certificate.validUntil);
    assert.equal(until.getUTCFullYear() - from.getUTCFullYear(), 2, 'validade de dois anos (Manual § 8.6)');
    assert.equal(fim.body.publication.certificate.documentAvailable, false);
    const count = (await s.db.one('SELECT count(*) AS n FROM publications WHERE reportId = ?', reportId)).n;
    assert.equal(Number(count), 1);
  });

  await t.test('mesmos números na API, no histórico, na publicação e no relatório', async () => {
    const pub = (await s.api('GET', `/reports/${reportId}/publication`, { token: gestor })).body;
    const result = (await s.api('GET', `/reports/${reportId}/result`, { token: gestor })).body;
    const history = (await s.api('GET', `/reports/${reportId}/result/history`, { token: gestor })).body;
    assert.equal(pub.rating, result.rating);
    assert.equal(history[0].rating, result.rating);
    assert.ok(captured, 'o relatório foi gerado a partir do resultado gravado');
    assert.equal(captured.result.rating, result.rating);
    for (const axis of ['E', 'S', 'G']) {
      assert.equal(captured.result.axes[axis].points, result.axes[axis].points);
      assert.equal(captured.result.axes[axis].max, result.axes[axis].max);
    }
    assert.equal(captured.items.length, 8);
  });

  await t.test('download real, autorizado a cada pedido', async () => {
    const res = await fetch(`${s.base}/reports/${reportId}/publication/report.pdf`, { headers: { Authorization: `Bearer ${gestor}` } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /pdf/);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const pub = (await s.api('GET', `/reports/${reportId}/publication`, { token: gestor })).body;
    assert.equal(bytes.length, pub.report.bytes);

    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: funcionario })).status, 403, 'colaborador não recebe o relatório completo');
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: await s.login('gestor.exemplo@esgdemo.com.br') })).status, 403);
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`)).status, 401);
    // O arquivo fica em área privada (fora de /static).
    assert.ok(pub.report.sha256);
    const row = await s.db.one('SELECT reportPath FROM publications WHERE reportId = ?', reportId);
    assert.ok(fs.existsSync(path.join(config.storageDir, row.reportPath)));
    assert.ok(!row.reportPath.includes('static'));
  });

  await t.test('verificação pública mostra só o essencial', async () => {
    const code = (await s.api('GET', `/reports/${reportId}/publication`, { token: gestor })).body.certificate.code;
    const v = await s.api('GET', `/publication/verify/${code}`);
    assert.equal(v.status, 200);
    assert.equal(v.body.company, 'Empresa Demonstração');
    assert.equal(v.body.situation, 'vigente');
    assert.equal(v.body.cpf, undefined);
    assert.equal((await s.api('GET', '/publication/verify/ESG-0000-0000-0000')).status, 404);
  });

  await t.test('revogar o vínculo retira o acesso ao documento já gerado', async () => {
    const gestorId = await s.userId('gestor@esgdemo.com.br');
    const link = await s.db.one("SELECT id FROM user_company_links WHERE userId = ? AND companyId = 'demo-company-a'", gestorId);
    await s.db.run('UPDATE user_company_links SET revokedAt = ? WHERE id = ?', new Date().toISOString(), link.id);
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: gestor })).status, 403);
  });

  await t.test('liberação manual antiga não existe mais', async () => {
    assert.equal((await s.api('POST', '/auditory/givereportaccess/demo-company-a', { token: admin })).status, 410);
  });
});

test('publicação automática: avaliação inelegível, falha de geração e nova tentativa', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const reportId = await s.reportIdOf('demo-company-a');
  // Licenciamento (obrigatório "Conforme") declarado e auditado como "Nao_conforme".
  const { gestor } = await toAwaitingSupervisor(s, (item) =>
    item.question.code === 'CG-E01' ? item.question.answers.find((a) => a.points === 0) : top(item),
  );
  const supervisor = await s.login('supervisor@esgdemo.com.br');

  await t.test('falha na geração não desfaz a aprovação nem pede liberação humana', async () => {
    publication.setGeneratorForTests(async () => {
      throw new Error('falha simulada de armazenamento');
    });
    const fim = await s.api('POST', '/auditory/finishAuditory/demo-company-a', { token: supervisor });
    publication.setGeneratorForTests(null);
    assert.equal(fim.status, 201);
    assert.equal(fim.body.status, 'Audited', 'a decisão técnica foi gravada');
    assert.equal(fim.body.publication.status, 'failed');
    assert.equal(fim.body.publication.retrying, true);
    assert.equal(fim.body.publication.eligible, false);
    assert.equal(fim.body.publication.certificate.status, 'not-eligible');
    assert.equal(fim.body.publication.certificate.code, null, 'inelegível não recebe certificado');
    const row = await s.db.one('SELECT lastError FROM publications WHERE reportId = ?', reportId);
    assert.match(row.lastError, /falha simulada/);
  });

  await t.test('nova tentativa automática no próximo acesso, sem repetir a aprovação', async () => {
    const pub = await s.api('GET', `/reports/${reportId}/publication`, { token: gestor });
    assert.equal(pub.status, 200);
    assert.equal(pub.body.status, 'available');
    assert.equal(pub.body.attempts, 2);
    assert.equal((await s.api('GET', `/reports/${reportId}/publication/report.pdf`, { token: gestor })).status, 200);
    const history = (await s.api('GET', `/reports/${reportId}/result/history`, { token: gestor })).body;
    assert.equal(history.length, 1, 'nenhum resultado novo foi gravado');
  });

  await t.test('reinício durante a geração: a subida da API retoma o que ficou pendente', async () => {
    await s.db.run("UPDATE publications SET status = 'pending', reportPath = NULL WHERE reportId = ?", reportId);
    assert.equal(await publication.sweep(), 1);
    const row = await s.db.one('SELECT status FROM publications WHERE reportId = ?', reportId);
    assert.equal(row.status, 'available');
  });

  await t.test('resultado inelegível também é liberado à empresa, sem certificado', async () => {
    const result = await s.api('GET', `/reports/${reportId}/result`, { token: gestor });
    assert.equal(result.status, 200);
    assert.equal(result.body.eligible, false);
    assert.ok(result.body.impediments.some((i) => i.kind === 'obrigatorio-nao-atendido'));
  });
});
