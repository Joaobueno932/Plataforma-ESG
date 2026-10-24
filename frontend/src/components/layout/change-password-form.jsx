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

const PASSWORD_MIN = 8;
const newPassword = z
  .string({ required_error: '*O campo senha é obrigatório' })
  .min(PASSWORD_MIN, { message: `*A senha deve ter no mínimo ${PASSWORD_MIN} caracteres` });

/** Redefinição por link de recuperação: sem senha atual. */
export const passwordSchema = z
  .object({ password: newPassword, confirmPassword: newPassword })
  .refine((v) => v.password === v.confirmPassword, { message: 'As senhas não correspondem', path: ['confirmPassword'] });

/** Troca pelo próprio usuário: o servidor exige a senha atual. */
export const ownPasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: '*Informe a senha atual' }).min(1, { message: '*Informe a senha atual' }),
    password: newPassword,
    confirmPassword: newPassword,
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
 * Formulário "Redefinição de senha". Usa PATCH /users/:id com a senha atual e a nova senha
 * do próprio usuário logado (o servidor exige a senha atual).
 */
export function ChangePasswordForm({ onDone, className = 'w-[70%] flex flex-col gap-6' }) {
  const [show0, setShow0] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const form = useForm({ resolver: zodResolver(ownPasswordSchema) });

  const submit = async (values) => {
    try {
      const res = await changeOwnPassword({ password: values.password, currentPassword: values.currentPassword });
      if (res.status === 200) {
        form.reset({ currentPassword: '', password: '', confirmPassword: '' });
        onDone?.();
        return notify('Sucesso, senha alterada!', 'success');
      }
    } catch (err) {
      return notify(err?.response?.data?.message || 'Erro interno, tente novamente ou contate o suporte', 'error');
    }
    notify('Erro interno, tente novamente ou contate o suporte', 'error');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={className} noValidate autoComplete="off">
        <PasswordField form={form} name="currentPassword" placeholder="Digite sua senha atual" label="Senha atual" visible={show0} toggle={() => setShow0(!show0)} />
        <PasswordField form={form} name="password" placeholder="Digite sua nova senha" label="Nova senha" visible={show1} toggle={() => setShow1(!show1)} />
        <PasswordField form={form} name="confirmPassword" placeholder="Confirme sua senha" label="Confirme sua nova senha" visible={show2} toggle={() => setShow2(!show2)} />
        <Button size="lg">salvar nova senha</Button>
      </form>
    </Form>
  );
}
