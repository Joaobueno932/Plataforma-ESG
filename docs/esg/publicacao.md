# Publicação automática e documentos FIEMS — Prompt 7

Implementação: `backend/src/publication/` (serviço e gerador do relatório), rotas em
`backend/src/routes/reports.js` e `backend/src/routes/verify.js`, migração `mysql_003_publication`.
Testes: `backend/test/publication.test.js`.

## Como funciona

1. O supervisor aprova (`POST /auditory/finishAuditory/:companyId`). **Na mesma transação**: ciclo
   vai a `Audited`, o resultado é gravado com a versão da regra e a publicação é registrada —
   uma por ciclo e rodada (`UNIQUE(reportId, round)`), ligada ao resultado gravado.
2. Logo após o COMMIT, o relatório é gerado em área privada
   (`storage/publications/<ciclo>/<publicação>/relatorio-auditoria.pdf`), gravado em arquivo
   temporário e renomeado, com hash e tamanho registrados.
3. Se a geração falhar, a aprovação continua válida; a publicação fica `failed` com o erro técnico
   registrado e é **tentada de novo automaticamente** — no primeiro acesso e na subida da API —
   até 5 tentativas, sem nova decisão humana e sem repetir decisões técnicas.
4. A liberação manual antiga (`/auditory/givereportaccess`) responde **410**: não há passo
   administrativo depois da aprovação.

## Rotas

| Rota | Quem | Observação |
|---|---|---|
| `GET /reports/:id/publication` | quem lê o ciclo | 404 antes da aprovação; situação dos documentos e do certificado |
| `GET /reports/:id/publication/report.pdf` | gestor, consultor, Administração, auditor e supervisor designados | autorização conferida a cada download; colaborador recebe 403 (o relatório completo traz indicadores de outros responsáveis); 503 com `Retry-After` enquanto gera |
| `GET /publication/verify/:code` | público | só empresa, escopo, ciclo, rating, validade e situação |

## Relatório

Gerado só a partir dos registros: resultado gravado na aprovação (mesmos números da API, do
histórico e do painel — conferido por teste), ciclo, equipe, decisões de "não se aplica" e
constatações. Seções: identificação e escopo, programa/ciclo/datas, equipe, resultados por eixo,
rating, elegibilidade e impedimentos, indicadores com declarado × auditado, aplicabilidade,
constatações e conclusão. Inspecionado renderizado (3 páginas com 32 indicadores e nomes longos):
quebra de linha nas células, cabeçalho de tabela repetido e nunca isolado no pé da página, cores
dos níveis, logotipo ESG FIEMS, numeração de página.

## Certificado / selo FIEMS

- Avaliação **elegível**: a concessão é registrada automaticamente — código verificável, emissão,
  início e fim da validade (dois anos, política `manual-8.6-dois-anos`), escopo e rating.
- Avaliação **inelegível**: resultado e relatório são liberados, **sem** certificado nem código.
- O **documento** do certificado não é gerado: situação `awaiting-official-template`.

## O que falta da FIEMS (pré-requisitos externos)

| Item | Por quê |
|---|---|
| Modelo oficial do certificado/selo FIEMS (arte, textos, campos) | a regra proíbe certificado inventado; sem modelo, só a concessão é registrada |
| Confirmação se a plataforma **emite** o certificado ou só **armazena** o emitido externamente | pendência declarada na própria especificação (TEL de certificação) |
| Modelo oficial do relatório de auditoria e campos exigidos pelo organismo de auditoria | a especificação traz só o conteúdo mínimo proposto (TEL12); a estrutura atual é `relatorio-auditoria-estrutura-v1` |
| Autoridade signatária, se houver | nenhuma assinatura é inventada |
| Ratificação da política de faixas (limite de 30% para micro/pequenas) | o relatório informa quando a política usada está pendente |

Revisões de documento já emitido (correção autorizada) e reemissão serão uma nova publicação
ligada à anterior; a recertificação já abre novo ciclo ligado ao anterior.
