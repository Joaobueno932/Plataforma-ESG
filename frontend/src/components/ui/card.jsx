import { twMerge } from 'tailwind-merge';

// Card composto do original (módulo 72117).
const Root = ({ children, ...rest }) => (
  <div {...rest} className={twMerge('bg-white border-2 rounded-lg', rest.className)}>
    {children}
  </div>
);
const List = ({ children, ...rest }) => (
  <ul {...rest} className={twMerge('', rest.className)}>
    {children}
  </ul>
);
const ListContent = ({ children, ...rest }) => (
  <li {...rest} className={twMerge('flex justify-between items-center px-4 py-4 border-b-[1px] border-gray-300', rest.className)}>
    {children}
  </li>
);
const ListLabel = ({ children, ...rest }) => (
  <ul {...rest} className={twMerge('flex items-center px-4', rest.className)}>
    {children}
  </ul>
);

export const Card = { Root, List, ListContent, ListLabel };
