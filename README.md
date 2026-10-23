# Plataforma ESG-FIEMS — reconstrução

Reconstrução independente do sistema web ESG-FIEMS a partir do ambiente de staging
(`esg-fiems-stg.sfiec.org.br`), cujo código-fonte foi perdido. O visual foi preservado: o
CSS compilado original, as fontes, os ícones e as mídias são reaproveitados e as telas foram
remontadas a partir dos bundles publicados e de capturas de execução (ver `PROGRESS.md`).

```
backend/    API REST (Node 22.13+/24, Express, MySQL 8.4 via mysql2)
frontend/   Next.js 14 (App Router) + Tailwind + Radix
recon/      evidências da engenharia reversa (capturas REA, bundles, respostas da API)
tools/      scripts de extração e de validação visual (playwright-core)
```

## Executar

O ambiente roda em containers; o `docker-compose.yml` sobe banco, API e interface:

```bash
docker compose up -d --build        # mysql (3307) + api (3333) + web (3001)
docker compose ps                   # os três devem aparecer "healthy"
docker compose logs -f api
docker compose down                 # para tudo, preservando o volume do banco
```

As portas publicadas fogem das usuais (3307 e 3001) para não conflitar com serviços já
instalados na máquina; `MYSQL_PORT`, `API_PORT` e `WEB_PORT` mudam isso.

Para desenvolver fora do container, basta o banco em container:

```bash
docker compose up -d mysql                       # banco em 127.0.0.1:3307
cd backend  && npm install && npm start          # API  — porta 3333
cd frontend && npm install && npm run dev        # web  — porta 3000
```

A API não cria mais arquivo de banco: ela conecta no MySQL configurado por `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` (ver `backend/.env.example`), aplica as
migrações pendentes na subida e popula o seed de demonstração **apenas se o banco estiver
vazio**. Os testes usam a base separada `plataforma_esg_test`.

`frontend/.env.local` define `NEXT_PUBLIC_API_URL=http://localhost:3333`. A API é configurada por
ambiente (`NODE_ENV`): em `development`/`test` há segredos locais de conveniência; em `production`
ela **não sobe** sem `JWT_SECRET`, `JWT_REFRESH_SECRET` e `CORS_ORIGINS`. Variáveis documentadas em
`backend/.env.example`.

### Catálogo oficial de indicadores

```bash
cd backend
npm run catalog -- preview "<planilha.xlsx>"              # valida e mostra o relatório
npm run catalog -- import  "<planilha.xlsx>" "oficial-X"  # grava como rascunho
npm run catalog -- versions
npm run catalog -- publish "oficial-X" --acknowledge      # confirmação administrativa
```

O catálogo é **versionado**: a importação cria uma versão em rascunho, com relatório de erros,
divergências e conferências; a publicação é uma ação administrativa. Cada avaliação fixa a
versão com que foi aberta, então publicar uma versão nova não altera respostas, critérios nem
resultados de ciclos anteriores. O catálogo demonstrativo fica isolado na versão `legacy-demo`.

Conferência da planilha contra os cadernos oficiais em PDF (somente leitura):

```bash
python tools/catalog_crosscheck.py "<planilha.xlsx>" "Cadernos indicadores"
```

Resultado da importação atual e pendências: `docs/esg/importacao-catalogo.md`.

### Banco de dados e migrações

```bash
cd backend
npm run db:backup     # dump consistente em storage/backups/ (mysqldump --single-transaction)
npm run db:verify     # confere o dump e compara as contagens com o banco
npm run db:dry-run    # restaura o dump em base temporária e compara as contagens
npm run migrate       # aplica as migrações pendentes
npm run db:restore -- storage/backups/<arquivo>.sql --confirm
```

As migrações ficam em `backend/src/migrations/mysql/` e são aplicadas também na subida do
servidor, registradas em `schema_migrations`. O esquema nasce consolidado em
`mysql/001_baseline.js` (31 tabelas, equivalente ao histórico 001–010 da base SQLite anterior).

