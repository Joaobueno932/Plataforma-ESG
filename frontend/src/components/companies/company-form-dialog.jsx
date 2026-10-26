'use client';
/**
 * Cadastro e edição de empresa — um único formulário. Na edição os campos vêm preenchidos e só o
 * que mudou é enviado; a logo é tratada por arquivo (sem URL), depois dos dados:
 *
 *   cadastro: cria a empresa (abre o ciclo com o Caderno Geral + setorial) → envia a logo.
 *   edição:   salva os dados alterados → envia, troca ou remove a logo.
 *
 * Se os dados falham, nada muda. Se só a logo falha, os dados ficam salvos e o modal continua
 * aberto mostrando o erro e a imagem pendente — nada de mensagem de sucesso antes da persistência.
 */
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IoWarningOutline } from 'react-icons/io5';
import { FiTrash2 } from 'react-icons/fi';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Btn, ErrorState, Notice, SkeletonRows } from '@/components/esg/ui';
import { FormSelectField, FormTextField } from '@/components/esg/form-fields';
import { COMPANY_SIZES } from '@/lib/constants';
import { toDateInput } from '@/lib/format';
import { apiErrorMessage, notify } from '@/lib/toast';
import { isValidCnpj } from '@/lib/validators';
import { createCompany, getCompany, removeCompanyLogo, updateCompany, uploadCompanyLogo } from '@/services/companies';
import { LogoDropzone } from './logo-dropzone';

const required = (label) => z.string({ required_error: `Informe ${label}.` }).trim().min(1, `Informe ${label}.`);
const schema = z.object({
  legalName: required('a razão social').pipe(z.string().max(255, 'Até 255 caracteres.')),
  bussinessName: required('o nome fantasia').pipe(z.string().max(255, 'Até 255 caracteres.')),
  email: required('o e-mail').pipe(z.string().email('Informe um e-mail válido.')),
  cnpj: required('o CNPJ').refine(isValidCnpj, 'CNPJ inválido: confira os dígitos verificadores.'),
  accessDate: required('a data da liberação do acesso').refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida.'),
  size: z.enum(['MICRO_PEQUENA', 'MEDIA', 'GRANDE'], { required_error: 'Selecione o porte.', invalid_type_error: 'Selecione o porte.' }),
  section: required('o caderno setorial'),
});

const toForm = (c) => ({
  legalName: c?.legalName ?? '',
  bussinessName: c?.bussinessName ?? '',
  email: c?.email ?? '',
  cnpj: c?.cnpj ?? '',
  accessDate: toDateInput(c?.accessDate),
  size: c?.size ?? undefined,
  section: c?.section ?? '',
});

/** Corpo para a API: só os campos alterados na edição; CNPJ sem máscara. */
function bodyFrom(values, dirty) {
  const keys = dirty ? Object.keys(values).filter((k) => dirty[k]) : Object.keys(values);
  const body = Object.fromEntries(keys.map((k) => [k, typeof values[k] === 'string' ? values[k].trim() : values[k]]));
  if (body.cnpj !== undefined) body.cnpj = body.cnpj.replace(/\D/g, '');
  return body;
}

