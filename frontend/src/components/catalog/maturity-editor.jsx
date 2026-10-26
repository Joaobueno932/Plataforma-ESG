'use client';
/**
 * Lápis "Editar maturidades" (somente Administração): a partir de um indicador do ciclo, abre a
 * escala desse indicador na **edição em rascunho** do catálogo. A versão congelada do ciclo nunca
 * é alterada — respostas, pontuações e auditorias ficam preservadas; publicada a edição em
 * Catálogo, a nova escala vale para os ciclos novos.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Btn, ErrorState, SkeletonRows } from '@/components/esg/ui';
import { draftIndicatorFor } from '@/services/catalog';
import { apiErrorMessage } from '@/lib/toast';
import { IndicatorEditor } from './indicator-editor';

function ImpactNotice({ data }) {
  const { version, created, source, indicator } = data;
  const general = indicator.section === 'All';
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#0D3969]">
      <IoInformationCircleOutline className="mt-0.5 shrink-0 text-[1.15rem]" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">
          {created ? 'Edição em rascunho criada' : 'Edição em rascunho'}: “{version.label}”
        </p>
        <p>
          {source.label ? `Este ciclo usa a versão “${source.label}”` : 'Este ciclo usa uma versão publicada'}
          {source.cycles > 1 ? `, também usada por mais ${source.cycles - 1} ciclo(s),` : ','} que não muda: respostas, pontuações e auditorias já registradas ficam
          preservadas.
        </p>
        <p>
          Depois de publicada em{' '}
          <Link href="/indicators" className="font-medium underline underline-offset-2">
            Catálogo
          </Link>
          , a nova escala vale para os ciclos novos —{' '}
          {general ? 'indicador do Caderno Geral: empresas de todos os setores.' : `indicador do Caderno Setorial ${indicator.section}: empresas desse setor.`}
        </p>
      </div>
    </div>
  );
}

export function MaturityEditor({ questionId, open, onOpenChange }) {
  const [state, setState] = useState({ status: 'idle' });

  const load = () => {
    setState({ status: 'loading' });
    draftIndicatorFor(questionId)
      .then(({ data }) => setState({ status: 'ready', data }))
      .catch((err) => setState({ status: 'error', error: apiErrorMessage(err) }));
  };

  useEffect(() => {
    if (open && questionId) load();
    if (!open) setState({ status: 'idle' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, questionId]);

  if (!open) return null;
  if (state.status === 'ready')
    return (
      <IndicatorEditor
        open
        onOpenChange={onOpenChange}
        mode="levels"
        indicator={state.data.indicator}
        context={<ImpactNotice data={state.data} />}
        savedMessage={`Maturidades salvas na edição “${state.data.version.label}”. Publique em Catálogo para valer nos ciclos novos.`}
        onSaved={() => {}}
      />
    );
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Editar maturidades</DialogTitle>
          <DialogDescription>Preparando o indicador na edição em rascunho do catálogo.</DialogDescription>
        </DialogHeader>
        <DialogBody>{state.status === 'error' ? <ErrorState message={state.error} onRetry={load} /> : <SkeletonRows rows={3} />}</DialogBody>
        <DialogFooter>
          <Btn variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
