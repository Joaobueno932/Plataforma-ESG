'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IoCloudUploadOutline, IoDownloadOutline, IoTrashOutline, IoLockClosed, IoDocumentAttachOutline } from 'react-icons/io5';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, Btn, Card, EmptyState, Field, Notice, SelectInput, SkeletonRows, TextArea, TextInput, formatBytes, formatDateTime, formatDay } from '@/components/esg/ui';
import { LevelCard, LevelCards } from '@/components/esg/level-card';
import { AXES, levelName } from '@/lib/levels';
import { itemState, PENDING_KIND, PENDING_KINDS_BY_ROLE, PENDING_STATUS, ROLE_NAME } from '@/lib/workflow';
import {
  addAnswerer,
  auditComplement,
  auditDecision,
  createPending,
  decideNa,
  downloadFile,
  getItemHistory,
  reviewItem,
  saveDraft,
  submitItem,
  updatePending,
  uploadCompanyFile,
} from '@/services/reports';
import { apiErrorMessage, notify } from '@/lib/toast';

const formFrom = (item) => ({
  answerId: item?.selectedAnswer?.id ?? null,
  answerText: item?.answerText ?? '',
  naRequested: !!item?.naRequest && !item?.naRequest?.decision,
  naJustification: item?.naRequest?.justification ?? '',
});

const sameForm = (a, b) =>
  a.answerId === b.answerId && (a.answerText || '') === (b.answerText || '') && a.naRequested === b.naRequested && (a.naJustification || '') === (b.naJustification || '');

/**
 * Modal do indicador. Mostra código, caderno, eixo, descrição, verificação, ODS e exatamente
 * as alternativas do indicador como cartões oficiais. Rascunho e envio são ações distintas;
 * erros aparecem junto do campo e os dados digitados ficam na tela se o salvamento falhar.
 */
