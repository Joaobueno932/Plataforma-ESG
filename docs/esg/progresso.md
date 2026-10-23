# Progresso e plano de execução da reconstrução

Complementa `PROGRESS.md` (histórico da engenharia reversa, preservado) com o plano da
reconstrução sobre as regras oficiais. Referências `A*` em `diagnostico.md` § 5, regras `C*/P*/N*/F*`
e pendências `X*` em `regras.md`.

## Registro

| Data | Etapa | O que foi feito | Validação |
|---|---|---|---|
| 22/10/2026 | **E0 — Diagnóstico** | Inspeção de `42ba516`; leitura da planilha oficial; mapeamento de frontend, API, autenticação, dados, uploads, catálogo, respostas, auditoria, testes e relatórios; 21 achados confirmados e 5 hipóteses descartadas; regras com origem e critério de aceite; matriz de permissões; tabela de transições; plano de migrações. Nenhuma alteração na aplicação. | `backend npm test` 32/32 · `frontend npm run build` 17 rotas, sem erro · `frontend npm run lint` **inexistente** (sem ESLint) · leitura do banco local somente leitura |
| 22/10/2026 | **Reconciliação com a especificação** | `Plataforma esg fiems.docx` v1.0 recebida e confrontada com `regras.md`: resolvidas F10 (gestor solicita × Administração libera), F13 (parte), P3/P9/P10 (faixas, precisão, sem base para classificação) e as pendências de permissão; acrescentado § 4.1 com 13 regras de cadastro, vínculo e ciclo; propostas e pendências do documento mantidas como tais. | revisão documental |
| 23/10/2026 | **E4 — Respostas, evidências e fluxo de auditoria (Prompt 5)** | Serviço de domínio único (`src/workflow`) com trava de ciclo e de indicador em todas as transições; rascunho separado do envio; versão da resposta (`answerVersion`) com revisão e decisão de auditoria presas à versão analisada; liberação com pré-requisitos (solicitação, auditor e supervisor designados, versões aprovadas) e congelamento; bloqueio de resposta, anexo, upload, desvinculação e rotas antigas durante a auditoria; complemento do auditor como pendência, sem desbloqueio; enquadramento auditado separado da declaração; NA com justificativa e evidência, decidido pelo auditor; estado `AwaitingSupervisor`; aprovação idempotente; retorno por consultor/Administração com itens afetados e preservação de versões e pareceres; pendências tipadas com histórico; arquivos com conteúdo conferido, metadados, versão e visibilidade da auditoria. Migração `mysql_002_workflow` (somente adições). Detalhes em `fluxo.md`. | `backend npm test` **132/132** (18 cenários do percurso e das tentativas proibidas, incluindo 3 de concorrência) · migração aplicada no banco de trabalho |
| 23/10/2026 | **Troca do banco para MySQL** | Driver `node:sqlite` substituído pelo pool `mysql2` com transações por `AsyncLocalStorage`; esquema consolidado em `mysql/001_baseline.js` (31 tabelas) com colunas geradas para a unicidade condicional de CNPJ e e-mail ativos; histórico SQLite congelado em `src/migrations/sqlite/` com executor próprio, usado só para preparar a base herdada; `scripts/sqlite-to-mysql.js` transfere sobre cópia, na ordem das FKs, com referências circulares adiadas; backup/restauração por `mysqldump`; ambiente completo em containers (mysql 3307, api 3333, web 3001). | `backend npm test` **123/123** na base `plataforma_esg_test` · transferência real aplicada no banco de trabalho (161 indicadores, 670 alternativas, 2 versões de catálogo, contagens iguais à origem) · `docker compose ps` com os três serviços *healthy* · API em container consultada: login, catálogo e listagem de empresas |
| 22/10/2026 | **E5 — Cálculo por eixo e elegibilidade** | Motor único em `src/scoring` (políticas de faixa versionadas, engine puro, carga em lote e persistência), migração `009`, rotas `GET /reports/:id/result` e `/result/history`, aprovação do supervisor gravando o resultado com a versão da regra. A média herdada foi removida. | `backend npm test` **118/118**, incluindo 29,99/30/39,99/40/59,99/60/79,95/79,99/80%, denominador zero, NA aceita/recusada/pendente, obrigatório não atendido com rating AAA, valor inválido, porte ausente e o exemplo BBB do documento · `db:dry-run`/`db:verify` com dados preservados · exemplo de resposta em `docs/esg/exemplo-resultado-api.json` |
| 22/10/2026 | **E3 — Catálogo oficial versionado** | Leitor de XLSX próprio (validado contra openpyxl), validação com relatório de erros/divergências/conferências, importação em versões (prévia → rascunho → publicação com confirmação), códigos e alternativas oficiais por indicador, proteção das versões publicadas e conferência contra os cadernos em PDF. Versão oficial importada como **rascunho**. | `backend npm test` **95/95** · `npm run db:dry-run` e `db:verify` com dados preservados · importação real da planilha no banco de trabalho (139 indicadores em rascunho, ciclos demonstrativos intactos) · `tools/catalog_crosscheck.py` contra os 9 cadernos |
| 22/10/2026 | **E1+E2 — Cadastros, vínculos, autorização e ciclos** | Identidade separada de perfil, vínculo e designação; autorização central aplicada a rotas, downloads, exportações e uploads; delegação com prazo; restrição do colaborador no servidor; acúmulo só ADMIN + CONSULTOR; múltiplos ciclos com versão e caderno congelados; sessões revogáveis; recuperação de uso único; configuração de produção separada; 7 migrações versionadas validadas em cópia. | `backend npm test` **72/72** · `frontend npm run build` 17 rotas, sem erro · `npm run db:dry-run` em cópia: dados preservados, `integrity_check ok`, `foreign_key_check ok` · `npm run migrate` + `db:verify` no banco de trabalho · smoke test da API contra o banco migrado |

