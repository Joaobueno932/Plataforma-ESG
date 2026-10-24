// Inspeção visual das telas reconstruídas (Prompt 6), em desktop e celular.
//   node tools/visual-cycle.js <saida> [web=http://localhost:3001] [api=http://localhost:3333]
// Entra pela API (sessão real), grava os cookies e percorre: ciclo, modal com cartões, teclado,
// catálogo e editor de indicador. Mensagens de console e respostas >= 400 vão para o relatório.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const [out, WEB = 'http://localhost:3001', API = 'http://localhost:3333'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

async function session(email, password) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (r.status !== 201) throw new Error(`login ${email}: ${r.status}`);
  return r.json();
}

async function open(browser, who, viewport) {
  const s = await session(who.email, who.password);
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', deviceScaleFactor: 1 });
  const url = new URL(WEB);
  await ctx.addCookies(
    [
      ['token', s.access_token],
      ['refreshToken', s.refresh_token],
      ['userId', s.sanitizedUser.id],
      ['userRole', s.sanitizedUser.role],
    ].map(([name, value]) => ({ name, value, domain: url.hostname, path: '/' })),
  );
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`${who.email} ${m.type()}: ${m.text().slice(0, 200)}`));
  page.on('response', (r) => r.status() >= 400 && log.push(`${who.email} HTTP ${r.status()} ${r.request().method()} ${r.url()}`));
  return { page, ctx, log, user: s.sanitizedUser };
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const report = [];
  const shot = async (page, name, full = false) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: full });
    report.push(`captura ${name}`);
  };

  // Gestor — desktop
  const gestor = await open(browser, { email: 'gestor@esgdemo.com.br', password: 'esgdemo123' }, { width: 1440, height: 900 });
  await gestor.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await gestor.page.waitForSelector('text=Indicadores');
  await shot(gestor.page, '01-ciclo-indicadores-desktop');
  await gestor.page.getByRole('tab', { name: 'Visão geral' }).click();
  await shot(gestor.page, '02-visao-geral-desktop');
  await gestor.page.getByRole('tab', { name: /Indicadores/ }).click();
  await gestor.page.getByRole('combobox', { name: 'Eixo' }).selectOption('S');
  const filtered = await gestor.page.url();
  report.push(`filtro na URL: ${filtered.includes('eixo=S')}`);
  const firstButton = gestor.page.getByRole('button', { name: /^(Responder|Consultar|Revisar)/ }).first();
  await firstButton.click();
  await gestor.page.waitForSelector('[role="dialog"]');
  await shot(gestor.page, '03-modal-resposta-desktop');
  // Teclado: foco no grupo de cartões e setas.
  const radios = gestor.page.locator('[role="radiogroup"] [role="radio"]');
  const count = await radios.count();
  if (count) {
    await radios.first().focus();
    await gestor.page.keyboard.press('ArrowRight');
    const checked = await gestor.page.locator('[role="radio"][aria-checked="true"]').count();
    report.push(`teclado: ${count} cartões; seleção por seta = ${checked === 1}`);
    await shot(gestor.page, '04-modal-selecao-teclado');
    // Fechar com alteração pendente oferece salvar/descartar/continuar.
    await gestor.page.keyboard.press('Escape');
    const prompt = await gestor.page.getByText('Há alterações não salvas').isVisible().catch(() => false);
    report.push(`fechar com alteração pendente pergunta: ${prompt}`);
    await shot(gestor.page, '05-fechar-com-alteracoes');
    if (prompt) await gestor.page.getByRole('button', { name: 'Descartar' }).click();
  }
  await gestor.page.waitForTimeout(300);
  report.push(`filtro preservado depois de fechar: ${(await gestor.page.url()).includes('eixo=S')}`);
  const focusBack = await gestor.page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40));
  report.push(`foco ao fechar volta para: "${focusBack}"`);

  // Gestor — celular
  const mobile = await open(browser, { email: 'gestor@esgdemo.com.br', password: 'esgdemo123' }, { width: 390, height: 844 });
  await mobile.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await mobile.page.waitForSelector('text=Indicadores');
  await shot(mobile.page, '06-ciclo-celular');
  const overflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  report.push(`celular sem rolagem horizontal: ${!overflow}`);
  await mobile.page.getByRole('button', { name: /^(Responder|Consultar)/ }).first().click();
  await mobile.page.waitForSelector('[role="dialog"]');
  await shot(mobile.page, '07-modal-celular');
  await mobile.page.locator('[role="dialog"] .overflow-y-auto').first().evaluate((el) => el.scrollTo(0, 900));
  await shot(mobile.page, '08-modal-celular-rolado');
  await mobile.page.keyboard.press('Escape');
  await mobile.page.getByRole('button', { name: 'Abrir menu' }).click();
  await shot(mobile.page, '09-menu-celular');

  // Colaborador — só os indicadores atribuídos
  const colab = await open(browser, { email: 'funcionario@esgdemo.com.br', password: 'esgdemo123' }, { width: 1440, height: 900 });
  await colab.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await colab.page.waitForTimeout(800);
  await shot(colab.page, '10-colaborador');

  // Administração — catálogo
  const admin = await open(browser, { email: 'admin@esgdemo.com.br', password: 'admin123' }, { width: 1440, height: 900 });
  await admin.page.goto(`${WEB}/indicators`, { waitUntil: 'networkidle' });
  await admin.page.waitForSelector('text=Editor de cadernos');
  await shot(admin.page, '11-catalogo');
  const draft = await admin.page.getByRole('button', { name: /Nova edição/ }).isVisible();
  if (draft) {
    await admin.page.getByLabel('Rótulo da nova edição').fill(`visual-${Date.now()}`);
    await admin.page.getByRole('button', { name: /Nova edição/ }).click();
    await admin.page.waitForSelector('text=Edição administrativa', { timeout: 20000 });
    await shot(admin.page, '12-edicao-rascunho');
    await admin.page.getByRole('button', { name: /Editar e cores/ }).first().click();
    await admin.page.waitForSelector('[role="dialog"]');
    await shot(admin.page, '13-editor-indicador');
    await admin.page.keyboard.press('Escape');
    await admin.page.getByRole('button', { name: /^Novo$/ }).click();
    await shot(admin.page, '14-novo-caderno');
    await admin.page.keyboard.press('Escape');
    await admin.page.getByRole('button', { name: /^Descartar$/ }).click();
    await admin.page.getByRole('button', { name: /^Descartar$/ }).last().click();
    await admin.page.waitForTimeout(800);
  }
  await admin.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await admin.page.getByRole('tab', { name: 'Equipe' }).click();
  await shot(admin.page, '15-equipe-admin');
  await admin.page.getByRole('tab', { name: 'Resultado' }).click();
  await admin.page.waitForTimeout(800);
  await shot(admin.page, '16-resultado-admin');

  // Leva o ciclo à auditoria pela própria API (sessões reais) e inspeciona o bloqueio e o
  // painel do auditor com a comparação declaração × enquadramento.
  const call = async (token, method, url, body) => {
    const r = await fetch(`${API}${url}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const g = (await session('gestor@esgdemo.com.br', 'esgdemo123')).access_token;
  const c = (await session('consultor@esgdemo.com.br', 'esgdemo123')).access_token;
  const a = (await session('admin@esgdemo.com.br', 'admin123')).access_token;
  const au = (await session('auditor@esgdemo.com.br', 'esgdemo123')).access_token;
  const items = (await call(g, 'GET', '/reports/company/questions/')).body;
  for (const it of items) {
    const level = it.question.answers.find((x) => /consciente/i.test(x.title)) || it.question.answers[0];
    await call(g, 'PATCH', `/reports/answerQuestion/${it.id}`, { answerId: level.id, answerText: 'Resposta de demonstração para inspeção visual' });
    await call(c, 'POST', `/reports/validateanswer/${it.id}`, { veredict: true });
  }
  await call(g, 'POST', '/reports/requestAudit/demo-company-a');
  const rel = await call(a, 'POST', '/reports/releaseAudit/demo-company-a');
  report.push(`liberação para auditoria: ${rel.status}`);
  const top = items[1].question.answers.find((x) => /conforme/i.test(x.title) && x.points > 0) || items[1].question.answers.at(-1);
  await call(au, 'POST', `/auditory/questionReports/${items[1].id}/decision`, { auditedAnswerId: top.id, justification: 'Evidências acima do declarado' });

  await gestor.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await gestor.page.waitForSelector('text=Em auditoria');
  await shot(gestor.page, '17-empresa-bloqueada');
  await gestor.page.getByRole('button', { name: /^Consultar/ }).nth(1).click();
  await gestor.page.waitForSelector('[role="dialog"]');
  const editVisible = await gestor.page.getByRole('button', { name: 'Enviar para revisão' }).isVisible().catch(() => false);
  report.push(`empresa em auditoria não vê ação de editar: ${!editVisible}`);
  await shot(gestor.page, '18-empresa-modal-bloqueado');

  const auditor = await open(browser, { email: 'auditor@esgdemo.com.br', password: 'esgdemo123' }, { width: 1440, height: 900 });
  await auditor.page.goto(`${WEB}/companies/demo-company-a`, { waitUntil: 'networkidle' });
  await auditor.page.waitForSelector('text=Em auditoria');
  await shot(auditor.page, '19-auditor-lista');
  await auditor.page.getByRole('button', { name: /^Avaliar/ }).nth(1).click();
  await auditor.page.getByRole('tab', { name: 'Auditoria' }).click();
  await shot(auditor.page, '20-auditor-comparacao');

  const logs = [...gestor.log, ...mobile.log, ...colab.log, ...admin.log, ...auditor.log];
  fs.writeFileSync(path.join(out, 'relatorio.txt'), [...report, '', '--- console/HTTP ---', ...logs].join('\n'));
  console.log([...report, '', `${logs.length} mensagem(ns) de console/HTTP em relatorio.txt`].join('\n'));
  await browser.close();
})().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
