import { api } from './api';

export const getQuestionReports = (reportId) => api.get(`/reports/company/questions/${reportId || ''}`);
export const getReport = (reportId) => api.get(`/reports/${reportId}`);
export const getQuestionReport = (id) => api.get(`/reports/questionReports/${id}`);
export const answerQuestion = (body, id) => api.patch(`/reports/answerQuestion/${id}`, body);
export const editQuestionReport = (body, id) => api.patch(`/reports/editQuestionReport/${id}`, body);
export const validateAnswer = (id, body) => api.post(`/reports/validateanswer/${id}`, body);
export const addAnswerer = (id, body) => api.patch(`/reports/addanswerer/${id}`, body);
export const removeQuestionFile = (id) => api.delete(`/reports/questionFiles/${id}`);
export const addRedflag = (redflag, id) => api.patch(`reports/redflag/${id}`, { redflag });
export const removeRedflag = (id) => api.delete(`reports/redflag/${id}`);
export const changeQuestionStatus = (id, status) => api.patch(`reports/changeQuestionStatus/${id}/${status}`);

export const evaluateQuestion = (body, id) => api.post(`/auditory/evaluatequestion/${id}`, body);
export const markNonApplicable = (id) => api.post(`/auditory/nonApplicable/${id}`);
export const submitToSupervisor = () => api.post('/auditory/submitToSupervisor');
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
