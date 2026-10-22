# Diagnóstico do estado atual — 22/10/2026

> **Atualização da etapa 2 (22/10/2026):** a especificação `Plataforma esg fiems.docx` v1.0 foi
> recebida e reconciliada em `regras.md`. Os achados **A2, A4, A7, A8, A9, A12 (parcial), A16
> (parcial), A17 (parcial), A18 (pendente de decisão) e A19 (parcial)** foram tratados nesta etapa;
> o estado de cada um está marcado abaixo. O que mudou no código está em `progresso.md` § E1–E2.

Inspeção do projeto antes de qualquer alteração funcional. Nada da aplicação foi modificado
nesta etapa: apenas foram executados os comandos de verificação já existentes e criados os
documentos em `docs/esg/`.

## 1. Estado do repositório

| Item | Valor observado |
|---|---|
| Branch | `master` (a branch principal remota é `main`) |
| Commit | `42ba516` "Projeto Base ESG" — único commit do histórico |
| `git status` | limpo, sem arquivos modificados, sem untracked, sem stash |
| Remoto | `origin` → `https://github.com/Joaobueno932/Plataforma-ESG` (público); `origin/main` = `42ba516` |
| Alterações locais do usuário | nenhuma a preservar além do banco local `backend/storage/` (ignorado pelo git) |
| Instruções de projeto | não há `CLAUDE.md`/`AGENTS.md` no repositório; valem `README.md` e `PROGRESS.md` como contexto histórico |
| Ambiente | Node **v24.19.0**, npm 11.17.0, Windows 11. `backend/package.json` exige `node >= 22.13` (usa `node:sqlite`) ✔ |
| Dependências | `backend/node_modules` e `frontend/node_modules` já instalados |
| Banco local | `backend/storage/esg.sqlite` com **apenas o seed de demonstração**: 7 usuários, 2 empresas, 2 relatórios (`Pending`), 22 indicadores, 132 alternativas, 16 itens de relatório, 0 arquivos, 0 evidências, 0 leads. **Nenhum dado real de empresa.** |

## 2. Baseline executado

| Comando | Resultado real |
|---|---|
| `cd backend && npm test` | **32/32 aprovados** (~9,9 s). Banco em memória e diretórios temporários (`backend/test/helpers.js`) — não toca `backend/storage/` |
| `cd frontend && npm run lint` | **não executa**: não existe configuração de ESLint; `next lint` abre o assistente interativo e nada é verificado. Ausência registrada (A17) |
| `cd frontend && npm run build` | **sucesso**: 17 rotas + middleware compiladas, sem erros; avisos apenas sobre o pacote opcional `sharp` |
| Typecheck | não existe (projeto em JavaScript puro, sem TypeScript). Nenhum script a inventar nesta etapa |
| Leitura do banco local | consulta somente leitura via `node:sqlite` (`readOnly: true`) |
| Planilha oficial | lida em cópia no diretório temporário da sessão, com `openpyxl` (somente leitura) |

Conclusão do baseline: **o projeto está executável e os testes existentes passam.** Falhas que
aparecerem nas próximas etapas são introduzidas, não pré-existentes — com a exceção do lint, que
nunca existiu.

## 3. Fontes

**Disponíveis**

- `Plataforma esg fiems.docx` v1.0 (19/10/2026) — especificação oficial, entregue na raiz do
  repositório em 22/10/2026. **Arquivo não versionado** (ver § 8).
- `Indicadores Programa ESG FIEMS 1.xlsx` — planilha oficial, abas `Questionário`
  (538 alternativas), `Consolidado` (139 indicadores), `Pontuações` (máximos e limiares de rating),
  `Caderno Geral` e `A`–`H`. É a fonte do catálogo e do cálculo.
- Código, `README.md`, `PROGRESS.md` e as evidências de engenharia reversa em `recon/` (contexto histórico).

**Ausentes (entrada necessária)**

- HTML aprovado da listagem e imagens de referência dos cards de alternativa — necessários para a
  etapa visual (E7), não bloqueiam as anteriores.
- Cadernos e manuais em PDF, Manual de Certificação, RAC, Regimento Interno e Manual de Marca —
  citados pela especificação como fontes; não estão no disco. Afetam a ratificação das pendências
  (recertificação, relatório oficial, identidade visual), não esta etapa.

## 4. Inventário: o que existe × o que o README descreve

