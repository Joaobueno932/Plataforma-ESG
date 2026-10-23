import { cva } from 'class-variance-authority';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { cn } from '@/lib/utils';

/**
 * Cartões de nível de maturidade. A variante vem da **apresentação do dado**
 * (`presentation`/`slug` do nível), não de uma lista fixa de nomes.
 *
 * As cinco primeiras cores são as do CSS recuperado do sistema antigo. O nível "Engajada"
 * não tem cor definida nessa referência: fica com a cor neutra do cartão até a referência
 * visual aprovada chegar (pendência X2 em docs/esg/regras.md). Nada de cor inventada.
 */
const cardVariants = cva('relative px-6 py-6 pt-8 rounded-2xl h-fit min-h-[15rem] text-white flex flex-col gap-4 items-center', {
  variants: {
    variant: {
      default: 'bg-card text-neutral',
      conforme: 'bg-card-according',
      iniciante: 'bg-card-beginner',
      sensibilizada: 'bg-card-sensitized',
      consciente: 'bg-card-conscious',
      'nao-conforme': 'bg-card-not-compliant',
      engajada: 'bg-card-conscious',
      // chaves do catálogo demonstrativo herdado
      Conforme: 'bg-card-according',
      Iniciante: 'bg-card-beginner',
      Sensibilizada: 'bg-card-sensitized',
      Consciente: 'bg-card-conscious',
      Nao_conforme: 'bg-card-not-compliant',
      Engajado: 'bg-card-conscious',
      disabled: 'bg-neutral-02',
    },
    size: { default: 'w-[13.5rem]', md: 'w-[13.5rem]', lg: 'w-[14.5rem]' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export const AnswerCard = ({ variant, children }) => <div className={cn(cardVariants({ variant }))}>{children}</div>;
export const AnswerCardTitle = ({ children }) => <h3 className="font-bold text-xl">{children}</h3>;
export const AnswerCardPoints = ({ children }) => (
  <button type="button" className="flex justify-center ityems-center p-2 text-neutral bg-neutral-01 rounded-lg">
    {children} pts
  </button>
);
export const AnswerCardText = ({ children }) => <p className="text-center w-52 font-normal leading-7">{children}</p>;
/** Marca do nível mínimo exigido pelo indicador (não se deduz da pontuação). */
export const AnswerCardMandatory = () => <span className="text-sm font-bold">Obrigatória*</span>;
export const AnswerCardSelected = () => (
  <div className="absolute top-0 right-0">
    <IoCheckmarkCircle size="2rem" className="fill-[#19FB14]" />
  </div>
);
