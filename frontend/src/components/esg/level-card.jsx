'use client';
/**
 * Cartão de alternativa fiel aos cadernos oficiais: faixa colorida com o nome do nível, corpo
 * claro com borda da mesma cor, explicação do nível, pontuação assentada na borda inferior e
 * faixa "Mínimo exigido" no nível de maturidade mínima exigida pelo caderno (onde o PDF imprime
 * "OBRIGATÓRIO"). A quantidade de cartões é a do indicador.
 *
 * Seleção: anel externo + marca de verificação + texto "Selecionada" — as cores dos cartões
 * não mudam com a seleção e a escolha não depende só da cor. O grupo é um `radiogroup`:
 * setas movem entre os níveis, Espaço/Enter selecionam.
 */
import * as React from 'react';
import { IoCheckmarkCircle, IoFlag } from 'react-icons/io5';
import { cn } from '@/lib/utils';
import { levelColor, levelName, readableOn, sortByPosition } from '@/lib/levels';

export function LevelCard({ answer, selected = false, audited = false, interactive = false, onSelect, tabIndex, compact = false, cardRef }) {
  const color = levelColor(answer);
  const onBand = readableOn(color);
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      ref={cardRef}
      type={interactive ? 'button' : undefined}
      role={interactive ? 'radio' : undefined}
      aria-checked={interactive ? selected : undefined}
      tabIndex={interactive ? tabIndex : undefined}
      onClick={interactive ? () => onSelect?.(answer) : undefined}
      className={cn(
        'group relative flex w-full min-w-0 flex-col text-left outline-none transition-[transform,box-shadow] duration-150',
        interactive && 'cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-03 focus-visible:ring-offset-2',
        selected && 'ring-[3px] ring-offset-2 ring-[#0D3969] rounded-[6px]',
      )}
      style={{ minHeight: compact ? 0 : 200 }}
    >
      <span
        className="block rounded-t-[3px] px-3 py-1.5 text-center text-sm font-semibold"
        style={{ background: color, color: onBand }}
      >
        {levelName(answer)}
      </span>
      <span className="relative flex flex-1 flex-col border-x-2 border-b-2 bg-white" style={{ borderColor: color }}>
        <span className={cn('flex-1 px-3 pb-6 pt-3 text-[13px] leading-relaxed text-slate-700', compact && 'line-clamp-4')}>{answer.description}</span>
        {/* Marca do piso, não da escolha: a seleção usa anel + selo "Selecionada" no topo. */}
        {answer.mandatory && (
          <span className="mx-0 flex items-center justify-center gap-1 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide" style={{ background: color, color: onBand }}>
            <IoFlag aria-hidden /> Mínimo exigido
          </span>
        )}
        <span
          className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 text-xs font-medium tabular-nums text-slate-700"
          aria-label={`${answer.points} pontos`}
        >
          {answer.points} {Number(answer.points) === 1 ? 'ponto' : 'pontos'}
        </span>
      </span>
      {(selected || audited) && (
        <span
          className={cn(
            'absolute -right-2 -top-3.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow',
            audited ? 'bg-[#0D3969] text-white' : 'bg-white text-[#0D3969] ring-1 ring-[#0D3969]',
          )}
        >
          <IoCheckmarkCircle aria-hidden />
          {audited ? 'Auditado' : 'Selecionada'}
        </span>
      )}
    </Tag>
  );
}

/** Grade de cartões do indicador, com navegação de teclado de radiogroup. */
export function LevelCards({ answers = [], value, auditedValue, onChange, readOnly = false, label = 'Nível de maturidade', compact = false }) {
  const ordered = sortByPosition(answers);
  const refs = React.useRef([]);
  const selectedIndex = Math.max(0, ordered.findIndex((a) => a.id === value));

  const onKeyDown = (event) => {
    if (readOnly) return;
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const current = refs.current.findIndex((el) => el === document.activeElement);
    const next = (Math.max(0, current) + keys[event.key] + ordered.length) % ordered.length;
    refs.current[next]?.focus();
    onChange?.(ordered[next]);
  };

  const columns = ordered.length >= 6 ? 'lg:grid-cols-3 xl:grid-cols-6' : ordered.length === 5 ? 'lg:grid-cols-5' : ordered.length === 4 ? 'lg:grid-cols-4' : ordered.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <div
      role={readOnly ? 'list' : 'radiogroup'}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('grid grid-cols-1 gap-x-3 gap-y-6 pb-3 pt-2 sm:grid-cols-2', columns)}
    >
      {ordered.map((answer, index) => (
        <div key={answer.id} role={readOnly ? 'listitem' : undefined} className="min-w-0">
          <LevelCard
            answer={answer}
            selected={value === answer.id}
            audited={auditedValue === answer.id}
            interactive={!readOnly}
            onSelect={onChange}
            compact={compact}
            tabIndex={index === selectedIndex ? 0 : -1}
            cardRef={(el) => (refs.current[index] = el)}
          />
        </div>
      ))}
    </div>
  );
}
