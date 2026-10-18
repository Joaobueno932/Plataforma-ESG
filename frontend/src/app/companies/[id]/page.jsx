'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseCookies } from 'nookies';
import { Icon } from '@iconify/react';
import { MdFlag, MdPeopleOutline } from 'react-icons/md';
import { BiTrash } from 'react-icons/bi';
import { IoCheckmark, IoInformationCircleOutline } from 'react-icons/io5';
import { TbSend } from 'react-icons/tb';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FileChip } from '@/components/ui/file-chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AnswerCard, AnswerCardMandatory, AnswerCardPoints, AnswerCardSelected, AnswerCardText, AnswerCardTitle } from '@/components/indicators/answer-card';
import { FilesTable } from '@/components/indicators/files-table';
import { GedUpload } from '@/components/indicators/ged-upload';
import { useAuth } from '@/contexts/auth';
import { useCompanies } from '@/contexts/companies';
import { useIndicators } from '@/contexts/indicators';
import { LEVEL_LABEL, QUESTION_STATUS_COLOR, QUESTION_STATUS_LABEL, REPORT_STATUS_LABEL } from '@/lib/constants';
import { firstName, formatDate, formatMonthDay, levelIndex } from '@/lib/format';
import { notify, updateToast } from '@/lib/toast';
import { getCompany } from '@/services/companies';
import { addAnswerer, changeQuestionStatus, uploadCompanyFile } from '@/services/reports';
import { deleteQuestion } from '@/services/questions';

const LOCKED = ['Auditing', 'Approved', 'Rejected'];
const ANSWERER_ROLES = ['MANAGER', 'EMPLOYEE'];
const CATEGORY_ORDER = { E: 1, S: 2, G: 3 };
const RESPOND_LINK = 'bg-primary h-10 rounded-md px-8 text-white font-medium text-xl shadow-md flex justify-center items-center';

/* ---------- Tabela "Tópicos por Usuário" ---------- */
function TopicsByUser({ usersByCompany, reportsIndicator }) {
  const byUser = (id, pending) =>
    reportsIndicator?.filter((r) => r.answerer?.id === id && (pending === undefined || (r.status === 'Pending') === pending)).length;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead className="text-center">Respondidas</TableHead>
          <TableHead className="text-center">Não Respondidas</TableHead>
          <TableHead className="text-center">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usersByCompany
          ?.filter((u) => u.role !== 'CONSULTOR')
          .map((u) => (
            <TableRow key={u.id} className="h-[4.5rem]">
              <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
              <TableCell className="text-zinc-400 text-center">{byUser(u.id, false)}</TableCell>
              <TableCell className="text-zinc-400 text-center">{byUser(u.id, true)}</TableCell>
              <TableCell className="text-zinc-400 text-center">{byUser(u.id)}</TableCell>
            </TableRow>
          ))}
        <TableRow className="h-[72px]">
          <TableCell className="font-medium text-slate-800">Total</TableCell>
          <TableCell className="text-center font-bold text-slate-500">{reportsIndicator?.filter((r) => r.status !== 'Pending').length}</TableCell>
          <TableCell className="text-center font-bold text-slate-500">{reportsIndicator?.filter((r) => r.status === 'Pending').length}</TableCell>
          <TableCell className="text-center font-bold text-slate-500">{reportsIndicator?.length}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}

