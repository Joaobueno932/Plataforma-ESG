import { cva } from 'class-variance-authority';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { cn } from '@/lib/utils';

// Cartões de nível de maturidade (módulo 96882 do original).
const cardVariants = cva('relative px-6 py-6 pt-8 rounded-2xl h-fit min-h-[15rem] text-white flex flex-col gap-4 items-center', {
  variants: {
    variant: {
      default: 'bg-card',
      Conforme: 'bg-card-according',
      Iniciante: 'bg-card-beginner',
      Sensibilizada: 'bg-card-sensitized',
      Consciente: 'bg-card-conscious',
      Nao_conforme: 'bg-card-not-compliant',
      Engajado: 'bg-violet-400',
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
export const AnswerCardMandatory = () => <span className="text-sm font-bold">Obrigatória*</span>;
export const AnswerCardSelected = () => (
  <div className="absolute top-0 right-0">
    <IoCheckmarkCircle size="2rem" className="fill-[#19FB14]" />
  </div>
);
