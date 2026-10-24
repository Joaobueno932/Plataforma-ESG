# Testes de carga, estresse e tolerância a falhas

Ambiente **isolado** de carga: nada foi executado contra produção nem contra a base de trabalho.

## Infraestrutura e referência

| Item | Valor |
|---|---|
| Máquina | Intel i7-11390H (4 núcleos / 8 threads), 15,7 GB RAM, Windows 11 |
| Docker | 8 CPUs, 8 GB disponíveis |
| API | container `esg-api-load` (porta 3340), `NODE_ENV=production`, cluster `WEB_CONCURRENCY=4`, pool de 10 conexões por processo |
| Banco | MySQL 8.4 (container `esg-mysql`), base `plataforma_esg_load`, buffer pool 128 MB, `max_connections` 200 |
| Massa | 60 empresas fictícias, 199 usuários `@carga.invalid`, 4.140 indicadores (`tools/load/seed.js`) |
| Gerador | `tools/load/runner.js` na mesma máquina (máx. 36% de CPU medido; não foi gargalo) |
| Commit de referência | `5c11163` + alterações deste pacote |

Perfil: gestor 45%, colaborador 25%, consultor 20%, auditor 5% e admin 5%, com pausa de 1 a 3 s entre as ações. Inclui login, lista, abertura de indicador, rascunho, envio, upload, download e revisão.
O 401, o 403 e o 409 que vêm de regras de negócio (sessão revogada, empresa em auditoria, controle de versão) são contados à parte; não entram como erro.

Reproduzir: `docker compose -f tools/load/docker-compose.load.yml up -d`, `node tools/load/seed.js`, `node tools/load/sampler.js <nome>` e `node tools/load/runner.js tools/load/plans/<plano>.json <nome>`.

## Carga progressiva — antes × depois

| VUs | Antes (1 processo, lista completa) | Depois (lista resumida + 4 processos) |
|---|---|---|
| 100 | 70,6 req/s · leitura p95 70 ms | 74,8 req/s · leitura p95 43 ms |
| 250 | 164 req/s · leitura p95 290 ms · escrita p95 340 ms | 179 req/s · leitura p95 100 ms · escrita p95 165 ms |
| 500 | 148 req/s (throughput **caiu**) · leitura p95 3,0 s | 307 req/s · leitura p95 835 ms |

Erros inesperados: 0% depois da correção do roteiro. O 1% medido antes era de 403 em download, causado pelo próprio roteiro de carga, não pela API.

Em 500 VUs a máquina satura: API em 386% de CPU, MySQL em 359%. **500 VUs não é saudável neste hardware**; a maior carga saudável medida é de 250 VUs.

## Carga sustentada — 30 min com 250 VUs

| Métrica | Valor |
|---|---|
| Throughput | ~190 req/s |
| Erros inesperados | 0% |
| Leitura p50 / p95 / p99 | 26 / 105 / 228 ms |
| Escrita p50 / p95 / p99 | 44 / 166 / 333 ms |
| CPU | API média 130% (pico 300%); MySQL 250–290% |
| Conexões MySQL | 42; nenhum deadlock |
| Memória por processo | 127–254 MB → estável em ~255 MB |
| Recuperação (10 VUs) | lista p95 44 ms |

Ciclos completos sob carga: 8 ciclos aprovados, com geração do relatório em p50 de 1,4 s e p95 de 2,2 s; os 8 PDFs foram gerados e baixados.

## Pico — 50 → 250 → 50 VUs

| Pico 250 VUs | Antes | Depois (bcrypt nativo) |
|---|---|---|
| Login p50 / p95 | 3,6 / 5,7 s | 2,4 / 3,2 s |
| Atraso máx. do event loop | 594 ms | 230 ms |
| Erros inesperados | 0% | 0% |
| Recuperação | imediata | imediata |

## Estabilidade prolongada — 60 min com 150 VUs

Plano `tools/load/plans/estabilidade.json`: 150 VUs (cerca de 60% do patamar sustentado), quatro blocos de 15 min e recuperação com 10 VUs.

| Bloco | req/s | Lista p50/p95/p99 | Abrir item | Rascunho | Upload | Pessoas (`/users`) | Erros inesperados |
|---|---|---|---|---|---|---|---|
| 0–15 min | 116,1 | 20/45/116 ms | 20/44/123 | 29/63/147 | 66/103/215 | 110/185/319 | 1 |
| 15–30 min | 115,5 | 23/78/162 | 24/83/199 | 34/128/307 | 70/165/338 | 124/342/500 | 9 |
| 30–45 min | 116,3 | 19/41/108 | 20/42/124 | 28/57/135 | 64/95/183 | 104/174/268 | 5 |
| 45–60 min | 116,0 | 20/42/113 | 21/44/124 | 29/61/152 | 65/96/189 | 105/169/287 | 56 |
| Recuperação (10 VUs) | 12,4 | 25/34/46 | 28/34/36 | 26/36/74 | 64/79/91 | 89/112/112 | 0 |

