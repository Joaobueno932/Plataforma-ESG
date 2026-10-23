/**
 * Fluxo do ciclo — serviço de domínio único para preenchimento, revisão, liberação, auditoria,
 * retorno e aprovação. As rotas só autorizam e traduzem a requisição; toda transição passa por
 * aqui, com pré-condição, transação, controle de concorrência e evento rastreável.
 *
 * Concorrência
 *   Toda transição abre transação e trava primeiro a linha do ciclo (`SELECT … FOR UPDATE`) e
 *   depois a do indicador. Assim responder, retornar, liberar e aprovar nunca se cruzam: quem
 *   chega depois enxerga o estado já gravado e recebe a resposta de negócio correspondente.
 *   O indicador tem `lockVersion`: o cliente que informar `expectedLockVersion` desatualizado
 *   (tela antiga) recebe 409 em vez de sobrescrever uma rodada nova.
 *
 * Versões
 *   `answerVersion` só avança no **envio**. A revisão (gestor/consultor) e a decisão do auditor
 *   ficam presas à versão analisada (`item_reviews.answerVersion`). Alterar a resposta depois
 *   disso invalida a revisão e a decisão daquela versão — o registro histórico permanece.
 */
const db = require('../db');
const { badRequest, forbidden, conflict, notFound } = require('../http');
const authz = require('../authz');

const CYCLE = { FILLING: 'Pending', AUDITING: 'Auditing', AWAITING_SUPERVISOR: 'AwaitingSupervisor', AUDITED: 'Audited' };
const REVIEW_APPROVED = ['ApprovedByManager', 'ApprovedByConsultor'];
const AUDIT_FINAL = ['Approved', 'Rejected'];
const MAX_TEXT = 5000;

/** Tipos de pendência e quem pode abrir cada um. Prazo vencido não altera pontuação. */
const PENDING_KINDS = {
  'orientacao-consultoria': ['CONSULTOR', 'ADMIN'],
  'falta-resposta': ['MANAGER', 'CONSULTOR', 'ADMIN'],
  'evidencia-solicitada': ['AUDITOR', 'MANAGER', 'CONSULTOR', 'ADMIN'],
  'documento-vencido': ['MANAGER', 'CONSULTOR', 'ADMIN', 'AUDITOR'],
  'constatacao-auditoria': ['AUDITOR'],
};
const PENDING_STATUS = ['aberta', 'em-andamento', 'resolvida', 'cancelada'];

const trim = (value) => String(value ?? '').trim();
const actorOf = (req) => ({ id: req.principal.user.id, role: req.actorRole || null });

/* ------------------------------------------------------------------ travas e leitura */

async function lockCycle(reportId) {
  const report = await db.forUpdate('reports', reportId);
  if (!report) throw notFound("a report with this id wasn't found!");
  return report;
}

async function lockItem(id, expectedLockVersion) {
  const item = await db.forUpdate('question_reports', id);
  if (!item) throw notFound('question report not found');
  if (expectedLockVersion !== undefined && expectedLockVersion !== null && Number(expectedLockVersion) !== item.lockVersion)
    throw conflict(
      'este indicador foi alterado por outra pessoa ou em outra tela desde que você o abriu; recarregue para ver a versão atual antes de salvar',
    );
  return item;
}

/** Atualiza o indicador e avança `lockVersion` (toda escrita invalida telas antigas). */
async function bump(id, fields) {
  const keys = Object.keys(fields);
  await db.run(
    `UPDATE question_reports SET ${keys.map((k) => `${k} = ?`).join(', ')}${keys.length ? ', ' : ''}lockVersion = lockVersion + 1, updatedAt = ? WHERE id = ?`,
    ...keys.map((k) => fields[k]),
    db.now(),
    id,
  );
}

async function bumpCycle(id, fields) {
  const keys = Object.keys(fields);
  await db.run(
    `UPDATE reports SET ${keys.map((k) => `${k} = ?`).join(', ')}${keys.length ? ', ' : ''}lockVersion = lockVersion + 1, updatedAt = ? WHERE id = ?`,
    ...keys.map((k) => fields[k]),
    db.now(),
    id,
  );
}

const activeFileIds = async (itemId) =>
  (await db.all('SELECT fileId FROM question_report_files WHERE questionReportId = ? AND removedAt IS NULL ORDER BY createdAt', itemId)).map(
    (row) => row.fileId,
  );

/** Pedido de "não se aplica" vigente (não retirado) do indicador. */
const currentNa = async (itemId) =>
  db.one('SELECT * FROM na_requests WHERE questionReportId = ? AND withdrawnAt IS NULL ORDER BY requestedAt DESC LIMIT 1', itemId);

function assertFilling(report) {
  if (report.status !== CYCLE.FILLING)
    throw forbidden(
      'o ciclo está bloqueado para edição; a empresa deve solicitar o retorno do processo ao consultor ou à Administração',
    );
}

function assertAuditing(report) {
  if (report.status !== CYCLE.AUDITING)
    throw forbidden(
      report.status === CYCLE.AWAITING_SUPERVISOR
        ? 'a auditoria já foi concluída e aguarda a aprovação do supervisor'
        : 'o relatório não está em auditoria',
    );
}

