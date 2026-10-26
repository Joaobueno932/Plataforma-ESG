'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Btn } from '@/components/esg/ui';
import { FormPasswordField } from '@/components/esg/form-fields';
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

/**
 * Formulário "Redefinição de senha". Usa PATCH /users/:id com a senha atual e a nova senha
 * do próprio usuário logado (o servidor exige a senha atual).
 */
export function ChangePasswordForm({ onDone, className = 'flex max-w-xl flex-col gap-4' }) {
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
        <FormPasswordField form={form} name="currentPassword" placeholder="Digite sua senha atual" label="Senha atual" />
        <FormPasswordField form={form} name="password" placeholder="Digite sua nova senha" label="Nova senha" hint={`No mínimo ${PASSWORD_MIN} caracteres.`} />
        <FormPasswordField form={form} name="confirmPassword" placeholder="Confirme sua nova senha" label="Confirme a nova senha" />
        <Btn type="submit" className="self-start" loading={form.formState.isSubmitting}>
          Salvar nova senha
        </Btn>
      </form>
    </Form>
  );
}
