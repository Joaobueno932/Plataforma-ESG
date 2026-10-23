'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@iconify/react';
import { MdArrowBack, MdFlag } from 'react-icons/md';
import { IoCheckmark, IoInformationCircleOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { AnswerCard, AnswerCardMandatory, AnswerCardPoints, AnswerCardSelected, AnswerCardText, AnswerCardTitle } from '@/components/indicators/answer-card';
import { FilesTable } from '@/components/indicators/files-table';
import { GedUpload } from '@/components/indicators/ged-upload';
import { useIndicators } from '@/contexts/indicators';
import { LEVEL_LABEL } from '@/lib/constants';
import { formatDate, levelLabel, levelPresentation, sortAnswers } from '@/lib/format';
import { getQuestionReport, uploadCompanyFile } from '@/services/reports';

const answerSchema = z.object({ answerText: z.string().optional() });

function AnswerForm({ answerSelected, nonApplicable, report, companyId, setModalError }) {
  const [pending, setPending] = useState([]); // selecionados, ainda não confirmados com "ENVIAR ARQUIVO"
  const [queued, setQueued] = useState([]); // confirmados; sobem ao salvar
  const [addToGed, setAddToGed] = useState(false);
  const [error, setError] = useState(null);
  const { answerIndicator } = useIndicators();
  const form = useForm({ resolver: zodResolver(answerSchema), defaultValues: { answerText: report.answerText ?? '' } });

  const removeAt = (index, list, set) => {
    if (index < 0 || list.length <= 0 || index >= list.length) return;
    const copy = [...list];
    copy.splice(index, 1);
    set(copy);
  };

  const uploadQueued = async () => {
    const result = await Promise.all(
      queued.map(async (f) => {
        try {
          return (await uploadCompanyFile(companyId, f)).data;
        } catch (err) {
          console.error('Erro ao subir arquivo:', err);
          return undefined;
        }
      }),
    );
    if (result.some((r) => r === undefined)) {
      setModalError(true);
      return false;
    }
    return result;
  };

  const submit = async (values) => {
    const files = await uploadQueued();
    if (!files) return;
    answerIndicator(
      {
        filesToCreate: files,
        answerText: values.answerText && values.answerText.length > 0 ? values.answerText : undefined,
        addToGed,
        nonApplicable,
        answerId: nonApplicable ? undefined : answerSelected,
      },
      report.id,
      companyId,
    );
  };

  const pick = (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    if (f.size <= 52428800) {
      setPending([...pending, f]);
      setError(null);
      e.currentTarget.value = '';
    } else setError('O Arquivo selecionado excede o limite de 50mb. Selecione outro');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-8">
          <FormField
            name="answerText"
            control={form.control}
            render={({ field }) => (
              <div className="space-y-4">
                <FormItem className="group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full">
                  <FormControl>
                    <>
                      <Textarea placeholder="Digite uma descrição" className="resize-none peer h-36 py-5" {...field} />
                      <FormLabel className="input-label-float -top-4 left-2 text-xs z-40">Resposta</FormLabel>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <p className="text-sm">
                  Utilize este campo para discorrer sobre as práticas de sua empresa em relação a este indicador, ou mesmo para orientar o auditor sobre as
                  demais informações e documentos que você está apresentando como evidência. Recomendamos que você preencha este campo, para qualificar
                  sua resposta e aumentar as chances de aprovação.
                </p>
              </div>
            )}
          />
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <h3 className="font-semibold text-3xl">Upload</h3>
              <p className="text-sm">
                Faça upload dos seus arquivos através dos arquivos do seu computador, ou diretamente do Gerenciador Eletrônico de Documentos (GED)
              </p>
            </div>
            <div className="flex flex-col gap-2 w-[70%] overflow-hidden">
              <div className="flex gap-4 w-full">
                <div className=" flex justify-center bg-primary-main hover:bg-primary-main/90 text-neutral-01 h-10 rounded-sm transition duration-300 ease-in-outite w-1/2">
                  <Label htmlFor="fileInput" className="bg-transparent flex items-center justify-center flex-1 font-bold cursor-pointer uppercase">
                    upload meu computador
                    <Icon icon="basil:upload-solid" width={24} style={{ marginLeft: '8px' }} />
                  </Label>
                  <Input type="file" className="hidden" id="fileInput" onChange={pick} />
                </div>
                <GedUpload questionReportId={report.id} />
              </div>
              <span className="flex items-center gap-1 text-sm">
                <IoInformationCircleOutline />
                Selecione arquivos de até 50mb
              </span>
            </div>
            <FilesTable files={pending} remove={(i) => removeAt(i, pending, setPending)} />
            {error && (
              <span className="flex items-center gap-1 text-sm text-semantic-error">
                <IoInformationCircleOutline />
                {error}
              </span>
            )}
            <div className="flex gap-2 items-center">
              <Checkbox
                onClick={() => setAddToGed(true)}
                className="border-primary-main data-[state=checked]:bg-primary-main data-[state=checked]:text-white"
              />
              <span className="text-lg text-medium text-neutral-03">Salvar arquivo em GED (Gerenciador Eletrônico de Documentos)</span>
            </div>
            <Button
              className="max-w-[390px] bg-primary-main hover:bg-primary-main/90 disabled:bg-primary-main/60"
              disabled={pending.length <= 0}
              type="button"
              onClick={() => {
                setQueued([...queued, ...pending]);
                setPending([]);
              }}
            >
              <Icon icon="mingcute:send-line" className="mr-1" />
              ENVIAR ARQUIVO
            </Button>
            <div className="space-y-6 mt-5 mb-4">
              <h3 className="font-semibold text-3xl">Arquivos carregados</h3>
              <FilesTable files={[...report.files, ...queued]} remove={(i) => removeAt(i - report.files.length, queued, setQueued)} />
            </div>
          </div>
          <Button size="lg" variant="success" disabled={answerSelected == null && !nonApplicable} className="w-[60%]" type="submit">
            <span className="font-bold text-lg mr-1">Salvar</span>
            <IoCheckmark size="1.5rem" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ResponseIndicatorPage() {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [selected, setSelected] = useState(null);
  const [nonApplicable, setNonApplicable] = useState(true);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminder, setReminder] = useState('');
  const { addRedflag, removeRedflag } = useIndicators();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (nonApplicable) setSelected(null);
  }, [nonApplicable]);

  useEffect(() => {
    getQuestionReport(id)
      .then(({ data }) => {
        data.question.answers = sortAnswers(data.question.answers);
        setReport(data);
        setNonApplicable(data.nonApplicable);
        setHasReminder(!!data.redflag);
        if (data.selectedAnswer) setSelected(data.selectedAnswer.id);
      })
      .catch((err) => console.error('Erro ao obter o Indicator:', err));
  }, [id]);

  if (!report) return null;
  // O catálogo oficial tem campos próprios para descrição e verificação; o catálogo
  // demonstrativo herdado guardava os dois no mesmo texto, separados por "Verificação:".
  const cut = report.question.verification ? -1 : (report.question.description || '').indexOf('Verificação:');
  const descText = cut >= 0 ? report.question.description.slice(0, cut) : report.question.description;
  const verification = report.question.verification || (cut >= 0 ? report.question.description.slice(cut) : '');

  const reminderAction = (action) => {
    if (action === 'remove') {
      setHasReminder(false);
      removeRedflag(report.id, setReport);
    } else {
      setHasReminder(true);
      addRedflag(reminder || 'Não se aplica', report.id, setReport);
      setReminder('');
    }
    setReminderOpen(false);
  };

  return (
    <>
      {reminderOpen && (
        <Modal.Root closeModal={() => setReminderOpen(false)} btnClosed={false} className="flex flex-col gap-4 w-[70%] z-50">
          <Modal.Title classes="font-medium text-center text-slate-800 text-3xl">{hasReminder ? 'Tem certeza sobre isso ?' : 'O que gostaria de lembrar?'}</Modal.Title>
          <Modal.Content className="space-y-4">
            {!hasReminder && (
              <div className="group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full">
                <Textarea placeholder="Digite uma descrição" className="resize-none peer h-36 py-5 input-base" onChange={(e) => setReminder(e.currentTarget.value)} value={reminder} />
                <Label className="input-label-float -top-2 left-2 text-xs z-30">Descrição</Label>
              </div>
            )}
            <div className="flex justify-center gap-14">
              <Button size="lg" variant="error" className="w-1/2" onClick={() => setReminderOpen(false)}>
                Cancelar
              </Button>
              <Button size="lg" variant="success" className="w-1/2" onClick={() => reminderAction(hasReminder ? 'remove' : 'add')}>
                <span className="font-bold text-lg mr-1">{hasReminder ? 'Excluir' : 'Salvar'}</span>
                {!hasReminder && <IoCheckmark size="1.5rem" className="stroke-white" />}
              </Button>
            </div>
          </Modal.Content>
        </Modal.Root>
      )}
      {errorOpen && (
        <Modal.Root closeModal={() => setErrorOpen(false)} className="flex flex-col items-center w-[639px]">
          <Icon icon="ph:x-circle-bold" className="text-semantic-error w-32 h-32" />
          <Modal.Title classes="text-neutral text-3xl">Erro</Modal.Title>
          <Modal.Content>
            <p className="text-xl font-semibold text-semantic-error text-center">
              Já existe um arquivo com esse nome ou ele contém caracteres não permitidos, como espaços. Renomeie o arquivo e tente novamente.
            </p>
          </Modal.Content>
        </Modal.Root>
      )}
      <section className="container space-y-6 pb-10">
        <Link
          href={`/companies/${report.report.companyId}`}
          className="bg-primary-03 hover:bg-primary-03/90 px-6 py-1 rounded-md shadow-md text-white text-base flex items-center gap-1 w-fit"
        >
          <MdArrowBack size="1.5rem" />
          VOLTAR
        </Link>
        <div className="space-y-8">
          <h3>
            {report.question.codeOriginal || report.question.code}: {report.question.title}
          </h3>
          {(report.question.topic || report.question.ods) && (
            <p className="text-sm text-neutral-03">
              {report.question.topic && <span>Tópico: {report.question.topic}</span>}
              {report.question.topic && report.question.ods && <span> · </span>}
              {report.question.ods && <span>ODS: {report.question.ods}</span>}
              {report.question.maxPoints != null && <span> · Máximo: {report.question.maxPoints} pts</span>}
            </p>
          )}
          <p>
            <span className="font-bold mr-1">Descrição:</span>
            {descText}
          </p>
          <p className="w-full">
            <span className="font-bold mr-1">Verificação:</span>
            {verification.replace('Verificação:', '')}
          </p>
          <ul className="flex space-x-3 w-full">
            {report.question.answers.map((a) => (
              <AnswerCard key={a.id} variant={selected && selected !== a.id ? 'disabled' : levelPresentation(a)}>
                <AnswerCardTitle>{levelLabel(a, LEVEL_LABEL)}</AnswerCardTitle>
                <AnswerCardPoints>{a.points}</AnswerCardPoints>
                <AnswerCardText>{a.description}</AnswerCardText>
                {a.mandatory && <AnswerCardMandatory />}
                {selected && selected === a.id && <AnswerCardSelected />}
                <Button
                  className="w-full"
                  size="lg"
                  variant={selected && selected !== a.id ? 'neutral-02' : selected === a.id ? 'success' : 'card-answer'}
                  onClick={() => {
                    setSelected(a.id);
                    setNonApplicable(false);
                  }}
                >
                  Selecionar
                </Button>
              </AnswerCard>
            ))}
          </ul>
          <div className="space-x-4 mt-2">
            <Button size="lg" onClick={() => setReminderOpen(true)} className={hasReminder ? 'bg-primary-03' : 'bg-primary'}>
              {hasReminder ? 'Excluir Lembrete' : 'Lembrar-me'}
              <div className="relative">
                <MdFlag size="1.25rem" className="ml-1 fill-semantic-error [&[data-state=open]>svg]:rotate-0" />
                {hasReminder && <div className="absolute top-2 left-[0.5px] -rotate-45 bg-white h-[1.5px] w-5" />}
              </div>
            </Button>
            <Button
              size="lg"
              variant="error"
              disabled={nonApplicable}
              onClick={() => {
                setNonApplicable(true);
                reminderAction('add');
              }}
            >
              Não se aplica
            </Button>
          </div>
          {report.redflagIssuer && (
            <div
              className={`${report.redflagIssuer.role === 'CONSULTOR' ? 'bg-[#FFF1BF]' : 'bg-[#FCC7C7]'}  rounded-lg min-h-[64px] h-fit w-full px-4 py-2 flex flex-col flex-wrap justify-center`}
            >
              <p className="font-semibold text-base">
                <span className="inline-block mr-2">
                  <MdFlag size="1.25rem" className="ml-1  fill-semantic-error [&[data-state=open]>svg]:rotate-0" />
                </span>
                {report.redflag}
              </p>
              <span>{formatDate(report.redflag_date)}</span>
            </div>
          )}
          <AnswerForm answerSelected={selected} nonApplicable={nonApplicable} report={report} companyId={report.report.companyId} setModalError={setErrorOpen} />
        </div>
      </section>
    </>
  );
}
