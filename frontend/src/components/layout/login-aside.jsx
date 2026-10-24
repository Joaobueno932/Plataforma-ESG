'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiArrowRightLine, RiEyeLine, RiEyeOffLine, RiLoader4Line, RiLockLine, RiMailLine } from 'react-icons/ri';
import logo from '@/assets/esg_logo_vertical.png';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth';

/** Largura do painel de login no desktop; o vídeo da página "/" começa por baixo dos cantos dele. */
export const LOGIN_PANEL_WIDTH = 'clamp(26rem, 31vw, 36rem)';

const loginSchema = z.object({
  email: z.string({ required_error: '*O campo e-mail é obrigatório' }).min(1, { message: '*O campo e-mail é obrigatório' }).email({ message: '*O campo e-mail deve ser um e-mail válido' }),
  password: z.string({ required_error: '*O campo senha é obrigatória' }).min(1, { message: '*O campo senha é obrigatória' }),
});

const fieldClass =
  'h-14 rounded-lg border-[#DCE3EE] bg-white pl-12 text-[0.95rem] text-[#0E1E3F] shadow-[0_1px_3px_rgba(16,42,94,0.06)] placeholder:text-[#8A94A8] hover:border-[#C5D1E3] hover:bg-white focus:border-[#0B5BD3] focus:text-[#0E1E3F] focus-visible:ring-2 focus-visible:ring-[#0B5BD3]/25';

function LoginForm() {
  const { login, keepLogged, setKeepLogged } = useAuth();
  const [visible, setVisible] = useState(false);
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      {/* `login` trata erro e redirecionamento; enquanto a promessa não resolve, o envio fica bloqueado. */}
      <form onSubmit={form.handleSubmit(login)} noValidate className="flex w-full flex-col" aria-busy={submitting}>
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="mb-2 block text-[0.95rem] font-semibold text-[#0E1E3F]">E-mail</FormLabel>
              <div className="relative">
                <RiMailLine aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3B4A66]" />
                <FormControl>
                  <Input type="email" inputMode="email" autoComplete="username" placeholder="Insira seu e-mail" className={fieldClass} {...field} />
                </FormControl>
              </div>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem className="mt-7 space-y-0 [@media(max-height:820px)]:mt-5">
              <FormLabel className="mb-2 block text-[0.95rem] font-semibold text-[#0E1E3F]">Senha</FormLabel>
              <div className="relative">
                <RiLockLine aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3B4A66]" />
                <FormControl>
                  <Input
                    type={visible ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Insira sua senha"
                    className={`${fieldClass} pr-12`}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={visible}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-[#3B4A66] transition-colors hover:text-[#0B5BD3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5BD3]/40"
                >
                  {visible ? <RiEyeLine className="h-5 w-5" /> : <RiEyeOffLine className="h-5 w-5" />}
                </button>
              </div>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
        <div className="mt-9 flex items-center gap-3 [@media(max-height:820px)]:mt-6">
          <Checkbox
            id="login-remember"
            checked={keepLogged}
            onCheckedChange={(checked) => setKeepLogged(checked === true)}
            className="h-5 w-5 rounded-[5px] border-[1.5px] border-[#3B4A66] bg-white focus-visible:ring-2 focus-visible:ring-[#0B5BD3]/40 data-[state=checked]:border-[#0B5BD3] data-[state=checked]:bg-[#0B5BD3]"
          />
          <label htmlFor="login-remember" className="cursor-pointer select-none text-[0.95rem] font-semibold text-[#0E1E3F]">
            Lembre-me
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="relative mt-7 flex h-14 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#0B5BD3] to-[#0A3F9A] text-[1.05rem] font-semibold tracking-[0.06em] text-white shadow-[0_10px_22px_-8px_rgba(11,70,180,0.55)] transition-[filter,transform] hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B5BD3]/35 disabled:cursor-wait disabled:brightness-95 [@media(max-height:820px)]:mt-5"
        >
          {submitting ? 'ENTRANDO…' : 'ENTRAR'}
          {submitting ? (
            <RiLoader4Line aria-hidden className="absolute right-5 h-5 w-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <RiArrowRightLine aria-hidden className="absolute right-5 h-6 w-6" />
          )}
        </button>
      </form>
    </Form>
  );
}

/** Curvas decorativas do fundo do painel (só enfeite: invisíveis para leitores de tela). */
function PanelCurves() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 540 940" preserveAspectRatio="none" fill="none">
      <g stroke="#9EC3F2" strokeWidth="1.2" opacity="0.55">
        <path d="M-40 150 C 60 40, 200 -10, 330 -30" />
        <path d="M-40 205 C 70 80, 230 10, 400 -20" opacity="0.6" />
        <path d="M-30 760 C 40 830, 150 880, 300 950" />
        <path d="M-30 700 C 70 800, 220 880, 420 960" opacity="0.6" />
        <path d="M60 940 C 120 880, 220 850, 330 860" opacity="0.5" />
      </g>
      <circle cx="32" cy="847" r="8" fill="#5AA0EC" opacity="0.85" />
    </svg>
  );
}

// Tela de login exibida em "/" (lateral esquerda; o vídeo institucional fica em app/page.jsx).
// No desktop, o painel inteiro desliza da esquerda uma única vez, na montagem. O espaço dele já está reservado
// (transform não mexe no layout); no mobile ou com movimento reduzido, aparece direto.
export function LoginAside() {
  return (
    <aside
      style={{ '--login-panel': LOGIN_PANEL_WIDTH }}
      className="relative z-10 flex min-h-screen w-full flex-none flex-col overflow-hidden bg-gradient-to-br from-white via-[#F7FAFE] to-[#EAF2FC] md:w-[var(--login-panel)] md:rounded-r-[2rem] md:shadow-[8px_0_40px_rgba(6,24,64,0.25)] md:motion-safe:animate-login-panel-in"
    >
      <PanelCurves />
      <div className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 md:py-10 md:pl-[8.5%] md:pr-[4%]">
        <div className="w-full max-w-[29rem] rounded-[1.75rem] bg-white px-8 py-14 shadow-[0_24px_60px_-20px_rgba(18,58,130,0.18)] sm:px-10 [@media(max-height:820px)]:py-9">
          <h1 className="text-center text-[1.2rem] leading-tight sm:text-[1.4rem] text-[#0B2559] [@media(max-height:820px)]:text-[1.25rem]">
            <strong className="font-bold">Faça login</strong> para acessar o <strong className="font-bold text-[#0A3FA8]">ESG</strong>
          </h1>
          <Image
            src={logo}
            alt="ESG FIEMS — Governança Ambiental, Social e Corporativa"
            priority
            className="mx-auto mb-12 mt-10 h-auto w-[92%] [@media(max-height:820px)]:mb-8 [@media(max-height:820px)]:mt-7 [@media(max-height:820px)]:w-[86%]"
          />
          <LoginForm />
        </div>
      </div>
    </aside>
  );
}