async function snapshot(item, report, reason) {
  await db.run(
    `INSERT INTO item_answer_versions (id, questionReportId, reportId, round, answerVersion, status, selectedAnswerId, answerText,
                                       nonApplicable, answeredById, answeredByRole, answeredAt, files, snapshotAt, snapshotReason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    db.uuid(),
    item.id,
    report.id,
    report.currentRound || 1,
    item.answerVersion || 0,
    item.status,
    item.selectedAnswerId,
    item.answerText,
    item.nonApplicable ? 1 : 0,
    item.answeredById,
    item.answeredByRole,
    item.answeredAt,
    JSON.stringify(await activeFileIds(item.id)),
    db.now(),
    reason,
  );
}

/** Revisões e decisões ainda válidas de uma versão deixam de valer (o registro fica). */
async function supersede(itemId, reason, { kind = null } = {}) {
  await db.run(
    `UPDATE item_reviews SET supersededAt = ?, supersededReason = ?
      WHERE questionReportId = ? AND supersededAt IS NULL ${kind ? 'AND kind = ?' : ''}`,
    db.now(),
    reason,
    itemId,
    ...(kind ? [kind] : []),
  );
}

async function comment(item, report, kind, body, req, visibility = 'empresa') {
  await db.run(
    `INSERT INTO item_comments (id, questionReportId, reportId, round, kind, body, authorId, authorRole, createdAt, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    db.uuid(),
    item.id,
    report.id,
    report.currentRound || 1,
    kind,
    body,
    req.principal.user.id,
    req.actorRole || null,
    db.now(),
    visibility,
  );
}

/** Arquivo da empresa que pode servir de evidência para o indicador. */
async function assertEvidenceFile(fileId, report) {
  const file = await db.one('SELECT id, kind, visibility FROM company_files WHERE id = ? AND companyId = ?', fileId, report.companyId);
  if (!file) throw badRequest('arquivo não encontrado entre os documentos da empresa');
  if (file.visibility === 'auditoria') throw badRequest('arquivos da auditoria não podem ser anexados pela empresa');
  return file;
}

async function linkFile(item, report, fileId, req) {
  const existing = await db.one(
    'SELECT id FROM question_report_files WHERE questionReportId = ? AND fileId = ? AND removedAt IS NULL',
    item.id,
    fileId,
  );
  if (existing) return false;
  await db.run(
    'INSERT INTO question_report_files (id, questionReportId, fileId, round, addedById, addedByRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    db.uuid(),
    item.id,
    fileId,
    report.currentRound || 1,
    req.principal.user.id,
    req.actorRole || null,
    db.now(),
  );
  return true;
}

/**
 * Alterar o conteúdo de um indicador já enviado volta a resposta para rascunho: a revisão e a
 * decisão de auditoria da versão anterior deixam de valer para a resposta nova.
 */
async function invalidateDecisions(item, reason) {
  if (item.answerState !== 'submitted' && !item.auditedAnswerId && !item.auditConclusion) return false;
  await supersede(item.id, reason);
  return true;
}

/* ------------------------------------------------------------------ preenchimento */

/**
 * Salva rascunho. Não envia para revisão e não conta como resposta: "não respondido" continua
 * não respondido (nunca vira "não conforme").
 *
 * body: { answerId?, answerText?, fileIds?, removeFileIds?, naRequest?: {justification}|null,
 *         expectedLockVersion? }
 */
async function saveDraft(req, itemId, body = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertFilling(report);
    const item = await lockItem(itemId, body.expectedLockVersion);

    let selectedAnswerId = item.selectedAnswerId;
    if (body.answerId !== undefined) {
      if (body.answerId === null || body.answerId === '') selectedAnswerId = null;
      else {
        const answer = await db.one('SELECT id FROM answers WHERE id = ? AND questionId = ?', body.answerId, item.questionId);
        if (!answer) throw badRequest('a alternativa escolhida não pertence a este indicador');
        selectedAnswerId = answer.id;
      }
    }
    let answerText = item.answerText;
    if (body.answerText !== undefined) {
      answerText = body.answerText === null ? null : String(body.answerText);
      if (answerText && answerText.length > MAX_TEXT) throw badRequest(`a justificativa pode ter até ${MAX_TEXT} caracteres`);
    }

    let filesChanged = false;
    for (const fileId of Array.isArray(body.fileIds) ? body.fileIds : []) {
      await assertEvidenceFile(fileId, report);
      if (await linkFile(item, report, fileId, req)) filesChanged = true;
    }
    for (const fileId of Array.isArray(body.removeFileIds) ? body.removeFileIds : []) {
      const removed = await db.run(
        'UPDATE question_report_files SET removedAt = ?, removedById = ? WHERE questionReportId = ? AND fileId = ? AND removedAt IS NULL',
        db.now(),
        req.principal.user.id,
        item.id,
        fileId,
      );
      if (removed.changes) filesChanged = true;
    }

    // Pedido de "não se aplica": registro separado, decidido apenas pelo auditor.
    let naChanged = false;
    const na = await currentNa(item.id);
    if (body.naRequest === null && na && !na.decision) {
      await db.run('UPDATE na_requests SET withdrawnAt = ? WHERE id = ?', db.now(), na.id);
      naChanged = true;
    } else if (body.naRequest && typeof body.naRequest === 'object') {
      const justification = trim(body.naRequest.justification);
      if (justification.length > MAX_TEXT) throw badRequest(`a justificativa pode ter até ${MAX_TEXT} caracteres`);
      if (na && !na.decision && na.round === (report.currentRound || 1)) {
        if (na.justification !== justification) {
          await db.run('UPDATE na_requests SET justification = ? WHERE id = ?', justification, na.id);
          naChanged = true;
        }
      } else {
        await db.run(
          `INSERT INTO na_requests (id, questionReportId, reportId, round, justification, requestedById, requestedByRole, requestedAt, origin)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'empresa')`,
          db.uuid(),
          item.id,
          report.id,
          report.currentRound || 1,
          justification,
          req.principal.user.id,
          req.actorRole || null,
          db.now(),
        );
        naChanged = true;
      }
    }

    const contentChanged =
      selectedAnswerId !== item.selectedAnswerId || (answerText ?? null) !== (item.answerText ?? null) || filesChanged || naChanged;

    const fields = {
      selectedAnswerId,
      answerText,
      answererId: item.answererId || req.principal.user.id,
      draftById: req.principal.user.id,
      draftUpdatedAt: db.now(),
    };
    if (contentChanged || item.answerState === 'empty') {
      fields.answerState = 'draft';
      fields.status = 'Pending';
      fields.reviewedAnswerVersion = null;
      // A decisão do auditor de uma versão anterior não vale para a resposta alterada.
      if (item.auditedAnswerId || item.auditConclusion) {
        fields.auditedAnswerId = null;
        fields.auditConclusion = null;
        fields.auditJustification = null;
      }
      if (item.nonApplicable && naChanged) fields.nonApplicable = 0;
      await invalidateDecisions(item, 'resposta alterada depois da revisão');
    }
    await bump(item.id, fields);
    await authz.audit(req, 'item.draft', {
      entity: 'question_reports',
      entityId: item.id,
      companyId: report.companyId,
      details: { round: report.currentRound || 1, changed: contentChanged, answerVersion: item.answerVersion },
    });
    return item.id;
  });
}

