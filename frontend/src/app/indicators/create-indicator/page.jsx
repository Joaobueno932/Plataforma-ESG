'use client';
import { useRouter } from 'next/navigation';
import { parseCookies, setCookie } from 'nookies';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth';
import { CATEGORIES } from '@/lib/constants';
import { indicatorSchema, PROGRESS, PROGRESS_DATA } from '@/lib/indicator-schemas';
import { notify } from '@/lib/toast';
import { COOKIE_LONG, COOKIE_SHORT } from '@/services/api';

const FIELD = 'group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-full';

// Passo 2 do assistente: dados do indicador.
export default function CreateIndicatorPage() {
  const router = useRouter();
  const { keepLogged } = useAuth();
  const opts = keepLogged ? COOKIE_LONG : COOKIE_SHORT;
  const form = useForm({ resolver: zodResolver(indicatorSchema) });

  const submit = (values) => {
    const cookies = parseCookies();
    const data = cookies[PROGRESS_DATA];
    if (!data || !cookies[PROGRESS]) {
      notify('Selecione o caderno em "Cadastrar novo indicador" antes de continuar.', 'warning');
      return router.push('/indicators');
    }
    setCookie(null, PROGRESS_DATA, JSON.stringify({ ...JSON.parse(data), ...values }), { ...opts });
    setCookie(null, PROGRESS, '2', { ...opts });
    localStorage.setItem('@title-indicator', JSON.stringify(values.title));
    router.push('/indicators/create-answers');
  };

  return (
    <section className="container ml-56 bg-gray-50 h-full flex flex-col gap-5">
      <Breadcrumb.Root>
        <Breadcrumb.OldPath href="/indicators">Indicadores</Breadcrumb.OldPath>
        <Breadcrumb.ArrowIcon />
        <Breadcrumb.CurrentPath>Criar Indicador</Breadcrumb.CurrentPath>
      </Breadcrumb.Root>
      <h3>Criar indicadores</h3>
      <div className="">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="w-[800px] space-y-8" noValidate autoComplete="off">
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormControl>
                    <>
                      <Input placeholder="Digite o título do indicador" {...field} value={field.value ?? ''} />
                      <FormLabel className="input-label-float -top-4 left-2 text-xs">Título do Indicador</FormLabel>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="category"
              control={form.control}
              render={({ field }) => (
                <FormItem className="relative">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Selecione uma Categoria</SelectLabel>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.text}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="subcategory"
              control={form.control}
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormControl>
                    <>
                      <Input placeholder="Digite a sub-categoria" {...field} value={field.value ?? ''} />
                      <FormLabel className="input-label-float -top-4 left-2 text-xs">Sub-categoria</FormLabel>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormControl>
                    <>
                      <Textarea placeholder="Digite uma descrição" className="resize-none peer h-36 py-5" {...field} value={field.value ?? ''} />
                      <FormLabel className="input-label-float -top-4 left-2 text-xs">Descrição</FormLabel>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" size="lg">
              ADICIONAR INDICADORES
            </Button>
          </form>
        </Form>
      </div>
    </section>
  );
}
