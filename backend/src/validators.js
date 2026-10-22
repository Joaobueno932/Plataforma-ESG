/**
 * Validações de cadastro conforme a especificação § 4 e § 5.
 * O CNPJ é tratado como **texto** (armazenado sem máscara, exibido formatado) e os dígitos
 * verificadores são conferidos. A validação estrutural não substitui consulta cadastral oficial.
 */
const onlyDigits = (value) => String(value ?? '').replace(/\D+/g, '');

/** Dígitos verificadores do CNPJ (pesos 5..2/9..2), padrão da Receita Federal. */
function isValidCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const digitAt = (length) => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cnpj[i]) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digitAt(12) === Number(cnpj[12]) && digitAt(13) === Number(cnpj[13]);
}

const formatCnpj = (value) => {
  const d = onlyDigits(value);
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : value;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (value) => EMAIL_RE.test(String(value || '').trim().toLowerCase());
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

/** Porte da empresa. As faixas de rating usam dois blocos: micro/pequena e média/grande. */
const COMPANY_SIZES = ['MICRO_PEQUENA', 'MEDIA', 'GRANDE'];
const sizeBracket = (size) => (size === 'MICRO_PEQUENA' ? 'MICRO_PEQUENA' : 'MEDIA_GRANDE');

module.exports = { onlyDigits, isValidCnpj, formatCnpj, isValidEmail, normalizeEmail, COMPANY_SIZES, sizeBracket };
