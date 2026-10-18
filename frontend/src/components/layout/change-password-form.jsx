'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiEyeFill, RiEyeOffFill } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { changeOwnPassword } from '@/services/auth';
import { notify } from '@/lib/toast';

export const passwordSchema = z
  .object({
    password: z.string({ required_error: '*O campo senha é obrigatório' }).min(4, { message: '*O campo deve ter no minímo 4 caracteres' }).optional(),
    confirmPassword: z.string({ required_error: '*O campo senha é obrigatório' }).min(4, { message: '*O campo deve ter no minímo 4 caracteres' }).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: 'As senhas não correspondem', path: ['confirmPassword'] });

function PasswordField({ form, name, placeholder, label, visible, toggle }) {
  return (
    <div className="relative">
      <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
          <FormItem className="group/fieldset relative flex flex-col-reverse gap-1 mb-1">
            <FormControl>
              <>
                <Input placeholder={placeholder} {...field} value={field.value ?? ''} type={visible ? 'text' : 'password'} />
                <FormLabel className="input-label-float -top-4 left-2 text-xs">{label}</FormLabel>
              </>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <button type="button" onClick={toggle} className="absolute right-3 top-4" aria-label="Mostrar senha">
        {visible ? <RiEyeFill className="fill-blue-500" /> : <RiEyeOffFill className="fill-blue-500" />}
      </button>
    </div>
  );
}

/**
 * Formulário "Redefinição de senha" (módulo 75644). Usa PATCH /users/:id com a
 * nova senha do próprio usuário logado.
 */
export function ChangePasswordForm({ onDone, className = 'w-[70%] flex flex-col gap-6' }) {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const form = useForm({ resolver: zodResolver(passwordSchema) });

  const submit = async (values) => {
    if (!values.password || values.password.length <= 4) {
      notify('Passe uma senha valida.', 'error');
      return;
    }
    try {
      const res = await changeOwnPassword({ password: values.password });
      if (res.status === 200) {
        form.reset({ password: '', confirmPassword: '' });
        onDone?.();
        return notify('Sucesso, senha alterada!', 'success');
      }
    } catch {
      /* mensagem abaixo */
    }
    notify('Erro interno, tente novamento ou contate o suporte', 'error');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={className} noValidate autoComplete="off">
        <PasswordField form={form} name="password" placeholder="Digite sua nova senha" label="Nova senha" visible={show1} toggle={() => setShow1(!show1)} />
        <PasswordField form={form} name="confirmPassword" placeholder="Confirme sua senha" label="Confirme sua nova senha" visible={show2} toggle={() => setShow2(!show2)} />
        <Button size="lg">salvar nova senha</Button>
      </form>
    </Form>
  );
}
