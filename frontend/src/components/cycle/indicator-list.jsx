'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IoAlertCircleOutline, IoSearch, IoStar, IoStarOutline, IoChevronForward, IoFlagOutline } from 'react-icons/io5';
import { Badge, Btn, EmptyState, SelectInput, TextInput } from '@/components/esg/ui';
import { LuPencil } from 'react-icons/lu';
import { AXES, AXIS_THEME, MINIMUM_LABEL } from '@/lib/levels';
import { itemState } from '@/lib/workflow';
import { cn } from '@/lib/utils';

const FILTERS = ['q', 'eixo', 'caderno', 'situacao', 'responsavel', 'obrigatorio', 'aplicabilidade', 'favoritos'];

/** Favoritos/marcadores por pessoa e ciclo, guardados no navegador. */
function useFavorites(userId, reportId) {
  const key = `esg:favoritos:${userId}:${reportId}`;
  const [ids, setIds] = useState([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {
      setIds([]);
    }
  }, [key]);
  const toggle = (id) =>
    setIds((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* sem armazenamento local: o marcador vale só nesta sessão */
      }
      return next;
    });
  return { ids, toggle };
}

function situation(item) {
  if (item.answerState === 'empty') return 'nao-respondido';
  if (item.answerState === 'draft') return 'rascunho';
  if (item.status === 'PendingValidationByManager') return 'revisao';
  if (['ApprovedByManager', 'ApprovedByConsultor'].includes(item.status)) return 'aprovado';
  if (['RejectedByManager', 'RejectedByConsultor'].includes(item.status)) return 'devolvido';
  if (item.status === 'PendingRevision') return 'complemento';
  if (['Approved', 'Rejected'].includes(item.status)) return 'auditado';
  if (item.status === 'Auditing') return 'em-auditoria';
  return 'outro';
}

/**
 * Indicadores do ciclo, agrupados por eixo e tópico: corpo na cor suave do eixo e badges de
 * maturidade mínima exigida/Setorial — a mesma apresentação para todos os perfis; só as ações
 * mudam (`actionLabel`, e o lápis de maturidades quando `onEditMaturities` é informado).
 */
