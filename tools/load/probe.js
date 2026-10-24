// Sonda carregada na API de carga via NODE_OPTIONS=--require (nenhuma mudança no código da API).
// A cada segundo grava: atraso do event loop (p50/p99/máx), memória (rss/heap) e CPU do processo.
// Saída: $PROBE_OUT (padrão /probe/out/metrics.jsonl).
const fs = require('node:fs');
const path = require('node:path');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const out = process.env.PROBE_OUT || '/probe/out/metrics.jsonl';
try {
  fs.mkdirSync(path.dirname(out), { recursive: true });
} catch {
  /* sem pasta de saída: a sonda fica inativa */
}
// O histograma mede o intervalo do timer de amostragem; o atraso real é o valor menos a resolução.
const RESOLUTION_MS = 10;
const histogram = monitorEventLoopDelay({ resolution: RESOLUTION_MS });
const delay = (ns) => Math.max(0, +(ns / 1e6 - RESOLUTION_MS).toFixed(2));
histogram.enable();
let lastCpu = process.cpuUsage();
let lastAt = process.hrtime.bigint();

const timer = setInterval(() => {
  const now = process.hrtime.bigint();
  const cpu = process.cpuUsage(lastCpu);
  const elapsedUs = Number(now - lastAt) / 1000;
  lastCpu = process.cpuUsage();
  lastAt = now;
  const mem = process.memoryUsage();
  const sample = {
    t: Date.now(),
    pid: process.pid,
    elP50: delay(histogram.percentile(50)),
    elP99: delay(histogram.percentile(99)),
    elMax: delay(histogram.max),
    cpuPct: +(((cpu.user + cpu.system) / elapsedUs) * 100).toFixed(1),
    rssMb: +(mem.rss / 1048576).toFixed(1),
    heapMb: +(mem.heapUsed / 1048576).toFixed(1),
    handles: process.getActiveResourcesInfo ? process.getActiveResourcesInfo().length : null,
  };
  histogram.reset();
  try {
    fs.appendFileSync(out, `${JSON.stringify(sample)}\n`);
  } catch {
    /* disco cheio ou pasta ausente: não derruba a API */
  }
}, 1000);
timer.unref();
