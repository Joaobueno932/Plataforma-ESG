'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaRegEdit } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { IoAdd } from 'react-icons/io5';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Badge, Btn, PAGE, PageHeading } from '@/components/esg/ui';
import { FormPasswordField, FormSelectField, FormTextField } from '@/components/esg/form-fields';
import { AvatarEditor } from '@/components/people/avatar-editor';
import { PeopleDirectory } from '@/components/people/people-directory';
import { useAuth } from '@/contexts/auth';
import { useUsers } from '@/contexts/users';
import { ROLE_LABEL, ROLE_OPTIONS } from '@/lib/constants';
import { apiErrorMessage, notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { getCompaniesLight } from '@/services/companies';
import { removeUserAvatar, uploadUserAvatar } from '@/services/users';

/**
 * Pessoas (Administração) / Equipe (Gestor). Lógica de dados, permissões e rotas inalteradas;
 * apresentação no design system (mesmo das demais telas).
 */
const ADMIN_PLACEHOLDER = 'randomUUID'; // o original preenche companyId com este marcador quando a função é ADMIN

const userSchema = z.object({
  name: z.string({ required_error: '*O campo nome é obrigatório' }),
  email: z.string({ required_error: '*O campo e-mail é obrigatório' }).email({ message: '*O campo e-mail deve ser um e-mail válido' }),
  password: z.string({ required_error: '*O campo senha é obrigatório' }).min(8, { message: '*A senha deve ter no mínimo 8 caracteres' }),
  cpf: z.string({ required_error: '*O campo cpf é obrigatório' }).min(14, { message: '*Deve ter no minímo 11 caracteres' }).optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'MANAGER', 'AUDITOR', 'CONSULTOR', 'SUPERVISOR'], { required_error: '*Por favor selecione um cargo' }),
  companyId: z.string({ required_error: '*Por favor selecione uma empresa' }),
});
const userEditSchema = userSchema.partial();

