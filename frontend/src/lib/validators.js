/**
 * Validações compartilhadas pelos formulários (a API valida de novo; aqui é para avisar cedo).
 */

/** Dígito verificador do CNPJ na posição `size` (12 ou 13). */
function checkDigit(size, digits) {
  const slice = digits.slice(0, size);
  let weight = size - 7;
  let sum = 0;
  for (let i = size; i >= 1; i--) {
    sum += slice[size - i] * weight--;
    if (weight < 2) weight = 9;
  }
  const r = 11 - (sum % 11);
  return r > 9 ? 0 : r;
}

/** CNPJ com ou sem máscara: 14 dígitos, não repetidos, com os dígitos verificadores corretos. */
export function isValidCnpj(value = '') {
  if (!value) return false;
  if (!/^\d{14}$/.test(value) && !/^\d{2}.\d{3}.\d{3}\/\d{4}-\d{2}$/.test(value)) return false;
  const digits = (value.match(/\d/g) || []).map(Number);
  if (digits.length !== 14 || new Set(digits).size === 1) return false;
  return checkDigit(12, digits) === digits[12] && checkDigit(13, digits) === digits[13];
}
