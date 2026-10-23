'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCompany } from '@/services/companies';
import { getPendings, getQuestionReport, getQuestionReports, getReport, getWorkflow } from '@/services/reports';
import { apiErrorMessage } from '@/lib/toast';
import { capabilities, roleIn } from '@/lib/workflow';

/**
 * Estado da tela do ciclo. Carrega em paralelo e, depois de salvar, troca **só** o indicador
 * alterado — a lista não recarrega inteira, então filtros e posição se mantêm.
 */
export function useCycle(companyId, user) {
  const [company, setCompany] = useState(null);
  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [pendings, setPendings] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setStatus((s) => (s === 'ready' ? 'refreshing' : 'loading'));
    setError(null);
    try {
      const { data: c } = await getCompany(companyId);
      setCompany(c);
      const reportId = c.report?.id;
      if (!reportId) {
        setStatus('ready');
        return;
      }
      const [r, list, wf, pend] = await Promise.all([
        getReport(reportId),
        getQuestionReports(reportId),
        getWorkflow(reportId),
        getPendings(reportId).catch(() => ({ data: [] })),
      ]);
      setReport(r.data);
      setItems(list.data);
      setWorkflow(wf.data);
      setPendings(pend.data);
      setStatus('ready');
    } catch (err) {
      setError(apiErrorMessage(err));
      setStatus('error');
    }
  }, [companyId]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  /** Recarrega um indicador e o estado do fluxo (após salvar, enviar, revisar ou auditar). */
  const refreshItem = useCallback(
    async (id) => {
      const [{ data }, wf, pend] = await Promise.all([getQuestionReport(id), getWorkflow(report.id), getPendings(report.id).catch(() => ({ data: pendings }))]);
      setItems((list) => list.map((i) => (i.id === id ? data : i)));
      setWorkflow(wf.data);
      setPendings(pend.data);
      return data;
    },
    [report, pendings],
  );

  const refreshPendings = useCallback(async () => {
    if (!report) return;
    setPendings((await getPendings(report.id)).data);
  }, [report]);

  const role = useMemo(() => roleIn(user, companyId, report), [user, companyId, report]);
  const can = useMemo(() => capabilities(role, workflow?.status || report?.status, user), [role, workflow, report, user]);

  return { company, report, items, workflow, pendings, status, error, role, can, load, refreshItem, refreshPendings, setItems };
}
