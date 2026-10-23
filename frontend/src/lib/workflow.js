/**
 * Rótulos e capacidades do fluxo **para a interface**. A regra vale no servidor (API); aqui só
 * se decide o que oferecer, para não mostrar uma ação que a API recusaria pelo estado conhecido.
 */
export const CYCLE_STATE = {
  Pending: { label: 'Em preenchimento', tone: 'info', help: 'A empresa responde, anexa evidências e revisa as respostas.' },
  Auditing: { label: 'Em auditoria', tone: 'warning', help: 'Respostas e evidências estão congeladas. Só o auditor designado trabalha agora.' },
  AwaitingSupervisor: { label: 'Aguardando supervisor', tone: 'warning', help: 'O auditor concluiu. Falta a aprovação do supervisor.' },
  Audited: { label: 'Auditoria aprovada', tone: 'success', help: 'Resultado aprovado pelo supervisor e liberado.' },
};

export const ITEM_STATE = {
  empty: { label: 'Não respondido', tone: 'neutral' },
  draft: { label: 'Rascunho', tone: 'info' },
  Pending: { label: 'Aguardando resposta', tone: 'neutral' },
  PendingValidationByManager: { label: 'Aguardando revisão', tone: 'warning' },
  ApprovedByManager: { label: 'Aprovado pelo gestor', tone: 'success' },
  ApprovedByConsultor: { label: 'Aprovado pela consultoria', tone: 'success' },
  RejectedByManager: { label: 'Devolvido pelo gestor', tone: 'danger' },
  RejectedByConsultor: { label: 'Devolvido pela consultoria', tone: 'danger' },
  Auditing: { label: 'Em auditoria', tone: 'warning' },
  PendingRevision: { label: 'Complemento solicitado', tone: 'danger' },
  Approved: { label: 'Auditado', tone: 'success' },
  Rejected: { label: 'Não atendido (auditoria)', tone: 'danger' },
};

/** Situação exibida do indicador: rascunho e vazio têm precedência sobre o rótulo herdado. */
export function itemState(item) {
  if (!item) return ITEM_STATE.empty;
  if (item.status === 'Pending' && item.answerState === 'empty') return ITEM_STATE.empty;
  if (item.status === 'Pending' && item.answerState === 'draft') return ITEM_STATE.draft;
  return ITEM_STATE[item.status] || { label: item.status, tone: 'neutral' };
}

export const PENDING_KIND = {
  'orientacao-consultoria': 'Orientação da consultoria',
  'falta-resposta': 'Falta de resposta',
  'evidencia-solicitada': 'Evidência solicitada',
  'documento-vencido': 'Documento vencido',
  'constatacao-auditoria': 'Constatação de auditoria',
};

export const PENDING_STATUS = {
  aberta: { label: 'Aberta', tone: 'warning' },
  'em-andamento': { label: 'Em andamento', tone: 'info' },
  resolvida: { label: 'Resolvida', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

/** Quais pendências cada função abre (espelho da regra da API). */
export const PENDING_KINDS_BY_ROLE = {
  CONSULTOR: ['orientacao-consultoria', 'falta-resposta', 'evidencia-solicitada', 'documento-vencido'],
  ADMIN: ['orientacao-consultoria', 'falta-resposta', 'evidencia-solicitada', 'documento-vencido'],
  MANAGER: ['falta-resposta', 'evidencia-solicitada', 'documento-vencido'],
  AUDITOR: ['evidencia-solicitada', 'documento-vencido', 'constatacao-auditoria'],
};

export const ROLE_NAME = {
  ADMIN: 'Administração FIEMS',
  MANAGER: 'Gestor',
  EMPLOYEE: 'Colaborador',
  CONSULTOR: 'Consultor',
  AUDITOR: 'Auditor',
  SUPERVISOR: 'Supervisor',
};

/**
 * Função exercida pela pessoa nesta empresa/ciclo. Mesma precedência da API: o vínculo com a
 * empresa define a função; ADMIN tem alcance global; ADMIN + CONSULTOR age como consultor
 * onde tem vínculo.
 */
export function roleIn(user, companyId, report) {
  if (!user) return null;
  const roles = user.roles || [user.role];
  const link = (user.links || []).find((l) => l.companyId === companyId);
  if (link) return link.role;
  if (roles.includes('ADMIN')) return 'ADMIN';
  const assigned = report && [...(report.auditor || []), ...(report.supervisor || [])].find((p) => p.id === user.id);
  if (assigned) return (report.auditor || []).some((p) => p.id === user.id) ? 'AUDITOR' : 'SUPERVISOR';
  return roles[0] || null;
}

/** O que a função pode fazer no estado atual do ciclo (apenas para a interface). */
export function capabilities(role, cycleStatus, user) {
  const filling = cycleStatus === 'Pending';
  const auditing = cycleStatus === 'Auditing';
  const isAdmin = (user?.roles || []).includes('ADMIN');
  return {
    answer: filling && ['MANAGER', 'EMPLOYEE', 'CONSULTOR', 'ADMIN'].includes(role),
    review: filling && ['MANAGER', 'CONSULTOR'].includes(role),
    assign: filling && ['MANAGER', 'ADMIN'].includes(role),
    requestAudit: filling && role === 'MANAGER',
    requestReturn: !filling && cycleStatus !== 'Audited' && role === 'MANAGER',
    release: filling && isAdmin,
    designate: isAdmin,
    audit: auditing && role === 'AUDITOR',
    conclude: auditing && role === 'AUDITOR',
    approve: cycleStatus === 'AwaitingSupervisor' && role === 'SUPERVISOR',
    returnCycle: ['Auditing', 'AwaitingSupervisor'].includes(cycleStatus) && (role === 'CONSULTOR' || role === 'ADMIN'),
    seeAudit: !['MANAGER', 'EMPLOYEE', 'CONSULTOR'].includes(role) || cycleStatus === 'Audited',
    createPending: (PENDING_KINDS_BY_ROLE[role] || []).length > 0,
  };
}
