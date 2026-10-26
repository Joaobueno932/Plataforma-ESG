'use client';
import { useRef } from 'react';
import { FiSearch } from 'react-icons/fi';

// Campo de busca das listas (módulo 40712): pesquisa ao clicar na lupa ou ao pressionar Enter.
export function SearchInput({ placeholder, handleChange }) {
  const ref = useRef(null);
  return (
    <div role="search" className="flex h-10 w-full max-w-[25rem] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 shadow-sm focus-within:border-primary-03 focus-within:ring-2 focus-within:ring-primary-03/30">
      <button type="button" onClick={() => handleChange(ref.current?.value ?? '')} aria-label="Pesquisar" className="rounded text-slate-400 hover:text-[#0D3969]">
        <FiSearch size="1.1rem" aria-hidden />
      </button>
      <input
        ref={ref}
        type="text"
        name="search"
        id="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        onKeyDown={(e) => e.key === 'Enter' && handleChange(e.currentTarget.value)}
      />
    </div>
  );
}
