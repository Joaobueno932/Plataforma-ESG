// Utilitários comuns dos cenários de ciclo, concorrência e falhas.
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.LOAD_BASE || 'http://localhost:3340';
const massa = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'massa.json'), 'utf8'));

async function api(token, method, url, { body, form, raw = false, timeoutMs = 60000 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const started = performance.now();
  try {
    const res = await fetch(BASE + url, { method, headers, body: payload, signal: AbortSignal.timeout(timeoutMs) });
    const data = raw ? Buffer.from(await res.arrayBuffer()) : await res.json().catch(() => null);
    return { status: res.status, body: data, ms: performance.now() - started };
  } catch (err) {
    return { status: 0, body: { message: err.message }, ms: performance.now() - started };
  }
}

const tokens = new Map();
async function login(email) {
  if (tokens.has(email)) return tokens.get(email);
  const r = await api(null, 'POST', '/auth/login', { body: { email, password: massa.password } });
  if (r.status !== 201) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  tokens.set(email, r.body.access_token);
  return r.body.access_token;
}

const usersOf = (companyId, role) => massa.users.filter((u) => u.role === role && u.companies.includes(companyId));
const company = (id) => massa.companies.find((c) => c.id === id);

/**
 * Leva o ciclo até "aguardando supervisor": responde e aprova o que falta, solicita, libera,
 * avalia todos os indicadores e conclui. Devolve as latências medidas de cada etapa.
 */
async function toAwaitingSupervisor(companyId, log = () => {}) {
  const c = company(companyId);
  const gestor = await login(usersOf(companyId, 'MANAGER')[0].email);
  const consultor = await login(usersOf(companyId, 'CONSULTOR')[0].email);
  const admin = await login('admin@carga.invalid');
  const auditor = await login(usersOf(companyId, 'AUDITOR')[0].email);
  const timings = {};
  const t = (k, ms) => (timings[k] = (timings[k] || 0) + ms);

  // Com a empresa trabalhando em paralelo (carga), a liberação pode ser recusada porque alguém
  // acabou de editar um indicador. Como faria o gestor: completa o que falta e tenta de novo.
  let release;
  let attempts = 0;
  for (attempts = 1; attempts <= 5; attempts += 1) {
    const items = (await api(gestor, 'GET', `/reports/company/questions/${c.reportId}`)).body;
    for (const item of items) {
      const approved = item.answerState === 'submitted' && /^Approved/.test(item.status) && item.reviewedAnswerVersion === item.answerVersion;
      if (approved) continue;
      const top = item.question.answers.reduce((a, b) => (b.points > a.points ? b : a));
      const r1 = await api(gestor, 'PATCH', `/reports/answerQuestion/${item.id}`, { body: { answerId: top.id, answerText: 'carga' } });
      t('responder', r1.ms);
      const r2 = await api(consultor, 'POST', `/reports/validateanswer/${item.id}`, { body: { veredict: true } });
      t('revisar', r2.ms);
      if (r1.status !== 200 || r2.status !== 201) log(`  ${item.question.code}: responder ${r1.status} revisar ${r2.status}`);
    }
    t('solicitar', (await api(gestor, 'POST', `/reports/requestAudit/${companyId}`)).ms);
    release = await api(admin, 'POST', `/reports/releaseAudit/${companyId}`);
    t('liberar', release.ms);
    if (release.status === 201) break;
  }
  timings.tentativasLiberacao = attempts;
  if (release.status !== 201) throw new Error(`liberação ${companyId}: ${release.status} ${release.body?.message}`);
  const audited = (await api(auditor, 'GET', `/reports/company/questions/${c.reportId}`)).body;
  for (const item of audited) {
    const r = await api(auditor, 'POST', `/auditory/evaluatequestion/${item.id}`, { body: { status: 'Approved', redflag: 'comprovado na carga' } });
    t('avaliar', r.ms);
  }
  const conclude = await api(auditor, 'POST', `/auditory/submitToSupervisor/${companyId}`);
  t('concluir', conclude.ms);
  if (conclude.status !== 201) throw new Error(`conclusão ${companyId}: ${conclude.status} ${conclude.body?.message}`);
  return { timings, items: audited.length };
}

module.exports = { BASE, massa, api, login, usersOf, company, toAwaitingSupervisor };
