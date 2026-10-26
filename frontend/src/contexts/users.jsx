'use client';
import { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import * as usersApi from '@/services/users';
import { forgotPassword, resetPassword } from '@/services/auth';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';

const UsersContext = createContext({});
const reload = () => setTimeout(() => window.location.reload(), 2000);

/**
 * Ações sobre contas (cadastro, edição, inativação, vínculos, senha). A listagem de Pessoas e
 * Equipe — busca, filtros, ordenação e paginação no servidor — fica em
 * `components/people/use-people-directory.js`.
 */
export function UsersProvider({ children }) {
  const router = useRouter();

  /** Cadastro; `avatar` (Blob já recortado) é enviado logo após a conta existir. */
  const registerUser = async (values, { avatar } = {}) => {
    const id = notify('Cadastrando...', 'loading');
    try {
      const { data } = await usersApi.createUser(values);
      const created = data?.user ?? data;
      if (avatar && created?.id) {
        try {
          await usersApi.uploadUserAvatar(created.id, avatar);
        } catch (err) {
          updateToast(id, `Usuário cadastrado, mas a foto não foi salva: ${apiErrorMessage(err)}`, 'warning');
          reload();
          return;
        }
      }
      updateToast(id, 'Usuário cadastrado com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar cadastrar usuário:', err);
      updateToast(id, apiErrorMessage(err), 'error');
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
        registerUser,
        updateUser,
        deleteUser,
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
