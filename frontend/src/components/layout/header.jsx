'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { AppHeader } from './app-shell';

const TITLES = {
  companies: 'Empresas',
  questionnaires: 'Questionários',
  users: 'Pessoas',
  indicators: 'Catálogo de indicadores',
  settings: 'Configurações',
};

const SUBTITLE = 'Gerenciamento e acompanhamento';

/** Título da tela: o ciclo é "Avaliação ESG"; para quem só gere a própria equipe, "Pessoas" é "Equipe" (o nome do menu). */
function titleFor(pathname, user) {
  const segment = pathname.split('/')[1];
  if (segment === 'companies' && pathname.split('/').length > 2) return 'Avaliação ESG';
  if (pathname.includes('response-indicator')) return 'Avaliação ESG';
  const roles = user?.roles || [user?.role];
  if (segment === 'users' && roles.includes('MANAGER') && !roles.includes('ADMIN')) return 'Equipe';
  return TITLES[segment];
}

// Cabeçalho institucional das telas internas — o mesmo para todos os perfis.
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { userLogged, logout } = useAuth();
  const hidden = ['auto-avaliacao', 'indicatorExtract', 'recovery-password'].some((p) => pathname.includes(p));
  if (pathname === '/' || hidden) return null;
  return (
    <AppHeader
      title={titleFor(pathname, userLogged)}
      subtitle={SUBTITLE}
      user={userLogged}
      inset={!pathname.includes('response-indicator')}
      onSettings={(section) => router.push(section === 'foto' ? '/settings#foto' : '/settings')}
      onLogout={async () => {
        await logout();
        router.push('/');
      }}
    />
  );
}
