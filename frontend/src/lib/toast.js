import { toast } from 'react-toastify';

// Mesmas opções do original (módulo 89384).
const base = { position: toast.POSITION.TOP_CENTER, theme: 'light', autoClose: 2500, pauseOnHover: true, closeOnClick: true };
const style = { fontSize: '18px' };

export function notify(message, type) {
  switch (type) {
    case 'success':
      return toast.success(message, { ...base, style });
    case 'error':
      return toast.error(message, { ...base, style });
    case 'info':
      return toast.info(message, { ...base, style });
    case 'warning':
      return toast.warning(message, { ...base, style });
    case 'loading':
      return toast.loading(message, { ...base, style });
    default:
      return toast(message);
  }
}

export const updateToast = (id, render, type) =>
  toast.update(id, { render, type, isLoading: false, autoClose: 2500, pauseOnHover: true, closeOnClick: true, draggable: true });

/** Mensagem de erro no formato do original: "<error>: <message>". */
export const apiErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.message) return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  return err?.message || 'Ops! Algo deu errado';
};
