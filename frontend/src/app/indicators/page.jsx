'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { setCookie } from 'nookies';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BiTrash } from 'react-icons/bi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileChip } from '@/components/ui/file-chip';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth';
import { useCompanies } from '@/contexts/companies';
import { COOKIE_LONG, COOKIE_SHORT } from '@/services/api';
import { createSector, deleteSection } from '@/services/questions';
import { uploadSectorCover } from '@/services/reports';
import { apiAsset } from '@/lib/format';
import { notify, updateToast } from '@/lib/toast';
import { PROGRESS, PROGRESS_DATA, sectionSchema } from '@/lib/indicator-schemas';

/** Passo 1 do assistente: escolhe o caderno e segue para "Criar indicadores". */
function NewIndicatorForm() {
  const form = useForm({ resolver: zodResolver(sectionSchema) });
  const router = useRouter();
  const { keepLogged } = useAuth();
  const { sectors } = useCompanies();
  const opts = keepLogged ? COOKIE_LONG : COOKIE_SHORT;
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          setCookie(null, PROGRESS_DATA, JSON.stringify(values), { ...opts });
          setCookie(null, PROGRESS, '1', { ...opts });
          router.push('/indicators/create-indicator');
        })}
        className="flex flex-col gap-9"
        noValidate
        autoComplete="off"
      >
        <FormField
          name="section"
          control={form.control}
          render={({ field }) => (
            <FormItem className="relative">
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um Indicador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup className="overflow-y-auto max-h-80">
                    <SelectLabel>Selecione um Indicador</SelectLabel>
                    {sectors.map((s) => (
                      <SelectItem key={s.section} value={s.section}>
                        {s.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-center">
          <Button className="border-[1px] text-white px-20 mt-[100px]" size="lg">
            CADASTRAR INDICADOR
          </Button>
        </div>
      </form>
    </Form>
  );
}

function NewSectorForm() {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState(null);
  const ready = !!(description && section && file);

  const pick = (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    if (f.size > 104857600) setError('O Arquivo selecionado excede o limite de 100mb. Selecione outro');
    else {
      setFile(f);
      setError(null);
    }
    e.currentTarget.value = '';
  };

  const submit = async () => {
    if (!file) return;
    let uploaded;
    try {
      uploaded = await uploadSectorCover(file);
    } catch (err) {
      console.error('Erro upload da imagem do caderno', err);
      return notify('Falha no upload de imagem', 'error');
    }
    try {
      await createSector({ avatar: uploaded.data.filePath, description, section });
      notify('Caderno criado com sucesso!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Erro no cadastro do caderno', err);
      notify(err?.response?.data?.message ? `Falha criar caderno: ${err.response.data.message}` : 'Falha criar caderno', 'error');
    }
  };

  return (
    <section>
      <p className="text-xl">Adicionar foto de capa</p>
      <div className=" flex justify-center bg-[#1C3D94] text-neutral-01 h-10 rounded-sm transition duration-300 ease-in-outite w-1/2 w-full">
        <Label htmlFor="fileInput" className="bg-transparent flex items-center justify-center flex-1 font-bold cursor-pointer">
          Procurar arquivo
        </Label>
        <Input type="file" className="hidden" id="fileInput" accept="image/*" onChange={pick} />
        {error}
      </div>
      <p className="text-[#6E727A] text-base">Dimensão sugerida: 233x328 | Tamanho máx. do arquivo: 100mb</p>
      <ul className="flex flex-wrap items-center gap-3 mt-1">{file && <FileChip fileToRender={file} removeFile={() => setFile(null)} />}</ul>
      <section className="flex mt-6">
        <Input placeholder="Descrição" onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder="Setor (A-Z)" onChange={(e) => setSection(e.target.value)} className="ml-4 w-60" />
      </section>
      <div className="flex justify-center">
        <Button className="border-[1px] text-white px-20 mt-[100px]" size="lg" disabled={!ready} onClick={submit}>
          CADASTRAR CADERNO
        </Button>
      </div>
    </section>
  );
}

function DeleteSectorButton({ section }) {
  const [open, setOpen] = useState(false);
  const remove = async () => {
    const id = notify('Deletando...', 'loading');
    try {
      await deleteSection(section);
      updateToast(id, 'Caderno deletado com sucesso!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      updateToast(id, err?.response?.status === 409 ? `Erro ao deletar caderno: ${err.response.data.message}.` : 'Erro ao deletar caderno.', 'error');
    }
  };
  return (
    <>
      {open && (
        <Modal.Root closeModal={() => setOpen(false)} className="w-[300px] flex flex-col items-center gap-6">
          <Modal.Title classes="text-3xl font-bold text-primary-03 text-center">Tem certeza que deseja deletar esse caderno setorial?</Modal.Title>
          <Modal.Content className="max-w-[33.25rem] flex flex-col gap-4">
            <div className="flex flex-col gap-5">
              <Button
                onClick={() => {
                  setOpen(false);
                  remove();
                }}
                className="border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-white px-6 py-2 rounded-md flex justify-center items-center gap-2"
              >
                Sim, deletar.
              </Button>
            </div>
          </Modal.Content>
        </Modal.Root>
      )}
      <div className="flex flex-col gap-2">
        <Button className="w-48 border-primary text-primary font-bold text-base gap-2" size="sm" variant="outline-02" onClick={() => setOpen(true)}>
          <BiTrash size="1.25rem" />
          Deletar caderno
        </Button>
      </div>
    </>
  );
}

function SectorCard({ src, title, description, children, centered }) {
  return (
    <Card.Root className={`bg-transparente border-none flex flex-col ${centered ? 'items-center' : ''} gap-2 max-w-[20.5rem]`}>
      <div className="w-[20.5rem] h-[14.5rem] rounded-md overflow-hidden">
        <Image src={src} alt="imagem do caderno" width={1000} height={1000} className="w-full h-full object-cover" />
      </div>
      <h4 className="text-[#0E3A68] text-xl">{title}</h4>
      <p className={`text-sm ${centered ? 'text-center' : ''}`}>{description}</p>
      {children}
    </Card.Root>
  );
}

export default function IndicatorsPage() {
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const { userLogged } = useAuth();
  const { sectors } = useCompanies();
  const router = useRouter();

  const openOwnCompany = () => {
    setCookie(null, 'oldPath', '/indicators', { path: '/' });
    router.push(`/companies/${userLogged?.companyId}`);
  };

  if (!userLogged)
    return (
      <section className="container ml-56 bg-gray-50 h-full flex flex-col space-y-6">
        <h3>Indicadores</h3>
        <p className="text-3xl text-zinc-500">Selecione um de seus cadernos setoriais:</p>
        <Card.Root className="flex justify-center items-center gap-5 p-10">
          <Card.Root className="w-[18.75rem] h-[20.5rem] flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center space-y-2 h-32">
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="w-36 h-5 bg-zinc-400 rounded-full" />
              ))}
            </div>
            <Skeleton className="w-44 h-10 bg-zinc-400 rounded-md" />
          </Card.Root>
        </Card.Root>
      </section>
    );

  if (userLogged.role !== 'ADMIN') {
    const own = sectors.find((s) => s.section === userLogged.company?.section) || { avatar: '', section: '', description: '' };
    return (
      <section className="px-8 ml-56 bg-gray-50 h-full flex flex-col space-y-6">
        <h3>Indicadores</h3>
        <p className="text-3xl text-zinc-500">Selecione um de seus cadernos setoriais:</p>
        <Card.Root className="flex justify-center items-center gap-5 p-10">
          <SectorCard src={apiAsset('static/sectorCovers/caderno_geral.jpeg')} title="CADERNO GERAL" description="Caderno Geral" centered>
            <Button onClick={openOwnCompany} className="w-44 bg-primary p-2 rounded-md flex items-center justify-center text-white">
              Ver
            </Button>
          </SectorCard>
          {own.avatar && (
            <SectorCard src={apiAsset(own.avatar)} title={`CADERNO ${own.section}`} description={own.description} centered>
              <Button onClick={openOwnCompany} className="w-44 bg-primary p-2 rounded-md flex items-center justify-center text-white">
                Ver
              </Button>
            </SectorCard>
          )}
        </Card.Root>
      </section>
    );
  }

  const ordered = [...sectors].sort((a, b) => (a.section === 'All' ? -1 : b.section === 'All' ? 1 : a.section.localeCompare(b.section)));

  return (
    <>
      {indicatorOpen && (
        <Modal.Root closeModal={() => setIndicatorOpen(false)} className="w-[900px] px-20">
          <Modal.Title classes="mb-[4px] font-medium text-3xl">Cadastrar novo indicador</Modal.Title>
          <Modal.SubTitle className="text-[#6E727A]">Selecione o caderno que deseja cadastrar novos indicadores</Modal.SubTitle>
          <Modal.Content className="mt-8">
            <NewIndicatorForm />
          </Modal.Content>
        </Modal.Root>
      )}
      {sectorOpen && (
        <Modal.Root closeModal={() => setSectorOpen(false)} className="w-[900px] px-20">
          <Modal.Title classes="mb-[4px] font-medium text-3xl">Cadastrar novo Caderno</Modal.Title>
          <Modal.SubTitle className="text-[#6E727A]">Cadastre novos indicadores preenchendo os campos abaixo.</Modal.SubTitle>
          <Modal.Content className="mt-8">
            <NewSectorForm />
          </Modal.Content>
        </Modal.Root>
      )}
      <div className="px-6 pb-5 ml-56 bg-gray-50 h-full flex flex-col gap-2">
        <section className="flex flex-col gap-4 px-2">
          <h3 className="title-l">Indicadores</h3>
          <div className="flex justify-end items-center mb-4">
            <Button variant="outline-03" className="font-[15px] px-[36px] py-[8px] mr-4" size="free" onClick={() => setSectorOpen(true)}>
              CADASTRAR NOVO CADERNO
            </Button>
            <Button className="border-none text-white px-[36px] py-[8px]" onClick={() => setIndicatorOpen(true)} size="free">
              CADASTRAR NOVO INDICADOR
            </Button>
          </div>
        </section>
        <section className="px-2">
          <Card.Root className="flex justify-center items-top flex-wrap gap-10 py-[61px]">
            {ordered.map((s) => (
              <SectorCard
                key={s.section}
                src={apiAsset(s.avatar)}
                title={`CADERNO ${s.section === 'All' ? '' : 'SETORIAL '}${s.section === 'All' ? 'GERAL' : s.section}`}
                description={s.description}
              >
                {s.section !== 'All' && <DeleteSectorButton section={s.section} />}
              </SectorCard>
            ))}
          </Card.Root>
        </section>
      </div>
    </>
  );
}
