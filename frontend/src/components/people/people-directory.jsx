'use client';
/**
 * Lista de pessoas compartilhada por Pessoas (Administração) e Equipe (empresa em contexto):
 * busca, filtros, tabela ordenável, cartões no celular, estados e paginação. O que muda entre as
 * telas vem por propriedades — escopo dos dados (`scope`) e ações permitidas (`onEdit`,
 * `onInactivate`, só passadas a quem pode). A API confere tudo de novo.
 */
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu';
import { FaRegEdit } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { IoSearch } from 'react-icons/io5';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, Btn, EmptyState, ErrorState, Pagination, SelectInput, inputClass } from '@/components/esg/ui';
import { CREATED_OPTIONS, ROLE_LABEL, ROLE_OPTIONS, ROLE_TONE, USER_STATUS_OPTIONS } from '@/lib/constants';
import { formatDateBR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePeopleDirectory } from './use-people-directory';
import { UserAvatar } from './user-avatar';

export const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role] || 'neutral'}>{ROLE_LABEL[role] || role || '—'}</Badge>;

function SortHeader({ label, column, order, onSort, className }) {
  const active = order.sort === column;
  const Icon = !active ? LuArrowUpDown : order.dir === 'asc' ? LuArrowUp : LuArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (order.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn('-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 uppercase tracking-wide hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-03', active && 'text-[#0D3969]')}
      >
        {label}
        <Icon aria-hidden className={active ? '' : 'opacity-50'} />
      </button>
    </TableHead>
  );
}

function PersonName({ person }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={person} />
      <div className="min-w-0">
        <p className="line-clamp-2 break-words font-semibold text-slate-900 md:truncate">{person.name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {person.jobTitle && <span className="truncate">{person.jobTitle}</span>}
          {person.status === 'INACTIVE' && <Badge tone="neutral">Inativa</Badge>}
        </p>
      </div>
    </div>
  );
}

function Actions({ person, selfId, onEdit, onInactivate }) {
  if (!onEdit && !onInactivate) return null;
  const isSelf = person.id === selfId;
  const inactive = person.status === 'INACTIVE';
  const inactivateHint = isSelf ? 'Você não pode inativar a própria conta' : inactive ? 'Conta já inativa' : 'Inativar conta';
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <Btn size="icon" variant="ghost" className="h-10 w-10 text-slate-600 hover:text-[#0D3969]" aria-label={`Editar ${person.name}`} title="Editar usuário" onClick={() => onEdit(person)}>
          <FaRegEdit aria-hidden />
        </Btn>
      )}
      {onInactivate && (
        <Btn
          size="icon"
          variant="danger-ghost"
          className="h-10 w-10"
          aria-label={`Inativar ${person.name}`}
          title={inactivateHint}
          disabled={isSelf || inactive}
          onClick={() => onInactivate(person)}
        >
          <FiTrash2 aria-hidden />
        </Btn>
      )}
    </div>
  );
}

export function PeopleDirectory({ scope, title, selfId, onEdit = null, onInactivate = null, refreshKey = 0, noun = 'usuários' }) {
  const list = usePeopleDirectory({ scope, refreshKey });
  const { rows, status, filters, order } = list;
  const manage = !!(onEdit || onInactivate);
  const roleOptions = scope === 'all' ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== 'ADMIN');
  const loadingFirst = status === 'loading';

  return (
    <section aria-labelledby="pessoas-titulo" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
        <h2 id="pessoas-titulo" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <IoSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => list.setFilter('q', e.target.value)}
              placeholder="Buscar por nome, e-mail ou função..."
              aria-label="Buscar por nome, e-mail ou função"
              className={cn(inputClass, 'h-10 pl-9')}
            />
          </div>
          <SelectInput aria-label="Perfil" value={filters.role} onChange={(e) => list.setFilter('role', e.target.value)}>
            <option value="">Todos os perfis</option>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.text}
              </option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Situação" value={filters.status} onChange={(e) => list.setFilter('status', e.target.value)}>
            <option value="">Todas as situações</option>
            {USER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.text}
              </option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Data de cadastro" value={filters.created} onChange={(e) => list.setFilter('created', e.target.value)}>
            <option value="">Qualquer data</option>
            {CREATED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.text}
              </option>
            ))}
          </SelectInput>
        </div>
        {list.filtered && (
          <button type="button" onClick={list.clear} className="self-start text-xs font-medium text-[#0D5DA8] hover:underline">
            Limpar busca e filtros
          </button>
        )}
      </div>

      {status === 'error' ? (
        <div className="p-5">
          <ErrorState message={list.error} onRetry={list.reload} />
        </div>
      ) : !loadingFirst && rows.length === 0 ? (
        <div className="p-5">
          {list.filtered ? (
            <EmptyState
              title="Nenhum resultado"
              description="Nenhuma pessoa corresponde à busca e aos filtros escolhidos."
              action={
                <Btn variant="secondary" size="sm" onClick={list.clear}>
                  Limpar busca e filtros
                </Btn>
              }
            />
          ) : (
            <EmptyState title={scope === 'all' ? 'Nenhum usuário cadastrado' : 'Nenhuma pessoa vinculada'} description={scope === 'all' ? 'Cadastre o primeiro usuário.' : 'Ainda não há pessoas desta empresa na plataforma.'} />
          )}
        </div>
      ) : (
        <div aria-busy={status !== 'ready'} className={cn('transition-opacity', status === 'refreshing' && 'opacity-60')}>
          {/* Desktop e tablet: tabela ordenável. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Nome" column="name" order={order} onSort={list.toggleSort} className="pl-5" />
                  <SortHeader label="Função" column="role" order={order} onSort={list.toggleSort} />
                  <SortHeader label="Data de cadastro" column="createdAt" order={order} onSort={list.toggleSort} />
                  <TableHead>E-mail</TableHead>
                  {manage && <TableHead className="pr-5 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFirst
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={manage ? 5 : 4} className="px-5">
                          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  : rows.map((p) => (
                      <TableRow key={p.id} className="h-16">
                        <TableCell className="max-w-[18rem] pl-5">
                          <PersonName person={p} />
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={p.role} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-600">{formatDateBR(p.createdAt)}</TableCell>
                        <TableCell className="max-w-[16rem] truncate text-slate-600">{p.email}</TableCell>
                        {manage && (
                          <TableCell className="pr-5">
                            <Actions person={p} selfId={selfId} onEdit={onEdit} onInactivate={onInactivate} />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: cartões (sem tabela espremida). */}
          <ul className="flex flex-col divide-y divide-slate-100 md:hidden">
            {loadingFirst
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="p-4">
                    <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
                  </li>
                ))
              : rows.map((p) => (
                  <li key={p.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <PersonName person={p} />
                      <Actions person={p} selfId={selfId} onEdit={onEdit} onInactivate={onInactivate} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[3.25rem] text-sm text-slate-600">
                      <RoleBadge role={p.role} />
                      <span className="break-all">{p.email}</span>
                      <span className="text-xs text-slate-500">Cadastro: {formatDateBR(p.createdAt)}</span>
                    </div>
                  </li>
                ))}
          </ul>

          {!loadingFirst && (
            <Pagination
              page={list.page}
              pages={list.pages}
              total={list.total}
              perPage={list.perPage}
              noun={noun}
              onPrevious={() => list.setPage(list.page - 1)}
              onNext={() => list.setPage(list.page + 1)}
            />
          )}
        </div>
      )}
    </section>
  );
}