| Módulo | Existe no código | Observação |
|---|---|---|
| Autenticação (login, `/auth/me`, refresh, esqueci/trocar senha) | ✅ `backend/src/routes/auth.js`, `src/auth.js` | JWT sem armazenamento de sessão; sem revogação |
| Empresas (CRUD, busca, paginação) | ✅ `routes/companies.js` | cria o relatório junto com a empresa |
| Usuários (CRUD, troca de empresa) | ✅ `routes/users.js` | perfil e empresa únicos por usuário |
| Cadernos e indicadores (CRUD, capa, assistente 3 passos) | ✅ `routes/questions.js`, `app/indicators/*` | catálogo **demonstrativo** (22 indicadores) |
| Ciclo/relatório, respostas, validação, auditoria, supervisão | ✅ `routes/reports.js`, `app/companies/[id]` | regras inferidas, hoje divergentes das decisões |
| Uploads e GED | ✅ `routes/uploads.js`, `components/indicators/ged-upload.jsx` | sem bloqueio por estado do ciclo |
| Autoavaliação pública + leads | ✅ `app/auto-avaliacao/*`, `routes/leads.js` | 33 perguntas fixas no código, recuperadas do bundle original |
| **Extrato Geral** (`/companies/:id/performance-report`) | ❌ | linkado em `app/companies/page.jsx:289` → 404 |
| **Relatório de Auditoria** (`/companies/:id/report`) | ❌ | linkado em `app/companies/page.jsx:305` → 404 |
| Certificado/selo FIEMS | ❌ | não existe entidade, emissão nem disponibilização |
| Ciclos históricos / recertificação | ❌ | `reports.companyId` é `UNIQUE`: um relatório por empresa, para sempre |
| Histórico de rodadas, versões e trilha de auditoria | ❌ | nenhuma tabela; atualizações sobrescrevem |
| Cálculo por eixo (E/S/G), elegibilidade, rating, porte | ❌ | existe apenas uma média de níveis em um campo de texto |
| Atribuição por indicador com prazo | ⚠️ parcial | existe `answererId`; não existe prazo |
| Vínculos profissionais múltiplos | ❌ | `users.companyId` único |
| Lint / typecheck | ❌ | sem ESLint configurado; sem TypeScript |

## 5. Achados confirmados

Formato: **impacto** → **correção pretendida** → **migração** → **teste de aceite**.

### A1 · Catálogo demonstrativo e escala de maturidade padronizada

**Situação (etapa 2):** aberto. O ciclo passou a registrar a versão do catálogo com que foi aberto (`reports.catalogVersion`, hoje `legacy-demo`), de modo que a importação oficial (E3) não altere ciclos existentes.
`backend/src/seed.js` (`LEVELS`, `DEMO_QUESTIONS`) · `backend/src/routes/questions.js`
(`LEVELS`, `CATEGORIES`, `validateQuestion`, `nextCode`) · `frontend/src/lib/constants.js`
(`MATURITY_LEVELS`, `POINTS`) · `frontend/src/lib/format.js` (`LEVEL_ORDER`).

- **Impacto**: 22 indicadores fictícios com 6 alternativas cada e pontos fixos `0/2/4/6/8/10`.
  Contraria C3, C5, C6, C7 e C9 de `regras.md`: a planilha tem 139 indicadores com 2 a 5
  alternativas, pontos próprios (`4/6/8/10`, e `0` no mesmo rótulo em outros indicadores),
  mínimo obrigatório variável e códigos `GE01`/`AS03`. `validateQuestion` aceita até 6
  alternativas e exige que o título seja um dos 6 níveis fixos; `nextCode` gera `CG-E01` e
  recontagem após exclusão produz códigos duplicados.
- **Correção**: importar o catálogo da planilha (`Questionário` + `Consolidado`), com eixo,
  tópico, ODS, máximo do indicador, ordem das alternativas, pontos e nível mínimo obrigatório;
  substituir o enum de níveis por dados; adotar o código oficial.
- **Migração**: `questions` ganha `maxPoints`, `ods`, `mandatoryAnswerId` (ou nível mínimo),
  `catalogVersion`; `answers` ganha `position`; chave natural `(catalogVersion, code)`. Importação
  idempotente a partir da planilha, preservando os 22 indicadores atuais como versão legada
  (sem apagar o banco).
- **Teste de aceite**: importação gera 59 + 10 por caderno; `SUM(maxPoints)` por eixo confere com
  C8; nenhum indicador com 6 alternativas; GE03 com 2 alternativas e máximo 0.

### A2 · Modelo de dados impede vínculos múltiplos e ciclos históricos

**Situação (etapa 2): resolvido.** `user_profiles`, `user_company_links` e ciclos múltiplos por empresa (migrações 002 e 004). `users.role`/`users.companyId` seguem preenchidos apenas como espelho de leitura.
`backend/src/db.js` — `users.role`/`users.companyId` (linhas 32–34) e
`reports.companyId TEXT NOT NULL UNIQUE` (linha 69).

- **Impacto**: um usuário tem um único perfil e uma única empresa, o que torna impossível o
  acúmulo ADMIN + CONSULTOR, os vínculos de consultor/auditor/supervisor com várias empresas e a
  verificação de vínculo previamente concedido. `reports.companyId UNIQUE` impede um segundo
  ciclo (recertificação) e qualquer histórico.
- **Correção**: tabelas `user_profiles` (perfis por usuário, com a regra de acúmulo) e
  `user_company_links` (vínculo concedido pelo administrador, com perfil, empresa e vigência);
  `cycles` (ou `reports` com `cycleYear` + `catalogVersion`) sem `UNIQUE` em `companyId`,
  com unicidade por `(companyId, cycle)`.