| Minuto | Memória API (`docker stats`) | CPU API | CPU MySQL | Anexos em disco |
|---|---|---|---|---|
| 1 | 444 MB | 102% | 203% | 84 MB |
| 15 | 809 MB | 39% | 35% | 284 MB |
| 30 | 856 MB | 56% | 46% | 497 MB |
| 45 | 975 MB | 42% | 36% | 713 MB |
| 60 | 1.039 MB | 45% | 56% | 927 MB |

CPU média/máxima: API 58%/341%, MySQL 51%/218%. Não houve deadlocks e as conexões ficaram estáveis em 41.

### Investigação: anexos, memória e latência

**Memória: não é vazamento.** O `docker stats` subiu junto com o disco, mas o `memory.stat` do container no fim mostrou o heap dos processos (`anon`) em 854 MB, cerca de 200 MB por processo, o mesmo patamar do teste sustentado. O cache de arquivos do kernel estava em 927 MB (`file`), formado pelos anexos gravados. Com a API ociosa, cada processo ficou com RSS entre 249 e 269 MB.

**Anexos × latência: sem correlação.** Os anexos cresceram de forma contínua, de 84 para 927 MB, enquanto o p95 da lista foi de 45 para 78, depois 41 e 42 ms. A latência subiu e voltou, sem acompanhar o volume. A alta também atingiu `/auth/me` e as pendências, que não leem anexos.

Na base final havia 18.873 arquivos, com média de 5,4 por item e máximo de 203 (acúmulo artificial do roteiro). `EXPLAIN ANALYZE` da consulta de anexos do item:
- usa o índice `idx_qrf_item` e a busca pela chave primária em `company_files`;
- custa 69 ms no item com 203 anexos;
- é proporcional ao número de anexos do item, ou seja, crescimento normal de dados.

A busca `company_files WHERE companyId = ? AND url = ?` lê até cerca de 900 linhas por empresa. Ela fica num caminho legado (`filesToCreate`) e a rota manteve p95 estável, então não foi alterada, por falta de evidência de impacto.

**Causa real: `GET /users`, gargalo de consulta.** Durante a estabilidade houve 19 respostas "Queue limit reached" (503), com rajadas de até 7 no mesmo instante. A maior rajada caiu no bloco de 15 a 30 min, o único com CPU mais alta na API e no MySQL (média de 71% contra 58%) com o mesmo throughput.

No mesmo período, as esperas de bloqueio do InnoDB foram desprezíveis: no máximo 3, somando 166 ms. A rota carregava todos os usuários (199), serializava cada um com 4 a 5 consultas em paralelo (perfis, vínculos, empresa e ciclo) e só depois paginava, devolvendo 5. Isso dava cerca de 1.000 pedidos de conexão por chamada, contra um pool de 10 e uma fila de 200. A fila estourava e derrubava também as requisições de outras rotas no mesmo processo.

Reprodução isolada: com 10 chamadas simultâneas, 113 de 200 respostas foram 503.

**Correção:** a rota pagina antes de serializar (`backend/src/routes/users.js`). O formato não muda e as respostas são idênticas campo a campo. O teste de regressão fica em `backend/test/list-summary.test.js`.

| `/users` isolado | Antes | Depois |
|---|---|---|
| Sequencial p50/p95 | 83/176 ms | 30/72 ms |
| 10 simultâneas p50/p95/p99 | 69/195/341 ms | 46/97/171 ms |
| 503 | 113/200 | 0/200 |

Repetição sob carga, 15 min com 150 VUs, sobre a base já crescida (1,2 GB de anexos):

| Bloco de 15 min | Antes (0–15 min) | Depois |
|---|---|---|
| req/s | 116,1 | 116,4 |
| Erros inesperados | 1 (+5 503 ao longo da hora) | **0**, nenhum 503 no log |
| Pessoas p50/p95/p99 | 110/185/319 ms | **24/53/124 ms** |
| Lista p50/p95/p99 | 20/45/116 ms | 23/50/135 ms |
| Rascunho p50/p95/p99 | 29/63/147 ms | 38/78/173 ms |

