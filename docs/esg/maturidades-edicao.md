# Cores dos níveis e edição das maturidades

## 1. Cores oficiais dos níveis

Fonte: cor de preenchimento da faixa de cada nível nas páginas de indicador dos 9 cadernos em
PDF da pasta `Documentação` (Geral e A–H). Extraída por `tools/level_colors.py` (PyMuPDF,
somente leitura) e conferida visualmente (ex.: GE01, GE03, GE06).

| Nível | Cor | Faixas medidas |
|---|---|---|
| Não conforme | `#D2232A` | 139/139 |
| Iniciante | `#6E7D8F` | 41/45 |
| Sensibilizada | `#99D4E5` | 84/91 |
| Consciente | `#FFBC24` | 116/124 |
| Engajada | `#40AD49` | 124/124 |
| **Conforme** | **`#40AD49`** | **15/15** |

- As poucas faixas fora da cor majoritária (`#67798A`, `#88D2E1`, `#FDB83A`) são variações de
  impressão de alguns cadernos; vale a cor dominante.
- **Correção desta etapa:** "Conforme" (nível de atendimento dos 15 indicadores binários) não
  tinha cor cadastrada e aparecia em cinza neutro. Nos cadernos é o mesmo verde de Engajada.
- A cor fica em `backend/src/catalog/presentation.js` (cor padrão devolvida pela API) e em
  `frontend/src/lib/levels.js` (fallback e paleta do editor). Cor escolhida pela Administração
  no editor prevalece (`colorSource: "administracao"`).
- **Acessibilidade:** a faixa usa sempre a cor do caderno; só o **texto** sobre ela escolhe entre
  branco e grafite o de maior contraste. No verde, o branco do PDF dá 2,9:1 e o grafite 5,1:1,
  então o texto fica grafite. No cinza de Iniciante o branco é o melhor possível (4,2:1).

## 2. Edição das maturidades por indicador (Administração)

- **Onde:** lápis em cada indicador da listagem do ciclo e botão "Editar maturidades" no modal
  de resposta. Só aparecem com a capacidade `editMaturities` (perfil `ADMIN`); o servidor exige a
  permissão `catalog.manage` (somente `ADMIN`) — Gestor e demais recebem 403.
- **O que edita:** nome, descrição, pontuação e cor de cada nível; excluir (com confirmação);
  adicionar; mover para antes/depois na escala; marcar a maturidade mínima exigida. Validações do
  servidor: 2 a 6 níveis, nomes únicos, pontos ≥ 0, cor `#RRGGBB`, "Não se aplica" não é nível,
  no máximo um mínimo.
- **Persistência e histórico:** o indicador do ciclo pertence a uma versão **congelada** do
  catálogo e nunca é editado. `POST /catalog/editor/for-question/:questionId` localiza o mesmo
  indicador (código + caderno) na edição administrativa em rascunho — criando-a a partir da versão
  em vigor se não houver — e o editor grava lá (`PATCH /catalog/editor/indicators/:id`).
  Respostas, pontuações, auditorias e resultados já registrados ficam intactos. Publicada a
  edição em **Catálogo**, a nova escala vale para os ciclos novos.
- **Caderno Geral:** cada indicador do Geral existe uma única vez por versão; a escala editada e
  publicada vale para empresas de **todos os setores** (Geral + setorial de cada uma), sem
  duplicar o indicador. Indicador ausente na edição em rascunho (removido nela) é informado, não
  recriado.
- Testes: `backend/test/catalog-editor.test.js` → "maturidades editadas a partir do indicador do
  ciclo".
