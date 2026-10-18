'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BsCheck2 } from 'react-icons/bs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useLeadForm } from '@/contexts/lead-form';
import { notify } from '@/lib/toast';

// Perguntas recuperadas do bundle original (módulo 35330).
const DIAGNOSTIC = [
  { value: 'Sua empresa já realizou um diagnóstico para identificar/avaliar as atuais ações de sustentabilidade e ESG?' },
  { value: 'Se sim, a resposta obtida no questionário de diagnóstico contou com a participação de responsáveis de diversas áreas da sua empresa.' },
  { value: 'A partir do resultado obtido no diagnóstico, foi realizada uma análise para identificar os pontos fortes e fracos do negócio com relação às atuais ações de sustentabilidade e ESG da sua empresa?' },
  { value: 'O diagnóstico das ações ESG da sua empresa contou com a ajuda de um especialista consultor externo?' },
  { value: 'Sua empresa já realizou em algum momento, diagnóstico de ESG anteriormente e foi percebida evolução de um diagnóstico para outro?' },
];

const LEGAL = [
  { value: 'Certidões de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União', description: 'Podem ser obtidas eletronicamente, no site da Receita Federal do Brasil' },
  { value: 'Licenças ambientais válidas' },
  { value: 'Certificados de Regularidade do IBAMA (CR)', description: 'Ver aplicabilidade na Lei n° 6.938/1981 e Instrução Normativa IBAMA Nº 13/2021' },
  { value: 'Planos de Gerenciamento de Resíduos Sólidos (PGRS)' },
  { value: 'Certificados de Licença de Funcionamento (CLF) - Polícia Federal', description: 'Ver aplicabilidade na Lei n° 10.357/2001' },
  { value: 'Certificado de Registro Cadastral (CRC) - Ministério da Defesa (Exército)', description: 'Ver aplicabilidade na Portaria MJSP n° 240/2019' },
  { value: 'Alvarás de funcionamento' },
  { value: 'Alvarás Sanitários (refeitórios e ambulatórios)', description: '' },
  { value: 'Portarias de outorga de uso da água emitida por órgão competente' },
  { value: 'Certificados de Destinação Final dos resíduos sólidos (CDF)' },
  { value: 'Certificados de regularidade do FGTS Fundamental', description: 'Podem ser obtidos eletronicamente, no site da Caixa Econômica Federal' },
  { value: 'Programas de Gerenciamento de Riscos (PGR)', description: 'Ver aplicabilidade na Portaria SEPRT Nº 6.730, de 09 de março de 2020 e Norma Regulamentadora (NR) 01' },
  { value: 'Programas de Controle Médico de Saúde Ocupacional (PCMSO)', description: 'Programas de Controle Médico de Saúde Ocupacional (PCMSO)' },
  { value: 'Certificados de Conformidade do Corpo de Bombeiros Militar do Estado do Mato Grosso do Sul (CBMMS)' },
  { value: 'Certidões negativa de débitos trabalhistas', description: 'Podem ser obtidas eletronicamente, por meio do site da Justiça do Trabalho' },
  { value: 'Inexistência de trabalho infantil, forçado ou análogo ao escravo', tag: 'Fundamental' },
  { value: 'Inexistência de trabalho estrangeiro irregular', tag: 'Fundamental' },
];

const MATERIALITY = [
  { value: 'Sua empresa já identificou indicadores relevantes para a evolução da agenda ESG da sua empresa, indicadores estes relacionados à materialidade da sua empresa?' },
  { value: 'Sua empresa já realiza gestão de indicadores relevantes em planilhas ou em softwares?' },
  { value: 'A diretoria participou da pesquisa para a definição da relevância dos temas na perspectiva do desenvolvimento da empresa?' },
  { value: 'Os indicadores apresentam metas de atendimento, com planos de ação alinhados à estratégia de desenvolvimento da empresa?' },
  { value: 'A gestão dos indicadores passa por auditorias externas periódicas?' },
  { value: 'Sua empresa tem experiência de mais de um ano em gestão de indicadores e metas ESG?' },
  { value: 'A empresa irá fazer/faz um relatório de sustentabilidade seguindo frameworks de referência? (ex.: GRI)' },
  { value: 'Se sim, as informações coletadas para o relatório contaram com a participação de diferentes colaboradores da sua empresa e apresentam a devida evidência?' },
  { value: 'A empresa já divulgou outros relatórios e, no relatório atual, apresentou de forma objetiva e transparente a evolução da agenda ESG dentro da empresa de um ano para o outro?' },
  { value: 'Os relatórios elaborados pela empresa a partir das informações coletadas são auditados por uma empresa de terceira parte?' },
  { value: 'Você tem interesse em saber mais sobre o Programa ESG-FIEMS?' },
];

