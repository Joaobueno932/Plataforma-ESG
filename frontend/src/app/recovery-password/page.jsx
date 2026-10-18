'use client';
import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiEyeFill, RiEyeOffFill } from 'react-icons/ri';
import logo from '@/assets/esg_logo_vertical.png';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { passwordSchema } from '@/components/layout/change-password-form';
import { useUsers } from '@/contexts/users';

/**
 * [INF] Destino do link "Esqueci a senha". O layout original já ignorava a rota
 * "recovery-password" (sem sidebar/cabeçalho), mas a página não existe no build do
 * staging; esta tela reutiliza o formulário de redefinição com o visual da tela de login.
 */
function RecoveryForm() {
  const token = useSearchParams().get('token') || '';
  const { requestChangePassword } = useUsers();
  const [visible, setVisible] = useState([false, false]);
  const form = useForm({ resolver: zodResolver(passwordSchema) });

  const field = (name, label, placeholder, i) => (
    <div className="relative">
      <FormField
        name={name}
        control={form.control}
        render={({ field: f }) => (
          <FormItem className="group/fieldset relative flex flex-col-reverse gap-1 mb-1">
            <FormControl>
              <>
                <Input placeholder={placeholder} {...f} value={f.value ?? ''} type={visible[i] ? 'text' : 'password'} />
                <FormLabel className="input-label-float -top-4 left-2 text-xs">{label}</FormLabel>
              </>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <button
        type="button"
        className="absolute right-3 top-4"
        aria-label="Mostrar senha"
        onClick={() => setVisible(visible.map((v, k) => (k === i ? !v : v)))}
      >
        {visible[i] ? <RiEyeFill className="fill-blue-500" /> : <RiEyeOffFill className="fill-blue-500" />}
      </button>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => requestChangePassword(v.password, token))} className="w-full flex flex-col gap-6" noValidate autoComplete="off">
        {field('password', 'Nova senha', 'Digite sua nova senha', 0)}
        {field('confirmPassword', 'Confirme sua nova senha', 'Confirme sua senha', 1)}
        <Button size="lg" disabled={!token}>
          salvar nova senha
        </Button>
        {!token && <p className="text-sm text-rose-600">Link de redefinição inválido. Solicite um novo em “Esqueci a senha”.</p>}
      </form>
    </Form>
  );
}

export default function RecoveryPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <section className="w-[600px] bg-white shadow-md rounded-md flex flex-col items-center gap-6 px-12 py-10">
        <Image src={logo} alt="imagem da logo" width={300} />
        <h5 className="title-m text-center w-full">Redefinição de senha</h5>
        <Suspense>
          <RecoveryForm />
        </Suspense>
      </section>
    </div>
  );
}
