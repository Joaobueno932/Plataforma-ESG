'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import * as usersApi from '@/services/users';
import { forgotPassword, resetPassword } from '@/services/auth';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';
import { useAuth } from './auth';

const UsersContext = createContext({});
const reload = () => setTimeout(() => window.location.reload(), 2000);

// Equivalente ao provider 81388 do original.
export function UsersProvider({ children }) {
  const [users, setUsers] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [search, setSearch] = useState(undefined);
  const router = useRouter();
  const pathname = usePathname();
  const { userLogged } = useAuth();

  const applyPage = (d) => {
    setUsers(d.data);
    setCurrentPage(d.page);
    setNumberOfPages(d.numberOfPages);
  };

  useEffect(() => {
    if (pathname !== '/users' || !userLogged) return;
    const request = userLogged.role !== 'ADMIN' ? usersApi.getCompanyUsers() : usersApi.getUsers();
    request
      .then(({ data }) => applyPage(data))
      .catch((err) => console.error('Erro ao obter todos os usuários:', err));
  }, [pathname, userLogged]);

  const registerUser = async (values) => {
    const id = notify('Cadastrando...', 'loading');
    try {
      await usersApi.createUser(values);
      updateToast(id, 'Usuário cadastrado com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar cadastrar usuário:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const searchUser = async (value) => {
    const term = value.trim();
    try {
      const { data } = await usersApi.getUsers(undefined, undefined, term);
      applyPage(data);
      setSearch(term);
    } catch (err) {
      console.error('Erro ao procurar por um usuário', err);
    }
  };

  const goToPage = (page, label) => async () => {
    try {
      const { data } = await usersApi.getUsers(page, undefined, search);
      applyPage(data);
    } catch (err) {
      console.error(`Erro ao tentar ir para ${label} do usuário:`, err);
    }
  };

  const updateUser = async (userId, values) => {
    const id = notify('Editando usuário...', 'loading');
    try {
      await usersApi.updateUser(userId, values);
      updateToast(id, 'Usuário editado com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar editar usuário:', err);
      updateToast(id, axios.isAxiosError(err) ? err.response?.data?.message || 'Ops! Algo deu errado' : err.message, 'error');
    }
  };

  const deleteUser = async (userId) => {
    const id = notify('Removendo usuário...', 'loading');
    try {
      await usersApi.deleteUser(userId);
      updateToast(id, 'Usuário removido com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar deletar usuário:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  /** Somente a Administração move o vínculo de um usuário (ver Meu perfil para contexto). */
  const changeCompany = async (userId, companyId) => {
    const id = notify('Mudando de empresa...', 'loading');
    try {
      await usersApi.changeUserCompany(userId, companyId);
      updateToast(id, 'Mudança de empresa feita com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar mudar de empresa:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const addLink = async (userId, companyId, role) => {
    const id = notify('Acrescentando vínculo...', 'loading');
    try {
      await usersApi.addUserLink(userId, companyId, role);
      updateToast(id, 'Vínculo concedido.', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao conceder vínculo:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const removeLink = async (userId, linkId) => {
    const id = notify('Removendo vínculo...', 'loading');
    try {
      await usersApi.removeUserLink(userId, linkId);
      updateToast(id, 'Vínculo removido; o acesso correspondente foi encerrado.', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao remover vínculo:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const requestPasswordChange = async (email) => {
    const id = notify('Enviando email', 'loading');
    try {
      await forgotPassword(email);
      updateToast(id, 'O email de redefinição de senha foi enviado, verifique sua caixa de entrada.', 'success');
    } catch (err) {
      console.error('Erro ao tentar enviar o email', err);
      updateToast(id, `Ocorreu o seguinte erro:${err.response?.data?.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const requestChangePassword = async (newPassword, token) => {
    const id = notify('Mudando senha', 'loading');
    try {
      await resetPassword(newPassword, token);
      updateToast(id, 'Senha redefinida com sucesso.', 'success');
      router.push('/');
    } catch (err) {
      console.error('Erro ao tentar mudar de senha.', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        registerUser,
        updateUser,
        deleteUser,
        searchUser,
        numberOfPages,
        currentPage,
        handleNextPage: goToPage(currentPage + 1, 'próxima página'),
        handlePreviousPage: goToPage(currentPage - 1, 'página anterior'),
        changeCompany,
        addLink,
        removeLink,
        requestPasswordChange,
        requestChangePassword,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export const useUsers = () => useContext(UsersContext);