const FUNDAMENTAL = [20, 21];
const YES_NO = ['Sim', 'Não'];
const LEGAL_OPTIONS = ['Não aplicável', 'Conforme', 'Não conforme'];
const LEGAL_START = DIAGNOSTIC.length;
const MATERIALITY_START = DIAGNOSTIC.length + LEGAL.length;
const FOLLOW_UP = { 0: 1, 28: 29 }; // "Se sim, ..." depende da resposta anterior

function summarize(answers) {
  const out = { nonApplicable: 0, applicable: 0, applicableNonCompliant: 0, fundamentalNonCompliant: 0 };
  for (const a of answers) {
    if (a === 'Não aplicável') out.nonApplicable++;
    else if (a === 'Conforme') out.applicable++;
    else if (a === 'Não conforme') out.applicableNonCompliant++;
  }
  for (const i of FUNDAMENTAL) if (answers[i] === 'Não conforme') out.fundamentalNonCompliant++;
  return out;
}

function Options({ index, options, answers, set }) {
  return (
    <div className="flex gap-8">
      {options.map((opt, k) => (
        <div key={`${index}-${k}`} className="flex items-center gap-2">
          <Checkbox className="w-9 h-9" classIcon="w-7 h-7" checked={answers[index] === opt} onClick={() => set(index, opt)} />
          <Label className="text-xl">{opt}</Label>
        </div>
      ))}
    </div>
  );
}

