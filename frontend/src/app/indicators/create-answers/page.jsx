'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destroyCookie, parseCookies } from 'nookies';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiTrash2 } from 'react-icons/fi';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useIndicators } from '@/contexts/indicators';
import { FALLBACK_LEVELS } from '@/lib/constants';
import { getCatalogLevels } from '@/services/catalog';
import { answersSchema, PROGRESS, PROGRESS_DATA } from '@/lib/indicator-schemas';

/**
 * Níveis disponíveis vêm da versão de catálogo em vigor (`GET /catalog/levels`), não de uma
 * lista fixa: cada indicador tem suas alternativas e sua pontuação.
 */
function useLevelOptions() {
  const [options, setOptions] = useState(FALLBACK_LEVELS);
  useEffect(() => {
    getCatalogLevels()
      .then(({ data }) => {
        const names = [...new Set((data.levels || []).map((l) => l.name))];
        if (names.length) setOptions(names.map((name) => ({ text: name, value: name })));
      })
      .catch((err) => console.error('Erro ao obter os níveis do catálogo:', err));
  }, []);
  return options;
}

function SelectField({ form, name, placeholder, label, options }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className="w-[300px] relative">
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{label}</SelectLabel>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.text}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormMessage className="w-fit" />
        </FormItem>
      )}
    />
  );
}

/** Passo 3: respostas (2 a 6), cada uma com nível, pontuação e marcação de maturidade mínima exigida. */
function AnswersForm({ setOpenModal, setRequestIndicatorData }) {
  const [rows, setRows] = useState([1]);
  const [mandatoryIndex, setMandatoryIndex] = useState(null);
  const form = useForm({ resolver: zodResolver(answersSchema) });
  const levelOptions = useLevelOptions();

  const submit = (values) => {
    const answers = values.answers.map((a, i) => ({ ...a, mandatory: i === mandatoryIndex }));
    const progress = JSON.parse(parseCookies()[PROGRESS_DATA] || '{}');
    progress.hasMandatory = typeof mandatoryIndex === 'number';
    setRequestIndicatorData({ ...progress, answers });
    setOpenModal(true);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="w-[800px] space-y-6" noValidate autoComplete="off">
        {rows.map((_, i) => (
          <div key={`answer${i}@`} className="space-y-6">
            <FormField
              name={`answers.${i}.description`}
              control={form.control}
              render={({ field }) => (
                <FormItem className="group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full">
                  <FormControl>
                    <>
                      <Textarea placeholder="Digite uma descrição" className="resize-none peer h-36 py-5 input-base" {...field} value={field.value ?? ''} />
                      <FormLabel className="input-label-float -top-4 left-2 text-xs z-30">Descrição</FormLabel>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-6 items-center">
              <SelectField form={form} name={`answers.${i}.title`} placeholder="Nível de Maturidade" label="Selecione um Nível de Maturidade" options={levelOptions} />
              <FormField
                name={`answers.${i}.points`}
                control={form.control}
                render={({ field }) => (
                  <FormItem className="w-[160px] relative">
                    <FormControl>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="Pontuação"
                        aria-label="Pontuação do nível"
                        className="input-base h-12 w-full rounded-md border border-gray-200 px-4 text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="w-fit border border-neutral-02 p-1 hover:opacity-90"
                aria-label="Remover resposta"
                onClick={() => {
                  if (rows.length < 1) return;
                  form.unregister(`answers.${rows.length - 1}`);
                  setRows(rows.slice(0, rows.length - 1));
                }}
                disabled={rows.length <= 2}
              >
                <FiTrash2 size="24px" className="stroke-neutral " />
              </Button>
            </div>
            <FormField
              name={`answers.${i}.mandatory`}
              control={form.control}
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={mandatoryIndex === i} onCheckedChange={() => setMandatoryIndex(mandatoryIndex === i ? null : i)} />
                      <FormLabel className="font-medium text-lg text-zind-600">Mínimo exigido</FormLabel>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
        <Button type="button" size="lg" className="w-full" onClick={() => rows.length <= 5 && setRows([...rows, rows.length + 1])} disabled={rows.length > 5}>
          ADICIONAR OUTRA RESPOSTA
        </Button>
        <Button size="lg" className="w-full" variant="success" disabled={rows.length < 2}>
          SALVAR INDICADOR
        </Button>
      </form>
    </Form>
  );
}

export default function CreateAnswersPage() {
  const { registerIndicator } = useIndicators();
  const router = useRouter();
  const [title, setTitle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestData, setRequestData] = useState(null);

  useEffect(() => {
    try {
      setTitle(JSON.parse(localStorage.getItem('@title-indicator') || '""'));
    } catch {
      setTitle('');
    }
  }, []);

  const backToPanel = () => {
    destroyCookie(null, PROGRESS_DATA, { path: '/' });
    destroyCookie(null, PROGRESS, { path: '/' });
    router.push('/indicators');
  };

  return (
    <>
      {modalOpen && (
        <Modal.Root closeModal={() => setModalOpen(false)} className="w-[900px] px-20 rounded-2xl">
          <Modal.Title classes="mb-9 font-medium text-3xl text-center text-slate-800">
            Deseja cadastrar um novo indicador ou voltar para o painel de indicadores?
          </Modal.Title>
          <Modal.Content className="flex justify-between gap-16 w-full">
            <Button size="lg" className="w-full" onClick={() => registerIndicator(requestData)}>
              Cadastrar novo indicador
            </Button>
            <Button size="lg" className="w-full" variant="error" onClick={backToPanel}>
              voltar para o painel
            </Button>
          </Modal.Content>
        </Modal.Root>
      )}
      <section className="container lg:ml-56 bg-gray-50 h-full flex flex-col gap-5 pb-10">
        <Breadcrumb.Root>
          <Breadcrumb.OldPath href="/indicators">Indicadores</Breadcrumb.OldPath>
          <Breadcrumb.ArrowIcon />
          <Breadcrumb.OldPath href="/indicators/create-indicator">Criar Indicador</Breadcrumb.OldPath>
          <Breadcrumb.ArrowIcon />
          <Breadcrumb.CurrentPath>Cadastrar respostas</Breadcrumb.CurrentPath>
        </Breadcrumb.Root>
        <h3>Resposta para {title}</h3>
        <AnswersForm setOpenModal={setModalOpen} setRequestIndicatorData={setRequestData} />
      </section>
    </>
  );
}
