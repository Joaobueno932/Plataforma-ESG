/**
 * Apresentação dos cartões de alternativa (cor da faixa e da borda).
 *
 * Origem das cores padrão: cadernos oficiais (ex.: Caderno Geral, GE 01 e GE 02), conferidos
 * página a página — Não conforme #D2232A, Iniciante #6E7D8F, Sensibilizada #99D4E5,
 * Consciente #FFBC24, Engajada #40AD49. Nível sem cor documentada fica **sem** cor padrão
 * (a interface usa o neutro); nada de cor inventada, e nunca roxo para Engajada.
 *
 * A Administração pode definir a cor de cada alternativa no editor do catálogo; essa escolha
 * fica gravada em `answers.presentation` como JSON `{"color":"#RRGGBB"}` e prevalece.
 */
const OFFICIAL = [
  { match: /^n[aã]o[\s_-]*conforme$/i, color: '#D2232A' },
  { match: /^iniciante$/i, color: '#6E7D8F' },
  { match: /^sensibilizad[ao]$/i, color: '#99D4E5' },
  { match: /^consciente$/i, color: '#FFBC24' },
  { match: /^engajad[ao]$/i, color: '#40AD49' },
];

const HEX = /^#[0-9a-f]{6}$/i;

const normalizeName = (name) =>
  String(name ?? '')
    .normalize('NFC')
    .replace(/_/g, ' ')
    .trim();

/** Cor oficial do nível pelo nome, ou `null` quando a fonte não documenta cor para ele. */
function officialColor(name) {
  const found = OFFICIAL.find((entry) => entry.match.test(normalizeName(name)));
  return found ? found.color : null;
}

/** Lê `presentation` (JSON gravado pelo editor ou valor legado) sem lançar erro. */
function parse(presentation) {
  if (!presentation) return {};
  try {
    const value = JSON.parse(presentation);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/** Cor efetiva do cartão: escolha da Administração → cor oficial do nível → nenhuma. */
function colorOf(answer) {
  const chosen = parse(answer.presentation).color;
  if (chosen && HEX.test(chosen)) return { color: chosen.toUpperCase(), source: 'administracao' };
  const official = officialColor(answer.title);
  return official ? { color: official, source: 'caderno' } : { color: null, source: null };
}

function serialize({ color } = {}) {
  if (color === null || color === undefined || color === '') return null;
  if (!HEX.test(color)) throw new Error('cor inválida; use o formato #RRGGBB');
  return JSON.stringify({ color: color.toUpperCase() });
}

module.exports = { OFFICIAL, HEX, officialColor, colorOf, parse, serialize };
