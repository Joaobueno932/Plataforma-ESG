'use client';
/**
 * Logo da empresa — a mesma na lista de empresas, no cabeçalho do ciclo e nos cadastros. A imagem
 * mantém a proporção (logo horizontal não vira quadrado); sem logo, ou se a imagem não carregar
 * (ex.: URL antiga fora do ar), aparece o ícone institucional — nunca uma imagem quebrada.
 */
import { useEffect, useState } from 'react';
import { LuBuilding2 } from 'react-icons/lu';
import { apiAsset } from '@/lib/format';
import { cn } from '@/lib/utils';

const SIZES = { sm: 'h-9 w-14', md: 'h-12 w-20', lg: 'h-16 w-28' };

export function CompanyLogo({ company, src, size = 'sm', className }) {
  const url = src || apiAsset(company?.avatar);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1', SIZES[size], className)}>
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={company?.bussinessName ? `Logo de ${company.bussinessName}` : ''} className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <LuBuilding2 className="text-[1.15rem] text-slate-400" aria-hidden />
      )}
    </span>
  );
}
