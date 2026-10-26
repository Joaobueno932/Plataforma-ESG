# Relatório de importação do catálogo oficial — 22/10/2026

Resultado da leitura, validação e conferência da planilha oficial de indicadores, e da
comparação com os cadernos oficiais em PDF. Complementa `regras.md` (regras e divergências),
`diagnostico.md` (achados A1 e A20) e `progresso.md` (etapa E3).

**Situação:** a versão oficial foi importada como **rascunho** (`oficial-2026-10-22`, 139
indicadores, 538 alternativas) e **não foi publicada**. A estrutura e a validação estão
concluídas; a publicação depende das decisões listadas em § 6.

## 1. Fonte identificada

| Item | Valor |
|---|---|
| Arquivo | `Indicadores Programa ESG FIEMS 1 (1).xlsx` (entregue na raiz do repositório, fora do versionamento) |
| SHA-256 | `8d66b35252379b823a87600566584881936cc4c7659cc94a991319febecbcda9` |
| Abas | `Questionário`, `Consolidado`, `Caderno Geral`, `A`–`H`, `Pontuações` |
| Cadernos em PDF | `Cadernos indicadores/`: Caderno GERAL (67 pág.) e A–H (17–18 pág. cada) |

**Divergência de nomenclatura da fonte:** a especificação § 17 cita o catálogo como
`Indicadores Programa ESG FIEMS_plataforma.xlsx` e também menciona
`Dados Plataforma - resposta 1.xlsx` (exemplo de avaliação). O arquivo recebido tem outro nome;
o conteúdo corresponde ao catálogo descrito (139 indicadores). Registrado para confirmação de
que é a revisão vigente. O exemplo de avaliação **não** foi recebido e **não** foi importado
como empresa real.

Papéis das fontes dentro do arquivo:

- `Questionário` — **uma linha por alternativa** (538 linhas). É a fonte das alternativas,
  textos e pontos. Linhas de alternativa não são indicadores: o indicador é o agrupamento pelo
  código.
- `Consolidado` — uma linha por indicador (139): máximo, obrigatoriedade e ODS. Usado como
  conferência.
- `Caderno Geral` e `A`–`H` — os cadernos, com a **denominação oficial** e os indicadores de
  cada um. Usados como conferência e como origem dos nomes dos cadernos.
- `Pontuações` — máximos por caderno/eixo e limiares de rating. Conferida contra a soma dos
  máximos (ver § 2); o rating é a etapa E5.

## 2. Contagens e conferências

Todas as 13 conferências declaradas na especificação § 14 **conferem** com a fonte (os números
são conferência, não constantes do sistema — uma diferença seria registrada como divergência,
não como erro):

| Conferência | Esperado | Encontrado |
|---|---|---|
| Indicadores únicos | 139 | **139** |
| Caderno Geral | 59 | **59** |
| Cadernos setoriais (total) | 80 | **80** |
| Cadernos setoriais (quantidade) | 8 | **8** |
| Indicadores por setorial (A–H) | 10 cada | **10 cada** |
| Itens por avaliação (Geral + 1 setorial) | 69 | **69** |

Outros números extraídos da fonte:

- alternativas: **538**; distribuição por indicador: 2 → 15 ind., 3 → 33, 4 → 46, 5 → 45;
- indicadores com mínimo obrigatório: **50**; destes, **49** têm o mínimo em nível de **zero
  ponto** (por isso o cumprimento obrigatório não pode ser inferido pela pontuação);
- alternativas com zero ponto: **189**;
- soma dos máximos: **1250**;
- máximos por caderno e eixo conferem célula a célula com a aba `Pontuações`
  (Geral E 120 / S 170 / G 200; A 50/30/0; B 40/40/20; C 50/30/20; D 60/20/10; E 50/30/20;
  F 50/40/10; G 60/30/10; H 80/10/0).

**Códigos oficiais preservados**, sem conversão para os códigos genéricos do catálogo
demonstrativo (`CG-E01`): `GE01`, `GS01`, `GG01`, `AE01`, `AS01`, … O caderno G usa o prefixo
`G1` (`G1E01`, `G1S01`, `G1G01`) para não colidir com o Caderno Geral — o padrão aceito é
`<caderno><eixo><NN>` com dígito opcional no caderno.

## 3. Erros de estrutura

**Nenhum** (0 erros). A versão é estruturalmente importável.

As validações que rodam a cada importação: coluna obrigatória ausente; campo em branco
(caderno, código, título, nível, descrição, pontuação); pontuação não numérica ou negativa
(zero é valor válido e preservado); indicador com menos de duas alternativas; nível repetido no
mesmo indicador; mais de um mínimo obrigatório; título, caderno, eixo ou tópico divergentes
entre linhas do mesmo código; eixo do código diferente do eixo declarado; código fora do padrão
observado; arquivo ilegível ou sem a aba `Questionário`.

## 4. Divergências registradas (não resolvidas pelo sistema)

### 4.1 Entre as abas da própria planilha (8 ocorrências, 4 indicadores)

