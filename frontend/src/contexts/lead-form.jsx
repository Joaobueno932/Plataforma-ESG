'use client';
import { createContext, useContext, useRef, useState } from 'react';
import { createLead } from '@/services/leads';

// Valores enviados à API para cargo e departamento (enums do original, módulo 55800).
export const DEPARTMENTS = {
  Administrativo: 'Administrativo', 'Assistência Social': 'AssistenciaSocial', Atendimento: 'Atendimento', Benefícios: 'Beneficios',
  'Centro de distribuição': 'CentroDistribuicao', Comercial: 'Comercial', Compras: 'Compras', 'Conselho administrativo': 'ConselhoAdministrativo',
  Contabilidade: 'Contabilidade', Contratos: 'Contratos', 'Departamento pessoal': 'DepartamentoPessoal', Desenvolvimento: 'Desenvolvimento',
  Educação: 'Educacao', Engenharia: 'Engenharia', Ferramentaria: 'Ferramentaria', Financeiro: 'Financeiro', Fiscal: 'Fiscal', Gabinete: 'Gabinete',
  Geral: 'Geral', Industrial: 'Industrial', Infraestrutura: 'Infraestrutura', Inovação: 'Inovacao', Jurídico: 'Juridico', Laboratório: 'Laboratorio',
  Licitação: 'Licitacao', Logística: 'Logistica', Manutenção: 'Manutencao', Marketing: 'Marketing', 'Medicina ocupacional': 'MedicinaOcupacional',
  'Meio ambiente': 'MeioAmbiente', Operacional: 'Operacional', Outros: 'Outros', 'P&D': 'P_D', Pessoal: 'Pessoal', Presidência: 'Presidencia',
  Produção: 'Producao', Projetos: 'Projetos', Qsms: 'Qsms', Qualidade: 'Qualidade', 'Qualidade de vida': 'QualidadeVida', Recepção: 'Recepcao',
  'Recursos humanos': 'RecursosHumanos', Regional: 'Regional', Saúde: 'Saude', Secretaria: 'Secretaria', 'Segurança do trabalho': 'SegurancaTrabalho',
  SESMT: 'SESMT', Superintendência: 'Superintendencia', Suprimentos: 'Suprimentos', TI: 'TI', Unidade: 'Unidade', 'Vice-presidência': 'VicePresidencia',
};

export const ROLES = {
  Analista: 'Analista', Assessor: 'Assessor', Assistente: 'Assistente', Atendente: 'Atendente', Auxiliar: 'Auxiliar', CEO: 'CEO', Chefe: 'Chefe',
  'Comprador(a)': 'Comprador', 'Consultor(a)': 'Consultor', 'Contador(a)': 'Contador', 'Coordenador(a)': 'Coordenador', 'Diretor(a)': 'Diretor',
  'Enfermeiro(a)': 'Enfermeiro', 'Engenheiro(a)': 'Engenheiro', Especialista: 'Especialista', 'Estagiário(a)': 'Estagiario', Gerente: 'Gerente',
  'Médico(a) do Trabalho': 'MedicoTrabalho', Outros: 'Outros', 'Prefeito(a)': 'Prefeito', Presidente: 'Presidente', Recepcionista: 'Recepcionista',
  'Secretário(a)': 'Secretario', Sócio: 'Socio', Superintendente: 'Superintendente', 'Supervisor(a)': 'Supervisor', 'Técnico(a)': 'Tecnico',
  'Tesoureiro(a)': 'Tesoureiro', 'Vice-Presidente': 'VicePresidente',
};

const EMPTY = () => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  mobile: '',
  role: '',
  department: '',
  knowledgeMethod: '',
  answers: { nonApplicable: 0, applicable: 0, applicableNonCompliant: 0, fundamentalNonCompliant: 0 },
});

const LeadFormContext = createContext(null);

export function LeadFormProvider({ children }) {
  const data = useRef(EMPTY());
  const [, force] = useState(0);

  const addToFormData = (values) => {
    Object.assign(data.current, values);
    force((n) => n + 1);
  };

  const resetFormData = () => {
    data.current = EMPTY();
    force((n) => n + 1);
  };

  const sendFormDataToApi = () => {
    const r = data.current;
    return createLead({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      mobile: r.mobile,
      role: ROLES[r.role],
      department: DEPARTMENTS[r.department],
      knowledgeMethod: r.knowledgeMethod,
      answers: { ...r.answers },
      companyData: { cnpj: r.cnpj || '', razaoSocial: r.razaoSocial || '', nomeFantasia: r.nomeFantasia || '', atividade: r.atividade || '', porte: r.porte || '' },
      address: {
        logradouro: r.logradouro || '', numero: r.numero || '', complemento: r.complemento || '', bairro: r.bairro || '',
        municipio: r.municipio || '', cep: r.cep || '', uf: r.uf || '',
      },
    });
  };

  return (
    <LeadFormContext.Provider value={{ formData: data.current, addToFormData, resetFormData, sendFormDataToApi }}>
      {children}
    </LeadFormContext.Provider>
  );
}

export function useLeadForm() {
  const ctx = useContext(LeadFormContext);
  if (!ctx) throw Error('useFormContext must be used within a FormProvider');
  return ctx;
}
