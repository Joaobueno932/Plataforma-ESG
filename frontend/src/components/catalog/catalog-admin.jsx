'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoAdd, IoArrowDown, IoArrowUp, IoBookOutline, IoCreateOutline, IoImageOutline, IoRocketOutline, IoTrashOutline, IoSearch } from 'react-icons/io5';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Field, Notice, SelectInput, SkeletonRows, TextInput, formatDateTime } from '@/components/esg/ui';
import { AXES, levelColor, levelName, sortByPosition } from '@/lib/levels';
import { CatalogImport } from '@/components/indicators/catalog-import';
import { IndicatorEditor } from './indicator-editor';
import {
  addSection,
  createEdition,
  discardCatalogVersion,
  getCatalogVersions,
  getEditor,
  publishCatalogVersion,
  removeIndicator,
  removeSection,
  reorderSection,
  setSectionCover,
  updateSection,
} from '@/services/catalog';
import { uploadSectorCover } from '@/services/reports';
import { apiAsset } from '@/lib/format';
import { apiErrorMessage, notify } from '@/lib/toast';
import { cn } from '@/lib/utils';

const STATUS = { draft: { label: 'Rascunho', tone: 'warning' }, published: { label: 'Publicada', tone: 'success' }, archived: { label: 'Arquivada', tone: 'neutral' } };

/** Faixa com as cores das alternativas — leitura rápida do indicador na lista. */
function LevelStrip({ answers }) {
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
      {sortByPosition(answers).map((a) => (
        <span key={a.id} className="flex-1" style={{ background: levelColor(a) }} />
      ))}
    </div>
  );
}