export function IndicatorList({ items, pendings, report, user, actionLabel, onOpen, onEditMaturities = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ids: favorites, toggle } = useFavorites(user?.id, report?.id);
  const filters = Object.fromEntries(FILTERS.map((f) => [f, params.get(f) || '']));

  const setFilter = (name, value) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const clear = () => {
    const next = new URLSearchParams(params.toString());
    FILTERS.forEach((f) => next.delete(f));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const people = useMemo(() => {
    const map = new Map();
    items.forEach((i) => i.answerer && map.set(i.answerer.id, i.answerer.name));
    return [...map.entries()];
  }, [items]);
  const pendingByItem = useMemo(() => {
    const map = new Map();
    pendings.filter((p) => ['aberta', 'em-andamento'].includes(p.status)).forEach((p) => p.questionReportId && map.set(p.questionReportId, (map.get(p.questionReportId) || 0) + 1));
    return map;
  }, [pendings]);

  const visible = items.filter((item) => {
    const q = item.question || {};
    const term = filters.q.trim().toLowerCase();
    if (term && !`${q.code} ${q.title} ${q.topic || ''}`.toLowerCase().includes(term)) return false;
    if (filters.eixo && q.category !== filters.eixo) return false;
    if (filters.caderno === 'geral' && q.section !== 'All') return false;
    if (filters.caderno === 'setorial' && q.section === 'All') return false;
    if (filters.situacao && situation(item) !== filters.situacao) return false;
    if (filters.responsavel === 'sem' && item.answerer) return false;
    if (filters.responsavel && filters.responsavel !== 'sem' && item.answerer?.id !== filters.responsavel) return false;
    if (filters.obrigatorio === 'sim' && !q.hasMandatory) return false;
    if (filters.obrigatorio === 'nao' && q.hasMandatory) return false;
    if (filters.aplicabilidade === 'na' && !item.naRequest) return false;
    if (filters.aplicabilidade === 'aplicavel' && item.naRequest) return false;
    if (filters.favoritos === '1' && !favorites.includes(item.id)) return false;
    return true;
  });

  // Agrupa por eixo e, dentro dele, por tópico (organização dos cadernos).
  const groups = ['E', 'S', 'G']
    .map((axis) => {
      const list = visible.filter((i) => i.question?.category === axis);
      const topics = new Map();
      list.forEach((i) => {
        const topic = i.question?.topic || i.question?.subcategory || 'Sem tópico';
        if (!topics.has(topic)) topics.set(topic, []);
        topics.get(topic).push(i);
      });
      return { axis, count: list.length, topics: [...topics.entries()] };
    })
    .filter((g) => g.count);

  const active = FILTERS.some((f) => filters[f]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <IoSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="busca-indicador" className="sr-only">
            Buscar por código ou título
          </label>
          <TextInput id="busca-indicador" placeholder="Buscar por código ou título" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SelectInput aria-label="Eixo" value={filters.eixo} onChange={(e) => setFilter('eixo', e.target.value)}>
            <option value="">Todos os eixos</option>
            {Object.entries(AXES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </SelectInput>
          <SelectInput aria-label="Caderno" value={filters.caderno} onChange={(e) => setFilter('caderno', e.target.value)}>
            <option value="">Geral e setorial</option>
            <option value="geral">Caderno Geral</option>
            <option value="setorial">Setorial {report?.section}</option>
          </SelectInput>
          <SelectInput aria-label="Situação" value={filters.situacao} onChange={(e) => setFilter('situacao', e.target.value)}>
            <option value="">Todas as situações</option>
            <option value="nao-respondido">Não respondido</option>
            <option value="rascunho">Rascunho</option>
            <option value="revisao">Aguardando revisão</option>
            <option value="aprovado">Aprovado na revisão</option>
            <option value="devolvido">Devolvido</option>
            <option value="em-auditoria">Em auditoria</option>
            <option value="complemento">Complemento solicitado</option>
            <option value="auditado">Auditado</option>
          </SelectInput>
          <SelectInput aria-label="Responsável" value={filters.responsavel} onChange={(e) => setFilter('responsavel', e.target.value)}>
            <option value="">Qualquer responsável</option>
            <option value="sem">Sem responsável</option>
            {people.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectInput>
          {/* Parâmetro `obrigatorio` mantido na URL (links salvos continuam valendo). */}
          <SelectInput aria-label="Maturidade mínima" value={filters.obrigatorio} onChange={(e) => setFilter('obrigatorio', e.target.value)}>
            <option value="">Todos os níveis mínimos</option>
            <option value="sim">Com maturidade mínima exigida</option>
            <option value="nao">Sem maturidade mínima exigida</option>
          </SelectInput>
          <SelectInput aria-label="Aplicabilidade" value={filters.aplicabilidade} onChange={(e) => setFilter('aplicabilidade', e.target.value)}>
            <option value="">Qualquer aplicabilidade</option>
            <option value="na">Com pedido de NA</option>
            <option value="aplicavel">Sem pedido de NA</option>
          </SelectInput>
          <Btn
            variant={filters.favoritos === '1' ? 'primary' : 'secondary'}
            aria-pressed={filters.favoritos === '1'}
            onClick={() => setFilter('favoritos', filters.favoritos === '1' ? '' : '1')}
          >
            {filters.favoritos === '1' ? <IoStar aria-hidden /> : <IoStarOutline aria-hidden />}
            Marcados
          </Btn>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span aria-live="polite">
            {visible.length} de {items.length} indicadores
          </span>
          {active && (
            <button type="button" className="font-medium text-[#0D5DA8] hover:underline" onClick={clear}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {!visible.length ? (
        <EmptyState
          title={items.length ? 'Nenhum indicador com esses filtros' : 'Nenhum indicador disponível para você'}
          description={items.length ? 'Ajuste ou limpe os filtros para ver mais indicadores.' : 'Quando o gestor atribuir indicadores a você, eles aparecem aqui.'}
          action={active && <Btn variant="secondary" size="sm" onClick={clear}>Limpar filtros</Btn>}
        />
      ) : (
        groups.map((group) => {
          const rowProps = (item) => ({
            item,
            favorite: favorites.includes(item.id),
            onFavorite: () => toggle(item.id),
            pendingCount: pendingByItem.get(item.id) || 0,
            sector: report?.section,
            actionLabel: actionLabel(item),
            onOpen: () => onOpen(item),
            onEditMaturities: onEditMaturities ? () => onEditMaturities(item) : null,
          });
          return (
            <section key={group.axis} aria-labelledby={`eixo-${group.axis}`} className="flex flex-col gap-2.5">
              <h2 id={`eixo-${group.axis}`} className="flex items-center gap-2.5 px-1 pt-1 text-base font-bold uppercase tracking-wide text-[#0D3969]">
                <span className={cn('h-2.5 w-2.5 rounded-full', AXIS_THEME[group.axis].dot)} aria-hidden />
                {AXES[group.axis].label}
                <span className="font-normal text-slate-400">- {group.count}</span>
              </h2>
              {group.topics.map(([topic, list]) => (
                <div key={topic} className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="px-4 pb-1.5 pt-2.5 text-[13px] font-semibold text-slate-800">{topic}</div>
                  <ul className="flex flex-col gap-2 px-2 pb-2">
                    {list.map((item) => (
                      <IndicatorCard key={item.id} axis={group.axis} {...rowProps(item)} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

function FavoriteButton({ code, favorite, onFavorite, className }) {
  return (
    <button
      type="button"
      onClick={onFavorite}
      aria-pressed={favorite}
      aria-label={favorite ? `Desmarcar ${code}` : `Marcar ${code}`}
      className={cn('hidden shrink-0 rounded p-1 text-slate-400 hover:text-amber-500 sm:block', className)}
    >
      {favorite ? <IoStar className="text-amber-500" aria-hidden /> : <IoStarOutline aria-hidden />}
    </button>
  );
}

/** Responsável, prazo e pendências abertas do indicador. */
function ItemMeta({ item, pendingCount, className }) {
  return (
    <div className={cn('mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500', className)}>
      <span>{item.answerer ? `Responsável: ${item.answerer.name}` : 'Sem responsável'}</span>
      {item.dueDate && <span>Prazo {new Date(item.dueDate).toLocaleDateString('pt-BR')}</span>}
      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <IoFlagOutline aria-hidden /> {pendingCount} pendência(s)
        </span>
      )}
    </div>
  );
}

/** Lápis "Editar maturidades" (somente Administração; ausente para os demais perfis). */
function EditMaturitiesButton({ code, onClick }) {
  if (!onClick) return null;
  return (
    <Btn variant="ghost" size="icon" onClick={onClick} aria-label={`Editar maturidades de ${code}`} title="Editar maturidades (Administração)" className="h-9 w-9 shrink-0 text-slate-500 hover:text-[#0D3969]">
      <LuPencil aria-hidden />
    </Btn>
  );
}

/** Indicador: corpo na cor suave do eixo, badges de classificação, situação e ações. */
function IndicatorCard({ axis, item, favorite, onFavorite, pendingCount, sector, actionLabel, onOpen, onEditMaturities }) {
  const q = item.question || {};
  const state = itemState(item);
  const setorial = q.section && q.section !== 'All';
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-l-4 px-4 py-3.5 transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:gap-4',
        AXIS_THEME[axis].card,
      )}
    >
      <FavoriteButton code={q.code} favorite={favorite} onFavorite={onFavorite} className="self-center p-1.5 text-[1.1rem] text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{q.codeOriginal || q.code}</span>
          {q.hasMandatory && (
            <Badge tone="mandatory">
              <IoAlertCircleOutline aria-hidden /> {MINIMUM_LABEL}
            </Badge>
          )}
          {setorial && <Badge tone="sector">Setorial {q.section || sector}</Badge>}
          {item.naRequest && <Badge tone="neutral">Pedido de NA</Badge>}
        </div>
        <p className="mt-1 break-words text-[15px] font-semibold leading-snug text-[#0D3969]">{q.title}</p>
        <ItemMeta item={item} pendingCount={pendingCount} className="text-[13px] text-slate-600" />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
        <Badge tone={state.tone} className={state.tone === 'neutral' ? 'bg-white' : undefined}>
          {state.label}
        </Badge>
        <EditMaturitiesButton code={q.code} onClick={onEditMaturities} />
        <Btn size="sm" variant={actionLabel === 'Responder' ? 'primary' : 'secondary'} onClick={onOpen} aria-label={`${actionLabel}: ${q.code} ${q.title}`} className="h-10 px-4 sm:h-9">
          {actionLabel}
          <IoChevronForward aria-hidden />
        </Btn>
      </div>
    </li>
  );
}
