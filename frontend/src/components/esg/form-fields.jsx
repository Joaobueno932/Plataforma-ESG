'use client';
/**
 * Campos de formulário (react-hook-form) no padrão do design system: label acima, controle de
 * 40px (`inputClass`), dica e erro abaixo. Usados pelos cadastros e pela troca de senha — a mesma
 * estrutura do modal de resposta, para que nenhum formulário fique "torto" em relação aos outros.
 */
import { useState } from 'react';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MaskInput } from '@/components/ui/mask-input';
import { cn } from '@/lib/utils';
import { inputClass } from './ui';

const LABEL = 'text-sm font-medium text-slate-800';
const MESSAGE = 'static text-xs font-medium text-red-700';

function FieldShell({ label, hint, required, className, children }) {
  return (
    <FormItem className={cn('flex flex-col gap-1.5 space-y-0', className)}>
      {label && (
        <FormLabel className={LABEL}>
          {label}
          {required && (
            <span className="text-red-600" aria-hidden>
              {' '}
              *
            </span>
          )}
        </FormLabel>
      )}
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <FormMessage className={MESSAGE} />
    </FormItem>
  );
}

/** Texto, e-mail, data… ou campo com máscara (`mask="cnpj" | "cpf" | …`). */
export function FormTextField({ form, name, label, hint, required, placeholder, type = 'text', mask, className, defaultValue, ...rest }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FieldShell label={label} hint={hint} required={required} className={className}>
          <FormControl>
            {mask ? (
              <MaskInput maskType={mask} placeholder={placeholder} type="text" field={{ ...field }} defaultValue={defaultValue} aria-required={required || undefined} className={cn(inputClass, 'h-10')} {...rest} />
            ) : (
              <input {...field} value={field.value ?? ''} type={type} placeholder={placeholder} aria-required={required || undefined} className={cn(inputClass, 'h-10')} {...rest} />
            )}
          </FormControl>
        </FieldShell>
      )}
    />
  );
}

/** Senha com botão de mostrar/ocultar dentro do campo. */
export function FormPasswordField({ form, name, label, hint, placeholder, className, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FieldShell label={label} hint={hint} className={className}>
          <div className="relative">
            <FormControl>
              <input {...field} value={field.value ?? ''} type={visible ? 'text' : 'password'} placeholder={placeholder} className={cn(inputClass, 'h-10 pr-10')} {...rest} />
            </FormControl>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 hover:text-[#0D3969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-03"
              aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {visible ? <IoEyeOutline aria-hidden /> : <IoEyeOffOutline aria-hidden />}
            </button>
          </div>
        </FieldShell>
      )}
    />
  );
}

/** Lista de opções (select nativo, como os filtros do ciclo). `onValueChange` recebe o valor escolhido. */
export function FormSelectField({ form, name, label, hint, required, placeholder = 'Selecione', options, className, onValueChange, disabled }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FieldShell label={label} hint={hint} required={required} className={className}>
          <FormControl>
            <select
              aria-required={required || undefined}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              disabled={disabled}
              onChange={(e) => {
                field.onChange(e.target.value);
                onValueChange?.(e.target.value);
              }}
              className={cn(inputClass, 'h-10 pr-8')}
            >
              <option value="" disabled>
                {placeholder}
              </option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.text}
                </option>
              ))}
            </select>
          </FormControl>
        </FieldShell>
      )}
    />
  );
}
