'use client';
/**
 * Casca visual de todas as telas internas (todos os perfis): sidebar azul-marinho com a imagem
 * institucional, suporte no rodapé e o perfil só no cabeçalho. Recebe links, rota ativa e ações
 * prontas de `sidebar.jsx`/`header.jsx` — aqui só há apresentação; o que cada perfil vê no menu
 * e pode fazer continua decidido pelas permissões (e, de fato, pela API).
 */
import Image from 'next/image';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';
import { LuBuilding2, LuCamera, LuChevronDown, LuHelpCircle, LuHome, LuLibrary, LuLogOut, LuPanelLeftClose, LuPanelLeftOpen, LuSettings, LuUsers } from 'react-icons/lu';
import logo from '@/assets/esg_logo_vertical.png';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/contexts/sidebar';
import { UserAvatar } from '@/components/people/user-avatar';
import { ROLE_NAME } from '@/lib/workflow';
import { cn } from '@/lib/utils';

/** Foto arquitetônica institucional (public/images). */
export const BUILDING_IMAGE = encodeURI('/images/auto avaliação.png');

/** Um ícone por destino do menu (o menu de cada perfil vem de `linksFor`). */
const NAV_ICONS = { cycle: LuHome, companies: LuBuilding2, people: LuUsers, catalog: LuLibrary, team: LuUsers };

const itemBase =
  'relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2D55]';
const itemIdle = 'text-white/85 hover:bg-white/10 hover:text-white';

function SectionLabel({ id, collapsed, children }) {
  return (
    <p id={id} className={cn('mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60', collapsed && 'lg:sr-only')}>
      {children}
    </p>
  );
}

/** Rótulo do item: some no modo recolhido (desktop), mas continua para leitores de tela. */
const Label = ({ collapsed, children }) => <span className={cn('truncate', collapsed && 'lg:sr-only')}>{children}</span>;

/**
 * `collapsed` só vale no desktop (lg+): a barra fica com 4.5rem e mostra apenas ícones, com o
 * nome no `title`. No celular a sidebar continua sendo a gaveta completa.
 */