- **Migração**: criar tabelas e migrar `users.role`/`companyId` para linhas equivalentes
  (1 perfil + 1 vínculo por usuário); manter as colunas antigas até o fim da transição para não
  quebrar rotas; preservar ids e autoria.
- **Teste de aceite**: usuário com ADMIN + CONSULTOR exerce consultoria apenas nos vínculos
  concedidos; `AUDITOR + SUPERVISOR` é rejeitado (inclusive em empresas diferentes); uma empresa
  passa a ter dois ciclos com catálogos de versões distintas.

### A3 · Avaliação final calculada por média de níveis

**Situação (etapa 2):** aberto (cálculo é E5). A autorização foi corrigida: só o supervisor designado aprova o resultado.
`backend/src/routes/reports.js:229-240` (`POST /auditory/finishAuditory/:companyId`).

- **Impacto**: `avg = média dos pontos das respostas aplicáveis` e
  `evaluation = ['Nao_conforme',…,'Conforme'][round(avg/2)]` — um rótulo único gravado em texto.
  Não existe cálculo por eixo, máximo aplicável, porte, rating, elegibilidade por obrigatórios nem
  tratamento de NA. Contraria P1, P2, P3, P4, P5. Além disso faz uma consulta por item (N+1).
- **Correção**: serviço de cálculo que produz, por eixo, pontos obtidos e máximo aplicável
  (excluindo NA aceito e indicadores de máximo 0), o rating por faixa conforme o porte
  (`companies.size`, que já tem `MICRO_PEQUENA|MEDIA|GRANDE`) e a elegibilidade — verificada
  **antes** da pontuação.
- **Migração**: tabela de resultado por ciclo e eixo (`cycle_results`: eixo, pontos, máximo,
  percentual, rating) + campos de elegibilidade e lista de obrigatórios não atendidos; `evaluation`
  mantido apenas para leitura do histórico legado.
- **Teste de aceite**: casos unitários com os números da planilha (setorial A: máximos 170/200/200;
  limiares 136/102/51 ou 68); um obrigatório não atendido com pontuação máxima → inelegível;
  NA aceito reduz o denominador; NA recusado não reduz.

### A4 · Supervisor com ações de auditor; administrador aprovando resultado

**Situação (etapa 2): resolvido.** `audit.evaluate` e `audit.applicability` exigem AUDITOR designado no ciclo; `supervision.approve` exige SUPERVISOR designado; o perfil ADMIN não consta de nenhuma ação de aprovação (`src/authz.js`).
`backend/src/routes/reports.js:194` (`evaluatequestion` aceita `AUDITOR, SUPERVISOR`),
`:210` (`nonApplicable` aceita `AUDITOR, SUPERVISOR`), `:229` (`finishAuditory` aceita
`SUPERVISOR, ADMIN`) · `frontend/src/app/companies/[id]/page.jsx:250,529`.

- **Impacto**: o supervisor pode avaliar itens e marcar "não se aplica" (contraria F5); o
  administrador pode finalizar a auditoria e, portanto, aprovar o resultado (contraria a decisão
  de que ADMIN não tem poder de aprovação).
- **Correção**: `evaluatequestion` e a decisão de NA passam a exigir **somente** `AUDITOR` com
  vínculo ativo no ciclo; a aprovação do resultado exige **somente** `SUPERVISOR`; registrar
  identidade real e função exercida na ação.
- **Migração**: nenhuma estrutural; registrar autoria/função nas decisões (ver A6).
- **Teste de aceite**: SUPERVISOR em `evaluatequestion`/NA → 403; ADMIN em aprovação de
  resultado → 403; AUDITOR sem vínculo no ciclo → 403.

### A5 · Liberação manual do relatório pelo administrador

**Situação (etapa 2):** aberto por decisão de sequência — a publicação automática é E6. A rota segue restrita à Administração e agora grava evento na trilha.
`backend/src/routes/reports.js:242-247` (`POST /auditory/givereportaccess/:companyId`) ·
`companies.reportAccess` · `backend/test/workflow.test.js:113,118`.

- **Impacto**: a publicação depende de uma ação manual do ADMIN depois da auditoria, e a aprovação
  do supervisor não libera nada. Contraria F6 e F7.
- **Correção**: a aprovação do supervisor, na mesma transação, libera resultado e relatório e —
  havendo concessão elegível — disponibiliza o certificado/selo FIEMS. A rota manual é removida.
- **Migração**: manter `reportAccess` por compatibilidade, passando a ser efeito da aprovação;
  nova tabela/campo de certificado (emissão automática, com data e ciclo).
- **Teste de aceite**: aprovar → empresa vê resultado e relatório sem ação adicional; empresa
  inelegível aprovada → resultado visível **sem** certificado; nenhuma rota de liberação manual
  responde 2xx.

### A6 · Complemento do auditor desbloqueia a resposta da empresa

