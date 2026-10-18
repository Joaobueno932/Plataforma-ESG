import { parseCookies, setCookie, destroyCookie } from 'nookies';
import { api, COOKIE_LONG, COOKIE_SHORT, secure } from './api';

export async function login(credentials, keepLogged) {
  const res = await api.post('/auth/login', credentials, { headers: { 'Content-Type': 'application/json' } });
  const token = res.data.access_token;
  api.defaults.headers.common.authorization = `Bearer ${token}`;
  localStorage.setItem('jwt', token);
  setCookie(null, 'userRole', `${res.data.sanitizedUser.role}`, { ...COOKIE_LONG, secure });
  setCookie(null, 'userId', `${res.data.sanitizedUser.id}`, { ...COOKIE_LONG, secure });
  setCookie(null, 'token', `${token}`, { ...COOKIE_SHORT, secure });
  setCookie(null, 'refreshToken', `${res.data.refresh_token}`, { ...COOKIE_LONG, secure });
  if (keepLogged) setCookie(null, 'keepLogged', 'true', { ...COOKIE_LONG, secure });
  return res;
}

export const getMe = () => api.get('/auth/me');

export async function refresh(refreshToken) {
  const res = await api.post('/auth/refresh', null, { headers: { Authorization: `Bearer ${refreshToken}` } });
  const token = res.data.access_token;
  api.defaults.headers.common.authorization = `Bearer ${token}`;
  localStorage.setItem('jwt', token);
  setCookie(null, 'token', `${token}`, { ...COOKIE_SHORT, secure });
  setCookie(null, 'refreshToken', `${res.data.refresh_token}`, { ...COOKIE_LONG, secure });
  return res;
}

export function logout() {
  const cookies = parseCookies();
  for (const name in cookies) destroyCookie(null, name, { path: '/' });
  localStorage.removeItem('jwt');
  delete api.defaults.headers.common.authorization;
  delete api.defaults.headers.common.Authorization;
}

/** Troca de senha do usuário logado (tela Configurações). */
export function changeOwnPassword(body) {
  const cookies = parseCookies();
  return api.patch(`/users/${cookies.userId}`, body, { headers: { Authorization: `Bearer ${cookies.token}` } });
}

export const forgotPassword = (email) => api.post('/auth/forgotPassword/', { email });

export const resetPassword = (newPassword, token) =>
  api.post('auth/changePassword', { newPassword }, { headers: { Authorization: `Bearer ${token}` } });