function Questionnaire() {
  const [required, setRequired] = useState(31);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [valid, setValid] = useState(true);
  const router = useRouter();
  const { addToFormData, sendFormDataToApi } = useLeadForm();

  useEffect(() => {
    const no0 = answers[0] === 'Não';
    const no28 = answers[28] === 'Não';
    setRequired(no0 && no28 ? 31 : no0 || no28 ? 32 : 33);
  }, [answers]);

  const set = (i, value) =>
    setAnswers((prev) => {
      const copy = [...prev];
      copy[i] = value;
      return copy;
    });

  const send = async () => {
    addToFormData({ answers: { ...summarize(answers) } });
    try {
      await sendFormDataToApi();
    } catch (err) {
      console.error('Erro ao enviar a autoavaliação', err);
      notify('Não foi possível registrar a autoavaliação, mas o resultado está disponível.', 'warning');
    }
    router.push('/auto-avaliacao/feedback');
  };

  return (
    <>
      {confirmOpen && (
        <Modal.Root closeModal={() => setConfirmOpen(false)} className="w-[640px] space-y-5">
          <div className="flex flex-col items-center gap-8">
            <div className="w-20 h-20 rounded-full bg-neutral-01 border-4 border-[#CBEBE6] flex justify-center items-center">
              <BsCheck2 size="2.5rem" className="fill-[#26B5A3]" />
            </div>
            <Modal.Title classes="text-[#434343] font-medium text-2xl text-center">Tudo certo! Por favor, confirme o envio do seu formulário</Modal.Title>
          </div>
          <Modal.Content className="flex justify-center gap-7">
            <Button size="lg" className="bg-primary-02 hover:bg-primary-02/90 font-medium text-xl" onClick={send}>
              Enviar
            </Button>
            <Button size="lg" className="bg-rose-50 text-red-700 hover:bg-rose-100/90 font-medium text-xl" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
          </Modal.Content>
        </Modal.Root>
      )}
      <form className="mt-5 space-y-20" noValidate>
        <div className="space-y-5">
          <h4 className="font-medium text-xl">Diagnóstico:</h4>
          <ul className="space-y-8">
            {DIAGNOSTIC.map((q, i) => (
              <div key={i} className="space-y-6">
                <p className="text-xl text-[#434343]">{`${i + 1} - ${q.value}`}</p>
                <Options index={i} options={YES_NO} answers={answers} set={set} />
              </div>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <h4 className="font-medium text-xl">Conformidade legal:</h4>
          <ul className="space-y-8">
            {LEGAL.map((q, i) => (
              <div key={i} className="space-y-4">
                <p className="text-xl text-[#434343] mb-2">
                  {`${LEGAL_START + i + 1} - ${q.value}`}
                  {q.tag && <span className="bg-primary-01 rounded-md text-primary px-3 py-1 ml-3">{` ${q.tag}`}</span>}
                </p>
                <Options index={LEGAL_START + i} options={LEGAL_OPTIONS} answers={answers} set={set} />
                {q.description && <p className="text-sm italic">{q.description}</p>}
              </div>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <h4 className="font-medium text-xl">Materialidade e Gestão:</h4>
          <ul className="space-y-8">
            {MATERIALITY.map((q, i) => (
              <div key={i} className="space-y-6">
                <p className="text-xl text-[#434343]">{`${MATERIALITY_START + i + 1} - ${q.value}`}</p>
                <Options index={MATERIALITY_START + i} options={YES_NO} answers={answers} set={set} />
              </div>
            ))}
          </ul>
        </div>
        <div className="flex justify-between items-center">
          <Link href="/auto-avaliacao">VOLTAR</Link>
          <div className="flex items-center">
            {!valid && <p className="text-red-500 mr-3">Certifique-se de preencher todos os campos obrigatórios.</p>}
            <Button
              className="bg-[#309D99] hover:bg-[#309D99E5]"
              type="button"
              size="lg"
              onClick={() => {
                const filled = answers.filter((a) => a !== undefined).length;
                const missingFollowUp = Object.entries(FOLLOW_UP).some(([q, f]) => answers[q] === 'Sim' && !answers[f]);
                if (filled < required || missingFollowUp) return setValid(false);
                setValid(true);
                setConfirmOpen(true);
              }}
            >
              ENVIAR
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

const Separator = () => <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-[1px] w-[80%] mx-auto" />;

export default function ResponsePage() {
  return (
    <div className="bg-neutral-01 pb-20">
      <section className="container mx-auto pt-20 space-y-12">
        <h1 className="title-l text-center">Autoavaliação para as Indústrias – Programa ESG-FIEMS</h1>
        <div className="space-y-6">
          <p className="text-xl">
            O Programa de Certificação ESG-FIEMS tem como foco principal proporcionar às indústrias do Mato Grosso do Sul o acesso às sólidas práticas da
            cultura ESG reconhecidas globalmente, o que, sem dúvida, resultará em benefícios significativos em termos de inovação e competitividade.
          </p>
          <p className="text-xl">
            Além disso, a empresa recebe uma certificação de um órgão auditor, após passar por uma auditoria rigorosa, que, em parceria com a FIEMS,
            reconhece a empresa aprovada como aquela que demonstra um compromisso sólido com o desenvolvimento sustentável em todas as suas interações
            econômicas, ambientais e sociais.
          </p>
          <p className="text-xl">
            Para dar início ao processo de conquista do Selo ESG-FIEMS, durante a fase de autoavaliação, a empresa irá responder a uma série de perguntas
            que contribuirão para uma análise objetiva de sua situação atual, sob a perspectiva dos pilares ambiental, social e de governança corporativa,
            como segue:
          </p>
        </div>
        <Separator />
        <div className="space-y-3">
          <h3 className="font-bold text-2xl">Observações:</h3>
          <p className="text-xl">
            Abaixo, você encontrará os requisitos essenciais do Programa ESG-FIEMS. A falta de conformidade com esses requisitos indica que a empresa pode
            enfrentar desafios adicionais durante o processo de certificação. É crucial destacar que esses requisitos constituem apenas uma fração dos
            indicadores do Programa, e o cumprimento deles não assegura automaticamente a obtenção da certificação.
          </p>
          <p className="text-xl">
            - Da adesão ao Programa à certificação, a empresa terá até 12 (doze) meses de preparação, período no qual pode adotar medidas para solucionar
            não conformidades em um ou mais dos requisitos. Caso a empresa apresente alguma não conformidade sinalizada como crítica, recomenda-se que
            solucione a questão antes mesmo de formalizar a adesão ao Programa;
          </p>
          <p className="text-xl">Clareza é fundamental ao comunicar informações importantes. Aqui está uma reformulação mais direta e clara das suas instruções:</p>
          <p className="text-xl">
            Para se qualificar para o Programa ESG-FIEMS, é essencial que sua empresa apresente evidências de conformidade com o CNPJ especificado no
            contrato de adesão, que será considerado como escopo do Programa de Certificação. Não será possível adicionar evidências de outras unidades,
            mesmo que estejam localizadas no estado do Mato Grosso do Sul.
          </p>
          <p className="text-xl">
            Sua empresa deve possuir a classificação CNAE-Industrial e estar operacional por, no mínimo, 12 meses até a data de adesão ao Programa de
            Certificação.
          </p>
        </div>
        <Separator />
      </section>
      <section className="container mx-auto mt-8">
        <h3 className="font-bold text-2xl">Questões da Autoavaliação: </h3>
        <Questionnaire />
      </section>
    </div>
  );
}
