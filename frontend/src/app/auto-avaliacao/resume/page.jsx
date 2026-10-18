'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const ROWS = [
  ['Critérios não aplicáveis ', 'criteriosNaoAplicaveis'],
  ['Critérios aplicáveis ', 'criteriosAplicaveis'],
  ['Critérios aplicáveis não conformes ', 'criteriosAplicaveisNaoConformes'],
  ['Critérios aplicáveis fundamentais não conformes ', 'criteriosAplicaveisFundamentaisNaoConformes'],
];

function Resume() {
  const params = useSearchParams();
  const ok = params.get('result') === 'ok';
  return (
    <div className="space-y-10 container mx-auto py-14">
      <section className="bg-neutral-01 p-4">
        <h2 className="mb-7 title-l">Resumo</h2>
        <ul>
          {ROWS.map(([label, key], i) => (
            <li key={key} className={`${i % 2 === 0 ? 'bg-neutral-02' : 'bg-transparent'} p-2`}>
              <div className="flex items-center justify-between">
                <h4 className="title-s">{label}</h4>
                <span className="title-s">{params.get(key) ?? 0}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-4 px-4">
        <h2 className="title-l">Resultado da Autoavaliação</h2>
        {ok ? (
          // Texto do caso aprovado inferido da tela de feedback (o staging só exibiu o caso "notok").
          <div className="bg-secondary-01 rounded-md p-12">
            <p className="text-xl">
              A empresa atingiu as diretrizes fundamentais para a conformidade em práticas ESG. O Programa tem duração de 12 meses, tempo suficiente para
              evoluir ainda mais nos requisitos de sustentabilidade dentro da cultura empresarial e estar preparado para o processo de auditoria externa.
              Entre em contato com nosso time pelo e-mail acima e saiba mais como aderir ao programa ESG-FIEMS.
            </p>
          </div>
        ) : (
          <div className="bg-red-200 rounded-md p-12">
            <p className="text-xl">
              A empresa não atingiu plenamente as diretrizes fundamentais para a conformidade em práticas ESG. Aproveite a oportunidade para visualizar os
              pontos de melhoria do relatório e se preparar para a Jornada do Programa ESG-FIEMS. O Programa tem duração de 12 meses, tempo suficiente
              para corrigir os pontos sensíveis e estar apto ao processo de auditoria externa. Entre em contato com nosso time pelo e-mail acima e saiba
              mais como aderir ao programa ESG-FIEMS.
            </p>
          </div>
        )}
      </section>
      <section className="space-y-16 px-4">
        <p className="text-xl">
          Você receberá um e-mail com o link de acesso a esta avaliação, podendo visualizar este relatório, bem como refazer etapas, sempre que necessário.
        </p>
        <div className="flex items-center justify-between">
          <Button size="lg" className="bg-primary-02 hover:bg-primary-02/90 font-medium text-xl" onClick={() => window.print()}>
            Imprimir
          </Button>
          <Link className="text-primary-03 hover:underline text-center text-xl" href="/auto-avaliacao/response">
            Refazer autoavaliação{' '}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense>
      <Resume />
    </Suspense>
  );
}
