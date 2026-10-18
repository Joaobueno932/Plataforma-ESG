# Reconstrução — Plataforma ESG-FIEMS

Registro de progresso da recuperação do sistema a partir do ambiente de staging
(`https://esg-fiems-stg.sfiec.org.br`, API `https://esg-fiems-api-stg.sfiec.org.br`).

**Regra:** somente leitura no ambiente original. Nenhum formulário foi submetido; só login, GETs e abertura/fechamento de modais.

## Legenda de evidência
- **[OBS]** observado em runtime (captura REA `capture_browser_scenario`)
- **[EST]** derivado estaticamente dos bundles JS publicados (REA `analyze_javascript_application` + leitura manual)
- **[INF]** inferido (sem observação direta; staging não permitiu)

## Evidências REA
| Evidence | Conteúdo |
|---|---|
| `ev_ed361001…` | Home/login sem autenticação (screenshot, DOM, rede) |
| `ev_b4b991e4…` | Login + tour Empresas/Indicadores/Usuários/Configurações/Autoavaliação, corpos de rede |
| `ev_c51a460c…` | Deep-links diretos (detalhe da empresa quebra no original), autoavaliação "Seus dados"/"register" |
| `ev_260e7927…` | Navegação SPA: Visualizar / Extrato / Relatório auditoria |
| `ev_7727ab44…` | Modais: Cadastro de Empresa, Novo Caderno, Novo Indicador, Novo/Editar Usuário |
| `ev_32273ec3…` | Detalhe de empresa (Test, CadernoA) — API retorna 404 |
| `ev_b2430f9f…` | Análise estática da árvore `_next/static/chunks` (52 arquivos, 562 módulos) |

Artefatos extraídos: `recon/captures/*` (PNG, DOM, a11y), `recon/api/*` (JSON redigido), `recon/static/*` (bundles), `recon/pretty/*` (bundles formatados).

## Achados
- Frontend original: Next.js 14 App Router, Tailwind + shadcn/radix, react-hook-form/zod, axios, nookies, react-toastify. [EST]
- Backend original: NestJS + Prisma (formato de erro `{message,error,statusCode}`, `_count`). [OBS/INF]
- Auth: `POST /auth/login` → `{access_token, refresh_token, sanitizedUser}`; cookies `token`(1h), `refreshToken`, `userRole`, `userId`, `keepLogged`(30d). [OBS/EST]
- **Bug/segurança no original:** `GET /auth/me` devolve o hash bcrypt da senha. [OBS] (não reproduzido)
- **Staging quebrado:** `GET /companies/:id` → 404 "company not found" para todas as empresas; detalhe/relatório não carregam. [OBS]
- Rotas `/companies/:id/performance-report` e `/companies/:id/report` não existem neste build (404). [OBS]
- Deep-link direto em `/companies/:id` gera "Application error" no original. [OBS]
- Cadernos (setores A–H + Geral) vêm de `GET /sectors`; indicadores têm `section` ("All" = Caderno Geral). As empresas "CadernoA…H" do staging são apenas empresas de teste. [EST]
- Rotas adicionais descobertas via payload RSC: `/indicators/create-answers`, `/indicators/response-indicator/[id]`, `/auto-avaliacao/{response,feedback,resume}`. [EST]
- Textos de `/auto-avaliacao/response` e `/resume` são renderizados no servidor; capturados por REA (`ev_926dd0dc…`, `ev_700aa35f…`). [OBS]

## Módulos
| # | Módulo | Status |
|---|---|---|
| 0 | Reconhecimento (telas, rotas, API) | ✅ concluído |
| 1 | Scaffold backend + frontend, assets originais | ✅ Express+node:sqlite / Next 14; CSS, fontes, ícones e mídias originais |
| 2 | Auth (login, me, refresh, esqueci senha, trocar senha) + shell | ✅ 7 testes API; login/Configurações comparados por screenshot (REA `ev_956995d1…`) |
| 3 | Empresas (lista, busca, paginação, cadastro, edição, remoção) | ✅ 5 testes API; fluxo UI validado (recon/validation/v02_companies) |
| 4 | Usuários (lista, busca, cadastro, edição, remoção, troca empresa) | ✅ 5 testes API; fluxo UI validado (recon/validation/v03_users) |
| 5 | Indicadores/Cadernos (setores, cadastro de caderno e indicador) | ✅ 5 testes API; assistente de 3 passos validado (recon/validation/v04_indicators) |
| 6 | Detalhe da empresa / relatório / respostas / auditoria [INF parcial] | ✅ teste do ciclo completo (6 papéis); UI validada para Gestor, Funcionário, Admin e Auditor (v05_workflow, v07_audit) |
| 7 | Autoavaliação pública + leads | ✅ fluxo completo validado, lead persistido (v06_auto) |
| 8 | Configurações (troca de senha, troca de empresa) + recuperação de senha | ✅ validado (v01_login, v08_reset) |

## Decisões e limitações
- Banco de indicadores real **não recuperável** (staging: `GET /reports/:id` → 404, `/reports/company/questions/:id` → 500). Seed usa indicadores demonstrativos marcados no `backend/src/seed.js`. [INF]
- Senhas do ambiente original não são reutilizadas; seed local: `admin@esgdemo.com.br / admin123` e um usuário por papel (`*@esgdemo.com.br / 123456`). Domínio `.com.br` porque o regex de e-mail do original só aceita TLD de 2–3 letras.
- `/auth/me` reconstruído **não** devolve hash de senha (correção deliberada do vazamento observado).
- E-mail de "Esqueci a senha": sem SMTP local; o link vai para `backend/storage/mail-outbox.log`. [INF]
- O CSS compilado original (Tailwind 3.3.3) é incluído integralmente; ícones identificados por assinatura de path SVG contra `react-icons`; ícones Iconify embutidos offline.
- Regras inferidas [INF]: resposta → `PendingValidationByManager`; validação → `Approved/RejectedBy{Manager,Consultor}`; submissão exige todos aprovados e leva relatório e itens a `Auditing`; auditor → `Approved/Rejected/PendingRevision`; complemento volta a `Auditing`; supervisor finaliza → `Audited` com avaliação = nível médio das respostas aplicáveis; código do indicador `CG-E01`/`A-S02`.
- `/recovery-password` não existe no build original (o layout já a previa); criada com o visual do login. [INF]
- "Não se aplica" na resposta: o original enviava lembrete vazio (rejeitado); agora envia o texto "Não se aplica".

## Achados sobre o original (para conhecimento)
- `GET /auth/me` e `GET /users` expõem o hash bcrypt das senhas. [OBS]
- `GET /companies/:id`, `/reports/:id` e `/reports/company/questions/:id` quebrados no staging (404/500). [OBS]
- Deep-link direto para `/companies/:id` gera "Application error". [OBS]
- Datas `accessDate` gravadas em UTC aparecem um dia antes (ex.: Jul 22 → "Jul 21"); comportamento mantido. [OBS]

## Verificação final
- `backend`: `npm test` → 32/32 aprovados.
- `frontend`: `next build` → 17 rotas + middleware compiladas sem erros.
- Banco local reinicializado com o seed de demonstração ao final.
