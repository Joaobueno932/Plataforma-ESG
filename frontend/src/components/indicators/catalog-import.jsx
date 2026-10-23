'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { notify, updateToast, apiErrorMessage } from '@/lib/toast';
import {
  getCatalogVersions,
  previewCatalog,
  importCatalog,
  publishCatalogVersion,
  discardCatalogVersion,
  getCatalogReport,
} from '@/services/catalog';

const STATUS_LABEL = { draft: 'Rascunho', published: 'Publicada', archived: 'Arquivada' };
const ORIGIN_LABEL = { official: 'Oficial', demo: 'Demonstração' };

function Counts({ counts }) {
  if (!counts) return null;
  const bySection = counts.bySection || {};
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      <dt className="text-neutral">Indicadores</dt>
      <dd className="font-semibold">{counts.indicators}</dd>
      <dt className="text-neutral">Alternativas</dt>
      <dd className="font-semibold">{counts.levels}</dd>
      <dt className="text-neutral">Caderno Geral</dt>
      <dd className="font-semibold">{counts.general}</dd>
      <dt className="text-neutral">Setoriais</dt>
      <dd className="font-semibold">
        {counts.sectoral}
        {Object.keys(bySection).length > 0 && (
          <span className="font-normal text-neutral-03">
            {' '}
            ({Object.entries(bySection)
              .filter(([section]) => section !== 'All')
              .map(([section, n]) => `${section}:${n}`)
              .join(' ')})
          </span>
        )}
      </dd>
      <dt className="text-neutral">Com mínimo obrigatório</dt>
      <dd className="font-semibold">{counts.mandatory}</dd>
      <dt className="text-neutral">Soma dos máximos</dt>
      <dd className="font-semibold">{counts.maxPointsTotal}</dd>
    </dl>
  );
}

function Findings({ report }) {
  if (!report) return null;
  const block = (title, items, render, tone) =>
    items && items.length ? (
      <div className="space-y-1">
        <h5 className={`font-semibold text-sm ${tone}`}>
          {title} ({items.length})
        </h5>
        <ul className="list-disc pl-5 text-sm text-neutral-03 space-y-1 max-h-48 overflow-auto">
          {items.slice(0, 25).map((item, i) => (
            <li key={i}>{render(item)}</li>
          ))}
          {items.length > 25 && <li>… e mais {items.length - 25}</li>}
        </ul>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h5 className="font-semibold text-sm">Conferência com a especificação</h5>
        <ul className="text-sm space-y-1">
          {(report.conference || []).map((check) => (
            <li key={check.label} className={check.ok ? 'text-secondary-02' : 'text-semantic-alert'}>
              {check.ok ? '✓' : '!'} {check.label}: esperado {check.expected}, encontrado {check.actual}
            </li>
          ))}
        </ul>
      </div>
      {block('Erros (impedem a importação)', report.errors, (e) => `${e.kind}${e.code ? ` [${e.code}]` : ''}${e.line ? ` linha ${e.line}` : ''}: ${e.detail || ''}`, 'text-semantic-error')}
      {block('Divergências entre as abas da fonte', report.divergences, (d) => `${d.kind}${d.code ? ` [${d.code}]` : ''}: ${d.detail || ''}`, 'text-semantic-alert')}
      {block('Avisos', report.warnings, (w) => `${w.kind}${w.code ? ` [${w.code}]` : ''}: ${w.detail || ''}`, 'text-neutral')}
      {block('Fontes ausentes', report.missingSources, (m) => `${m.field}: ${m.detail}`, 'text-semantic-alert')}
    </div>
  );
}

/**
 * Importação do catálogo oficial: prévia com validação e relatório, importação como rascunho
 * e confirmação administrativa (publicação). Versões publicadas não são editadas.
 */
