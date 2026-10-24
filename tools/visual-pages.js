// Regressão visual dos módulos não reconstruídos (empresas, pessoas, configurações), em desktop
// e celular, por perfil. Mesma entrada por API de tools/visual-cycle.js.
//   node tools/visual-pages.js <saida> [web] [api]
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const [out, WEB = 'http://localhost:3001', API = 'http://localhost:3333'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

async function context(browser, email, password, viewport) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const s = await r.json();
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR' });
  const host = new URL(WEB).hostname;
  await ctx.addCookies(
    [
      ['token', s.access_token],
      ['refreshToken', s.refresh_token],
      ['userId', s.sanitizedUser.id],
      ['userRole', s.sanitizedUser.role],
    ].map(([name, value]) => ({ name, value, domain: host, path: '/' })),
  );
  return ctx;
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const lines = [];
  const cases = [
    ['admin', 'admin@esgdemo.com.br', 'admin123', ['/companies', '/users', '/settings']],
    ['gestor', 'gestor@esgdemo.com.br', 'esgdemo123', ['/companies', '/users', '/settings', '/indicators']],
    ['consultor', 'consultor@esgdemo.com.br', 'esgdemo123', ['/companies']],
  ];
  for (const [who, email, password, pages] of cases) {
    for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['celular', { width: 390, height: 844 }]]) {
      const ctx = await context(browser, email, password, viewport);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => r.status() >= 500 && errors.push(`HTTP ${r.status()} ${r.url()}`));
      for (const route of pages) {
        await page.goto(`${WEB}${route}`, { waitUntil: 'load' });
        await page.waitForTimeout(2500);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const name = `${who}-${device}-${route.replace(/\//g, '') || 'home'}`;
        await page.screenshot({ path: path.join(out, `${name}.png`) });
        lines.push(`${name}: url final ${new URL(page.url()).pathname} · excesso horizontal ${overflow}px`);
      }
      if (errors.length) lines.push(`${who}-${device} ERROS: ${errors.join(' | ')}`);
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'relatorio.txt'), lines.join('\n'));
  console.log(lines.join('\n'));
})().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
