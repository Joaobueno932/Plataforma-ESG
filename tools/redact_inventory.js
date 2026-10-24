// Inventário de dados pessoais/corporativos reais nos arquivos versionados de `recon/`.
// Mostra os valores **mascarados**: serve para decidir o que anonimizar, sem expor o dado.
//   node tools/redact_inventory.js
const { execSync } = require('child_process');
const fs = require('fs');

const files = execSync('git ls-files recon', { encoding: 'utf8' }).split('\n').filter(Boolean);
const mask = (s) => s.replace(/\d(?=\d{2}(\D|$))/g, '*');
const maskEmail = (e) => e.replace(/^(.).*(@.*)$/, (_m, a, d) => `${a}***${d}`);
const cnpjs = new Map();
const emails = new Map();
for (const f of files) {
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  const where = f.split('/').slice(0, 3).join('/');
  for (const m of text.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g)) {
    if (!cnpjs.has(m[0])) cnpjs.set(m[0], new Set());
    cnpjs.get(m[0]).add(where);
  }
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@(sfiec\.org\.br|sfiems\.com\.br)/gi)) {
    const k = m[0].toLowerCase();
    if (!emails.has(k)) emails.set(k, new Set());
    emails.get(k).add(where);
  }
}
for (const [k, v] of cnpjs) console.log('CNPJ', mask(k), '->', [...v].join(', '));
for (const [k, v] of emails) console.log('e-mail', maskEmail(k), '->', [...v].slice(0, 2).join(', '));
