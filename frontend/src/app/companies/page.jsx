'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setCookie } from 'nookies';
import { LuPencil } from 'react-icons/lu';
import { IoAdd, IoDocumentTextOutline, IoSearch } from 'react-icons/io5';
import { TbClipboardText } from 'react-icons/tb';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Btn, PAGE, PageHeading, Pagination, SkeletonRows, btn } from '@/components/esg/ui';
import { CompanyFormDialog } from '@/components/companies/company-form-dialog';
import { CompanyLogo } from '@/components/companies/company-logo';
import { useAuth } from '@/contexts/auth';
import { useCompanies } from '@/contexts/companies';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/lib/constants';
import { formatDayBR } from '@/lib/format';

/**
 * Empresas (Administração; consultoria, auditoria e supervisão veem as com vínculo). Cadastro e
 * edição usam o mesmo formulário (`CompanyFormDialog`); a API confere `companies.manage`.
 */
function CompaniesTable({ onEdit }) {
  const { companies } = useCompanies();
  const { userLogged } = useAuth();
  const router = useRouter();
  const open = (id) => {
    setCookie(null, 'oldPath', '/companies', { path: '/' });
    router.push(`/companies/${id}`);
  };

  if (!companies)
    return (
      <div className="p-5">
        <SkeletonRows rows={3} />
      </div>
    );
  const extended = userLogged && userLogged.role !== 'EMPLOYEE';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Empresa</TableHead>
          <TableHead className="text-center">Tópicos</TableHead>
          <TableHead className="text-center">Liberação do acesso</TableHead>
          <TableHead className="text-center">Situação</TableHead>
          <TableHead className="pr-5 text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((c) => (
          <TableRow key={c.id} className="h-16">
            <TableCell className="pl-5">
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo company={c} />
                <div className="min-w-0">
                  <button onClick={() => open(c.id)} className="text-start font-semibold text-[#0D3969] hover:underline">
                    {c.bussinessName}
                  </button>
                  {c.status === 'INACTIVE' && (
                    <Badge tone="neutral" className="ml-2">
                      Inativa
                    </Badge>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center tabular-nums text-slate-600">{c.report?._count?.answeredQuestions || c.report?.answeredQuestions?.length || 0}</TableCell>
            <TableCell className="whitespace-nowrap text-center text-slate-600">{formatDayBR(c.accessDate)}</TableCell>
            <TableCell className="text-center">
              <Badge tone={REPORT_STATUS_TONE[c.report?.status] || 'neutral'}>{REPORT_STATUS_LABEL[c.report?.status] || '—'}</Badge>
            </TableCell>
            <TableCell className="pr-5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Btn size="sm" onClick={() => open(c.id)}>
                  <IoSearch aria-hidden /> Visualizar
                </Btn>
                {extended && (
                  <>
                    {c.report?.status === 'Pending' || c.report?.status === 'WaitingAuditory' ? (
                      <Link href={`/companies/${c.id}/performance-report`} className={btn({ variant: 'secondary', size: 'sm' })}>
                        <IoDocumentTextOutline aria-hidden /> Extrato
                      </Link>
                    ) : (
                      <Btn size="sm" variant="secondary" disabled>
                        <IoDocumentTextOutline aria-hidden /> Extrato
                      </Btn>
                    )}
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/companies/${c.id}/report`)}
                      disabled={c.report?.status !== 'Auditing' && c.report?.status !== 'Audited'}
                    >
                      <TbClipboardText aria-hidden /> Relatório da auditoria
                    </Btn>
                  </>
                )}
                {onEdit && (
                  <Btn size="icon" variant="ghost" className="text-slate-600 hover:text-[#0D3969]" aria-label={`Editar empresa ${c.bussinessName}`} title="Editar empresa" onClick={() => onEdit(c)}>
                    <LuPencil aria-hidden />
                  </Btn>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CompaniesPage() {
  const [dialog, setDialog] = useState(null); // { mode: 'create' } | { mode: 'edit', id }
  const { searchCompany, refreshCompanies, removeCompany, sectors, currentPage, numberOfPages, handleNextPageCompanies, handlePreviousPageCompanies } = useCompanies();
  const { userLogged } = useAuth();
  if (!userLogged) return null;
  // Mesma regra de antes: só a Administração cadastra e edita (a API exige `companies.manage`).
  const isAdmin = userLogged.role === 'ADMIN';

  return (
    <div className={PAGE}>
      {isAdmin && (
        <CompanyFormDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          mode={dialog?.mode}
          companyId={dialog?.id}
          sectors={sectors}
          onSaved={() => refreshCompanies()}
          onInactivate={(company) => {
            setDialog(null);
            removeCompany(company.id);
          }}
        />
      )}
      <PageHeading
        title={isAdmin ? 'Empresas' : 'Empresa'}
        description={isAdmin ? 'Empresas cadastradas e a situação do ciclo de cada uma.' : 'A empresa à qual você está vinculado(a) e a situação do ciclo.'}
        actions={
          isAdmin && (
            <Btn size="lg" className="w-full sm:w-auto" onClick={() => setDialog({ mode: 'create' })}>
              <IoAdd aria-hidden /> Cadastrar empresa
            </Btn>
          )
        }
      />
      {isAdmin && <SearchInput placeholder="Procurar por empresa" handleChange={searchCompany} />}
      <Card.Root>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{isAdmin ? 'Todas as empresas' : 'Minha empresa'}</h2>
        </div>
        <CompaniesTable onEdit={isAdmin ? (c) => setDialog({ mode: 'edit', id: c.id }) : null} />
        <Pagination page={currentPage} pages={numberOfPages} onPrevious={handlePreviousPageCompanies} onNext={handleNextPageCompanies} />
      </Card.Root>
    </div>
  );
}
