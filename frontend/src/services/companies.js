import { api } from './api';

export async function getCompanies(page = 1, perPage = 5, bussinessName, nonPaginate) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (bussinessName) params.set('bussinessName', bussinessName);
  if (nonPaginate) params.set('nonPaginate', 'true');
  const { data } = await api.get(`/companies?${params}`);
  return { data };
}

export const getCompaniesLight = () => api.get('/companies/light/all');
export const getCompany = (id) => api.get(`/companies/${id}`);
export const createCompany = (body) => api.post('/companies', body);
export const updateCompany = (id, body) => api.patch(`/companies/${id}`, body);
export const deleteCompany = (id) => api.delete(`/companies/${id}`);
export const getCompanyFiles = async () => (await api.get('/companies/get/files')).data;
export const submitToAuditor = (companyId) => api.post(`/reports/submit/${companyId}`);
export const giveReportAccess = (companyId) => api.post(`/auditory/givereportaccess/${companyId}`);
