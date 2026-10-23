'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setCookie } from 'nookies';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@iconify/react';
import { BsWhatsapp } from 'react-icons/bs';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { FaRegEdit } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { TfiSearch } from 'react-icons/tfi';
import { IoDocumentTextOutline, IoWarningOutline } from 'react-icons/io5';
import { TbClipboardText } from 'react-icons/tb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CompanySearch } from '@/components/ui/company-search';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MaskInput } from '@/components/ui/mask-input';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth';
import { useCompanies } from '@/contexts/companies';
import { COMPANY_SIZES, REPORT_STATUS_COLOR, REPORT_STATUS_LABEL } from '@/lib/constants';
import { CONTACT_EMAIL, formatMonthDay, whatsappLink } from '@/lib/format';
import { getCompaniesLight, getCompany } from '@/services/companies';

const companySchema = z.object({
  legalName: z.string({ required_error: '*Razão social é um campo obrigatório' }),
  bussinessName: z.string({ required_error: '*Nome fantasia é um campo obrigatório' }),
  email: z.string({ required_error: '*E-mail é um campo obrigatório' }).email('*Deve ser um e-mail válido'),
  cnpj: z.string({ required_error: '*Cnpj é um campo obrigatório' }).min(18, { message: '*O campo cnpj deve ter no minímo 14 digitos' }),
  accessDate: z.string({ required_error: '*Data de liberação é um campo obrigatório' }),
  size: z.enum(['MICRO_PEQUENA', 'MEDIA', 'GRANDE'], { required_error: '*Por favor selecione o tamanho da empresa' }),
  section: z.string({ required_error: '*Por favor selecione um Caderno Setorial ' }),
  avatar: z.string().optional(),
});
const companyEditSchema = companySchema.partial();

const FIELD = 'group/fieldset relative flex flex-col-reverse gap-1 mb-1';
const FLOAT_LABEL = 'input-label-float -top-4 left-2 text-xs';

function TextField({ form, name, label, placeholder, className = 'w-[48%]', type, mask, ...rest }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className={`${FIELD} ${className}`}>
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
          <FormMessage className={name === 'accessDate' ? 'w-[600px]' : undefined} />
        </FormItem>
      )}
    />
  );
}