As demais rotas ficaram 5 a 15 ms mais lentas no p95 na repetição. Duas diferenças podem explicar isso, mas nenhuma foi medida:
- a base estava maior: 1,2 GB de anexos contra 0,08 GB no início do bloco anterior;
- o container foi reiniciado e começou com o cache vazio; a rampa teve p95 de 144 ms.

Fica registrado como diferença não explicada, sem atribuir a causa à correção.

**Erro do roteiro:** 51 dos 56 erros inesperados do último bloco eram 401 em chamadas feitas sem token, depois de uma sessão revogada pelo próprio cenário. O roteiro agora interrompe o ciclo quando a sessão é revogada (`tools/load/runner.js`).

## Concorrência e integridade — 12/12

`tools/load/concurrency.js` cobre:
- edição simultânea do mesmo indicador, com controle de versão (um vence, o outro recebe 409);
- envio e liberação concorrentes;
- decisões simultâneas de auditor;
- aprovação dupla;
- upload simultâneo do mesmo nome;
- download durante a substituição;
- revogação de acesso no meio da operação.

O ramo "decisão preservada" do cenário 7 não foi exercitado sob carga; está coberto em `backend/test/workflow.test.js`.

## Tolerância a falhas — 4/4

| Cenário | Resultado |
|---|---|
| Banco congelado por 25 s | leitura e escrita respondem **503 em ~15 s** (`Retry-After: 5`), sem espera indefinida; a escrita que recebeu 503 não ficou gravada; serviço normal logo após o retorno |
| Falha de armazenamento ao gerar o relatório | aprovação mantida, publicação "failed" e depois recuperada automaticamente para "available"; download 200 |
| Upload interrompido no meio | nenhum arquivo nem temporário abandonado; a API segue respondendo |
| Reinício forçado da API durante a aprovação | API de volta em ~1 s; estado final consistente (tudo ou nada): Audited, publicação disponível, 1 resultado |

## Gargalos encontrados e correções

| Gargalo | Correção | Efeito |
|---|---|---|
| Lista de indicadores de 251 KB por chamada saturava a CPU | `?view=resumo` (lista resumida); o item completo é carregado ao abrir | leitura p95 com 250 VUs: 290 → 100 ms |
| Um único processo Node | cluster (`WEB_CONCURRENCY`); só o trabalhador 1 roda a varredura de publicações; limite de tentativas dividido entre os processos | 500 VUs: 148 → 307 req/s |
| Upload simultâneo do mesmo nome dava 500 e apagava o arquivo de quem venceu | reserva do nome no banco antes do rename; temporário com nome único; 409 para quem perde | concorrência 11/12 → 12/12 |
| Rajada de logins (bcrypt em JS bloqueando o event loop) | `@node-rs/bcrypt` nativo, **mesmo custo 10** | login p95 no pico: 5,7 → 3,2 s |
| Banco congelado deixava requisições presas sem limite | limite de tempo de 15 s na camada de banco, conexão destruída, fila limitada (200) e 503 | espera indefinida → 503 em 15 s |
| `GET /users` serializava a base inteira para devolver 5 linhas e esgotava a fila do pool (503) | paginação antes da serialização | 503: 113/200 → 0/200; p95 sob carga 185 → 53 ms |
| Erros do body-parser e do multer viravam 500 | 413 e 400 | — |

Validações: suíte do backend (178 testes) e build do frontend após as correções.

## Capacidade e margem operacional

- **Capacidade sustentada comprovada:** 250 usuários simultâneos ativos por 30 min, ~190 req/s, p95 abaixo de 170 ms e 0% de erros, nesta máquina de 4 núcleos com API e banco juntos.
- **Primeiro limite:** CPU da máquina compartilhada. A partir de ~300–350 VUs, a latência cresce de forma não linear; em 500 VUs, leitura p95 de 835 ms. O segundo limite é a rajada de logins (cerca de 50/s), que leva o login a alguns segundos; é custo inerente do bcrypt e não foi reduzido.
- **Margem recomendada:** operar até **~150–175 usuários simultâneos** por instância (60–70% do patamar saudável) e escalar de forma horizontal ou separar o banco antes disso.

## Pendências

- Medir em hardware equivalente ao de produção, com banco em servidor separado. Os números acima são de uma única máquina de desenvolvimento.
- Ajustar o buffer pool do MySQL (128 MB é o padrão) ao volume real.
- Pôr limite de tentativas ou fila no login caso campanhas concentrem acessos.
- O reinício durante a aprovação terminou com a transação já confirmada; o corte exatamente no meio do commit fica coberto pela atomicidade da transação, não por medição.