## Ordem do plano e suas dependências

```
E1 Perfis, vínculos e autorização ──┐
                                    ├─► E4 Fluxo, bloqueio, rodadas e NA ──┐
E2 Ciclos e versão de catálogo ─────┤                                      ├─► E6 Publicação, relatórios e certificado
                                    │                                      │
E3 Catálogo oficial da planilha ────┴─► E5 Cálculo, elegibilidade e rating ┘
                                                                            └─► E7 Interface do ciclo (contratos reais)
E8 Endurecimento e verificações: acompanha E1→E7, fecha ao final
```

Regra de dependência adotada: **vínculos e ciclos antes do fluxo; catálogo antes do cálculo
definitivo; fluxo e cálculo antes da publicação; interface ligada aos contratos já reais.**

## Como manter o sistema executável em cada etapa

- Migrações **aditivas** e idempotentes; colunas e rotas antigas permanecem até a última etapa que
  as usa. Nenhum `DROP` de dado, nenhum seed destrutivo, nenhuma recriação do banco.
- Cada migração é aplicada primeiro na base de testes (`plataforma_esg_test`) e conferida em
  cópia restaurada do dump (`npm run db:dry-run`) antes de tocar o banco de trabalho. A base
  SQLite anterior permanece intacta: a transferência trabalha sobre uma cópia dela.
- Uma etapa só fecha com `backend npm test` verde e `frontend npm run build` sem erro; os testes que
  afirmam regras substituídas são reescritos **na etapa que muda a regra** (A11), nunca apagados em
  bloco.
- Contratos de API mudam por adição: campo novo ao lado do antigo, remoção apenas depois que a
  interface deixa de consumi-lo.
- O seed demonstrativo permanece identificado como demonstrativo enquanto o catálogo oficial não
  estiver importado; depois disso, continua disponível apenas para testes.

---

## E1 · Perfis, vínculos e autorização no servidor — **concluída em 22/10/2026**

**Objetivo**: tornar possível representar quem é a pessoa, com que perfil e em qual empresa, e
verificar isso em todas as rotas.