| Código | `Questionário` | `Consolidado` / aba do caderno | Leitura |
|---|---|---|---|
| **GS04** | "Certificado de **Regularidade** – Corpo de Bombeiros" | "Certificado de **Conformidade** – Corpo de Bombeiros" | O caderno em PDF (Caderno GERAL, sumário) diz **"Certificado de Regularidade"**, igual ao `Questionário`. Duas fontes contra uma. Pendente de ratificação. |
| **BE04** | "Logística reversa de embalagens pós-consumo" | "Logistica Reversa de Embalagem pós consumo" | O caderno B diz "logística reversa de embalagens pós consumo" — compatível com o `Questionário`; o `Consolidado` tem erro de digitação. |
| **G1E01** | "Aproveitamento energético" | "Recursos Naturais" | O caderno G diz **"Recursos Naturais"**, igual ao `Consolidado`. Aqui o `Questionário` é o divergente. Pendente de ratificação. |
| **G1E02** | "Manutenção das áreas de conservação" | "Manutenção de áreas de conservação" | Diferença de preposição. |

Nenhum título foi escolhido pelo sistema: a importação grava o nome da aba `Questionário`
(fonte declarada das alternativas) e mantém a divergência no relatório da versão.

### 4.2 Entre a planilha e os cadernos em PDF

Conferência automatizada (`tools/catalog_crosscheck.py`, somente leitura):

| Verificação | Resultado |
|---|---|
| Códigos localizados no caderno correspondente | **139 de 139** |
| Nomes de nível localizados | **538 de 538** |
| Pontuações > 0 localizadas | **todas** |
| Títulos localizados literalmente | 136 de 139 (3 casos, abaixo) |
| Página do indicador identificada (cabeçalho `CÓDIGO:`) | 138 de 139 (`G1G01` sem cabeçalho localizável) |
| Conjunto de pontuações da página × planilha | **2 divergências** |

**Pontuações divergentes (afetam cálculo — pendentes de ratificação):**

| Código | Planilha | Caderno (página) | Observação |
|---|---|---|---|
| **AE03** | 0, **4**, 6, 8, 10 | 0, **0**, 6, 8, 10 (caderno A, pág. 8) | É o único indicador do programa cujo mínimo obrigatório vale mais que zero na planilha (Iniciante = 4). O texto do nível é o mesmo nas duas fontes; só os pontos diferem. |
| **GE06** | 0, **0**, 6, 8, 10 | 0, **4**, 6, 8, 10 (Caderno GERAL, pág. 11) | Divergência inversa, no nível Iniciante. |

A comparação é por **multiconjunto** de pontuações da página, porque a extração de texto não
preserva a ordem das colunas — o que torna o resultado independente de ordem e, por isso,
confiável para detectar diferença de valores, mas não para dizer qual coluna recebeu qual
ponto.

**Títulos não localizados literalmente (3):** `CG02` (o PDF rende "certiicacoes" — perda da
ligadura "fi" na extração, **não** é divergência de conteúdo); `G1E01` (ver § 4.1); `GS08`
("Inexistência de trabalho infantil, forçado ou análogo ao escravo" na planilha ×
"Trabalho infantil, forçado, escravo ou análogo ao escravo" no caderno).

**Atualização (24/10/2026):** a marca de mínimo passou a ser conferida por `tools/minimum_crosscheck.py` (posição gráfica + faixa preenchida), com 139/139 conferindo — ver `maturidade-minima.md`. O texto abaixo descreve a limitação original da extração de texto.

**O que não é conferível por extração de texto:** a marca **"Obrigatório"** do nível mínimo
aparece acima de uma coluna e a extração não preserva o layout (há página que rende
`ObrigatórioObrigatório` e página em que a marca não sai). Comparar isso automaticamente
produziria divergências falsas — a verificação foi **descartada do relatório automático** e
fica como conferência por leitura humana dos cadernos (§ 6).

### 4.3 Comparação campo a campo (amostra)

Renderização de página de PDF não está disponível neste ambiente (sem `poppler`), então a
comparação foi feita sobre o **texto extraído** de cada página, campo a campo:

| Campo | `GE01` planilha | `GE01` caderno (Caderno GERAL, pág. 6) |
|---|---|---|
| Código / título | GE 01 · Licenciamento ambiental | GE 01 · Licenciamento Ambiental (só a caixa difere) |
| Tópico | Compliance | Tópico: Compliance ✓ |
| ODS | 16 | — (o PDF não repete o ODS na página do indicador) |
| Níveis | Não conforme 0 · Iniciante 0 (mínimo) · Sensibilizada 6 · Consciente 8 · Engajada 10 | mesmos cinco nomes; pontos {0, 0, 6, 8, 10} ✓ |
| Texto do "Não conforme" | "A indústria não possui licenças ambientais para uma ou mais das atividades que realiza, ou há licenças vencidas" | idêntico ✓ |
| Descrição / Verificação do indicador | **não existem na planilha** | existem no caderno (duas colunas de texto) |