/* ---------- Validação por Gestor / Consultor ---------- */
function ValidationActions({ report, toRespond }) {
  const [open, setOpen] = useState(false);
  const [veredict, setVeredict] = useState(null);
  const [comment, setComment] = useState('');
  const { validateIndicator } = useIndicators();
  const canValidate = ['PendingValidationByManager', 'ApprovedByManager'].includes(report.status);
  const save = () => {
    validateIndicator(report.id, { veredict: veredict === 'approved', ...(comment.length > 0 && { redflag: comment }) });
    setOpen(false);
  };
  return (
    <>
      {open && (
        <Modal.Root closeModal={() => setOpen(false)} btnClosed={false} className="flex flex-col gap-4 w-[70%] z-50">
          <Modal.Title classes="font-medium text-center text-slate-800 text-3xl">Adicionar um comentário</Modal.Title>
          <Modal.Content className="space-y-4">
            <div className="group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full">
              <Textarea placeholder="Deixe um comentário" className="resize-none peer h-36 py-5 input-base" onChange={(e) => setComment(e.currentTarget.value)} value={comment} />
              <Label className="input-label-float -top-2 left-2 text-xs z-30">Comentário</Label>
            </div>
            <div className="flex justify-center gap-14">
              <Button size="lg" variant="error" className="w-1/2" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="lg" variant="success" className="w-1/2" onClick={save} disabled={comment.length <= 0 && veredict === 'reproved'}>
                <span className="font-bold text-lg mr-1">Salvar</span>
                <IoCheckmark size="1.5rem" className="stroke-white" />
              </Button>
            </div>
          </Modal.Content>
        </Modal.Root>
      )}
      <div className="flex gap-4">
        {canValidate && (
          <>
            {report.status === 'PendingValidationByManager' && (
              <Button size="lg" variant="success" className="text-xl" onClick={() => (setOpen(true), setVeredict('approved'), setComment(''))}>
                Aprovar
              </Button>
            )}
            <Button size="lg" variant="error" className="text-xl" onClick={() => (setOpen(true), setVeredict('reproved'), setComment(''))}>
              Reprovar
            </Button>
          </>
        )}
        {toRespond && (
          <Link href={`/indicators/response-indicator/${report.id}`} className={RESPOND_LINK}>
            {report.status !== 'Pending' ? 'Editar' : 'Responder'}
          </Link>
        )}
      </div>
    </>
  );
}

/* ---------- Avaliação pelo Auditor / Supervisor ---------- */
function AuditActions({ report }) {
  const { validateQuestionByAuditor, markNonApplicableByAuditor } = useIndicators();
  const [observation, setObservation] = useState('');
  const [missingObservation, setMissingObservation] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const pick = (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    if (f.size <= 52428800) {
      setFiles([...files, f]);
      setError(null);
      e.currentTarget.value = '';
    } else setError('O Arquivo selecionado excede o limite de 50mb. Selecione outro');
  };

  const uploadAll = async () => {
    const result = await Promise.all(
      files.map(async (f) => {
        try {
          const { data } = await uploadCompanyFile(report.id, f);
          return { fileType: f.type, name: f.name, url: data.url };
        } catch (err) {
          console.error('Erro ao subir arquivo:', err);
          return undefined;
        }
      }),
    );
    return !result.some((r) => r === undefined) && result;
  };

  const act = async (status) => {
    if (status === 'NonApplicable') return markNonApplicableByAuditor(report.id);
    if (observation.length <= 0) return setMissingObservation(true);
    setMissingObservation(false);
    const evidence = await uploadAll();
    if (!evidence) return notify('Erro interno ao subir arquivo de upload', 'error');
    validateQuestionByAuditor({ status, redflag: observation, evidence: evidence.length ? evidence : null }, report.id);
  };

  return (
    <div className="pl-1 space-y-6">
      <div className="group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full">
        {missingObservation && (
          <p className="text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600">O campo de Observação é obrigátorio</p>
        )}
        <Textarea
          className="resize-none peer h-36 py-5 input-base w-[43.75rem]"
          onChange={(e) => {
            setObservation(e.currentTarget.value);
            setMissingObservation(false);
          }}
        />
        <Label className="input-label-float -top-2 left-2 text-xs z-30">Observações*</Label>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-3xl">Upload</h3>
        <p className="text-sm">Faça upload dos seus arquivos através dos arquivos do seu computador, ou diretamente do Gerenciador Eletrônico de Documentos (GED)</p>
      </div>
      <div className="flex flex-col gap-2 w-[70%] overflow-hidden">
        <div className="flex gap-4 w-full">
          <div className=" flex justify-center bg-primary-main hover:bg-primary-main/90 text-neutral-01 h-10 rounded-sm transition duration-300 ease-in-outite w-1/2">
            <Label htmlFor={`fileInput-${report.id}`} className="bg-transparent flex items-center justify-center flex-1 font-bold cursor-pointer uppercase">
              upload meu computador
              <Icon icon="basil:upload-solid" width={24} style={{ marginLeft: '8px' }} />
            </Label>
            <Input type="file" className="hidden" id={`fileInput-${report.id}`} onChange={pick} />
          </div>
        </div>
        <span className="flex items-center gap-1 text-sm">
          <IoInformationCircleOutline />
          Selecione arquivos de até 50mb
        </span>
        {error && <span className="flex items-center gap-1 text-sm text-semantic-error">{error}</span>}
      </div>
      <ul className="flex flex-wrap items-center gap-3">
        {files.map((f, i) => (
          <FileChip key={`file-${i}`} fileToRender={f} removeFile={() => setFiles(files.filter((_, k) => k !== i))} />
        ))}
      </ul>
      <div className="flex gap-4">
        <Button size="lg" variant="success" onClick={() => act('Approved')}>
          SALVAR
          <IoCheckmark size="1.5rem" className="" />
        </Button>
        <Button size="lg" variant="error" onClick={() => act('Rejected')}>
          REPROVAR
        </Button>
        <Button size="lg" onClick={() => act('NonApplicable')}>
          NÃO SE APLICA
        </Button>
        <Button size="lg" variant="dark-blue" onClick={() => act('PendingRevision')} type="button">
          PEDIR COMPLEMENTO
        </Button>
        <Link href={`/indicators/response-indicator/${report.id}`} className={RESPOND_LINK}>
          Editar
        </Link>
      </div>
    </div>
  );
}

