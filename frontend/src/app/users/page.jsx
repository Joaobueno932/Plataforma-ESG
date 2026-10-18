'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@iconify/react';
import { RiEyeFill, RiEyeOffFill } from 'react-icons/ri';
import { FaRegEdit } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MaskInput } from '@/components/ui/mask-input';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth';
import { useUsers } from '@/contexts/users';
import { ROLE_LABEL, ROLE_OPTIONS } from '@/lib/constants';
import { formatMonthDay } from '@/lib/format';
import { getCompaniesLight } from '@/services/companies';

const ADMIN_PLACEHOLDER = 'randomUUID'; // o original preenche companyId com este marcador quando a função é ADMIN

const userSchema = z.object({
  name: z.string({ required_error: '*O campo nome é obrigatório' }),
  email: z.string({ required_error: '*O campo e-mail é obrigatório' }).email({ message: '*O campo e-mail deve ser um e-mail válido' }),
  password: z.string({ required_error: '*O campo senha é obrigatório' }).min(4, { message: '*O campo deve ter no minímo 4 caracteres' }),
  cpf: z.string({ required_error: '*O campo cpf é obrigatório' }).min(14, { message: '*Deve ter no minímo 11 caracteres' }).optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'MANAGER', 'AUDITOR', 'CONSULTOR', 'SUPERVISOR'], { required_error: '*Por favor selecione um cargo' }),
  companyId: z.string({ required_error: '*Por favor selecione uma empresa' }),
});
const userEditSchema = userSchema.partial();

const FIELD = 'group/fieldset relative flex flex-col-reverse gap-1 mb-1';
const FLOAT_LABEL = 'input-label-float -top-4 left-2 text-xs';

