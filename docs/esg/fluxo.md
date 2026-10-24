# Fluxo do ciclo — respostas, evidências e auditoria

Implementação: `backend/src/workflow/index.js` (serviço de domínio único). As rotas em
`backend/src/routes/reports.js` só autorizam e traduzem a requisição. Testes:
`backend/test/workflow.test.js` e `backend/test/pendings.test.js`.

## Estados do ciclo

| Estado | Quem leva até ele | O que vale nele |
|---|---|---|
| `Pending` (preenchimento) | abertura do ciclo; retorno autorizado | empresa, consultor e Administração respondem, anexam e revisam |
| `Auditing` (em auditoria) | Administração FIEMS — `POST /reports/releaseAudit/:companyId` | respostas, evidências, catálogo e escopo **congelados**; só o auditor designado trabalha |
| `AwaitingSupervisor` | auditor designado — `POST /auditory/submitToSupervisor/:companyId` | nada muda; supervisor consulta e aprova |
| `Audited` | supervisor designado — `POST /auditory/finishAuditory/:companyId` | resultado gravado com a versão da regra; dispara a liberação final (contrato de publicação) |

Retorno (`POST /reports/return/:companyId`, consultor ou Administração) leva `Auditing` ou
`AwaitingSupervisor` de volta a `Pending`, em nova rodada. Ciclo `Audited` não volta por retorno:
correção de ciclo concluído é revisão identificada (etapa de publicação).

## Estados do indicador

| Campo | Significado |
|---|---|
| `answerState` | `empty` (nunca respondido), `draft` (rascunho salvo, não enviado), `submitted` (versão enviada) |
| `answerVersion` | número da versão enviada; só avança no envio |
| `reviewedAnswerVersion` | versão aprovada pelo gestor/consultor; a aprovação só vale se for igual a `answerVersion` |
| `auditedAnswerVersion` | versão sobre a qual o auditor decidiu; a decisão só vale se for igual a `answerVersion` |
| `lockVersion` | controle de concorrência; o cliente que informar `expectedLockVersion` antigo recebe 409 |
| `status` | rótulo herdado (`Pending`, `PendingValidationByManager`, `Approved/RejectedByManager|Consultor`, `Auditing`, `PendingRevision`, `Approved`, `Rejected`) mantido para a interface |

"Não respondido" nunca vira "não conforme": rascunho e item vazio não contam como declaração
no autodiagnóstico, e no resultado auditado aparecem como falta de decisão, com o motivo.

## Transições e regras

| Ação | Rota | Quem | Pré-condição | Efeito |
|---|---|---|---|---|
| Salvar rascunho | `PATCH /reports/questionReports/:id/draft` | gestor, colaborador (só atribuídos), consultor, Administração | ciclo em preenchimento | grava alternativa (validada contra o indicador), justificativa, anexos e pedido de NA; se o conteúdo mudar, a revisão e a decisão da versão anterior deixam de valer (o registro fica) |
| Enviar | `POST /reports/questionReports/:id/submit` | idem | alternativa válida **ou** pedido de NA com justificativa (≥ 10 caracteres) e evidência | `answerVersion + 1`, fotografia `submit`, aguarda revisão |
| Rota herdada | `PATCH /reports/answerQuestion/:id` | idem | idem | rascunho + envio em um passo (`draft: true` só salva) |
| Revisar | `POST /reports/validateanswer/:id` | gestor ou consultor (ADMIN + CONSULTOR age como consultor) | versão enviada; `answerVersion` informado deve ser o atual | aprovação presa à versão; reprovação exige comentário |
| Solicitar auditoria | `POST /reports/requestAudit/:companyId` | gestor (ou Administração registrando) | preenchimento | registra a intenção; não libera |
| Liberar | `POST /reports/releaseAudit/:companyId` | Administração FIEMS | solicitação registrada; auditor **e** supervisor designados; todo indicador com versão enviada e aprovada (ou com decisão de auditoria válida de rodada anterior) | fotografia `audit-release`, congelamento, `Auditing` |
| Complemento | `POST /auditory/questionReports/:id/complement` | auditor designado | `Auditing` | pendência `evidencia-solicitada`; **não** desbloqueia |
| Enquadrar | `POST /auditory/questionReports/:id/decision` | auditor designado | `Auditing`; NA do item já decidido | nível auditado (para cima ou para baixo) ou `conclusion: not-met`, com justificativa; não toca a resposta nem a autoria da empresa |
| Rota herdada | `POST /auditory/evaluatequestion/:id` | auditor designado | idem | `Approved` endossa o nível declarado; `Rejected` = não atendido; `PendingRevision` = complemento |
| Decidir NA | `POST /auditory/nonApplicable/:id` | auditor designado | pedido pendente | `accepted` exclui do cálculo; `refused` mantém e exige enquadramento; fundamento obrigatório |
| Concluir | `POST /auditory/submitToSupervisor/:companyId` | auditor designado | todos os itens com decisão válida da versão atual; nenhum NA ou complemento pendente | `AwaitingSupervisor` |
| Aprovar | `POST /auditory/finishAuditory/:companyId` | supervisor designado | `AwaitingSupervisor` | `Audited`, resultado gravado, liberação final; segunda aprovação → 409 |
| Retornar | `POST /reports/return/:companyId` | consultor ou Administração | `Auditing` ou `AwaitingSupervisor`; motivo | fotografia `return`, nova rodada com itens afetados; decisões de versões não alteradas continuam valendo |

