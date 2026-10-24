'use client';
import { useEffect, useState } from 'react';
import { IoAdd, IoArrowDown, IoArrowUp, IoTrashOutline, IoColorPaletteOutline } from 'react-icons/io5';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Btn, Field, Notice, SelectInput, TextArea, TextInput } from '@/components/esg/ui';
import { LevelCards } from '@/components/esg/level-card';
import { AXES, NEUTRAL_LEVEL_COLOR, OFFICIAL_LEVEL_COLORS, levelColor } from '@/lib/levels';
import { addIndicator, updateIndicator } from '@/services/catalog';
import { apiErrorMessage, notify } from '@/lib/toast';
import { cn } from '@/lib/utils';

const blank = (title = '', points = 0, extra = {}) => ({ key: Math.random().toString(36).slice(2), id: null, title, points, description: '', mandatory: false, color: '', ...extra });

/** Modelo inicial de um indicador novo: os cinco níveis dos cadernos, editáveis. */
const STARTER = () => [
  blank('Não conforme', 0),
  blank('Iniciante', 2),
  blank('Sensibilizada', 4),
  blank('Consciente', 8),
  blank('Engajada', 10),
];

function ColorPicker({ value, fallback, onChange, label }) {
  const effective = value || fallback;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
        <IoColorPaletteOutline aria-hidden /> Cor do cartão
      </span>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
        {OFFICIAL_LEVEL_COLORS.map((c) => (
          <button
            key={c.color}
            type="button"
            role="radio"
            aria-checked={effective?.toUpperCase() === c.color}
            title={`${c.name} (${c.color})`}
            aria-label={`${c.name} ${c.color}`}
            onClick={() => onChange(c.color)}
            className={cn(
              'h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3969]',
              effective?.toUpperCase() === c.color && 'ring-2 ring-[#0D3969]',
            )}
            style={{ background: c.color }}
          />
        ))}
        <label className="relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50">
          <input type="color" className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" value={effective || NEUTRAL_LEVEL_COLOR} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label="Cor personalizada" />
          Outra
        </label>
        {value && (
          <button type="button" className="text-xs font-medium text-[#0D5DA8] hover:underline" onClick={() => onChange('')}>
            usar a do caderno
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Criação e edição de indicador com as alternativas como cartões. A prévia ao lado é o mesmo
 * componente que a empresa verá no modal de resposta.
 */
export function IndicatorEditor({ open, onOpenChange, versionId, section, indicator, onSaved }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (indicator) {
      setForm({
        code: indicator.code,
        category: indicator.category,
        topic: indicator.topic || '',
        ods: indicator.ods || '',
        title: indicator.title,
        description: indicator.description || '',
        verification: indicator.verification || '',
      });
      setAnswers(
        [...indicator.answers]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((a) => ({ key: a.id, id: a.id, title: a.title, points: a.points, description: a.description || '', mandatory: !!a.mandatory, color: a.colorSource === 'administracao' ? a.color : '' })),
      );
    } else {
      setForm({ code: '', category: 'E', topic: '', ods: '', title: '', description: '', verification: '' });
      setAnswers(STARTER());
    }
  }, [open, indicator]);

  if (!form) return null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setAnswer = (index, patch) => setAnswers((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  const move = (index, delta) =>
    setAnswers((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const preview = answers.map((a, i) => ({ id: a.key, title: a.title || `Nível ${i + 1}`, description: a.description || 'Descrição do nível', points: Number(a.points) || 0, mandatory: a.mandatory, position: i + 1, color: a.color || null }));

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      code: form.code || undefined,
      answers: answers.map(({ id, title, points, description, mandatory, color }) => ({ id, title, points: Number(points), description, mandatory, color: color || null })),
    };
    try {
      const res = indicator ? await updateIndicator(indicator.id, body) : await addIndicator(versionId, { ...body, section });
      notify(indicator ? 'Indicador atualizado' : 'Indicador criado', 'success');
      onSaved(res.data);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{indicator ? `Editar ${indicator.code}` : `Novo indicador · ${section === 'All' ? 'Caderno Geral' : `Caderno ${section}`}`}</DialogTitle>
          <DialogDescription>As alterações ficam na edição em rascunho. Ciclos já abertos não mudam; a edição vale para ciclos novos depois de publicada.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Código" htmlFor="ind-codigo" hint={indicator ? undefined : 'Em branco: gerado pelo caderno e eixo.'}>
                <TextInput id="ind-codigo" value={form.code} onChange={set('code')} placeholder="ex.: I-E01" />
              </Field>
              <Field label="Eixo" htmlFor="ind-eixo" required>
                <SelectInput id="ind-eixo" value={form.category} onChange={set('category')}>
                  {Object.entries(AXES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="ODS" htmlFor="ind-ods">
                <TextInput id="ind-ods" value={form.ods} onChange={set('ods')} placeholder="ex.: 6" />
              </Field>
            </div>
            <Field label="Tópico" htmlFor="ind-topico">
              <TextInput id="ind-topico" value={form.topic} onChange={set('topic')} placeholder="ex.: Compliance" />
            </Field>
            <Field label="Título" htmlFor="ind-titulo" required>
              <TextInput id="ind-titulo" value={form.title} onChange={set('title')} maxLength={255} />
            </Field>
            <Field label="Descrição" htmlFor="ind-desc" required>
              <TextArea id="ind-desc" value={form.description} onChange={set('description')} className="min-h-[120px]" />
            </Field>
            <Field label="Verificação" htmlFor="ind-verif" hint="O que o auditor deve encontrar.">
              <TextArea id="ind-verif" value={form.verification} onChange={set('verification')} />
            </Field>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Alternativas ({answers.length}/6)</h3>
              <Btn size="sm" variant="secondary" onClick={() => setAnswers((l) => [...l, blank()])} disabled={answers.length >= 6}>
                <IoAdd aria-hidden /> Alternativa
              </Btn>
            </div>
            <ol className="flex flex-col gap-3">
              {answers.map((a, index) => (
                <li key={a.key} className="esg-rise flex flex-col gap-3 rounded-xl border border-slate-200 p-3" style={{ borderLeft: `6px solid ${a.color || levelColor({ title: a.title })}` }}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_96px_auto]">
                    <Field label={`Nome do nível ${index + 1}`} htmlFor={`alt-nome-${a.key}`}>
                      <TextInput id={`alt-nome-${a.key}`} value={a.title} onChange={(e) => setAnswer(index, { title: e.target.value })} />
                    </Field>
                    <Field label="Pontos" htmlFor={`alt-pts-${a.key}`}>
                      <TextInput id={`alt-pts-${a.key}`} type="number" min={0} value={a.points} onChange={(e) => setAnswer(index, { points: e.target.value })} />
                    </Field>
                    <div className="flex items-end gap-1">
                      <Btn size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${a.title || 'nível'}`}>
                        <IoArrowUp aria-hidden />
                      </Btn>
                      <Btn size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === answers.length - 1} aria-label={`Descer ${a.title || 'nível'}`}>
                        <IoArrowDown aria-hidden />
                      </Btn>
                      <Btn size="icon" variant="danger-ghost" onClick={() => setAnswers((l) => l.filter((_, i) => i !== index))} disabled={answers.length <= 2} aria-label={`Remover ${a.title || 'nível'}`}>
                        <IoTrashOutline aria-hidden />
                      </Btn>
                    </div>
                  </div>
                  <Field label="Explicação do nível" htmlFor={`alt-desc-${a.key}`}>
                    <TextArea id={`alt-desc-${a.key}`} value={a.description} onChange={(e) => setAnswer(index, { description: e.target.value })} className="min-h-[64px]" />
                  </Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <ColorPicker value={a.color} fallback={levelColor({ title: a.title })} onChange={(color) => setAnswer(index, { color })} label={`Cor de ${a.title || 'nível'}`} />
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="radio"
                        name="minimo-obrigatorio"
                        className="accent-[#0D5DA8]"
                        checked={a.mandatory}
                        onChange={() => setAnswers((l) => l.map((x, i) => ({ ...x, mandatory: i === index })))}
                      />
                      Mínimo obrigatório
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            {answers.some((a) => a.mandatory) && (
              <button type="button" className="self-start text-xs font-medium text-[#0D5DA8] hover:underline" onClick={() => setAnswers((l) => l.map((x) => ({ ...x, mandatory: false })))}>
                Remover o mínimo obrigatório
              </button>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Prévia — como a empresa verá</p>
              <LevelCards answers={preview} readOnly compact label="Prévia das alternativas" />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          {error && (
            <Notice tone="danger" className="mr-auto py-2">
              {error}
            </Notice>
          )}
          <Btn variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Btn>
          <Btn onClick={save} loading={busy}>
            {indicator ? 'Salvar indicador' : 'Criar indicador'}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
