// Gerador de carga da Plataforma ESG FIEMS — usuários virtuais (VUs) com sessão, tempo de
// pensar, mistura de leitura/escrita/anexos e verificação do resultado (200 não basta).
//
//   node tools/load/runner.js <plano.json> <nome-da-execução>
//
// Plano: { "base": "http://localhost:3340", "stages": [{ "name", "vus", "durationSec", "rampSec" }],
//          "thinkMs": [min, max], "personas": {"gestor": 40, ...}, "timeoutMs": 15000 }
//
// Saída: tools/load/out/<nome>.json (por patamar e por operação: contagem, p50/p95/p99, taxa,
// erros por classe) + resumo no console. Classes de resultado:
//   ok          — resposta esperada e conferida;
//   negocio     — recusa intencional e correta (403 por bloqueio/escopo, 409 de versão, 429 de limite);
//   inesperado  — 5xx, falha de rede, timeout ou conteúdo que não confere.
const fs = require('node:fs');
const path = require('node:path');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const [planFile, runName = `execucao-${Date.now()}`] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const BASE = plan.base || 'http://localhost:3340';
const TIMEOUT = plan.timeoutMs || 15000;
const massa = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'massa.json'), 'utf8'));
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n% evidencia de carga\n'), Buffer.alloc(48 * 1024, 0x20), Buffer.from('\n%%EOF\n')]);

/* ------------------------------------------------------------------ métricas */

let stage = null;
const results = [];
function bucket(op) {
  if (!stage.ops[op]) stage.ops[op] = { lat: [], ok: 0, negocio: 0, inesperado: 0, motivos: {} };
  return stage.ops[op];
}
function record(op, ms, kind, reason) {
  if (!stage) return;
  const b = bucket(op);
  b.lat.push(ms);
  b[kind] += 1;
  if (kind !== 'ok') b.motivos[reason] = (b.motivos[reason] || 0) + 1;
}
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null);

/* ------------------------------------------------------------------ HTTP */

