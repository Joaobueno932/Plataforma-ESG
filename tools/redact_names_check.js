// Confere se nomes reais das respostas antigas (versão do HEAD) ainda aparecem nos arquivos
// versionados de `recon/` (evidências da engenharia reversa). Não imprime os nomes.
//   node tools/redact_names_check.js           → verifica
//   node tools/redact_names_check.js --apply   → substitui por pseudônimos ("Pessoa N", "Empresa Anonimizada N")
//   node tools/redact_names_check.js --revert  → desfaz a substituição FORA de recon/ (correção)
//
// A substituição é feita só em `recon/` e só por palavra inteira: um nome curto (ex.: uma razão
// social de uma palavra) não pode alterar trechos de outras palavras nem arquivos do projeto.
const { execSync } = require('child_process');
const fs = require('fs');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');
const SHAPE = process.argv.includes('--shape');
const sources = execSync('git ls-tree -r --name-only HEAD recon/api', { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.json'));
const names = new Set();
const companyNames = new Set();
const walk = (v) => {
  if (Array.isArray(v)) return v.forEach(walk);
  if (!v || typeof v !== 'object') return;
  if (typeof v.email === 'string' && /@(sfiec\.org\.br|sfiems\.com\.br)$/i.test(v.email) && typeof v.name === 'string' && v.name.trim().length > 4) names.add(v.name.trim());
  if (typeof v.cnpj === 'string' && !/^(11222333000181|44555666000181)$/.test(v.cnpj.replace(/\D/g, '')))
    for (const k of ['legalName', 'bussinessName']) if (typeof v[k] === 'string' && v[k].trim().length > 3) companyNames.add(v[k].trim());
  Object.values(v).forEach(walk);
};
for (const f of sources) {
  try {
    walk(JSON.parse(execSync(`git show HEAD:"${f}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })));
  } catch {
    /* arquivo não JSON */
  }
}

// Mesma numeração usada na primeira aplicação (ordem alfabética), para a reversão ser exata.
const pairs = [
  ...[...names].sort().map((n, i) => [n, `Pessoa ${i + 1}`]),
  ...[...companyNames].sort().map((n, i) => [n, `Empresa Anonimizada ${i + 1}`]),
].sort((a, b) => b[0].length - a[0].length);

if (SHAPE) {
  for (const [n, p] of pairs) console.log(`${p}: ${n.length} caracteres, ${n.split(/\s+/).length} palavra(s)`);
  process.exit(0);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (s) => new RegExp(`(?<![\\p{L}\\p{N}_])${escape(s)}(?![\\p{L}\\p{N}_])`, 'gu');
const isText = (f) => !/\.(png|jpe?g|gif|webp|ico|pdf|otf|woff2?|mp4|xlsx|docx)$/i.test(f);
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean).filter(isText);
const read = (f) => {
  try {
    return fs.statSync(f).size > 20 * 1024 * 1024 ? null : fs.readFileSync(f, 'utf8');
  } catch {
    return null;
  }
};

if (REVERT) {
  // Desfaz o estrago fora de recon/: pseudônimo → original (o pseudônimo não existia antes).
  let fixed = 0;
  for (const f of tracked.filter((x) => !x.startsWith('recon/'))) {
    const text = read(f);
    if (text === null) continue;
    let next = text;
    for (const [original, alias] of [...pairs].sort((a, b) => b[1].length - a[1].length)) next = next.split(alias).join(original);
    if (next !== text) {
      fs.writeFileSync(f, next);
      fixed += 1;
      console.log(`restaurado: ${f}`);
    }
  }
  console.log(`arquivos restaurados: ${fixed}`);
  process.exit(0);
}

let total = 0;
let rewritten = 0;
for (const f of tracked.filter((x) => x.startsWith('recon/'))) {
  const text = read(f);
  if (text === null) continue;
  const hits = pairs.filter(([n]) => wordRe(n).test(text)).length;
  if (!hits) continue;
  if (APPLY) {
    let next = text;
    for (const [from, to] of pairs) next = next.replace(wordRe(from), to);
    fs.writeFileSync(f, next);
    rewritten += 1;
  } else {
    total += hits;
    console.log(`${f}: ${hits} nome(s) real(is)`);
  }
}
console.log(
  APPLY
    ? `arquivos de recon/ reescritos: ${rewritten} · pessoas: ${names.size} · empresas: ${companyNames.size}`
    : `nomes reais conhecidos: ${names.size} pessoas + ${companyNames.size} empresas · ocorrências em recon/: ${total}`,
);
if (!APPLY && total) process.exitCode = 1;
