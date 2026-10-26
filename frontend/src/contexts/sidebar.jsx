'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';

const COLLAPSED_KEY = 'esg.sidebar.collapsed';

const SidebarContext = createContext({ enabled: false, collapsed: false, toggle: () => {} });

/**
 * Sidebar recolhida: telas internas de qualquer perfil, só no desktop. A sidebar desenha a barra estreita e o
 * cabeçalho oferece o botão. A preferência fica neste navegador; se o storage falhar, a barra
 * apenas volta aberta. O atributo no <html> desloca o conteúdo (styles/globals.css).
 */
export function SidebarProvider({ children }) {
  const { userLogged } = useAuth();
  const enabled = !!userLogged;
  const [stored, setStored] = useState(false);
  const collapsed = enabled && stored;

  useEffect(() => {
    try {
      setStored(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      /* sem storage: começa aberta */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.dataset.sidebar = 'collapsed';
    else delete root.dataset.sidebar;
    return () => delete root.dataset.sidebar;
  }, [collapsed]);

  const toggle = () =>
    setStored((value) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1');
      } catch {
        /* preferência não persiste, mas a ação vale nesta visita */
      }
      return !value;
    });

  return <SidebarContext.Provider value={{ enabled, collapsed, toggle }}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);
