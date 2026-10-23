'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseCookies, destroyCookie } from 'nookies';
import axios from 'axios';
import { api } from '@/services/api';
import * as auth from '@/services/auth';
import { notify, updateToast } from '@/lib/toast';

const AuthContext = createContext({});

// Equivalente ao provider 24723 do original.
export function AuthProvider({ children }) {
  const router = useRouter();
  const [keepLogged, setKeepLogged] = useState(false);
  const [userLogged, setUserLogged] = useState(null);

  const cookies = parseCookies();
  if (cookies.token) api.defaults.headers.common.Authorization = `Bearer ${cookies.token}`;

  const loadMe = async () => {
    try {
      const { data } = await auth.getMe();
      setUserLogged(data);
    } catch (err) {
      console.error('Erro ao obter todos os dados do userLogged:', err);
      for (const name in parseCookies()) destroyCookie(null, name, { path: '/' });
    }
  };

  useEffect(() => {
    const c = parseCookies();
    if (c.token) loadMe();
    else if (c.keepLogged && c.refreshToken) {
      auth
        .refresh(c.refreshToken)
        .then(loadMe)
        .catch((err) => console.error('Erro ao tentar dar refresh token:', err));
    } else destroyCookie(null, 'refreshToken', { path: '/' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    const id = notify('Autenticando...', 'loading');
    try {
      const res = await auth.login(credentials, keepLogged);
      updateToast(id, 'Logado com sucesso!', 'success');
      const me = (await auth.getMe()).data ?? res.data.sanitizedUser;
      setUserLogged(me);
      // Usuário da empresa vai direto ao ciclo; profissionais e Administração, à lista de empresas.
      const roles = me.roles || [me.role];
      const companyUser = roles.every((r) => ['MANAGER', 'EMPLOYEE'].includes(r));
      router.push(companyUser && me.companyId ? `/companies/${me.companyId}` : '/companies');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        updateToast(id, `${err.response?.data?.error}: ${err.response?.data?.message}`, 'error');
        console.error('Erro ao tentar fazer login:', err.response?.data);
      } else {
        updateToast(id, err.message, 'error');
        console.error('Erro ao tentar fazer login:', err);
      }
    }
  };

  const logout = async () => {
    await auth.logout();
    setUserLogged(null);
  };

  return (
    <AuthContext.Provider value={{ login, logout, keepLogged, setKeepLogged, userLogged, setUserLogged, reloadUser: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