**Situação (etapa 2): resolvido no bloqueio.** `PendingRevision` não reabre a resposta; a empresa pede o retorno (`requestReturn`) e consultor ou Administração retornam o processo (`return`), com foto da versão enviada e nova rodada. O histórico completo de comentários e transições por item continua em E4.
`backend/src/routes/reports.js:75-76,101-103` (`PATCH /reports/answerQuestion/:id`: permite
responder quando `report.status === 'Auditing'` e o item está em `PendingRevision`) ·
`backend/test/workflow.test.js:88-95`.

- **Impacto**: o pedido de complemento, sozinho, reabre a resposta — exatamente o que F3 proíbe —
  e o retorno autorizado por consultor/administrador não existe. Também não há registro da versão
  enviada nem das rodadas (F4).
- **Correção**: `PendingRevision` mantém o item bloqueado para a empresa; criar o pedido de
  retorno (empresa solicita) e o retorno autorizado (consultor ou administrador), que abre nova
  rodada; gestor não pode retornar.
- **Migração**: `cycle_rounds` (rodada, aberta por quem, motivo, data) e
  `answer_versions`/`item_history` (snapshot da resposta, texto, alternativa, anexos e autoria por
  rodada); `question_reports` passa a referenciar a rodada corrente.
- **Teste de aceite**: item em complemento → resposta da empresa 403; retorno pelo gestor → 403;
  retorno pelo consultor ou admin → 200 e nova rodada; versão anterior continua legível.

### A7 · Anexos e GED sem bloqueio e sem verificação de perfil

**Situação (etapa 2): resolvido.** Anexar, desvincular e enviar arquivo passaram pelo mesmo guardião de estado e papel da resposta, com atribuição verificada para o colaborador.
`backend/src/routes/reports.js:109-119` (`editQuestionReport`), `:121-128`
(`DELETE /reports/questionFiles/:id`) · `backend/src/routes/uploads.js:34-58`
(`POST /uploads/companyFile`).

- **Impacto**: as três rotas exigem apenas autenticação e acesso à empresa. Não verificam estado do
  ciclo (anexar e remover evidência durante a auditoria e depois da aprovação), não verificam
  perfil (auditor ou colaborador não atribuído pode anexar/remover em nome da empresa) nem
  atribuição do indicador. Contraria F1 e a restrição do colaborador.
- **Correção**: aplicar o mesmo guardião de estado e papel usado na resposta; restringir à
  atribuição do indicador; remoção de evidência registrada em histórico em vez de exclusão
  silenciosa.
- **Migração**: nenhuma estrutural; `question_report_files` ganha autoria e rodada.
- **Teste de aceite**: anexar/remover com ciclo em auditoria → 403; colaborador em indicador não
  atribuído → 403; auditor anexando como empresa → 403 (a evidência do auditor tem caminho próprio).

### A8 · Profissional troca a própria empresa sem vínculo concedido

**Situação (etapa 2): resolvido.** A troca autônoma deixou de existir; `PATCH /auth/context` apenas seleciona vínculo vigente e `/companies/light/all` responde só as empresas vinculadas.
`backend/src/routes/users.js:69-80` (`PATCH /users/changeCompany/:id`, `self` para
`CONSULTOR`/`AUDITOR`) · `backend/src/routes/companies.js:/companies/light/all`
(lista todas as empresas para `ADMIN, CONSULTOR, AUDITOR`) · `frontend/src/app/settings/page.jsx:15`
· `backend/test/users.test.js` ("consultor troca a própria empresa").

- **Impacto**: consultor e auditor se vinculam a **qualquer** empresa e passam a ler e agir sobre os
  dados dela, inclusive respostas, anexos e downloads. Quebra o isolamento entre empresas e
  contraria a decisão de que somente o administrador gerencia vínculos.
- **Correção**: remover a troca autônoma; a troca passa a ser a escolha entre **vínculos já
  concedidos** pelo administrador; `/companies/light/all` responde apenas as empresas vinculadas ao
  solicitante (ADMIN mantém a visão completa).
- **Migração**: `user_company_links` de A2 (os vínculos atuais viram uma linha cada).
- **Teste de aceite**: consultor tenta vincular-se a empresa sem vínculo → 403; com dois vínculos,
  troca entre eles → 200; a lista de empresas do consultor não inclui empresas sem vínculo.

### A9 · Colaborador vê todos os indicadores do ciclo

**Situação (etapa 2): resolvido.** Filtro por atribuição no servidor na listagem, no item, no download e na exportação da listagem de empresas.
`backend/src/routes/reports.js:42-53` (`/reports/company/questions` devolve todos os itens),
`src/serializers.js:questionReport` (devolve descrição, alternativas, comentários, evidências e
arquivos sempre) · `frontend/src/app/companies/[id]/page.jsx:637-642`.

- **Impacto**: a restrição do colaborador existe apenas no botão de ação
  (`page.jsx:243`) e na escrita (`reports.js:74`, e só quando o item já tem responsável). Pela API,
  pela URL do item (`/reports/questionReports/:id`), pela listagem e pelo download de arquivos o
  colaborador acessa tudo. Contraria a decisão de permissões fechadas.
