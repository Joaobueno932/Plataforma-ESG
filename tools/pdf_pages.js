// Renderiza páginas de um PDF em PNG com o pdf.js dentro do Chrome (somente leitura).
//   node tools/pdf_pages.js <arquivo.pdf> <saida> <pagina1,pagina2,...> [escala]
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const [file, out, pagesArg, scaleArg] = process.argv.slice(2);
  const pages = String(pagesArg || '1').split(',').map(Number);
  const scale = Number(scaleArg || 1.4);
  fs.mkdirSync(out, { recursive: true });
  const pdfjsDir = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const html = path.join(out, '_render.html');
  fs.writeFileSync(
    html,
    `<!doctype html><html><body style="margin:0;background:#fff"><canvas id="c"></canvas>
     <script type="module">
       import * as pdfjs from 'file:///${pdfjsDir.replace(/\\/g, '/')}/pdf.mjs';
       pdfjs.GlobalWorkerOptions.workerSrc = 'file:///${pdfjsDir.replace(/\\/g, '/')}/pdf.worker.mjs';
       window.renderPage = async (data, n, scale) => {
         const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(data), (c) => c.charCodeAt(0)) }).promise;
         const p = await doc.getPage(n);
         const vp = p.getViewport({ scale });
         const c = document.getElementById('c');
         c.width = vp.width; c.height = vp.height;
         await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
         return { pages: doc.numPages, width: vp.width, height: vp.height };
       };
       window.ready = true;
     </script></body></html>`,
  );
  await page.goto('file:///' + html.replace(/\\/g, '/'));
  await page.waitForFunction('window.ready === true', null, { timeout: 20000 });
  const data = fs.readFileSync(file).toString('base64');
  for (const n of pages) {
    const info = await page.evaluate(([d, num, sc]) => window.renderPage(d, num, sc), [data, n, scale]);
    const el = await page.$('#c');
    await el.screenshot({ path: path.join(out, `p${String(n).padStart(3, '0')}.png`) });
    console.log(`página ${n}/${info.pages} → ${Math.round(info.width)}x${Math.round(info.height)}`);
  }
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
