'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Controller, FormProvider, useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from './label';

// shadcn/ui Form, como no original (módulo 64992).
export const Form = FormProvider;

const FormFieldContext = React.createContext({});
const FormItemContext = React.createContext({});

export const FormField = (props) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

function useFormField() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const state = getFieldState(field.name, formState);
  const { id } = item;
  return {
    id,
    name: field.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...state,
  };
}

export const FormItem = React.forwardRef(({ className, ...props }, ref) => {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2 relative', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

export const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive body-m transition-colors ease-in-out duration-100', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

export const FormControl = React.forwardRef(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

export const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;
  if (!body) return null;
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-[0.8rem] font-medium text-destructive absolute -bottom-4 text-xs text-rose-600', className)}
      {...props}
    >
      {body === 'Required' ? 'Obrigatório' : body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';