- **Correção**: filtrar por atribuição no servidor em listagem, item, arquivos, downloads e
  exportações; item não atribuído ao colaborador → 403/404 consistente; sem responsável definido,
  o colaborador não responde.
- **Migração**: nenhuma (usa `answererId`/atribuição); índice em `question_reports(answererId)`.
- **Teste de aceite**: colaborador lista apenas os itens atribuídos; acesso direto por id a outro
  item → 403; download de arquivo de outro item → 403.

### A10 · Cartões de alternativa com apresentação e cores fixas

**Situação (etapa 2):** aberto (depende da referência visual, E7).
`frontend/src/components/indicators/answer-card.jsx` (`cardVariants`, `Engajado: 'bg-violet-400'`)
· `frontend/src/lib/constants.js` (`LEVEL_LABEL`, `POINTS`) ·
`frontend/src/app/indicators/response-indicator/[id]/page.jsx:277-298`.

- **Impacto**: a cor vem do nome do nível e o nível `Engajado` recebeu **roxo inventado** — o CSS
  original só define cinco cores de cartão (`card-according` verde 24,122,0; `card-beginner`
  cinza 102,94,110; `card-conscious` azul 14,65,165; `card-non-compliant` vermelho 179,0,0;
  `card-sensitized` laranja 194,129,0). O seletor de pontos oferece `0,2,4,6,8,10`, fora da escala
  oficial.
- **Correção**: cartão dirigido por dados (rótulo, texto, pontos e obrigatoriedade do indicador),
  com a paleta definida pela referência aprovada; pontos exibidos como vêm do catálogo.
- **Migração**: nenhuma.
- **Teste de aceite**: indicador com 2 alternativas renderiza 2 cartões na ordem da planilha, com
  os pontos da planilha; nenhuma cor definida fora do mapa de referência. **Depende de X2.**

### A11 · Testes que legitimam regras já substituídas

**Situação (etapa 2): resolvido.** A suíte foi reescrita: 72 testes afirmam as regras decididas, incluindo as negações (`test/authz.test.js`).
`backend/test/workflow.test.js:88-110` (complemento → empresa responde direto),
`:112-121` (supervisor finaliza e **admin libera**), `:108` (auditor marca NA em massa, sem
justificativa), `:117` (`evaluation === 'Conforme'` pela média) · `backend/test/users.test.js`
(troca de empresa pelo próprio consultor).

- **Impacto**: a suíte atual **protege** os comportamentos que as decisões proibiram; corrigir o
  código vai derrubar esses testes, e mantê-los como estão congela as regras erradas.
- **Correção**: reescrever estes casos conforme a tabela de transições de `regras.md` § 6, mantendo
  os casos que continuam válidos (login, empresas, usuários, cadernos).
- **Migração**: nenhuma.
- **Teste de aceite**: a suíte passa a afirmar as regras decididas (403 onde antes havia 201) e
  continua verde ao fim de cada etapa.

### A12 · Sem histórico: comentário único e sobrescrita de estado

**Situação (etapa 2): parcial.** Entraram `audit_events` (autoria e função exercida de cada ação), `cycle_rounds` e `item_answer_versions`; a observação da auditoria deixou de poder ser apagada pela empresa. Comentários por item com histórico próprio continuam em E4.
`backend/src/db.js` (`question_reports.redflag`, `redflag_date`, `redflagIssuerId` — campos
únicos) · `backend/src/routes/reports.js:30-37` (`setRedflag`, `touch`), `:164-169`
(`DELETE /reports/redflag/:id` apaga o comentário) · `:172-177`
(`changeQuestionStatus` grava status sem registro).

- **Impacto**: cada novo comentário apaga o anterior (gestor, consultor e auditor compartilham o
  mesmo campo); a exclusão do "lembrete" apaga a observação da auditoria; mudanças de estado não
  deixam rastro de quem, quando e por quê. Contraria F4 e a exigência de preservar autoria e
  histórico.
- **Correção**: tabela de comentários/observações por item (autor, função exercida, rodada, data) e
  trilha de transições; "lembrete" da empresa separado da observação técnica do auditor.
- **Migração**: `item_comments` e `item_transitions`; migrar o `redflag` atual como primeiro
  comentário, preservando autor e data.
- **Teste de aceite**: dois comentários coexistem; excluir o lembrete não remove a observação do
  auditor; toda transição aparece na trilha com autor e função.

### A13 · "Não se aplica" sem pedido, justificativa nem decisão

**Situação (etapa 2): parcial.** A decisão de aplicabilidade passou a ser exclusiva do auditor designado; o pedido com justificativa e evidência e o registro de aceite/recusa são E4.
`backend/src/routes/reports.js:79-83` (empresa envia `nonApplicable: true` sem justificativa e sem
alternativa), `:210-216` (`POST /auditory/nonApplicable/:id` marca NA e já grava `Approved`, sem
justificativa nem evidência) · `frontend/src/app/indicators/response-indicator/[id]/page.jsx:307-317`
(o botão "Não se aplica" reaproveita o texto do lembrete, com o padrão literal `'Não se aplica'`).

