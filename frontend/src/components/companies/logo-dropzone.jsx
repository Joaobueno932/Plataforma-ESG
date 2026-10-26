'use client';
/**
 * Área de envio da logo (cadastro e edição de empresa). Não envia nada sozinha: guarda a escolha
 * e o formulário envia ao salvar — assim "Cancelar" nunca apaga a logo atual.
 *
 * `value`: `null` (sem mudança) · `{ file, url }` (nova imagem escolhida) · `'remove'` (remover
 * a logo atual ao salvar). `status`: `'idle' | 'uploading' | 'saved' | 'error'`.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { IoCheckmarkCircle, IoCloudUploadOutline, IoRefreshOutline, IoTrashOutline, IoArrowUndoOutline } from 'react-icons/io5';
import { Btn, Spinner, formatBytes } from '@/components/esg/ui';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './company-logo';

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function LogoDropzone({ company, value, onChange, status = 'idle', statusMessage, disabled = false }) {
  const inputRef = useRef(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const pending = value && value !== 'remove' ? value : null;
  const hasCurrent = !!company?.avatar;
  const showing = pending ? 'new' : value === 'remove' ? 'removed' : hasCurrent ? 'current' : 'empty';

  useEffect(() => () => pending?.url && URL.revokeObjectURL(pending.url), [pending]);

  const accept = (file) => {
    setError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError('Formato não suportado. Envie PNG, JPG ou WebP (SVG não é aceito).');
    if (file.size > LOGO_MAX_BYTES) return setError(`A logo pode ter até 5 MB (este arquivo tem ${formatBytes(file.size)}).`);
    onChange({ file, url: URL.createObjectURL(file) });
  };
  const pick = () => !disabled && inputRef.current?.click();

  const dropHandlers = {
    onDragOver: (e) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      if (!disabled) accept(e.dataTransfer.files?.[0]);
    },
  };

  const statusLine = {
    uploading: (
      <span className="inline-flex items-center gap-1.5 text-[#0D5DA8]">
        <Spinner className="h-3.5 w-3.5" /> Enviando a logo…
      </span>
    ),
    saved: (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <IoCheckmarkCircle aria-hidden /> Logo salva.
      </span>
    ),
    error: <span className="font-medium text-red-700">{statusMessage || 'Não foi possível enviar a logo.'}</span>,
  }[status];

  return (
    <div className="flex flex-col gap-2">
      {showing === 'empty' || showing === 'removed' ? (
        <div
          {...dropHandlers}
          onClick={pick}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
            dragging ? 'border-primary-03 bg-blue-50/70' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[1.4rem] text-[#0D5DA8]">
            <IoCloudUploadOutline aria-hidden />
          </span>
          <p className="text-sm font-semibold text-slate-800">Arraste e solte a logo aqui</p>
          <p className="text-xs text-slate-500">ou clique para selecionar um arquivo</p>
          <Btn
            type="button"
            variant="secondary"
            size="sm"
            className="mt-1"
            aria-describedby={hintId}
            onClick={(e) => {
              e.stopPropagation();
              pick();
            }}
            disabled={disabled}
          >
            Selecionar arquivo
          </Btn>
          <p id={hintId} className="text-xs text-slate-500">
            PNG, JPG ou WebP · até 5 MB
          </p>
          {showing === 'removed' && (
            <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-amber-800">
              A logo atual será removida ao salvar.
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-[#0D5DA8] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <IoArrowUndoOutline aria-hidden /> Desfazer
              </button>
            </p>
          )}
        </div>
      ) : (
        <div
          {...dropHandlers}
          className={cn(
            'flex flex-col gap-4 rounded-xl border-2 border-dashed p-4 transition-colors sm:flex-row sm:items-center',
            dragging ? 'border-primary-03 bg-blue-50/70' : 'border-slate-200 bg-white',
          )}
        >
          {/* Pré-visualização com proporção preservada: logo horizontal continua horizontal. */}
          <div className="flex h-28 w-full items-center justify-center rounded-lg border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] p-2 sm:w-56">
            <CompanyLogo company={company} src={pending?.url} className="h-full w-full border-0 bg-transparent p-0" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-900">{pending ? pending.file.name : 'Logo atual'}</p>
              <p className="text-xs text-slate-500">
                {pending ? `${formatBytes(pending.file.size)} · será enviada ao salvar` : 'Arraste outra imagem para cá para substituir.'}
              </p>
              {statusLine && <p className="mt-1 text-xs">{statusLine}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn type="button" variant="secondary" size="sm" onClick={pick} disabled={disabled}>
                <IoRefreshOutline aria-hidden /> Substituir
              </Btn>
              <Btn type="button" variant="danger-ghost" size="sm" onClick={() => onChange(hasCurrent ? 'remove' : null)} disabled={disabled}>
                <IoTrashOutline aria-hidden /> Remover
              </Btn>
              {pending && hasCurrent && (
                <Btn type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={disabled}>
                  <IoArrowUndoOutline aria-hidden /> Manter a logo atual
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={LOGO_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Selecionar logo da empresa"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
