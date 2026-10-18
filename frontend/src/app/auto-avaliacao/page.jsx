import Link from 'next/link';
import { IoWarningOutline } from 'react-icons/io5';

export default function AutoEvaluationIntro() {
  return (
    <div className="bg-auto-evaluation h-full pt-24 bg-no-repeat bg-cover bg-center">
      <section className="container mx-auto space-y-6 flex flex-col items-center h-full text-neutral-01 ">
        <div className="space-y-4">
          <h1 className="text-center title-l">Autoavaliação</h1>
          <h2 className="title-l">Bem vindo(a) à plataforma de autoavaliação do Programa ESG-FIEMS!</h2>
        </div>
        <p className="text-lg w-[920px] text-start">
          O Programa ESG-FIEMS é composto por 64 indicadores do caderno geral e 10 indicadores por caderno temático, de natureza ambiental, social e de
          governança. Alguns destes indicadores correspondem a obrigações legais básicas e, portanto, as empresas precisam estar em conformidade com eles
          para participar do Programa.
        </p>
        <p className="text-start text-lg w-[920px]">
          Ao realizar esta autoavaliação, você responderá a 20 perguntas objetivas sobre a conformidade ou não de sua empresa para com os principais
          requisitos legais básicos. Não é necessário apresentar evidências de conformidade (documentos), tratando-se de um procedimento inicial.
        </p>
        <div className="flex flex-col gap-4 w-[920px]">
          <p>
            Ao final desta etapa, será gerado automaticamente um relatório informando se a empresa está apta ou não a iniciar sua jornada de certificação
            no Programa ESG-FIEMS.
          </p>
          <div className="flex items-center gap-1">
            <IoWarningOutline />
            <p>Importante: o resultado da autoavaliação não garante a obtenção da certificação.</p>
          </div>
          <span>Não se preocupe, todas as informações prestadas são confidenciais.</span>
        </div>
        <Link className="bg-neutral-01 px-6 py-2 rounded-md text-primary-03 font-semibold text-lg hover:bg-neutral-01/90 hover:text-primary-03" href="/auto-avaliacao/your-data">
          INICIAR
        </Link>
      </section>
    </div>
  );
}
