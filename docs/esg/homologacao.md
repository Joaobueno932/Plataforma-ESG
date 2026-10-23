# Preparação para homologação — Prompt 8

Estado: **pronto para homologação**. Isso **não** é "aprovado em homologação": a aprovação de
negócio depende da validação da FIEMS com os perfis reais, e há pré-requisitos externos
listados no fim. Nenhum deploy, push, merge ou alteração de ambiente externo foi feito nesta etapa.

## 1. Executar

### Local (desenvolvimento)

```bash
docker compose up -d mysql            # ou use um MySQL 8 já instalado (DB_* no backend/.env)
cd backend && npm install && npm run migrate && npm start      # API em :3333
cd frontend && npm install && npm run dev                      # web em :3000
```

### Ambiente completo em containers (homologação isolada)

```bash
docker compose up -d --build          # mysql :3307, api :3333, web :3001 — todos com healthcheck
docker compose ps
```

As URLs são configuráveis (`FRONTEND_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`). Os domínios
`esg.csifiems.com.br` e `hm-esg.csifiems.com.br` foram **propostos** no chamado de
infraestrutura; DNS, TLS, credenciais e servidor **não** estão confirmados e nada foi presumido.

## 2. Variáveis de ambiente (nomes, sem valores)

| Grupo | Variáveis |
|---|---|
| Execução | `NODE_ENV`, `PORT`, `FRONTEND_URL`, `CORS_ORIGINS`, `TRUST_PROXY` |
| Banco | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_NAME_TEST`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_SIZE`, `RUN_MIGRATIONS`, `SEED_ON_EMPTY` |
| Segredos (obrigatórios em produção) | `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| Sessão | `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `RESET_TOKEN_TTL` |
| Limites | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `UPLOAD_RATE_MAX`, `MAX_COMPANY_FILE_BYTES`, `MAX_COVER_BYTES` |
| Armazenamento | `STORAGE_DIR`, `UPLOADS_DIR`, `BACKUPS_DIR`, `STATIC_DIR` |
| E-mail | `MAIL_TRANSPORT` (sem SMTP configurado, links vão para `storage/mail-outbox.log`) |
| Backup | `MYSQL_CLIENT`, `MYSQL_BIN_DIR`, `MYSQL_CONTAINER` |
| Transferência | `LEGACY_SQLITE_FILE` |
| Web | `NEXT_PUBLIC_API_URL` |

Em `NODE_ENV=production` a API não sobe sem segredos, banco e `CORS_ORIGINS`.

## 3. Migrações

`backend/src/migrations/mysql/`: `001_baseline` (31 tabelas), `002_workflow` (fluxo e versões),
`003_publication` (publicação). Aplicadas na subida (`RUN_MIGRATIONS=true`) ou por
`npm run migrate`; registradas em `schema_migrations`; só adições após a base. Base SQLite
anterior: `npm run db:transfer` (sobre cópia; ver README).

## 4. Armazenamento de arquivos

`STORAGE_DIR/uploads/companyFiles/<empresa>/` (evidências e documentos), `STORAGE_DIR/publications/<ciclo>/<publicação>/`
(relatórios). Nada disso é servido por URL pública: todo download passa por autenticação e
autorização na hora do pedido. No compose, o volume `api-storage` guarda essa pasta.

## 5. Documentos

Gerados automaticamente na aprovação do supervisor (ver `publicacao.md`). Sem modelo oficial,
o certificado fica registrado e o documento aguarda o modelo — nada é inventado.

## 6. Backup e restauração (banco **e** arquivos)

```bash
npm run db:backup                         # storage/backups/esg-<data>/ : database.sql + files/ + manifest.json (SHA-256)
npm run db:verify                         # integridade + todo arquivo citado no banco está no backup
npm run db:dry-run                        # restaura banco e arquivos em área de ensaio e compara
npm run db:restore -- <pasta> --confirm   # restaura no ambiente de trabalho
```

Executado no banco de trabalho (MySQL nativo): backup de 318 KiB, ensaio com todas as contagens
preservadas e 77 chaves estrangeiras na cópia. Coberto por teste com arquivo real, restauração
conferida por hash e detecção de arquivo adulterado (`test/backup.test.js`).

## 7. Roteiro de aceite por perfil

| Perfil | Roteiro |
|---|---|
| Administração | cadastrar empresa (CNPJ inválido e duplicado recusados) → cadastrar gestor, colaborador, consultor, auditor e supervisor com vínculos → designar auditor e supervisor no ciclo → (após solicitação do gestor) liberar para auditoria → tentar aprovar (deve ser recusado) → catálogo: nova edição, caderno novo, indicador com cores, publicar |
| Gestor | ver "Meu ciclo" → delegar indicador ao colaborador com prazo → responder, salvar rascunho e enviar → revisar (aprovar/devolver) → solicitar auditoria → tentar retornar processo (não há ação) → após aprovação, ver resultado e baixar relatório |
| Colaborador | ver só os indicadores atribuídos → responder com evidência → tentar abrir indicador alheio por endereço (recusado) |
| Consultor | responder e anexar pela empresa vinculada → revisar → abrir pendência de orientação → retornar processo com motivo |
| Auditor | avaliar (enquadrar acima/abaixo, não atendido), decidir "não se aplica", pedir complemento (empresa continua bloqueada), concluir |
| Supervisor | consultar declaração × enquadramento → aprovar → ver documentos liberados |

## 8. Validação executada

