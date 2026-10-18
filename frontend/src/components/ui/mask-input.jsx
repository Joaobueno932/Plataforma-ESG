import * as React from 'react';
import { cn } from '@/lib/utils';

const PATTERNS = {
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  phone: '(99) 99999-9999',
  cep: '99999-999',
};

export const unMask = (value) => String(value ?? '').replace(/\W/g, '');

/** Equivalente ao `remask` usado pelo original: aplica o padrão sobre os dígitos digitados. */
export function mask(value, type) {
  const pattern = PATTERNS[type];
  const raw = unMask(value);
  if (!pattern) return String(value ?? '');
  const digits = raw.replace(/\D/g, '');
  let out = '';
  let i = 0;
  for (const ch of pattern) {
    if (i >= digits.length) break;
    out += ch === '9' ? digits[i++] : ch;
  }
  return out;
}

// Módulo 69279 do original.
export const MaskInput = React.forwardRef(({ className, type, maskType, field = {}, defaultValue, ...props }, ref) => {
  const [value, setValue] = React.useState(defaultValue != null ? mask(defaultValue, maskType) : '');
  return (
    <input
      type={type}
      className={cn(
        'appearance-none flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base input-placeholder  ease-in-out  duration-500',
        className,
      )}
      {...field}
      value={value}
      onChange={(e) => {
        const masked = mask(e.currentTarget.value, maskType);
        setValue(masked);
        field.onChange?.(masked);
      }}
      ref={ref}
      {...props}
    />
  );
});
MaskInput.displayName = 'Input';