/**
 * Envio da resposta para revisão. Exige alternativa válida **ou** pedido de NA com
 * justificativa e evidência. Cada envio cria uma versão nova (`answerVersion`) e a fotografa.
 */
async function submit(req, itemId, { expectedLockVersion } = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertFilling(report);
    const item = await lockItem(itemId, expectedLockVersion);
    if (item.answerState === 'submitted') return { id: item.id, unchanged: true };

    const na = await currentNa(item.id);
    const naOpen = na && !na.decision;
    const files = await activeFileIds(item.id);
    if (naOpen) {
      if (trim(na.justification).length < 10)
        throw badRequest('o pedido de "não se aplica" precisa de uma justificativa (ao menos 10 caracteres)');
      if (!files.length) throw badRequest('o pedido de "não se aplica" precisa de ao menos uma evidência anexada ao indicador');
      for (const fileId of files)
        await db.run('INSERT IGNORE INTO na_request_files (id, naRequestId, fileId, createdAt) VALUES (?, ?, ?, ?)', db.uuid(), na.id, fileId, db.now());
    } else if (!item.selectedAnswerId) {
      throw badRequest('selecione uma alternativa ou registre um pedido de "não se aplica" antes de enviar');
    }

    const version = (item.answerVersion || 0) + 1;
    const at = db.now();
    await bump(item.id, {
      answerState: 'submitted',
      answerVersion: version,
      status: 'PendingValidationByManager',
      reviewedAnswerVersion: null,
      submittedAt: at,
      submittedById: req.principal.user.id,
      submittedByRole: req.actorRole || null,
      answeredById: req.principal.user.id,
      answeredByRole: req.actorRole || null,
      answeredAt: at,
    });
    const saved = await db.one('SELECT * FROM question_reports WHERE id = ?', item.id);
    await snapshot(saved, report, 'submit');
    await authz.audit(req, 'item.submit', {
      entity: 'question_reports',
      entityId: item.id,
      companyId: report.companyId,
      details: { round: report.currentRound || 1, answerVersion: version, na: !!naOpen },
    });
    return { id: item.id, answerVersion: version };
  });
}

/** Anexa arquivos ao indicador (mesmo bloqueio da resposta). */
async function attach(req, itemId, fileIds) {
  return saveDraft(req, itemId, { fileIds });
}

/** Desvincula um arquivo do indicador. O vínculo é marcado, não apagado: a versão enviada continua íntegra. */
async function detach(req, linkId) {
  const link = await db.one('SELECT * FROM question_report_files WHERE id = ?', linkId);
  if (!link || link.removedAt) throw notFound('file not found');
  await saveDraft(req, link.questionReportId, { removeFileIds: [link.fileId] });
  return link;
}

/**
 * Reabertura administrativa de um indicador durante o preenchimento: a resposta volta a
 * rascunho e a revisão da versão enviada deixa de valer. Durante a auditoria não se aplica —
 * o caminho é o retorno registrado do processo.
 */