function RoleActions({ toRespond, reportIndicator, canResponse }) {
  const { userLogged } = useAuth();
  const role = userLogged?.role;
  if (role === 'EMPLOYEE' && toRespond)
    return (
      <Link href={`/indicators/response-indicator/${reportIndicator.id}`} className="bg-primary p-2 px-4 text-white font-medium text-xl rounded-md shadow-md">
        {reportIndicator.status !== 'Pending' ? 'Editar' : 'Responder'}
      </Link>
    );
  if (role === 'MANAGER' || role === 'CONSULTOR') return <ValidationActions report={reportIndicator} toRespond={canResponse} />;
  if ((role === 'AUDITOR' && reportIndicator.status === 'Auditing') || role === 'SUPERVISOR') return <AuditActions report={reportIndicator} />;
  return null;
}

/* ---------- Edição de respostas (ADMIN) ---------- */
function EditableAnswerCard({ answer, reportIndicator }) {
  const { updateAnswer, deleteAnswer } = useIndicators();
  const [confirm, setConfirm] = useState(false);
  const [draft, setDraft] = useState({ points: answer.points, description: answer.description, mandatory: answer.mandatory });
  const unchanged = draft.description === answer.description && draft.points === answer.points && draft.mandatory === answer.mandatory;
  return (
    <>
      {confirm && (
        <Modal.Root closeModal={() => setConfirm(false)} className="px-14 py-6 w-[500px]">
          <Modal.Content>
            <h3 className="mb-10">Tem certeza que deseja deletar essa pergunta?</h3>
            <section className="flex items-center">
              <Button onClick={() => (setConfirm(false), deleteAnswer(answer.id))} variant="alert" size="lg" className="mr-3">
                Confirmar
              </Button>
              <Button onClick={() => setConfirm(false)} size="lg">
                Cancelar
              </Button>
            </section>
          </Modal.Content>
        </Modal.Root>
      )}
      <AnswerCard variant={reportIndicator.nonApplicable ? 'disabled' : answer.title}>
        <AnswerCardTitle>{LEVEL_LABEL[answer.title]}</AnswerCardTitle>
        <select value={draft.points} onChange={(e) => setDraft({ ...draft, points: parseInt(e.target.value, 10) })} className="text-black p-[8px]  rounded-lg">
          {[0, 2, 4, 6, 8, 10].map((p) => (
            <option key={p} value={p}>
              {p} pts
            </option>
          ))}
        </select>
        <textarea
          placeholder={answer.description}
          defaultValue={answer.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="h-56 appearance-none flex w-full rounded-md border bg-white py-1 text-primary transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white"
        />
        <section className="flex items-center">
          <Checkbox id={`mandatory-${answer.id}`} checked={draft.mandatory} onClick={() => setDraft({ ...draft, mandatory: !draft.mandatory })} />
          <label htmlFor={`mandatory-${answer.id}`} className="ml-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Obrigatória
          </label>
        </section>
        <Button variant="outline-white" onClick={() => setConfirm(true)}>
          Excluir
        </Button>
        <Button
          variant="outline-white"
          className="disabled:bg-inherit"
          disabled={unchanged}
          onClick={() => updateAnswer(reportIndicator.questionId, answer.id, answer.title, draft.points, draft.description, draft.mandatory)}
        >
          Salvar
        </Button>
      </AnswerCard>
    </>
  );
}

function DeleteQuestionButton({ questionId }) {
  const [open, setOpen] = useState(false);
  const remove = async () => {
    const id = notify('Deletando...', 'loading');
    try {
      await deleteQuestion(questionId);
      updateToast(id, 'Indicador deletado com sucesso!', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      updateToast(id, 'Erro ao deletar caderno.', 'error');
    }
  };
  return (
    <>
      {open && (
        <Modal.Root closeModal={() => setOpen(false)} className="w-[300px] flex flex-col items-center gap-6">
          <Modal.Title classes="text-3xl font-bold text-primary-03 text-center">Tem certeza que deseja deletar esse indicador?</Modal.Title>
          <Modal.Content className="max-w-[33.25rem] flex flex-col gap-4">
            <div className="flex flex-col gap-5">
              <Button
                onClick={() => (setOpen(false), remove())}
                className="border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-white px-6 py-2 rounded-md flex justify-center items-center gap-2"
              >
                Sim, deletar.
              </Button>
            </div>
          </Modal.Content>
        </Modal.Root>
      )}
      <div className="flex flex-col gap-2">
        <Button className="" variant="outline-white" onClick={() => setOpen(true)}>
          <BiTrash size="1.25rem" />
          Deletar
        </Button>
      </div>
    </>
  );
}

/* ---------- Indicador (acordeão) ---------- */
function IndicatorItem({ reportIndicator, remember = false, company }) {
  const { userLogged } = useAuth();
  const { updateQuestion } = useIndicators();
  const { id, question, status, selectedAnswer, answerer } = reportIndicator;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: question.title, description: question.description });
  const cut = question.description.indexOf('Verificação:');
  const descText = cut >= 0 ? question.description.slice(0, cut) : question.description;
  const verification = cut >= 0 ? question.description.slice(cut) : '';
  const reportStatus = company?.report?.status;
  const answers = [...question.answers].sort((a, b) => levelIndex(a.title) - levelIndex(b.title));

  const assign = async (userId) => {
    try {
      await addAnswerer(id, { user: userId });
      notify('Usúario atribuido com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao vincular o usuário a pergunta:', err);
      notify(err?.response?.data?.message || 'Erro ao vincular o usuário a pergunta', 'error');
    }
  };

  const reopen = async () => {
    const target = reportStatus === 'Auditing' ? 'Auditing' : 'Pending';
    try {
      await changeQuestionStatus(id, target);
      notify(target === 'Auditing' ? 'Status alterado para Em auditoria' : 'Status alterado para Aguardando resposta', 'success');
    } catch {
      notify('Erro interno ao tentar mudar status da questao', 'error');
    }
    setTimeout(() => window.location.reload(), 500);
  };

  if (!userLogged) return null;
  const role = userLogged.role;
  const isAdmin = role === 'ADMIN';

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1" className="">
        <div className="flex justify-between bg-primary rounded-md px-2">
          <div className="flex items-center space-x-2">
            <AccordionTrigger classNameIcon="hidden" className="hover:no-underline">
              <h4 className="text-white text-xl font-bold">
                {question.code}: {question.title}
              </h4>
            </AccordionTrigger>
            {remember && <MdFlag size="1.25rem" className="ml-1 fill-semantic-error [&[data-state=open]>svg]:rotate-0" />}
          </div>
          <div className="flex items-center space-x-2">
            <Button className={`text-neutral ${QUESTION_STATUS_COLOR[status] ?? ''}`}>{QUESTION_STATUS_LABEL[status]}</Button>
            {isAdmin && (
              <Button onClick={() => setEditing(!editing)} variant="outline-white">
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
            )}
            {isAdmin && <DeleteQuestionButton questionId={question.id} />}
            <AccordionTrigger classNameIcon="w-10 h-10 text-white" className="hover:no-underline" aria-label="Expandir" />
          </div>
        </div>
        <AccordionContent subClassName="space-y-4 py-4">
          {isAdmin && (reportStatus === 'Auditing' || reportStatus === 'Pending') && (
            <a
              onClick={reopen}
              className="inline-flex items-center justify-center rounded-md text-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 bg-primary-main hover:bg-primary-main/90 shadow-sm text-white h-9 py-2 cursor-pointer font-extrabold px-10"
            >
              REABRIR INDICADOR
            </a>
          )}
          {editing && <p className="text-[#414141] text-base">Título do questionário</p>}
          <h3 className="flex items-center">
            {question.code}:
            {editing ? (
              <Input placeholder={question.title} defaultValue={question.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="text-2xl font-semibold" />
            ) : (
              question.title
            )}
          </h3>
          {editing && (
            <section>
              <p className="text-[#414141] text-base">Descrição</p>
              <p className="text-[#626262] text-base">
                *Por favor, divida seu texto com a descrição desejada e depois adicione “Verificação:” e escreva o que desejar, como abaixo.
              </p>
              <textarea
                placeholder={question.description}
                defaultValue={question.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="h-56 appearance-none flex w-full rounded-md border bg-transparent py-1 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white"
              />
            </section>
          )}
          {editing && (
            <Button
              variant="success"
              className="disabled:text-gray-700 disabled:border-gray-700"
              disabled={question.description === draft.description && question.title === draft.title}
              onClick={() => updateQuestion(question.id, draft.title, draft.description)}
            >
              Salvar <IoCheckmark size="1.5rem" className="ml-2" />
            </Button>
          )}
          {!editing && (
            <p>
              <span className="font-bold mr-1">Descrição:</span>
              {descText}
            </p>
          )}
          {!editing && (
            <p className="w-full">
              <span className="font-bold mr-1">Verificação:</span>
              {verification.replace('Verificação:', '')}
            </p>
          )}
          <ul className="flex space-x-2 w-full">
            {editing
              ? answers.map((a) => <EditableAnswerCard key={a.id} answer={a} reportIndicator={reportIndicator} />)
              : answers.map((a) => (
                  <AnswerCard key={a.id} variant={reportIndicator.nonApplicable ? 'disabled' : a.title}>
                    <AnswerCardTitle>{LEVEL_LABEL[a.title]}</AnswerCardTitle>
                    <AnswerCardPoints>{a.points}</AnswerCardPoints>
                    <AnswerCardText>{a.description}</AnswerCardText>
                    {a.mandatory && <AnswerCardMandatory />}
                    {selectedAnswer?.id === a.id && <AnswerCardSelected />}
                  </AnswerCard>
                ))}
          </ul>
          {reportIndicator.nonApplicable && <h4 className="font-bold text-lg uppercase">Não se aplica!</h4>}
          {reportIndicator.redflagIssuer && (
            <div
              className={`${reportIndicator.redflagIssuer.role === 'CONSULTOR' ? 'bg-[#FFF1BF]' : 'bg-[#FCC7C7]'}  rounded-lg min-h-[64px] h-fit w-full px-4 py-2 flex flex-col flex-wrap justify-center`}
            >
              <p className="font-semibold text-base">
                <span className="inline-block mr-2">
                  <MdFlag
                    size="1.25rem"
                    className={`ml-1 ${reportIndicator.redflagIssuer.role === 'CONSULTOR' ? 'fill-semantic-alert' : 'fill-semantic-error'}  [&[data-state=open]>svg]:rotate-0`}
                  />
                </span>
                {reportIndicator.redflag}
              </p>
              <span>{formatDate(reportIndicator.redflag_date)}</span>
            </div>
          )}
          <div>
            {(role === 'MANAGER' || role === 'CONSULTOR') &&
              ['Pending', 'PendingRevision', 'PendingValidationByManager', 'ApprovedByManager', 'RejectedByManager', 'ApprovedByConsultor'].includes(status) && (
                <Select onValueChange={assign} defaultValue={answerer?.id ?? undefined}>
                  <SelectTrigger className="w-40 mb-5">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Selecione um Responsável</SelectLabel>
                      {company?.users
                        ?.filter((u) => ANSWERER_ROLES.includes(u.role))
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id} className="border-b py-4">
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            {reportIndicator.answerText && (
              <div className="mb-4 mt-2">
                <p>
                  <span className="font-bold mr-1">Resposta: </span>
                  {reportIndicator.answerText}
                </p>
              </div>
            )}
            {reportIndicator.files.length > 0 && <FilesTable files={reportIndicator.files} />}
            <ul className="mb-4 flex flex-wrap gap-5">
              {role === 'SUPERVISOR' || role === 'ADMIN' ? (
                <div />
              ) : role === 'AUDITOR' && status === 'Auditing' ? (
                <GedUpload questionReportId={id} />
              ) : role === 'AUDITOR' || LOCKED.includes(status) ? (
                <div />
              ) : (
                <GedUpload questionReportId={id} />
              )}
            </ul>
            {reportIndicator.evidences.length > 0 && <FilesTable files={reportIndicator.evidences} />}
            <RoleActions toRespond={answerer?.id === userLogged.id && !LOCKED.includes(status)} reportIndicator={reportIndicator} canResponse={!LOCKED.includes(status)} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/* ---------- Cabeçalho com dados do relatório ---------- */
function ReportSummary({ company, reports }) {
  if (!reports || !company) return null;
  const end = new Date(reports.initialYear);
  end.setFullYear(end.getFullYear() + 1);
  const info = {
    consultor: firstName(reports.consultors),
    managers: firstName(reports.managers),
    initialYear: formatMonthDay(reports.initialYear),
    finalYear: formatMonthDay(end.toISOString()),
  };
  const Item = ({ label, children }) => (
    <span className="label-s text-neutral">
      {label} <span className="label-s text-neutral-03">{children}</span>
    </span>
  );
  return (
    <div className="flex">
      <div className="flex flex-col space-y-3 w-1/2">
        <Item label="Status da estrutura:">{REPORT_STATUS_LABEL[reports.status]}</Item>
        <Item label="Estrutura:">{reports.structure}</Item>
        <Item label="Descrição:">{reports.description}</Item>
      </div>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
          <Item label="Ano Inicial:">{info.initialYear}</Item>
          <Item label="Ano Final:">{info.finalYear}</Item>
        </div>
      </div>
    </div>
  );
}

function CompanyDetails({ company, reportsIndicator, reports }) {
  const { userLogged } = useAuth();
  const { submitToAuditor } = useCompanies();
  const { submitReport, finishAuditoryReport } = useIndicators();
  if (!company) return null;
  const role = userLogged?.role;
  const byCategory = (a, b) => CATEGORY_ORDER[a.question.category] - CATEGORY_ORDER[b.question.category];
  const general = reportsIndicator?.filter((r) => r.question.section === 'All').sort(byCategory);
  const sectoral = reportsIndicator?.filter((r) => r.question.section !== 'All').sort(byCategory);
  const all = (statuses) => reportsIndicator?.length > 0 && reportsIndicator.every((r) => statuses.includes(r.status));

  return (
    <section className="flex flex-col gap-9">
      <div className="flex justify-between">
        <h3 className="font-medium text-2xl text-slate-900">Detalhes da Empresa</h3>
        {role === 'AUDITOR' && all(['ApprovedByAuditor', 'RejectedByAuditor']) && reports?.status !== 'Audited' && (
          <Button className="gap-2 px-10" onClick={submitReport}>
            SUBMETER RELATÓRIO
            <TbSend size="1.125rem" />
          </Button>
        )}
        {role === 'SUPERVISOR' && all(['Approved', 'Rejected']) && reports?.status === 'Auditing' && (
          <Button className="gap-2 px-10" onClick={() => finishAuditoryReport(company.id)}>
            FINALIZAR AUDITORIA
            <TbSend size="1.125rem" />
          </Button>
        )}
      </div>
      <Card.Root className="flex flex-col gap-12 px-4 py-8 shadow-md shadow-black/20">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <h3 className="font-medium text-2xl text-slate-900">{company.bussinessName}</h3>
            </AccordionTrigger>
            <AccordionContent>
              <ReportSummary company={company} reports={reports} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="flex items-center space-x-2">
              <MdPeopleOutline size="32px" />
              <h3>Tópicos por Usuário</h3>
            </div>
            <div className="flex items-center gap-20">
              {role === 'ADMIN' && all(['ApprovedByManager', 'ApprovedByConsultor']) && (
                <Button onClick={() => submitToAuditor(company.id)}>Submeter para Auditoria</Button>
              )}
            </div>
          </div>
          <TopicsByUser usersByCompany={company.users} reportsIndicator={reportsIndicator} />
        </div>
      </Card.Root>
      <section className="space-y-4">
        <ul className="space-y-2">
          {general?.map((r) => (
            <IndicatorItem key={r.id} remember={false} reportIndicator={r} company={company} />
          ))}
          {sectoral?.map((r) => (
            <IndicatorItem key={r.id} remember={false} reportIndicator={r} company={company} />
          ))}
        </ul>
        {role === 'AUDITOR' && all(['Approved', 'Rejected']) && reports?.status !== 'Audited' && (
          <Button className="gap-2 px-10 w-[50%]" size="lg" onClick={submitReport}>
            SUBMETER RELATÓRIO
            <TbSend size="1.125rem" />
          </Button>
        )}
      </section>
    </section>
  );
}

export default function CompanyPage() {
  const [company, setCompany] = useState(null);
  const [oldPath, setOldPath] = useState('/companies');
  const { userLogged } = useAuth();
  const { getAndSetReports, getAndSetIndicatorBySector, reporstCompany, indicatorsBySector } = useIndicators();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const cookies = parseCookies();
    if (cookies.oldPath) setOldPath(cookies.oldPath);
  }, []);

  useEffect(() => {
    if (!userLogged) return;
    getCompany(id)
      .then(({ data }) => {
        setCompany(data);
        getAndSetIndicatorBySector(data.report.id);
        getAndSetReports(data.report.id);
      })
      .catch((err) => console.error('Erro ao obter a Empresa:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userLogged]);

  return (
    <div className="ml-56 px-8 flex flex-col gap-4 pb-20">
      <Breadcrumb.Root>
        <Breadcrumb.OldPath href={oldPath}>{{ companies: 'Empresas', indicators: 'Indicadores' }[oldPath.slice(1)] ?? 'Empresas'}</Breadcrumb.OldPath>
        <Breadcrumb.ArrowIcon />
        <Breadcrumb.CurrentPath>Detalhes</Breadcrumb.CurrentPath>
      </Breadcrumb.Root>
      <CompanyDetails company={company} reportsIndicator={indicatorsBySector} reports={reporstCompany} />
    </div>
  );
}
