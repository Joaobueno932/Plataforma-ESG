// Mapas de status/rótulos recuperados do bundle (módulos 20297, 13012 e 41303).
export const REPORT_STATUS_LABEL = {
  Pending: 'Em andamento',
  Submited: 'Enviado',
  WaitingAuditory: 'Aguardando auditoria',
  Auditing: 'Em auditoria',
  Audited: 'Auditoria finalizada',
  InRevision: 'Em Revisão',
};

export const REPORT_STATUS_COLOR = {
  Pending: 'bg-blue-500',
  Submited: 'bg-gray-400',
  WaitingAuditory: 'bg-yellow-400',
  Auditing: 'bg-yellow-500',
  Audited: 'bg-green-600',
  InRevision: 'bg-rose-700',
};

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

export const MATURITY_LEVELS = [
  { text: 'Engajada', value: 'Engajado' },
  { text: 'Iniciante', value: 'Iniciante' },
  { text: 'Sensibilizada', value: 'Sensibilizada' },
  { text: 'Consciente', value: 'Consciente' },
  { text: 'Não conforme', value: 'Nao_conforme' },
  { text: 'Conforme', value: 'Conforme' },
];

export const POINTS = ['0', '2', '4', '6', '8', '10'].map((v) => ({ text: v, value: v }));

export const ROLE_OPTIONS = [
  { text: 'Admin', value: 'ADMIN' },
  { text: 'Gestor', value: 'MANAGER' },
  { text: 'Consultor', value: 'CONSULTOR' },
  { text: 'Auditor', value: 'AUDITOR' },
  { text: 'Funcionário', value: 'EMPLOYEE' },
  { text: 'Supervisor', value: 'SUPERVISOR' },
];

export const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.text]));