Particularidades do dialeto: MySQL não tem índice parcial, então a unicidade condicional usa
colunas geradas (`companies.cnpjActive`, `users.emailNormalized`) — CNPJ e e-mail são únicos
**entre os cadastros ativos**, e um cadastro inativado libera o valor.

#### Transferir a base SQLite anterior

```bash
npm run db:transfer                           # ensaio: lê a origem, confere, não grava
npm run db:transfer -- --apply                # grava no MySQL configurado
npm run db:transfer -- --apply --truncate --confirm   # limpa o destino antes
```

A transferência trabalha sobre uma **cópia** do arquivo herdado (a origem nunca é alterada),
aplica nela o histórico SQLite congelado (`backend/src/migrations/sqlite/`) e copia tabela por
tabela na ordem das chaves estrangeiras, preservando ids, autoria e datas. Referências
circulares (`questions.mandatoryAnswerId`) e autorreferências (`reports.previousReportId`,
`company_files.replacesFileId`) são preenchidas no fim, em uma transação. Colunas que só
existem na origem são relatadas e ignoradas; nada é inventado.

### Usuários de demonstração

Criados pelo seed **apenas quando o banco está vazio** (bancos já existentes conservam as senhas
que tinham). Senha mínima de 8 caracteres, exigida pela API.

| Perfil | E-mail | Senha | Vínculos |
|---|---|---|---|
| Administração | admin@esgdemo.com.br | admin123 | — (alcance global) |
| Gestor | gestor@esgdemo.com.br | esgdemo123 | Empresa Demonstração |
| Colaborador | funcionario@esgdemo.com.br | esgdemo123 | Empresa Demonstração |
| Consultor | consultor@esgdemo.com.br | esgdemo123 | Empresa Demonstração + Indústria Exemplo |
| Auditor | auditor@esgdemo.com.br | esgdemo123 | Empresa Demonstração (designado no ciclo 1) |
| Supervisor | supervisor@esgdemo.com.br | esgdemo123 | Empresa Demonstração (designado no ciclo 1) |
| Gestor (2ª empresa) | gestor.exemplo@esgdemo.com.br | esgdemo123 | Indústria Exemplo |
| ADMIN + CONSULTOR | admin.consultor@esgdemo.com.br | esgdemo123 | Indústria Exemplo (único acúmulo permitido) |

Para recomeçar do zero no ambiente local: `docker compose down -v` (apaga o volume do banco) e
suba de novo. **Dados reais devem ser migrados, não recriados**: use `npm run db:backup`,
`npm run db:dry-run` e `npm run db:transfer`.

## Testes

```bash
docker compose up -d mysql      # os testes exigem o banco no ar
cd backend && npm test          # 123 testes na base plataforma_esg_test: auth e sessões,
                                # autorização e negações, empresas, pessoas/perfis/vínculos,
                                # catálogo e importação, fluxo do ciclo, pontuação por eixo,
                                # histórico SQLite congelado e transferência para o MySQL
```

A base de testes é limpa a cada arquivo de teste (`schema_migrations` é preservada) e
`--test-concurrency=1` evita que dois arquivos disputem o mesmo banco.

Não há ESLint nem typecheck configurados no projeto (ver `docs/esg/diagnostico.md` A17); as
verificações compatíveis são `npm test` no backend e `npm run build` no frontend.

Validação visual: `node tools/shot.js <saida> <steps.json>` (roteiros em `recon/validation/steps-*.json`).

## Regras de acesso (resumo)

- **Identidade, perfil e vínculo são separados.** Perfis são concedidos pela Administração
  (`user_profiles`); o acesso a uma empresa vem de um vínculo vigente (`user_company_links`);
  auditor e supervisor precisam ainda de **designação no ciclo** (`cycle_professionals`).
- Usuário da empresa tem **uma** empresa; consultor, auditor e supervisor podem ter **várias** e
  escolhem o contexto em `PATCH /auth/context` (apenas entre vínculos vigentes — a troca não cria
  nem amplia acesso).
- **Colaborador vê e responde somente os indicadores atribuídos a ele**, inclusive por id direto,
  arquivo, download e exportação.
