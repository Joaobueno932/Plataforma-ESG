'use client';
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as reports from '@/services/reports';
import * as questions from '@/services/questions';
import { giveReportAccess as giveAccess } from '@/services/companies';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';
import { useAuth } from './auth';

const IndicatorsContext = createContext({});
const reload = (ms = 1800) => setTimeout(() => window.location.reload(), ms);

// Equivalente ao provider 17746 do original (indicadores, respostas e auditoria).
export function IndicatorsProvider({ children }) {
  const [reporstCompany, setReportsCompany] = useState(null);
  const [indicatorsBySector, setIndicatorsBySector] = useState(null);
  const [updateAnswerIsLoading, setUpdateAnswerIsLoading] = useState(false);
  const router = useRouter();
  const { userLogged } = useAuth();

  const getAndSetReports = async (reportId) => {
    try {
      const { data } = await reports.getReport(reportId);
      setReportsCompany(data);
    } catch (err) {
      console.error('Erro ao obter todos os Reports:', err);
    }
  };

  const getAndSetIndicatorBySector = async (reportId) => {
    try {
      const { data } = await reports.getQuestionReports(userLogged?.role === 'ADMIN' ? reportId : undefined);
      setIndicatorsBySector([...data]);
    } catch (err) {
      console.error('Erro ao obter todos os Indicators:', err);
    }
  };

  /** Monta o payload de POST /questions/section/:section a partir do formulário. */
  const registerIndicator = async (values) => {
    const body = {
      title: values.title,
      description: values.description,
      category: values.category,
      subcategory: values.subcategory,
      hasMandatory: values.hasMandatory,
      answers: values.answers.map((a) => ({ ...a, points: Number(a.points) })),
    };
    const id = notify('Cadastrando...', 'loading');
    try {
      await questions.createQuestions([body], values.section);
      updateToast(id, 'Indicador cadastrado com sucesso!', 'success');
      router.push('/indicators');
    } catch (err) {
      console.error('Erro ao tentar cadastrar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const answerIndicator = async (body, questionReportId, companyId) => {
    const id = notify('Registrando a resposta...', 'loading');
    try {
      await reports.answerQuestion(body, questionReportId);
      updateToast(id, 'Resposta registrada com sucesso!', 'success');
      router.push(`/companies/${companyId}`);
    } catch (err) {
      console.error('Erro ao tentar responder Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const validateIndicator = async (questionReportId, body) => {
    const id = notify('validando...', 'loading');
    try {
      await reports.validateAnswer(questionReportId, body);
      reload();
      updateToast(id, 'Validação feita com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao validar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const validateQuestionByAuditor = async (body, questionReportId) => {
    const id = notify('validando...', 'loading');
    try {
      await reports.evaluateQuestion(body, questionReportId);
      reload();
      updateToast(id, 'Validação feita com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao validar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const markNonApplicableByAuditor = async (questionReportId) => {
    const id = notify('validando...', 'loading');
    try {
      await reports.markNonApplicable(questionReportId);
      updateToast(id, 'Validação feita com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao validar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const submitReport = async () => {
    const id = notify('Submetendo...', 'loading');
    try {
      await reports.submitToSupervisor();
      updateToast(id, 'Relátorio Submetido com sucesso!', 'success');
      router.push('/companies');
    } catch (err) {
      console.error('Erro ao validar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const finishAuditoryReport = async (companyId) => {
    const id = notify('Submetendo...', 'loading');
    try {
      await reports.finishAuditory(companyId);
      updateToast(id, 'Relátorio Submetido com sucesso!', 'success');
      router.push('/companies');
    } catch (err) {
      console.error('Erro ao validar Indicator:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const removeFile = async (fileLinkId) => {
    const id = notify('Removendo...', 'loading');
    try {
      await reports.removeQuestionFile(fileLinkId);
      updateToast(id, 'Arquivo removido com sucesso!', 'success');
      reload();
    } catch (err) {
      console.error('Erro ao enviar os arquivos:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const addRedflag = async (text, questionReportId, setReport) => {
    const id = notify('Adicionando Lembre-me...', 'loading');
    try {
      await reports.addRedflag(text, questionReportId);
      updateToast(id, 'Lembrete adicionado com sucesso!', 'success');
      const { data } = await reports.getQuestionReport(questionReportId);
      setReport(data);
    } catch (err) {
      console.error('Erro ao adicionar lembrete:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const removeRedflag = async (questionReportId, setReport) => {
    const id = notify('Removendo Lembre-me...', 'loading');
    try {
      await reports.removeRedflag(questionReportId);
      updateToast(id, 'Lembrete removido com sucesso!', 'success');
      const { data } = await reports.getQuestionReport(questionReportId);
      setReport(data);
    } catch (err) {
      console.error('Erro ao remnover lembrete:', err);
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  const giveReportAccess = async (companyId) => {
    const id = notify('Liberando acesso...', 'loading');
    try {
      await giveAccess(companyId);
      updateToast(id, 'Acesso liberado', 'success');
    } catch (err) {
      console.error('Erro ao liberar acesso', err);
      if (err?.response?.status === 403) return updateToast(id, err.response?.data?.message || 'Erro ao liberar acesso ao relatorio', 'error');
      updateToast(id, 'Ops! Algo deu errado:', 'error');
    }
  };

  const updateQuestion = async (questionId, title, description) => {
    const id = notify('Atualizando questão', 'loading');
    try {
      await questions.updateQuestion(questionId, title, description);
      updateToast(id, 'Questão atualizada', 'success');
      window.location.reload();
    } catch {
      updateToast(id, 'Erro ao atualizar questão', 'error');
    }
  };

  const updateAnswer = async (questionId, answerId, title, points, description, mandatory) => {
    setUpdateAnswerIsLoading(true);
    const id = notify('Deletando pergunta', 'loading');
    try {
      await questions.updateAnswer(questionId, answerId, title, points, description, mandatory);
      updateToast(id, 'Pergunta deletada', 'success');
      setUpdateAnswerIsLoading(false);
      window.location.reload();
    } catch {
      setUpdateAnswerIsLoading(false);
      updateToast(id, 'Erro ao deletar pergunta', 'error');
    }
  };

  const deleteAnswer = async (answerId) => {
    setUpdateAnswerIsLoading(true);
    const id = notify('Deletando pergunta', 'loading');
    try {
      await questions.deleteAnswer(answerId);
      updateToast(id, 'Pergunta deletada', 'success');
      setUpdateAnswerIsLoading(false);
      window.location.reload();
    } catch {
      setUpdateAnswerIsLoading(false);
      updateToast(id, 'Erro ao deletar pergunta', 'error');
    }
  };

  return (
    <IndicatorsContext.Provider
      value={{
        getAndSetReports,
        getAndSetIndicatorBySector,
        registerIndicator,
        answerIndicator,
        validateIndicator,
        validateQuestionByAuditor,
        markNonApplicableByAuditor,
        submitReport,
        removeFile,
        addRedflag,
        removeRedflag,
        finishAuditoryReport,
        giveReportAccess,
        updateQuestion,
        updateAnswer,
        deleteAnswer,
        reporstCompany,
        indicatorsBySector,
        updateAnswerIsLoading,
      }}
    >
      {children}
    </IndicatorsContext.Provider>
  );
}

export const useIndicators = () => useContext(IndicatorsContext);
