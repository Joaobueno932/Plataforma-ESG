import Link from 'next/link';
import { MdArrowForwardIos } from 'react-icons/md';

// Breadcrumb do original (módulo 7798).
const Root = ({ children }) => <div className="flex items-center justify-end gap-1">{children}</div>;
const OldPath = ({ href, children }) => (
  <Link href={href} className="font-bold text-blue-600">
    {children}
  </Link>
);
const ArrowIcon = () => <MdArrowForwardIos className="fill-gray-600" />;
const CurrentPath = ({ children }) => <span className="text-gray-600 cursor-pointer">{children}</span>;

export const Breadcrumb = { Root, OldPath, ArrowIcon, CurrentPath };
