/**
 * Cores dos cartões de alternativa. A API já devolve `answer.color` (escolha da Administração
 * ou cor oficial do caderno); este arquivo só cobre o que falta para desenhar o cartão.
 *
 * Referência: cadernos oficiais (Caderno Geral, GE 01/GE 02) — Não conforme #D2232A,
 * Iniciante #6E7D8F, Sensibilizada #99D4E5, Consciente #FFBC24, Engajada #40AD49.
 * Nível sem cor documentada usa o neutro; nunca roxo para Engajada.
 */
export const OFFICIAL_LEVEL_COLORS = [
  { name: 'Não conforme', color: '#D2232A' },
  { name: 'Iniciante', color: '#6E7D8F' },
  { name: 'Sensibilizada', color: '#99D4E5' },
  { name: 'Consciente', color: '#FFBC24' },
  { name: 'Engajada', color: '#40AD49' },
];

export const NEUTRAL_LEVEL_COLOR = '#94A3B8';

const MATCHERS = [
  [/^n[aã]o[\s_-]*conforme$/i, '#D2232A'],
  [/^iniciante$/i, '#6E7D8F'],
  [/^sensibilizad[ao]$/i, '#99D4E5'],
  [/^consciente$/i, '#FFBC24'],
  [/^engajad[ao]$/i, '#40AD49'],
];

export function levelColor(answer) {
  if (answer?.color) return answer.color;
  const name = String(answer?.title ?? '').replace(/_/g, ' ').trim();
  const found = MATCHERS.find(([re]) => re.test(name));
  return found ? found[1] : NEUTRAL_LEVEL_COLOR;
}

/** Texto legível sobre a faixa colorida (contraste por luminância relativa). */
export function readableOn(hex) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return '#FFFFFF';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#1F2937' : '#FFFFFF';
}

/** Nome do nível como veio da fonte; legado `Nao_conforme` vira "Não conforme". */
export function levelName(answer) {
  const title = String(answer?.title ?? '');
  if (/^nao_conforme$/i.test(title)) return 'Não conforme';
  return title.replace(/_/g, ' ');
}

export const sortByPosition = (answers = []) =>
  [...answers].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.title).localeCompare(String(b.title)));

export const AXES = {
  E: { label: 'Ambiental', short: 'E', color: '#40AD49' },
  S: { label: 'Social', short: 'S', color: '#0D5DA8' },
  G: { label: 'Governança', short: 'G', color: '#0D3969' },
};
