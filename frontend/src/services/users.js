import { api } from './api';

export function getUsers(page = 1, perPage = 5, name) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (name) params.set('name', name);
  return api.get(`/users?${params}`);
}

export const createUser = (body) => api.post('/users', body);
export const getCompanyUsers = () => api.get('/users/getUsers/company');
export const updateUser = (id, body) => api.patch(`/users/${id}`, body);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changeUserCompany = (id, companyId) => api.patch(`/users/changeCompany/${id}`, { companyId });

/** Vínculos com empresas (concedidos somente pela Administração). */
export const addUserLink = (id, companyId, role) => api.post(`/users/${id}/links`, { companyId, role });
export const removeUserLink = (id, linkId) => api.delete(`/users/${id}/links/${linkId}`);
export const setUserProfiles = (id, roles) => api.put(`/users/${id}/profiles`, { roles });
export const activateUser = (id) => api.post(`/users/${id}/activate`);
