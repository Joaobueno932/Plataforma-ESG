'use client';
import { useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoCloseCircle, IoPersonAddOutline, IoTrashOutline } from 'react-icons/io5';
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Field, Notice, Progress, SelectInput, SkeletonRows, formatDateTime, formatDay } from '@/components/esg/ui';
import { AXES } from '@/lib/levels';
import { PENDING_KIND, PENDING_STATUS, ROLE_NAME } from '@/lib/workflow';
import { assignCycleProfessional, downloadFile, getPublication, getResult, removeCycleProfessional, updatePending } from '@/services/reports';
import { apiErrorMessage, notify } from '@/lib/toast';

/* ------------------------------------------------------------------ pendências do ciclo */

export function PendingsPanel({ pendings, items, onOpenItem, onChanged }) {
  const [filter, setFilter] = useState('abertas');
  const byId = new Map(items.map((i) => [i.id, i]));
  const list = pendings.filter((p) => (filter === 'abertas' ? ['aberta', 'em-andamento'].includes(p.status) : filter === 'todas' ? true : p.kind === filter));
  const change = async (p, status) => {
    try {
      await updatePending(p.id, { status });
      await onChanged();
    } catch (err) {
      notify(apiErrorMessage(err), 'error');
    }
  };
  return (
    <Card>
      <CardHeader
        title="Pendências"
        description="Orientações, faltas de resposta, evidências pedidas, documentos vencidos e constatações. Prazo vencido não altera a pontuação."
        actions={
          <SelectInput aria-label="Filtrar pendências" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56">
            <option value="abertas">Abertas e em andamento</option>
            <option value="todas">Todas</option>
            {Object.entries(PENDING_KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectInput>
        }
      />
      {!list.length ? (
        <div className="p-5">
          <EmptyState title="Nenhuma pendência" description="Quando houver algo a providenciar, aparece aqui com responsável e prazo." />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((p) => {
            const item = byId.get(p.questionReportId);
            return (
              <li key={p.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{PENDING_KIND[p.kind] || p.kind}</Badge>
                    <Badge tone={PENDING_STATUS[p.status]?.tone}>{PENDING_STATUS[p.status]?.label}</Badge>
                    {p.overdue && <Badge tone="danger">Prazo vencido</Badge>}
                    {p.code && <span className="font-mono text-xs text-slate-500">{p.code}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{p.description}</p>
                  <p className="text-xs text-slate-500">
                    Aberta por {ROLE_NAME[p.createdByRole] || p.createdByRole} em {formatDateTime(p.createdAt)}
                    {p.dueDate && ` · prazo ${formatDay(p.dueDate)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item && (
                    <Btn size="sm" variant="ghost" onClick={() => onOpenItem(item)}>
                      Abrir indicador
                    </Btn>
                  )}
                  {p.status === 'aberta' && (
                    <Btn size="sm" variant="ghost" onClick={() => change(p, 'em-andamento')}>
                      Em andamento
                    </Btn>
                  )}
                  {['aberta', 'em-andamento'].includes(p.status) && (
                    <Btn size="sm" variant="secondary" onClick={() => change(p, 'resolvida')}>
                      Resolver
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ resultado */

const BAND_TONE = { A: 'success', B: 'info', C: 'warning' };

/**
 * Resultado do motor único da API. A empresa vê o resultado auditado só depois da aprovação;
 * antes, o autodiagnóstico aparece marcado como preliminar. Nenhuma métrica é inventada aqui.
 */
export function ResultPanel({ report, auditedVisible }) {
  const mode = auditedVisible ? 'audited' : 'self';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = () => {
    setError(null);
    getResult(report.id, mode)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(apiErrorMessage(err)));
  };
  useEffect(load, [report.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <SkeletonRows rows={3} />;
  const preliminary = mode === 'self';

  return (
    <div className="flex flex-col gap-5">
      {report.status === 'Audited' && <PublicationCard report={report} />}
      {preliminary && (
        <Notice tone="info" title="Resultado preliminar (autodiagnóstico)">
          Calculado só com as respostas enviadas pela empresa. O resultado oficial é o auditado, liberado após a aprovação do supervisor.
        </Notice>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-1 p-6 text-center md:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Rating {preliminary ? 'preliminar' : 'auditado'}</span>
          <span className="text-5xl font-bold tracking-wider text-[#0D3969]">{data.ratingValid ? data.rating : '—'}</span>
          <span className="text-xs text-slate-500">ordem E · S · G</span>
          {!data.ratingValid && <span className="mt-2 text-xs text-slate-600">Sem classificação válida ainda (veja os motivos abaixo).</span>}
        </Card>
        <Card className="flex flex-col gap-3 p-6 md:col-span-2">
          <div className="flex items-center gap-2">
            {data.eligible ? <IoCheckmarkCircle className="text-green-600" size="1.5rem" aria-hidden /> : <IoCloseCircle className="text-red-600" size="1.5rem" aria-hidden />}
            <span className="text-base font-semibold text-slate-900">
              {data.eligible === null ? 'Elegibilidade ainda não determinada' : data.eligible ? 'Elegível à certificação' : 'Não elegível à certificação'}
            </span>
          </div>
          <p className="text-sm text-slate-600">Rating matemático e elegibilidade são verificações separadas: um obrigatório não atendido impede a certificação mesmo com pontuação alta.</p>
          {data.impediments?.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {data.impediments.map((imp, i) => (
                <li key={i} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
                  {imp.detail || imp.message || imp.kind}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {['E', 'S', 'G'].map((axis) => {
          const a = data.axes?.[axis];
          if (!a) return null;
          return (
            <Card key={axis} className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{AXES[axis].label}</span>
                {a.band ? <Badge tone={BAND_TONE[a.band] || 'neutral'}>Faixa {a.band}</Badge> : <Badge tone="neutral">Sem faixa</Badge>}
              </div>
              <div className="text-3xl font-semibold tabular-nums text-slate-900">
                {a.percentageDisplay ?? (a.percentage != null ? `${Number(a.percentage).toFixed(2).replace('.', ',')}%` : '—')}
              </div>
              {a.pendingRatification && <Badge tone="warning">Faixa com política pendente de ratificação</Badge>}
              <Progress value={a.points || 0} max={a.max || 0} color={AXES[axis].color} label={`Pontuação ${AXES[axis].label}`} />
              <p className="text-sm tabular-nums text-slate-600">
                {a.points ?? 0} de {a.max ?? 0} pontos aplicáveis
              </p>
              {(a.reasons || []).length > 0 && (
                <ul className="list-disc pl-5 text-xs text-slate-600">
                  {a.reasons.map((r, i) => (
                    <li key={i}>{typeof r === 'string' ? r : r.message || r.kind}</li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Regra {data.ruleVersion} · {data.policy?.label || data.policy?.id}
        {data.policy?.status === 'pending-ratification' && ' (pendente de ratificação pela FIEMS)'} · calculado em {formatDateTime(data.computedAt)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ publicação */

/**
 * Documentos liberados automaticamente na aprovação. Mostra só o que existe: relatório quando
 * gerado; certificado conforme a situação registrada (sem documento enquanto não houver o
 * modelo oficial).
 */
function PublicationCard({ report }) {
  const [pub, setPub] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    getPublication(report.id)
      .then(({ data }) => setPub(data))
      .catch((err) => setError(apiErrorMessage(err)));
  useEffect(() => {
    load();
  }, [report.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    setBusy(true);
    try {
      await downloadFile(`reports/${report.id}/publication/report.pdf`, `relatorio-auditoria-ciclo-${report.cycle}.pdf`);
    } catch (err) {
      notify(err?.response?.status === 403 ? 'O relatório completo é entregue ao gestor e à consultoria da empresa.' : 'Relatório ainda indisponível; tente em instantes.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Notice tone="warning">{error}</Notice>;
  if (!pub) return <SkeletonRows rows={1} />;
  const cert = pub.certificate;
  return (
    <Card>
      <CardHeader title="Documentos liberados" description={`Publicados automaticamente na aprovação do supervisor em ${formatDateTime(pub.approvedAt)}.`} />
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
          <span className="text-sm font-semibold text-slate-900">Relatório de auditoria</span>
          {pub.report.available ? (
            <>
              <span className="text-xs text-slate-500">PDF · gerado em {formatDateTime(pub.report.generatedAt)}</span>
              <Btn size="sm" className="mt-1 self-start" onClick={download} loading={busy}>
                Baixar relatório
              </Btn>
            </>
          ) : (
            <span className="text-sm text-amber-800">{pub.retrying ? 'Em geração — nova tentativa automática em andamento.' : 'Falha técnica registrada; a equipe foi avisada. A aprovação continua válida.'}</span>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
          <span className="text-sm font-semibold text-slate-900">Certificado / selo FIEMS</span>
          <span className="text-sm text-slate-700">{cert.label}</span>
          {cert.code && (
            <span className="text-xs text-slate-500">
              Código de verificação <span className="font-mono font-semibold text-slate-700">{cert.code}</span> · validade {formatDay(cert.validFrom)} a {formatDay(cert.validUntil)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ equipe do ciclo */

export function TeamPanel({ report, people, onChanged }) {
  const [form, setForm] = useState({ role: 'AUDITOR', userId: '' });
  const [error, setError] = useState(null);
  const candidates = (people || []).filter((p) => p.role === form.role && p.status !== 'INACTIVE');
  const assigned = [
    ...(report.auditor || []).map((p) => ({ ...p, role: 'AUDITOR' })),
    ...(report.supervisor || []).map((p) => ({ ...p, role: 'SUPERVISOR' })),
  ];
  const add = async () => {
    setError(null);
    try {
      await assignCycleProfessional(report.id, form);
      await onChanged();
      notify('Profissional designado', 'success');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  const remove = async (p) => {
    try {
      await removeCycleProfessional(report.id, p.id);
      await onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  return (
    <Card>
      <CardHeader title="Equipe do ciclo" description="Auditor e supervisor precisam de vínculo com a empresa e de designação neste ciclo. Só a Administração designa." />
      <div className="flex flex-col gap-4 p-5">
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {assigned.length ? (
            assigned.map((p) => (
              <li key={`${p.role}-${p.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm text-slate-800">
                  {p.name} <Badge tone="info" className="ml-2">{ROLE_NAME[p.role]}</Badge>
                </span>
                <Btn variant="danger-ghost" size="sm" onClick={() => remove(p)} aria-label={`Remover ${p.name}`}>
                  <IoTrashOutline aria-hidden /> Remover
                </Btn>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-slate-600">Ninguém designado ainda.</li>
          )}
        </ul>
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
          <Field label="Papel" htmlFor="equipe-papel">
            <SelectInput id="equipe-papel" value={form.role} onChange={(e) => setForm({ role: e.target.value, userId: '' })}>
              <option value="AUDITOR">Auditor</option>
              <option value="SUPERVISOR">Supervisor</option>
            </SelectInput>
          </Field>
          <Field label="Profissional vinculado" htmlFor="equipe-pessoa" hint={!candidates.length ? 'Nenhum profissional com esse vínculo na empresa.' : undefined}>
            <SelectInput id="equipe-pessoa" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">Selecione</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Btn onClick={add} disabled={!form.userId}>
            <IoPersonAddOutline aria-hidden /> Designar
          </Btn>
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </Card>
  );
}
