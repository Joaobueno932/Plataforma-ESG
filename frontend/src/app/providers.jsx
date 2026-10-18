'use client';
import '@/lib/iconify-offline';
import { AuthProvider } from '@/contexts/auth';
import { CompaniesProvider } from '@/contexts/companies';
import { UsersProvider } from '@/contexts/users';
import { IndicatorsProvider } from '@/contexts/indicators';
import { LeadFormProvider } from '@/contexts/lead-form';

// Mesma ordem de providers do original (módulo 50871).
export function Providers({ children }) {
  return (
    <AuthProvider>
      <CompaniesProvider>
        <UsersProvider>
          <IndicatorsProvider>
            <LeadFormProvider>{children}</LeadFormProvider>
          </IndicatorsProvider>
        </UsersProvider>
      </CompaniesProvider>
    </AuthProvider>
  );
}
