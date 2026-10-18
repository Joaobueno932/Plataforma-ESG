import { api } from './api';

export const createLead = (body) => api.post('/leads', body);
