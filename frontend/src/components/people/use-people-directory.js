'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCompanyUsers, getUsers } from '@/services/users';
import { apiErrorMessage } from '@/lib/toast';

const EMPTY_FILTERS = { q: '', role: '', status: '', created: '' };

/**
 * Estado da lista de Pessoas (`scope="all"`, Administração) ou Equipe (`scope="company"`,
 * empresa em contexto). Busca, filtros, ordenação e paginação acontecem no servidor — a mesma
 * regra nas duas rotas; aqui só se guarda o que está selecionado.
 */
export function usePeopleDirectory({ scope, perPage = 10, refreshKey = 0 }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(scope === 'all' ? { sort: 'createdAt', dir: 'desc' } : { sort: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', rows: [], total: 0, pages: 1, error: null });
  const request = useRef(0);

  // Busca enquanto digita, sem uma requisição por tecla.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(filters.q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [filters.q]);

  const load = useCallback(async () => {
    const mine = ++request.current;
    setState((s) => ({ ...s, status: s.status === 'ready' ? 'refreshing' : 'loading', error: null }));
    try {
      const fetcher = scope === 'all' ? getUsers : getCompanyUsers;
      const { data } = await fetcher({ q: query, role: filters.role, status: filters.status, created: filters.created, ...order, page, perPage });
      if (mine !== request.current) return; // resposta antiga: outra busca já começou
      setState({ status: 'ready', rows: data.data, total: data.total ?? data.data.length, pages: data.numberOfPages || 1, error: null });
    } catch (err) {
      if (mine !== request.current) return;
      setState((s) => ({ ...s, status: 'error', error: apiErrorMessage(err) }));
    }
  }, [scope, query, filters.role, filters.status, filters.created, order, page, perPage]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const setFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    if (name !== 'q') setPage(1);
  };
  const clear = () => {
    setFilters(EMPTY_FILTERS);
    setQuery('');
    setPage(1);
  };
  /** Clique no cabeçalho: mesma coluna inverte; coluna nova começa no sentido natural. */
  const toggleSort = (sort) => {
    setOrder((o) => (o.sort === sort ? { sort, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { sort, dir: sort === 'createdAt' ? 'desc' : 'asc' }));
    setPage(1);
  };

  return {
    ...state,
    filters,
    setFilter,
    clear,
    filtered: Object.values(filters).some(Boolean),
    order,
    toggleSort,
    page,
    perPage,
    setPage,
    reload: load,
  };
}
