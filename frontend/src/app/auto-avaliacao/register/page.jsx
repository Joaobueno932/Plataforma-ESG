'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MaskInput } from '@/components/ui/mask-input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeadForm } from '@/contexts/lead-form';
import { COMPANY_SIZES } from '@/lib/constants';
import { notify } from '@/lib/toast';
import { isValidCnpj } from '@/lib/validators';

const schema = z.object({
  cnpj: z.string().min(1, 'CNPJ é obrigatório').regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar em um formato válido'),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().min(1, 'Nome fantasia é obrigatório'),
  atividade: z.string().optional(),
  porte: z.string().optional(),
});

/** Validação dos dígitos verificadores do CNPJ (mesmo algoritmo do original). */
const FIELD = 'group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-[45%]';
const FLOAT = 'input-label-float -top-4 left-2 text-xs';

function TextField({ form, name, label, placeholder, cnpj }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className={FIELD}>
          <FormControl>
            <>
              {cnpj ? (
                <MaskInput placeholder={placeholder} maskType="cnpj" field={{ ...field }} />
              ) : (
                <Input placeholder={placeholder} {...field} value={field.value ?? ''} />
              )}
              <FormLabel className={FLOAT}>{label}</FormLabel>
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function CompanyDataPage() {
  const { addToFormData } = useLeadForm();
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(schema) });

  const submit = (values) => {
    if (!isValidCnpj(values.cnpj)) return notify('Certifique-se de colocar um CNPJ válido', 'error');
    addToFormData(values);
    router.push('/auto-avaliacao/response');
  };

  return (
    <div className='container mx-auto h-full flex flex-col "justify-center" gap-7 mt-8'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8" noValidate autoComplete="off">
          <div className="flex flex-col gap-6">
            <h2 className="font-semibold text-3xl text-neutral">Dados da empresa</h2>
            <div className="flex gap-6 w-full">
              <TextField form={form} name="cnpj" label="CNPJ - MF" placeholder="00 000 000/0000 - 00" cnpj />
              <TextField form={form} name="razaoSocial" label="Razão social" placeholder="Digite a razão social" />
            </div>
            <div className="flex gap-6 w-full">
              <TextField form={form} name="nomeFantasia" label="Nome fantasia" placeholder="Digite o nome fantasia" />
              <TextField form={form} name="atividade" label="Atividade" placeholder="Digite a atividade" />
            </div>
            <FormField
              name="porte"
              control={form.control}
              render={({ field }) => (
                <FormItem className="relative w-[45%]">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o porte da empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <FormLabel className={FLOAT}>Porte</FormLabel>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Selecione o tamanho da empresa</SelectLabel>
                        {COMPANY_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.text}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div role="none" className="shrink-0 bg-border w-full h-[2px] my-8" />
          <div className="flex justify-end">
            <Button size="lg" className="w-fit bg-[#309D99] hover:bg-[#309D99E5]" type="submit">
              Continuar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