async function reopenItem(req, itemId) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertFilling(report);
    const item = await lockItem(itemId);
    await supersede(item.id, 'reaberto pela Administração', { kind: 'review' });
    await bump(item.id, {
      status: 'Pending',
      answerState: item.answerState === 'empty' ? 'empty' : 'draft',
      reviewedAnswerVersion: null,
    });
    await authz.audit(req, 'item.reopen', { entity: 'question_reports', entityId: item.id, companyId: report.companyId });
    return item.id;
  });
}

/* ------------------------------------------------------------------ revisão interna */

/**
 * Revisão do gestor ou do consultor sobre a **versão enviada**. Se o cliente informar
 * `answerVersion` e ela não for a atual, a revisão é recusada (a resposta mudou).
 */
async function review(req, itemId, { veredict, comment: text, answerVersion } = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertFilling(report);
    const item = await lockItem(itemId);
    if (item.answerState !== 'submitted')
      throw conflict('não há resposta enviada para revisar: a resposta está em rascunho ou ainda não foi respondida');
    if (answerVersion !== undefined && answerVersion !== null && Number(answerVersion) !== item.answerVersion)
      throw conflict('a resposta foi alterada depois que você a abriu; revise a versão atual');
    const note = trim(text);
    if (!veredict && !note) throw badRequest('informe um comentário para reprovar');

    await supersede(item.id, 'nova revisão da mesma versão', { kind: 'review' });
    await db.run(
      `INSERT INTO item_reviews (id, questionReportId, reportId, kind, round, answerVersion, decision, comment, reviewedById, reviewedByRole, reviewedAt)
       VALUES (?, ?, ?, 'review', ?, ?, ?, ?, ?, ?, ?)`,
      db.uuid(),
      item.id,
      report.id,
      report.currentRound || 1,
      item.answerVersion,
      veredict ? 'approved' : 'rejected',
      note || null,
      req.principal.user.id,
      req.actorRole,
      db.now(),
    );
    const by = req.actorRole === 'MANAGER' ? 'Manager' : 'Consultor';
    const fields = { status: `${veredict ? 'Approved' : 'Rejected'}By${by}`, reviewedAnswerVersion: veredict ? item.answerVersion : null };
    if (note) Object.assign(fields, { redflag: note, redflag_date: db.now(), redflagIssuerId: req.principal.user.id });
    await bump(item.id, fields);
    if (note) await comment(item, report, 'revisao', note, req);
    await authz.audit(req, 'item.validate', {
      entity: 'question_reports',
      entityId: item.id,
      companyId: report.companyId,
      details: { veredict: !!veredict, answerVersion: item.answerVersion },
    });
    return item.id;
  });
}

/* ------------------------------------------------------------------ liberação */

/** Situação de um indicador para a liberação, com o motivo quando falta algo. */
function releaseBlocker(item) {
  if (AUDIT_FINAL.includes(item.status) && item.auditedAnswerVersion === item.answerVersion && item.answerVersion > 0) return null;
  if (item.answerState !== 'submitted') return item.answerState === 'draft' ? 'resposta em rascunho, não enviada' : 'sem resposta enviada';
  if (!REVIEW_APPROVED.includes(item.status) || item.reviewedAnswerVersion !== item.answerVersion)
    return 'versão atual sem aprovação do gestor ou do consultor';
  return null;
}

/**
 * Liberação operacional para auditoria (Administração FIEMS). Não decide nada técnico:
 * confere os pré-requisitos e **congela** respostas, evidências, catálogo e escopo.
 */
async function releaseAudit(req, reportId) {
  return db.transaction(async () => {
    const report = await lockCycle(reportId);
    if (report.status !== CYCLE.FILLING) throw conflict('o ciclo não está em preenchimento');
    if (!report.auditRequestedAt) throw badRequest('registre a solicitação de auditoria da empresa antes de liberar o processo');

    const professionals = await db.all('SELECT role FROM cycle_professionals WHERE reportId = ? AND revokedAt IS NULL', report.id);
    const missingRoles = ['AUDITOR', 'SUPERVISOR'].filter((role) => !professionals.some((p) => p.role === role));
    if (missingRoles.length)
      throw badRequest(`designe ${missingRoles.map((r) => (r === 'AUDITOR' ? 'o auditor' : 'o supervisor')).join(' e ')} do ciclo antes de liberar`);

    const items = await db.all(
      `SELECT qr.*, q.code FROM question_reports qr JOIN questions q ON q.id = qr.questionId WHERE qr.reportId = ? ORDER BY q.position, q.code`,
      report.id,
    );
    const blockers = items.map((item) => ({ code: item.code, reason: releaseBlocker(item) })).filter((b) => b.reason);
    if (!items.length || blockers.length) {
      const list = blockers.slice(0, 8).map((b) => `${b.code} (${b.reason})`).join('; ');
      throw forbidden(
        `Ainda existem questões que precisam ser aprovadas pelo cosultor. Faltam ${blockers.length} indicador(es): ${list}${blockers.length > 8 ? '…' : ''}`,
      );
    }

    for (const item of items) await snapshot(item, report, 'audit-release');
    await bumpCycle(report.id, {
      status: CYCLE.AUDITING,
      auditoryStart: db.now(),
      auditoryEnd: null,
      auditReleasedAt: db.now(),
      auditReleasedById: req.principal.user.id,
    });
    await db.run(
      `UPDATE question_reports SET status = 'Auditing', lockVersion = lockVersion + 1, updatedAt = ?
        WHERE reportId = ? AND NOT (status IN ('Approved', 'Rejected') AND auditedAnswerVersion <=> answerVersion AND answerVersion > 0)`,
      db.now(),
      report.id,
    );
    await authz.audit(req, 'cycle.auditReleased', {
      entity: 'reports',
      entityId: report.id,
      companyId: report.companyId,
      details: { round: report.currentRound || 1, items: items.length },
    });
    return report.id;
  });
}

