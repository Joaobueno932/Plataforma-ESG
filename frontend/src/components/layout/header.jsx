'use client';
import { usePathname } from 'next/navigation';

const TITLES = {
  companies: 'Empresas',
  questionnaires: 'Questionários',
  users: 'Usuários',
  indicators: 'Indicadores',
  settings: 'Configurações',
};

// Cabeçalho azul das telas internas (módulo 57498).
export function Header() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1];
  const hidden = ['auto-avaliacao', 'indicatorExtract', 'recovery-password'].some((p) => pathname.includes(p));
  if (pathname === '/' || hidden) return null;
  return (
    <header
      className={`w-full min-h-[6rem] bg-primary flex items-center px-8 shadow-md mb-5 ${pathname.includes('response-indicator') ? 'ml-0' : 'ml-56'}`}
    >
      <h2 className="title-l text-white">{Object.keys(TITLES).includes(segment) && TITLES[segment]}</h2>
    </header>
  );
}
