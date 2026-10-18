// Validação visual do app reconstruído (local): node tools/shot.js <saida> <steps.json>
// steps: [{goto}|{fill:[sel,val]}|{click:sel}|{wait:ms}|{shot:name}|{press:[sel,key]}|{eval:js}]
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const [out, stepsFile] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  const logs = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && logs.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`));
  for (const s of steps) {
    try {
      if (s.goto) await page.goto(s.goto, { waitUntil: 'load' });
      if (s.fill) await page.fill(s.fill[0], s.fill[1]);
      if (s.click) await page.click(s.click, { timeout: 10000 });
      if (s.upload) await page.setInputFiles(s.upload[0], s.upload[1]);
      if (s.press) await page.press(s.press[0], s.press[1]);
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 15000 });
      if (s.eval) console.log('eval:', JSON.stringify(await page.evaluate(s.eval)));
      if (s.shot) await page.screenshot({ path: `${out}/${s.shot}.png`, fullPage: !!s.full });
      if (s.text) console.log('text:', (await page.innerText(s.text)).slice(0, 1500));
    } catch (e) {
      logs.push(`STEP FAIL ${JSON.stringify(s)}: ${e.message.split('\n')[0]}`);
      await page.screenshot({ path: `${out}/fail-${Date.now()}.png` });
    }
  }
  console.log(logs.join('\n') || 'no errors');
  await browser.close();
})();
