'use client';
/**
 * Foto de perfil: pré-visualização circular, selecionar/substituir, remover e recorte antes de
 * salvar (arrastar para enquadrar, zoom). Sem dependências: o recorte é feito em <canvas> e sai
 * como JPEG 512×512 — já sem metadados; o servidor valida e limpa de novo.
 *
 * Quem usa decide o que acontece com a foto: `onPick(blob)` pode enviar na hora (edição, perfil)
 * ou guardar para depois (cadastro, enviado após a conta existir).
 */
import { useEffect, useRef, useState } from 'react';
import { IoCameraOutline, IoTrashOutline } from 'react-icons/io5';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Btn } from '@/components/esg/ui';
import { UserAvatar } from './user-avatar';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 10 * 1024 * 1024; // arquivo original; o recorte enviado fica bem menor
const VIEW = 288;
const OUTPUT = 512;

function CropDialog({ image, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const base = Math.max(VIEW / image.width, VIEW / image.height);
  const scale = base * zoom;
  const limit = (o, z = zoom) => {
    const s = base * z;
    const mx = Math.max(0, (image.width * s - VIEW) / 2);
    const my = Math.max(0, (image.height * s - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  const placement = (size) => {
    const f = size / VIEW;
    return [(VIEW / 2 - (image.width * scale) / 2 + offset.x) * f, (VIEW / 2 - (image.height * scale) / 2 + offset.y) * f, image.width * scale * f, image.height * scale * f];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = VIEW * ratio;
    canvas.height = VIEW * ratio;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.drawImage(image, ...placement(VIEW));
    // Máscara: fora do círculo fica escurecido (é o que aparece no avatar).
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, VIEW, VIEW);
    ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 2, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, zoom, offset]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: offset };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setOffset(limit({ x: drag.current.start.x + e.clientX - drag.current.x, y: drag.current.start.y + e.clientY - drag.current.y }));
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 20 : 6;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => limit({ x: o.x + moves[e.key][0], y: o.y + moves[e.key][1] }));
    } else if (e.key === '+' || e.key === '=') setZoomTo(zoom + 0.1);
    else if (e.key === '-') setZoomTo(zoom - 0.1);
  };
  const setZoomTo = (z) => {
    const next = Math.min(3, Math.max(1, z));
    setZoom(next);
    setOffset((o) => limit(o, next));
  };

  const confirm = () => {
    setBusy(true);
    const out = document.createElement('canvas');
    out.width = OUTPUT;
    out.height = OUTPUT;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; // PNG transparente vira fundo branco no JPEG
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, ...placement(OUTPUT));
    out.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onConfirm(new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>Arraste para enquadrar e use o zoom. O círculo mostra como a foto vai aparecer.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Recorte da foto. Use as setas para mover e + ou − para o zoom."
            tabIndex={0}
            className="touch-none cursor-grab rounded-xl border border-slate-200 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-03 active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW, maxWidth: '100%' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKeyDown}
          />
          <label className="flex w-full max-w-[288px] items-center gap-3 text-sm text-slate-700">
            <span className="shrink-0 font-medium">Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoomTo(Number(e.target.value))} className="w-full accent-[#0D5DA8]" />
          </label>
        </DialogBody>
        <DialogFooter>
          <Btn variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Btn>
          <Btn onClick={confirm} loading={busy}>
            Usar esta foto
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AvatarEditor({ user, previewSrc, onPick, onRemove, busy = false, disabled = false, hint = 'JPEG, PNG ou WebP. A foto é recortada em 512×512.' }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);
  const hasPhoto = !!(previewSrc || user?.avatar);

  useEffect(() => () => source?.url && URL.revokeObjectURL(source.url), [source]);

  const choose = (file) => {
    setError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setError('Formato não suportado. Envie JPEG, PNG ou WebP.');
    if (file.size > MAX_SOURCE_BYTES) return setError('A imagem original pode ter até 10 MB.');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 32 || img.naturalHeight < 32) {
        URL.revokeObjectURL(url);
        return setError('A imagem deve ter ao menos 32×32 pixels.');
      }
      setSource({ url, image: img });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Não foi possível ler a imagem; o arquivo pode estar corrompido.');
    };
    img.src = url;
  };

  const pick = async (blob) => {
    setSource(null);
    try {
      await onPick(blob);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Não foi possível salvar a foto.');
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível remover a foto.');
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UserAvatar user={user} src={previewSrc} size="xl" className="shadow-sm" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Btn type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy} loading={busy}>
            <IoCameraOutline aria-hidden /> {hasPhoto ? 'Substituir foto' : 'Selecionar foto'}
          </Btn>
          {hasPhoto && onRemove && (
            <Btn type="button" variant="danger-ghost" size="sm" onClick={remove} disabled={disabled || busy}>
              <IoTrashOutline aria-hidden /> Remover
            </Btn>
          )}
        </div>
        <p className="text-xs text-slate-500">{hint}</p>
        {error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label="Selecionar foto de perfil"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {source && <CropDialog image={source.image} onCancel={() => setSource(null)} onConfirm={pick} />}
    </div>
  );
}
