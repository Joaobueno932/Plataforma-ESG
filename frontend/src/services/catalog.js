import { api } from './api';

/** Versões do catálogo (uso administrativo). */
export const getCatalogVersions = () => api.get('/catalog/versions');
export const getCatalogVersion = (id) => api.get(`/catalog/versions/${id}`);
export const getCatalogReport = (id) => api.get(`/catalog/versions/${id}/report`);
export const getCatalogIndicators = (id, section) =>
  api.get(`/catalog/versions/${id}/indicators${section ? `?section=${encodeURIComponent(section)}` : ''}`);
export const getCatalogImports = () => api.get('/catalog/imports');

/** Níveis de maturidade usados pela versão em vigor (ou pela versão informada). */
export const getCatalogLevels = (versionId) => api.get(`/catalog/levels${versionId ? `?versionId=${versionId}` : ''}`);

const spreadsheet = (file, extra = {}) => {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(extra)) if (value !== undefined && value !== null) form.append(key, String(value));
  return form;
};

/** Prévia: valida e devolve o relatório, sem gravar catálogo. */
export const previewCatalog = (file) => api.post('/catalog/preview', spreadsheet(file));

/** Importa como rascunho (ainda não vale para ciclos novos). */
export const importCatalog = (file, { label, force } = {}) => api.post('/catalog/imports', spreadsheet(file, { label, force }));

/** Confirmação administrativa: publica a versão. */
export const publishCatalogVersion = (id, acknowledge) => api.post(`/catalog/versions/${id}/publish`, { acknowledge });
export const discardCatalogVersion = (id) => api.delete(`/catalog/versions/${id}`);

/* ---- editor do catálogo (Administração; sempre em edição em rascunho) ---- */
export const createEdition = (body) => api.post('/catalog/editions', body);
export const getEditor = (versionId) => api.get(`/catalog/editor/${versionId}`);
export const addSection = (versionId, body) => api.post(`/catalog/editor/${versionId}/sections`, body);
export const updateSection = (versionId, section, body) => api.patch(`/catalog/editor/${versionId}/sections/${section}`, body);
export const removeSection = (versionId, section) => api.delete(`/catalog/editor/${versionId}/sections/${section}`);
export const reorderSection = (versionId, section, ids) => api.put(`/catalog/editor/${versionId}/sections/${section}/order`, { ids });
export const setSectionCover = (versionId, section, avatar) => api.put(`/catalog/editor/${versionId}/sections/${section}/cover`, { avatar });
export const addIndicator = (versionId, body) => api.post(`/catalog/editor/${versionId}/indicators`, body);
export const updateIndicator = (id, body) => api.patch(`/catalog/editor/indicators/${id}`, body);
export const removeIndicator = (id) => api.delete(`/catalog/editor/indicators/${id}`);
