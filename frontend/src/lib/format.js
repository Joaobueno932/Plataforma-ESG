// Utilitários de formatação recuperados do bundle original (módulo 38324).
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "Jul 21, 2024" — usado em listas (Período de Referência, Data de Cadastro). */
export const formatMonthDay = (value) => {
  const d = new Date(value);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/** "07/21/2024" — formato (mês/dia/ano) exibido pelo original nas datas de lembretes. */
export const formatDate = (value) => {
  const d = new Date(value);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${month}/${day}/${d.getFullYear()}`;
};

export const firstName = (list) => (list && list.length > 0 ? list[0].name : 'ainda não registrado');

/** Ordem herdada, usada só como desempate para dados do catálogo demonstrativo. */
export const LEVEL_ORDER = ['Nao_conforme', 'Não conforme', 'Iniciante', 'Sensibilizada', 'Consciente', 'Engajado', 'Engajada', 'Conforme'];
export const levelIndex = (level) => {
  const index = LEVEL_ORDER.indexOf(level);
  return index < 0 ? LEVEL_ORDER.length : index;
};

/** A ordem das alternativas é a da fonte (`position`); o resto é desempate. */
export const sortAnswers = (answers = []) =>
  [...answers].sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position;
    return levelIndex(a.title) - levelIndex(b.title);
  });

/** Rótulo do nível: o nome que veio da fonte; o mapa antigo cobre os dados legados. */
export const levelLabel = (answer, legacyMap = {}) => {
  if (!answer) return '';
  return legacyMap[answer.title] || String(answer.title || '').toUpperCase();
};

/**
 * Chave de apresentação do cartão: vem do dado (`presentation`/`slug`). O CSS recuperado do
 * sistema antigo tem cinco cores de cartão e **não** tem cor para "Engajada" — a paleta
 * definitiva depende da referência visual aprovada (pendência X2 de docs/esg/regras.md).
 */
export const levelPresentation = (answer) => {
  if (!answer) return 'default';
  if (answer.presentation) return answer.presentation;
  if (answer.slug) return answer.slug;
  return String(answer.title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const CONTACT_PHONE = '6733899080';
export const CONTACT_EMAIL = 'contato.esg@sfiems.com.br';

export const whatsappLink = (text = 'Olá, gostaria de falar com a Central de Relacionamento do Sistema FIEMS') =>
  `https://api.whatsapp.com/send?phone=55${CONTACT_PHONE}&text=${text}.`;

export const formatPhone = (value) => {
  if (value.length < 10 || value.length > 11) return value;
  const size = value.length === 10 ? 4 : 5;
  return `(${value.substring(0, 2)}) ${value.substring(2, 2 + size)}-${value.substring(2 + size)}`;
};

export const apiAsset = (path) =>
  !path ? '' : path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/${path}`;