**Entregue**: `src/authz.js` (matriz de ações, principal, escopos, acúmulo, último administrador,
trilha), `src/auth.js` (sessões revogáveis, recuperação de uso único), `src/migrations/002`,
`routes/users.js` (perfis e vínculos pela Administração; inativação com histórico),
`routes/companies.js` (escopo por vínculo), `routes/uploads.js` (upload e download escopados),
`PATCH /auth/context`, `GET /admin/{review,events,permissions}`. Matriz publicada em
`GET /admin/permissions` e conferida por teste contra `regras.md` § 5.

- Migração **M1**: `user_profiles`, `user_company_links` (perfil, empresa, vigência, concedido por),
  usuário **ativo/inativo**; backfill de `users.role`/`users.companyId`.
- Regra de acúmulo: somente **ADMIN + CONSULTOR**; demais combinações recusadas, inclusive entre
  empresas diferentes.
- Remover a troca autônoma de empresa (A8); a troca passa a escolher entre vínculos concedidos;
  `/companies/light/all` limitado aos vínculos do solicitante.
- Guardião único de autorização: usuário ativo, perfil, vínculo, empresa, ciclo, atribuição e
  estado — aplicado também a arquivos, downloads, exportações e rotas antigas.
- Restrição do colaborador (A9) em listagem, item, arquivos e download.
- Perfis de avaliação e aprovação corrigidos (A4): avaliação e NA só AUDITOR; aprovação de
  resultado só SUPERVISOR; ADMIN sem poder de aprovação.
- Reduzir a projeção de dados pessoais nas listas de usuários da empresa (A17).

**Testes de aceite (executados)**: acúmulo proibido rejeitado; consultor sem vínculo → 403;
colaborador vê e responde só o que lhe foi atribuído, inclusive por id direto e download;
SUPERVISOR em avaliação → 403; ADMIN em aprovação → 403; vínculo revogado e conta inativada
derrubam a sessão; recuperação reutilizada → 401. Suíte `test/authz.test.js`.
**Executável**: `users.role`/`companyId` continuam preenchidos como espelho de leitura.
**Pendências**: autenticação adicional para a Administração e integração com identidade
corporativa FIEMS (declaradas como proposta na especificação § 7).

## E2 · Ciclos e versão de catálogo — **concluída em 22/10/2026**

**Objetivo**: permitir mais de uma avaliação por empresa e fixar o catálogo do ciclo (C2).

**Entregue**: migrações `004_cycles`, `005_history_integrity` e `007_rounds`;
`services.createCycleForCompany` (número do ciclo, caderno e versão congelados, ciclo anterior);
designação de auditor e supervisor por ciclo; rodadas com foto da versão enviada; cascatas
destrutivas trocadas por `RESTRICT` e rotas de catálogo recusando exclusão de item já avaliado.

- Migração **M2**: ciclo com `companyId + cycle`, `catalogVersion`, datas de vigência e estado;
  remoção do `UNIQUE(companyId)` por recriação com cópia de dados; o relatório atual de cada empresa
  vira o ciclo 1.
- `catalogVersion` em `questions`/`answers`; o ciclo passa a referenciar a versão.
- Retirar a edição de alternativas da tela do ciclo (A15); edição de catálogo gera nova versão.

**Testes de aceite (executados)**: empresa com dois ciclos relacionados; ciclo em andamento impede
abrir outro; exclusão de indicador, alternativa, arquivo, empresa ou ciclo com avaliação vinculada
é recusada; troca de caderno não altera o ciclo aberto; migração sobre cópia representativa
preserva dados, ids e relacionamentos (`test/migration.test.js`).
**Executável**: rotas de relatório atendem pelo ciclo corrente da empresa.
**Pendências**: regras de **recertificação** (P8/X1) — o modelo suporta ciclos; a política de quando
e como recertificar não é decidida aqui. Versões publicáveis do catálogo (rascunho/publicada) vêm
com E3.

## E3 · Catálogo oficial da planilha — **implementada em 22/10/2026 (versão oficial em rascunho)**