export function CatalogImport() {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [preview, setPreview] = useState(null);
  const [versions, setVersions] = useState(null);
  const [active, setActive] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getCatalogVersions()
      .then(({ data }) => {
        setVersions(data.data);
        setActive(data.active);
      })
      .catch((err) => console.error('Erro ao obter as versões do catálogo:', err));
  }, []);

  useEffect(load, [load]);

  const run = async (action, message, fn) => {
    const id = notify(message, 'loading');
    setBusy(true);
    try {
      const result = await fn();
      updateToast(id, action, 'success');
      return result;
    } catch (err) {
      updateToast(id, apiErrorMessage(err), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const doPreview = async () => {
    if (!file) return;
    const result = await run('Prévia concluída.', 'Lendo e validando a planilha...', () => previewCatalog(file));
    if (result) setPreview(result.data);
  };

  const doImport = async () => {
    if (!file) return;
    const result = await run('Versão importada como rascunho.', 'Importando...', () => importCatalog(file, { label: label || undefined }));
    if (result) {
      setPreview({ ...(preview || {}), report: result.data.report, version: result.data.version });
      load();
    }
  };

  const doPublish = async (version) => {
    const { data } = await getCatalogReport(version.id).catch(() => ({ data: null }));
    const divergences = data ? (data.divergences || []).length : 0;
    const missing = data ? (data.missingSources || []).length : 0;
    if (divergences || missing) {
      const confirmed = window.confirm(
        `Esta versão tem ${divergences} divergência(s) entre as abas da fonte e ${missing} fonte(s) ausente(s).\n\n` +
          'Publicar assume essas divergências, que continuam registradas no relatório. Confirmar?',
      );
      if (!confirmed) return;
    }
    const result = await run('Versão publicada.', 'Publicando versão...', () => publishCatalogVersion(version.id, true));
    if (result) load();
  };

  const doDiscard = async (version) => {
    if (!window.confirm(`Descartar o rascunho "${version.label}"?`)) return;
    const result = await run('Rascunho descartado.', 'Descartando...', () => discardCatalogVersion(version.id));
    if (result) load();
  };

  const showReport = async (version) => {
    const result = await run('Relatório carregado.', 'Carregando relatório...', () => getCatalogReport(version.id));
    if (result) setReport({ version, data: result.data });
  };

  return (
    <Card.Root className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h4 className="font-semibold text-xl text-neutral">Catálogo oficial de indicadores</h4>
        <p className="text-sm text-neutral-03">
          A importação lê a planilha oficial, valida e mostra o relatório antes de qualquer gravação. A versão entra como
          rascunho e só passa a valer para avaliações novas depois da publicação. Avaliações já abertas continuam na versão
          com que foram criadas.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-neutral">Planilha (.xlsx)</span>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.currentTarget.files?.[0] || null);
              setPreview(null);
            }}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-neutral">Rótulo da versão (opcional)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            placeholder="ex.: oficial-2026-10"
            className="input-base h-10 rounded-md border border-gray-200 px-3"
          />
        </label>
        <Button type="button" variant="outline-03" size="free" className="px-6 py-2" disabled={!file || busy} onClick={doPreview}>
          VALIDAR (PRÉVIA)
        </Button>
        <Button type="button" size="free" className="px-6 py-2" disabled={!file || busy} onClick={doImport}>
          IMPORTAR COMO RASCUNHO
        </Button>
      </div>

      {preview && (
        <div className="grid gap-6 md:grid-cols-2 border-t pt-4">
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">
              Resumo {preview.source ? `· ${preview.source.file}` : ''}
            </h5>
            <Counts counts={preview.report?.counts} />
            {preview.alreadyImportedAs && (
              <p className="text-sm text-semantic-alert">
                Este arquivo já foi importado como “{preview.alreadyImportedAs.label}” ({STATUS_LABEL[preview.alreadyImportedAs.status]}).
              </p>
            )}
            <p className="text-sm">
              Erros: <strong>{preview.report?.summary?.errors ?? 0}</strong> · Divergências:{' '}
              <strong>{preview.report?.summary?.divergences ?? 0}</strong> · Avisos:{' '}
              <strong>{preview.report?.summary?.warnings ?? 0}</strong>
            </p>
          </div>
          <Findings report={preview.report} />
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <h5 className="font-semibold text-sm">Versões</h5>
        {!versions && <p className="text-sm text-neutral-03">Carregando…</p>}
        {versions && !versions.length && <p className="text-sm text-neutral-03">Nenhuma versão registrada.</p>}
        {versions && versions.length > 0 && (
          <ul className="divide-y">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <span className="font-semibold">{version.label}</span>{' '}
                  <span className="text-neutral-03">
                    · {ORIGIN_LABEL[version.origin] || version.origin} · {STATUS_LABEL[version.status] || version.status}
                    {version.id === active && ' · em vigor'}
                  </span>
                  <div className="text-neutral-03">
                    {version.indicators} indicadores · {version.levels} alternativas · {version.cycles} avaliação(ões)
                    {version.sourceFile ? ` · ${version.sourceFile}` : ''}
                  </div>
                  {version.notes && <div className="text-neutral-03 max-w-xl">{version.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline-white" size="sm" onClick={() => showReport(version)}>
                    Relatório
                  </Button>
                  {version.status === 'draft' && (
                    <>
                      <Button type="button" size="sm" disabled={busy} onClick={() => doPublish(version)}>
                        Publicar
                      </Button>
                      <Button type="button" variant="error" size="sm" disabled={busy} onClick={() => doDiscard(version)}>
                        Descartar
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {report && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-sm">Relatório da versão {report.version.label}</h5>
            <Button type="button" variant="outline-white" size="sm" onClick={() => setReport(null)}>
              Fechar
            </Button>
          </div>
          <Counts counts={report.data.counts} />
          <Findings report={report.data} />
        </div>
      )}
    </Card.Root>
  );
}
