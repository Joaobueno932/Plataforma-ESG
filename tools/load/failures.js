// Falhas controladas no ambiente ISOLADO de carga (seção 8). Usa os containers esg-api-load e
// esg-mysql; nada fora deles é tocado.
//   node tools/load/failures.js
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { api, login, usersOf, company, toAwaitingSupervisor, BASE } = require('./lib');

const results = [];
const report = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name} — ${detail}`);
};
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitHealthy(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await api(null, 'GET', '/health', { timeoutMs: 2000 });
    if (r.status === 200) return Date.now() - start;
    await sleep(500);
  }
  return null;
}

(async () => {
  // 1. Banco indisponível por 10 s com tráfego em andamento.
  {
    const A = process.env.F_A || 'carga-059';
    const marker = `durante a queda do banco ${Date.now()}`;
    const gestor = await login(usersOf(A, 'MANAGER')[0].email);
    const items = (await api(gestor, 'GET', `/reports/company/questions/${company(A).reportId}?view=resumo`)).body;
    const target = items.find((i) => i.answerState !== 'submitted');
    docker('pause', 'esg-mysql');
    const pausedAt = Date.now();
    const during = await Promise.all([
      api(gestor, 'GET', `/reports/company/questions/${company(A).reportId}?view=resumo`, { timeoutMs: 30000 }),
      api(gestor, 'PATCH', `/reports/questionReports/${target.id}/draft`, { body: { answerText: marker }, timeoutMs: 30000 }),
      (async () => {
        await sleep(25000);
        docker('unpause', 'esg-mysql');
        return { status: 'retomado', ms: Date.now() - pausedAt };
      })(),
    ]);
    await sleep(2000);
    const after = await api(gestor, 'GET', `/reports/questionReports/${target.id}`);
    // 200: tem de estar gravada; 503: não pode estar (transação desfeita); sem resposta: qualquer um.
    const applied = after.body.answerText === marker;
    const consistent = during[1].status === 200 ? applied : during[1].status === 503 ? !applied : true;
    const health = await api(gestor, 'GET', `/reports/company/questions/${company(A).reportId}?view=resumo`);
    const bounded = during.slice(0, 2).every((r) => r.status === 503 && r.ms < 18000);
    report(
      'banco indisponível por 25 s',
      health.status === 200 && consistent && bounded,
      `durante: leitura ${during[0].status} em ${Math.round(during[0].ms)} ms, escrita ${during[1].status} em ${Math.round(during[1].ms)} ms (limite previsível, sem espera indefinida: ${bounded}); depois: ${health.status}; escrita aplicada uma vez ou nenhuma (coerente: ${consistent})`,
    );
  }

  // 2. Falha de armazenamento na geração do documento e recuperação automática.
  {
    const B = process.env.F_B || 'carga-060';
    await toAwaitingSupervisor(B);
    docker('exec', 'esg-api-load', 'sh', '-c', 'mkdir -p /app/storage/publications && chmod 555 /app/storage/publications');
    const supervisor = await login(usersOf(B, 'SUPERVISOR')[0].email);
    const approve = await api(supervisor, 'POST', `/auditory/finishAuditory/${B}`);
    docker('exec', 'esg-api-load', 'chmod', '755', '/app/storage/publications');
    const gestor = await login(usersOf(B, 'MANAGER')[0].email);
    const retry = await api(gestor, 'GET', `/reports/${company(B).reportId}/publication`);
    const pdf = await api(gestor, 'GET', `/reports/${company(B).reportId}/publication/report.pdf`, { raw: true });
    report(
      'falha de armazenamento ao gerar o relatório',
      approve.status === 201 && approve.body.publication.status === 'failed' && retry.body.status === 'available' && pdf.status === 200,
      `aprovação ${approve.status} com publicação "${approve.body?.publication?.status}" (aprovação mantida); nova tentativa automática → "${retry.body?.status}" (${retry.body?.attempts} tentativas); download ${pdf.status}`,
    );
  }

  // 3. Envio de arquivo interrompido no meio.
  {
    const C = process.env.F_C || 'carga-047';
    const gestor = await login(usersOf(C, 'MANAGER')[0].email);
    const before = docker('exec', 'esg-api-load', 'sh', '-c', `ls /app/storage/uploads/companyFiles/${C} 2>/dev/null | wc -l`);
    const url = new URL(BASE);
    await new Promise((resolve) => {
      const socket = net.connect(Number(url.port), url.hostname, () => {
        const boundary = 'carga';
        const head = `--${boundary}\r\nContent-Disposition: form-data; name="companyId"\r\n\r\n${C}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="interrompido.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\n`;
        socket.write(
          `POST /uploads/companyFile HTTP/1.1\r\nHost: ${url.host}\r\nAuthorization: Bearer ${gestor}\r\nContent-Type: multipart/form-data; boundary=${boundary}\r\nContent-Length: 5000000\r\n\r\n${head}`,
        );
        socket.write(Buffer.alloc(200 * 1024, 0x20));
        setTimeout(() => {
          socket.destroy();
          resolve();
        }, 300);
      });
      socket.on('error', resolve);
    });
    await sleep(1500);
    const afterFiles = docker('exec', 'esg-api-load', 'sh', '-c', `ls /app/storage/uploads/companyFiles/${C} 2>/dev/null | wc -l`);
    const parts = docker('exec', 'esg-api-load', 'sh', '-c', 'find /app/storage -name "*.part" | wc -l');
    const health = await api(gestor, 'GET', '/auth/me');
    report(
      'envio interrompido no meio',
      before === afterFiles && parts === '0' && health.status === 200,
      `arquivos da empresa ${before}→${afterFiles}; temporários abandonados: ${parts}; API segue respondendo (${health.status})`,
    );
  }

  // 4. Reinício da aplicação durante a aprovação (geração do documento em andamento).
  {
    const D = process.env.F_D || 'carga-048';
    await toAwaitingSupervisor(D);
    const supervisor = await login(usersOf(D, 'SUPERVISOR')[0].email);
    const pending = api(supervisor, 'POST', `/auditory/finishAuditory/${D}`, { timeoutMs: 20000 });
    await sleep(15);
    docker('restart', '-t', '0', 'esg-api-load'); // encerramento forçado: sem esperar a requisição terminar
    const first = await pending;
    const back = await waitHealthy();
    const gestor = (await api(null, 'POST', '/auth/login', { body: { email: usersOf(D, 'MANAGER')[0].email, password: require('./lib').massa.password } })).body.access_token;
    await sleep(2000);
    const wf = (await api(gestor, 'GET', `/reports/${company(D).reportId}/workflow`)).body;
    const pubs = await api(gestor, 'GET', `/reports/${company(D).reportId}/publication`);
    const history = (await api(gestor, 'GET', `/reports/${company(D).reportId}/result/history`)).body || [];
    const consistent =
      (wf.status === 'Audited' && pubs.status === 200 && pubs.body.status === 'available' && history.length === 1) ||
      (wf.status === 'AwaitingSupervisor' && pubs.status === 404 && history.length === 0);
    report(
      'reinício da API durante a aprovação',
      consistent,
      `resposta durante o reinício: ${first.status || 'conexão interrompida'}; API de volta em ${back} ms; estado final "${wf.status}", publicação ${pubs.status === 200 ? pubs.body.status : 'inexistente'}, resultados gravados ${history.length} (tudo ou nada)`,
    );
    if (wf.status === 'AwaitingSupervisor') {
      const again = await api(await login(usersOf(D, 'SUPERVISOR')[0].email).catch(() => null), 'POST', `/auditory/finishAuditory/${D}`);
      report('nova aprovação após o reinício', again.status === 201 && again.body.publication.status === 'available', `status ${again.status}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'out', 'falhas.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} cenários de falha com recuperação correta`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  try {
    execFileSync('docker', ['unpause', 'esg-mysql']);
  } catch {
    /* já estava ativo */
  }
  console.error('erro:', err);
  process.exit(1);
});