export function AnswerDialog({ item, open, onOpenChange, report, role, can, people, onSaved, returnFocusRef }) {
  const [form, setForm] = useState(formFrom(item));
  const [base, setBase] = useState(formFrom(item));
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [tab, setTab] = useState('resposta');

  useEffect(() => {
    if (!item) return;
    setForm(formFrom(item));
    setBase(formFrom(item));
    setError(null);
  }, [item?.id, item?.lockVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) setTab('resposta');
  }, [open, item?.id]);

  if (!item) return null;
  const q = item.question || {};
  const dirty = !sameForm(form, base);
  // O colaborador só recebe da API os indicadores atribuídos a ele; aqui basta o estado do ciclo.
  const editable = can.answer;
  const state = itemState(item);
  const setorial = q.section && q.section !== 'All';

  const requestClose = (next) => {
    if (next) return onOpenChange(true);
    if (dirty && editable) setConfirmClose(true);
    else onOpenChange(false);
  };

  /** Grava o rascunho; devolve o indicador atualizado ou lança o erro já tratado. */
  const persistDraft = async () => {
    const body = {
      answerId: form.naRequested ? null : form.answerId,
      answerText: form.answerText,
      naRequest: form.naRequested ? { justification: form.naJustification } : item.naRequest && !item.naRequest.decision ? null : undefined,
      expectedLockVersion: item.lockVersion,
    };
    const { data } = await saveDraft(item.id, body);
    return data;
  };

  const run = async (kind, fn, okMessage) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      const fresh = await onSaved(item.id);
      setBase(formFrom(fresh));
      setForm(formFrom(fresh));
      notify(okMessage, 'success');
      return true;
    } catch (err) {
      setError(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onSaveDraft = () => run('draft', persistDraft, 'Rascunho salvo');
  const onSubmit = () =>
    run(
      'submit',
      async () => {
        if (!form.naRequested && !form.answerId) throw Object.assign(new Error('Selecione uma alternativa ou solicite "não se aplica".'), {});
        const saved = dirty || item.answerState !== 'submitted' ? await persistDraft() : item;
        await submitItem(item.id, { expectedLockVersion: saved.lockVersion });
      },
      'Resposta enviada para revisão',
    );

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          size="xl"
          onEscapeKeyDown={(e) => dirty && editable && (e.preventDefault(), setConfirmClose(true))}
          onCloseAutoFocus={(e) => {
            // Volta o foco ao botão do indicador que abriu o modal (a lista não foi recarregada).
            if (returnFocusRef?.current && document.contains(returnFocusRef.current)) {
              e.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
        >
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-[#99D4E5]/40 px-2 py-0.5 font-mono font-semibold text-[#0D3969]">{q.codeOriginal || q.code}</span>
              <Badge tone={setorial ? 'brand' : 'info'}>{setorial ? `Caderno Setorial ${q.section}` : 'Caderno Geral'}</Badge>
              <Badge tone="neutral">
                <span className="h-2 w-2 rounded-full" style={{ background: AXES[q.category]?.color }} aria-hidden />
                {AXES[q.category]?.label}
              </Badge>
              {q.topic && <Badge tone="neutral">Tópico: {q.topic}</Badge>}
              {q.ods && <Badge tone="neutral">ODS {q.ods}</Badge>}
              <Badge tone={state.tone}>{state.label}</Badge>
              {!can.answer && report?.status !== 'Pending' && (
                <Badge tone="warning">
                  <IoLockClosed aria-hidden /> Bloqueado para edição
                </Badge>
              )}
            </div>
            <DialogTitle className="mt-2">{q.title}</DialogTitle>
            <DialogDescription>
              Versão enviada: {item.answerVersion || 'nenhuma'}
              {item.answeredBy && ` · última resposta por ${item.answeredBy.name} (${ROLE_NAME[item.answeredByRole] || item.answeredByRole}) em ${formatDateTime(item.answeredAt)}`}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-5 sm:px-7">
              <TabsList>
                <TabsTrigger value="resposta">Resposta</TabsTrigger>
                {(can.seeAudit || role === 'AUDITOR') && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="pendencias">Pendências</TabsTrigger>
              </TabsList>
            </div>
            <DialogBody className="pt-0">
              <TabsContent value="resposta" className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <Card className="p-4 md:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-900">Descrição</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{q.description || 'Sem descrição na fonte.'}</p>
                  </Card>
                  <Card className="p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900">Verificação</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{q.verification || 'Sem orientação de verificação na fonte.'}</p>
                  </Card>
                </div>

                <section aria-labelledby="niveis">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="niveis" className="text-sm font-semibold text-slate-900">
                      Nível de maturidade declarado
                    </h3>
                    {q.hasMandatory && <span className="text-xs text-slate-600">O nível marcado como “Obrigatório” é o mínimo exigido.</span>}
                  </div>
                  <fieldset disabled={!editable || form.naRequested} className={form.naRequested ? 'opacity-50' : ''}>
                    <LevelCards
                      answers={q.answers}
                      value={form.answerId}
                      readOnly={!editable || form.naRequested}
                      onChange={(a) => setForm((f) => ({ ...f, answerId: a.id }))}
                    />
                  </fieldset>
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Justificativa da resposta" htmlFor="justificativa" hint="Explique como a empresa atende ao nível escolhido.">
                    <TextArea
                      id="justificativa"
                      value={form.answerText}
                      onChange={(e) => setForm((f) => ({ ...f, answerText: e.target.value }))}
                      disabled={!editable}
                      maxLength={5000}
                    />
                  </Field>
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
                    <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#0D5DA8]"
                        checked={form.naRequested}
                        disabled={!editable}
                        onChange={(e) => setForm((f) => ({ ...f, naRequested: e.target.checked }))}
                      />
                      Solicitar “não se aplica”
                    </label>
                    <p className="text-xs text-slate-600">
                      O pedido vai para o auditor, que aceita ou recusa. Precisa de justificativa e de ao menos uma evidência. Enquanto não for aceito, o
                      indicador continua no cálculo.
                    </p>
                    {form.naRequested && (
                      <TextArea
                        aria-label="Justificativa do não se aplica"
                        placeholder="Por que este indicador não se aplica à empresa?"
                        value={form.naJustification}
                        onChange={(e) => setForm((f) => ({ ...f, naJustification: e.target.value }))}
                        disabled={!editable}
                      />
                    )}
                    {item.naRequest?.decision && (
                      <Notice tone={item.naRequest.decision === 'refused' ? 'warning' : 'success'}>
                        Pedido de NA {item.naRequest.decision === 'accepted' ? 'aceito' : item.naRequest.decision === 'refused' ? 'recusado' : 'decidido'} pela auditoria
                        {item.naRequest.decisionReason ? `: ${item.naRequest.decisionReason}` : '.'}
                      </Notice>
                    )}
                  </div>
                </div>

                <Evidence item={item} report={report} editable={editable} onChanged={() => onSaved(item.id)} />

                {can.assign && <Assign item={item} people={people} onChanged={() => onSaved(item.id)} />}

                {can.review && item.answerState === 'submitted' && <Review item={item} onDone={() => onSaved(item.id)} />}
              </TabsContent>

              <TabsContent value="auditoria">
                <AuditPanel item={item} role={role} can={can} report={report} onChanged={() => onSaved(item.id)} />
              </TabsContent>
              <TabsContent value="historico">
                <History item={item} active={tab === 'historico'} />
              </TabsContent>
              <TabsContent value="pendencias">
                <ItemPendings item={item} report={report} role={role} can={can} people={people} active={tab === 'pendencias'} />
              </TabsContent>
            </DialogBody>
          </Tabs>

          <DialogFooter>
            {error && (
              <p role="alert" className="mr-auto text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            {!error && dirty && editable && <p className="mr-auto text-xs text-slate-500">Alterações ainda não salvas</p>}
            <Btn variant="secondary" onClick={() => requestClose(false)}>
              Fechar
            </Btn>
            {editable && tab === 'resposta' && (
              <>
                <Btn variant="secondary" onClick={onSaveDraft} loading={busy === 'draft'} disabled={!dirty || !!busy}>
                  Salvar rascunho
                </Btn>
                <Btn onClick={onSubmit} loading={busy === 'submit'} disabled={!!busy || (!dirty && item.answerState === 'submitted')}>
                  Enviar para revisão
                </Btn>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent size="sm" hideClose onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Há alterações não salvas</DialogTitle>
            <DialogDescription>Você pode salvar como rascunho, descartar ou continuar editando.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setConfirmClose(false)} autoFocus>
              Continuar editando
            </Btn>
            <Btn
              variant="danger-ghost"
              onClick={() => {
                setForm(base);
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Descartar
            </Btn>
            <Btn
              onClick={async () => {
                setConfirmClose(false);
                if (await onSaveDraft()) onOpenChange(false);
              }}
            >
              Salvar rascunho
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ evidências */

function Evidence({ item, report, editable, onChanged }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ description: '', validUntil: '', indefiniteValidity: false });
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const upload = async () => {
    if (!file) return setError('Escolha um arquivo.');
    setError(null);
    setProgress(0);
    try {
      const { data } = await uploadCompanyFile(report.companyId, file, meta, (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)));
      await saveDraft(item.id, { fileIds: [data.id], expectedLockVersion: item.lockVersion });
      setFile(null);
      setMeta({ description: '', validUntil: '', indefiniteValidity: false });
      if (fileRef.current) fileRef.current.value = '';
      await onChanged();
      notify('Evidência anexada', 'success');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  const remove = async (link) => {
    try {
      await saveDraft(item.id, { removeFileIds: [link.fileId], expectedLockVersion: item.lockVersion });
      await onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <section aria-labelledby="evidencias" className="flex flex-col gap-3">
      <h3 id="evidencias" className="text-sm font-semibold text-slate-900">
        Evidências do indicador
      </h3>
      {item.files.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {item.files.map((link) => (
            <li key={link.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <IoDocumentAttachOutline className="hidden shrink-0 text-slate-400 sm:block" size="1.25rem" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{link.file.name}</p>
                <p className="text-xs text-slate-500">
                  {[formatBytes(link.file.sizeBytes), link.file.description, link.file.version > 1 && `versão ${link.file.version}`].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-0.5 text-xs">
                  {link.file.indefiniteValidity ? (
                    <span className="text-slate-600">Validade indeterminada</span>
                  ) : link.file.validUntil ? (
                    <span className={link.file.expired ? 'font-medium text-red-700' : 'text-slate-600'}>
                      {link.file.expired ? 'Vencido em ' : 'Válido até '}
                      {formatDay(link.file.validUntil)}
                    </span>
                  ) : (
                    <span className="text-slate-500">Sem validade informada</span>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <Btn variant="ghost" size="sm" onClick={() => downloadFile(link.file.url, link.file.name)} aria-label={`Baixar ${link.file.name}`}>
                  <IoDownloadOutline aria-hidden /> Baixar
                </Btn>
                {editable && (
                  <Btn variant="danger-ghost" size="sm" onClick={() => remove(link)} aria-label={`Desvincular ${link.file.name}`}>
                    <IoTrashOutline aria-hidden /> Desvincular
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">Nenhuma evidência anexada.</p>
      )}

      {editable && (
        <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 md:grid-cols-[1.2fr_1fr_auto_auto] md:items-end">
          <Field label="Arquivo" htmlFor="evidencia-arquivo" hint="PDF, imagem, documento, planilha ou texto. Executáveis são recusados.">
            <input
              id="evidencia-arquivo"
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.csv,.txt"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0D5DA8] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <Field label="Descrição" htmlFor="evidencia-descricao">
            <TextInput id="evidencia-descricao" value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} maxLength={500} />
          </Field>
          <Field label="Validade" htmlFor="evidencia-validade">
            <div className="flex flex-col gap-1">
              <TextInput
                id="evidencia-validade"
                type="date"
                value={meta.validUntil}
                disabled={meta.indefiniteValidity}
                onChange={(e) => setMeta((m) => ({ ...m, validUntil: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="accent-[#0D5DA8]" checked={meta.indefiniteValidity} onChange={(e) => setMeta((m) => ({ ...m, indefiniteValidity: e.target.checked, validUntil: '' }))} />
                Prazo indeterminado
              </label>
            </div>
          </Field>
          <Btn onClick={upload} loading={progress !== null} disabled={!file}>
            <IoCloudUploadOutline aria-hidden /> {progress !== null ? `${progress}%` : 'Anexar'}
          </Btn>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700 md:col-span-4">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ delegação */

function Assign({ item, people, onChanged }) {
  const [userId, setUserId] = useState(item.answerer?.id || '');
  const [due, setDue] = useState(item.dueDate ? item.dueDate.slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const candidates = (people || []).filter((p) => ['MANAGER', 'EMPLOYEE'].includes(p.role) && p.status !== 'INACTIVE');
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await addAnswerer(item.id, { user: userId, dueDate: due || undefined });
      await onChanged();
      notify('Responsável atualizado', 'success');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="delegacao" className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_200px_auto] md:items-end">
      <h3 id="delegacao" className="text-sm font-semibold text-slate-900 md:col-span-3">
        Responsável e prazo
      </h3>
      <Field label="Responsável" htmlFor="responsavel">
        <SelectInput id="responsavel" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Selecione</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {ROLE_NAME[p.role]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Prazo" htmlFor="prazo" hint="Prazo vencido não altera a pontuação.">
        <TextInput id="prazo" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
      <Btn variant="secondary" onClick={save} loading={busy} disabled={!userId}>
        Salvar responsável
      </Btn>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 md:col-span-3">
          {error}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ revisão */

function Review({ item, onDone }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const approved = item.reviewedAnswerVersion === item.answerVersion && /^Approved/.test(item.status);
  const act = async (veredict) => {
    if (!veredict && !comment.trim()) return setError('Para devolver, explique o que precisa mudar.');
    setBusy(veredict ? 'ok' : 'no');
    setError(null);
    try {
      await reviewItem(item.id, { veredict, comment: comment.trim() || undefined, answerVersion: item.answerVersion });
      setComment('');
      await onDone();
      notify(veredict ? 'Resposta aprovada' : 'Resposta devolvida à empresa', 'success');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section aria-labelledby="revisao" className="flex flex-col gap-3 rounded-xl border border-[#0D5DA8]/30 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="revisao" className="text-sm font-semibold text-slate-900">
          Revisão da versão {item.answerVersion}
        </h3>
        {approved && <Badge tone="success">Esta versão já está aprovada</Badge>}
      </div>
      <p className="text-xs text-slate-600">A aprovação vale só para esta versão. Se a empresa alterar a resposta, ela volta para revisão.</p>
      <Field label="Comentário" htmlFor="comentario-revisao" error={error}>
        <TextArea id="comentario-revisao" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Obrigatório para devolver" />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Btn variant="danger-ghost" onClick={() => act(false)} loading={busy === 'no'}>
          Devolver à empresa
        </Btn>
        <Btn variant="success" onClick={() => act(true)} loading={busy === 'ok'}>
          Aprovar versão {item.answerVersion}
        </Btn>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ auditoria */

function AuditPanel({ item, role, can, report, onChanged }) {
  const q = item.question || {};
  const audit = item.audit;
  const [level, setLevel] = useState(audit?.auditedAnswer?.id ?? null);
  const [justification, setJustification] = useState('');
  const [naReason, setNaReason] = useState('');
  const [complement, setComplement] = useState({ description: '', dueDate: '' });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const naPending = item.naRequest && !item.naRequest.decision;

  const act = async (kind, fn, message) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await onChanged();
      notify(message, 'success');
      setJustification('');
      setNaReason('');
      setComplement({ description: '', dueDate: '' });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-900">Declaração da empresa</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {item.answeredBy ? `${item.answeredBy.name} · ${formatDateTime(item.answeredAt)} · versão ${item.answerVersion}` : 'Sem resposta enviada'}
          </p>
          <div className="mt-4 max-w-[240px]">{item.selectedAnswer ? <LevelCard answer={item.selectedAnswer} compact /> : <p className="text-sm text-slate-600">{item.naRequest ? 'Pedido de “não se aplica”.' : 'Nenhum nível declarado.'}</p>}</div>
          {item.answerText && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{item.answerText}</p>}
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-900">Enquadramento auditado</h3>
          {audit && (audit.auditedAnswer || audit.conclusion) ? (
            <>
              <p className="mt-0.5 text-xs text-slate-500">
                {audit.auditedBy?.name} · {formatDateTime(audit.auditedAt)} · sobre a versão {audit.answerVersion}
                {!audit.valid && ' · não vale para a versão atual'}
              </p>
              <div className="mt-4 max-w-[240px]">
                {audit.auditedAnswer ? <LevelCard answer={audit.auditedAnswer} compact audited /> : <Badge tone="danger">Não atendido (sem comprovação)</Badge>}
              </div>
              {audit.justification && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{audit.justification}</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{can.seeAudit || role === 'AUDITOR' ? 'Ainda sem decisão da auditoria.' : 'Disponível após a aprovação do supervisor.'}</p>
          )}
        </Card>
      </div>

      {role === 'SUPERVISOR' && (
        <Notice tone="info">O supervisor consulta e aprova o trabalho concluído. Enquadramento, “não se aplica” e devolução ficam com o auditor e a consultoria.</Notice>
      )}

      {can.audit && (
        <>
          {naPending && (
            <Card className="flex flex-col gap-3 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Pedido de “não se aplica”</h3>
              <p className="whitespace-pre-line text-sm text-slate-700">{item.naRequest.justification}</p>
              <Field label="Fundamento da decisão" htmlFor="na-fundamento" required>
                <TextArea id="na-fundamento" value={naReason} onChange={(e) => setNaReason(e.target.value)} />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Btn variant="danger-ghost" loading={busy === 'na-no'} onClick={() => act('na-no', () => decideNa(item.id, { decision: 'refused', reason: naReason }), 'Pedido de NA recusado')}>
                  Recusar (continua no cálculo)
                </Btn>
                <Btn variant="success" loading={busy === 'na-ok'} onClick={() => act('na-ok', () => decideNa(item.id, { decision: 'accepted', reason: naReason }), 'Pedido de NA aceito')}>
                  Aceitar “não se aplica”
                </Btn>
              </div>
            </Card>
          )}

          {!naPending && !(item.naRequest?.decision === 'accepted') && (
            <Card className="flex flex-col gap-3 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Enquadramento da auditoria</h3>
              <p className="text-xs text-slate-600">Escolha o nível comprovado — acima ou abaixo do declarado. A resposta da empresa não é alterada.</p>
              <LevelCards answers={q.answers} value={level} onChange={(a) => setLevel(a.id)} label="Nível auditado" compact />
              <Field label="Justificativa (parecer independente)" htmlFor="parecer" required>
                <TextArea id="parecer" value={justification} onChange={(e) => setJustification(e.target.value)} />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Btn variant="danger-ghost" loading={busy === 'notmet'} onClick={() => act('notmet', () => auditDecision(item.id, { conclusion: 'not-met', justification }), 'Registrado: não atendido')}>
                  Concluir não atendido
                </Btn>
                <Btn loading={busy === 'level'} disabled={!level} onClick={() => act('level', () => auditDecision(item.id, { auditedAnswerId: level, justification }), 'Enquadramento registrado')}>
                  Registrar enquadramento
                </Btn>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Pedir complemento à empresa</h3>
            <p className="text-xs text-slate-600">Vira uma pendência para a empresa. Não desbloqueia a edição: isso só acontece com o retorno autorizado.</p>
            <div className="grid gap-3 md:grid-cols-[1fr_200px]">
              <Field label="O que falta" htmlFor="complemento">
                <TextArea id="complemento" value={complement.description} onChange={(e) => setComplement((c) => ({ ...c, description: e.target.value }))} />
              </Field>
              <Field label="Prazo" htmlFor="complemento-prazo">
                <TextInput id="complemento-prazo" type="date" value={complement.dueDate} onChange={(e) => setComplement((c) => ({ ...c, dueDate: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Btn variant="warning" loading={busy === 'comp'} onClick={() => act('comp', () => auditComplement(item.id, { description: complement.description, dueDate: complement.dueDate || undefined }), 'Complemento solicitado')}>
                Solicitar complemento
              </Btn>
            </div>
          </Card>
          {error && <Notice tone="danger">{error}</Notice>}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ histórico */

const REVIEW_LABEL = {
  approved: 'Aprovou',
  rejected: 'Devolveu',
  assessed: 'Enquadrou',
  'not-met': 'Concluiu não atendido',
  complement: 'Pediu complemento',
  'na-accepted': 'Aceitou o “não se aplica”',
  'na-refused': 'Recusou o “não se aplica”',
};
const SNAPSHOT_LABEL = { submit: 'Envio', 'audit-release': 'Liberação para auditoria', return: 'Retorno do processo' };

function History({ item, active }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!active) return;
    getItemHistory(item.id)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [active, item.id, item.lockVersion]);
  const levelOf = (id) => item.question?.answers?.find((a) => a.id === id);

  const events = useMemo(() => {
    if (!data) return [];
    return [
      ...data.versions.map((v) => ({
        at: v.snapshotAt,
        title: `${SNAPSHOT_LABEL[v.snapshotReason] || v.snapshotReason} · versão ${v.answerVersion ?? '—'}`,
        detail: [v.selectedAnswerId ? `Nível: ${levelName(levelOf(v.selectedAnswerId))}` : v.nonApplicable ? 'Não se aplica' : null, v.answerText].filter(Boolean).join(' — '),
        who: v.answeredBy?.name,
        tone: 'info',
      })),
      ...data.reviews.map((r) => ({
        at: r.reviewedAt,
        title: `${REVIEW_LABEL[r.decision] || r.decision} a versão ${r.answerVersion}`,
        detail: [r.auditedAnswerId && `Nível auditado: ${levelName(levelOf(r.auditedAnswerId))}`, r.comment].filter(Boolean).join(' — '),
        who: `${r.reviewedBy?.name || ''}${r.reviewedByRole ? ` (${ROLE_NAME[r.reviewedByRole] || r.reviewedByRole})` : ''}`,
        tone: r.current ? 'success' : 'neutral',
        badge: r.current ? 'Vale para a versão atual' : r.supersededReason ? `Substituída: ${r.supersededReason}` : null,
      })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <SkeletonRows rows={4} />;
  if (!events.length) return <EmptyState title="Sem histórico ainda" description="Envios, revisões e decisões da auditoria aparecem aqui, presos à versão analisada." />;
  return (
    <ol className="relative flex flex-col gap-4 border-l-2 border-slate-200 pl-5">
      {events.map((e, i) => (
        <li key={i} className="esg-rise relative">
          <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${e.tone === 'success' ? 'bg-green-600' : e.tone === 'info' ? 'bg-[#0D5DA8]' : 'bg-slate-400'}`} aria-hidden />
          <p className="text-sm font-medium text-slate-900">{e.title}</p>
          <p className="text-xs text-slate-500">
            {formatDateTime(e.at)}
            {e.who && ` · ${e.who}`}
          </p>
          {e.detail && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{e.detail}</p>}
          {e.badge && <Badge tone={e.tone === 'success' ? 'success' : 'neutral'} className="mt-1">{e.badge}</Badge>}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ pendências do indicador */

function ItemPendings({ item, report, role, can, people, active }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ kind: '', description: '', dueDate: '' });
  const [error, setError] = useState(null);
  const kinds = PENDING_KINDS_BY_ROLE[role] || [];
  const load = async () => {
    const { data } = await getItemHistory(item.id);
    setList(data.pendings);
  };
  useEffect(() => {
    if (active) load().catch((err) => setError(apiErrorMessage(err)));
  }, [active, item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setError(null);
    try {
      await createPending(report.id, { ...form, questionReportId: item.id, dueDate: form.dueDate || undefined });
      setForm({ kind: '', description: '', dueDate: '' });
      await load();
      notify('Pendência registrada', 'success');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  const change = async (p, status) => {
    try {
      await updatePending(p.id, { status });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!list) return <SkeletonRows rows={2} />;
  return (
    <div className="flex flex-col gap-4">
      {list.length ? (
        <ul className="flex flex-col gap-2">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{PENDING_KIND[p.kind] || p.kind}</Badge>
                  <Badge tone={PENDING_STATUS[p.status]?.tone}>{PENDING_STATUS[p.status]?.label}</Badge>
                  {p.dueDate && <span className="text-xs text-slate-500">Prazo {formatDay(p.dueDate)}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-800">{p.description}</p>
              </div>
              {['aberta', 'em-andamento'].includes(p.status) && (
                <div className="flex gap-1">
                  {p.status === 'aberta' && (
                    <Btn size="sm" variant="ghost" onClick={() => change(p, 'em-andamento')}>
                      Em andamento
                    </Btn>
                  )}
                  <Btn size="sm" variant="secondary" onClick={() => change(p, 'resolvida')}>
                    Resolver
                  </Btn>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">Nenhuma pendência neste indicador.</p>
      )}
      {can.createPending && kinds.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 md:grid-cols-[220px_1fr_170px_auto] md:items-end">
          <Field label="Tipo" htmlFor="pend-tipo">
            <SelectInput id="pend-tipo" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              <option value="">Selecione</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {PENDING_KIND[k]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Descrição" htmlFor="pend-desc">
            <TextInput id="pend-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Prazo" htmlFor="pend-prazo">
            <TextInput id="pend-prazo" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Field>
          <Btn onClick={create} disabled={!form.kind || !form.description.trim()}>
            Registrar
          </Btn>
        </div>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
