/**
 * Relatório de auditoria em PDF, gerado **só** a partir dos registros estruturados: resultado
 * gravado na aprovação (mesmos números da API e do painel), ciclo, equipe, decisões de
 * aplicabilidade, constatações e enquadramentos.
 *
 * Conteúdo mínimo da especificação (TEL12): identificação e escopo da organização, versão do
 * programa, datas e equipe, resultados por eixo, rating, elegibilidade, tabela de indicadores,
 * decisões de aplicabilidade, constatações e conclusão. O modelo oficial ainda depende de
 * aprovação da FIEMS e do organismo de auditoria: o rodapé diz isso, e nenhum campo
 * institucional é inventado (sem assinatura nem autoridade signatária).
 */
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const presentation = require('../catalog/presentation');

const TEMPLATE_VERSION = 'relatorio-auditoria-estrutura-v1';
const LOGO = path.join(__dirname, '..', '..', 'assets', 'esg_logo_horizontal.png');
const BLUE = '#0D3969';
const BLUE_2 = '#0D5DA8';
const GRAY = '#475569';
const LIGHT = '#E2E8F0';
const AXIS = { E: 'Ambiental', S: 'Social', G: 'Governança' };

const day = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const cnpj = (v) => String(v || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const SIZE = { MICRO_PEQUENA: 'Micro e pequena', MEDIA: 'Média', GRANDE: 'Grande' };
/** Nome do nível como na fonte; chave legada `Nao_conforme` vira "Não conforme". */
const levelName = (name) => (!name ? name : /^nao_conforme$/i.test(name) ? 'Não conforme' : String(name).replace(/_/g, ' '));
const percent = (value) => (value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);

function build(data) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 48, right: 48 }, bufferPages: true, info: { Title: 'Relatório de auditoria ESG FIEMS', Author: 'Plataforma ESG FIEMS' } });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  const ensure = (needed) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };
  const heading = (text) => {
    ensure(60);
    doc.moveDown(0.8).fillColor(BLUE).font('Helvetica-Bold').fontSize(13).text(text, left, doc.y, { width });
    doc.moveTo(left, doc.y + 3).lineTo(left + width, doc.y + 3).lineWidth(1).strokeColor(BLUE_2).stroke();
    doc.moveDown(0.6).fillColor('#111827').font('Helvetica').fontSize(10);
  };
  const pair = (label, value) => {
    ensure(18);
    const y = doc.y;
    doc.font('Helvetica-Bold').fillColor(GRAY).fontSize(9).text(label, left, y, { width: 150 });
    doc.font('Helvetica').fillColor('#111827').fontSize(10).text(value || '—', left + 155, y, { width: width - 155 });
    doc.moveDown(0.25);
  };

  /** Tabela simples com quebra de página e cabeçalho repetido. */
  const table = (columns, rows) => {
    const drawHeader = () => {
      // Cabeçalho nunca fica sozinho no pé da página: exige espaço para ele e ao menos uma linha.
      ensure(56);
      const y = doc.y;
      doc.rect(left, y, width, 18).fill(BLUE);
      let x = left;
      for (const c of columns) {
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8).text(c.label, x + 4, y + 5, { width: c.width - 8, align: c.align || 'left' });
        x += c.width;
      }
      doc.y = y + 18;
    };
    drawHeader();
    rows.forEach((row, index) => {
      doc.font('Helvetica').fontSize(8);
      const heights = columns.map((c) => doc.heightOfString(String(row[c.key] ?? '—'), { width: c.width - 8 }));
      const h = Math.max(16, ...heights.map((v) => v + 8));
      if (doc.y + h > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (index % 2) doc.rect(left, y, width, h).fill('#F8FAFC');
      let x = left;
      for (const c of columns) {
        if (c.swatch && row[c.swatch]) doc.rect(x + 4, y + 5, 6, 6).fill(row[c.swatch]);
        doc.fillColor('#111827').font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(String(row[c.key] ?? '—'), x + (c.swatch ? 13 : 4), y + 4, { width: c.width - (c.swatch ? 17 : 8), align: c.align || 'left' });
        x += c.width;
      }
      doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(0.5).strokeColor(LIGHT).stroke();
      doc.y = y + h;
    });
    doc.moveDown(0.5);
  };

  const r = data.result;

  // ---- capa / identificação
  if (fs.existsSync(LOGO)) doc.image(LOGO, left, 40, { height: 42 });
  doc.y = 100;
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(20).text('Relatório de auditoria', left, doc.y, { width });
  doc.fillColor(GRAY).font('Helvetica').fontSize(11).text('Programa ESG FIEMS · resultado aprovado pelo supervisor', { width });
  doc.moveDown(1);

  heading('1. Identificação e escopo da organização');
  pair('Razão social', data.company.legalName);
  pair('Nome fantasia', data.company.bussinessName);
  pair('CNPJ', cnpj(data.company.cnpj));
  pair('Porte', SIZE[data.company.size] || data.company.size);
  pair('Escopo avaliado', `Caderno Geral + Caderno Setorial ${data.report.section} — ${data.sectionName || ''}`.trim());

  heading('2. Programa, ciclo e datas');
  pair('Ciclo / rodada', `Ciclo ${data.report.cycle} · rodada ${data.publication.round}`);
  pair('Período de referência', `${day(data.report.initialYear)} a ${day(data.report.finalYear)}`);
  pair('Versão do catálogo', data.report.catalogVersion);
  pair('Regra de cálculo', `${r.ruleVersion} · ${r.policy?.label || r.policy?.id}${r.policy?.status === 'pending-ratification' ? ' (política pendente de ratificação)' : ''}`);
  pair('Liberação para auditoria', day(data.report.auditReleasedAt));
  pair('Conclusão do auditor', day(data.report.auditoryEnd));
  pair('Aprovação do supervisor', day(data.publication.approvedAt));

  heading('3. Equipe');
  pair('Auditor(es)', data.team.AUDITOR.join(', '));
  pair('Supervisor(es)', data.team.SUPERVISOR.join(', '));
  pair('Consultoria', data.team.CONSULTOR.join(', '));

  heading('4. Resultados por eixo');
  table(
    [
      { key: 'axis', label: 'Eixo', width: 120, bold: true },
      { key: 'points', label: 'Pontos', width: 80, align: 'right' },
      { key: 'max', label: 'Máximo aplicável', width: 110, align: 'right' },
      { key: 'pct', label: 'Percentual', width: 95, align: 'right' },
      { key: 'band', label: 'Faixa', width: width - 405, align: 'center' },
    ],
    ['E', 'S', 'G'].map((k) => {
      const a = r.axes?.[k] || {};
      return { axis: AXIS[k], points: a.points ?? '—', max: a.max ?? '—', pct: percent(a.percentage), band: a.band || 'sem faixa' };
    }),
  );
  pair('Rating (E · S · G)', r.ratingValid ? r.rating : 'sem classificação válida');

  heading('5. Elegibilidade');
  ensure(30);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(r.eligible ? '#166534' : '#991B1B').text(r.eligible ? 'Elegível à certificação' : 'Não elegível à certificação', { width });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Rating matemático e elegibilidade são verificações separadas: requisito obrigatório não atendido impede a certificação mesmo com pontuação alta.', { width });
  doc.moveDown(0.4);
  if ((r.impediments || []).length) {
    for (const imp of r.impediments) {
      ensure(20);
      doc.fillColor('#111827').fontSize(9).text(`• ${imp.detail || imp.kind}`, { width });
    }
  } else doc.fillColor('#111827').fontSize(9).text('Nenhum impedimento registrado.', { width });

  heading('6. Indicadores e enquadramentos');
  table(
    [
      { key: 'code', label: 'Código', width: 54, bold: true },
      { key: 'title', label: 'Indicador', width: 150 },
      { key: 'axis', label: 'Eixo', width: 32, align: 'center' },
      { key: 'declared', label: 'Declarado', width: 82, swatch: 'declaredColor' },
      { key: 'audited', label: 'Auditado', width: 82, swatch: 'auditedColor' },
      { key: 'points', label: 'Pontos', width: 46, align: 'right' },
      { key: 'mandatory', label: 'Mínimo', width: width - 446 },
    ],
    data.items.map((i) => ({
      code: i.code,
      title: i.title,
      axis: i.axis,
      declared: levelName(i.declaredLevel) || (i.na?.requested ? 'pedido de NA' : '—'),
      declaredColor: i.declaredLevel ? presentation.officialColor(i.declaredLevel) : null,
      audited: i.na?.decision === 'accepted' ? 'não se aplica' : i.auditConclusion === 'not-met' ? 'não atendido' : levelName(i.auditedLevel) || '—',
      auditedColor: i.auditedLevel ? presentation.officialColor(i.auditedLevel) : null,
      points: i.na?.decision === 'accepted' ? '—' : i.auditedPoints ?? (i.auditConclusion === 'not-met' ? 0 : '—'),
      mandatory: i.mandatory ? levelName(i.minimumLevel) || 'sim' : '—',
    })),
  );

  heading('7. Decisões de aplicabilidade ("não se aplica")');
  if (!data.naDecisions.length) doc.fontSize(9).fillColor('#111827').text('Nenhum pedido de "não se aplica" neste ciclo.', { width });
  else
    table(
      [
        { key: 'code', label: 'Código', width: 60, bold: true },
        { key: 'decision', label: 'Decisão', width: 70 },
        { key: 'justification', label: 'Pedido da empresa', width: (width - 130) / 2 },
        { key: 'reason', label: 'Fundamento do auditor', width: (width - 130) / 2 },
      ],
      data.naDecisions,
    );

  heading('8. Constatações');
  if (!data.findings.length) doc.fontSize(9).fillColor('#111827').text('Nenhuma constatação de auditoria registrada.', { width });
  else
    table(
      [
        { key: 'code', label: 'Indicador', width: 70, bold: true },
        { key: 'description', label: 'Constatação', width: width - 160 },
        { key: 'status', label: 'Situação', width: 90 },
      ],
      data.findings,
    );

  heading('9. Conclusão');
  ensure(60);
  doc
    .fontSize(10)
    .fillColor('#111827')
    .text(
      `O trabalho do auditor sobre o ciclo ${data.report.cycle} de ${data.company.bussinessName} foi aprovado pelo supervisor em ${day(
        data.publication.approvedAt,
      )}. ${r.ratingValid ? `Rating calculado: ${r.rating}.` : 'Não houve classificação válida.'} ${
        r.eligible ? 'A avaliação é elegível à certificação.' : 'A avaliação não é elegível à certificação; os impedimentos estão listados na seção 5.'
      }`,
      { width, align: 'justify' },
    );

  // ---- rodapé em todas as páginas
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 40;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(7)
      .fillColor(GRAY)
      .text(
        `Documento gerado automaticamente a partir dos registros da plataforma · estrutura ${TEMPLATE_VERSION} · modelo oficial pendente de aprovação · publicação ${data.publication.id}`,
        left,
        bottom,
        { width: width - 60 },
      );
    doc.text(`${i + 1}/${range.count}`, left + width - 50, bottom, { width: 50, align: 'right' });
  }
  return doc;
}

/** Escreve o PDF em `target` (arquivo temporário + renomeação: nunca fica um PDF pela metade). */
function write(data, target) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.part`;
    const out = fs.createWriteStream(temp);
    out.on('error', reject);
    out.on('finish', () => {
      try {
        fs.renameSync(temp, target);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    try {
      const doc = build(data);
      doc.pipe(out);
      doc.end();
    } catch (err) {
      out.destroy();
      fs.rmSync(temp, { force: true });
      reject(err);
    }
  });
}

module.exports = { TEMPLATE_VERSION, write, build };
