import { z } from 'zod';

// Esquemas do assistente de criação de indicador (módulo 82778 do original).
const level = z.enum(['Engajado', 'Iniciante', 'Sensibilizada', 'Consciente', 'Nao_conforme', 'Conforme'], {
  required_error: '*Por favor selecione um nivel de maturidade',
});
const points = z.enum(['0', '2', '4', '6', '8', '10'], { required_error: '*Por favor selecione uma pontuação' });

export const sectionSchema = z.object({ section: z.string({ required_error: '*Por favor selecione um Caderno Setorial ' }) });

export const indicatorSchema = z.object({
  title: z.string({ required_error: '*O campo título é obrigatório' }),
  category: z.string({ required_error: '*O campo categoria é obrigatório' }),
  subcategory: z.string({ required_error: '*O campo subcategoria é obrigatório' }),
  description: z.string({ required_error: '*O campo descrição é obrigatório' }),
  hasMandatory: z.boolean().optional(),
});

const answer = z.object({
  description: z.string({ required_error: '*O campo descrição é obrigatório' }),
  title: level,
  points,
  mandatory: z.boolean().optional(),
});

export const answersSchema = z.object({ answers: z.array(answer).min(2).max(6) });

export const PROGRESS_DATA = 'FIEMS@progressData';
export const PROGRESS = 'FIEMS@progress';
