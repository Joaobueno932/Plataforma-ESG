// Resume uma ou mais execuções do runner por patamar, cruzando com os recursos amostrados
// (containers, MySQL) e a sonda da API (event loop, memória) na janela de cada patamar.
//   node tools/load/compare.js <execução> [<execução> ...]
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'out');
let discarded = 0;
/** Lê JSON por linha; com vários processos escrevendo no mesmo arquivo, uma linha pode sair truncada — é descartada e contada. */
const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            discarded += 1;
            return null;
          }
        })
        .filter(Boolean)
    : [];
const probe = readJsonl(path.join(OUT, 'metrics.jsonl'));
const READS = ['lista-indicadores', 'abrir-indicador', 'visao-geral:fluxo', 'visao-geral:me', 'visao-geral:empresa', 'visao-geral:pendencias', 'historico', 'resultado-preliminar', 'busca-paginacao', 'download-evidencia'];
const WRITES = ['salvar-rascunho', 'enviar-resposta', 'revisar', 'anexar-evidencia'];
const max = (l) => (l.length ? Math.max(...l) : null);
const avg = (l) => (l.length ? +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1) : null);
const mem = (s) => {
  const m = /([\d.]+)\s*(GiB|MiB|KiB)/.exec(s || '');
  return m ? +(Number(m[1]) * (m[2] === 'GiB' ? 1024 : m[2] === 'KiB' ? 1 / 1024 : 1)).toFixed(0) : null;
};

/** Junta operações de uma categoria: p50/p95/p99 ponderados pelo volume (aproximação por operação). */
function group(ops, names) {
  const list = names.map((n) => ops[n]).filter(Boolean);
  const n = list.reduce((s, o) => s + o.n, 0);
  if (!n) return null;
  const w = (k) => +(list.reduce((s, o) => s + o[k] * o.n, 0) / n).toFixed(0);
  return { n, p50: w('p50'), p95: w('p95'), p99: w('p99'), max: max(list.map((o) => o.max)) };
}

const rows = [];
for (const run of process.argv.slice(2)) {
  const data = JSON.parse(fs.readFileSync(path.join(OUT, `${run}.json`), 'utf8'));
  const resources = readJsonl(path.join(OUT, `${run}-recursos.jsonl`));
  let end = new Date(data.finishedAt).getTime();
  const windows = [...data.stages].reverse().map((s) => {
    const w = { s, from: end - s.seconds * 1000, to: end };
    end = w.from;
    return w;
  }).reverse();
  for (const { s, from, to } of windows) {
    const res = resources.filter((r) => r.t >= from && r.t <= to);
    const pr = probe.filter((p) => p.t >= from && p.t <= to);
    const total = s.totals.ok + s.totals.negocio + s.totals.inesperado;
    rows.push({
      execucao: run,
      patamar: s.name,
      vus: s.vus,
      rps: s.totals.rps,
      leitura: group(s.ops, READS),
      escrita: group(s.ops, WRITES),
      login: s.ops.login ? { p50: s.ops.login.p50, p95: s.ops.login.p95, p99: s.ops.login.p99 } : null,
      upload: s.ops['upload-evidencia'] ? { p95: s.ops['upload-evidencia'].p95 } : null,
      lista: s.ops['lista-indicadores'] ? { p50: s.ops['lista-indicadores'].p50, p95: s.ops['lista-indicadores'].p95, p99: s.ops['lista-indicadores'].p99 } : null,
      requisicoes: total,
      inesperadoPct: s.totals.erroInesperadoPct,
      negocio: s.totals.negocio,
      motivosInesperados: Object.fromEntries(Object.entries(s.ops).filter(([, o]) => o.inesperado).map(([k, o]) => [k, o.motivos])),
      apiCpuMax: max(res.map((r) => r.containers?.['esg-api-load']?.cpuPct).filter((v) => v != null)),
      apiCpuMed: avg(res.map((r) => r.containers?.['esg-api-load']?.cpuPct).filter((v) => v != null)),
      apiMemMaxMb: max(res.map((r) => mem(r.containers?.['esg-api-load']?.mem)).filter((v) => v != null)),
      mysqlCpuMax: max(res.map((r) => r.containers?.['esg-mysql']?.cpuPct).filter((v) => v != null)),
      mysqlConexoesMax: max(res.map((r) => r.mysql?.conexoes)),
      mysqlEmExecMax: max(res.map((r) => r.mysql?.emExecucao)),
      mysqlQpsMax: max(res.map((r) => r.mysql?.qps || 0)),
      deadlocks: res.length ? res.at(-1).mysql.deadlocks - res[0].mysql.deadlocks : null,
      esperasBloqueio: res.length ? res.at(-1).mysql.esperasBloqueio - res[0].mysql.esperasBloqueio : null,
      eventLoopP99Max: max(pr.map((p) => p.elP99)),
      eventLoopP99Med: avg(pr.map((p) => p.elP99)),
      rssMaxMb: max(pr.map((p) => p.rssMb)),
      geradorCpu: s.gerador.cpuPct,
    });
  }
}

console.log('execução            patamar VUs  req/s  leitura p50/p95/p99   escrita p50/p95/p99   lista p95  login p95  inesp%  neg  apiCPU máx/méd  api MB  EL p99 máx  mysqlCPU  conex  deadl  gerador');
for (const r of rows)
  console.log(
    [
      r.execucao.padEnd(19),
      r.patamar.padEnd(7),
      String(r.vus).padStart(3),
      String(r.rps).padStart(7),
      `${r.leitura?.p50}/${r.leitura?.p95}/${r.leitura?.p99}`.padStart(20),
      `${r.escrita?.p50}/${r.escrita?.p95}/${r.escrita?.p99}`.padStart(20),
      String(r.lista?.p95).padStart(9),
      String(r.login?.p95).padStart(9),
      String(r.inesperadoPct).padStart(6),
      String(r.negocio).padStart(4),
      `${r.apiCpuMax}/${r.apiCpuMed}`.padStart(14),
      String(r.apiMemMaxMb).padStart(6),
      String(r.eventLoopP99Max).padStart(10),
      String(r.mysqlCpuMax).padStart(8),
      String(r.mysqlConexoesMax).padStart(5),
      String(r.deadlocks).padStart(5),
      `${r.geradorCpu}%`.padStart(7),
    ].join(' '),
  );
if (discarded) console.log(`(linhas de métrica corrompidas descartadas: ${discarded})`);
fs.writeFileSync(path.join(OUT, `comparativo-${process.argv.slice(2).join('-')}.json`), JSON.stringify(rows, null, 2));