function NewSectionDialog({ open, onOpenChange, versionId, onCreated }) {
  const [form, setForm] = useState({ section: '', name: '' });
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await addSection(versionId, form);
      let view = data;
      if (cover) {
        const up = await uploadSectorCover(cover);
        view = (await setSectionCover(versionId, form.section.toUpperCase(), up.data.filePath)).data;
      }
      notify('Caderno criado na edição', 'success');
      onCreated(view, form.section.toUpperCase());
      setForm({ section: '', name: '' });
      setCover(null);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Novo caderno setorial</DialogTitle>
          <DialogDescription>Crie do zero, sem planilha. Depois inclua os indicadores e publique a edição.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Field label="Código" htmlFor="sec-codigo" required hint="Letra ou letra + números, ex.: I">
            <TextInput id="sec-codigo" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value.toUpperCase().slice(0, 8) }))} autoFocus />
          </Field>
          <Field label="Nome do caderno" htmlFor="sec-nome" required>
            <TextInput id="sec-nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex.: Saneamento e Reúso" />
          </Field>
          <Field label="Capa (opcional)" htmlFor="sec-capa">
            <input id="sec-capa" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} className="text-sm" />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
        </DialogBody>
        <DialogFooter>
          <Btn variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Btn>
          <Btn onClick={save} loading={busy} disabled={!form.section || !form.name.trim()}>
            Criar caderno
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, variant = 'primary', onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <DialogBody>
            <Notice tone="danger">{error}</Notice>
          </DialogBody>
        )}
        <DialogFooter>
          <Btn variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Btn>
          <Btn
            variant={variant}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (err) {
                setError(apiErrorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Editor de uma edição: cadernos à esquerda, indicadores do caderno à direita. */
function EditionEditor({ versionId, onChanged }) {
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [section, setSection] = useState('All');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState(null); // indicador ou 'novo'
  const [newSection, setNewSection] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [rename, setRename] = useState(null);

  const load = useCallback(() => {
    setError(null);
    getEditor(versionId)
      .then(({ data }) => setView(data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [versionId]);
  useEffect(load, [load]);

  const indicators = useMemo(() => {
    if (!view) return [];
    const t = term.trim().toLowerCase();
    return view.indicators.filter((i) => i.section === section && (!t || `${i.code} ${i.title} ${i.topic || ''}`.toLowerCase().includes(t)));
  }, [view, section, term]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!view) return <SkeletonRows rows={6} />;
  const { version } = view;
  const editable = version.editable;
  const current = view.sections.find((s) => s.section === section);

  const move = async (indicator, delta) => {
    const ids = view.indicators.filter((i) => i.section === section).map((i) => i.id);
    const index = ids.indexOf(indicator.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      setView((await reorderSection(versionId, section, ids)).data);
    } catch (err) {
      notify(apiErrorMessage(err), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{version.label}</h2>
              <Badge tone={STATUS[version.status]?.tone}>{STATUS[version.status]?.label}</Badge>
              {version.origin === 'edited' && <Badge tone="info">Edição administrativa</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {view.indicators.length} indicadores · {view.sections.length} cadernos · criada em {formatDateTime(version.createdAt)}
              {version.cycles ? ` · usada por ${version.cycles} ciclo(s)` : ''}
            </p>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="danger-ghost"
                onClick={() =>
                  setConfirm({
                    title: 'Descartar esta edição?',
                    description: 'O rascunho e todas as alterações dele serão removidos. Versões publicadas não são afetadas.',
                    confirmLabel: 'Descartar',
                    variant: 'danger',
                    run: async () => {
                      await discardCatalogVersion(versionId);
                      notify('Edição descartada', 'success');
                      onChanged(null);
                    },
                  })
                }
              >
                <IoTrashOutline aria-hidden /> Descartar
              </Btn>
              <Btn
                variant="success"
                onClick={() =>
                  setConfirm({
                    title: `Publicar "${version.label}"?`,
                    description: 'A edição passa a valer para os ciclos abertos a partir de agora. Ciclos já abertos continuam com a versão que congelaram.',
                    confirmLabel: 'Publicar edição',
                    variant: 'success',
                    run: async () => {
                      await publishCatalogVersion(versionId, true);
                      notify('Edição publicada', 'success');
                      onChanged(versionId);
                      load();
                    },
                  })
                }
              >
                <IoRocketOutline aria-hidden /> Publicar
              </Btn>
            </div>
          )}
        </div>
        {!editable && (
          <div className="px-5 pb-5">
            <Notice tone="info">Esta versão está {STATUS[version.status]?.label.toLowerCase()} e não muda. Para alterar o catálogo, crie uma nova edição a partir dela.</Notice>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader
            title="Cadernos"
            actions={
              editable && (
                <Btn size="sm" onClick={() => setNewSection(true)}>
                  <IoAdd aria-hidden /> Novo
                </Btn>
              )
            }
          />
          <ul className="flex flex-col p-2" role="listbox" aria-label="Cadernos da edição">
            {view.sections.map((s) => (
              <li key={s.section}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.section === section}
                  onClick={() => setSection(s.section)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    s.section === section ? 'bg-[#0D5DA8]/10 text-[#0D3969]' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {s.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={apiAsset(s.avatar)} alt="" className="h-9 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                      <IoBookOutline aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.section === 'All' ? 'Caderno Geral' : `${s.section} · ${s.name}`}</span>
                    <span className="text-xs text-slate-500">{s.indicators} indicador(es)</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-slate-900">{section === 'All' ? 'Caderno Geral' : `Caderno ${section} · ${current?.name}`}</h3>
              <p className="text-sm text-slate-600">Indicadores e alternativas deste caderno, na ordem em que a empresa verá.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && section !== 'All' && (
                <>
                  <Btn size="sm" variant="ghost" onClick={() => setRename({ name: current?.name || '' })}>
                    <IoCreateOutline aria-hidden /> Renomear
                  </Btn>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    <IoImageOutline aria-hidden /> Capa
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const up = await uploadSectorCover(f);
                          setView((await setSectionCover(versionId, section, up.data.filePath)).data);
                          notify('Capa atualizada', 'success');
                        } catch (err) {
                          notify(apiErrorMessage(err), 'error');
                        }
                      }}
                    />
                  </label>
                  <Btn
                    size="sm"
                    variant="danger-ghost"
                    onClick={() =>
                      setConfirm({
                        title: `Remover o caderno ${section}?`,
                        description: 'O caderno e os indicadores dele saem desta edição. A versão publicada não muda.',
                        confirmLabel: 'Remover caderno',
                        variant: 'danger',
                        run: async () => {
                          setView((await removeSection(versionId, section)).data);
                          setSection('All');
                        },
                      })
                    }
                  >
                    <IoTrashOutline aria-hidden /> Remover
                  </Btn>
                </>
              )}
              {editable && (
                <Btn size="sm" onClick={() => setEditing('novo')}>
                  <IoAdd aria-hidden /> Novo indicador
                </Btn>
              )}
            </div>
          </div>

          <div className="relative">
            <IoSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <TextInput aria-label="Buscar indicador no caderno" placeholder="Buscar por código, título ou tópico" value={term} onChange={(e) => setTerm(e.target.value)} className="pl-9" />
          </div>

          {!indicators.length ? (
            <EmptyState
              title={term ? 'Nada encontrado' : 'Este caderno ainda não tem indicadores'}
              description={editable ? 'Inclua o primeiro indicador com suas alternativas e cores.' : undefined}
              action={editable && !term && <Btn onClick={() => setEditing('novo')}>Novo indicador</Btn>}
            />
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              {indicators.map((ind, index) => (
                <li key={ind.id} className="esg-rise">
                  <Card className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500">{ind.code}</span>
                          <Badge tone="neutral">
                            <span className="h-2 w-2 rounded-full" style={{ background: AXES[ind.category]?.color }} aria-hidden />
                            {AXES[ind.category]?.label}
                          </Badge>
                          {ind.hasMandatory && <Badge tone="warning">Obrigatório</Badge>}
                        </div>
                        <p className="mt-1 font-medium text-slate-900">{ind.title}</p>
                        {ind.topic && <p className="text-xs text-slate-500">Tópico: {ind.topic}</p>}
                      </div>
                      {editable && (
                        <div className="flex shrink-0 gap-0.5">
                          <Btn size="icon" variant="ghost" onClick={() => move(ind, -1)} disabled={index === 0 || !!term} aria-label={`Subir ${ind.code}`}>
                            <IoArrowUp aria-hidden />
                          </Btn>
                          <Btn size="icon" variant="ghost" onClick={() => move(ind, 1)} disabled={index === indicators.length - 1 || !!term} aria-label={`Descer ${ind.code}`}>
                            <IoArrowDown aria-hidden />
                          </Btn>
                        </div>
                      )}
                    </div>
                    <LevelStrip answers={ind.answers} />
                    <ul className="flex flex-wrap gap-1.5">
                      {sortByPosition(ind.answers).map((a) => (
                        <li key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: levelColor(a) }} aria-hidden />
                          {levelName(a)} · {a.points}
                          {a.mandatory && <strong className="text-[10px] uppercase text-amber-700">mín.</strong>}
                        </li>
                      ))}
                    </ul>
                    {editable && (
                      <div className="mt-auto flex justify-end gap-2 pt-1">
                        <Btn
                          size="sm"
                          variant="danger-ghost"
                          onClick={() =>
                            setConfirm({
                              title: `Excluir ${ind.code}?`,
                              description: 'O indicador sai desta edição. Avaliações já feitas com outras versões não são afetadas.',
                              confirmLabel: 'Excluir indicador',
                              variant: 'danger',
                              run: async () => setView((await removeIndicator(ind.id)).data),
                            })
                          }
                        >
                          <IoTrashOutline aria-hidden /> Excluir
                        </Btn>
                        <Btn size="sm" variant="secondary" onClick={() => setEditing(ind)}>
                          <IoCreateOutline aria-hidden /> Editar e cores
                        </Btn>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <IndicatorEditor
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        versionId={versionId}
        section={section}
        indicator={editing === 'novo' ? null : editing}
        onSaved={(data) => setView(data.version ? { version: data.version, sections: data.sections, indicators: data.indicators } : data)}
      />
      <NewSectionDialog
        open={newSection}
        onOpenChange={setNewSection}
        versionId={versionId}
        onCreated={(data, code) => {
          setView(data);
          setSection(code);
        }}
      />
      <Dialog open={!!rename} onOpenChange={(v) => !v && setRename(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Renomear caderno {section}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Nome" htmlFor="renomear">
              <TextInput id="renomear" value={rename?.name || ''} onChange={(e) => setRename({ name: e.target.value })} autoFocus />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Btn variant="secondary" onClick={() => setRename(null)}>
              Cancelar
            </Btn>
            <Btn
              onClick={async () => {
                try {
                  setView((await updateSection(versionId, section, { name: rename.name })).data);
                  setRename(null);
                } catch (err) {
                  notify(apiErrorMessage(err), 'error');
                }
              }}
            >
              Salvar
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.run}
        />
      )}
    </div>
  );
}

/** Aba de catálogo da Administração: edições, edição em rascunho e importação da planilha. */
export function CatalogAdmin() {
  const [versions, setVersions] = useState(null);
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');

  const load = useCallback(async (focus) => {
    setError(null);
    try {
      const { data } = await getCatalogVersions();
      setVersions(data.data);
      setActive(data.active);
      const draft = data.data.find((v) => v.status === 'draft' && v.origin === 'edited');
      setSelected((prev) => (focus === null ? draft?.id || data.active : focus || prev || draft?.id || data.active));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const newEdition = async () => {
    setCreating(true);
    try {
      const { data } = await createEdition({ label: label.trim() || undefined, fromVersionId: active || undefined });
      notify('Nova edição criada a partir da versão em vigor', 'success');
      setLabel('');
      await load(data.version.id);
    } catch (err) {
      notify(apiErrorMessage(err), 'error');
    } finally {
      setCreating(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!versions) return <SkeletonRows rows={5} />;

  return (
    <Tabs defaultValue="editor">
      <TabsList aria-label="Catálogo">
        <TabsTrigger value="editor">Editor de cadernos</TabsTrigger>
        <TabsTrigger value="versoes">Versões</TabsTrigger>
        <TabsTrigger value="importar">Importar planilha</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="flex flex-col gap-5">
        <Card>
          <div className="flex flex-col gap-3 p-5 md:flex-row md:items-end">
            <Field label="Versão em edição ou consulta" htmlFor="versao-editor" className="md:w-96">
              <SelectInput id="versao-editor" value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {STATUS[v.status]?.label}
                    {v.id === active ? ' (em vigor)' : ''}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end md:justify-end">
              <Field label="Rótulo da nova edição" htmlFor="rotulo-edicao" className="sm:w-64" hint="Opcional">
                <TextInput id="rotulo-edicao" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex.: 2027-cadernos-revisados" />
              </Field>
              <Btn onClick={newEdition} loading={creating}>
                <IoAdd aria-hidden /> Nova edição
              </Btn>
            </div>
          </div>
        </Card>
        {selected ? <EditionEditor key={selected} versionId={selected} onChanged={load} /> : <EmptyState title="Nenhuma versão" description="Importe a planilha oficial ou crie uma edição." />}
      </TabsContent>
      <TabsContent value="versoes">
        <Card>
          <ul className="divide-y divide-slate-100">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-slate-900">{v.label}</span>{' '}
                  <Badge tone={STATUS[v.status]?.tone}>{STATUS[v.status]?.label}</Badge> {v.id === active && <Badge tone="brand">Em vigor</Badge>}
                  <p className="text-xs text-slate-500">
                    {v.indicators} indicadores · {v.levels} alternativas · {v.cycles} ciclo(s) · {v.origin}
                  </p>
                </div>
                <Btn size="sm" variant="secondary" onClick={() => setSelected(v.id)}>
                  Abrir no editor
                </Btn>
              </li>
            ))}
          </ul>
        </Card>
      </TabsContent>
      <TabsContent value="importar">
        <CatalogImport />
      </TabsContent>
    </Tabs>
  );
}