Ninguém fora da tabela recebe a ação: gestor, colaborador, auditor e supervisor não retornam;
supervisor não enquadra, não decide NA nem devolve; ADMIN isolado não revisa como auditor nem aprova.

## Concorrência

Toda transição abre transação e trava a linha do ciclo e depois a do indicador
(`SELECT … FOR UPDATE`). Resultado observado nos testes:

- duas edições com o mesmo `expectedLockVersion` → uma grava, a outra recebe 409 (sem mistura);
- retorno simultâneo à avaliação do auditor → a avaliação entra antes (e continua valendo) ou é
  recusada inteira, nunca pela metade;
- duas aprovações simultâneas → uma grava, a outra recebe 409; um único resultado gravado.

## Evidências e arquivos

- `POST /uploads/companyFile`: extensão permitida **e** conteúdo compatível (assinatura do
  arquivo); executáveis recusados mesmo renomeados; gravação em arquivo temporário + renomeação.
- Metadados: nome, tipo, tamanho, hash, autor e perfil, data, versão (`replacesFileId`),
  descrição, validade ou prazo indeterminado, e tipo (`evidencia` | `cadastral` | `auditoria`).
- O mesmo arquivo pode comprovar vários indicadores por vínculos explícitos
  (`question_report_files`). Desvincular é marcação (`removedAt`): a versão enviada continua
  apontando para o que foi enviado.
- Arquivo do auditor tem visibilidade `auditoria`: só auditoria, supervisão e Administração
  baixam. Download sempre autenticado, como anexo, com `nosniff` e sem cache.
- Documento vencido é sinalizado (`expired`) e não altera pontuação.

## Pendências

`GET|POST /reports/:reportId/pendings`, `PATCH /reports/pendings/:id`. Tipos e quem abre:

| Tipo | Abre |
|---|---|
| `orientacao-consultoria` | consultor, Administração |
| `falta-resposta` | gestor, consultor, Administração |
| `evidencia-solicitada` | auditor, gestor, consultor, Administração |
| `documento-vencido` | gestor, consultor, Administração, auditor |
| `constatacao-auditoria` | auditor |

Situações `aberta → em-andamento → resolvida | cancelada`, com histórico em `pending_events`.
Pendência aberta pela auditoria só é encerrada pela auditoria. Prazo vencido é sinalizado e não
altera pontuação nem reprova.

## Visibilidade

Até a aprovação do supervisor, a empresa (gestor, colaborador e consultor) não vê enquadramento
auditado, parecer, decisão de NA nem arquivos da auditoria — vê o pedido de complemento, que é
dirigido a ela. Depois da aprovação, o enquadramento aparece ao lado da declaração, com autores e
datas, sem confundir as duas respostas.

## Histórico

`GET /reports/questionReports/:id/history`: versões fotografadas (`submit`, `audit-release`,
`return`), revisões e decisões com a versão analisada e se ainda valem, comentários, pedidos de
NA, pendências e arquivos (inclusive desvinculados). `GET …/versions` lista uma entrada por envio.

## Contrato de publicação

A aprovação chama `onApproved({ report, stored, req })` dentro da mesma transação
(`req.app.locals.onApproved`). A geração real do relatório e do certificado é a etapa seguinte
(Prompt 7); até ela existir, nenhuma rota apresenta certificado ou declara a publicação concluída.
