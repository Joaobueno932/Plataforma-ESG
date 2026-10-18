'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiEyeFill, RiEyeOffFill } from 'react-icons/ri';
import { BiMessageDots } from 'react-icons/bi';
import logo from '@/assets/esg_logo_vertical.png';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/contexts/auth';
import { useUsers } from '@/contexts/users';
import { HelpModal } from './help-modal';

const loginSchema = z.object({
  email: z.string({ required_error: '*O campo e-mail é obrigatório' }).email({ message: '*O campo e-mail deve ser um e-mail válido' }),
  password: z.string({ required_error: '*O campo senha é obrigatória' }),
});

function LoginForm({ openModal }) {
  const { login, keepLogged, setKeepLogged } = useAuth();
  const [visible, setVisible] = useState(false);
  const form = useForm({ resolver: zodResolver(loginSchema) });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(login)} noValidate autoComplete="off" className="flex flex-col gap-4 w-full">
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem className="mb-2">
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="Insira seu e-mail" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="relative">
          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input placeholder="Insira sua senha" {...field} value={field.value ?? ''} type={visible ? 'text' : 'password'} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="button" onClick={() => setVisible(!visible)} className="absolute right-3 top-12" aria-label="Mostrar senha">
            {visible ? <RiEyeFill className="fill-primary-03" /> : <RiEyeOffFill className="fill-primary-03" />}
          </button>
        </div>
        <button type="button" className="cursor-pointer label-s w-fit text-primary-02 underline " onClick={openModal}>
          Esqueci a senha
        </button>
        <div className="flex items-center gap-2">
          <Checkbox onCheckedChange={() => setKeepLogged(!keepLogged)} />
          <span className="text-sm">Lembre-me</span>
        </div>
        <Button className="text-white font-medium w-full" size="lg">
          ENTRAR
        </Button>
      </form>
    </Form>
  );
}

const EMAIL_RE = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

function ForgotPasswordForm({ closeModal }) {
  const [email, setEmail] = useState('');
  const [valid, setValid] = useState(false);
  const { requestPasswordChange } = useUsers();
  return (
    <form className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="terms">Endereço de Email</Label>
        <Input
          placeholder="Insira seu e-mail"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValid(EMAIL_RE.test(e.target.value));
          }}
        />
      </div>
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!valid}
          onClick={async (e) => {
            e.preventDefault();
            await requestPasswordChange(email);
            closeModal();
          }}
        >
          SOLICITAR UMA NOVA SENHA
        </Button>
      </div>
    </form>
  );
}

// Lateral de login exibida em "/" (módulo 67321 "R").
export function LoginAside() {
  const [modalOpen, setModalOpen] = useState(false);
  const [contact, setContact] = useState(false);
  return (
    <>
      {modalOpen && contact && <HelpModal setIsModalOpenFunction={setModalOpen} />}
      {modalOpen && !contact && (
        <Modal.Root closeModal={() => setModalOpen(false)} className="w-[800px] flex flex-col items-center gap-6">
          <Modal.Title classes="text-3xl font-bold text-primary-03 text-center">Esqueceu a senha?</Modal.Title>
          <Modal.Content className="max-w-[33.25rem] flex flex-col gap-4">
            <h3 className="font-bold text-lg text-primary-03">
              Informe seu email cadastrado para enviarmos as instruções de redefinição de senha.
            </h3>
            <ForgotPasswordForm closeModal={() => setModalOpen(false)} />
          </Modal.Content>
        </Modal.Root>
      )}
      <aside className="min-h-[100%] w-[600px] z-10 bg-white drop-shadow-sm shadow-md flex flex-col justify-center items-center gap-4 2xl:gap-6 px-6 pb-4">
        <div className="space-y-6">
          <h5 className="title-m text-center w-full">Faça o login para acessar o ESG</h5>
          <Image src={logo} alt="imagem da logo" priority />
        </div>
        <LoginForm
          openModal={() => {
            setModalOpen(true);
            setContact(false);
          }}
        />
        <div className="flex flex-col gap-2">
          <h5 className="body-l">Ainda não possui acesso ao ESG?</h5>
          <p className="text-justify body-m">
            Clique no botão abaixo e faça uma autoavaliação gratuita, para verificar se a sua empresa está apta a participar do Programa ESG-FIEMS.
          </p>
          <Link href="/auto-avaliacao">
            <Button className="w-44 border-primary text-primary font-bold text-base" size="sm" variant="outline">
              Auto Avaliação
            </Button>
          </Link>
          <Button
            className="w-44 border-primary text-primary font-bold text-base gap-2"
            size="sm"
            variant="outline"
            onClick={() => {
              setModalOpen(true);
              setContact(true);
            }}
          >
            <BiMessageDots size="1.25rem" />
            Fale Conosco
          </Button>
        </div>
      </aside>
    </>
  );
}
