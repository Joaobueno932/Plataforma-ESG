import { api } from './api';

export const getSectors = () => api.get('/sectors');
export const createSector = (body) => api.post('/sectors', body);
export const createQuestions = (data, section) => api.post(`/questions/section/${section}`, data);
export const updateQuestion = (id, title, description) => api.patch(`/questions/${id}`, { title, description });
export const updateAnswer = (questionId, answerId, _title, points, description, mandatory) =>
  api.patch(`/questions/answer/${questionId}/${answerId}`, { points, description, mandatory });
export const deleteAnswer = (answerId) => api.delete(`/questions/answer/${answerId}`);
export const deleteSection = (section) => api.delete(`/questions/section/${section}`);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
