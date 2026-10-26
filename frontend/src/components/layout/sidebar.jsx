'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '@/contexts/auth';
import { useSidebar } from '@/contexts/sidebar';
import { HelpModal } from './help-modal';
import { LoginAside } from './login-aside';
import { AppSidebarPanel } from './app-shell';

/**
 * Navegação por função. A Administração gerencia empresas, pessoas e o catálogo; a empresa vai
 * direto ao seu ciclo; consultoria, auditoria e supervisão veem as empresas com vínculo vigente.
 * Esconder um link não autoriza nem bloqueia nada — quem decide é a API.
 */
function linksFor(user) {
  if (!user) return [];
  const roles = user.roles || [user.role];
  const links = [];
  const companyRoles = ['MANAGER', 'EMPLOYEE'];
  if (roles.some((r) => companyRoles.includes(r)) && user.companyId) links.push({ id: 'cycle', text: 'Meu ciclo', href: `/companies/${user.companyId}`, match: `/companies/${user.companyId}` });
  if (roles.some((r) => ['ADMIN', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR'].includes(r))) links.push({ id: 'companies', text: 'Empresas', href: '/companies', match: '/companies' });
  if (roles.includes('ADMIN')) {
    links.push({ id: 'people', text: 'Pessoas', href: '/users', match: '/users' });
    links.push({ id: 'catalog', text: 'Catálogo', href: '/indicators', match: '/indicators' });
  }
  if (roles.includes('MANAGER') && !roles.includes('ADMIN')) links.push({ id: 'team', text: 'Equipe', href: '/users', match: '/users' });
  return links;
}

/** Título da seção do menu: o que o perfil faz na plataforma. */
const sectionLabelFor = (user) => ((user?.roles || [user?.role]).includes('ADMIN') ? 'Administração' : 'Avaliação');

function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userLogged, logout } = useAuth();
  const { collapsed } = useSidebar();
  const [helpOpen, setHelpOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const links = linksFor(userLogged);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // O item mais específico ganha (o ciclo da empresa antes de "Empresas").
  const activeHref = links.filter((l) => pathname === l.match || pathname.startsWith(`${l.match}/`)).sort((a, b) => b.match.length - a.match.length)[0]?.href;
  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <>
      {helpOpen && <HelpModal setIsModalOpenFunction={setHelpOpen} />}
      <button
        type="button"
        className="fixed left-3 top-6 z-40 rounded-lg bg-white/95 p-2 text-[#0D3969] shadow-md lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="menu-principal"
      >
        <FiMenu size="1.4rem" aria-hidden />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <AppSidebarPanel
        open={open}
        onClose={() => setOpen(false)}
        collapsed={collapsed}
        sectionLabel={sectionLabelFor(userLogged)}
        links={links}
        activeHref={activeHref}
        settingsActive={pathname.startsWith('/settings')}
        onHelp={() => setHelpOpen(true)}
        onLogout={onLogout}
      />
    </>
  );
}

// Seleciona a lateral conforme a rota.
export function Sidebar() {
  const pathname = usePathname();
  const hidden = ['response-indicator', 'auto-avaliacao', 'indicatorExtract', 'recovery-password'].some((p) => pathname.includes(p));
  if (hidden) return null;
  return pathname === '/' ? <LoginAside /> : <AppSidebar />;
}