| Campo | `AS02` planilha | `AS02` caderno (caderno A, pág. 13) |
|---|---|---|
| Níveis | Não conforme 0 · Conforme 0 (mínimo) | dois níveis, pontos {0, 0} ✓ |
| Máximo | 0 | ✓ (indicador obrigatório que não pontua) |
| Tópico | Marketing e rotulagem | Tópico: Marketing e rotulagem ✓ |

| Campo | `AE03` planilha | `AE03` caderno (caderno A, pág. 8) |
|---|---|---|
| Níveis | Não conforme 0 · **Iniciante 4 (mínimo)** · Sensibilizada 6 · Consciente 8 · Engajada 10 | cinco níveis, marca "Obrigatório" presente, pontos {0, **0**, 6, 8, 10} |
| Texto do "Iniciante" | "A indústria cumpre parcialmente as obrigações legais de logística reversa de embalagens em geral, em 01 (um) ou mais Estados." | idêntico ✓ |

Observação sobre a fonte: a página do `AS02` no caderno A referencia "BS 01" e "BS 02" no texto
da descrição (códigos do caderno B). Parece engano de redação do caderno; registrado, não
corrigido.

## 5. Fonte essencial ausente

A planilha traz **descrição por alternativa**, mas **não** traz a descrição do indicador nem a
orientação de verificação — campos que a especificação § 9 exige no detalhe do indicador. Os
cadernos em PDF **têm** esse conteúdo (colunas "Descrição" e "Verificação" na página de cada
indicador), mas a extração de texto embaralha as colunas, o que impede importação automática
confiável.

Decisão aplicada: os campos `description` e `verification` do indicador ficam **nulos**,
com a ausência declarada no relatório da versão (`missingSources`). **Nada foi completado por
texto gerado.** A importação dessa parte exige uma das opções de § 6.

## 6. Pendências que impedem declarar o catálogo definitivo

| # | Pendência | Efeito |
|---|---|---|
| 1 | **Ratificação de GS04 e G1E01** (nome oficial) | rótulo exibido de um indicador obrigatório e de um indicador setorial |
| 2 | **Ratificação das pontuações de AE03 e GE06** | muda pontos obtidos e máximo aplicável desses indicadores (cálculo, etapa E5) |
| 3 | ~~Conferência do mínimo obrigatório contra os cadernos~~ — **resolvida em 24/10/2026**: 139/139 conferem, 50 com maturidade mínima exigida (ver `maturidade-minima.md`) | — |
| 4 | **Descrição e orientação de verificação dos indicadores** | conteúdo que a empresa lê para responder. Caminhos: (a) planilha oficial que inclua as duas colunas; (b) extração assistida dos cadernos com revisão indicador por indicador; (c) digitação revisada. Nenhuma delas é automática |
| 5 | Confirmar se `Indicadores Programa ESG FIEMS 1 (1).xlsx` é a revisão vigente (§ 1) | identidade da versão publicada |
| 6 | `G1G01` sem cabeçalho localizável no caderno G | conferir se o indicador consta do caderno publicado |

Enquanto 1–4 estiverem abertas, a versão permanece **rascunho**: a estrutura, a validação, o
versionamento e a proteção dos ciclos já funcionam, e a publicação é uma ação administrativa de
um passo (com confirmação explícita das divergências).

## 7. Como reproduzir

```bash
# conferência planilha × cadernos (somente leitura; precisa de pypdf e openpyxl)
python tools/catalog_crosscheck.py "Indicadores Programa ESG FIEMS 1 (1).xlsx" "Cadernos indicadores"

cd backend
npm run db:backup                 # cópia antes de qualquer gravação
npm run catalog -- preview "../Indicadores Programa ESG FIEMS 1 (1).xlsx"
npm run catalog -- import  "../Indicadores Programa ESG FIEMS 1 (1).xlsx" "oficial-2026-10-22"
npm run catalog -- versions
npm run catalog -- publish oficial-2026-10-22 --acknowledge   # confirmação administrativa
```

Pela interface: tela **Indicadores** (perfil Administração) → "Catálogo oficial de indicadores"
→ validar (prévia), importar como rascunho, consultar relatório e publicar.

Pela API: `POST /catalog/preview`, `POST /catalog/imports`,
`POST /catalog/versions/:id/publish`, `GET /catalog/versions`,
`GET /catalog/versions/:id/report`, `GET /catalog/versions/:id/indicators`,
`GET /catalog/levels`, `GET /catalog/imports`.

## 8. Registro das importações

Cada leitura fica registrada em `catalog_imports` com arquivo, origem, SHA-256, tamanho,
autoria, horário, situação (`preview`, `draft`, `rejected`, `published`) e o relatório
completo. Reimportar o mesmo arquivo **não** duplica o catálogo: devolve o rascunho existente,
ou recusa quando o arquivo já foi publicado.

Estado do banco de trabalho após esta etapa:

| Versão | Origem | Situação | Indicadores | Ciclos |
|---|---|---|---|---|
| `legacy-demo` | demonstração | publicada | 22 | 2 (demonstração) |
| `oficial-2026-10-22` | oficial | **rascunho** | 139 | 0 |

Em vigor para avaliações novas: `legacy-demo` (o rascunho não entra em ciclo nenhum).
