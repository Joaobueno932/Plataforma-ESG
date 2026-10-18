'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SlGraph } from 'react-icons/sl';
import { MdBusiness, MdOutlineLiveHelp } from 'react-icons/md';
import { LuUsers } from 'react-icons/lu';
import { FiSettings } from 'react-icons/fi';
import { BiLogOut } from 'react-icons/bi';
import logo from '@/assets/esg_logo_vertical.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth';
import { HelpModal } from './help-modal';
import { LoginAside } from './login-aside';

const LINKS = [
  { text: 'Indicadores', href: '/indicators', icon: <SlGraph size="1.5rem" /> },
  { text: 'Empresas', href: '/companies', icon: <MdBusiness size="1.5rem" /> },
  { text: 'Usuários', href: '/users', icon: <LuUsers size="1.5rem" /> },
];

const NAV_ITEM =
  'flex items-center justify-center gap-3 border-2 border-primary-03 rounded-lg py-2 hover:bg-primary-03 text-primary-03 body-m hover:text-white transition-colors duration-300 ease-in-out ';

function initials(name = '') {
  const parts = name.split(' ');
  return `${name[0] ?? ''}${parts[1] ? parts[1][0] : name[name.length - 2] ?? ''}`.toUpperCase();
}

function UserBadge() {
  const { userLogged } = useAuth();
  if (!userLogged)
    return (
      <div className="flex items-center space-x-4 h-[52px]">
        <Skeleton className="h-10 w-10 rounded-full bg-zinc-400" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-[50px] bg-zinc-400 rounded-full" />
          <Skeleton className="h-3 w-[80px] bg-zinc-400 rounded-full" />
        </div>
      </div>
    );
  return (
    <div className="relative flex items-center gap-3">
      <Avatar>
        <AvatarImage src={userLogged.avatar ?? undefined} />
        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-white text-lg">{initials(userLogged.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col w-32">
        <h6 className="label-s">{userLogged.name}</h6>
        <span className="body-s text-neutral-03 text-ellipsis overflow-hidden">{userLogged.email}</span>
      </div>
    </div>
  );
}

function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userLogged, logout } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const links = userLogged?.role === 'AUDITOR' ? LINKS.filter((l) => l.text === 'Empresas') : LINKS;

  return (
    <>
      {helpOpen && <HelpModal setIsModalOpenFunction={setHelpOpen} />}
      <aside className="fixed bg-white min-h-screen w-56 drop-shadow-sm shadow-md flex flex-col justify-between">
        <div className="w-full h-56 py-4 flex justify-center items-center">
          <Image src={logo} alt="imagem da logo" width={200} height={94.45} />
        </div>
        <nav className="h-[25rem] flex-1">
          <ul className="flex flex-col gap-7 p-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                <li className={NAV_ITEM + (pathname.includes(l.href) && userLogged?.role !== 'AUDITOR' ? 'bg-primary-03 text-white hover:bg-primary-03/90' : '')}>
                  {l.icon}
                  {l.text}
                </li>
              </Link>
            ))}
          </ul>
        </nav>
        <footer className="flex flex-col gap-4 bg-primary-01 p-4">
          <div className="pb-7 border-b border-primary flex flex-col gap-2">
            <Button onClick={() => setHelpOpen(true)} className="flex gap-2">
              <MdOutlineLiveHelp size="1.5rem" />
              <span>Ajuda</span>
            </Button>
            <Link
              href="/settings"
              className="flex gap-2 items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 bg-primary-03 text-white shadow hover:bg-primary-03/90 h-9 px-4 py-2"
            >
              <FiSettings size="1.5rem" />
              <span>Configurações</span>
            </Link>
            <Button
              className="w-full flex gap-2 body-m bg-primary-02 hover:bg-primary-02/90"
              onClick={() => {
                logout();
                router.push('/');
              }}
            >
              <BiLogOut size="1.5rem" />
              Sair
            </Button>
          </div>
          <UserBadge />
        </footer>
      </aside>
    </>
  );
}

// Seleciona a lateral conforme a rota (módulo 67321 "H").
export function Sidebar() {
  const pathname = usePathname();
  const hidden = ['response-indicator', 'auto-avaliacao', 'indicatorExtract', 'recovery-password'].some((p) => pathname.includes(p));
  if (hidden) return null;
  return pathname === '/' ? <LoginAside /> : <AppSidebar />;
}
