import { twMerge } from 'tailwind-merge';

// Card composto do original (módulo 72117), no visual do design system (mesmo do esg/ui Card).
const Root = ({ children, ...rest }) => (
  <div {...rest} className={twMerge('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]', rest.className)}>
    {children}
  </div>
);
const List = ({ children, ...rest }) => (
  <ul {...rest} className={twMerge('', rest.className)}>
    {children}
  </ul>
);
const ListContent = ({ children, ...rest }) => (
  <li {...rest} className={twMerge('flex justify-between items-center px-5 py-4 border-b border-slate-100', rest.className)}>
    {children}
  </li>
);
const ListLabel = ({ children, ...rest }) => (
  <ul {...rest} className={twMerge('flex items-center px-4', rest.className)}>
    {children}
  </ul>
);

export const Card = { Root, List, ListContent, ListLabel };
