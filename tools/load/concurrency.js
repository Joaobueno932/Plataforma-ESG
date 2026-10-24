// Concorrência e integridade (seção 6) e permissões sob acesso simultâneo (seção 7).
// Cada cenário dispara requisições simultâneas e confere o estado final no servidor.
//   node tools/load/concurrency.js            (usa as empresas carga-051…carga-060)
const fs = require('node:fs');
const path = require('node:path');
const { api, login, usersOf, company, toAwaitingSupervisor, massa } = require('./lib');

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name} — ${detail}`);
};
const burst = (n, fn) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
const statusCount = (list) => list.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
const PDF = Buffer.from('%PDF-1.4\n% concorrência\n%%EOF\n');

(async () => {
  const A = 'carga-051';
  const B = 'carga-052';
  const C = 'carga-053';
  const D = 'carga-054';
  const gestorA = await login(usersOf(A, 'MANAGER')[0].email);
  const colabA = await login(usersOf(A, 'EMPLOYEE')[0].email);
  const itemsA = (await api(gestorA, 'GET', `/reports/company/questions/${company(A).reportId}`)).body;
  const target = itemsA.find((i) => i.answerState !== 'submitted') || itemsA[1];

  // 1. Duas (vinte) pessoas alterando a mesma resposta ao mesmo tempo.
  const fresh = (await api(gestorA, 'GET', `/reports/questionReports/${target.id}`)).body;
  const writes = await burst(20, (i) =>
    api(i % 2 ? colabA : gestorA, 'PATCH', `/reports/questionReports/${target.id}/draft`, { body: { answerText: `escrita-${i}`, expectedLockVersion: fresh.lockVersion } }),
  );
  const winners = writes.filter((r) => r.status === 200);
  const final = (await api(gestorA, 'GET', `/reports/questionReports/${target.id}`)).body;
  check(
    'mesma resposta, 20 escritas simultâneas com a mesma versão',
    winners.length === 1 && writes.every((r) => [200, 403, 409].includes(r.status)) && final.answerText === winners[0]?.body.answerText,
    `status ${JSON.stringify(statusCount(writes))}; texto final = vencedor: ${final.answerText === winners[0]?.body.answerText}`,
  );

  // 2. Tela antiga depois da mudança de versão.
  const stale = await api(gestorA, 'PATCH', `/reports/questionReports/${target.id}/draft`, { body: { answerText: 'tela antiga', expectedLockVersion: fresh.lockVersion } });
  check('salvar em tela antiga depois da mudança de versão', stale.status === 409, `status ${stale.status}`);

  // 3. Cliques duplicados e repetição após timeout: envio repetido não cria versões a mais.
  const withLevel = (await api(gestorA, 'GET', `/reports/questionReports/${target.id}`)).body;
  await api(gestorA, 'PATCH', `/reports/questionReports/${target.id}/draft`, { body: { answerId: withLevel.question.answers[0].id, expectedLockVersion: withLevel.lockVersion } });
  const before = (await api(gestorA, 'GET', `/reports/questionReports/${target.id}`)).body;
  const submits = await burst(10, () => api(gestorA, 'POST', `/reports/questionReports/${target.id}/submit`, { body: {} }));
  const after = (await api(gestorA, 'GET', `/reports/questionReports/${target.id}`)).body;
  check(
    'envio repetido 10× simultâneo',
    after.answerVersion === before.answerVersion + 1 && submits.every((r) => [201, 409].includes(r.status)),
    `versão ${before.answerVersion}→${after.answerVersion}; status ${JSON.stringify(statusCount(submits))}`,
  );

  // 4. Remoção de evidência enquanto outra requisição a usa (envio).
  const form = new FormData();
  form.append('companyId', A);
  form.append('file', new Blob([PDF]), `concorrencia-${Date.now()}.pdf`);
  const up = await api(gestorA, 'POST', '/uploads/companyFile', { form });
  const other = itemsA.find((i) => i.id !== target.id && i.answerState !== 'submitted') || itemsA[3];
  const linked = await api(gestorA, 'PATCH', `/reports/questionReports/${other.id}/draft`, { body: { fileIds: [up.body.id], answerId: other.question.answers[0].id } });
  const [detach, submit] = await Promise.all([
    api(gestorA, 'PATCH', `/reports/questionReports/${other.id}/draft`, { body: { removeFileIds: [up.body.id] } }),
    api(gestorA, 'POST', `/reports/questionReports/${other.id}/submit`, { body: {} }),
  ]);
  const hist = (await api(gestorA, 'GET', `/reports/questionReports/${other.id}/history`)).body;
  const lastSubmit = [...hist.versions].reverse().find((v) => v.snapshotReason === 'submit');
  const nowLinked = hist.files.some((f) => f.fileId === up.body.id && !f.removedAt);
  check(
    'remoção de evidência concorrendo com o envio',
    linked.status === 200 && [200, 409].includes(detach.status) && [201, 409].includes(submit.status) && lastSubmit !== undefined,
    `desvincular ${detach.status}, enviar ${submit.status}; versão enviada guarda ${lastSubmit?.files.length ?? 0} arquivo(s); vínculo atual ${nowLinked ? 'ativo' : 'removido'} (sem 5xx)`,
  );

  // 5. Envio duplicado do mesmo arquivo (mesmo nome) ao mesmo tempo.
  const name = `duplicado-${Date.now()}.pdf`;
  const ups = await burst(8, () => {
    const f = new FormData();
    f.append('companyId', A);
    f.append('file', new Blob([PDF]), name);
    return api(gestorA, 'POST', '/uploads/companyFile', { form: f });
  });
  const winner = ups.find((r) => r.status === 201);
  const stored = winner ? await api(gestorA, 'GET', `/${winner.body.url}`, { raw: true }) : null;
  check(
    'mesmo arquivo enviado 8× simultâneo',
    ups.filter((r) => r.status === 201).length === 1 && ups.every((r) => [201, 409].includes(r.status)) && stored?.status === 200 && stored.body.equals(PDF),
    `status ${JSON.stringify(statusCount(ups))}; arquivo do vencedor íntegro no download: ${stored?.status === 200 && stored.body.equals(PDF)}`,
  );

  // 6. Liberação concorrendo com edição: depois, nenhum item pode ficar em rascunho num ciclo em auditoria.
  const gestorB = await login(usersOf(B, 'MANAGER')[0].email);
  const admin = await login('admin@carga.invalid');
  const consultorB = await login(usersOf(B, 'CONSULTOR')[0].email);
  const itemsB = (await api(gestorB, 'GET', `/reports/company/questions/${company(B).reportId}`)).body;
  for (const item of itemsB.filter((i) => !(i.answerState === 'submitted' && /^Approved/.test(i.status)))) {
    const top = item.question.answers.reduce((a, b) => (b.points > a.points ? b : a));
    await api(gestorB, 'PATCH', `/reports/answerQuestion/${item.id}`, { body: { answerId: top.id } });
    await api(consultorB, 'POST', `/reports/validateanswer/${item.id}`, { body: { veredict: true } });
  }
  await api(gestorB, 'POST', `/reports/requestAudit/${B}`);
  const [release, ...edits] = await Promise.all([
    api(admin, 'POST', `/reports/releaseAudit/${B}`),
    ...itemsB.slice(0, 6).map((i) => api(gestorB, 'PATCH', `/reports/questionReports/${i.id}/draft`, { body: { answerText: 'editando durante a liberação' } })),
  ]);
  const afterB = (await api(gestorB, 'GET', `/reports/company/questions/${company(B).reportId}`)).body;
  const wf = (await api(admin, 'GET', `/reports/${company(B).reportId}/workflow`)).body;
  const consistent = wf.status === 'Auditing' ? afterB.every((i) => i.answerState === 'submitted') : afterB.some((i) => i.answerState === 'draft');
  check('liberação concorrendo com edição', consistent, `liberação ${release.status}; edições ${JSON.stringify(statusCount(edits))}; ciclo ${wf.status}; estado coerente`);

  // 7. Retorno concorrendo com avaliação do auditor.
  if (wf.status !== 'Auditing') await api(admin, 'POST', `/reports/releaseAudit/${B}`);
  const auditorB = await login(usersOf(B, 'AUDITOR')[0].email);
  const audit = (await api(auditorB, 'GET', `/reports/company/questions/${company(B).reportId}`)).body;
  const [ret, ...evals] = await Promise.all([
    api(consultorB, 'POST', `/reports/return/${B}`, { body: { reason: 'retorno concorrente' } }),
    ...audit.slice(0, 8).map((i) => api(auditorB, 'POST', `/auditory/evaluatequestion/${i.id}`, { body: { status: 'Approved', redflag: 'concorrente' } })),
  ]);
  const afterRet = (await api(auditorB, 'GET', `/reports/company/questions/${company(B).reportId}`)).body;
  const evaluated = evals.filter((r) => r.status === 201).length;
  const keptValid = afterRet.filter((i) => i.audit?.valid).length;
  check(
    'retorno concorrendo com avaliação do auditor',
    ret.status === 201 && evals.every((r) => [201, 403].includes(r.status)) && keptValid === evaluated,
    `retorno ${ret.status}; avaliações ${JSON.stringify(statusCount(evals))}; decisões gravadas antes do retorno e preservadas: ${keptValid}/${evaluated}`,
  );

  // 8. Aprovação simultânea da mesma auditoria + geração repetida do documento.
  await toAwaitingSupervisor(C);
  const supervisorC = await login(usersOf(C, 'SUPERVISOR')[0].email);
  const approvals = await burst(10, () => api(supervisorC, 'POST', `/auditory/finishAuditory/${C}`));
  const gestorC = await login(usersOf(C, 'MANAGER')[0].email);
  const history = (await api(gestorC, 'GET', `/reports/${company(C).reportId}/result/history`)).body;
  check(
    'aprovação simultânea 10× da mesma auditoria',
    approvals.filter((r) => r.status === 201).length === 1 && history.length === 1,
    `status ${JSON.stringify(statusCount(approvals))}; resultados gravados ${history.length}`,
  );
  const pubs = await burst(15, () => api(gestorC, 'GET', `/reports/${company(C).reportId}/publication`));
  const downloads = await burst(10, () => api(gestorC, 'GET', `/reports/${company(C).reportId}/publication/report.pdf`, { raw: true }));
  const shas = new Set(pubs.map((p) => p.body?.report?.sha256));
  const sizes = new Set(downloads.map((d) => d.body?.length));
  check(
    'geração/consulta repetida do relatório',
    pubs.every((p) => p.status === 200) && shas.size === 1 && downloads.every((d) => d.status === 200) && sizes.size === 1,
    `15 consultas e 10 downloads simultâneos; um único documento (hash ${[...shas][0]?.slice(0, 12)}…, ${[...sizes][0]} bytes)`,
  );

  // 9. Alteração de vínculo com a sessão aberta.
  const consultorD = usersOf(D, 'CONSULTOR')[0];
  const tokenD = await login(consultorD.email);
  const okBefore = await api(tokenD, 'GET', `/reports/${company(D).reportId}`);
  const user = (await api(admin, 'GET', `/users/${consultorD.id}`)).body;
  const link = user.links.find((l) => l.companyId === D);
  await api(admin, 'DELETE', `/users/${consultorD.id}/links/${link.id}`);
  const parallel = await burst(10, () => api(tokenD, 'GET', `/reports/${company(D).reportId}`));
  check(
    'vínculo removido com a sessão aberta',
    okBefore.status === 200 && parallel.every((r) => [401, 403].includes(r.status)),
    `antes ${okBefore.status}; depois ${JSON.stringify(statusCount(parallel))}`,
  );
  await api(admin, 'POST', `/users/${consultorD.id}/links`, { body: { companyId: D, role: 'CONSULTOR' } });

  // 10. Isolamento sob acesso simultâneo: troca de identificadores entre empresas.
  const others = massa.companies.filter((c) => c.id !== A).slice(0, 20);
  const cross = await Promise.all(others.flatMap((o) => [api(gestorA, 'GET', `/reports/${o.reportId}`), api(gestorA, 'GET', `/reports/company/questions/${o.reportId}`), api(gestorA, 'GET', `/companies/${o.id}`)]));
  check('troca de identificadores entre empresas (60 requisições simultâneas)', cross.every((r) => r.status === 403), `status ${JSON.stringify(statusCount(cross))}`);
  const colabList = await burst(10, () => api(colabA, 'GET', `/reports/company/questions/${company(A).reportId}`));
  const colabId = usersOf(A, 'EMPLOYEE')[0].id;
  check(
    'colaborador só recebe os seus, sob acesso simultâneo',
    colabList.every((r) => r.status === 200 && r.body.every((i) => i.answerer?.id === colabId)),
    `${colabList[0].body.length} indicador(es) em cada uma das 10 respostas`,
  );

  const outFile = path.join(__dirname, 'out', 'concorrencia.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} cenários corretos`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('erro:', err);
  process.exit(1);
});
