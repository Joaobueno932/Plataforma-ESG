import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const api = axios.create({ baseURL: API_URL, timeout: 60000 });

// Opções de cookie do original (módulo 69761): 30 dias / 1 hora.
export const COOKIE_LONG = { maxAge: 2592000, path: '/', sameSite: 'strict' };
export const COOKIE_SHORT = { maxAge: 3600, path: '/', sameSite: 'strict' };

/** O original marcava os cookies como `secure`; em http://localhost isso impediria a sessão. */
export const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