function TextField({ form, name, label, placeholder, mask, type, ...rest }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className={FIELD}>
          <FormControl>
            <>
              {mask ? (
                <MaskInput maskType={mask} placeholder={placeholder} type="text" field={{ ...field }} {...rest} />
              ) : (
                <Input placeholder={placeholder} {...field} value={field.value ?? ''} type={type} {...rest} />
              )}
              <FormLabel className={FLOAT_LABEL}>{label}</FormLabel>
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RegisterUserForm() {
  const [passwordType, setPasswordType] = useState('password');
  const [isAdminRole, setIsAdminRole] = useState(false);
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
    registerUser(body);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate autoComplete="off" className="flex flex-col gap-6">
        <TextField form={form} name="name" label="Nome Do Usuário" placeholder="Digite o nome de usuário" />
        <TextField form={form} name="email" label="E-mail" placeholder="Digite o seu e-mail" />
        <div className="relative">
          <TextField form={form} name="password" label="Senha" placeholder="Digite a sua senha" type={passwordType} />
          <button
            type="button"
            onClick={() => setPasswordType(passwordType === 'password' ? 'text' : 'password')}
            className="absolute right-3 top-4"
            aria-label="Mostrar senha"
          >
            {passwordType === 'password' ? <RiEyeOffFill className="fill-blue-500" /> : <RiEyeFill className="fill-blue-500" />}
          </button>
        </div>
        <TextField form={form} name="cpf" label="Cpf (somente números)" placeholder="Digite o cpf" mask="cpf" />
        <TextField form={form} name="jobTitle" label="Cargo" placeholder="Digite o cargo" />
        <FormField
          name="role"
          control={form.control}
          render={({ field }) => (
            <FormItem className="relative">
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === 'ADMIN') {
                    form.setValue('companyId', ADMIN_PLACEHOLDER);
                    setIsAdminRole(true);
                  } else {
                    setIsAdminRole(false);
                    if (form.getValues('companyId') === ADMIN_PLACEHOLDER) form.resetField('companyId');
                  }
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma Função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup className="overflow-y-auto max-h-80">
                    <SelectLabel>Selecione uma Função</SelectLabel>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="border-b py-4">
                        {r.text}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isAdminRole && (
          <FormField
            name="companyId"
            control={form.control}
            render={({ field }) => (
              <FormItem className="relative">
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup className="overflow-y-auto max-h-80">
                      <SelectLabel>Selecione uma empresa</SelectLabel>
                      {Array.isArray(companies) &&
                        companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.bussinessName}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="w-full flex justify-center">
          <Button className="w-2/3" size="lg">
            CADASTRAR USUÁRIO
          </Button>
        </div>
      </form>
    </Form>
  );
}

const EDITABLE_ROLES = [
  { identifier: 'EMPLOYEE', name: 'Funcionário' },
  { identifier: 'MANAGER', name: 'Gestor' },
  { identifier: 'CONSULTOR', name: 'Consultor' },
];

function EditUserForm({ userSelected }) {
  const [company, setCompany] = useState();
  const [role, setRole] = useState(userSelected?.role);
  const [editing, setEditing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const { updateUser, changeCompany } = useUsers();
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
      <form noValidate autoComplete="off" className="flex flex-col gap-8 w-full">
        <p>Empresa: {userSelected?.company?.bussinessName}</p>
        <TextField form={form} name="name" label="Nome Do Usuário" placeholder="Digite o nome de usuário" disabled={!editing} />
        <TextField form={form} name="email" label="E-mail" placeholder="Digite o seu e-mail" type="email" disabled={!editing} />
        <TextField form={form} name="cpf" label="Cpf (somente números)" placeholder="Digite o cpf" mask="cpf" disabled={!editing} defaultValue={userSelected.cpf} />
        <TextField form={form} name="jobTitle" label="Cargo" placeholder="Digite o cargo" disabled={!editing} />
        <TextField form={form} name="password" label="Password" placeholder="Digite o novo password" disabled={!editing} />
        {!['SUPERVISOR', 'ADMIN', 'AUDITOR'].includes(userSelected?.role) && (
          <div className={FIELD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }} className="flex-wrap">
              {EDITABLE_ROLES.map((r) => (
                <label
                  key={r.identifier}
                  style={{ margin: '10px' }}
                  className="flex justify-between border border-[#C4C4C4] rounded-sm w-[290px] px-[12px] py-[20px] text-slate-600"
                >
                  <p>{r.name}</p>
                  <input
                    type="radio"
                    disabled={!editing}
                    value={r.identifier}
                    checked={role === r.identifier}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                </label>
              ))}
            </div>
            <label className={`text-sm font-medium leading-none ${FLOAT_LABEL}`}>Selecione a função</label>
          </div>
        )}
        {['SUPERVISOR', 'AUDITOR', 'CONSULTOR'].includes(userSelected?.role) ? (
          <section>
            <p>Empresa</p>
            <Combobox
              disabled={!editing}
              data={companies}
              textField="bussinessName"
              defaultValue={userSelected?.company?.bussinessName}
              onChange={(c) => setCompany(c)}
            />
          </section>
        ) : (
          <p />
        )}
        {editing ? (
          <Button
            className="w-96 text-sm self-center"
            variant="success-2"
            size="lg"
            type="button"
            onClick={() => {
              if (company?.id) changeCompany(userSelected.id, company.id);
              save();
            }}
          >
            SALVAR ALTERAÇÕES
          </Button>
        ) : (
          <Button className="w-96 text-sm self-center" variant="primary-main" size="lg" type="button" onClick={() => setEditing(true)}>
            HABILITAR EDIÇÃO
          </Button>
        )}
      </form>
    </Form>
  );
}

function DeleteUserModal({ handleDeleteUser, setOpenModal }) {
  return (
    <Modal.Root closeModal={() => setOpenModal(false)} className="w-fit flex flex-col items-center">
      <Icon icon="ph:x-circle-bold" className="text-semantic-error w-32 h-32" />
      <Modal.Title classes="text-2xl text-medium">Exclusão de conta</Modal.Title>
      <p className="w-[460px] text-center text-neutral-03 text-xl">
        Tem certeza de que deseja excluir permanentemente essa conta? Esta ação não pode ser desfeita e acarretará na exclusão dos dados
        compartilhados com essa aplicação.
      </p>
      <Modal.Content className="flex gap-4 mt-16">
        <Button className="w-64 text-sm" variant="primary-main" size="lg" onClick={() => setOpenModal(false)}>
          CANCELAR
        </Button>
        <Button className="w-64 text-sm" variant="error" size="lg" onClick={handleDeleteUser}>
          DELETAR CONTA
        </Button>
      </Modal.Content>
    </Modal.Root>
  );
}

function UsersSkeleton() {
  return [1, 2, 3].map((k) => (
    <TableRow key={k} className="gap-0">
      {['w-[50%]', 'w-[50%]', 'w-[50%]', 'w-full'].map((w, i) => (
        <TableCell key={i} className="pr-20">
          <Skeleton className={`bg-zinc-400 ${w} h-4`} />
        </TableCell>
      ))}
      <TableCell className="flex gap-2">
        <Skeleton className="bg-zinc-400 w-6 h-6" />
        <Skeleton className="bg-zinc-400 w-6 h-6" />
      </TableCell>
    </TableRow>
  ));
}

function UsersTable() {
  const { users, deleteUser, currentPage, numberOfPages, handleNextPage, handlePreviousPage } = useUsers();
  const { userLogged } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  return (
    <>
      {deleteOpen && <DeleteUserModal handleDeleteUser={() => selected && deleteUser(selected.id)} setOpenModal={setDeleteOpen} />}
      {editOpen && (
        <Modal.Root closeModal={() => setEditOpen(false)} className="flex flex-col w-[1080px] px-[70px] py-10">
          <Modal.Title classes="text-2xl text-medium">Editar usuário</Modal.Title>
          <p className="text-neutral-03 text-base w-[90%]">
            Clique em “Habilitar edição” para editar suas informações. Após editar, clique em “Salvar alterações” e sua edição estará salva!
          </p>
          <Modal.Content className="flex gap-4 mt-4 w-full">
            <EditUserForm userSelected={selected} />
          </Modal.Content>
        </Modal.Root>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Nome</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Data de Cadastro</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users ? (
            users.map((u) => (
              <TableRow key={u.id} className="h-[4.5rem] gap-0">
                <TableCell className="font-medium text-slate-800 pl-4">{u.name}</TableCell>
                <TableCell className="font-medium text-slate-800">{ROLE_LABEL[u.role]}</TableCell>
                <TableCell className="text-slate-500 ">{formatMonthDay(u.createdAt)}</TableCell>
                <TableCell className="text-slate-500 w-20">{u.email}</TableCell>
                {userLogged?.role === 'ADMIN' && (
                  <TableCell>
                    <Button size="icon" variant="ghost" className="hover:bg-transparent" aria-label="Editar usuário" onClick={() => (setEditOpen(true), setSelected(u))}>
                      <FaRegEdit size="24px" className="fill-neutral-03 hover:fill-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="hover:bg-transparent" aria-label="Excluir usuário" onClick={() => (setDeleteOpen(true), setSelected(u))}>
                      <FiTrash2 size="24px" className="stroke-neutral-03 hover:stroke-primary" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <UsersSkeleton />
          )}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center h-16 px-4 border-t">
        <span className="font-medium text-sm text-neutral">
          Página {currentPage} de {numberOfPages}
        </span>
        <div className="flex items-center gap-3 h-full">
          {currentPage > 1 && (
            <Button size="sm" variant="outline" onClick={handlePreviousPage}>
              Anterior
            </Button>
          )}
          {currentPage < numberOfPages && (
            <Button size="sm" variant="outline" onClick={handleNextPage}>
              Próximo
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export default function UsersPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const { userLogged } = useAuth();
  const { searchUser } = useUsers();
  if (!userLogged) return null;
  const isAdmin = userLogged.role === 'ADMIN';

  return (
    <div className="px-6 pb-5 h-full flex flex-col gap-2 ml-56">
      <section className="px-2 flex flex-col gap-2">
        <div>
          <h3 className="title-l">{isAdmin ? 'Lista de Usuários' : 'Usuário'}</h3>
          <p className="text-neutral-03">{isAdmin ? 'Veja a lista de usuários cadastrados assim como a situação dos mesmos.' : 'Veja alguns de seus dados cadastrados.'}</p>
        </div>
        {isAdmin && (
          <div className="flex justify-between items-center">
            <SearchInput placeholder="Procurar por usuário" handleChange={searchUser} />
            <div className="flex space-x-3" />
          </div>
        )}
      </section>
      {registerOpen && (
        <Modal.Root closeModal={() => setRegisterOpen(false)} className="w-[900px] px-20">
          <Modal.Title classes="mb-9 font-medium text-3xl">Novo Usuário</Modal.Title>
          <Modal.Content>
            <RegisterUserForm />
          </Modal.Content>
        </Modal.Root>
      )}
      <section className="px-2">
        <Card.Root>
          <div className="flex justify-between items-center h-16">
            <h6 className="px-4 title-s">{isAdmin ? 'Todos os usuários' : 'Seus dados'}</h6>
            {isAdmin && (
              <div className="flex items-center h-full mr-2">
                <Button className="border-none text-white" onClick={() => setRegisterOpen(true)}>
                  Cadastrar Novo Usuário
                </Button>
              </div>
            )}
          </div>
          <UsersTable />
        </Card.Root>
      </section>
    </div>
  );
}
