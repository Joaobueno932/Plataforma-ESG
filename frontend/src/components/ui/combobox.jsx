'use client';
import { useEffect, useRef, useState } from 'react';
import { RxCaretSort } from 'react-icons/rx';

/**
 * Combobox digitável (o original usava react-widgets/Combobox, módulo 21481):
 * filtra `data` por `textField` e devolve o item escolhido em `onChange`.
 */
export function Combobox({ data = [], textField = 'name', defaultValue = '', onChange, disabled, placeholder, style }) {
  const [text, setText] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = (data || []).filter((d) => String(d[textField]).toLowerCase().includes(text.toLowerCase()));

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} className="relative w-full" style={style}>
      <div className={`flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 shadow-sm focus-within:border-primary-03 focus-within:ring-2 focus-within:ring-primary-03/30 ${disabled ? 'bg-slate-50 opacity-60' : ''}`}>
        <input
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
        />
        <button type="button" disabled={disabled} onClick={() => setOpen(!open)} aria-label="Abrir lista">
          <RxCaretSort className="h-4 w-4 opacity-50" />
        </button>
      </div>
      {open && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {items.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Nenhum resultado</li>}
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  setText(item[textField]);
                  setOpen(false);
                  onChange?.(item);
                }}
              >
                {item[textField]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
