'use client';
import { useEffect, useState } from 'react';
import { IoAlertCircleOutline, IoCheckmarkDoneOutline, IoDocumentTextOutline, IoFlagOutline, IoTimeOutline } from 'react-icons/io5';
import { Card, CardHeader, Notice, Progress, Stat } from '@/components/esg/ui';
import { AXES } from '@/lib/levels';
import { getResult } from '@/services/reports';

/**
 * Visão geral da preparação. **Andamento** (quanto já foi respondido) é diferente de
 * **maturidade** (a pontuação ESG): a tela mostra os dois separados e explica a diferença.
 * Números vêm da API — nada é estimado aqui.
 */
export function Overview({ report, items, workflow, pendings, role }) {
  const [self, setSelf] = useState(null);
  useEffect(() => {
    if (!report) return;
    getResult(report.id, 'self')
      .then(({ data }) => setSelf(data))
      .catch(() => setSelf(null));
  }, [report, items]);

  const total = items.length;
  const submitted = items.filter((i) => i.answerState === 'submitted').length;
  const drafts = items.filter((i) => i.answerState === 'draft').length;
  const missing = total - submitted;
  const openPendings = pendings.filter((p) => ['aberta', 'em-andamento'].includes(p.status));
  const overdue = openPendings.filter((p) => p.overdue).length;
  const mandatoryOpen = items.filter((i) => i.question?.hasMandatory && i.answerState !== 'submitted').length;
  const mandatoryBelow = self?.impediments?.filter((i) => i.kind === 'obrigatorio-nao-atendido').length ?? null;
  const pct = total ? Math.round((submitted / total) * 100) : 0;

  const byAxis = ['E', 'S', 'G'].map((axis) => {
    const list = items.filter((i) => i.question?.category === axis);
    return { axis, total: list.length, submitted: list.filter((i) => i.answerState === 'submitted').length };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Enviados" value={`${submitted}/${total}`} hint={`${pct}% do caderno`} icon={<IoCheckmarkDoneOutline aria-hidden />} tone="info" />
        <Stat label="Faltam" value={missing} hint={drafts ? `${drafts} em rascunho` : 'sem rascunhos'} icon={<IoTimeOutline aria-hidden />} />
        <Stat label="Pendências" value={openPendings.length} hint={overdue ? `${overdue} com prazo vencido` : 'nenhuma vencida'} tone={overdue ? 'warning' : 'neutral'} icon={<IoFlagOutline aria-hidden />} />
        <Stat label="Obrigatórios sem envio" value={mandatoryOpen} hint="indicadores com nível mínimo" tone={mandatoryOpen ? 'warning' : 'success'} icon={<IoAlertCircleOutline aria-hidden />} />
        <Stat
          label="Abaixo do mínimo"
          value={mandatoryBelow ?? '—'}
          hint="na declaração enviada"
          tone={mandatoryBelow ? 'danger' : 'success'}
          icon={<IoAlertCircleOutline aria-hidden />}
        />
        <Stat label="Liberação" value={workflow?.releaseBlockers?.length ? `${workflow.releaseBlockers.length} pendente(s)` : 'pronta'} hint="pré-requisitos" tone={workflow?.releaseBlockers?.length ? 'warning' : 'success'} icon={<IoDocumentTextOutline aria-hidden />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Andamento por eixo" description="Indicadores enviados para revisão em cada eixo. Rascunho não conta." />
          <div className="flex flex-col gap-4 p-5">
            {byAxis.map(({ axis, total: t, submitted: s }) => (
              <div key={axis} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{AXES[axis].label}</span>
                  <span className="tabular-nums text-slate-600">
                    {s} de {t}
                  </span>
                </div>
                <Progress value={s} max={t} color={AXES[axis].color} label={`Andamento ${AXES[axis].label}`} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Andamento não é maturidade" />
          <div className="flex flex-col gap-3 p-5 text-sm text-slate-700">
            <p>
              <strong>Andamento</strong> mostra quanto do caderno já foi respondido e enviado. Ele não diz se a empresa vai bem ou mal.
            </p>
            <p>
              <strong>Maturidade</strong> é a pontuação de cada eixo (pontos obtidos ÷ máximo aplicável). Ela só vale como resultado depois da
              auditoria e da aprovação do supervisor.
            </p>
            {self && (
              <Notice tone="info" title="Autodiagnóstico preliminar">
                {self.ratingValid
                  ? `Rating preliminar ${self.rating}, calculado só com as respostas enviadas.`
                  : 'Ainda sem rating preliminar: faltam respostas enviadas ou há pedidos de "não se aplica" aguardando a auditoria.'}
              </Notice>
            )}
          </div>
        </Card>
      </div>

      {(workflow?.releaseBlockers || []).length > 0 && role !== 'EMPLOYEE' && (
        <Card>
          <CardHeader title="O que falta para liberar a auditoria" description="A Administração só consegue liberar quando cada indicador tiver a versão atual enviada e aprovada." />
          <ul className="divide-y divide-slate-100">
            {workflow.releaseBlockers.slice(0, 12).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="font-mono text-xs text-slate-500">{b.code}</span>
                <span className="flex-1 text-slate-700">{b.reason}</span>
              </li>
            ))}
          </ul>
          {workflow.releaseBlockers.length > 12 && <p className="px-5 py-3 text-xs text-slate-500">e mais {workflow.releaseBlockers.length - 12}…</p>}
        </Card>
      )}
    </div>
  );
}
