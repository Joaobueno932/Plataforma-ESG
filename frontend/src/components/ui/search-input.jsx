'use client';
import { useRef } from 'react';
import { FiSearch } from 'react-icons/fi';

// Campo de busca das listas (módulo 40712): pesquisa ao clicar na lupa ou ao pressionar Enter.
export function SearchInput({ placeholder, handleChange }) {
  const ref = useRef(null);
  return (
    <fieldset className="flex items-center gap-2 w-[25rem] h-11 rounded-lg border-2 px-4 bg-white">
      <button type="button" onClick={() => handleChange(ref.current?.value ?? '')} aria-label="Pesquisar">
        <FiSearch size="1.25rem" className="stroke-neutral-03" />
      </button>
      <input
        ref={ref}
        type="text"
        name="search"
        id="search"
        placeholder={placeholder}
        className="outline-none w-full bg-transparent"
        onKeyDown={(e) => e.key === 'Enter' && handleChange(e.currentTarget.value)}
      />
    </fieldset>
  );
}