function RegisterUserForm() {
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [photo, setPhoto] = useState(null); // { blob, url } — enviada depois que a conta existir
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);
  const [companies, setCompanies] = useState(null);
  const { registerUser } = useUsers();
  const form = useForm({ resolver: zodResolver(userSchema) });

  useEffect(() => {
    getCompaniesLight()
      .then(({ data }) => setCompanies(data))
      .catch((err) => console.error('Erro ao obter todas as Empresas:', err));
  }, []);

  const submit = (v) => {
    const body = { name: v.name, email: v.email, password: v.password, cpf: v.cpf && v.cpf.replace(/[^\d]+/g, ''), jobTitle: v.jobTitle, role: v.role };
    if (!isAdminRole) body.companyId = v.companyId;
    registerUser(body, { avatar: photo?.blob });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate autoComplete="off" className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="flex flex-col gap-5">
          <AvatarEditor
            user={{ name: form.watch('name') || 'Novo usuário' }}
            previewSrc={photo?.url}
            onPick={(blob) => setPhoto({ blob, url: URL.createObjectURL(blob) })}
            onRemove={photo ? () => setPhoto(null) : undefined}
            hint="Opcional. JPEG, PNG ou WebP; a foto é recortada em 512×512 e salva junto com o cadastro."
          />
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormTextField form={form} name="name" label="Nome" placeholder="Digite o nome" className="sm:col-span-2" />
            <FormTextField form={form} name="email" label="E-mail" placeholder="Digite o e-mail" type="email" />
            <FormPasswordField form={form} name="password" label="Senha" hint="No mínimo 8 caracteres." placeholder="Digite a senha" />
            <FormTextField form={form} name="cpf" label="CPF" hint="Somente números." placeholder="000.000.000-00" mask="cpf" />
            <FormTextField form={form} name="jobTitle" label="Cargo" placeholder="Digite o cargo" />
            <FormSelectField
              form={form}
              name="role"
              label="Função"
              placeholder="Selecione uma função"
              options={ROLE_OPTIONS}
              onValueChange={(value) => {
                if (value === 'ADMIN') {
                  form.setValue('companyId', ADMIN_PLACEHOLDER);
                  setIsAdminRole(true);
                } else {
                  setIsAdminRole(false);
                  if (form.getValues('companyId') === ADMIN_PLACEHOLDER) form.resetField('companyId');
                }
              }}
            />
            {!isAdminRole && (
              <FormSelectField
                form={form}
                name="companyId"
                label="Empresa"
                placeholder="Selecione uma empresa"
                options={(Array.isArray(companies) ? companies : []).map((c) => ({ value: c.id, text: c.bussinessName }))}
              />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Btn type="submit">Cadastrar usuário</Btn>
        </DialogFooter>
      </form>
    </Form>
  );
}

const EDITABLE_ROLES = [
  { identifier: 'EMPLOYEE', name: 'Funcionário' },
  { identifier: 'MANAGER', name: 'Gestor' },
  { identifier: 'CONSULTOR', name: 'Consultor' },
];

function EditUserForm({ userSelected, onAvatarChange }) {
  const [avatar, setAvatar] = useState(userSelected.avatar ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [company, setCompany] = useState();
  const [role, setRole] = useState(userSelected?.role);
  const [editing, setEditing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const { updateUser, addLink, removeLink } = useUsers();
  const links = userSelected?.links;
  const form = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: { name: userSelected.name, email: userSelected.email, jobTitle: userSelected.jobTitle ?? '' },
  });

  useEffect(() => {
    getCompaniesLight()
      .then(({ data }) => setCompanies(data))
      .catch(() => {});
  }, []);

  const save = () =>
    form.handleSubmit((values) => {
      const body = { ...values, role: role === userSelected.role ? undefined : role };
      if (!body.password) delete body.password;
      if (body.cpf) body.cpf = body.cpf.replace(/[^\d]+/g, '');
      updateUser(userSelected.id, body);
    })();

  return (
    <Form {...form}>
      <form noValidate autoComplete="off" className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => e.preventDefault()}>
        <DialogBody className="flex flex-col gap-5">
          <AvatarEditor
            user={{ ...userSelected, avatar }}
            busy={avatarBusy}
            onPick={async (blob) => {
              setAvatarBusy(true);
              try {
                const { data } = await uploadUserAvatar(userSelected.id, blob);
                setAvatar(data.avatar);
                onAvatarChange?.();
                notify('Foto atualizada.', 'success');
              } catch (err) {
                throw new Error(apiErrorMessage(err));
              } finally {
                setAvatarBusy(false);
              }
            }}
            onRemove={async () => {
              setAvatarBusy(true);
              try {
                await removeUserAvatar(userSelected.id);
                setAvatar(null);
                onAvatarChange?.();
                notify('Foto removida; as iniciais voltam a ser exibidas.', 'success');
              } catch (err) {
                throw new Error(apiErrorMessage(err));
              } finally {
                setAvatarBusy(false);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={userSelected?.status === 'INACTIVE' ? 'neutral' : 'success'}>{userSelected?.status === 'INACTIVE' ? 'Inativa' : 'Ativa'}</Badge>
            <span>
              Perfis: <strong className="font-semibold text-slate-800">{(userSelected?.roles ?? []).map((r) => ROLE_LABEL[r] || r).join(', ')}</strong>
            </span>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormTextField form={form} name="name" label="Nome" placeholder="Digite o nome" disabled={!editing} className="sm:col-span-2" />
            <FormTextField form={form} name="email" label="E-mail" placeholder="Digite o e-mail" type="email" disabled={!editing} />
            <FormTextField form={form} name="cpf" label="CPF" hint="Somente números." placeholder="000.000.000-00" mask="cpf" disabled={!editing} defaultValue={userSelected.cpf} />
            <FormTextField form={form} name="jobTitle" label="Cargo" placeholder="Digite o cargo" disabled={!editing} />
            <FormPasswordField form={form} name="password" label="Nova senha" hint="Em branco: mantém a senha atual." placeholder="Digite a nova senha" disabled={!editing} />
          </div>
          {!['SUPERVISOR', 'ADMIN', 'AUDITOR'].includes(userSelected?.role) && (
            <fieldset className="flex flex-col gap-2" disabled={!editing}>
              <legend className="mb-1.5 text-sm font-medium text-slate-800">Função</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {EDITABLE_ROLES.map((r) => (
                  <label
                    key={r.identifier}
                    className={cn(
                      'flex h-10 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors',
                      role === r.identifier ? 'border-primary-03 bg-blue-50 font-medium text-[#0D3969]' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                      !editing && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {r.name}
                    <input type="radio" className="accent-[#0D5DA8]" value={r.identifier} checked={role === r.identifier} onChange={(e) => setRole(e.target.value)} />
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {['SUPERVISOR', 'AUDITOR', 'CONSULTOR'].includes(userSelected?.role) ? (
            <section className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Empresas vinculadas</h3>
              <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
                {(links ?? []).map((l) => (
                  <li key={l.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-800">
                      {l.bussinessName} <span className="text-slate-500">({ROLE_LABEL[l.role] || l.role})</span>
                      {l.needsReview && (
                        <Badge tone="warning" className="ml-2">
                          vínculo migrado: confirmar
                        </Badge>
                      )}
                    </span>
                    <Btn type="button" variant="danger-ghost" size="sm" disabled={!editing || links.length <= 1} onClick={() => removeLink(userSelected.id, l.id)}>
                      <FiTrash2 aria-hidden /> Remover
                    </Btn>
                  </li>
                ))}
                {!links?.length && <li className="px-3 py-2.5 text-sm text-slate-500">Nenhum vínculo vigente.</li>}
              </ul>
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-800">Acrescentar empresa</span>
                  <Combobox disabled={!editing} data={companies} textField="bussinessName" onChange={(c) => setCompany(c)} placeholder="Pesquisar empresa" />
                </div>
                <Btn type="button" variant="secondary" disabled={!editing || !company?.id} onClick={() => addLink(userSelected.id, company.id, userSelected.role)}>
                  <IoAdd aria-hidden /> Acrescentar vínculo
                </Btn>
              </div>
              <p className="text-xs text-slate-500">O vínculo anterior é mantido.</p>
            </section>
          ) : (
            <p className="text-sm text-slate-600">
              Empresa: <strong className="font-semibold text-slate-800">{userSelected?.company?.bussinessName ?? '—'}</strong>
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          {editing ? (
            <Btn type="button" variant="success" onClick={save}>
              Salvar alterações
            </Btn>
          ) : (
            <Btn type="button" variant="secondary" onClick={() => setEditing(true)}>
              <FaRegEdit aria-hidden /> Habilitar edição
            </Btn>
          )}
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function UsersPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inactivating, setInactivating] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { userLogged } = useAuth();
  const { deleteUser } = useUsers();
  if (!userLogged) return null;
  // Mesma regra de antes: a Administração gerencia contas; a Equipe é consulta.
  const isAdmin = userLogged.role === 'ADMIN';

  return (
    <div className={PAGE}>
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Perfis e vínculos com empresas são concedidos aqui pela Administração.</DialogDescription>
          </DialogHeader>
          {registerOpen && <RegisterUserForm />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>A foto é salva na hora. Para os demais dados, clique em “Habilitar edição” e depois em “Salvar alterações”.</DialogDescription>
          </DialogHeader>
          {editing && <EditUserForm userSelected={editing} onAvatarChange={() => setRefreshKey((k) => k + 1)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!inactivating} onOpenChange={(v) => !v && setInactivating(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Inativar conta</DialogTitle>
            <DialogDescription>
              {inactivating?.name} deixa de acessar o sistema e as sessões abertas são encerradas. Respostas, evidências, autoria e histórico são preservados,
              e a conta pode ser reativada pela Administração.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Btn variant="secondary" onClick={() => setInactivating(null)} autoFocus>
              Cancelar
            </Btn>
            <Btn variant="danger" onClick={() => deleteUser(inactivating.id)}>
              Inativar conta
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeading
        title={isAdmin ? 'Pessoas' : 'Equipe'}
        description={isAdmin ? 'Usuários cadastrados, função e situação.' : 'Pessoas da sua empresa na plataforma.'}
        actions={
          isAdmin && (
            <Btn size="lg" className="w-full sm:w-auto" onClick={() => setRegisterOpen(true)}>
              <IoAdd aria-hidden /> Cadastrar usuário
            </Btn>
          )
        }
      />
      <PeopleDirectory
        scope={isAdmin ? 'all' : 'company'}
        title={isAdmin ? 'Todos os usuários' : 'Pessoas da empresa'}
        noun={isAdmin ? 'usuários' : 'pessoas'}
        selfId={userLogged.id}
        refreshKey={refreshKey}
        onEdit={isAdmin ? setEditing : null}
        onInactivate={isAdmin ? setInactivating : null}
      />
    </div>
  );
}
