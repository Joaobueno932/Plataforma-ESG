'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IoSearch, IoStar, IoStarOutline, IoShieldCheckmarkOutline, IoChevronForward, IoFlagOutline } from 'react-icons/io5';
import { Badge, Btn, EmptyState, SelectInput, TextInput } from '@/components/esg/ui';
import { AXES } from '@/lib/levels';
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

export function IndicatorList({ items, pendings, report, user, actionLabel, onOpen }) {
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
          <SelectInput aria-label="Obrigatório" value={filters.obrigatorio} onChange={(e) => setFilter('obrigatorio', e.target.value)}>
            <option value="">Com e sem obrigatório</option>
            <option value="sim">Com nível obrigatório</option>
            <option value="nao">Sem nível obrigatório</option>
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
        groups.map((group) => (
          <section key={group.axis} aria-labelledby={`eixo-${group.axis}`} className="flex flex-col gap-2">
            <h2 id={`eixo-${group.axis}`} className="flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: AXES[group.axis].color }} aria-hidden />
              {AXES[group.axis].label}
              <span className="font-normal normal-case text-slate-400">· {group.count}</span>
            </h2>
            {group.topics.map(([topic, list]) => (
              <div key={topic} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs font-semibold text-slate-600">{topic}</div>
                <ul className="divide-y divide-slate-100">
                  {list.map((item) => (
                    <IndicatorRow
                      key={item.id}
                      item={item}
                      favorite={favorites.includes(item.id)}
                      onFavorite={() => toggle(item.id)}
                      pendingCount={pendingByItem.get(item.id) || 0}
                      sector={report?.section}
                      actionLabel={actionLabel(item)}
                      onOpen={() => onOpen(item)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function IndicatorRow({ item, favorite, onFavorite, pendingCount, sector, actionLabel, onOpen }) {
  const q = item.question || {};
  const state = itemState(item);
  const setorial = q.section && q.section !== 'All';
  return (
    <li className={cn('group flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center', setorial && 'border-l-4 border-l-[#0D5DA8]')}>
      <button
        type="button"
        onClick={onFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `Desmarcar ${q.code}` : `Marcar ${q.code}`}
        className="hidden shrink-0 rounded p-1 text-slate-400 hover:text-amber-500 sm:block"
      >
        {favorite ? <IoStar className="text-amber-500" aria-hidden /> : <IoStarOutline aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-500">{q.codeOriginal || q.code}</span>
          {setorial && <Badge tone="brand">Setorial {sector}</Badge>}
          {q.hasMandatory && (
            <Badge tone="warning">
              <IoShieldCheckmarkOutline aria-hidden /> Obrigatório
            </Badge>
          )}
          {item.naRequest && <Badge tone="neutral">Pedido de NA</Badge>}
        </div>
        <p className="mt-1 font-medium text-slate-900">{q.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{item.answerer ? `Responsável: ${item.answerer.name}` : 'Sem responsável'}</span>
          {item.dueDate && <span>Prazo {new Date(item.dueDate).toLocaleDateString('pt-BR')}</span>}
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <IoFlagOutline aria-hidden /> {pendingCount} pendência(s)
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Badge tone={state.tone}>{state.label}</Badge>
        <Btn size="sm" variant={actionLabel === 'Responder' ? 'primary' : 'secondary'} onClick={onOpen} aria-label={`${actionLabel}: ${q.code} ${q.title}`}>
          {actionLabel}
          <IoChevronForward aria-hidden />
        </Btn>
      </div>
    </li>
  );
}
