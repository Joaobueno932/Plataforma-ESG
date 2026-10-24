/**
 * Políticas de faixa (rating) — versionadas.
 *
 * A especificação § 13 RN04 traz a tabela de faixas, mas o **limite de 30% para micro e
 * pequenas aparece condicionado** no documento. Por isso as duas políticas ficam modeladas:
 * a do documento (`rn04-2026-10`) e a conservadora (`c-40-todos`). O motor calcula pela
 * política configurada e, quando as duas divergem no caso concreto, marca o eixo como
 * **dependente de ratificação** em vez de publicar uma política pendente como aprovada.
 *
 * Os limites são comparados em aritmética inteira (`pontos × 100 ≥ limite × máximo`), para que
 * 79,95% continue abaixo de 80% sem depender de arredondamento.
 */

/** Blocos de porte usados pelas faixas (a planilha separa micro/pequena de média/grande). */
const SIZE_BRACKETS = { MICRO_PEQUENA: 'MICRO_PEQUENA', MEDIA: 'MEDIA_GRANDE', GRANDE: 'MEDIA_GRANDE' };
const bracketOf = (size) => SIZE_BRACKETS[size] || null;

const POLICIES = {
  'rn04-2026-10': {
    id: 'rn04-2026-10',
    label: 'RN04 — tabela da especificação v1.0 (19/10/2026)',
    status: 'pending-ratification',
    statusDetail:
      'A tabela está no documento, mas o aceite do limite de 30% para micro e pequenas aparece condicionado; a FIEMS precisa ratificar.',
    source: 'Plataforma esg fiems.docx § 13 RN04; planilha oficial, aba "Pontuações"',
    bands: [
      { band: 'A', min: { MICRO_PEQUENA: 80, MEDIA_GRANDE: 80 } },
      { band: 'B', min: { MICRO_PEQUENA: 60, MEDIA_GRANDE: 60 } },
      { band: 'C', min: { MICRO_PEQUENA: 30, MEDIA_GRANDE: 40 } },
    ],
    belowBand: 'Abaixo de C',
  },
  'c-40-todos': {
    id: 'c-40-todos',
    label: 'Conservadora — C a partir de 40% para todos os portes',
    status: 'alternative',
    statusDetail:
      'Alternativa modelada para o caso de a FIEMS não ratificar o limite de 30%: aplica 40% a micro e pequenas também.',
    source: 'derivada de RN04 com o limite de C unificado em 40%',
    bands: [
      { band: 'A', min: { MICRO_PEQUENA: 80, MEDIA_GRANDE: 80 } },
      { band: 'B', min: { MICRO_PEQUENA: 60, MEDIA_GRANDE: 60 } },
      { band: 'C', min: { MICRO_PEQUENA: 40, MEDIA_GRANDE: 40 } },
    ],
    belowBand: 'Abaixo de C',
  },
};

/** Política aplicada por padrão. Trocável por configuração, sem alterar histórico já gravado. */
const DEFAULT_POLICY_ID = process.env.RATING_POLICY || 'rn04-2026-10';

/** Versão da regra de cálculo gravada na conclusão do ciclo. */
const RULE_VERSION = 'calculo-2026-10-1';

const policyById = (id) => POLICIES[id] || null;
const defaultPolicy = () => POLICIES[DEFAULT_POLICY_ID] || POLICIES['rn04-2026-10'];

/** Faixa mais alta satisfeita, em aritmética inteira (sem arredondamento). */
function bandFor(points, max, policy, bracket) {
  if (!(max > 0)) return null;
  for (const level of policy.bands) {
    const threshold = level.min[bracket];
    if (threshold === undefined) return null;
    if (points * 100 >= threshold * max) return level.band;
  }
  return policy.belowBand;
}

/** Limiares aplicáveis ao porte, para exibição. */
const thresholdsFor = (policy, bracket) =>
  policy.bands.map((level) => ({ band: level.band, min: level.min[bracket] }));

const BAND_ORDER = ['A', 'B', 'C'];
/** Faixa mínima que ainda classifica (abaixo dela não há concessão). */
const MINIMUM_BAND = 'C';
const isBandAtLeastMinimum = (band) => BAND_ORDER.includes(band);

module.exports = {
  POLICIES,
  DEFAULT_POLICY_ID,
  RULE_VERSION,
  SIZE_BRACKETS,
  BAND_ORDER,
  MINIMUM_BAND,
  bracketOf,
  policyById,
  defaultPolicy,
  bandFor,
  thresholdsFor,
  isBandAtLeastMinimum,
};
