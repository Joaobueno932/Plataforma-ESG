'use client';
import '@/lib/iconify-offline';
import { AuthProvider } from '@/contexts/auth';
import { CompaniesProvider } from '@/contexts/companies';
import { UsersProvider } from '@/contexts/users';
import { IndicatorsProvider } from '@/contexts/indicators';
import { LeadFormProvider } from '@/contexts/lead-form';
import { SidebarProvider } from '@/contexts/sidebar';

// Mesma ordem de providers do original (módulo 50871); SidebarProvider depende da sessão.
export function Providers({ children }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <CompaniesProvider>
          <UsersProvider>
            <IndicatorsProvider>
              <LeadFormProvider>{children}</LeadFormProvider>
            </IndicatorsProvider>
          </UsersProvider>
        </CompaniesProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}
