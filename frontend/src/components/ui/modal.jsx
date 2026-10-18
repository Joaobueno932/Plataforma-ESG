'use client';
import { useCallback, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';

// Modal composto do original (módulo 50176): Root / Title / SubTitle / Content.
function Root({ children, closeModal, btnClosed = true, ...rest }) {
  const ref = useRef(null);
  const onKey = useCallback((e) => {
    if (ref.current && e.key === 'Escape') closeModal();
  }, [closeModal]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('overflow-hidden');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, [onKey]);

  return (
    <div
      className="fixed top-0 left-0 w-full h-screen bg-black/25 z-50 flex items-center justify-center data-[body]:h-screen data-[body]:overflow-hidden"
      id="root"
    >
      <div className={twMerge('relative bg-white h-fit rounded-md shadow-md p-7', rest.className)} ref={ref}>
        {btnClosed && (
          <button className="absolute top-2 right-2 font-semibold text-base p-2" onClick={closeModal} aria-label="Fechar">
            <Icon icon="gg:close-r" width="30px" className="text-primary-03 hover:text-primary-03/90" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

const Title = ({ children, classes }) => <h1 className={twMerge('text-base', classes)}>{children}</h1>;
const SubTitle = ({ children, className }) => <span className={twMerge('text-base', className)}>{children}</span>;
const Content = ({ children, ...rest }) => <div className={twMerge('', rest.className)}>{children}</div>;

export const Modal = { Root, Title, SubTitle, Content };
