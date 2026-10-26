/**
 * Busca, filtros e ordenação das listas de pessoas (Pessoas — Administração; Equipe — empresa
 * em contexto). As duas rotas aplicam exatamente as mesmas regras sobre linhas já restritas ao
 * escopo autorizado; a paginação vem depois (`pagination.js`).
 *
 * Parâmetros: `q` (nome, e-mail ou função), `role`, `status` (ACTIVE | INACTIVE),
 * `created` (7d | 30d | 12m | year), `sort` (name | role | createdAt), `dir` (asc | desc).
 * `name` continua aceito como sinônimo de `q` (compatibilidade com a interface anterior).
 */
const ROLE_LABELS = {
  ADMIN: ['administração', 'administracao', 'admin', 'administrador'],
  MANAGER: ['gestor', 'gestora'],
  CONSULTOR: ['consultor', 'consultora', 'consultoria'],
  AUDITOR: ['auditor', 'auditora', 'auditoria'],
  SUPERVISOR: ['supervisor', 'supervisora', 'supervisão'],
  EMPLOYEE: ['funcionário', 'funcionario', 'colaborador', 'colaboradora'],
};
const ROLE_ORDER = ['ADMIN', 'CONSULTOR', 'SUPERVISOR', 'AUDITOR', 'MANAGER', 'EMPLOYEE'];
const STATUSES = ['ACTIVE', 'INACTIVE'];
const PERIOD_DAYS = { '7d': 7, '30d': 30, '12m': 365 };

const fold = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function since(created, now = new Date()) {
  if (created === 'year') return new Date(now.getFullYear(), 0, 1);
  const days = PERIOD_DAYS[created];
  return days ? new Date(now.getTime() - days * 86400000) : null;
}

function filterPeople(rows, query = {}) {
  const term = fold(query.q ?? query.name);
  const role = String(query.role || '').toUpperCase();
  const status = String(query.status || '').toUpperCase();
  const from = since(String(query.created || ''));
  const rolesByTerm = term ? Object.keys(ROLE_LABELS).filter((r) => ROLE_LABELS[r].some((label) => fold(label).startsWith(term))) : [];
  return rows.filter((u) => {
    if (term && !fold(u.name).includes(term) && !fold(u.email).includes(term) && !rolesByTerm.includes(u.role)) return false;
    if (role && ROLE_LABELS[role] && u.role !== role) return false;
    if (status && STATUSES.includes(status) && (u.status || 'ACTIVE') !== status) return false;
    if (from) {
      const at = new Date(u.createdAt);
      if (Number.isNaN(at.getTime()) || at < from) return false;
    }
    return true;
  });
}

function sortPeople(rows, query = {}, fallback = { sort: 'createdAt', dir: 'desc' }) {
  const sort = ['name', 'role', 'createdAt'].includes(query.sort) ? query.sort : fallback.sort;
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : query.sort ? (sort === 'createdAt' ? 'desc' : 'asc') : fallback.dir;
  const sign = dir === 'asc' ? 1 : -1;
  const time = (u) => {
    const t = new Date(u.createdAt).getTime();
    return Number.isNaN(t) ? -Infinity : t;
  };
  const compare = {
    name: (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR', { sensitivity: 'base' }),
    role: (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || String(a.name).localeCompare(String(b.name), 'pt-BR'),
    createdAt: (a, b) => time(a) - time(b),
  }[sort];
  return [...rows].sort((a, b) => sign * compare(a, b) || String(a.id).localeCompare(String(b.id)));
}

module.exports = { filterPeople, sortPeople, ROLE_LABELS };
