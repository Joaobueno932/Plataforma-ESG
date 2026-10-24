import { api } from './api';

/** `view: 'resumo'` traz só o que a lista exibe (o item completo vem de getQuestionReport). */
export const getQuestionReports = (reportId, view) => api.get(`/reports/company/questions/${reportId || ''}${view ? `?view=${view}` : ''}`);
export const getReport = (reportId) => api.get(`/reports/${reportId}`);
export const getQuestionReport = (id) => api.get(`/reports/questionReports/${id}`);
export const answerQuestion = (body, id) => api.patch(`/reports/answerQuestion/${id}`, body);
export const editQuestionReport = (body, id) => api.patch(`/reports/editQuestionReport/${id}`, body);
export const validateAnswer = (id, body) => api.post(`/reports/validateanswer/${id}`, body);
export const addAnswerer = (id, body) => api.patch(`/reports/addanswerer/${id}`, body);
/** Solicitação de auditoria pelo gestor (não libera o processo). */
export const requestAudit = (companyId) => api.post(`/reports/requestAudit/${companyId}`);
/** Pedido de retorno pela empresa (registrado; não desbloqueia). */
export const requestReturn = (companyId, reason) => api.post(`/reports/requestReturn/${companyId}`, { reason });
/** Retorno autorizado do processo (consultor ou Administração). */
export const returnCycle = (companyId, reason) => api.post(`/reports/return/${companyId}`, { reason });
export const getItemVersions = (id) => api.get(`/reports/questionReports/${id}/versions`);
export const getCompanyCycles = (companyId) => api.get(`/reports/company/${companyId}/cycles`);
export const assignCycleProfessional = (reportId, body) => api.post(`/reports/${reportId}/professionals`, body);
export const removeQuestionFile = (id) => api.delete(`/reports/questionFiles/${id}`);
export const addRedflag = (redflag, id) => api.patch(`reports/redflag/${id}`, { redflag });
export const removeRedflag = (id) => api.delete(`reports/redflag/${id}`);
export const changeQuestionStatus = (id, status) => api.patch(`reports/changeQuestionStatus/${id}/${status}`);

export const evaluateQuestion = (body, id) => api.post(`/auditory/evaluatequestion/${id}`, body);
export const markNonApplicable = (id) => api.post(`/auditory/nonApplicable/${id}`);
export const submitToSupervisor = (companyId) => api.post(companyId ? `/auditory/submitToSupervisor/${companyId}` : '/auditory/submitToSupervisor');
export const finishAuditory = (companyId) => api.post(`/auditory/finishAuditory/${companyId}`);

/* ---- fluxo do ciclo (rascunho, envio, revisão, auditoria) ---- */
export const getWorkflow = (reportId) => api.get(`/reports/${reportId}/workflow`);
export const getItemHistory = (id) => api.get(`/reports/questionReports/${id}/history`);
export const saveDraft = (id, body) => api.patch(`/reports/questionReports/${id}/draft`, body);
export const submitItem = (id, body = {}) => api.post(`/reports/questionReports/${id}/submit`, body);
export const reviewItem = (id, body) => api.post(`/reports/validateanswer/${id}`, body);
export const releaseCycle = (companyId) => api.post(`/reports/releaseAudit/${companyId}`);
export const returnCycleWith = (companyId, body) => api.post(`/reports/return/${companyId}`, body);
export const auditDecision = (id, body) => api.post(`/auditory/questionReports/${id}/decision`, body);
export const auditComplement = (id, body) => api.post(`/auditory/questionReports/${id}/complement`, body);
export const decideNa = (id, body) => api.post(`/auditory/nonApplicable/${id}`, body);
export const getResult = (reportId, mode = 'audited') => api.get(`/reports/${reportId}/result?mode=${mode}`);
export const getPendings = (reportId) => api.get(`/reports/${reportId}/pendings`);
export const createPending = (reportId, body) => api.post(`/reports/${reportId}/pendings`, body);
export const updatePending = (id, body) => api.patch(`/reports/pendings/${id}`, body);
export const getPublication = (reportId) => api.get(`/reports/${reportId}/publication`);
export const removeCycleProfessional = (reportId, userId) => api.delete(`/reports/${reportId}/professionals/${userId}`);

/**
 * Envio de arquivo da empresa (ou da auditoria, quando o alvo é um indicador em auditoria).
 * `meta`: description, validUntil (AAAA-MM-DD), indefiniteValidity, kind, replacesFileId.
 */
export function uploadCompanyFile(companyOrItemId, file, meta = {}, onUploadProgress) {
  const form = new FormData();
  form.append('companyId', companyOrItemId);
  for (const [key, value] of Object.entries(meta)) if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  form.append('file', file);
  return api.post('/uploads/companyFile', form, { onUploadProgress });
}

/** Download autenticado (a URL do arquivo não é pública). */
export async function downloadFile(url, name) {
  const res = await api.get(`/${url}`, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name || url.split('/').pop();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function uploadSectorCover(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/uploads/sectorCovers', form);
}