**Entregue**: leitor de XLSX sem dependências (`src/catalog/xlsx.js`, validado célula a célula
contra o `openpyxl`: 10.111 células, zero divergências), validação e relatório
(`src/catalog/parse.js`), importação em versões rastreáveis com prévia, rascunho e publicação
(`src/catalog/import.js`, `routes/catalog.js`, `scripts/catalog.js`), migração `008`,
painel administrativo na tela Indicadores e conferência contra os cadernos em PDF
(`tools/catalog_crosscheck.py`). Relatório completo: [`importacao-catalogo.md`](importacao-catalogo.md).

**Resultado**: 139 indicadores (59 Geral + 80 setoriais), 538 alternativas, 50 mínimos
obrigatórios (49 deles em nível de zero ponto), soma dos máximos 1250 — todas as 13 conferências
da especificação conferem. Zero erros de estrutura; 8 divergências entre abas e 2 de pontuação
contra os cadernos, todas registradas. **A versão oficial permanece rascunho** porque a
descrição e a orientação de verificação dos indicadores não existem na planilha e não são
extraíveis dos PDFs com confiança — nada foi preenchido por texto gerado.


**Objetivo**: substituir os 22 indicadores demonstrativos pelos **139 oficiais** (C1, C3–C11).

- Migração **M3**: `maxPoints`, `topic`, `ods`, `position` nas alternativas, nível mínimo
  obrigatório, código oficial.
- Importador versionado, lendo `Indicadores Programa ESG FIEMS 1.xlsx` (abas `Questionário` e
  `Consolidado`), idempotente, com **prévia de validação, relatório de erros e confirmação**
  (especificação § 14), origem e data registradas na versão do catálogo; a versão demonstrativa é
  preservada como legada. Detectar códigos repetidos na mesma versão e níveis inconsistentes, e
  **não** tratar linhas de níveis como indicadores diferentes.
- **Conferir a correspondência entre os cadernos oficiais em PDF (`Cadernos indicadores/`,
  entregues em 22/10/2026) e a planilha antes de importar** — exigido pela especificação § 17.
- Validações de importação: 59 + 10 por caderno; 2 a 5 alternativas; soma de máximos por eixo igual
  a C8; 50 indicadores obrigatórios na distribuição de C6; nenhum ponto derivado de rótulo.
- Catálogo e cartões passam a ser dirigidos por dados (A10 estrutural, A20); fim do parsing de
  `"Verificação:"`.
- Acompanha: consultas agregadas e índices (A16) — com 69 itens por ciclo o N+1 atual deixa de ser
  tolerável.

**Testes de aceite (executados)**: contagens e somas da planilha conferidas por teste; ciclo
novo na versão publicada gera 69 itens com códigos oficiais e sem indicador de outro setorial;
indicador binário com "Conforme" de zero ponto, de 4 e de 5 alternativas; mínimo obrigatório
intermediário (AE03, 4 pontos) e mínimo em nível de zero ponto com máximo 10 (GE01);
reimportação do mesmo arquivo não duplica; versão publicada recusa edição manual; publicar nova
versão não altera resposta, critério nem resultado de ciclo anterior. Suíte
`test/catalog.test.js` (22 testes).
**Executável**: a importação cria versão nova; ciclos abertos continuam na versão com que foram
criados; o rascunho não entra em ciclo nenhum.
**Pendências**: ratificação de D1/D6/D8 (nomes), **D7** (pontuações de AE03 e GE06), conferência
do mínimo obrigatório contra os cadernos e a **fonte de descrição/verificação** — todas em
[`importacao-catalogo.md`](importacao-catalogo.md) § 6. O cálculo definitivo (E5) depende de D7.

## E4 · Fluxo, bloqueio, rodadas e "não se aplica"

**Objetivo**: implementar as transições de `regras.md` § 6 com histórico.

- Migração **M4**: `cycle_rounds`, `answer_versions`/`item_history`, `item_comments`,
  `item_transitions`, `na_requests`.
- Bloqueio após o envio (F1) para respostas **e** anexos/GED, com o mesmo guardião (A7).
- Pedido de retorno pela empresa + retorno autorizado por consultor ou administrador (F2); gestor
  não retorna; complemento do auditor não desbloqueia (F3, A6).
- Versão enviada preservada e rodadas legíveis (F4, A12); comentário da empresa separado da
  observação técnica do auditor; trilha de transições com autor e **função exercida**.
