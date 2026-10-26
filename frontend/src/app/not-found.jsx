'use client';
import Link from 'next/link';
import { EmptyState, PAGE, PageHeading, btn } from '@/components/esg/ui';

// Rota ausente (ex.: /companies/:id/performance-report, ainda não reconstruída).
export default function NotFound() {
  return (
    <div className={PAGE}>
      <PageHeading title="Página não encontrada" />
      <EmptyState
        title="Esta página não existe ou ainda não está disponível"
        description="Erro 404. Volte para a lista de empresas ou use o menu lateral."
        action={
          <Link href="/companies" className={btn({ variant: 'secondary', size: 'sm' })}>
            Ir para Empresas
          </Link>
        }
      />
    </div>
  );
}
