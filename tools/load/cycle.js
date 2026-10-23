// Ciclos completos e geração CONCORRENTE de documentos (seções 4.9–4.12 e 5.7).
// Leva N empresas até "aguardando supervisor" em paralelo e aprova todas ao mesmo tempo:
// mede liberação, avaliação, aprovação + geração do relatório e download.
//   node tools/load/cycle.js [primeira=31] [quantidade=8]
const fs = require('node:fs');
const path = require('node:path');
const { api, login, usersOf, company, toAwaitingSupervisor } = require('./lib');

const [first = '31', count = '8'] = process.argv.slice(2);
const ids = Array.from({ length: Number(count) }, (_, i) => `carga-${String(Number(first) + i).padStart(3, '0')}`);
const pct = (list, p) => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]) : null;
};

(async () => {
  const t0 = Date.now();
  const prepared = await Promise.all(ids.map((id) => toAwaitingSupervisor(id).then((r) => ({ id, ...r })).catch((err) => ({ id, error: err.message }))));
  const ready = prepared.filter((p) => !p.error);
  console.log(`preparação: ${ready.length}/${ids.length} ciclos em ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const p of prepared.filter((x) => x.error)) console.log(`  ${p.id}: ${p.error}`);

  const approvals = await Promise.all(
    ready.map(async ({ id }) => {
      const supervisor = await login(usersOf(id, 'SUPERVISOR')[0].email);
      return { id, ...(await api(supervisor, 'POST', `/auditory/finishAuditory/${id}`, { timeoutMs: 60000 })) };
    }),
  );
  const downloads = await Promise.all(
    ready.map(async ({ id }) => {
      const gestor = await login(usersOf(id, 'MANAGER')[0].email);
      return api(gestor, 'GET', `/reports/${company(id).reportId}/publication/report.pdf`, { raw: true, timeoutMs: 60000 });
    }),
  );
  const okApprovals = approvals.filter((a) => a.status === 201 && a.body.publication.status === 'available');
  const summary = {
    ciclos: ready.length,
    itensPorCiclo: ready[0]?.items,
    aprovacaoComGeracaoMs: { p50: pct(approvals.map((a) => a.ms), 50), p95: pct(approvals.map((a) => a.ms), 95), max: Math.round(Math.max(...approvals.map((a) => a.ms))) },
    aprovacoesComDocumento: okApprovals.length,
    downloadMs: { p50: pct(downloads.map((d) => d.ms), 50), p95: pct(downloads.map((d) => d.ms), 95) },
    downloadsOk: downloads.filter((d) => d.status === 200 && d.body?.subarray(0, 5).toString() === '%PDF-').length,
    tamanhoPdfKb: downloads[0]?.body ? Math.round(downloads[0].body.length / 1024) : null,
    etapasMs: Object.fromEntries(
      Object.keys(ready[0]?.timings || {}).map((k) => [k, Math.round(ready.reduce((s, r) => s + (r.timings[k] || 0), 0) / ready.length)]),
    ),
  };
  console.log(JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(__dirname, 'out', `ciclos-${first}.json`), JSON.stringify(summary, null, 2));
  process.exit(okApprovals.length === ready.length && summary.downloadsOk === ready.length ? 0 : 1);
})().catch((err) => {
  console.error('erro:', err);
  process.exit(1);
});
