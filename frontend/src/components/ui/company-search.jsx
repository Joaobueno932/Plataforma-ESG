'use client';
import { useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

/**
 * Busca com lista suspensa (módulo 71616). Filtra `data` por `textField`
 * e devolve o id escolhido em `changeSelect`.
 */
export function CompanySearch({ changeSelect, data, textField = 'bussinessName', placeholder = 'Pesquisar empresa' }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filter = (value) => {
    if (!open) setOpen(true);
    if (!value || value.length <= 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    setResults((data || []).filter((item) => String(item[textField]).toLowerCase().includes(value.toLowerCase())));
  };

  useEffect(() => {
    const onDown = (e) => listRef.current && e.target && !listRef.current.contains(e.target) && setOpen(false);
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="flex flex-col relative">
      <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 shadow-sm focus-within:border-primary-03 focus-within:ring-2 focus-within:ring-primary-03/30">
        <button type="button" onClick={() => filter(inputRef.current?.value)} aria-label="Pesquisar">
          <FiSearch size="1.1rem" className="text-slate-400" aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="text"
          name="search"
          id="search"
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          onChange={(e) => filter(e.target.value)}
        />
      </div>
      {open && (
        <div className={`absolute top-11 z-10 flex max-h-[220px] w-full flex-col overflow-y-auto rounded-lg border border-slate-200 bg-white ${open && results.length ? 'shadow-lg' : 'hidden'}`} ref={listRef}>
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="border-b border-slate-100 bg-white px-3 py-2.5 text-start text-sm text-slate-800 last:border-0 hover:bg-slate-50"
              onClick={() => {
                changeSelect(item.id, item);
                setOpen(false);
              }}
            >
              {item[textField]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
