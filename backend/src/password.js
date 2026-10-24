/**
 * Hash e verificação de senha (bcrypt, custo 10).
 *
 * Usa a implementação nativa (`@node-rs/bcrypt`), que roda fora da thread principal: na carga,
 * a versão em JavaScript puro (`bcryptjs`) ocupava a thread do processo e uma rajada de 200
 * logins levou o login a p95 de 5,7 s e atrasou as demais requisições. O formato do hash é o
 * mesmo ($2a/$2b): as senhas já gravadas continuam válidas, sem migração. Se o binário nativo
 * não existir na plataforma, cai para o `bcryptjs`.
 */
const COST = 10;

let impl;
try {
  const native = require('@node-rs/bcrypt');
  impl = {
    name: 'nativo',
    hash: (password) => native.hash(String(password), { cost: COST }),
    hashSync: (password) => native.hashSync(String(password), { cost: COST }),
    compare: (password, hashed) => native.compare(String(password), String(hashed)),
  };
} catch {
  const js = require('bcryptjs');
  impl = {
    name: 'bcryptjs',
    hash: (password) => js.hash(String(password), COST),
    hashSync: (password) => js.hashSync(String(password), COST),
    compare: (password, hashed) => js.compare(String(password), String(hashed)),
  };
}

/** Verifica sem lançar: hash ausente ou malformado é simplesmente "não confere". */
async function compare(password, hashed) {
  if (!hashed) return false;
  try {
    return await impl.compare(password, hashed);
  } catch {
    return false;
  }
}

module.exports = { hash: impl.hash, hashSync: impl.hashSync, compare, implementation: impl.name };
