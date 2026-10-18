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
      <div className="flex items-center gap-2 w-full h-14 rounded-lg border-1 px-4 bg-neutral-01 shadow-sm">
        <button type="button" onClick={() => filter(inputRef.current?.value)} aria-label="Pesquisar">
          <FiSearch size="1.25rem" className="stroke-neutral-03" />
        </button>
        <input
          ref={inputRef}
          type="text"
          name="search"
          id="search"
          placeholder={placeholder}
          className="outline-none w-full bg-transparent"
          onChange={(e) => filter(e.target.value)}
        />
      </div>
      {open && (
        <div className={`flex flex-col w-full overflow-y-auto max-h-[170px] absolute top-14 z-10 ${open && 'shadow-md'}`} ref={listRef}>
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="bg p-4 rounded border-[1px] border-neutral-02 hover:bg-neutral-01 text-start bg-white"
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
