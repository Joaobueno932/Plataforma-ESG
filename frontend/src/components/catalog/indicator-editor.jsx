'use client';
import { useEffect, useState } from 'react';
import { IoAdd, IoArrowDown, IoArrowUp, IoTrashOutline, IoColorPaletteOutline } from 'react-icons/io5';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Btn, Field, Notice, SelectInput, TextArea, TextInput } from '@/components/esg/ui';
import { LevelCards } from '@/components/esg/level-card';
import { AXES, NEUTRAL_LEVEL_COLOR, OFFICIAL_PALETTE, levelColor } from '@/lib/levels';
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
        {OFFICIAL_PALETTE.map((c) => (
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
 *
 * `mode="levels"`: só a escala de maturidades (lápis do ciclo) — grava apenas as alternativas;
 * `context` mostra onde a edição fica e o que ela afeta.
 */
export function IndicatorEditor({ open, onOpenChange, versionId, section, indicator, onSaved, mode = 'full', context = null, savedMessage }) {
  const levelsOnly = mode === 'levels' && !!indicator;
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmRemove(null);
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
    const levels = answers.map(({ id, title, points, description, mandatory, color }) => ({ id, title, points: Number(points), description, mandatory, color: color || null }));
    const body = levelsOnly ? { answers: levels } : { ...form, code: form.code || undefined, answers: levels };
    try {
      const res = indicator ? await updateIndicator(indicator.id, body) : await addIndicator(versionId, { ...body, section });
      notify(savedMessage || (indicator ? 'Indicador atualizado' : 'Indicador criado'), 'success');
      onSaved(res.data);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const levelList = (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {levelsOnly ? 'Escala de maturidade' : 'Alternativas'} ({answers.length}/6)
        </h3>
        <Btn size="sm" variant="secondary" onClick={() => setAnswers((l) => [...l, blank()])} disabled={answers.length >= 6}>
          <IoAdd aria-hidden /> {levelsOnly ? 'Adicionar maturidade' : 'Alternativa'}
        </Btn>
      </div>
      <ol className={levelsOnly ? 'grid items-start gap-3 lg:grid-cols-2' : 'flex flex-col gap-3'}>
        {answers.map((a, index) => (
          <li key={a.key} className="esg-rise flex flex-col gap-3 rounded-xl border border-slate-200 p-3" style={{ borderLeft: `6px solid ${a.color || levelColor({ title: a.title })}` }}>
            <div className="grid items-start gap-2 sm:grid-cols-[1fr_96px_auto]">
              <Field label={`Nome do nível ${index + 1}`} htmlFor={`alt-nome-${a.key}`}>
                <TextInput id={`alt-nome-${a.key}`} value={a.title} onChange={(e) => setAnswer(index, { title: e.target.value })} />
              </Field>
              <Field label="Pontos" htmlFor={`alt-pts-${a.key}`}>
                <TextInput id={`alt-pts-${a.key}`} type="number" min={0} value={a.points} onChange={(e) => setAnswer(index, { points: e.target.value })} />
              </Field>
              <div className="flex gap-1 sm:pt-[26px]">
                <Btn size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover ${a.title || 'nível'} para antes`} title="Mover para antes na escala">
                  <IoArrowUp aria-hidden />
                </Btn>
                <Btn size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === answers.length - 1} aria-label={`Mover ${a.title || 'nível'} para depois`} title="Mover para depois na escala">
                  <IoArrowDown aria-hidden />
                </Btn>
                <Btn
                  size="icon"
                  variant="danger-ghost"
                  onClick={() => setConfirmRemove(a.key)}
                  disabled={answers.length <= 2}
                  aria-label={`Excluir ${a.title || 'nível'}`}
                  title={answers.length <= 2 ? 'O indicador precisa de pelo menos 2 níveis' : 'Excluir nível'}
                >
                  <IoTrashOutline aria-hidden />
                </Btn>
              </div>
            </div>
            {confirmRemove === a.key && (
              <div role="alertdialog" aria-label={`Confirmar exclusão de ${a.title || 'nível'}`} className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Excluir <strong>{a.title || `nível ${index + 1}`}</strong>? A exclusão só vale na edição em rascunho; respostas já registradas neste nível ficam preservadas nos ciclos abertos.
                </span>
                <span className="flex shrink-0 gap-2">
                  <Btn size="sm" variant="ghost" onClick={() => setConfirmRemove(null)} autoFocus>
                    Cancelar
                  </Btn>
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setAnswers((l) => l.filter((x) => x.key !== a.key));
                      setConfirmRemove(null);
                    }}
                  >
                    Excluir
                  </Btn>
                </span>
              </div>
            )}
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
                Maturidade mínima exigida
              </label>
            </div>
          </li>
        ))}
      </ol>
      {answers.some((a) => a.mandatory) && (
        <button type="button" className="self-start text-xs font-medium text-[#0D5DA8] hover:underline" onClick={() => setAnswers((l) => l.map((x) => ({ ...x, mandatory: false })))}>
          Remover a maturidade mínima exigida
        </button>
      )}
    </div>
  );

  const previewBox = (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Prévia — como a empresa verá</p>
      <LevelCards answers={preview} readOnly compact label="Prévia das alternativas" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {levelsOnly
              ? `Editar maturidades · ${indicator.code}`
              : indicator
                ? `Editar ${indicator.code}`
                : `Novo indicador · ${section === 'All' ? 'Caderno Geral' : `Caderno ${section}`}`}
          </DialogTitle>
          <DialogDescription>
            {levelsOnly
              ? `${indicator.title}. Título, descrição, pontuação, cor e ordem de cada nível.`
              : 'As alterações ficam na edição em rascunho. Ciclos já abertos não mudam; a edição vale para ciclos novos depois de publicada.'}
          </DialogDescription>
        </DialogHeader>
        {levelsOnly ? (
          <DialogBody className="flex flex-col gap-5">
            {context}
            {/* Prévia na largura toda: a escala inteira, na ordem e nas cores que a empresa verá. */}
            {previewBox}
            {levelList}
          </DialogBody>
        ) : (
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
              {levelList}
              {previewBox}
            </div>
          </DialogBody>
        )}
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
            {levelsOnly ? 'Salvar maturidades' : indicator ? 'Salvar indicador' : 'Criar indicador'}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
