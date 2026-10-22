'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompanySearch } from '@/components/ui/company-search';
import { ChangePasswordForm } from '@/components/layout/change-password-form';
import { useAuth } from '@/contexts/auth';
import { getContextOptions, selectContext } from '@/services/auth';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';
import { ROLE_LABEL } from '@/lib/constants';

/**
 * Meu perfil / Configurações.
 *
 * A seleção de empresa aqui **escolhe um vínculo vigente** (concedido pela Administração) —
 * não cria nem amplia acesso. A troca autônoma de empresa não existe mais.
 */
export default function SettingsPage() {
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState(null);
  const { userLogged, reloadUser } = useAuth();
  const links = userLogged?.links ?? [];
  const canSelectContext = links.length > 1;

  useEffect(() => {
    if (!canSelectContext) return;
    getContextOptions()
      .then(({ data }) => setOptions(data.map((o) => ({ id: o.companyId, bussinessName: o.bussinessName, legalName: o.legalName, role: o.role }))))
      .catch((err) => console.error('Erro ao obter os vínculos do usuário:', err));
  }, [canSelectContext]);

  const apply = async () => {
    const id = notify('Trocando de empresa...', 'loading');
    try {
      await selectContext(selected.id);
      updateToast(id, `Contexto alterado para ${selected.bussinessName}.`, 'success');
      setSelected(null);
      await reloadUser?.();
      // Recarrega para não manter em tela dados da empresa anterior.
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      updateToast(id, apiErrorMessage(err), 'error');
    }
  };

  return (
    <div className="px-6 pb-10 ml-56 h-fit flex flex-col gap-2">
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold text-neutral-03 text-xl">Meu perfil</h3>
        <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-base">
          <dt className="font-semibold text-neutral">Nome</dt>
          <dd className="text-neutral-03">{userLogged?.name}</dd>
          <dt className="font-semibold text-neutral">E-mail</dt>
          <dd className="text-neutral-03">{userLogged?.email}</dd>
          {userLogged?.jobTitle && (
            <>
              <dt className="font-semibold text-neutral">Cargo</dt>
              <dd className="text-neutral-03">{userLogged.jobTitle}</dd>
            </>
          )}
          <dt className="font-semibold text-neutral">Perfis ativos</dt>
          <dd className="text-neutral-03">{(userLogged?.roles ?? []).map((r) => ROLE_LABEL[r] || r).join(', ') || '—'}</dd>
          <dt className="font-semibold text-neutral">Empresa em contexto</dt>
          <dd className="text-neutral-03">{userLogged?.company?.bussinessName || '—'}</dd>
        </dl>
        <p className="text-sm text-neutral-03">
          Perfis e vínculos com empresas são concedidos pela Administração FIEMS e não podem ser alterados por aqui.
        </p>
      </section>
      <div role="none" className="shrink-0 bg-border ml-16 w-[60%] my-8 h-1" />
      <section className="flex flex-col gap-6">
        <h3 className="font-semibold text-neutral-03 text-xl">Redefinição de senha</h3>
        <ChangePasswordForm />
      </section>
      {canSelectContext && (
        <>
          <div role="none" className="shrink-0 bg-border ml-16 w-[60%] my-8 h-1" />
          <section>
            <h3 className="font-semibold text-neutral-03 text-xl">Empresa em contexto</h3>
            <p className="text-sm text-neutral-03 mt-1 mb-3">
              Escolha entre as empresas com vínculo vigente. A troca não concede acesso novo.
            </p>
            <div className="flex flex-col gap-1 my-3">
              <span className="text-base text-neutral font-semibold">Empresa atual:</span>
              <span className="text-base text-neutral-03 font-medium">{userLogged?.company?.bussinessName || '—'}</span>
            </div>
            <div className="w-[70%]">
              <CompanySearch data={options} changeSelect={(id) => setSelected(options?.find((c) => c.id === id) || null)} />
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
              <Button size="lg" className="w-[390px]" variant="success" disabled={!selected} onClick={apply}>
                SALVAR ALTERAÇÕES
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
