'use client';
/**
 * Dialog (shadcn/ui v4 sobre Radix). Radix cuida do essencial de acessibilidade: foco inicial
 * no conteúdo, foco preso dentro do diálogo, Esc para fechar e **retorno do foco** ao botão que
 * abriu. O conteúdo cabe na tela e rola internamente; o rodapé de ações fica sempre visível.
 *
 * Movimento curto e com saída suave (opacity + transform, ≤ 200 ms), desligado quando o sistema
 * pede menos movimento — ver `.esg-dialog-*` em globals.css.
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IoClose } from 'react-icons/io5';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef(function DialogContent(
  { className, children, size = 'lg', hideClose = false, onInteractOutside, ...props },
  ref,
) {
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-5xl', xl: 'sm:max-w-7xl' }[size] || 'sm:max-w-5xl';
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="esg-dialog-overlay fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        ref={ref}
        onInteractOutside={onInteractOutside}
        className={cn(
          'esg-dialog-content fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none',
          width,
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-03"
            aria-label="Fechar"
          >
            <IoClose size="1.25rem" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('shrink-0 border-b border-slate-200 px-5 pb-4 pt-5 pr-14 sm:px-7', className)} {...props} />
);
export const DialogBody = ({ className, ...props }) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7', className)} {...props} />
);
export const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn('flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-7', className)}
    {...props}
  />
);
export const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-snug text-slate-900 sm:text-xl', className)} {...props} />;
});
export const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('mt-1 text-sm text-slate-600', className)} {...props} />;
});
