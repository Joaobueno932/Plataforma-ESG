import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'appearance-none flex h-12 w-full rounded-md border border-input bg-transparent py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer input-base body-s  ease-in-out  duration-500 hover:bg-gray-200 px-4 border-gray-200 hover:border-gray-200 outline-none focus:border-primary focus:text-primary focus:bg-white',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';