- **Impacto**: NA é hoje uma marca booleana, não um pedido com justificativa, evidência e decisão
  do auditor; e o NA entra no cálculo apenas pelo filtro `!i.nonApplicable` em `finishAuditory`,
  sem distinguir aceite de recusa. Contraria N1–N4.
- **Correção**: entidade de pedido de NA (solicitante, justificativa, evidência, data) com decisão
  do auditor (aceito/recusado, motivo, autoria); aceite exclui do numerador **e** do denominador;
  recusa mantém; sem comprovação e com conclusão de não atendimento, registrar — e, se obrigatório,
  "obrigatório não atendido".
- **Migração**: `na_requests` (item, rodada, justificativa, evidência, decisão, autoria);
  `question_reports.nonApplicable` passa a derivar da decisão aceita.
- **Teste de aceite**: NA sem justificativa → 400; NA aceito reduz o denominador; NA recusado
  mantém; obrigatório com NA recusado e sem comprovação → inelegível.

### A14 · Publicação e relatórios finais não existem

**Situação (etapa 2):** aberto (E6).
`frontend/src/app/companies/page.jsx:289` (`/companies/:id/performance-report`) e `:305`
(`/companies/:id/report`) — rotas inexistentes no `next build` (17 rotas, nenhuma das duas).

- **Impacto**: "Extrato Geral" e "Relatório de Auditoria" são links mortos; não há nenhuma tela de
  resultado, rating ou elegibilidade, nem certificado. F6, F7 e F9 não têm onde se materializar.
- **Correção**: construir as telas sobre o resultado calculado (A3), com liberação automática
  (A5) e sem qualquer menção ao certificado externo (F8).
- **Migração**: depende de A3.
- **Teste de aceite**: empresa aprovada e elegível vê resultado, relatório e certificado;
  em preenchimento vê andamento; nenhuma tela menciona envio externo de selo.

### A15 · Administrador edita pontos e textos das alternativas do ciclo em andamento

**Situação (etapa 2): resolvido no essencial.** As cascatas viraram `RESTRICT` e as rotas recusam excluir indicador, alternativa, caderno ou arquivo já usados em avaliação; a edição de alternativas saiu da tela do ciclo. O versionamento publicável do catálogo (rascunho/publicada) é E3.
`frontend/src/app/companies/[id]/page.jsx:255-312` (`EditableAnswerCard`, seletor
`[0,2,4,6,8,10]`) · `backend/src/routes/questions.js` (`PATCH /questions/answer/:questionId/:answerId`,
`PATCH /questions/:id`, `DELETE /questions/:id`).

- **Impacto**: as alternativas são globais e referenciadas por `question_reports.selectedAnswerId`;
  alterar pontos ou texto **muda retroativamente** respostas já dadas e resultados já calculados, em
  todas as empresas. É também o caminho pelo qual uma edição administrativa substitui o
  enquadramento técnico — o que a decisão proíbe. Excluir um indicador apaga em cascata os itens de
  relatório (`ON DELETE CASCADE`).
- **Correção**: catálogo versionado (C2): edição cria nova versão; ciclos em andamento e encerrados
  continuam na versão fixada. Remover a edição de alternativas da tela do ciclo.
- **Migração**: `catalogVersion` em `questions`/`answers` e no ciclo; exclusão passa a ser
  desativação da versão.
- **Teste de aceite**: editar o catálogo não altera o resultado de um ciclo já respondido; ciclo
  novo nasce na versão nova; exclusão não remove itens de relatório existentes.

### A16 · Consultas N+1 nas telas principais

**Situação (etapa 2): parcial.** A listagem do ciclo passou a carregar as coleções em lote e a de empresas em duas consultas; os índices das migrações 005 e 006 entraram.
`backend/src/serializers.js:questionReport` (por item: questão, alternativas, relatório, arquivos,
evidências, autor, emissor) usado por `reports.js:qrList` · `routes/companies.js:listRow`/`detail`
· `routes/reports.js:235`.

- **Impacto**: a listagem de um ciclo de 69 indicadores dispara centenas de consultas; com o
  catálogo real o custo cresce junto. A listagem de empresas faz duas consultas por linha.
- **Correção**: consultas agregadas por relatório (uma por coleção) e projeção por papel —
  o que também é necessário para A9.
- **Migração**: índices em `question_reports(questionId)`, `question_report_files(questionReportId)`,
  `evidences(questionReportId)`, `company_files(companyId)`.
- **Teste de aceite**: número de consultas por listagem constante em relação ao número de itens.

### A17 · Verificações e endurecimentos ausentes