- NA como pedido com justificativa e evidência, decidido pelo auditor (N1–N4, A13).
- Reescrita dos testes que afirmam as regras substituídas (A11).

**Testes de aceite**: resposta/anexo em auditoria → 403; retorno por gestor → 403; retorno por
consultor/admin → nova rodada com versão anterior legível; complemento isolado não desbloqueia; NA
sem justificativa → 400; decisões de NA registradas com autoria.
**Executável**: estados antigos continuam aceitos em leitura durante a transição; a interface é
ajustada junto com cada rota.
**Pendências**: **F10/X5** — quem submete para auditoria fica isolado em um único ponto de
autorização (hoje ADMIN), para trocar sem refatorar o fluxo. **F11/X6** — nenhuma devolução é criada
para o supervisor; se ele não aprovar, o ciclo permanece em "aguardando supervisão" até decisão.
**F13/X7** — prazo gravado na atribuição, sem efeito automático até a regra existir.

## E5 · Cálculo, elegibilidade e rating — **concluída em 22/10/2026**

**Objetivo**: substituir a média de níveis pelo cálculo oficial (A3, P1–P5).

**Entregue**: `src/scoring/policies.js` (duas políticas de faixa versionadas, com status),
`src/scoring/engine.js` (funções puras: obrigatórios por ordem de nível, pontos e máximo por
eixo, faixa em aritmética inteira, NA aceito/recusado/pendente, impedimentos e elegibilidade
separados), `src/scoring/index.js` (carga em lote do ciclo e gravação em `cycle_results` com
`ruleVersion`), migração `009_scoring` (enquadramento auditado, `na_requests`, resultado do
ciclo), rotas de resultado e histórico, e a aprovação do supervisor usando o motor.
O frontend não tem fórmula própria: consome `GET /reports/:reportId/result`.

- Migração **M5** (parte do resultado): `cycle_results` por eixo (pontos, máximo aplicável,
  percentual, rating), elegibilidade e lista de obrigatórios não atendidos.
- Ordem obrigatória do cálculo: **obrigatórios aplicáveis primeiro** → pontos e máximo por eixo
  (excluindo NA aceito e indicadores de máximo 0) → rating por faixa conforme o porte
  (`companies.size`) → elegibilidade.
- Quatro grandezas distintas e nunca derivadas entre si: preenchimento, resultado matemático,
  conclusão auditada e elegibilidade (P5).

**Testes de aceite**: casos com os números da planilha (setorial A: máximos 170/200/200; limiares
136/102/51 e 68); obrigatório não atendido com pontuação máxima → inelegível; NA aceito reduz o
denominador; recusado não reduz; porte muda apenas o limiar de C.
**Executável**: o campo `evaluation` antigo permanece para leitura do histórico.
**Pendências**: **P11/X4** — o limite de C para micro e pequena (30%) continua **condicionado**
no documento: as duas políticas estão modeladas e, na janela em que divergem (30%–39,99%), o
eixo é marcado como dependente de ratificação e a faixa não é publicada. **P7/X8** — enquanto a
política de simulação com NA pendente não for aprovada, o eixo com pedido sem decisão fica sem
classificação válida, com o motivo informado. **D7** (pontuações de AE03 e GE06 divergentes
entre planilha e cadernos) afeta os números desses dois indicadores quando o catálogo oficial
for publicado.

## E6 · Publicação automática, relatórios finais e certificado

**Objetivo**: F6, F7, F9 e as duas telas que nunca existiram (A14).

- Aprovação do supervisor libera resultado e relatório na mesma transação; remoção da liberação
  manual (A5) e do teste que a afirmava.
- Certificado/selo FIEMS disponibilizado automaticamente quando houver concessão elegível;
  inelegível aprovado → resultado sem concessão (P4).
- Telas "Extrato Geral" e "Relatório de Auditoria" sobre o resultado calculado; visão geral com
  andamento antes e resultado depois (F9); correção do contador de respondidos (A19).
- **Nada** sobre o certificado da Bureau Veritas (F8).

