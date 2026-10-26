'use client';
import { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { CompanySearch } from '@/components/ui/company-search';
import { ChangePasswordForm } from '@/components/layout/change-password-form';
import { AvatarEditor } from '@/components/people/avatar-editor';
import { removeUserAvatar, uploadUserAvatar } from '@/services/users';
import { Btn, Card, CardHeader, PAGE, PageHeading } from '@/components/esg/ui';
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
  const [photoBusy, setPhotoBusy] = useState(false);
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

  /** Foto da própria pessoa: salva na hora e o cabeçalho atualiza sem novo login. */
  const savePhoto = (action, done) => async (blob) => {
    setPhotoBusy(true);
    try {
      await action(blob);
      await reloadUser?.();
      notify(done, 'success');
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const rows = [
    ['Nome', userLogged?.name],
    ['E-mail', userLogged?.email],
    userLogged?.jobTitle && ['Cargo', userLogged.jobTitle],
    ['Perfis ativos', (userLogged?.roles ?? []).map((r) => ROLE_LABEL[r] || r).join(', ') || '—'],
    ['Empresa em contexto', userLogged?.company?.bussinessName || '—'],
  ].filter(Boolean);

  return (
    <div className={PAGE}>
      <PageHeading title="Configurações" description="Seus dados de acesso e a troca de senha." />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meu perfil" description="Perfis e vínculos com empresas são concedidos pela Administração FIEMS e não podem ser alterados por aqui." />
          <div id="foto" className="scroll-mt-28 border-b border-slate-100 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Foto de perfil</h3>
            {userLogged && (
              <AvatarEditor
                user={userLogged}
                busy={photoBusy}
                onPick={savePhoto((blob) => uploadUserAvatar(userLogged.id, blob), 'Foto atualizada.')}
                onRemove={savePhoto(() => removeUserAvatar(userLogged.id), 'Foto removida; as iniciais voltam a ser exibidas.')}
                hint="JPEG, PNG ou WebP. A foto é recortada em 512×512 e aparece no cabeçalho e nas listas de pessoas."
              />
            )}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 p-5 text-sm sm:grid-cols-[auto,1fr] sm:gap-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="mb-2 font-medium text-slate-900 sm:mb-0">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader title="Redefinição de senha" description="A troca exige a senha atual." />
          <div className="p-5">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
      {canSelectContext && (
        <Card>
          <CardHeader title="Empresa em contexto" description="Escolha entre as empresas com vínculo vigente. A troca não concede acesso novo." />
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm text-slate-600">
              Empresa atual: <strong className="font-semibold text-slate-900">{userLogged?.company?.bussinessName || '—'}</strong>
            </p>
            <div className="max-w-xl">
              <CompanySearch data={options} changeSelect={(id) => setSelected(options?.find((c) => c.id === id) || null)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-800">Empresa selecionada</span>
              {selected ? (
                <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm">
                  {selected.bussinessName}
                  <button type="button" onClick={() => setSelected(null)} className="rounded p-0.5 text-slate-500 hover:text-slate-900" aria-label="Remover seleção">
                    <IoClose aria-hidden />
                  </button>
                </span>
              ) : (
                <span className="text-sm text-slate-500">Nenhuma empresa selecionada.</span>
              )}
            </div>
            <Btn variant="success" className="self-start" disabled={!selected} onClick={apply}>
              Salvar alterações
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
