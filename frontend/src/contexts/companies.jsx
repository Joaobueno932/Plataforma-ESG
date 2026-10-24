'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as companiesApi from '@/services/companies';
import * as reportsApi from '@/services/reports';
import { getSectors } from '@/services/questions';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';
import { useAuth } from './auth';

const CompaniesContext = createContext({});
const PER_PAGE = 50;
const reload = (ms = 2000) => setTimeout(() => window.location.reload(), ms);

// Equivalente ao provider 93822 do original.
export function CompaniesProvider({ children }) {
  const [companies, setCompanies] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [search, setSearch] = useState(undefined);
  const [sectors, setSectors] = useState([]);
  const { userLogged } = useAuth();
  const pathname = usePathname();

  const applyPage = (d) => {
    setCompanies(d.data);
    setCurrentPage(d.page);
    setNumberOfPages(d.numberOfPages);
  };

  useEffect(() => {
    if (!userLogged) return;
    if (pathname === '/companies') {
      if (userLogged.role === 'ADMIN') {
        companiesApi
          .getCompanies(undefined, PER_PAGE, search)
          .then(({ data }) => applyPage(data))
          .catch((err) => console.error('Erro ao obter todas as Empresas:', err));
      } else {
        companiesApi
          .getCompany(userLogged.companyId)
          .then(({ data }) => setCompanies([data]))
          .catch((err) => console.error('Erro ao obter a Empresa do userLogged:', err));
      }
    }
    if (pathname === '/companies' || pathname === '/indicators') {
      getSectors()
        .then(({ data }) => setSectors(userLogged.role !== 'ADMIN' ? data.filter((s) => s.section === userLogged.company?.section) : data))
        .catch((err) => console.error('Erro ao obter todos os Sectors:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userLogged]);

  const searchCompany = async (value) => {
    const term = value.trim();
    try {
      const { data } = await companiesApi.getCompanies(undefined, PER_PAGE, term);
      applyPage(data);
      setSearch(term);
    } catch (err) {
      console.error('Erro ao procurar por uma empresa', err);
    }
  };

  const registerCompany = async (values) => {
    const body = { ...values, accessDate: new Date(values.accessDate).toISOString() };
    const id = notify('Cadastrando...', 'loading');
    try {
      await companiesApi.createCompany(body);
      updateToast(id, 'Empresa cadastrada com sucesso!', 'success');
      reload();
    } catch (err) {
      updateToast(id, apiErrorMessage(err), 'error');
      console.error('Erro ao tentar cadastrar empresa:', err);
    }
  };

  const goToPage = (page, label) => async () => {
    try {
      const { data } = await companiesApi.getCompanies(page, PER_PAGE, search);
      applyPage(data);
    } catch (err) {
      console.error(`Erro ao tentar ir para ${label} da empresa:`, err);
    }
  };

  /** Solicitação da empresa (gestor): registra a intenção, sem liberar o processo. */
  const requestAuditory = async (companyId) => {
    const id = notify('Solicitando auditoria...', 'loading');
    try {
      await reportsApi.requestAudit(companyId);
      updateToast(id, 'Auditoria solicitada. A Administração FIEMS fará a liberação do processo.', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao solicitar auditoria:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  /** Liberação operacional do processo (Administração FIEMS). Não é aprovação técnica. */
  const submitToAuditor = async (companyId) => {
    const id = notify('Liberando para auditoria...', 'loading');
    try {
      await companiesApi.releaseAudit(companyId);
      updateToast(id, 'Processo liberado para auditoria.', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar submeter o caderno setorial da Empresa:', err);
      if (err?.response?.status === 403) return updateToast(id, 'Ainda existem questões que precisam ser aprovadas pelo cosultor.', 'error');
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const updateCompany = async (companyId, values) => {
    const id = notify('Atualizando empresa...', 'loading');
    try {
      await companiesApi.updateCompany(companyId, values);
      updateToast(id, 'Empresa atualizada com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar atualizar Empresa:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const removeCompany = async (companyId) => {
    const id = notify('Removendo empresa...', 'loading');
    try {
      await companiesApi.deleteCompany(companyId);
      updateToast(id, 'Empresa removida com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao tentar remover Empresa:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  return (
    <CompaniesContext.Provider
      value={{
        companies,
        searchCompany,
        registerCompany,
        handleNextPageCompanies: goToPage(currentPage + 1, 'próxima página'),
        handlePreviousPageCompanies: goToPage(currentPage - 1, 'página anterior'),
        requestAuditory,
        submitToAuditor,
        updateCompany,
        removeCompany,
        sectors,
        numberOfPages,
        currentPage,
      }}
    >
      {children}
    </CompaniesContext.Provider>
  );
}

export const useCompanies = () => useContext(CompaniesContext);