| Verificação | Comando | Resultado |
|---|---|---|
| Testes da API (inclui percurso de homologação, segurança e backup) | `cd backend && npm test` | **173/173** |
| Build da interface | `cd frontend && npm run build` | sem erro |
| Lint / typecheck | — | **não existem no projeto** (diagnóstico A17); verificação equivalente: build do Next + testes |
| Inspeção visual das telas novas | `node tools/visual-cycle.js` | 20 capturas, 0 erros de console/HTTP |
| Regressão dos módulos antigos | `node tools/visual-pages.js` | 16 capturas (3 perfis × desktop/celular), sem erro e sem rolagem horizontal; 2 ajustes de celular feitos |
| Backup/restauração | `npm run db:dry-run` | dados e vínculos preservados |
| Dados reais no repositório | `node tools/anonymize_recon.js --check` e `node tools/redact_names_check.js` | 0 ocorrências na árvore atual |

## 9. Correções desta etapa

- Rota de recertificação: `POST /reports/company/:id/cycles` (Administração), novo ciclo ligado ao anterior.
- `trust proxy` deixava qualquer cliente escolher o próprio IP e escapar do limite de tentativas → configurável (`TRUST_PROXY`), padrão sem proxy.
- Limite de tentativas acumulava janelas vencidas para sempre → limpeza periódica.
- Envio de arquivo sem limite por pessoa → `UPLOAD_RATE_MAX`.
- Corpo JSON grande demais e erros de envio respondiam 500 → 413/400.
- Cabeçalhos de segurança na API (nosniff, frame, referrer, CSP para JSON, HSTS em produção).
- Backup só do banco, e no cliente errado quando o banco é nativo → backup com arquivos, manifesto e escolha do cliente.
- Dados reais em `recon/` (17 pessoas, 2 empresas, 172 capturas de tela) → anonimizados na árvore atual; capturas saíram do versionamento (continuam só na máquina local).
- Celular: cabeçalhos das listas de empresas e pessoas e campo de busca.

## 10. Tabela final

| # | Requisito | Comportamento implementado | Validação executada | Resultado | Pendência |
|---|---|---|---|---|---|
| ACE01 | Cadastro de empresa; CNPJ duplicado recusado; histórico | cadastro completo, CNPJ validado e único entre ativos, alteração na trilha | `e2e.test.js`, `companies.test.js` | aprovado nos testes | — |
| ACE02 | Isolamento entre empresas | escopo por vínculo em tela, endereço, arquivo, busca, pendências | `authz.test.js`, `e2e.test.js` | aprovado nos testes | — |
| ACE03 | Profissional com várias empresas; remover vínculo retira acesso | vínculos múltiplos; remoção encerra sessões | `e2e.test.js`, `users.test.js` | aprovado nos testes | — |
| ACE04 | Conta inativa; recuperação; perfil não vem do navegador | perfis lidos do banco a cada requisição; recuperação de uso único | `auth.test.js`, `e2e.test.js` | aprovado nos testes | envio real de e-mail sem SMTP |
| ACE05 | Geral + só o setorial; troca de caderno não altera ciclo concluído | ciclo congela caderno e versão | `e2e.test.js`, `catalog.test.js` | aprovado nos testes | — |
| ACE06 | Níveis e pontos do indicador; zero ponto não engana | alternativas próprias por indicador; mínimo por ordem | `scoring.test.js` | aprovado nos testes | — |
| ACE07 | NA com justificativa e decisão | pedido com justificativa + evidência; decisão do auditor | `workflow.test.js`, `scoring.test.js` | aprovado nos testes | — |
| ACE08 | Obrigatório não atendido bloqueia; painel mostra a causa | impedimentos no resultado e na aba Resultado | `publication.test.js`, inspeção visual | aprovado nos testes | — |
| ACE09 | Limites 39,99/40/59,99/60/79,99/80 (30 se aprovado) | faixas com precisão inteira; duas políticas | `scoring.test.js` | aprovado nos testes | ratificação do limite de 30% pela FIEMS |
| ACE10 | Denominador zero; sem resposta distinguível | sem faixa automática; motivos no resultado | `scoring.test.js` | aprovado nos testes | — |
| ACE11 | Versões e autoria; auditor não altera declaração | versão por envio, revisão e decisão presas à versão | `workflow.test.js` | aprovado nos testes | — |
| ACE12 | Pendência com indicador e responsável; Iniciante não reprova | pendências tipadas com histórico; prazo não altera pontuação | `pendings.test.js` | aprovado nos testes | regra de "encerramento depende de tratamento" além do registro de situação: a definir com a FIEMS |
| ACE13 | Relatório reproduz dados; preliminar × matemático × decisão separados | relatório do resultado gravado; abas separadas | `publication.test.js`, PDF inspecionado | aprovado nos testes | modelo oficial do relatório |
| ACE14 | Atribuições; devolução preserva decisões | matriz de autorização; retorno com rodada | `workflow.test.js`, `authz.test.js` | aprovado nos testes | — |
| ACE15 | Catálogo novo não altera avaliação; recertificação | versões congeladas; novo ciclo ligado | `catalog-editor.test.js`, `e2e.test.js` | aprovado nos testes | — |
| ACE16 | Backup recupera tudo; celular e teclado | backup com arquivos e manifesto; telas responsivas e navegáveis por teclado | `backup.test.js`, `db:dry-run`, `visual-*.js` | aprovado nos testes | ensaio no servidor de homologação (indisponível) |

## 11. Pré-requisitos externos não fornecidos

- Servidor, DNS, TLS e credenciais de homologação/produção.
- SMTP para recuperação de senha por e-mail.
- Modelo oficial do certificado/selo e do relatório; autoridade signatária, se houver.
- Ratificação da política de faixas (30% para micro e pequenas).
- HTML aprovado `ESG_FIEMS_Indicadores_Preview.html` e imagem de referência dos cards (ver `interface.md`).
- **Histórico do git**: os commits anteriores ainda contêm os dados reais de `recon/` e as capturas
  de tela. Reescrever o histórico publicado exige autorização explícita do responsável.
