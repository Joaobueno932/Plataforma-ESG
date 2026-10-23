'use client';
import { usePathname } from 'next/navigation';

const TITLES = {
  companies: 'Empresas',
  questionnaires: 'Questionários',
  users: 'Pessoas',
  indicators: 'Catálogo de indicadores',
  settings: 'Configurações',
};

// Faixa superior das telas internas, na cor da marca.
export function Header() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1];
  const hidden = ['auto-avaliacao', 'indicatorExtract', 'recovery-password'].some((p) => pathname.includes(p));
  if (pathname === '/' || hidden) return null;
  const title = segment === 'companies' && pathname.split('/').length > 2 ? 'Avaliação ESG' : TITLES[segment];
  return (
    <header
      className={`mb-5 flex min-h-[5rem] w-auto items-center bg-gradient-to-r from-[#0D3969] to-[#0D5DA8] pl-16 pr-6 shadow-md sm:pr-8 lg:pl-8 ${
        pathname.includes('response-indicator') ? 'ml-0' : 'lg:ml-56'
      }`}
    >
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
    </header>
  );
}