function CompanyForm({ mode, company, sectors, onSaved, onCancel, onDirtyChange, onInactivate }) {
  const edit = mode === 'edit';
  const form = useForm({ resolver: zodResolver(schema), defaultValues: toForm(company) });
  const [logo, setLogo] = useState(null);
  const [logoStatus, setLogoStatus] = useState({ status: 'idle' });
  const [saved, setSaved] = useState(company); // empresa já persistida (cadastro concluído/edição salva)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { isDirty } = form.formState;
  const section = form.watch('section');

  useEffect(() => onDirtyChange(isDirty || !!logo), [isDirty, logo, onDirtyChange]);

  const sectionOptions = useMemo(() => sectors.filter((s) => s.section !== 'All').map((s) => ({ value: s.section, text: `${s.section} — ${s.description}` })), [sectors]);
  const sectionChanged = edit && company?.report && section && section !== company.section;

  const applyLogo = async (target) => {
    if (!logo) return target;
    setLogoStatus({ status: 'uploading' });
    try {
      const { data } = logo === 'remove' ? await removeCompanyLogo(target.id) : await uploadCompanyLogo(target.id, logo.file);
      setLogo(null);
      setLogoStatus({ status: 'saved' });
      return data;
    } catch (err) {
      setLogoStatus({ status: 'error', message: apiErrorMessage(err) });
      throw Object.assign(err, { logoOnly: true });
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let current = saved;
    try {
      if (!edit && !saved) {
        const { data } = await createCompany(bodyFrom(values));
        current = data;
        setSaved(data);
        form.reset(toForm(data));
      } else if (form.formState.isDirty) {
        const { data } = await updateCompany(current.id, bodyFrom(values, form.formState.dirtyFields));
        current = data;
        setSaved(data);
        form.reset(toForm(data));
      }
      current = await applyLogo(current);
      notify(edit ? 'Empresa atualizada.' : 'Empresa cadastrada. O ciclo foi aberto com o Caderno Geral e o caderno setorial escolhido.', 'success');
      onSaved(current);
    } catch (err) {
      if (err.logoOnly) {
        setError(`${edit ? 'Os dados foram salvos' : 'A empresa foi cadastrada'}, mas a logo não: ${apiErrorMessage(err)} Tente enviar de novo ou feche para manter assim.`);
        onSaved(current, { keepOpen: true });
      } else setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  });

  return (
    <Form {...form}>
      <form noValidate autoComplete="off" onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="flex flex-col gap-5">
          {error && (
            <Notice tone="danger" title="Não foi possível concluir">
              {error}
            </Notice>
          )}
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormTextField form={form} name="legalName" label="Razão social" required placeholder="Digite a razão social" disabled={busy} />
            <FormTextField form={form} name="bussinessName" label="Nome fantasia" required placeholder="Digite o nome fantasia" disabled={busy} />
            <FormTextField form={form} name="email" label="E-mail" required type="email" placeholder="contato@empresa.com.br" disabled={busy} />
            <FormTextField
              key={`cnpj-${saved?.id || 'novo'}`}
              form={form}
              name="cnpj"
              label="CNPJ"
              required
              mask="cnpj"
              placeholder="00.000.000/0000-00"
              defaultValue={company?.cnpj}
              disabled={busy}
            />
            <FormTextField form={form} name="accessDate" label="Data da liberação do acesso" required type="date" disabled={busy} />
            <FormSelectField form={form} name="size" label="Porte" required placeholder="Selecione o porte" options={COMPANY_SIZES} disabled={busy} />
            <FormSelectField form={form} name="section" label="Caderno setorial" required placeholder="Selecione um caderno setorial" options={sectionOptions} className="sm:col-span-2" disabled={busy || (!edit && !!saved)} />
            {sectionChanged && (
              <Notice tone="warning" icon={<IoWarningOutline aria-hidden />} className="sm:col-span-2">
                A troca vale para a próxima avaliação. O ciclo atual continua com o Caderno Geral + Setorial {company.report.section} — respostas, evidências e
                pontuações não são alteradas.
              </Notice>
            )}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Logo da empresa</span>
              <p className="text-xs text-slate-500">Adicione a logo que será exibida nos relatórios e materiais da plataforma.</p>
              <LogoDropzone
                company={saved}
                value={logo}
                onChange={(next) => {
                  setLogo(next);
                  setLogoStatus({ status: 'idle' });
                }}
                status={logoStatus.status}
                statusMessage={logoStatus.message}
                disabled={busy}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          {edit && company?.status !== 'INACTIVE' && (
            <Btn type="button" variant="danger-ghost" className="sm:mr-auto" onClick={onInactivate} disabled={busy}>
              <FiTrash2 aria-hidden /> Inativar empresa
            </Btn>
          )}
          <Btn type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Btn>
          <Btn type="submit" loading={busy} disabled={edit && !isDirty && !logo}>
            {edit ? 'Salvar alterações' : saved ? 'Enviar logo' : 'Cadastrar empresa'}
          </Btn>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Modal de cadastro (`mode="create"`) ou edição (`mode="edit"` + `companyId`). Fechar com
 * alterações não salvas pede confirmação; cancelar não altera nada que já esteja salvo.
 */
export function CompanyFormDialog({ open, onOpenChange, mode = 'create', companyId, sectors = [], onSaved, onInactivate }) {
  const edit = mode === 'edit';
  const [company, setCompany] = useState(null);
  const [loadState, setLoadState] = useState({ status: edit ? 'loading' : 'ready' });
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmInactivate, setConfirmInactivate] = useState(false);

  const load = () => {
    setLoadState({ status: 'loading' });
    getCompany(companyId)
      .then(({ data }) => {
        setCompany(data);
        setLoadState({ status: 'ready' });
      })
      .catch((err) => setLoadState({ status: 'error', error: apiErrorMessage(err) }));
  };
  useEffect(() => {
    if (!open) return;
    setDirty(false);
    if (edit && companyId) load();
    else setCompany(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, companyId]);

  const requestClose = () => (dirty ? setConfirmClose(true) : onOpenChange(false));

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : requestClose())}>
        <DialogContent size="md" onEscapeKeyDown={(e) => dirty && (e.preventDefault(), setConfirmClose(true))}>
          <DialogHeader>
            <DialogTitle>{edit ? 'Editar empresa' : 'Cadastro de empresa'}</DialogTitle>
            <DialogDescription>
              {edit ? 'Atualize as informações cadastrais e a identidade visual da empresa.' : 'A empresa recebe o ciclo com o Caderno Geral e o caderno setorial escolhido.'}
            </DialogDescription>
          </DialogHeader>
          {loadState.status === 'loading' && (
            <DialogBody>
              <SkeletonRows rows={4} />
            </DialogBody>
          )}
          {loadState.status === 'error' && (
            <DialogBody>
              <ErrorState message={loadState.error} onRetry={load} />
            </DialogBody>
          )}
          {loadState.status === 'ready' && open && (
            <CompanyForm
              key={company?.id || 'novo'}
              mode={mode}
              company={company}
              sectors={sectors}
              onDirtyChange={setDirty}
              onCancel={requestClose}
              onInactivate={() => setConfirmInactivate(true)}
              onSaved={(saved, { keepOpen } = {}) => {
                onSaved?.(saved);
                if (!keepOpen) {
                  setDirty(false);
                  onOpenChange(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent size="sm" hideClose onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Descartar alterações?</DialogTitle>
            <DialogDescription>As alterações deste formulário ainda não foram salvas. O que já está salvo continua como está.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Btn variant="secondary" onClick={() => setConfirmClose(false)} autoFocus>
              Continuar editando
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setConfirmClose(false);
                setDirty(false);
                onOpenChange(false);
              }}
            >
              Descartar
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmInactivate} onOpenChange={setConfirmInactivate}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Inativar empresa</DialogTitle>
            <DialogDescription>
              {company?.bussinessName} deixa de ter acesso e as sessões das pessoas da empresa são encerradas. Avaliações, arquivos, vínculos e histórico são
              preservados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Btn variant="secondary" onClick={() => setConfirmInactivate(false)} autoFocus>
              Cancelar
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setConfirmInactivate(false);
                onInactivate?.(company);
              }}
            >
              Inativar empresa
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
