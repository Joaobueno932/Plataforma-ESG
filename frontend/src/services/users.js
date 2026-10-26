import { api } from './api';

const query = (params = {}) => {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  return q.toString();
};

/**
 * Pessoas (Administração) e Equipe (empresa em contexto). Parâmetros iguais nas duas:
 * `q`, `role`, `status`, `created` (7d | 30d | 12m | year), `sort`, `dir`, `page`, `perPage`.
 */
export const getUsers = (params = {}) => api.get(`/users?${query({ page: 1, perPage: 10, ...params })}`);
export const getCompanyUsers = (params = {}) => api.get(`/users/getUsers/company?${query({ page: 1, perPage: 10, ...params })}`);

/** Foto de perfil: imagem já recortada (Blob); o servidor valida tipo real, tamanho e dimensões. */
export function uploadUserAvatar(id, blob) {
  const form = new FormData();
  form.append('file', blob, blob.name || 'foto.jpg');
  return api.post(`/users/${id}/avatar`, form);
}
export const removeUserAvatar = (id) => api.delete(`/users/${id}/avatar`);

export const createUser = (body) => api.post('/users', body);
export const updateUser = (id, body) => api.patch(`/users/${id}`, body);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changeUserCompany = (id, companyId) => api.patch(`/users/changeCompany/${id}`, { companyId });

/** Vínculos com empresas (concedidos somente pela Administração). */
export const addUserLink = (id, companyId, role) => api.post(`/users/${id}/links`, { companyId, role });
export const removeUserLink = (id, linkId) => api.delete(`/users/${id}/links/${linkId}`);
export const setUserProfiles = (id, roles) => api.put(`/users/${id}/profiles`, { roles });
export const activateUser = (id) => api.post(`/users/${id}/activate`);
