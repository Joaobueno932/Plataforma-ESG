// Amostrador de recursos durante a carga (a cada 5 s):
//  - CPU e memória dos containers da API de carga e do MySQL (docker stats);
//  - MySQL: conexões, threads em execução, esperas e tempo de bloqueio de linha, deadlocks,
//    consultas lentas e consultas por segundo;
//  - disco usado pelo armazenamento de arquivos da API.
//   node tools/load/sampler.js <nome-da-execução> [segundos-máx]
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mysql = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'mysql2', 'promise'));

const [runName = 'amostra', maxSeconds = '7200'] = process.argv.slice(2);
const OUT = path.join(__dirname, 'out', `${runName}-recursos.jsonl`);
const STATUS = ['Threads_connected', 'Threads_running', 'Innodb_row_lock_waits', 'Innodb_row_lock_time', 'Slow_queries', 'Questions', 'Aborted_connects'];

const stats = () => {
  try {
    const out = execFileSync('docker', ['stats', '--no-stream', '--format', '{{json .}}', 'esg-api-load', 'esg-mysql'], { encoding: 'utf8' });
    return Object.fromEntries(
      out
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l))
        .map((s) => [s.Name, { cpuPct: parseFloat(s.CPUPerc), mem: s.MemUsage.split(' / ')[0], memPct: parseFloat(s.MemPerc) }]),
    );
  } catch (err) {
    return { erro: err.message.slice(0, 120) };
  }
};
const disk = () => {
  try {
    return Number(execFileSync('docker', ['exec', 'esg-api-load', 'du', '-sm', '/app/storage'], { encoding: 'utf8' }).split(/\s/)[0]);
  } catch {
    return null;
  }
};

(async () => {
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3307, user: 'root', password: process.env.MYSQL_ROOT_PASSWORD || 'esg-root-local' });
  let previous = null;
  const until = Date.now() + Number(maxSeconds) * 1000;
  while (Date.now() < until) {
    const [rows] = await conn.query(`SHOW GLOBAL STATUS WHERE Variable_name IN (${STATUS.map(() => '?').join(',')})`, STATUS);
    const status = Object.fromEntries(rows.map((r) => [r.Variable_name, Number(r.Value)]));
    const [[dl]] = await conn.query("SELECT `count` AS n FROM information_schema.INNODB_METRICS WHERE name = 'lock_deadlocks'");
    const now = Date.now();
    const sample = {
      t: now,
      containers: stats(),
      mysql: {
        conexoes: status.Threads_connected,
        emExecucao: status.Threads_running,
        esperasBloqueio: status.Innodb_row_lock_waits,
        tempoBloqueioMs: status.Innodb_row_lock_time,
        deadlocks: Number(dl?.n ?? 0),
        lentas: status.Slow_queries,
        qps: previous ? +((status.Questions - previous.Questions) / ((now - previous.t) / 1000)).toFixed(1) : null,
      },
      discoArquivosMb: disk(),
    };
    previous = { Questions: status.Questions, t: now };
    fs.appendFileSync(OUT, `${JSON.stringify(sample)}\n`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  await conn.end();
})().catch((err) => {
  console.error('amostrador:', err.message);
  process.exit(1);
});
