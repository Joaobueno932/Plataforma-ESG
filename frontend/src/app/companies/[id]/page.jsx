'use client';
import { Suspense, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import { useAuth } from '@/contexts/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/esg/ui';
import { useCycle } from '@/components/cycle/use-cycle';
import { CycleHeader } from '@/components/cycle/cycle-header';
import { Overview } from '@/components/cycle/overview';
import { IndicatorList } from '@/components/cycle/indicator-list';
import { AnswerDialog } from '@/components/cycle/answer-dialog';
import { PendingsPanel, ResultPanel, TeamPanel } from '@/components/cycle/panels';

/**
 * Tela do ciclo da empresa: visão geral, indicadores (em qualquer ordem, com busca e filtros),
 * pendências, resultado e equipe. Tudo vem da API; a tela só oferece o que o perfil e o estado
 * permitem. Abrir e fechar um indicador não perde filtros nem posição da lista.
 */
function CycleWorkspace() {
  const { id } = useParams();
  const { userLogged } = useAuth();
  const cycle = useCycle(id, userLogged);
  const { company, report, items, workflow, pendings, status, error, role, can } = cycle;
  const [openId, setOpenId] = useState(null);
  const triggerRef = useRef(null);
  const open = (item) => {
    triggerRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setOpenId(item.id);
  };
  const [tab, setTab] = useState('indicadores');
  const openItem = items.find((i) => i.id === openId) || null;

  const onSaved = useCallback(async (itemId) => cycle.refreshItem(itemId), [cycle]);

  const actionLabel = (item) => {
    if (can.answer) return 'Responder';
    if (can.audit) return 'Avaliar';
    if (can.review && item.answerState === 'submitted') return 'Revisar';
    return 'Consultar';
  };

  if (status === 'loading' || !userLogged)
    return (
      <div className="esg-surface px-4 py-6 sm:px-8 lg:ml-56">
        <SkeletonRows rows={6} />
      </div>
    );
  if (status === 'error')
    return (
      <div className="esg-surface px-4 py-6 sm:px-8 lg:ml-56">
        <ErrorState message={error} onRetry={cycle.load} />
      </div>
    );
  if (!report)
    return (
      <div className="esg-surface px-4 py-6 sm:px-8 lg:ml-56">
        <EmptyState title="Esta empresa ainda não tem ciclo aberto" description="O ciclo é aberto no cadastro da empresa, com o caderno e a versão do catálogo." />
      </div>
    );

  const auditedVisible = report.status === 'Audited' || ['ADMIN', 'AUDITOR', 'SUPERVISOR'].includes(role);
  const openPendings = pendings.filter((p) => ['aberta', 'em-andamento'].includes(p.status)).length;

  return (
    <div className="esg-surface flex flex-col gap-6 px-4 pb-16 pt-2 sm:px-8 lg:ml-56">
      <Link href="/companies" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[#0D5DA8] hover:underline">
        <IoArrowBack aria-hidden /> Empresas
      </Link>
      <CycleHeader company={company} report={report} workflow={workflow} role={role} can={can} onChanged={cycle.load} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Seções do ciclo">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="indicadores">
            Indicadores <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{items.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pendencias">
            Pendências {openPendings > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{openPendings}</span>}
          </TabsTrigger>
          <TabsTrigger value="resultado">Resultado</TabsTrigger>
          {can.designate && <TabsTrigger value="equipe">Equipe</TabsTrigger>}
        </TabsList>
        <TabsContent value="visao">
          <Overview report={report} items={items} workflow={workflow} pendings={pendings} role={role} />
        </TabsContent>
        <TabsContent value="indicadores">
          <IndicatorList items={items} pendings={pendings} report={report} user={userLogged} actionLabel={actionLabel} onOpen={open} />
        </TabsContent>
        <TabsContent value="pendencias">
          <PendingsPanel pendings={pendings} items={items} onOpenItem={open} onChanged={cycle.refreshPendings} />
        </TabsContent>
        <TabsContent value="resultado">
          <ResultPanel report={report} auditedVisible={auditedVisible} />
        </TabsContent>
        {can.designate && (
          <TabsContent value="equipe">
            <TeamPanel report={report} people={company?.users} onChanged={cycle.load} />
          </TabsContent>
        )}
      </Tabs>

      <AnswerDialog
        item={openItem}
        open={!!openItem}
        onOpenChange={(v) => {
          if (v) return;
          setOpenId(null);
          // O modal desmonta junto com o item; o foco volta ao botão que o abriu.
          setTimeout(() => triggerRef.current?.isConnected && triggerRef.current.focus(), 0);
        }}
        report={report}
        role={role}
        can={can}
        people={company?.users}
        onSaved={onSaved}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}

export default function CompanyPage() {
  return (
    <Suspense fallback={null}>
      <CycleWorkspace />
    </Suspense>
  );
}