**Situação (etapa 2): parcial.** Resolvidos: CORS por configuração, limite de tentativas (login, recuperação, leads), token de recuperação opaco de uso único, senha atual exigida na troca, sessão revogável, segredos sem valor padrão em produção, bloqueio de executáveis no upload e projeção reduzida de dados pessoais. **Pendentes: ESLint e typecheck** (não existem no projeto; verificação compatível executada = `next build` e a suíte de testes).
- `frontend`: **sem ESLint configurado** — `npm run lint` não verifica nada; sem typecheck.
- `backend/src/app.js:9` — `cors()` sem origem definida.
- `backend/src/routes/auth.js` — sem limite de tentativas em `/auth/login` e
  `/auth/forgotPassword`; o token de redefinição (JWT de 1 h) **não é invalidado** após o uso nem
  após a troca de senha, podendo ser reusado dentro da validade.
- `backend/src/routes/users.js:100-103` — troca da própria senha sem exigir a senha atual.
- `backend/src/routes/leads.js:11` — `POST /leads` público, sem limite de requisições e sem
  validação de formato, gravando dados pessoais.
- Sem revogação de sessão: refresh token de 30 dias sem armazenamento; desativar um usuário
  depende do `deletedAt` (hoje a exclusão também deforma o e-mail: `users.js:127`).
- `routes/companies.js:/companies/:id` e `/users/getUsers/company` devolvem nome, e-mail e CPF de
  todos os usuários da empresa a qualquer membro, inclusive colaborador.
- **Correção/teste**: configurar ESLint; restringir CORS por configuração; limitar tentativas;
  tornar o token de redefinição de uso único; exigir senha atual na troca; validar e limitar
  `/leads`; introduzir usuário ativo/inativo com revogação; reduzir a projeção de dados pessoais.

### A18 · Dados reais de identificação no repositório público

**Situação (etapa 2): pendente de decisão do responsável.** Tarefa registrada **antes de qualquer push** (ver `progresso.md`). Nada foi removido nem reescrito: retirar da versão atual não elimina as versões anteriores já publicadas.
`recon/api/GET_users_page=1_perPage=50.response.json` (17 e-mails corporativos reais e 2 CNPJs),
`GET_users_page=1_perPage5.response.json`, `GET_auth_me.response.json`,
`POST_auth_login.{request,response}.json` (e-mail administrativo real; senhas e tokens já
redigidos por `tools/redact_api.py`).

- **Impacto**: o repositório é público e expõe e-mails corporativos e CNPJs do ambiente de staging.
  Contraria a regra de não publicar dados pessoais no repositório público.
- **Correção**: anonimizar os corpos salvos (estender `tools/redact_api.py` para e-mail, CNPJ, CPF,
  nome e id) ou mover `recon/api` para fora do repositório publicado. **Como envolve reescrita de
  conteúdo já publicado, a decisão é do responsável** — nenhuma remoção foi feita nesta etapa.
- **Teste de aceite**: varredura por e-mail/CNPJ/CPF em `recon/` sem resultados.

### A19 · Progresso e rótulos incorretos na interface

**Situação (etapa 2): resolvido na API.** `answeredQuestions` conta respostas de fato e `totalQuestions` passou a existir; o botão morto saiu da tela de detalhe. Os rótulos de estado sem contrato são revistos com o fluxo em E4.
`backend/src/routes/companies.js:listRow` — `_count.answeredQuestions` conta **todos** os itens do
relatório, não os respondidos (duas empresas com 8 itens cada e nenhuma resposta aparecem como 8).
`frontend/src/app/companies/[id]/page.jsx:596` — condição `['ApprovedByAuditor','RejectedByAuditor']`
nunca ocorre (o servidor grava `Approved`/`Rejected`): botão morto, duplicado pela condição correta
da linha 644. `frontend/src/lib/constants.js` declara estados que o servidor nunca emite
(`Submited`, `WaitingAuditory`, `InRevision`, `Supervising`, `ApprovedByAuditor`…).

- **Impacto**: andamento falso na visão geral (contraria F9) e estados de interface sem contrato.
- **Correção**: contar respostas de fato; alinhar os estados ao contrato real do servidor depois da
  revisão do fluxo.
- **Teste de aceite**: ciclo sem respostas → 0 respondidos; cada rótulo de estado corresponde a um
  estado emitido pelo servidor.

### A20 · Estrutura do indicador não cobre a fonte oficial

**Situação (etapa 2):** aberto (E3).
`backend/src/db.js` (`questions`: `description` único, sem máximo, ODS ou ordem; `answers` sem
posição) · `frontend/src/app/indicators/response-indicator/[id]/page.jsx:206-208` (a descrição é
partida pela busca do literal `"Verificação:"` dentro do texto).

- **Impacto**: a planilha traz indicador, tópico, eixo, ODS, máximo e uma descrição **por
  alternativa**; o modelo atual concentra tudo em um texto livre e depende de um marcador textual
  para exibir a verificação.
- **Correção**: campos próprios (tópico, ODS, máximo, ordem) e descrição por alternativa vinda do
  catálogo; sem parsing de texto na interface.
- **Migração**: junto com A1.
- **Teste de aceite**: nenhuma tela depende de marcador textual; tópico e ODS exibidos a partir do campo.

