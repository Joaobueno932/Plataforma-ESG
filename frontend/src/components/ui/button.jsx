import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Variantes recuperadas do bundle original (módulo 93378).
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 ',
  {
    variants: {
      variant: {
        default: 'bg-primary-03 text-white shadow hover:bg-primary-03/90',
        'primary-02': 'bg-primary-02 text-white shadow hover:bg-primary-02/90',
        'primary-main': 'bg-primary-main text-white hover:bg-primary-main/90',
        secondary: 'bg-secondary-02 text-white shadow-sm hover:bg-secondary-03',
        neutral: 'bg-neutral-02 text-neutral hover:text-white hover:bg-neutral-03',
        'neutral-02': 'bg-neutral-03 text-neutral-01 hover:bg-neutral-03/90',
        error: 'bg-semantic-error text-white shadow-sm hover:bg-[#FF301CB2]',
        alert: 'text-neutral bg-semantic-alert hover:bg-[#CA9715]',
        success: 'bg-semantic-success text-neutral shadow-sm hover:bg-secondary-02',
        'success-2': 'bg-semantic-success-2 text-white shadow-sm hover:bg-semantic-success-2',
        link: 'text-neutral bg-semantic-link hover:bg-[#18D3DE]',
        outline: 'border border-primary-03 text-primary-03 bg-transparent shadow-sm hover:bg-primary-03 hover:text-white',
        'outline-white': 'border border-white text-white bg-transparent shadow-sm hover:bg-white hover:text-primary-03',
        'outline-02': 'border border-neutral-01 text-primary-03 bg-neutral-01 shadow-sm hover:bg-primary-03 hover:text-white hover:border-primary-03',
        'outline-03': 'text-[#0E3A68] bg-white border-solid border-2 border-[#759EE7] disabled:border-[0px]',
        ghost: 'hover:bg-transparent hover:text-neutral',
        'card-answer': 'bg-black text-white shadow-md hover:bg-black/90',
        'dark-blue': 'bg-[#0E3A68] text-white shadow-sm hover:bg-[#0b335f]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
        free: '',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';
