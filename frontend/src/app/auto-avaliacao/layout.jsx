'use client';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import logoHorizontal from '@/assets/esg_logo_horizontal.png';
import systemLogo from '@/assets/system_logo.svg';

function AutoEvaluationHeader() {
  const pathname = usePathname();
  if (pathname.includes('feedback')) return null;
  return (
    <header className="bg-[#fff] shadow h-20">
      <div className="container mx-auto flex justify-between items-center h-full">
        <a href="/">
          <Image alt="Imagem da logo ESG FIEMS" src={logoHorizontal} height={50} />
        </a>
        <nav className="flex items-center gap-6">
          <a href="https://www.ms.senai.br/" target="_blank" rel="noreferrer">
            <Image alt="Imagem da logo do sistema FIEMS" src={systemLogo} height={70} />
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function AutoEvaluationLayout({ children }) {
  return (
    <div className="min-h-screen h-full">
      <AutoEvaluationHeader />
      {children}
    </div>
  );
}