function SelectField({ form, name, placeholder, options, contentClassName }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className="relative">
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup className={contentClassName}>
                <SelectLabel>{placeholder}</SelectLabel>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.text}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RegisterCompanyForm() {
  const { registerCompany, sectors } = useCompanies();
  const form = useForm({ resolver: zodResolver(companySchema) });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => registerCompany({ ...values, cnpj: values.cnpj.replace(/[^\d]+/g, '') }))}
        className="flex flex-col gap-9"
        noValidate
        autoComplete="off"
      >
        <div className="flex justify-between">
          <TextField form={form} name="legalName" label="Razão Social" placeholder="Digite a Razão social" />
          <TextField form={form} name="bussinessName" label="Nome Fantasia" placeholder="Digite o Nome Fantasia" />
        </div>
        <div className="flex justify-between">
          <TextField form={form} name="email" label="E-mail" placeholder="Digite o E-mail" />
          <TextField form={form} name="cnpj" label="Cnpj (somente números)" placeholder="Digite o CNPJ" mask="cnpj" />
        </div>
        <TextField form={form} name="accessDate" label="Data da liberação do acesso" placeholder="Digite sua Razão social" type="date" className="w-[26%]" />
        <SelectField form={form} name="size" placeholder="Selecione o tamanho da empresa" options={COMPANY_SIZES} />
        <SelectField
          form={form}
          name="section"
          placeholder="Selecione um Caderno Setorial"
          contentClassName="overflow-y-auto max-h-80"
          options={sectors.filter((s) => s.section !== 'All').map((s) => ({ value: s.section, text: s.description }))}
        />
        <TextField form={form} name="avatar" label="Digite a URL da logo" placeholder="Digite a URL da Logo" className="w-full" />
        <div className="flex justify-center">
          <Button className="border-[1px] text-white px-20" size="lg">
            CADASTRAR EMPRESA
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditCompanyForm({ companySelected }) {
  const { updateCompany } = useCompanies();
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState(null);
  const form = useForm({ resolver: zodResolver(companyEditSchema) });

  useEffect(() => {
    getCompany(companySelected.id)
      .then(({ data }) => {
        setCompany(data);
        form.reset({ bussinessName: data.bussinessName, cnpj: data.cnpj, avatar: data.avatar ?? '' });
      })
      .catch((err) => console.error('Erro ao busca uma única empresa para editar:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!company) return null;
  const submit = (values) => updateCompany(companySelected.id, { ...values, cnpj: values.cnpj?.replace(/[^\d]+/g, '') });

  return (
    <Form {...form}>
      <form noValidate autoComplete="off" className="flex flex-col gap-8 w-full">
        <TextField form={form} name="bussinessName" label="Nome Fantasia" placeholder="Digite o nome fantasia" className="" disabled={!editing} />
        <TextField form={form} name="cnpj" label="Cnpj (somente números)" placeholder="Digite o CNPJ" className="" mask="cnpj" disabled={!editing} defaultValue={company.cnpj} />
        <TextField form={form} name="avatar" label="URL da Logo" placeholder="Digite a url da logo" className="" disabled={!editing} />
        {editing ? (
          <Button className="w-96 text-sm self-center" variant="success-2" size="lg" type="button" onClick={() => form.handleSubmit(submit)()}>
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

function HelpContactModal({ close }) {
  const linkClass = 'border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-white px-6 py-2 rounded-md flex justify-center items-center gap-2';
  return (
    <Modal.Root closeModal={close} className="w-[300px] flex flex-col items-center gap-6">
      <Modal.Title classes="text-3xl font-bold text-primary-03 text-center">PRECISA DE AJUDA? Fale conosco</Modal.Title>
      <Modal.Content className="max-w-[33.25rem] flex flex-col gap-4">
        <div className="flex flex-col gap-5">
          <Link href={whatsappLink()} target="_blank" className={linkClass}>
            <BsWhatsapp size="1.25rem" />
            Whatsapp
          </Link>
          <Link href={`mailto:${CONTACT_EMAIL}`} target="_blank" className={linkClass}>
            <Icon icon="mdi:email-fast-outline" width={25} />
            E-mail
          </Link>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

function CompaniesSkeleton() {
  return (
    <Card.List className="flex flex-col mt-2">
      {[1, 2, 3].map((k) => (
        <div key={k} className="flex justify-between items-center px-4 py-4 border-b-[1px] border-gray-300">
          <div className="w-32 2xl:w-[146px]">
            <Skeleton className="w-28 h-5 rounded-full bg-zinc-400" />
          </div>
          <div className="flex items-center 2xl:gap-14 gap-8">
            <Skeleton className="w-8 h-5 rounded-full bg-zinc-400" />
            <Skeleton className="w-28 h-5 rounded-full bg-zinc-400" />
            <Skeleton className="w-10 h-5 rounded-full bg-zinc-400" />
            <div className="w-[180px] flex justify-center">
              <Skeleton className="w-32 2xl:w-[132px] h-8 rounded-full bg-zinc-400" />
            </div>
          </div>
          <div className="flex gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-32 2xl:w-[132px] h-10 rounded-md bg-zinc-400" />
            ))}
          </div>
        </div>
      ))}
    </Card.List>
  );
}

function CompaniesTable() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { companies } = useCompanies();
  const { userLogged } = useAuth();
  const router = useRouter();
  const open = (id) => {
    setCookie(null, 'oldPath', '/companies', { path: '/' });
    router.push(`/companies/${id}`);
  };

  if (!companies) return <CompaniesSkeleton />;
  const extended = userLogged && userLogged.role !== 'EMPLOYEE';

  return (
    <Table>
      {helpOpen && <HelpContactModal close={() => setHelpOpen(false)} />}
      <TableHeader>
        <TableRow className="w-full">
          <TableHead className="pl-4">Empresa</TableHead>
          <TableHead className="text-center">Tópicos</TableHead>
          <TableHead className="text-center">Periodo de Referência</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="w-40 text-center">Visualizar</TableHead>
          {extended ? (
            <>
              <TableHead className="text-center">Extrato Geral</TableHead>
              <TableHead className="text-center">Relatório</TableHead>
            </>
          ) : (
            <TableHead className="w-80" />
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((c) => (
          <TableRow key={c.id} className="w-full">
            <TableCell className="w-40 pl-4">
              <button onClick={() => open(c.id)} className="text-sm font-medium text-neutral text-start px-0">
                {c.bussinessName}
              </button>
            </TableCell>
            <TableCell className="w-20 text-center text-neutral-03">{c.report?._count?.answeredQuestions || c.report?.answeredQuestions?.length || 0}</TableCell>
            <TableCell className="text-center text-neutral-03">{formatMonthDay(c.accessDate)}</TableCell>
            <TableCell className="flex justify-center">
              <span className={`tag-status ${REPORT_STATUS_COLOR[c.report?.status]}`}>{REPORT_STATUS_LABEL[c.report?.status]}</span>
            </TableCell>
            <TableCell className="w-10">
              <Button onClick={() => open(c.id)} className="h-10 border-none gap-2 mx-auto">
                <TfiSearch className="scale-110" />
                <span className="font-bold text-sm">VISUALIZAR</span>
              </Button>
            </TableCell>
            {extended ? (
              <>
                <TableCell className="w-10">
                  {c.report?.status === 'Pending' || c.report?.status === 'WaitingAuditory' ? (
                    <Link
                      className="h-10 border-none gap-2 mx-auto  flex items-center text-white rounded-md px-8 bg-primary-03 hover:bg-primary-03/90"
                      href={`/companies/${c.id}/performance-report`}
                    >
                      <IoDocumentTextOutline className="scale-110" />
                      <span className="font-bold text-sm">EXTRATO</span>
                    </Link>
                  ) : (
                    <Button disabled size="lg">
                      <IoDocumentTextOutline className="scale-110" />
                      <span className="font-bold text-sm">EXTRATO</span>
                    </Button>
                  )}
                </TableCell>
                <TableCell className="w-52">
                  <Button
                    className="h-10 border-none gap-1 mx-auto"
                    size="sm"
                    onClick={() => router.push(`/companies/${c.id}/report`)}
                    disabled={c.report?.status !== 'Auditing' && c.report?.status !== 'Audited'}
                  >
                    <TbClipboardText className="scale-125" />
                    <span className="font-bold text-sm">RELATÓRIO AUDITORIA</span>
                  </Button>
                </TableCell>
              </>
            ) : (
              <TableHead />
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CompaniesSection() {
  const [action, setAction] = useState(null); // 'edit' | 'remove'
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [lightList, setLightList] = useState(null);
  const { currentPage, numberOfPages, handleNextPageCompanies, handlePreviousPageCompanies, removeCompany } = useCompanies();
  const { userLogged } = useAuth();
  const isAdmin = userLogged?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) getCompaniesLight().then(({ data }) => setLightList(data));
  }, [isAdmin]);

  return (
    <>
      {action && (
        <Modal.Root closeModal={() => setAction(null)} className="w-[987px]">
          <Modal.Title classes="font-semibold text-2xl text-neutral">{action === 'edit' ? 'Editar empresa' : 'Excluir empresa'}</Modal.Title>
          <Modal.SubTitle className="text-base text-neutral-03">
            Pesquise pelo nome da empresa que deseja {action === 'edit' ? 'editar' : 'excluir'}, no campo de pesquisa abaixo.
          </Modal.SubTitle>
          <Modal.Content className="mt-5 flex flex-col">
            <CompanySearch
              data={lightList}
              changeSelect={(id) => {
                const found = lightList?.find((c) => c.id === id);
                if (found) setSelected(found);
              }}
            />
            <div className="space-y-3 mt-14 mb-40">
              <p className="flex items-center gap-1 text-neutral-03">
                <span className="flex items-center gap-1 text-base text-neutral font-semibold">
                  <IoWarningOutline />
                  Importante:
                </span>{' '}
                Selecione uma empresa por vez.
              </p>
              <h4 className="font-semibold text-neutral text-base">Empresa selecionada:</h4>
              {selected ? (
                <div className="w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md">
                  <span className="font-medium text-base text-neutral-04">{selected.bussinessName}</span>
                  <Button
                    className="border-none bg-transparent shadow-transparent hover:bg-transparent text-black rounded-lg p-1"
                    type="button"
                    onClick={() => setSelected(null)}
                  >
                    x
                  </Button>
                </div>
              ) : (
                <span className="text-neutral-03">Nenhuma empresa selecionada.</span>
              )}
            </div>
            <Button
              size="lg"
              variant={action === 'edit' ? 'default' : 'error'}
              className={`text-sm self-center w-[390px] ${action === 'edit' ? 'disabled:bg-primary-03/60' : 'disabled:bg-semantic-error/60'}`}
              onClick={() => {
                if (action === 'edit') {
                  setEditOpen(true);
                  setAction(null);
                } else setConfirmRemove(true);
              }}
              disabled={!selected}
            >
              {action === 'edit' ? 'EDITAR EMPRESA' : 'EXCLUIR EMPRESA'}
            </Button>
          </Modal.Content>
        </Modal.Root>
      )}
      {confirmRemove && (
        <Modal.Root closeModal={() => setConfirmRemove(false)} className="w-fit flex flex-col items-center">
          <Icon icon="ph:x-circle-bold" className="text-semantic-error w-32 h-32" />
          <Modal.Title classes="text-2xl text-medium">Exclusão de conta</Modal.Title>
          <p className="w-[460px] text-center text-neutral-03 text-xl">
            Tem certeza de que deseja excluir permanentemente essa empresa? Esta ação não pode ser desfeita e acarretará na exclusão dos dados
            compartilhados com essa aplicação.
          </p>
          <Modal.Content className="flex gap-4 mt-16">
            <Button className="w-64 text-sm" variant="primary-main" size="lg" onClick={() => setConfirmRemove(false)}>
              CANCELAR
            </Button>
            <Button className="w-64 text-sm" variant="error" size="lg" onClick={() => removeCompany(selected.id)}>
              DELETAR CONTA
            </Button>
          </Modal.Content>
        </Modal.Root>
      )}
      {editOpen && (
        <Modal.Root closeModal={() => setEditOpen(false)} className="flex flex-col w-[1080px] px-[70px] py-10">
          <Modal.Title classes="text-2xl text-medium">Editar empresa</Modal.Title>
          <Modal.SubTitle>
            Clique em “Habilitar edição” para editar suas informações. Após editar, clique em “Salvar alterações” e sua edição estará salva!
          </Modal.SubTitle>
          <Modal.Content className="flex gap-4 mt-4 w-full">
            <EditCompanyForm companySelected={selected} />
          </Modal.Content>
        </Modal.Root>
      )}
      <section className="px-2">
        <Card.Root className="py-0 pt-4">
          <div className="flex justify-between items-start">
            <h6 className="mb-4 px-4 title-s">{isAdmin ? 'Todas as empresas' : 'Minha empresa'}</h6>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-transparent shadow-none mr-2 hover:bg-transparent border-none" aria-label="Ações">
                    <HiOutlineDotsVertical className="stroke-gray-500 scale-125 group-hover:stroke-blue-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => (setAction('edit'), setSelected(null))}>
                      <FaRegEdit />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => (setAction('remove'), setSelected(null))}>
                      <FiTrash2 />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CompaniesTable />
          <div className="flex justify-between items-center h-16 px-4 border-t">
            <span className="font-medium text-neutral">
              Página {currentPage} de {numberOfPages}
            </span>
            <div className="flex items-center gap-3 h-full">
              {currentPage > 1 && (
                <Button size="sm" variant="outline" onClick={handlePreviousPageCompanies}>
                  Anterior
                </Button>
              )}
              {currentPage < numberOfPages && (
                <Button size="sm" variant="outline" onClick={handleNextPageCompanies}>
                  Próximo
                </Button>
              )}
            </div>
          </div>
        </Card.Root>
      </section>
    </>
  );
}

export default function CompaniesPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const { searchCompany } = useCompanies();
  const { userLogged } = useAuth();
  if (!userLogged) return null;
  const isAdmin = userLogged.role === 'ADMIN';

  return (
    <>
      {registerOpen && (
        <Modal.Root closeModal={() => setRegisterOpen(false)} className="w-[900px] px-20">
          <Modal.Title classes="mb-9 font-medium text-3xl">Cadastro de Empresas</Modal.Title>
          <Modal.Content>
            <RegisterCompanyForm />
          </Modal.Content>
        </Modal.Root>
      )}
      <div className="px-6 pb-5 h-full flex flex-col gap-2 lg:ml-56">
        <section className="px-2 flex flex-col gap-2">
          <div>
            <h3 className="title-l">{isAdmin ? 'Lista de Empresas' : 'Empresa'}</h3>
            <p className="text-neutral-03">
              {isAdmin
                ? 'Veja a lista de empresas cadastradas assim como a situação das mesmas'
                : ' Veja a empresa a qual você está cadastrado(a) assim como a situação da mesma'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput placeholder="Procurar por empresa" handleChange={searchCompany} />
              <Button className="h-auto whitespace-normal py-2 text-base sm:text-xl" onClick={() => setRegisterOpen(true)}>
                Cadastrar Nova Empresa
              </Button>
            </div>
          )}
        </section>
        <CompaniesSection />
      </div>
    </>
  );
}
