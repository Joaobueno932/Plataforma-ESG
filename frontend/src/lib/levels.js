/**
 * Cores dos cartões de alternativa. A API já devolve `answer.color` (escolha da Administração
 * ou cor oficial do caderno); este arquivo só cobre o que falta para desenhar o cartão.
 *
 * Referência: cor da faixa de cada nível nos 9 cadernos em PDF (tools/level_colors.py) —
 * Não conforme #D2232A, Iniciante #6E7D8F, Sensibilizada #99D4E5, Consciente #FFBC24,
 * Engajada #40AD49 e Conforme #40AD49 (o atendimento dos indicadores binários usa o mesmo verde).
 * Nível sem cor documentada usa o neutro; nunca roxo para Engajada.
 */
export const OFFICIAL_LEVEL_COLORS = [
  { name: 'Não conforme', color: '#D2232A' },
  { name: 'Iniciante', color: '#6E7D8F' },
  { name: 'Sensibilizada', color: '#99D4E5' },
  { name: 'Consciente', color: '#FFBC24' },
  { name: 'Engajada', color: '#40AD49' },
  { name: 'Conforme', color: '#40AD49' },
];

/** Paleta do seletor: uma amostra por cor, com os níveis que a usam ("Engajada / Conforme"). */
export const OFFICIAL_PALETTE = OFFICIAL_LEVEL_COLORS.reduce((list, { name, color }) => {
  const found = list.find((c) => c.color === color);
  if (found) found.name = `${found.name} / ${name}`;
  else list.push({ name, color });
  return list;
}, []);

export const NEUTRAL_LEVEL_COLOR = '#94A3B8';

const MATCHERS = [
  [/^n[aã]o[\s_-]*conforme$/i, '#D2232A'],
  [/^iniciante$/i, '#6E7D8F'],
  [/^sensibilizad[ao]$/i, '#99D4E5'],
  [/^consciente$/i, '#FFBC24'],
  [/^engajad[ao]$/i, '#40AD49'],
  [/^conforme$/i, '#40AD49'],
];

export function levelColor(answer) {
  if (answer?.color) return answer.color;
  const name = String(answer?.title ?? '').replace(/_/g, ' ').trim();
  const found = MATCHERS.find(([re]) => re.test(name));
  return found ? found[1] : NEUTRAL_LEVEL_COLOR;
}

const luminance = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const DARK_TEXT = '#1F2937';

/**
 * Texto sobre a faixa colorida: entre branco e grafite, o de **maior contraste** (WCAG). A cor
 * da faixa é a do caderno; só o texto se ajusta. Ex.: no verde #40AD49 o branco do PDF dá
 * 2,9:1 (abaixo do mínimo); o grafite dá 5,1:1.
 */
export function readableOn(hex) {
  const l = luminance(hex);
  if (l === null) return '#FFFFFF';
  const onWhite = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance(DARK_TEXT) + 0.05);
  return onDark > onWhite ? DARK_TEXT : '#FFFFFF';
}

/** Nome do nível como veio da fonte; legado `Nao_conforme` vira "Não conforme". */
export function levelName(answer) {
  const title = String(answer?.title ?? '');
  if (/^nao_conforme$/i.test(title)) return 'Não conforme';
  return title.replace(/_/g, ' ');
}

export const sortByPosition = (answers = []) =>
  [...answers].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.title).localeCompare(String(b.title)));

/**
 * Eixos ESG e a cor de identidade de cada um (pontos, barras de andamento, borda lateral dos
 * indicadores). Fonte única da paleta de eixos: verde, azul e lilás aprovados. Não confundir com
 * as cores dos **níveis de maturidade** (OFFICIAL_LEVEL_COLORS), que vêm dos cadernos.
 */
export const AXES = {
  E: { label: 'Ambiental', short: 'E', color: '#22C55E' },
  S: { label: 'Social', short: 'S', color: '#1683E8' },
  G: { label: 'Governança', short: 'G', color: '#A855F7' },
};

/**
 * Superfície dos indicadores por eixo (fundo suave, borda externa e lateral = `AXES[eixo].color`).
 * Só classifica o eixo: não representa pontuação, maturidade nem situação. Classes literais para
 * o Tailwind gerá-las.
 */
export const AXIS_THEME = {
  E: { card: 'border-[#DCEFE3] border-l-[#22C55E] bg-[#F0FAF4]', dot: 'bg-[#22C55E]' },
  S: { card: 'border-[#D8EAFE] border-l-[#1683E8] bg-[#EDF6FF]', dot: 'bg-[#1683E8]' },
  G: { card: 'border-[#E9DEFA] border-l-[#A855F7] bg-[#F6F1FF]', dot: 'bg-[#A855F7]' },
};

/**
 * Maturidade mínima exigida pelo Programa ESG FIEMS (cadernos Geral e Setoriais): a alternativa
 * apontada pelo catálogo como piso do indicador, ou `null` quando o caderno não exige mínimo.
 * Não é obrigação de responder — todo indicador aplicável ao ciclo é respondido.
 */
export function minimumLevel(question) {
  const answers = question?.answers || [];
  return answers.find((a) => question?.mandatoryAnswerId && a.id === question.mandatoryAnswerId) || answers.find((a) => a.mandatory) || null;
}

export const MINIMUM_LABEL = 'Maturidade mínima exigida';