**Testes de aceite**: aprovar → empresa vê resultado, relatório e, se elegível, certificado, sem
ação adicional; nenhuma rota de liberação manual responde 2xx; busca por "Bureau" na interface sem
resultados; ciclo sem respostas → 0 respondidos.
**Pendências**: conteúdo e layout do relatório final dependem de `[DOC]`/`[HTML]` (X1, X2) — a
estrutura de dados é construída independentemente.

## E7 · Interface do ciclo conforme a organização aprovada

**Objetivo**: A21 e A10 sobre contratos já reais.

- Listagem pesquisável, filtros, agrupamentos, acesso a todas as perguntas permitidas, resposta em
  qualquer ordem, modal ao clicar em Responder, destaque dos indicadores do setorial.
- Cartões de alternativa dirigidos por dados, com a paleta da referência; nenhuma cor por nome de
  nível.
- Acessibilidade e responsividade verificadas por inspeção funcional e visual.

**Pendências**: **X2** — sem o HTML aprovado e as imagens de referência, a fidelidade visual dos
cards não pode ser declarada pronta. A estrutura (busca, filtros, agrupamento, modal, destaque) já
está decidida e avança.

## E8 · Endurecimento e verificações

Acompanha as etapas anteriores e fecha ao final (A16–A19):

- ESLint configurado no frontend (hoje `npm run lint` não verifica nada) e script de verificação
  compatível registrado.
- CORS por configuração; limite de tentativas em login e recuperação de senha; token de redefinição
  de uso único e invalidado na troca de senha; senha atual exigida na troca pelo próprio usuário;
  validação e limite em `POST /leads`; revogação de sessão ao desativar usuário.
- Índices, constraints e transações de **M6**; eliminação dos N+1 restantes.
- **A18 — tarefa obrigatória antes de qualquer novo push** (decisão do responsável pendente):
  `recon/api/*` contém 17 e-mails corporativos reais e 2 CNPJs em repositório **público**.
  Opções: anonimizar os corpos (estendendo `tools/redact_api.py`) ou retirar `recon/api` do
  repositório publicado. Nada foi removido nem reescrito: **retirar da versão atual não elimina as
  versões anteriores já publicadas** — limpar o histórico é operação separada, destrutiva para
  quem tem clones, e precisa de autorização expressa.
- **Arquivos de fonte entregues na raiz** (`Plataforma esg fiems.docx` e a planilha) estão
  **fora do versionamento** e devem continuar assim: entram em `.gitignore` ou saem da pasta antes
  do push, porque o repositório é público.

---

## Decisões realmente ausentes (lista curta)

| # | Decisão ausente | Bloqueia | Módulos que avançam sem ela |
|---|---|---|---|
| X1 | `Plataforma esg fiems.docx` indisponível (ratifica F10, F12, F13, P6–P8, recertificação) | conteúdo do relatório final, prazos, recertificação | E1, E2, E3, E4 (núcleo), E5 (exceto P6/P7) |
| X2 | HTML aprovado e imagens de referência dos cards | fidelidade visual dos cards e layout final | E7 estrutural, E1–E6 por completo |
| X3 | Nome oficial de **GS04** (D1: "Regularidade" × "Conformidade") | rótulo de um indicador obrigatório | importação dos outros 138 indicadores |
| X4 | Limiar de **rating C social, micro e pequena** (D2: linha repetida da governança) | rating social de MPE | rating ambiental e de governança, rating social de média/grande, elegibilidade |
| X5 | Quem **submete para auditoria** | botão/rota de submissão | bloqueio, auditoria, supervisão, publicação |
| X6 | O que ocorre quando o **supervisor não aprova** | estado terminal alternativo | aprovação e publicação automática |
| X7 | Regras de **prazo** (quem define, efeito do vencimento, notificação) | automação de prazo | atribuição por indicador, já decidida |
| X8 | **Rating preliminar** com NA pendente | exibição antes da decisão do auditor | cálculo definitivo após as decisões de NA |
| X9 | Tratamento dos dados reais em `recon/api` (A18) | limpeza do repositório público | todo o restante |
