'use client';
/** Tabs (shadcn/ui v4 sobre Radix): setas do teclado navegam, Tab entra no painel. */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex w-full gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]', className)}
      {...props}
    />
  );
});

export const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors',
        'hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-03 focus-visible:ring-offset-1 rounded-t-md',
        'data-[state=active]:border-primary-03 data-[state=active]:text-primary-04',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn('pt-5 outline-none', className)} {...props} />;
});