/* ------------------------------------------------------------------ auditoria */

/**
 * Enquadramento auditado. Não sobrescreve a resposta da empresa nem assume sua autoria: grava
 * o nível auditado (para cima ou para baixo) ou a conclusão de não atendimento, com
 * justificativa, presos à versão analisada.
 *
 * body: { auditedAnswerId? , conclusion?: 'not-met', justification, evidenceFileIds? }
 */
async function auditDecision(req, itemId, body = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertAuditing(report);
    const item = await lockItem(itemId, body.expectedLockVersion);
    const justification = trim(body.justification);
    if (!justification) throw badRequest('O campo de Observação é obrigátorio');
    if (justification.length > MAX_TEXT) throw badRequest(`a justificativa pode ter até ${MAX_TEXT} caracteres`);

    const na = await currentNa(item.id);
    if (na && !na.decision) throw conflict('decida primeiro o pedido de "não se aplica" deste indicador');
    if (na && na.decision === 'accepted') throw conflict('o "não se aplica" deste indicador já foi aceito; não há nível a enquadrar');

    let auditedAnswerId = null;
    let conclusion;
    if (body.conclusion === 'not-met') conclusion = 'not-met';
    else {
      if (!body.auditedAnswerId) throw badRequest('informe o nível auditado ou a conclusão de não atendimento');
      const answer = await db.one('SELECT id FROM answers WHERE id = ? AND questionId = ?', body.auditedAnswerId, item.questionId);
      if (!answer) throw badRequest('o nível auditado não pertence a este indicador');
      auditedAnswerId = answer.id;
      conclusion = 'level';
    }

    for (const fileId of Array.isArray(body.evidenceFileIds) ? body.evidenceFileIds : []) {
      const file = await db.one("SELECT id, name, url, fileType, sizeBytes FROM company_files WHERE id = ? AND companyId = ?", fileId, report.companyId);
      if (!file) throw badRequest('evidência da auditoria não encontrada');
      await db.run(
        `INSERT INTO evidences (id, questionReportId, name, url, fileType, sizeBytes, round, visibility, addedById, addedByRole, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'restrita', ?, ?, ?)`,
        db.uuid(),
        item.id,
        file.name,
        file.url,
        file.fileType,
        file.sizeBytes,
        report.currentRound || 1,
        req.principal.user.id,
        req.actorRole,
        db.now(),
      );
    }

    await supersede(item.id, 'nova decisão da auditoria', { kind: 'audit' });
    await db.run(
      `INSERT INTO item_reviews (id, questionReportId, reportId, kind, round, answerVersion, decision, auditedAnswerId, conclusion, comment,
                                 reviewedById, reviewedByRole, reviewedAt)
       VALUES (?, ?, ?, 'audit', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      db.uuid(),
      item.id,
      report.id,
      report.currentRound || 1,
      item.answerVersion,
      conclusion === 'not-met' ? 'not-met' : 'assessed',
      auditedAnswerId,
      conclusion,
      justification,
      req.principal.user.id,
      req.actorRole,
      db.now(),
    );
    await bump(item.id, {
      status: conclusion === 'not-met' ? 'Rejected' : 'Approved',
      auditedAnswerId,
      auditConclusion: conclusion,
      auditJustification: justification,
      auditedAnswerVersion: item.answerVersion,
      auditedById: req.principal.user.id,
      auditedByRole: req.actorRole,
      auditedAt: db.now(),
      auditedSource: 'auditor',
    });
    await comment(item, report, 'parecer', justification, req, 'auditoria');
    await authz.audit(req, 'audit.evaluate', {
      entity: 'question_reports',
      entityId: item.id,
      companyId: report.companyId,
      details: { conclusion, auditedAnswerId, answerVersion: item.answerVersion },
    });
    return item.id;
  });
}

/**
 * Pedido de complemento do auditor: registra a pendência e marca o indicador, mas **não**
 * desbloqueia a empresa — só o retorno autorizado reabre a edição.
 */
async function requestComplement(req, itemId, { description, dueDate } = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertAuditing(report);
    const item = await lockItem(itemId);
    const text = trim(description);
    if (!text) throw badRequest('O campo de Observação é obrigátorio');
    await createPendingRow(req, report, item, { kind: 'evidencia-solicitada', description: text, responsibleId: item.answererId, dueDate });
    await db.run(
      `INSERT INTO item_reviews (id, questionReportId, reportId, kind, round, answerVersion, decision, comment, reviewedById, reviewedByRole, reviewedAt)
       VALUES (?, ?, ?, 'audit', ?, ?, 'complement', ?, ?, ?, ?)`,
      db.uuid(),
      item.id,
      report.id,
      report.currentRound || 1,
      item.answerVersion,
      text,
      req.principal.user.id,
      req.actorRole,
      db.now(),
    );
    await bump(item.id, { status: 'PendingRevision', redflag: text, redflag_date: db.now(), redflagIssuerId: req.principal.user.id });
    await authz.audit(req, 'audit.complement', { entity: 'question_reports', entityId: item.id, companyId: report.companyId, details: { unlocked: false } });
    return item.id;
  });
}

/**
 * Decisão do auditor sobre o pedido de "não se aplica". A recusa mantém o indicador no
 * cálculo e exige depois o enquadramento (ou a conclusão de não atendimento).
 */
async function decideNa(req, itemId, { decision, reason } = {}) {
  return db.transaction(async () => {
    const { report: loaded } = await loadIds(itemId);
    const report = await lockCycle(loaded.id);
    assertAuditing(report);
    const item = await lockItem(itemId);
    if (!['accepted', 'refused'].includes(decision)) throw badRequest('informe a decisão: accepted (aceito) ou refused (recusado)');
    const text = trim(reason);
    if (!text) throw badRequest('registre o fundamento da decisão sobre o "não se aplica"');
    const na = await currentNa(item.id);
    if (!na || na.decision) throw conflict('não há pedido de "não se aplica" pendente para este indicador');

    await db.run(
      'UPDATE na_requests SET decision = ?, decisionReason = ?, decidedById = ?, decidedByRole = ?, decidedAt = ? WHERE id = ?',
      decision,
      text,
      req.principal.user.id,
      req.actorRole,
      db.now(),
      na.id,
    );
    await db.run(
      `INSERT INTO item_reviews (id, questionReportId, reportId, kind, round, answerVersion, decision, comment, reviewedById, reviewedByRole, reviewedAt)
       VALUES (?, ?, ?, 'audit', ?, ?, ?, ?, ?, ?, ?)`,
      db.uuid(),
      item.id,
      report.id,
      report.currentRound || 1,
      item.answerVersion,
      decision === 'accepted' ? 'na-accepted' : 'na-refused',
      text,
      req.principal.user.id,
      req.actorRole,
      db.now(),
    );
    if (decision === 'accepted')
      await bump(item.id, {
        nonApplicable: 1,
        status: 'Approved',
        auditedAnswerId: null,
        auditConclusion: null,
        auditJustification: text,
        auditedAnswerVersion: item.answerVersion,
        auditedById: req.principal.user.id,
        auditedByRole: req.actorRole,
        auditedAt: db.now(),
        auditedSource: 'na-aceita',
      });
    else await bump(item.id, { nonApplicable: 0, status: 'Auditing' });
    await comment(item, report, 'parecer', text, req, 'auditoria');
    await authz.audit(req, 'audit.applicability', { entity: 'question_reports', entityId: item.id, companyId: report.companyId, details: { decision } });
    return item.id;
  });
}

/** O indicador tem decisão válida da auditoria para a versão atual? */
function hasValidAuditDecision(item) {
  if (item.auditedAnswerVersion !== item.answerVersion) return false;
  if (item.auditedSource === 'na-aceita' && item.nonApplicable) return true;
  return AUDIT_FINAL.includes(item.status) && (!!item.auditedAnswerId || item.auditConclusion === 'not-met');
}

async function auditBlockers(report) {
  const items = await db.all(
    `SELECT qr.*, q.code FROM question_reports qr JOIN questions q ON q.id = qr.questionId WHERE qr.reportId = ? ORDER BY q.position, q.code`,
    report.id,
  );
  const openNa = new Set(
    (await db.all('SELECT questionReportId FROM na_requests WHERE reportId = ? AND withdrawnAt IS NULL AND decision IS NULL', report.id)).map(
      (row) => row.questionReportId,
    ),
  );
  return items
    .map((item) => {
      if (openNa.has(item.id)) return { code: item.code, reason: 'pedido de "não se aplica" sem decisão' };
      if (item.status === 'PendingRevision') return { code: item.code, reason: 'complemento solicitado sem decisão final' };
      if (!hasValidAuditDecision(item)) return { code: item.code, reason: 'sem enquadramento auditado da versão enviada' };
      return null;
    })
    .filter(Boolean);
}

/** Auditor conclui: todas as decisões válidas → aguardando aprovação do supervisor. */
async function concludeAudit(req, reportId) {
  return db.transaction(async () => {
    const report = await lockCycle(reportId);
    assertAuditing(report);
    const blockers = await auditBlockers(report);
    if (blockers.length)
      throw forbidden(
        `todos os indicadores precisam ser avaliados antes de submeter. Faltam ${blockers.length}: ${blockers
          .slice(0, 8)
          .map((b) => `${b.code} (${b.reason})`)
          .join('; ')}`,
      );
    await bumpCycle(report.id, { status: CYCLE.AWAITING_SUPERVISOR, auditoryEnd: db.now() });
    await authz.audit(req, 'audit.concluded', { entity: 'reports', entityId: report.id, companyId: report.companyId, details: { round: report.currentRound || 1 } });
    return report.id;
  });
}

/**
 * Aprovação do supervisor: consulta e aprova o trabalho concluído pelo auditor. Não altera
 * níveis, não decide NA e não devolve o processo. Grava o resultado (motor único) e dispara a
 * liberação final (`onApproved`, contrato da publicação).
 */
async function approve(req, reportId, { onApproved = null } = {}) {
  return db.transaction(async () => {
    const report = await lockCycle(reportId);
    if (report.status === CYCLE.AUDITED) throw conflict('esta auditoria já foi aprovada pelo supervisor');
    if (report.status !== CYCLE.AWAITING_SUPERVISOR)
      throw forbidden('todos os indicadores precisam estar aprovados ou rejeitados e a auditoria concluída pelo auditor');
    const blockers = await auditBlockers(report);
    if (blockers.length) throw conflict('há indicadores sem decisão válida da auditoria; o auditor precisa revisar antes da aprovação');

    await bumpCycle(report.id, { status: CYCLE.AUDITED, auditoryEnd: report.auditoryEnd || db.now() });
    const scoring = require('../scoring');
    const stored = await scoring.persistResult(report.id, { mode: 'audited', computedById: req.principal.user.id });
    await db.run('UPDATE reports SET evaluation = ? WHERE id = ?', stored.result.rating, report.id);
    await authz.audit(req, 'supervision.approved', {
      entity: 'reports',
      entityId: report.id,
      companyId: report.companyId,
      details: {
        round: report.currentRound || 1,
        ruleVersion: stored.result.ruleVersion,
        policy: stored.result.policy.id,
        rating: stored.result.rating,
        eligible: stored.result.eligible,
        impediments: stored.result.impediments.map((impediment) => impediment.kind),
      },
    });
    const publication = onApproved ? await onApproved({ report, stored, req }) : null;
    return { reportId: report.id, stored, publication };
  });
}

/* ------------------------------------------------------------------ retorno */

/**
 * Retorno autorizado (consultor ou Administração). Fotografa o que foi enviado, abre nova
 * rodada e devolve a edição à empresa. Decisões da auditoria sobre versões que não mudarem
 * continuam valendo; as de indicadores alterados deixam de valer no momento da alteração.
 */
async function returnCycle(req, reportId, { reason, items: affected } = {}) {
  return db.transaction(async () => {
    const report = await lockCycle(reportId);
    if (report.status === CYCLE.FILLING) throw conflict('o ciclo já está em preenchimento');
    if (report.status === CYCLE.AUDITED)
      throw conflict('o ciclo já foi aprovado; correções de um ciclo concluído geram revisão identificada, não retorno');
    const text = trim(reason);
    if (!text) throw badRequest('registre o motivo do retorno');

    const all = await db.all('SELECT * FROM question_reports WHERE reportId = ?', report.id);
    const affectedIds = Array.isArray(affected) && affected.length
      ? affected.filter((id) => all.some((item) => item.id === id))
      : all.filter((item) => !hasValidAuditDecision(item)).map((item) => item.id);

    for (const item of all) await snapshot(item, report, 'return');
    const round = (report.currentRound || 1) + 1;
    await db.run('UPDATE cycle_rounds SET closedAt = ? WHERE reportId = ? AND round = ? AND closedAt IS NULL', db.now(), report.id, report.currentRound || 1);
    await db.run(
      'INSERT INTO cycle_rounds (id, reportId, round, openedAt, openedById, openedByRole, reason, affectedItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      db.uuid(),
      report.id,
      round,
      db.now(),
      req.principal.user.id,
      req.actorRole,
      text,
      JSON.stringify(affectedIds),
    );
    await bumpCycle(report.id, { status: CYCLE.FILLING, currentRound: round, auditoryEnd: null });

    // Indicadores sem decisão válida voltam ao estado de revisão registrado na liberação.
    for (const item of all) {
      if (hasValidAuditDecision(item)) continue;
      const released = await db.one(
        `SELECT status FROM item_answer_versions WHERE questionReportId = ? AND snapshotReason = 'audit-release'
          ORDER BY round DESC, snapshotAt DESC LIMIT 1`,
        item.id,
      );
      const restored = released && REVIEW_APPROVED.concat(['PendingValidationByManager']).includes(released.status)
        ? released.status
        : 'PendingValidationByManager';
      await bump(item.id, { status: restored, round });
    }
    await authz.audit(req, 'cycle.returned', {
      entity: 'reports',
      entityId: report.id,
      companyId: report.companyId,
      details: { reason: text, round, affectedItems: affectedIds.length },
    });
    return { reportId: report.id, round, affectedItems: affectedIds };
  });
}

/* ------------------------------------------------------------------ pendências */

async function createPendingRow(req, report, item, { kind, description, responsibleId = null, dueDate = null }) {
  let due = null;
  if (dueDate) {
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) throw badRequest('prazo inválido');
    due = parsed.toISOString();
  }
  const id = db.uuid();
  await db.run(
    `INSERT INTO pendings (id, reportId, questionReportId, round, kind, description, responsibleId, dueDate, status, createdById, createdByRole, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta', ?, ?, ?)`,
    id,
    report.id,
    item ? item.id : null,
    report.currentRound || 1,
    kind,
    description,
    responsibleId,
    due,
    req.principal.user.id,
    req.actorRole,
    db.now(),
  );
  await db.run(
    'INSERT INTO pending_events (id, pendingId, at, actorId, actorRole, action, toStatus, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    db.uuid(),
    id,
    db.now(),
    req.principal.user.id,
    req.actorRole,
    'created',
    'aberta',
    description.slice(0, 500),
  );
  return id;
}

/** Abre pendência. O tipo define quem pode abrir; pendência nunca altera pontuação. */
async function createPending(req, report, body = {}) {
  const kind = trim(body.kind);
  if (!PENDING_KINDS[kind]) throw badRequest(`tipo de pendência inválido; use: ${Object.keys(PENDING_KINDS).join(', ')}`);
  if (!PENDING_KINDS[kind].includes(req.actorRole)) throw forbidden(`seu perfil não abre pendências do tipo ${kind}`);
  const description = trim(body.description);
  if (!description) throw badRequest('descreva a pendência');
  if (description.length > MAX_TEXT) throw badRequest(`a descrição pode ter até ${MAX_TEXT} caracteres`);
  let item = null;
  if (body.questionReportId) {
    item = await db.one('SELECT * FROM question_reports WHERE id = ? AND reportId = ?', body.questionReportId, report.id);
    if (!item) throw badRequest('o indicador informado não pertence a este ciclo');
  }
  let responsibleId = body.responsibleId || (item ? item.answererId : null);
  if (responsibleId) {
    const link = await db.one(
      'SELECT id FROM user_company_links WHERE userId = ? AND companyId = ? AND revokedAt IS NULL',
      responsibleId,
      report.companyId,
    );
    if (!link) throw badRequest('o responsável precisa ter vínculo vigente com a empresa');
  }
  return db.transaction(async () => createPendingRow(req, report, item, { kind, description, responsibleId, dueDate: body.dueDate }));
}

/**
 * Atualiza a situação. Pendência da auditoria só é encerrada pela auditoria; as demais, por
 * quem abriu, pelo responsável ou pela gestão/consultoria/Administração da empresa.
 */
async function updatePending(req, pendingId, { status, note } = {}) {
  return db.transaction(async () => {
    const pending = await db.forUpdate('pendings', pendingId);
    if (!pending) throw notFound('pendência não encontrada');
    if (!PENDING_STATUS.includes(status)) throw badRequest(`situação inválida; use: ${PENDING_STATUS.join(', ')}`);
    if (['resolvida', 'cancelada'].includes(pending.status)) throw conflict('esta pendência já foi encerrada');
    const role = req.actorRole;
    const closing = ['resolvida', 'cancelada'].includes(status);
    const auditOwned = ['constatacao-auditoria', 'evidencia-solicitada'].includes(pending.kind) && pending.createdByRole === 'AUDITOR';
    if (closing && auditOwned && role !== 'AUDITOR') throw forbidden('somente a auditoria encerra uma pendência aberta por ela');
    if (!closing || !auditOwned) {
      const allowed =
        pending.createdById === req.principal.user.id ||
        pending.responsibleId === req.principal.user.id ||
        ['MANAGER', 'CONSULTOR', 'ADMIN', 'AUDITOR'].includes(role);
      if (!allowed) throw forbidden('você não pode alterar esta pendência');
    }
    await db.run(
      'UPDATE pendings SET status = ?, closedAt = ?, closedById = ?, closingNote = ? WHERE id = ?',
      status,
      closing ? db.now() : null,
      closing ? req.principal.user.id : null,
      closing ? trim(note) || null : pending.closingNote,
      pending.id,
    );
    await db.run(
      'INSERT INTO pending_events (id, pendingId, at, actorId, actorRole, action, fromStatus, toStatus, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      db.uuid(),
      pending.id,
      db.now(),
      req.principal.user.id,
      role,
      'status',
      pending.status,
      status,
      trim(note).slice(0, 500) || null,
    );
    return pending.id;
  });
}

/* ------------------------------------------------------------------ apoio */

async function loadIds(itemId) {
  const item = await db.one('SELECT id, reportId FROM question_reports WHERE id = ?', itemId);
  if (!item) throw notFound('question report not found');
  return { item, report: { id: item.reportId } };
}

module.exports = {
  CYCLE,
  REVIEW_APPROVED,
  AUDIT_FINAL,
  PENDING_KINDS,
  PENDING_STATUS,
  saveDraft,
  submit,
  attach,
  detach,
  reopenItem,
  review,
  releaseAudit,
  releaseBlocker,
  auditDecision,
  requestComplement,
  decideNa,
  concludeAudit,
  approve,
  returnCycle,
  createPending,
  updatePending,
  hasValidAuditDecision,
  auditBlockers,
};
