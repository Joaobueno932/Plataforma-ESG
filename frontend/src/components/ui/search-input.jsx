'use client';
import { useRef } from 'react';
import { FiSearch } from 'react-icons/fi';

// Campo de busca das listas (módulo 40712): pesquisa ao clicar na lupa ou ao pressionar Enter.
export function SearchInput({ placeholder, handleChange }) {
  const ref = useRef(null);
  return (
    <fieldset className="flex h-11 w-full max-w-[25rem] items-center gap-2 rounded-lg border-2 bg-white px-4">
      <button type="button" onClick={() => handleChange(ref.current?.value ?? '')} aria-label="Pesquisar">
        <FiSearch size="1.25rem" className="stroke-neutral-03" />
      </button>
      <input
        ref={ref}
        type="text"
        name="search"
        id="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 outline-none w-full bg-transparent"
        onKeyDown={(e) => e.key === 'Enter' && handleChange(e.currentTarget.value)}
      />
    </fieldset>
  );
}