async function call(vu, op, method, url, { body, form, expect = [200], business = [], check, raw = false } = {}) {
  // Sessão revogada no meio do roteiro: as chamadas restantes do ciclo não são enviadas (antes iam
  // sem token e o 401 resultante era contado como erro inesperado da API).
  if (!vu.token && op !== 'login') return null;
  const headers = {};
  if (vu.token) headers.Authorization = `Bearer ${vu.token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const started = performance.now();
  let res;
  try {
    res = await fetch(BASE + url, { method, headers, body: payload, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (err) {
    record(op, performance.now() - started, 'inesperado', err.name === 'TimeoutError' ? 'timeout' : `rede:${err.cause?.code || err.name}`);
    return null;
  }
  let data = null;
  try {
    data = raw ? Buffer.from(await res.arrayBuffer()) : await res.json();
  } catch {
    data = null;
  }
  const ms = performance.now() - started;
  if (res.status === 401 && vu.token && op !== 'login') {
    vu.token = null; // sessão expirada: o próximo ciclo refaz o login
    record(op, ms, 'negocio', '401-sessao');
    return null;
  }
  if (expect.includes(res.status)) {
    if (check) {
      const problem = check(data);
      if (problem) {
        record(op, ms, 'inesperado', `conteudo:${problem}`);
        return null;
      }
    }
    record(op, ms, 'ok');
    return data;
  }
  if (business.includes(res.status) || res.status === 429) {
    record(op, ms, 'negocio', String(res.status));
    return null;
  }
  record(op, ms, 'inesperado', `http:${res.status}`);
  return null;
}

/* ------------------------------------------------------------------ personas */

const byRole = (role) => massa.users.filter((u) => u.role === role);
const companyOf = (id) => massa.companies.find((c) => c.id === id);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(plan.thinkMs[0] + Math.random() * (plan.thinkMs[1] - plan.thinkMs[0]));

async function login(vu) {
  const data = await call(vu, 'login', 'POST', '/auth/login', {
    body: { email: vu.user.email, password: massa.password },
    expect: [201],
    check: (d) => (!d?.access_token ? 'sem token' : null),
  });
  if (data) vu.token = data.access_token;
}

/** Ações de quem é da empresa (gestor e colaborador). */
async function companyAction(vu) {
  const company = companyOf(vu.user.companies[0]);
  const r = Math.random();
  if (r < 0.18) {
    // Visão geral
    await call(vu, 'visao-geral:me', 'GET', '/auth/me', { check: (d) => (!d?.id ? 'sem id' : null) });
    await call(vu, 'visao-geral:empresa', 'GET', `/companies/${company.id}`, { business: [403], check: (d) => (d?.id !== company.id ? 'empresa errada' : null) });
    await call(vu, 'visao-geral:fluxo', 'GET', `/reports/${company.reportId}/workflow`, { check: (d) => (d?.reportId !== company.reportId ? 'ciclo errado' : null) });
    await call(vu, 'visao-geral:pendencias', 'GET', `/reports/${company.reportId}/pendings`, { check: (d) => (!Array.isArray(d) ? 'não é lista' : null) });
    return;
  }
  if (r < 0.38 || !vu.items) {
    const list = await call(vu, 'lista-indicadores', 'GET', `/reports/company/questions/${company.reportId}${plan.fullList ? '' : '?view=resumo'}`, {
      check: (d) => {
        if (!Array.isArray(d)) return 'não é lista';
        if (vu.user.role === 'MANAGER' && d.length !== 69) return `esperava 69, veio ${d.length}`;
        if (vu.user.role === 'EMPLOYEE' && d.some((i) => i.answerer?.id !== vu.user.id)) return 'colaborador viu indicador alheio';
        return null;
      },
    });
    if (list) vu.items = list.map((i) => i.id);
    return;
  }
  const itemId = pick(vu.items);
  if (r < 0.55) {
    await call(vu, 'abrir-indicador', 'GET', `/reports/questionReports/${itemId}`, { check: (d) => (d?.id !== itemId ? 'item errado' : null) });
    return;
  }
  if (r < 0.7) {
    const item = await call(vu, 'abrir-indicador', 'GET', `/reports/questionReports/${itemId}`);
    if (!item) return;
    const answer = pick(item.question.answers);
    const saved = await call(vu, 'salvar-rascunho', 'PATCH', `/reports/questionReports/${itemId}/draft`, {
      body: { answerId: answer.id, answerText: `rascunho ${Date.now()}`, expectedLockVersion: item.lockVersion },
      business: [403, 409],
      check: (d) => (d?.answerState !== 'draft' && d?.answerState !== 'submitted' ? 'estado inesperado' : null),
    });
    if (saved && Math.random() < 0.5)
      await call(vu, 'enviar-resposta', 'POST', `/reports/questionReports/${itemId}/submit`, {
        body: { expectedLockVersion: saved.lockVersion },
        expect: [201],
        business: [400, 403, 409],
        check: (d) => (d?.answerState !== 'submitted' ? 'não ficou enviado' : null),
      });
    return;
  }
  if (r < 0.8) {
    const form = new FormData();
    form.append('companyId', company.id);
    form.append('description', 'evidência de carga');
    form.append('file', new Blob([PDF]), `carga-${vu.id}-${Date.now()}.pdf`);
    const up = await call(vu, 'upload-evidencia', 'POST', '/uploads/companyFile', { form, expect: [201], business: [403], check: (d) => (!d?.id ? 'sem id' : null) });
    if (!up) return;
    // Como na tela: o arquivo é anexado a um indicador da própria pessoa.
    const linked = await call(vu, 'anexar-evidencia', 'PATCH', `/reports/questionReports/${itemId}/draft`, {
      body: { fileIds: [up.id] },
      business: [403, 409],
      check: (d) => (!d?.files?.some((f) => f.fileId === up.id) ? 'arquivo não vinculado' : null),
    });
    if (linked) vu.uploaded = up;
    return;
  }
  if (r < 0.88 && vu.uploaded) {
    await call(vu, 'download-evidencia', 'GET', `/${vu.uploaded.url}`, { raw: true, check: (d) => (!d || d.length !== PDF.length ? 'tamanho difere' : null) });
    return;
  }
  if (r < 0.94) {
    await call(vu, 'historico', 'GET', `/reports/questionReports/${itemId}/history`, { check: (d) => (!Array.isArray(d?.versions) ? 'sem versões' : null) });
    return;
  }
  await call(vu, 'resultado-preliminar', 'GET', `/reports/${company.reportId}/result?mode=self`, { check: (d) => (!d?.axes ? 'sem eixos' : null) });
}

/** Consultoria: navega entre as empresas vinculadas, consulta e revisa. */
async function consultorAction(vu) {
  const company = companyOf(pick(vu.user.companies));
  const r = Math.random();
  if (r < 0.2) {
    await call(vu, 'busca-paginacao', 'GET', `/companies?page=${1 + Math.floor(Math.random() * 2)}&perPage=5&bussinessName=CARGA`, {
      check: (d) => (!Array.isArray(d?.data) || d.data.some((c) => !vu.user.companies.includes(c.id)) ? 'empresa fora do vínculo' : null),
    });
    return;
  }
  if (r < 0.5) {
    const list = await call(vu, 'lista-indicadores', 'GET', `/reports/company/questions/${company.reportId}${plan.fullList ? '' : '?view=resumo'}`, {
      check: (d) => (!Array.isArray(d) || d.length !== 69 ? 'lista incompleta' : null),
    });
    if (list) vu.review = list.filter((i) => i.status === 'PendingValidationByManager').map((i) => i.id);
    return;
  }
  if (r < 0.75 && vu.review?.length) {
    await call(vu, 'revisar', 'POST', `/reports/validateanswer/${pick(vu.review)}`, { body: { veredict: true }, expect: [201], business: [403, 409] });
    return;
  }
  await call(vu, 'visao-geral:fluxo', 'GET', `/reports/${company.reportId}/workflow`);
}

/** Administração: listagens paginadas e consultas. */
async function adminAction(vu) {
  const r = Math.random();
  if (r < 0.4) await call(vu, 'busca-paginacao', 'GET', `/companies?page=${1 + Math.floor(Math.random() * 6)}&perPage=10`, { check: (d) => (!Array.isArray(d?.data) ? 'sem lista' : null) });
  else if (r < 0.7) await call(vu, 'pessoas-paginacao', 'GET', `/users?page=${1 + Math.floor(Math.random() * 20)}`, { check: (d) => (!Array.isArray(d?.data) ? 'sem lista' : null) });
  else await call(vu, 'catalogo-versoes', 'GET', '/catalog/versions', { check: (d) => (!Array.isArray(d?.data) ? 'sem lista' : null) });
}

/** Auditoria: leitura das empresas designadas (o ciclo de auditoria completo roda em cycle.js). */
async function auditorAction(vu) {
  const company = companyOf(pick(vu.user.companies));
  await call(vu, 'lista-indicadores', 'GET', `/reports/company/questions/${company.reportId}${plan.fullList ? '' : '?view=resumo'}`, {
    check: (d) => (!Array.isArray(d) ? 'não é lista' : null),
  });
}

const PERSONAS = {
  gestor: { users: byRole('MANAGER'), action: companyAction },
  colaborador: { users: byRole('EMPLOYEE'), action: companyAction },
  consultor: { users: byRole('CONSULTOR'), action: consultorAction },
  auditor: { users: byRole('AUDITOR'), action: auditorAction },
  admin: { users: byRole('ADMIN'), action: adminAction },
};

function personaFor(index) {
  const weights = plan.personas || { gestor: 45, colaborador: 25, consultor: 20, auditor: 5, admin: 5 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let x = ((index * 7919) % total) + 0.5; // distribuição determinística entre os VUs
  for (const [name, w] of Object.entries(weights)) {
    if (x < w) return name;
    x -= w;
  }
  return 'gestor';
}

/* ------------------------------------------------------------------ execução */

const vus = [];
let running = 0;
function spawn(index) {
  const persona = PERSONAS[personaFor(index)];
  // Usuários diferentes por VU (distribui a carga entre contas e empresas).
  const user = persona.users[index % persona.users.length];
  const vu = { id: index, user, token: null, stop: false, action: persona.action };
  vus.push(vu);
  running += 1;
  (async () => {
    while (!vu.stop) {
      if (!vu.token) await login(vu);
      else await vu.action(vu);
      await think();
    }
    running -= 1;
  })();
}

async function runStage(s) {
  stage = { name: s.name, vus: s.vus, startedAt: Date.now(), ops: {} };
  const el = monitorEventLoopDelay({ resolution: 10 });
  el.enable();
  const cpu0 = process.cpuUsage();
  // Rampa: sobe (ou desce) gradualmente até o alvo.
  const target = s.vus;
  const steps = Math.max(1, Math.round((s.rampSec || 0) / 2));
  const start = vus.filter((v) => !v.stop).length;
  for (let i = 1; i <= steps; i += 1) {
    const want = Math.round(start + ((target - start) * i) / steps);
    const active = vus.filter((v) => !v.stop);
    if (want > active.length) for (let k = active.length; k < want; k += 1) spawn(vus.length);
    else for (const v of active.slice(want)) v.stop = true;
    if (steps > 1) await sleep(2000);
  }
  await sleep(s.durationSec * 1000);
  const cpu = process.cpuUsage(cpu0);
  const elapsed = (Date.now() - stage.startedAt) / 1000;
  const summary = { name: s.name, vus: target, seconds: elapsed, ops: {}, totals: { ok: 0, negocio: 0, inesperado: 0 } };
  for (const [op, b] of Object.entries(stage.ops)) {
    const sorted = [...b.lat].sort((a, x) => a - x);
    const n = sorted.length;
    summary.ops[op] = {
      n,
      rps: +(n / elapsed).toFixed(2),
      p50: +pct(sorted, 50).toFixed(1),
      p95: +pct(sorted, 95).toFixed(1),
      p99: +pct(sorted, 99).toFixed(1),
      max: +sorted[n - 1].toFixed(1),
      ok: b.ok,
      negocio: b.negocio,
      inesperado: b.inesperado,
      motivos: b.motivos,
    };
    summary.totals.ok += b.ok;
    summary.totals.negocio += b.negocio;
    summary.totals.inesperado += b.inesperado;
  }
  const total = summary.totals.ok + summary.totals.negocio + summary.totals.inesperado;
  summary.totals.rps = +(total / elapsed).toFixed(2);
  summary.totals.erroInesperadoPct = total ? +((summary.totals.inesperado / total) * 100).toFixed(3) : 0;
  summary.gerador = {
    cpuPct: +(((cpu.user + cpu.system) / 1000 / (elapsed * 1000)) * 100).toFixed(1),
    eventLoopP99Ms: +Math.max(0, el.percentile(99) / 1e6 - 10).toFixed(1),
  };
  el.disable();
  results.push(summary);
  const top = Object.entries(summary.ops)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 6)
    .map(([op, o]) => `${op} p95=${o.p95}ms`)
    .join(' · ');
  console.log(
    `[${s.name}] VUs=${target} req/s=${summary.totals.rps} inesperados=${summary.totals.erroInesperadoPct}% negócio=${summary.totals.negocio} gerador cpu=${summary.gerador.cpuPct}% | ${top}`,
  );
  return summary;
}

(async () => {
  console.log(`execução ${runName} contra ${BASE} — ${plan.stages.length} patamar(es)`);
  for (const s of plan.stages) await runStage(s);
  for (const v of vus) v.stop = true;
  const outFile = path.join(__dirname, 'out', `${runName}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ run: runName, base: BASE, plan, finishedAt: new Date().toISOString(), stages: results }, null, 2));
  console.log(`resultado: ${outFile}`);
  setTimeout(() => process.exit(0), 3000); // deixa os VUs terminarem a requisição em curso
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
