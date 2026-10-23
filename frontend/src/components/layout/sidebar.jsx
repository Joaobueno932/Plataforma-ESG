'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SlGraph } from 'react-icons/sl';
import { MdBusiness, MdOutlineLiveHelp } from 'react-icons/md';
import { LuUsers, LuClipboardCheck } from 'react-icons/lu';
import { FiSettings, FiMenu, FiX } from 'react-icons/fi';
import { BiLogOut } from 'react-icons/bi';
import logo from '@/assets/esg_logo_vertical.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth';
import { ROLE_NAME } from '@/lib/workflow';
import { cn } from '@/lib/utils';
import { HelpModal } from './help-modal';
import { LoginAside } from './login-aside';

function initials(name = '') {
  const parts = name.split(' ');
  return `${name[0] ?? ''}${parts[1] ? parts[1][0] : name[name.length - 2] ?? ''}`.toUpperCase();
}

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
  if (roles.some((r) => companyRoles.includes(r)) && user.companyId)
    links.push({ text: 'Meu ciclo', href: `/companies/${user.companyId}`, icon: <LuClipboardCheck size="1.25rem" />, match: `/companies/${user.companyId}` });
  if (roles.some((r) => ['ADMIN', 'CONSULTOR', 'AUDITOR', 'SUPERVISOR'].includes(r)))
    links.push({ text: 'Empresas', href: '/companies', icon: <MdBusiness size="1.25rem" />, match: '/companies' });
  if (roles.includes('ADMIN')) {
    links.push({ text: 'Pessoas', href: '/users', icon: <LuUsers size="1.25rem" />, match: '/users' });
    links.push({ text: 'Catálogo', href: '/indicators', icon: <SlGraph size="1.25rem" />, match: '/indicators' });
  }
  if (roles.includes('MANAGER') && !roles.includes('ADMIN')) links.push({ text: 'Equipe', href: '/users', icon: <LuUsers size="1.25rem" />, match: '/users' });
  return links;
}

function UserBadge({ user }) {
  if (!user)
    return (
      <div className="flex h-[52px] items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full bg-zinc-400" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[60px] rounded-full bg-zinc-400" />
          <Skeleton className="h-3 w-[90px] rounded-full bg-zinc-400" />
        </div>
      </div>
    );
  const roles = user.roles || [user.role];
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback className="bg-gradient-to-br from-[#0D5DA8] to-[#0D3969] text-sm font-bold text-white">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-slate-900">{user.name}</span>
        <span className="truncate text-xs text-slate-600">{roles.map((r) => ROLE_NAME[r] || r).join(' + ')}</span>
        {user.company && <span className="truncate text-xs text-slate-500">{user.company.bussinessName}</span>}
      </div>
    </div>
  );
}

function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userLogged, logout } = useAuth();
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
      <aside
        id="menu-principal"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between bg-white shadow-xl transition-transform duration-200 ease-out lg:z-30 lg:w-56 lg:translate-x-0 lg:shadow-md',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menu principal"
      >
        <div className="relative flex h-40 items-center justify-center px-4 pt-2">
          <Image src={logo} alt="ESG FIEMS" width={170} height={80} priority />
          <button type="button" className="absolute right-2 top-2 rounded-md p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <FiX size="1.25rem" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-1">
            {links.map((l) => {
              const active = l.href === activeHref;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                      active ? 'bg-[#0D5DA8] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100 hover:text-[#0D3969]',
                    )}
                  >
                    {l.icon}
                    {l.text}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              <MdOutlineLiveHelp size="1.2rem" aria-hidden /> Ajuda
            </button>
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              <FiSettings size="1.1rem" aria-hidden /> Configurações
            </Link>
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
            >
              <BiLogOut size="1.2rem" aria-hidden /> Sair
            </button>
          </div>
          <UserBadge user={userLogged} />
        </footer>
      </aside>
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
