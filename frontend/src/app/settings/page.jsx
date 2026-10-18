'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompanySearch } from '@/components/ui/company-search';
import { ChangePasswordForm } from '@/components/layout/change-password-form';
import { useAuth } from '@/contexts/auth';
import { useUsers } from '@/contexts/users';
import { getCompaniesLight } from '@/services/companies';

export default function SettingsPage() {
  const [selected, setSelected] = useState(null);
  const [companies, setCompanies] = useState(null);
  const { userLogged } = useAuth();
  const { changeCompany } = useUsers();
  const canChangeCompany = userLogged?.role === 'CONSULTOR' || userLogged?.role === 'AUDITOR';

  useEffect(() => {
    if (!canChangeCompany) return;
    getCompaniesLight()
      .then(({ data }) => setCompanies(data))
      .catch((err) => console.error('Erro ao tentar obter as empresa com retorno basico: ', err));
  }, [canChangeCompany]);

  return (
    <div className="px-6 pb-10 ml-56 h-fit flex flex-col gap-2">
      <section className="flex flex-col gap-6">
        <h3 className="font-semibold text-neutral-03 text-xl">Redefinição de senha</h3>
        <ChangePasswordForm />
      </section>
      <div role="none" className="shrink-0 bg-border ml-16 w-[60%] my-8 h-1" />
      {canChangeCompany && (
        <section>
          <h3 className="font-semibold text-neutral-03 text-xl">Mudar empresa relacionada </h3>
          <div className="flex flex-col gap-1 my-3">
            <span className="text-base text-neutral font-semibold">Empresa atual:</span>
            <span className="text-base text-neutral-03 font-medium">{userLogged?.company?.bussinessName}</span>
          </div>
          <div className="w-[70%]">
            <CompanySearch data={companies} changeSelect={(id) => setSelected(companies?.find((c) => c.id === id) || null)} />
          </div>
          <div className="space-y-3 mt-14 mb-40">
            <h4 className="font-semibold text-neutral text-base">Empresa selecionada:</h4>
            {selected ? (
              <div className="w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md">
                <span className="font-medium text-base text-neutral-04">{selected.bussinessName}</span>
                <Button
                  className="border-none bg-transparent shadow-transparent hover:bg-transparent text-black rounded-lg p-1"
                  type="button"
                  onClick={() => setSelected(null)}
                >
                  x
                </Button>
              </div>
            ) : (
              <span className="text-neutral-03">Nenhuma empresa selecionada.</span>
            )}
          </div>
          <div className="w-[70%] flex justify-center">
            <Button size="lg" className="w-[390px]" variant="success" disabled={!selected} onClick={() => changeCompany(userLogged.id, selected?.id)}>
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