### A21 · Interface do ciclo sem busca, filtros, agrupamento e modal

**Situação (etapa 2):** aberto (E7).
`frontend/src/app/companies/[id]/page.jsx:581-650` — lista plana (Geral e depois setorial, ordenada
por eixo), sem campo de busca, sem filtros, sem agrupamento e sem destaque do setorial; responder
navega para uma página (`/indicators/response-indicator/[id]`) em vez de abrir modal.

- **Impacto**: contraria a organização aprovada (listagem pesquisável, filtros, agrupamentos,
  resposta em qualquer ordem, modal ao clicar em Responder, destaque do setorial).
- **Correção**: reconstruir a listagem conforme a decisão, ligada aos contratos reais da API; manter
  a rota de página como alternativa acessível.
- **Teste de aceite**: busca, filtro por eixo/estado/caderno e agrupamento operando sobre os 69
  indicadores; modal ao responder; setorial destacado. **Fidelidade visual depende de X2.**

## 6. Hipóteses não confirmadas (não repetir como vulnerabilidade)

| Hipótese | Resultado da verificação |
|---|---|
| `/auth/me` devolve o hash da senha (defeito do sistema antigo) | **Não se aplica ao código atual**: `serializers.user` não expõe `password`; há teste que cobre isso. Era defeito do original. |
| Travessia de caminho no upload | **Não confirmada**: `SAFE_NAME` (`uploads.js:15`) não admite `/` nem `\`, e o download usa `path.basename`. O risco real ali é a ausência de verificação de estado/papel (A7). |
| Modelo de alternativas inadequado para pontos por indicador | **Parcialmente**: `answers.points` e `answers.mandatory` já são por alternativa — a base serve. Faltam ordem, máximo do indicador, ODS e versionamento (A1, A20). |
| Porte da empresa ausente | **Não confirmada**: `companies.size` já usa `MICRO_PEQUENA|MEDIA|GRANDE`, que corresponde aos dois blocos de limiar da planilha. Falta **usar** no cálculo (A3). |
| Catálogo fictício no backend servido como real | Confirmado como seed demonstrativo **declarado** em `seed.js`; não há mock de API nem catálogo fictício no cliente. |

## 7. Migrações necessárias (consolidado)

**Correção da descrição anterior:** nem todas são aditivas. Remover `UNIQUE(companyId)` de
`reports` e trocar as cascatas por `RESTRICT` **exige reconstrução de tabela** no SQLite (não há
`ALTER TABLE` para constraint). A reconstrução preserva dados, ids, relacionamentos, índices e
constraints, roda com `foreign_keys = OFF` dentro de uma transação e só confirma depois de
`PRAGMA foreign_key_check` — e é validada em cópia antes do banco de trabalho
(`npm run db:dry-run`). Constraints necessárias à integridade e à autorização entraram agora, não
em etapa futura.

Ordem aplicada (migrações 001–007 em `backend/src/migrations/`), verificada em cópia do banco:

1. **001_baseline** — base herdada do commit `42ba516` (inócua em banco existente). ✔ aplicada
2. **002_identity** — `user_profiles`, `user_company_links`, `sessions`, `password_resets`,
   `audit_events`, `users.status`, índice único de e-mail sem distinção de caixa; backfill de
   `users.role`/`users.companyId` com marcação de revisão para vínculos de profissionais (A2, A8). ✔
3. **003_company_registration** — situação cadastral, autoria do cadastro, origem (`demo`/`legacy`)
   e unicidade de CNPJ entre empresas não excluídas. ✔
4. **004_cycles** — **reconstrução de `reports`**: sai `UNIQUE(companyId)`, entram número do ciclo,
   `previousReportId`, caderno, versão de catálogo, solicitação e liberação de auditoria, origem e
   revisão; `cycle_professionals` (designações por ciclo). ✔
5. **005_history_integrity** — **reconstrução de `question_reports`, `answers`,
   `question_report_files` e `evidences`**: cascatas que apagavam avaliação viraram `RESTRICT`;
   entram delegação (responsável, quem atribuiu, prazo) e autoria da resposta (A12, A15). ✔
6. **006_indexes** — índices de apoio à autorização e às listagens (A16). ✔
7. **007_rounds** — `cycle_rounds`, `item_answer_versions` e `reports.currentRound`: a versão
   enviada é fotografada na liberação e em cada retorno (A6, F4). ✔

Ainda por fazer: **catálogo oficial versionado** (`maxPoints`, `topic`, `ods`, `position`, nível
mínimo obrigatório, versões rascunho/publicada — E3), **histórico completo de comentários,
transições e pedidos de NA** (E4) e **resultado por eixo, elegibilidade e certificado** (E5/E6).

Regras para todas: migração versionada e idempotente, validada em cópia (`npm run db:dry-run`)
antes do banco de trabalho, sem `DROP` de dados, preservando ids, autoria e datas. Nenhum seed
destrutivo. Backup e restauração: `npm run db:backup`, `npm run db:verify`, `npm run db:restore`.
