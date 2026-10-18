'use client';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/esg_logo_vertical.png';
import { useLeadForm } from '@/contexts/lead-form';
import { CONTACT_EMAIL } from '@/lib/format';

export default function FeedbackPage() {
  const { formData } = useLeadForm();
  const a = formData.answers;
  const ok = a.fundamentalNonCompliant === 0;
  const query =
    `?criteriosNaoAplicaveis=${a.nonApplicable}&criteriosAplicaveis=${a.applicable}` +
    `&criteriosAplicaveisNaoConformes=${a.applicableNonCompliant}&criteriosAplicaveisFundamentaisNaoConformes=${a.fundamentalNonCompliant}` +
    `&result=${ok ? 'ok' : 'notok'}`;

  return (
    <div className="bg-neutral-01 flex flex-col items-center gap-8 h-screen pt-5 overflow-y-scroll">
      <Image alt="imagem da logo ESG" src={logo} className="w-72" />
      <section className="w-[1000px] space-y-8 bg-white shadow p-8 px-16">
        <h1 className="title-m text-center">Obrigada por responder á autoavaliação do programa ESG-FIEMS.</h1>
        <div className="flex flex-col gap-4">
          <p className="body-l">
            Qualquer dúvida, entre em contato com as entidades gestoras do programa pelo e-mail:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-03 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <span className="body-l">Aqui está o resumo do resultado: </span>
        </div>
        {ok ? (
          <div className="bg-secondary-01 rounded-md p-12">
            <p className="text-xl">
              A empresa  atingiu as diretrizes fundamentais para a conformidade em práticas ESG.  O programa de certificação da FIEMS tem a duração de até
              12 meses, tempo suficiente para evoluir ainda mais nos requisitos de sustentabilidade dentro da cultura empresarial e estar preparado para o
              processo de auditoria externa. Entre em contato com nosso time pelo e-mail acima e saiba como aderir ao progama de certificação.
            </p>
          </div>
        ) : (
          <div className="bg-red-200 rounded-md p-12">
            <p className="text-xl">
              A empresa não atingiu plenamente as diretrizes fundamentais para a conformidade em práticas ESG. Aproveite a oportunidade para visualizar os
              pontos de melhoria no relatório abaixo e se preparar para a jornada de certificação do Selo ESG-FIEMS. O programa de certificação da FIEMS
              tem a duração de até 12 meses, tempo suficiente para corrigir os pontos sensíveis e estar apto ao processo de auditoria externa. Entre em
              contato com nosso time pelo e-mail acima e saiba como aderir ao programa de certificação.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-5">
          <p className="body-l">Clique no link abaixo para visualizar sua auto avaliação realizada na plataforma</p>
          <Link href={`/auto-avaliacao/resume${query}`} className="text-primary-03 hover:underline text-center text-xl">
            Visualizar Autoavaliação
          </Link>
        </div>
      </section>
    </div>
  );
}
