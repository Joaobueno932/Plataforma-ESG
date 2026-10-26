'use client';
/**
 * Primitivas visuais das telas reconstruídas (identidade FIEMS: azuis #0D3969/#0D5DA8, superfícies
 * claras, tipografia legível). Componentes pequenos e sem estado de negócio.
 */
import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const btn = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-03 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-03 text-white shadow-sm hover:bg-primary-04',
        secondary: 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
        success: 'bg-[#2E8B3E] text-white shadow-sm hover:bg-[#25722F]',
        danger: 'bg-[#C21D24] text-white shadow-sm hover:bg-[#A3171D]',
        'danger-ghost': 'text-[#C21D24] hover:bg-red-50',
        warning: 'bg-[#FFBC24] text-slate-900 shadow-sm hover:bg-[#F2AC0A]',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export const Btn = React.forwardRef(function Btn({ className, variant, size, loading, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={cn(btn({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

const TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-blue-50 text-[#0D5DA8] ring-blue-200',
  success: 'bg-green-50 text-green-800 ring-green-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  brand: 'bg-[#0D3969] text-white ring-[#0D3969]',
  // Identificação de perfis (Pessoas/Equipe).
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200',
  // Classificação do indicador (listagem do Gestor).
  mandatory: 'bg-[#FFF0F0] text-[#B91C1C] ring-[#FCA5A5]',
  sector: 'bg-[#FFF4CC] text-[#A16207] ring-[#FACC15]',
};

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)} {...props}>
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <svg className={cn('animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Contêiner padrão das telas internas (respiro, largura útil e deslocamento da sidebar). */
export const PAGE = 'esg-surface flex flex-col gap-6 px-4 pb-16 pt-2 sm:px-8 lg:ml-56';

/**
 * Título de página do design system: sobretítulo opcional, título institucional, descrição ou
 * linha de metadados (`meta`) e ações à direita. O mesmo em todas as telas e perfis.
 */
export function PageHeading({ eyebrow, title, description, meta, actions, media, className }) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-4">
        {media && <div className="hidden shrink-0 sm:block">{media}</div>}
        <div className="min-w-0">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{eyebrow}</p>}
        <h1 className={cn('truncate text-2xl font-bold text-[#0D3969] sm:text-[30px] sm:leading-tight', eyebrow && 'mt-1')}>{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-600 sm:text-[15px]">{description}</p>}
        {meta}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">{actions}</div>}
    </div>
  );
}

/**
 * Rodapé de paginação das listas (mesmo em Empresas, Pessoas e demais tabelas). Com `total` e
 * `perPage`, mostra também "Mostrando x–y de N {noun}".
 */
export function Pagination({ page, pages, onPrevious, onNext, total, perPage, noun = 'registros' }) {
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = total ? Math.min(total, page * perPage) : 0;
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-600" aria-live="polite">
        {total !== undefined && perPage ? (
          <>
            Mostrando <strong className="font-semibold text-slate-800">{from}–{to}</strong> de <strong className="font-semibold text-slate-800">{total}</strong> {noun}
            <span className="text-slate-400"> · </span>
          </>
        ) : null}
        Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Btn type="button" size="sm" variant="secondary" onClick={onPrevious}>
            Anterior
          </Btn>
        )}
        {page < pages && (
          <Btn type="button" size="sm" variant="secondary" onClick={onNext}>
            Próximo
          </Btn>
        )}
      </div>
    </div>
  );
}

export function Card({ className, ...props }) {
  return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)} {...props} />;
}

export function CardHeader({ title, description, actions, icon, className }) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 shrink-0 text-[1.375rem] text-[#0D5DA8]">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Cartão de resumo: fundo suave na cor do tom, ícone, valor em destaque e dica discreta. */
const STAT_TONES = {
  neutral: { card: 'border-slate-200 bg-white', label: 'text-slate-600', value: 'text-slate-700' },
  info: { card: 'border-blue-200/80 bg-blue-50/70', label: 'text-[#0D5DA8]', value: 'text-[#0D3969]' },
  violet: { card: 'border-violet-200/80 bg-violet-50/70', label: 'text-violet-700', value: 'text-violet-700' },
  success: { card: 'border-emerald-200/80 bg-emerald-50/70', label: 'text-emerald-700', value: 'text-emerald-700' },
  warning: { card: 'border-orange-200/80 bg-orange-50/70', label: 'text-orange-700', value: 'text-orange-600' },
  danger: { card: 'border-red-200/80 bg-red-50/70', label: 'text-red-700', value: 'text-red-700' },
};

export function Stat({ label, value, hint, tone = 'neutral', icon }) {
  const t = STAT_TONES[tone] || STAT_TONES.neutral;
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:px-5', t.card)}>
      <div className={cn('flex min-h-[1.75rem] items-center gap-2 text-[11px] font-semibold uppercase leading-tight tracking-wide', t.label)}>
        {icon && <span className="shrink-0 text-[1.25rem]">{icon}</span>}
        {label}
      </div>
      {/* Valores longos ("8 pendente(s)") reduzem a fonte para caber na coluna estreita do desktop. */}
      <div className={cn('font-bold leading-none tabular-nums', String(value).length > 6 ? 'text-xl xl:text-[1.375rem]' : 'text-[1.75rem]', t.value)}>{value}</div>
      {hint && <div className="text-xs text-slate-600">{hint}</div>}
    </div>
  );
}

export function Progress({ value, max = 100, label, color = '#0D5DA8', className }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('w-full', className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      {icon && <div className="text-slate-400">{icon}</div>}
      <p className="font-medium text-slate-800">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-medium text-red-800">Não foi possível carregar</p>
      <p className="max-w-lg text-sm text-red-700">{message}</p>
      {onRetry && (
        <Btn variant="secondary" size="sm" onClick={onRetry}>
          Tentar de novo
        </Btn>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-03 focus:outline-none focus:ring-2 focus:ring-primary-03/30 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-500';

export const TextInput = React.forwardRef(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, 'h-10', className)} {...props} />;
});
export const TextArea = React.forwardRef(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, 'min-h-[96px] resize-y', className)} {...props} />;
});
export const SelectInput = React.forwardRef(function SelectInput({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(inputClass, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  );
});

export function Notice({ tone = 'info', title, icon, children, className }) {
  const style = {
    info: 'border-blue-200 bg-blue-50 text-[#0D3969]',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-green-200 bg-green-50 text-green-900',
  }[tone];
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', style, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon ? (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[1.25rem]">{icon}</span>
          <div className="min-w-0">
            {title && <p className="font-semibold">{title}</p>}
            <div className={title ? 'mt-0.5' : ''}>{children}</div>
          </div>
        </div>
      ) : (
        <>
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-0.5' : ''}>{children}</div>
        </>
      )}
    </div>
  );
}

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const formatDay = (value) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
export const formatBytes = (n) => (n == null ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
