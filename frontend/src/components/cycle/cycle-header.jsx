'use client';
import { useState } from 'react';
import { IoLockClosed, IoInformationCircleOutline } from 'react-icons/io5';
import { Badge, Btn, Field, Notice, TextArea } from '@/components/esg/ui';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CYCLE_STATE, ROLE_NAME } from '@/lib/workflow';
import { finishAuditory, releaseCycle, requestAudit, requestReturn, returnCycleWith, submitToSupervisor } from '@/services/reports';
import { apiErrorMessage, notify } from '@/lib/toast';

/** Ação com confirmação (e motivo, quando a regra exige). */
function ConfirmAction({ label, title, description, needsReason, reasonLabel, variant = 'primary', onConfirm }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    if (needsReason && !reason.trim()) return setError('Informe o motivo.');
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Btn variant={variant} size="md" onClick={() => setOpen(true)}>
        {label}
      </Btn>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            {needsReason && (
              <Field label={reasonLabel || 'Motivo'} htmlFor="confirm-reason" required error={error && !reason.trim() ? error : null}>
                <TextArea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
              </Field>
            )}
            {error && reason.trim() !== '' && <Notice tone="danger">{error}</Notice>}
            {error && !needsReason && <Notice tone="danger">{error}</Notice>}
          </DialogBody>
          <DialogFooter>
            <Btn variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Btn>
            <Btn variant={variant} onClick={run} loading={busy}>
              Confirmar
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CycleHeader({ company, report, workflow, role, can, onChanged }) {
  const state = CYCLE_STATE[workflow?.status || report?.status] || { label: report?.status, tone: 'neutral' };
  const locked = workflow?.locked;
  const done = async (promise, message) => {
    await promise;
    notify(message, 'success');
    await onChanged();
  };
  const releaseBlocked = (workflow?.releaseBlockers || []).length > 0 || !workflow?.professionals?.auditor || !workflow?.professionals?.supervisor;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Avaliação ESG · Ciclo {report?.cycle ?? 1}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-slate-900 sm:text-[28px]">{company?.bussinessName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={state.tone === 'success' ? 'success' : state.tone === 'warning' ? 'warning' : 'info'}>
              {locked && <IoLockClosed aria-hidden />}
              {state.label}
            </Badge>
            <span>Caderno Geral + Setorial {report?.section}</span>
            <span aria-hidden>·</span>
            <span>Rodada {workflow?.round ?? report?.currentRound ?? 1}</span>
            <span aria-hidden>·</span>
            <span>Catálogo {report?.catalogVersion}</span>
            {role && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Você atua como <strong className="font-semibold text-slate-800">{ROLE_NAME[role] || role}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {can.requestAudit && !report?.auditRequestedAt && (
            <ConfirmAction
              label="Solicitar auditoria"
              title="Solicitar auditoria"
              description="A Administração FIEMS será avisada. A solicitação não libera o processo: a liberação confere se todos os indicadores foram enviados e aprovados."
              onConfirm={() => done(requestAudit(company.id), 'Auditoria solicitada')}
            />
          )}
          {can.release && (
            <ConfirmAction
              label="Liberar para auditoria"
              title="Liberar o processo para auditoria"
              description={
                releaseBlocked
                  ? 'Ainda há pré-requisitos pendentes (veja o aviso na tela). A liberação será recusada até que estejam resolvidos.'
                  : 'Respostas, evidências, catálogo e escopo serão congelados. A empresa, a consultoria e a Administração não editam mais até um retorno autorizado.'
              }
              onConfirm={() => done(releaseCycle(company.id), 'Processo liberado para auditoria')}
            />
          )}
          {can.conclude && (
            <ConfirmAction
              label="Concluir auditoria"
              title="Concluir a auditoria"
              description="Todos os indicadores precisam de decisão válida. O ciclo seguirá para a aprovação do supervisor."
              onConfirm={() => done(submitToSupervisor(company.id), 'Auditoria concluída; aguardando supervisor')}
            />
          )}
          {can.approve && (
            <ConfirmAction
              label="Aprovar auditoria"
              variant="success"
              title="Aprovar o trabalho do auditor"
              description="A aprovação grava o resultado com a versão da regra e libera resultado e documentos automaticamente. Ela não altera enquadramentos."
              onConfirm={() => done(finishAuditory(company.id), 'Auditoria aprovada')}
            />
          )}
          {can.requestReturn && (
            <ConfirmAction
              label="Pedir retorno"
              variant="secondary"
              needsReason
              title="Pedir o retorno do processo"
              description="O pedido fica registrado para a consultoria e a Administração. Ele, sozinho, não desbloqueia a edição."
              onConfirm={(reason) => done(requestReturn(company.id, reason), 'Pedido de retorno registrado')}
            />
          )}
          {can.returnCycle && (
            <ConfirmAction
              label="Retornar processo"
              variant="warning"
              needsReason
              reasonLabel="Motivo do retorno"
              title="Retornar o processo à empresa"
              description="Abre uma nova rodada. O material enviado e os pareceres ficam preservados; só os indicadores alterados perdem a decisão anterior."
              onConfirm={(reason) => done(returnCycleWith(company.id, { reason }), 'Processo retornado à empresa')}
            />
          )}
        </div>
      </div>

      <Notice tone={locked ? 'warning' : 'info'}>
        <span className="flex items-start gap-2">
          <IoInformationCircleOutline className="mt-0.5 shrink-0" aria-hidden />
          <span>{state.help}</span>
        </span>
      </Notice>
    </div>
  );
}
