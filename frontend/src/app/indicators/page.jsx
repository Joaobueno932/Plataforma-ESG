'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { PAGE, PageHeading, SkeletonRows } from '@/components/esg/ui';
import { CatalogAdmin } from '@/components/catalog/catalog-admin';

/**
 * Catálogo de indicadores — aba da Administração: editar, excluir e incluir indicadores e
 * alternativas, mudar as cores dos cartões e criar cadernos setoriais do zero, sempre em uma
 * edição versionada. Os demais perfis consultam os indicadores dentro do próprio ciclo.
 */
export default function IndicatorsPage() {
  const { userLogged } = useAuth();
  const router = useRouter();
  const isAdmin = (userLogged?.roles || [userLogged?.role]).includes('ADMIN');

  useEffect(() => {
    if (userLogged && !isAdmin) router.replace(userLogged.companyId ? `/companies/${userLogged.companyId}` : '/companies');
  }, [userLogged, isAdmin, router]);

  return (
    <div className={PAGE}>
      <PageHeading
        title="Cadernos e indicadores"
        description="Toda alteração acontece em uma edição em rascunho criada a partir da versão em vigor. Ao publicar, ela passa a valer para os ciclos novos; ciclos já abertos continuam com o catálogo que congelaram."
      />
      {!userLogged || !isAdmin ? <SkeletonRows rows={5} /> : <CatalogAdmin />}
    </div>
  );
}
