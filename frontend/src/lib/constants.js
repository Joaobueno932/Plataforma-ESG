// Mapas de status/rótulos recuperados do bundle (módulos 20297, 13012 e 41303).
export const REPORT_STATUS_LABEL = {
  Pending: 'Em andamento',
  Submited: 'Enviado',
  WaitingAuditory: 'Aguardando auditoria',
  Auditing: 'Em auditoria',
  Audited: 'Auditoria finalizada',
  InRevision: 'Em Revisão',
};

/** Tom do `Badge` (design system) para a situação do ciclo nas listas. */
export const REPORT_STATUS_TONE = {
  Pending: 'info',
  Submited: 'neutral',
  WaitingAuditory: 'warning',
  Auditing: 'warning',
  Audited: 'success',
  InRevision: 'danger',
};

/**
 * Rótulos herdados do catálogo demonstrativo (chaves antigas como `Nao_conforme`).
 * O catálogo oficial traz o nome do nível no próprio indicador: use `levelLabel(answer)`,
 * que exibe o que veio da fonte e só recorre a este mapa para os dados legados.
 */
export const LEVEL_LABEL = {
  Engajado: 'ENGAJADA',
  Iniciante: 'INICIANTE',
  Sensibilizada: 'SENSIBILIZADA',
  Consciente: 'CONSCIENTE',
  Nao_conforme: 'NÃO CONFORME',
  Conforme: 'CONFORME',
};

export const QUESTION_STATUS_LABEL = {
  Pending: 'Aguardando resposta',
  PendingValidationByManager: 'Para análise do Gestor',
  ApprovedByManager: 'Aprovado pelo Gestor',
  ApprovedByConsultor: 'Aprovado pelo Consultor',
  ApprovedByAuditor: 'Aprovado pelo Auditor',
  RejectedByManager: 'Rejeitado pelo Gestor',
  RejectedByConsultor: 'Rejeitado pelo Consultor',
  RejectedByAuditor: 'Rejeitado pelo Auditor',
  Auditing: 'Em auditoria',
  PendingRevision: 'Aguardando complemento',
  Approved: 'Aprovado',
  Rejected: 'Rejeitado',
  Supervising: 'Em supervisão',
};

export const QUESTION_STATUS_COLOR = {
  Pending: 'bg-neutral-02 hover:bg-neutral-02/80',
  PendingValidationByManager: 'bg-semantic-alert hover:bg-semantic-alert/80',
  ApprovedByManager: 'bg-semantic-link hover:bg-semantic-link/80',
  ApprovedByConsultor: 'bg-[#00aeff] hover:bg-[#00aeff]/80',
  RejectedByManager: '  hover:bg-semantic-error/80',
  RejectedByConsultor: 'bg-semantic-error hover:bg-semantic-error/80',
  Auditing: 'bg-primary-02 hover:bg-primary-02/80',
  PendingRevision: 'bg-rose-500 hover:bg-rose-500/80',
  Approved: 'bg-secondary-02 hover:bg-secondary-02/80',
  Rejected: 'bg-red-800 hover:bg-red-800/80 text-white',
};

export const COMPANY_SIZES = [
  { text: 'Micro', value: 'MICRO_PEQUENA' },
  { text: 'Média', value: 'MEDIA' },
  { text: 'Grande', value: 'GRANDE' },
];

export const CATEGORIES = [
  { text: 'Ambiental', value: 'E' },
  { text: 'Social', value: 'S' },
  { text: 'Governança', value: 'G' },
];

/**
 * Níveis de maturidade **não** são uma lista universal: cada indicador tem os seus, com
 * pontos próprios. Os nomes disponíveis para o formulário vêm de `GET /catalog/levels`
 * (níveis usados pela versão de catálogo em vigor). Esta lista serve apenas como opção
 * inicial do catálogo de demonstração, quando a API não devolve nada.
 */
export const FALLBACK_LEVELS = [
  { text: 'Não conforme', value: 'Não conforme' },
  { text: 'Iniciante', value: 'Iniciante' },
  { text: 'Sensibilizada', value: 'Sensibilizada' },
  { text: 'Consciente', value: 'Consciente' },
  { text: 'Engajada', value: 'Engajada' },
  { text: 'Conforme', value: 'Conforme' },
];

export const ROLE_OPTIONS = [
  { text: 'Administrador', value: 'ADMIN' },
  { text: 'Gestor', value: 'MANAGER' },
  { text: 'Consultor', value: 'CONSULTOR' },
  { text: 'Auditor', value: 'AUDITOR' },
  { text: 'Funcionário', value: 'EMPLOYEE' },
  { text: 'Supervisor', value: 'SUPERVISOR' },
];

export const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.text]));

/** Cor do badge de cada perfil (só identificação visual; não muda permissão). */
export const ROLE_TONE = {
  ADMIN: 'info',
  MANAGER: 'success',
  SUPERVISOR: 'violet',
  AUDITOR: 'orange',
  CONSULTOR: 'teal',
  EMPLOYEE: 'neutral',
};

/** Filtros das listas de Pessoas e Equipe (valores aceitos pela API). */
export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', text: 'Ativas' },
  { value: 'INACTIVE', text: 'Inativas' },
];
export const CREATED_OPTIONS = [
  { value: '7d', text: 'Últimos 7 dias' },
  { value: '30d', text: 'Últimos 30 dias' },
  { value: '12m', text: 'Últimos 12 meses' },
  { value: 'year', text: 'Este ano' },
];
