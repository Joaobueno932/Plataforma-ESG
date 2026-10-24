// Anonimiza as respostas de API salvas em recon/api (engenharia reversa do sistema antigo).
// Mantém a estrutura — que é o que documenta a API antiga — e troca dados de pessoas e
// empresas reais por substitutos determinísticos (a mesma pessoa vira sempre o mesmo apelido).
//   node tools/anonymize_recon.js          → aplica
//   node tools/anonymize_recon.js --check  → só verifica se resta dado real (sai com 1 se restar)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'recon', 'api');
const CHECK = process.argv.includes('--check');
const KEEP_EMAIL = /@(esgdemo\.com\.br|exemplo\.invalid)$|^contato\.esg@sfiems\.com\.br$/i;
const REAL_DOMAIN = /@(sfiec\.org\.br|sfiems\.com\.br|[a-z0-9-]+\.(com|org|net)\.br)$/i;
const FAKE_CNPJS = ['11222333000181', '44555666000181', '12345678000195', '98765432000110'];

const people = new Map();
const companies = new Map();
const pseudonym = (map, key, make) => {
  if (!map.has(key)) map.set(key, make(map.size + 1));
  return map.get(key);
};

function anonymizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(anonymizeObject);
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  const isPerson = typeof obj.email === 'string' && !KEEP_EMAIL.test(obj.email);
  const isCompany = typeof obj.cnpj === 'string' && obj.cnpj.replace(/\D/g, '').length === 14;
  for (const [key, value] of Object.entries(obj)) {
    if (isPerson && key === 'email') out[key] = pseudonym(people, value.toLowerCase(), (n) => ({ email: `pessoa${n}@exemplo.invalid`, name: `Pessoa ${n}` })).email;
    else if (isPerson && key === 'name') out[key] = pseudonym(people, obj.email.toLowerCase(), (n) => ({ email: `pessoa${n}@exemplo.invalid`, name: `Pessoa ${n}` })).name;
    else if (key === 'cpf' && value) out[key] = '00000000000';
    else if (/phone|telefone|celular/i.test(key) && value) out[key] = '00000000000';
    else if (isCompany && key === 'cnpj') out[key] = pseudonym(companies, value, (n) => ({ cnpj: FAKE_CNPJS[(n - 1) % FAKE_CNPJS.length], name: `Empresa ${n}` })).cnpj;
    else if (isCompany && ['legalName', 'bussinessName', 'name'].includes(key))
      out[key] = `${pseudonym(companies, obj.cnpj, (n) => ({ cnpj: FAKE_CNPJS[(n - 1) % FAKE_CNPJS.length], name: `Empresa ${n}` })).name}${key === 'legalName' ? ' Ltda' : ''}`;
    else out[key] = anonymizeObject(value);
  }
  return out;
}

/** Resto de dado real em texto livre (e-mails corporativos e CNPJs fora da lista fictícia). */
function leftovers(text) {
  const emails = [...text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0]).filter((e) => REAL_DOMAIN.test(e) && !KEEP_EMAIL.test(e));
  const cnpjs = [...text.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g)].map((m) => m[0].replace(/\D/g, '')).filter((c) => !FAKE_CNPJS.includes(c) && !/^(\d)\1+$/.test(c) && c !== '99999999999999');
  return { emails, cnpjs };
}

let changed = 0;
let remaining = 0;
for (const name of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const file = path.join(DIR, name);
  const original = fs.readFileSync(file, 'utf8');
  let text = original;
  if (!CHECK) {
    try {
      text = `${JSON.stringify(anonymizeObject(JSON.parse(original)), null, 2)}\n`;
    } catch {
      // não é JSON puro: só substitui e-mails reais
    }
    text = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (e) =>
      REAL_DOMAIN.test(e) && !KEEP_EMAIL.test(e) ? pseudonym(people, e.toLowerCase(), (n) => ({ email: `pessoa${n}@exemplo.invalid`, name: `Pessoa ${n}` })).email : e,
    );
    if (text !== original) {
      fs.writeFileSync(file, text);
      changed += 1;
    }
  }
  const left = leftovers(text);
  if (left.emails.length || left.cnpjs.length) {
    remaining += left.emails.length + left.cnpjs.length;
    console.log(`resta em ${name}: ${left.emails.length} e-mail(s), ${left.cnpjs.length} CNPJ(s)`);
  }
}
console.log(CHECK ? `verificação: ${remaining} ocorrência(s) de dado real` : `arquivos anonimizados: ${changed} · pessoas: ${people.size} · empresas: ${companies.size} · restante: ${remaining}`);
if (remaining) process.exitCode = 1;
