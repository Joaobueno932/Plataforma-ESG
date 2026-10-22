import { api } from './api';

export const getQuestionReports = (reportId) => api.get(`/reports/company/questions/${reportId || ''}`);
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

export function uploadCompanyFile(companyId, file) {
  const form = new FormData();
  form.append('companyId', companyId);
  form.append('file', file);
  return api.post('/uploads/companyFile', form);
}

export function uploadSectorCover(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/uploads/sectorCovers', form);
}
