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
import { DEPARTMENTS, ROLES, useLeadForm } from '@/contexts/lead-form';

const schema = z.object({
  first_name: z.string().min(1, { message: 'A string deve conter pelo menos 1 caractere.' }),
  last_name: z.string().min(1, { message: 'A string deve conter pelo menos 1 caractere.' }),
  email: z.string().email({ message: 'O email deve ser válido.' }),
  phone: z.string().min(8, { message: 'Telefone deve se válido.' }),
  mobile: z.string().min(8).optional(),
  role: z.string(),
  department: z.string(),
  knowledgeMethod: z.string(),
});

const KNOWLEDGE_METHODS = {
  DivulgacaoSindicatos: 'Divulgação dos Sindicatos aos Associados',
  RedesSociais: 'Redes sociais sistema FIEMS',
  PalestrasESG: 'Palestras do Núcleo ESG-FIEMS',
  PodcastIdIndustria: 'Podcast ID Indústria FIEMS',
  VisitaAoNucleoESG: 'Visita ao Núcleo ESG-FIEMS',
  VisitaDoNucleoESG: 'Visita do Núcleo ESG-FIEMS',
  ApresentacaoLideranca: 'Apresentação das Lideranças da FIEMS',
  Outros: 'Outros',
};

const FIELD = 'group/fieldset relative flex flex-col-reverse gap-1 mb-1 w-[100%]';
const FLOAT = 'input-label-float -top-4 left-2 text-xs';

function TextField({ form, name, label, placeholder, phone }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className={FIELD}>
          <FormControl>
            <>
              {phone ? <MaskInput placeholder="(00) 0000-0000" maskType="phone" field={{ ...field }} /> : <Input placeholder={placeholder} {...field} value={field.value ?? ''} />}
              <FormLabel className={FLOAT}>{label}</FormLabel>
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({ form, name, label, title, options }) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem className="relative w-[50%]">
          <Select name={`${name}_select`} onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
            </FormControl>
            <FormLabel className={FLOAT}>{label}</FormLabel>
            <SelectContent>
              <SelectGroup className="overflow-y-scroll h-96">
                <SelectLabel>{title}</SelectLabel>
                {options.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function YourDataPage() {
  const { addToFormData } = useLeadForm();
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(schema) });

  return (
    <div className="container mx-auto  flex flex-col justify-center gap-7 mt-8">
      <h2 className="font-semibold text-3xl text-neutral">Seus dados</h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            addToFormData(values);
            router.push('/auto-avaliacao/register');
          })}
          className="space-y-8"
          noValidate
          autoComplete="off"
        >
          <div className="flex flex-col gap-6">
            <TextField form={form} name="first_name" label="Primeiro nome" />
            <TextField form={form} name="last_name" label="Sobrenome" />
            <TextField form={form} name="email" label="E-mail" placeholder="nome@seudomínio.com.br" />
            <TextField form={form} name="phone" label="Telefone*" phone />
            <TextField form={form} name="mobile" label="Celular*" phone />
            <div className="flex gap-6 w-full">
              <SelectField form={form} name="role" label="Cargo" title="Selecione o cargo" options={Object.keys(ROLES).map((r) => [r, r])} />
              <SelectField form={form} name="department" label="Departamento" title="Selecione o departamento" options={Object.keys(DEPARTMENTS).map((d) => [d, d])} />
            </div>
            <div className="flex gap-6 w-full">
              <SelectField form={form} name="knowledgeMethod" label="Forma de Conhecimento" title="Selecione a Forma de Conhecimento" options={Object.entries(KNOWLEDGE_METHODS)} />
            </div>
          </div>
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