- O único acúmulo permitido é **ADMIN + CONSULTOR**; o perfil ADMIN **não aprova** respostas,
  parecer, aplicabilidade nem resultado.
- **Solicitar auditoria** é do gestor; **liberar o processo** é da Administração FIEMS (operacional).
  Depois da liberação, respostas e anexos ficam bloqueados; a empresa pede o retorno e **consultor
  ou Administração** retornam o processo, preservando a versão enviada.
- A matriz implementada é publicada em `GET /admin/permissions`; registros legados a conferir, em
  `GET /admin/review`; a trilha de autoria, em `GET /admin/events`.

Detalhes e origem de cada regra: `docs/esg/regras.md`.

## Funcionalidades

- **Login** com "Lembre-me" (refresh token) e **sessão revogável** (`POST /auth/logout`: o token
  deixa de valer). "Esqueci a senha" usa **link de uso único** gravado em
  `backend/storage/mail-outbox.log` (**sem SMTP: a recuperação por e-mail não está pronta**) e a
  página `/recovery-password`.
- **Empresas**: lista paginada escopada por vínculo, busca por razão social/nome fantasia/CNPJ,
  filtros por porte, caderno e situação, cadastro com **CNPJ validado** (dígitos verificadores,
  texto sem máscara) que abre o **ciclo 1** com caderno e versão de catálogo congelados, edição com
  histórico e **inativação** (preserva avaliações e arquivos).
- **Pessoas**: lista, busca, cadastro, edição, **perfis concedidos**, **vínculos múltiplos** para
  profissionais e **inativação com histórico** (nada é apagado; o último administrador ativo é
  protegido).
- **Indicadores**: cadernos (com capa), **importação do catálogo oficial** (prévia, validação,
  relatório, rascunho e publicação), assistente de criação de indicador em 3 passos com níveis
  vindos da versão em vigor, edição e exclusão restritas a rascunhos e ao catálogo de
  demonstração (versão publicada é imutável).
- **Relatório da empresa**: atribuição de responsável, resposta com nível de maturidade, texto,
  anexos e GED, lembretes; validação por Gestor/Consultor; submissão para auditoria; avaliação,
  pedido de complemento e evidências do Auditor; finalização pelo Supervisor.
- **Meu perfil / Configurações**: dados do próprio usuário e perfis ativos, troca de senha
  (exige a senha atual) e seleção da **empresa em contexto** entre os vínculos vigentes.
- **Autoavaliação pública** (`/auto-avaliacao`): dados pessoais, dados da empresa (CNPJ
  validado), 33 perguntas, resultado e resumo; o lead é gravado em `POST /leads`.

## Limitações conhecidas

- O **catálogo oficial** (59 indicadores do Caderno Geral + 10 por caderno setorial = 139) é
  importado da planilha oficial e fica versionado. A versão importada permanece **em rascunho**
  enquanto a descrição e a orientação de verificação dos indicadores não tiverem fonte confiável
  (`docs/esg/importacao-catalogo.md`). O seed segue com indicadores demonstrativos na versão
  `legacy-demo`, usada apenas pelos ciclos de demonstração.
- As telas **Extrato** (`/companies/:id/performance-report`) e **Relatório Auditoria**
  (`/companies/:id/report`) não existem no build publicado (404 no original) e continuam ausentes.
- Regras marcadas como **[INF]** em `PROGRESS.md` foram inferidas do front-end; as que valem agora
  estão em `docs/esg/regras.md`, com origem e critério de aceite.
- O **cálculo por eixo** (pontos ÷ máximo aplicável), a elegibilidade por obrigatórios e o
  rating por porte já estão implementados em um único motor (`backend/src/scoring/`), com a
  versão da regra gravada junto do resultado. A **publicação automática** do resultado, o
  relatório e o certificado FIEMS são a etapa E6 de `docs/esg/progresso.md`.
- **"Não se aplica"** já é decisão exclusiva do auditor designado, mas o pedido com justificativa e
  evidência e o registro de aceite/recusa entram em E4.
- Sem ESLint e sem typecheck no projeto.