export function AppSidebarPanel({ open, onClose, collapsed, sectionLabel, links, activeHref, settingsActive, onHelp, onLogout }) {
  const item = cn(itemBase, collapsed && 'lg:justify-center lg:px-0');
  return (
    <aside
      id="menu-principal"
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 overflow-hidden bg-[#0B2D55] text-white shadow-xl transition-[transform,width] duration-200 ease-out lg:z-30 lg:translate-x-0',
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-56',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-label="Menu principal"
    >
      {/* Fundo: gradiente institucional sobre a foto, escuro o bastante para o texto branco. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image src={BUILDING_IMAGE} alt="" fill sizes="16rem" className="object-cover object-[35%_100%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B2D55] via-[#0B2D55]/90 to-[#0B2D55]/45" />
      </div>

      {/* Conteúdo rola quando a altura não comporta; o suporte fica no rodapé quando sobra espaço. */}
      <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain">
        {/* Marca no topo, em branco sobre o azul. Recolhida, fica só o emblema circular. */}
        <div className={cn('relative flex shrink-0 items-start justify-between gap-2 px-5 pb-6 pt-6', collapsed && 'lg:justify-center lg:px-0 lg:pb-4')}>
          <div className={cn('h-[60px] w-[150px] shrink-0 overflow-hidden', collapsed && 'lg:h-10 lg:w-10')}>
            <Image
              src={logo}
              alt="ESG FIEMS — Governança Ambiental, Social e Corporativa"
              priority
              className={cn('h-full w-full object-contain object-left [filter:brightness(0)_invert(1)]', collapsed && 'lg:h-10 lg:w-auto lg:max-w-none')}
            />
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <FiX size="1.25rem" aria-hidden />
          </button>
        </div>

        <nav className="px-3" aria-labelledby="nav-avaliacao">
          <SectionLabel id="nav-avaliacao" collapsed={collapsed}>
            {sectionLabel}
          </SectionLabel>
          <ul className="flex flex-col gap-1">
            {links.map((l) => {
              const active = l.href === activeHref;
              const NavIcon = NAV_ICONS[l.id];
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? l.text : undefined}
                    className={cn(
                      item,
                      active
                        ? 'bg-[#1F6FD1] font-medium text-white shadow-[0_6px_16px_rgba(4,20,45,0.35)] before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-white'
                        : itemIdle,
                    )}
                  >
                    <NavIcon size="1.25rem" aria-hidden className="shrink-0" />
                    <Label collapsed={collapsed}>{l.text}</Label>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn('mt-auto px-3 pb-5 pt-8', collapsed && 'lg:px-2')}>
          <div className="border-t border-white/15 pt-5" role="group" aria-labelledby="nav-suporte">
            <SectionLabel id="nav-suporte" collapsed={collapsed}>
              Suporte
            </SectionLabel>
            <ul className="flex flex-col gap-1">
              <li>
                <button type="button" onClick={onHelp} title={collapsed ? 'Ajuda' : undefined} className={cn(item, itemIdle)}>
                  <LuHelpCircle size="1.25rem" aria-hidden className="shrink-0" />
                  <Label collapsed={collapsed}>Ajuda</Label>
                </button>
              </li>
              <li>
                <Link
                  href="/settings"
                  aria-current={settingsActive ? 'page' : undefined}
                  title={collapsed ? 'Configurações' : undefined}
                  className={cn(item, settingsActive ? 'bg-white/15 font-medium text-white' : itemIdle)}
                >
                  <LuSettings size="1.25rem" aria-hidden className="shrink-0" />
                  <Label collapsed={collapsed}>Configurações</Label>
                </Link>
              </li>
              <li>
                <button type="button" onClick={onLogout} title={collapsed ? 'Sair' : undefined} className={cn(item, itemIdle)}>
                  <LuLogOut size="1.25rem" aria-hidden className="shrink-0" />
                  <Label collapsed={collapsed}>Sair</Label>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Perfil no canto superior direito; o menu reúne as ações de conta que já existiam. */
function ProfileMenu({ user, onSettings, onLogout }) {
  if (!user)
    return (
      <div className="flex items-center gap-3" aria-busy="true" aria-label="Carregando perfil">
        <Skeleton className="h-11 w-11 rounded-full bg-slate-200" />
        <div className="hidden space-y-2 sm:block">
          <Skeleton className="h-4 w-28 rounded-full bg-slate-200" />
          <Skeleton className="h-3 w-24 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  const roles = user.roles || [user.role];
  const company = user.company?.bussinessName;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-3 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5DA8] data-[state=open]:bg-slate-100/80 sm:px-2"
          aria-label={`Menu do usuário: ${user.name}`}
        >
          <UserAvatar user={user} size="lg" ring fallbackClassName="bg-[#0D5DA8] text-white" />
          <span className="hidden min-w-0 max-w-[12rem] flex-col sm:flex">
            <span className="truncate text-sm font-semibold text-slate-900">{user.name}</span>
            {company && <span className="truncate text-xs text-slate-600">{company}</span>}
          </span>
          <LuChevronDown className="hidden text-slate-500 sm:block" size="1.1rem" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="mr-0 w-60 rounded-xl border-slate-200 p-1.5 shadow-lg">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-600">{roles.map((r) => ROLE_NAME[r] || r).join(' + ')}</p>
          {company && <p className="truncate text-xs text-slate-500">{company}</p>}
        </div>
        <div className="my-1 h-px bg-slate-100" role="separator" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-slate-700" onSelect={() => onSettings()}>
            <LuSettings aria-hidden /> Configurações
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-slate-700" onSelect={() => onSettings('foto')}>
            <LuCamera aria-hidden /> Foto de perfil
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-slate-700" onSelect={onLogout}>
            <LuLogOut aria-hidden /> Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ title, subtitle, user, onSettings, onLogout, inset = true }) {
  const sidebar = useSidebar();
  return (
    <header
      className={cn(
        'relative mb-5 flex min-h-[5.5rem] items-center gap-4 overflow-hidden border-b border-slate-200/80 bg-white pr-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:pr-6',
        // `inset`: há sidebar à esquerda (telas sem sidebar, como a resposta avulsa, ocupam a largura toda).
        inset ? 'pl-16 lg:ml-56 lg:pl-6' : 'pl-4 sm:pl-6',
      )}
    >
      {/* Recolher/expandir a sidebar fica no cabeçalho, fora da barra (só desktop; no celular há a gaveta). */}
      <button
        type="button"
        className={cn(
          'relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-[#0D3969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5DA8]',
          inset && sidebar.enabled && 'lg:flex',
        )}
        onClick={sidebar.toggle}
        aria-label={sidebar.collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        aria-expanded={!sidebar.collapsed}
        aria-controls="menu-principal"
        title={sidebar.collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {sidebar.collapsed ? <LuPanelLeftOpen size="1.25rem" aria-hidden /> : <LuPanelLeftClose size="1.25rem" aria-hidden />}
      </button>
      {/* Faixa arquitetônica discreta, esmaecida nas bordas para não competir com o texto. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block" aria-hidden>
        <Image src={BUILDING_IMAGE} alt="" fill sizes="58vw" className="object-cover object-[50%_75%] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-white/95" />
      </div>

      <div className="relative min-w-0 flex-1">
        <h2 className="truncate text-xl font-semibold text-[#0D3969] sm:text-[26px] sm:leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:text-xs">{subtitle}</p>}
      </div>

      <div className="relative flex shrink-0 items-center gap-3 sm:gap-5">
        <ProfileMenu user={user} onSettings={onSettings} onLogout={onLogout} />
      </div>
    </header>
  );
}
