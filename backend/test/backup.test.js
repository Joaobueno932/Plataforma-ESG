const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, shutdown, fileForm } = require('./helpers');
const backup = require('../scripts/backup');

/**
 * ACE16 — backup e restauração recuperam cadastros, avaliações, arquivos e vínculos.
 * Usa o cliente MySQL de verdade (container ou local, conforme a configuração).
 */
test('backup com arquivos vinculados e restauração em ensaio', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const gestor = await s.login('gestor@esgdemo.com.br');
  let dir;

  await t.test('backup inclui o dump e cada arquivo citado no banco', async () => {
    const up = await s.api('POST', '/uploads/companyFile', { token: gestor, form: fileForm('demo-company-a', 'alvara-backup.pdf') });
    assert.equal(up.status, 201);
    dir = await backup.create();
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.ok(manifest.database.bytes > 0);
    assert.ok(manifest.files.some((f) => f.area === 'uploads' && f.path.endsWith('alvara-backup.pdf')));
    const check = await backup.verify(dir, { log: () => {} });
    assert.equal(check.ok, true, check.problems.join('; '));
  });

  await t.test('restauração em ensaio recupera banco, arquivos (hash) e vínculos', async () => {
    const before = process.exitCode;
    const ok = await backup.dryRun(dir);
    process.exitCode = before;
    assert.equal(ok, true);
  });

  await t.test('arquivo adulterado ou ausente é apontado', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    const f = manifest.files.find((x) => x.path.endsWith('alvara-backup.pdf'));
    fs.writeFileSync(path.join(dir, 'files', f.area, f.path), 'adulterado');
    const before = process.exitCode;
    const check = await backup.verify(dir, { log: () => {} });
    process.exitCode = before;
    assert.equal(check.ok, false);
    assert.ok(check.problems.some((p) => p.includes('alterado')));
  });
});
