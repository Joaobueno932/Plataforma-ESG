# Plataforma ESG-FIEMS — reconstrução

Reconstrução independente do sistema web ESG-FIEMS a partir do ambiente de staging
(`esg-fiems-stg.sfiec.org.br`), cujo código-fonte foi perdido. O visual foi preservado: o
CSS compilado original, as fontes, os ícones e as mídias são reaproveitados e as telas foram
remontadas a partir dos bundles publicados e de capturas de execução (ver `PROGRESS.md`).

```
backend/    API REST (Node 22.13+/24, Express, SQLite nativo `node:sqlite`)
frontend/   Next.js 14 (App Router) + Tailwind + Radix
recon/      evidências da engenharia reversa (capturas REA, bundles, respostas da API)
tools/      scripts de extração e de validação visual (playwright-core)
```

## Executar

```bash
# 1. API — porta 3333 (cria e popula backend/storage/esg.sqlite na primeira execução)
cd backend && npm install && npm start

# 2. Web — porta 3000
cd frontend && npm install && npm run dev       # ou: npm run build && npm start
```

`frontend/.env.local` define `NEXT_PUBLIC_API_URL=http://localhost:3333`. Variáveis da API:
`PORT`, `DB_FILE`, `UPLOADS_DIR`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET`,
`FRONTEND_URL` (troque os segredos JWT fora do ambiente local).

### Usuários de demonstração

| Papel | E-mail | Senha |
|---|---|---|
| Admin | admin@esgdemo.com.br | admin123 |
| Gestor | gestor@esgdemo.com.br | 123456 |
| Funcionário | funcionario@esgdemo.com.br | 123456 |
| Consultor | consultor@esgdemo.com.br | 123456 |
| Auditor | auditor@esgdemo.com.br | 123456 |
| Supervisor | supervisor@esgdemo.com.br | 123456 |

Para recomeçar do zero, pare a API e apague `backend/storage/`.

## Testes

```bash
cd backend && npm test          # 32 testes de API (banco em memória), incl. o ciclo completo do relatório
```

Validação visual: `node tools/shot.js <saida> <steps.json>` (roteiros em `recon/validation/steps-*.json`).

## Funcionalidades

- **Login** com "Lembre-me" (refresh token), "Esqueci a senha" (link gravado em
  `backend/storage/mail-outbox.log`, sem SMTP) e página `/recovery-password`.
- **Empresas**: lista paginada, busca, cadastro (cria o relatório com Caderno Geral + setorial),
  edição e exclusão.
- **Usuários**: lista, busca, cadastro, edição (função e empresa) e exclusão.
- **Indicadores**: cadernos (com capa), assistente de criação de indicador em 3 passos, edição
  e exclusão de indicadores e respostas.
- **Relatório da empresa**: atribuição de responsável, resposta com nível de maturidade, texto,
  anexos e GED, lembretes; validação por Gestor/Consultor; submissão para auditoria; avaliação,
  pedido de complemento e evidências do Auditor; finalização pelo Supervisor.
- **Configurações**: troca de senha; Consultor/Auditor trocam a empresa vinculada.
- **Autoavaliação pública** (`/auto-avaliacao`): dados pessoais, dados da empresa (CNPJ
  validado), 33 perguntas, resultado e resumo; o lead é gravado em `POST /leads`.

## Limitações conhecidas

- O **banco de indicadores real** (64 do Caderno Geral + 10 por caderno) não pôde ser recuperado:
  a API de staging respondia 404/500 para relatórios. O seed traz indicadores demonstrativos.
- As telas **Extrato** (`/companies/:id/performance-report`) e **Relatório Auditoria**
  (`/companies/:id/report`) não existem no build publicado (404 no original) e continuam ausentes.
- Regras marcadas como **[INF]** em `PROGRESS.md` (transições de status, cálculo da avaliação final,
  códigos dos indicadores) foram inferidas do front-end, não observadas.
