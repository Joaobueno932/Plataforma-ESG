# Interface — Prompt 6

## Fontes usadas e o que faltou

| Fonte pedida | Situação | O que foi feito |
|---|---|---|
| `ESG_FIEMS_Indicadores_Preview.html` (organização aprovada) | **não encontrada** no projeto nem nas pastas do usuário (busca em Plataforma ESG, Downloads, Documentos, Área de Trabalho) | organização seguida pelo texto do Prompt 6: listagem por eixo/tópico, busca e filtros, marcadores, modal com cartões; **pendência**: conferir contra o HTML quando for fornecido |
| Imagem de referência dos cards | **não encontrada** | referência substituta: os **cadernos oficiais** (`Cadernos indicadores/`), que trazem os próprios cartões — renderizados página a página com `tools/pdf_pages.js` (Caderno Geral p. 6–7) |
| Dashboard MS GÁS | só existe `MS GÁS.pbix` (Power BI), **não legível** sem o Power BI | painel de resultado montado só com dados reais da API; nada copiado do arquivo |
| Manual de marca CSI (Behance) e `Identidade Visual/` | logos disponíveis; o manual on-line não foi acessado (rede corporativa) | azuis da marca já presentes no CSS original (`#0D3969`, `#0D5DA8`), logotipo ESG FIEMS |
| MCP **21st** | **indisponível**: a rede corporativa interrompe o TLS do serviço | — |
| MCP **shadcn-ui** | usado | Dialog e Tabs (v4) adaptados para JSX sobre Radix |
| Princípios de movimento (emilkowalski) | aplicados | transições ≤ 200 ms, só transform/opacity, saída suave, nada com `prefers-reduced-motion` |

## Cartões de alternativa (fidelidade aos cadernos)

Faixa colorida com o nome do nível, corpo claro com borda da mesma cor, pontuação assentada na
borda inferior, faixa **OBRIGATÓRIO** no nível mínimo, quantidade de cartões igual à do
indicador. Cores conferidas no Caderno Geral (GE 01/GE 02): Não conforme `#D2232A`, Iniciante
`#6E7D8F`, Sensibilizada `#99D4E5`, Consciente `#FFBC24`, Engajada `#40AD49`. Nível sem cor
documentada (ex.: “Conforme” do catálogo de demonstração) usa neutro — sem cor inventada, sem
roxo. A seleção é anel + marca + texto “Selecionada”: as cores não mudam com a seleção.
A cor efetiva vem da API (`answer.color`): escolha da Administração → cor do caderno → neutro.

## Telas

- **Ciclo da empresa** (`/companies/:id`): cabeçalho com empresa, ciclo, caderno, rodada,
  catálogo, estado e função exercida; ações só para quem pode no estado atual; abas Visão geral
  (andamento × maturidade, obrigatórios, pendências, pré-requisitos da liberação), Indicadores
  (eixo → tópico, busca, 7 filtros na URL, marcadores, destaque do setorial), Pendências,
  Resultado (auditado após aprovação; antes, autodiagnóstico marcado como preliminar) e Equipe
  (Administração).
- **Modal do indicador**: código, caderno, eixo, tópico, ODS, descrição, verificação, cartões,
  justificativa, pedido de NA, evidências com descrição/validade/vencimento, responsável e prazo,
  revisão da versão, auditoria (declaração × enquadramento com autores e datas), histórico e
  pendências. Rascunho ≠ envio; erro aparece no rodapé sem perder o que foi digitado; fechar com
  alterações oferece salvar, descartar ou continuar.
- **Catálogo** (`/indicators`, Administração): editor de cadernos em edição versionada — criar
  caderno do zero, incluir/editar/excluir/reordenar indicadores, alternativas (2–6, mínimo
  obrigatório, pontos), **cor de cada cartão** (paleta oficial + cor livre) com prévia igual à da
  empresa; publicar ou descartar a edição; abas Versões e Importar planilha.
- **Navegação**: menu por função (empresa vai direto ao ciclo), gaveta no celular, página
  inteira responsiva (`lg:ml-56`).

## Verificação executada

`node tools/visual-cycle.js <saída>` contra a API e a interface reais, em base isolada
(`scripts/visual-seed.js`, base de testes). Resultado da última execução:

- desktop 1440×900 e celular 390×844: 20 capturas, **0** erros de console e **0** respostas ≥ 400;
- teclado: setas movem a seleção entre os cartões (6 cartões); Esc com alteração pendente abre a
  confirmação; ao fechar, o foco volta ao botão do indicador; filtros preservados na URL;
- celular sem rolagem horizontal; modal com rolagem interna e ações sempre visíveis;
- colaborador vê só o indicador atribuído; durante a auditoria a empresa não recebe ação de
  editar e não vê o andamento das decisões do auditor (correção feita na API);
- auditor vê declaração × enquadramento lado a lado.

`npm run build` (frontend): sem erro. O projeto **não tem ESLint nem typecheck** configurados
(diagnóstico A17); a verificação equivalente é o build do Next e os testes da API.
