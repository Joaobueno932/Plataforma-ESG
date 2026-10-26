# Maturidade mínima exigida

Conferência, indicador por indicador, do nível de maturidade mínimo exigido pelo Programa ESG
FIEMS, entre os **cadernos oficiais em PDF** e a **planilha oficial** que alimenta o catálogo.
Conferência feita em 24/10/2026.

## 1. Três conceitos que não se confundem

| Conceito | O que é | Onde vive no sistema |
|---|---|---|
| **Resposta obrigatória** | Todo indicador aplicável ao ciclo precisa ser respondido. | Fluxo do ciclo (envio, liberação). Vale para os 139 indicadores, com ou sem mínimo. |
| **Maturidade declarada** | Nível que a empresa escolhe ao responder. | `question_reports.selectedAnswer` (e o enquadramento auditado). |
| **Maturidade mínima exigida** | Piso definido pelo caderno para **alguns** indicadores. | `answers.mandatory = 1` na alternativa exigida e `questions.mandatoryAnswerId` apontando para ela; `questions.hasMandatory = 1`. |

Os nomes técnicos `mandatory`/`hasMandatory`/`obrigatorio-nao-atendido` foram mantidos: são
contrato da API e do banco. Só a comunicação na interface mudou: "Obrigatório" →
**"Maturidade mínima exigida"**.

## 2. Regra oficial e consequência

- Cadernos (Geral e A–H): o nível mínimo é marcado com a faixa **"OBRIGATÓRIO"** sobre a coluna
  do nível, na página de cada indicador.
- *Manual de Certificação*, p. 15: os exemplos "sinalizam que um determinado nível é
  obrigatório. Isso significa que, para uma indústria ser certificada na Jornada ESG-FIEMS, além
  de alcançar a pontuação mínima total, ela deve estar em conformidade com a totalidade dos
  indicadores obrigatórios do programa."
- *Manual de Certificação*, p. 32: "Não conformidade em um ou mais indicadores obrigatórios"
  leva a atendimento parcial ou não atendimento na auditoria.

Implementação (já existente, conferida e mantida — `backend/src/scoring/engine.js`):

- a comparação é pela **ordem do nível**, nunca pelos pontos (49 dos 50 mínimos valem zero ponto);
- **responder abaixo do mínimo é permitido** — a empresa declara o nível real;
- abaixo do mínimo (ou conclusão de não atendimento pelo auditor) gera o impedimento
  `obrigatorio-nao-atendido` e o ciclo fica **não elegível**, mesmo com rating alto;
- NA aceito retira o indicador da verificação; item sem decisão não é tratado como descumprimento.

## 3. Método da conferência

`tools/minimum_crosscheck.py` (somente leitura, PyMuPDF) lê cada página de indicador dos 9
cadernos: código no título, colunas pela linha de pontuação, nomes dos níveis e a marca de mínimo.

**Achado que explica a pendência antiga** (a conferência era tida como "não conferível por
extração"): em todos os cadernos a marca é texto **branco**. A marca real fica sobre uma **faixa
cinza preenchida**; os PDFs também carregam um **resíduo do modelo** — o mesmo texto branco sem a
faixa, invisível na página — em 39 páginas (ex.: GE06, GG01, e ao lado da marca real em GE07 e
GS24). A extração de texto pura via esse resíduo como "obrigatório". O script só conta a marca
que tem retângulo preenchido não branco por baixo — o que o leitor vê. Conferido visualmente em
GE01, GE06, GG01 e GS24.

Reprodução:

```bash
node tools/minimum_sheet.js "Documentação/Indicadores Programa ESG FIEMS 1.xlsx" minimos-planilha.json
python tools/minimum_crosscheck.py "Documentação" minimos-planilha.json saida.json
# {"confere": 139} — com mínimo (planilha): 50 | com mínimo (cadernos): 50 | páginas com resíduo invisível: 39
```

O resultado ficou fixado em `backend/test/fixtures/minimos-oficiais.json` e é verificado por
`backend/test/catalog.test.js` (parser e, de ponta a ponta, importação + API do ciclo).

## 4. Resultado

- **139 indicadores** localizados nos cadernos; **139 conferem** com a planilha.
- **50 com maturidade mínima exigida** (Geral 29; A 5; B 5; C 3; D 1; E 1; F 1; G 1; H 4);
  **89 sem** mínimo.
- Nível exigido varia: **Iniciante 14, Sensibilizada 13, Conforme 14, Consciente 9**.
  Em todos os 50 o mínimo é o **2º nível** da escala do indicador.
- Não há variação do mínimo do mesmo indicador entre setores: cada indicador pertence a um único
  caderno. O ciclo de uma empresa usa o Caderno Geral + o setorial dela.

## 5. Mapeamento

| Caderno | Setor | Código | Indicador | Maturidade mínima | Pontos do nível mínimo | Fonte |
|---|---|---|---|---|---|---|
| Geral | — | GE01 | Licenciamento ambiental | Iniciante | 0 | Caderno GERAL 1.pdf, p. 6 |
| Geral | — | GE02 | Cadastro Técnico Federal (IBAMA) e TCFA | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 7 |
| Geral | — | GE03 | Outorga de uso da água | Conforme | 0 | Caderno GERAL 1.pdf, p. 8 |
| Geral | — | GE04 | Histórico de responsabilizações administrativas, cíveis e criminais ambientais | Consciente | 0 | Caderno GERAL 1.pdf, p. 9 |
| Geral | — | GE05 | Gestão energética | Iniciante | 0 | Caderno GERAL 1.pdf, p. 10 |
| Geral | — | GE07 | Gestão hídrica | Iniciante | 0 | Caderno GERAL 1.pdf, p. 12 |
| Geral | — | GE08 | Efluentes líquidos industriais | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 13 |
| Geral | — | GE10 | Gestão de resíduos sólidos | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 15 |
| Geral | — | GE11 | Armazenamento de resíduos sólidos | Conforme | 0 | Caderno GERAL 1.pdf, p. 16 |
| Geral | — | GE12 | Destinação de resíduos sólidos | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 17 |
| Geral | — | GG08 | Lei Geral de Proteção de Dados (LGPD) | Iniciante | 0 | Caderno GERAL 1.pdf, p. 54 |
| Geral | — | GS01 | Certidão Negativa de Débitos Trabalhistas | Conforme | 0 | Caderno GERAL 1.pdf, p. 21 |
| Geral | — | GS02 | Certidão Negativa de Regularidade Fiscal | Conforme | 0 | Caderno GERAL 1.pdf, p. 22 |
| Geral | — | GS03 | Registro de Funcionários | Conforme | 0 | Caderno GERAL 1.pdf, p. 23 |
| Geral | — | GS04 | Certificado de Regularidade – Corpo de Bombeiros | Conforme | 0 | Caderno GERAL 1.pdf, p. 24 |
| Geral | — | GS05 | Programa de Gerenciamento de Riscos (PGR) | Conforme | 0 | Caderno GERAL 1.pdf, p. 25 |
| Geral | — | GS06 | Alvarás Sanitários e de Funcionamento | Conforme | 0 | Caderno GERAL 1.pdf, p. 26 |
| Geral | — | GS07 | Programa de Controle Médico de Saúde Ocupacional (PCMSO) | Conforme | 0 | Caderno GERAL 1.pdf, p. 27 |
| Geral | — | GS08 | Inexistência de trabalho infantil, forçado ou análogo ao escravo | Iniciante | 0 | Caderno GERAL 1.pdf, p. 28 |
| Geral | — | GS09 | Trabalho estrangeiro | Conforme | 0 | Caderno GERAL 1.pdf, p. 29 |
| Geral | — | GS10 | Assédio e Abuso | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 30 |
| Geral | — | GS12 | Equipamentos de Proteção Individual (EPI) | Consciente | 0 | Caderno GERAL 1.pdf, p. 32 |
| Geral | — | GS14 | Condição das Instalações | Consciente | 0 | Caderno GERAL 1.pdf, p. 34 |
| Geral | — | GS15 | Diversidade | Iniciante | 0 | Caderno GERAL 1.pdf, p. 35 |
| Geral | — | GS17 | Empregabilidade de pessoas com deficiência (PcD) | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 37 |
| Geral | — | GS18 | Benefícios | Sensibilizada | 0 | Caderno GERAL 1.pdf, p. 38 |
| Geral | — | GS19 | Remuneração | Iniciante | 0 | Caderno GERAL 1.pdf, p. 39 |
| Geral | — | GS21 | Desenvolvimento profissional | Iniciante | 0 | Caderno GERAL 1.pdf, p. 41 |
| Geral | — | GS24 | Gestão da Cadeia de Valor | Iniciante | 0 | Caderno GERAL 1.pdf, p. 44 |
| Setorial | A | AE03 | Logística reversa de embalagens pós-consumo | Iniciante | 0 no caderno / 4 na planilha ⚠ | A - Alimentos e bebidas 1.pdf, p. 8 |
| Setorial | A | AS01 | Rotulagem e publicidade | Sensibilizada | 0 | A - Alimentos e bebidas 1.pdf, p. 12 |
| Setorial | A | AS02 | Acurácia das informações | Conforme | 0 | A - Alimentos e bebidas 1.pdf, p. 13 |
| Setorial | A | AS03 | Registros e selos | Conforme | 0 | A - Alimentos e bebidas 1.pdf, p. 14 |
| Setorial | A | AS04 | Segurança alimentar (Food Security) | Sensibilizada | 0 | A - Alimentos e bebidas 1.pdf, p. 15 |
| Setorial | B | BE04 | Logística reversa de embalagens pós consumo | Iniciante | 0 | B - Frigorifico 1.pdf, p. 9 |
| Setorial | B | BG01 | Transporte humanitário | Consciente | 0 | B - Frigorifico 1.pdf, p. 16 |
| Setorial | B | BG02 | Condenações | Consciente | 0 | B - Frigorifico 1.pdf, p. 17 |
| Setorial | B | BS01 | Risco ergonômico | Sensibilizada | 0 | B - Frigorifico 1.pdf, p. 11 |
| Setorial | B | BS02 | Atividades em câmara fria | Sensibilizada | 0 | B - Frigorifico 1.pdf, p. 12 |
| Setorial | C | CE01 | Recursos naturais não renováveis | Sensibilizada | 0 | C_Construção Civil 1.pdf, p. 6 |
| Setorial | C | CE03 | Proteção da flora e da fauna | Sensibilizada | 0 | C_Construção Civil 1.pdf, p. 8 |
| Setorial | C | CS03 | Equipamentos de Proteção Coletiva (EPC) | Consciente | 0 | C_Construção Civil 1.pdf, p. 14 |
| Setorial | D | DE07 | Operações de transporte e manejo de recursos e produtos especialmente protegidos | Conforme | 0 | D_Industria de Transformação Diversa 1.pdf, p. 12 |
| Setorial | E | ES02 | Exposição à radiação | Consciente | 0 | E - Energia, Telecomunicações, Resíduos e Similares 1.pdf, p. 13 |
| Setorial | F | FG01 | Concessões, lavras, autorizações e outorgas | Consciente | 0 | F - Extração de minerais 1.pdf, p. 17 |
| Setorial | G | G1G01 | Concessões, lavras, autorizações e outorgas | Consciente | 0 | G - Papel e celulose 1.pdf, p. 17 |
| Setorial | H | HE01 | Substâncias restritas | Iniciante | 0 | H - Calçados e Componentes para Calçados,etc.pdf, p. 6 |
| Setorial | H | HE02 | Gestão de produtos químicos | Iniciante | 0 | H - Calçados e Componentes para Calçados,etc.pdf, p. 7 |
| Setorial | H | HE05 | Logística reversa de embalagens pós-consumo | Iniciante | 0 | H - Calçados e Componentes para Calçados,etc.pdf, p. 10 |
| Setorial | H | HE09 | Ruído externo | Conforme | 0 | H - Calçados e Componentes para Calçados,etc.pdf, p. 14 |

Nomes dos indicadores conforme a aba `Questionário` da planilha (divergências de nome D1, D6 e
D8 em `regras.md`).

## 6. Divergências e pendências

| # | Item | Situação |
|---|---|---|
| 1 | **AE03** — o nível mínimo (Iniciante) vale 4 pontos na planilha e 0 no caderno A (p. 8). | Já registrado como **D7** em `regras.md`. Não afeta a verificação do mínimo (comparada pela ordem do nível); afeta pontos e máximo aplicável. Ratificação pendente. |
| 2 | Resíduo invisível "Obrigatório" em 39 páginas dos PDFs. | Não é exigência (sem faixa, não aparece ao leitor). Vale informar a FIEMS para limpeza dos arquivos-fonte. |
| 3 | Catálogo **`legacy-demo`** (seed de demonstração, códigos `CG-…`). | Não é oficial: seus mínimos (`CG-E01`, `CG-S01`, …) são dados de demonstração e não foram alterados. Ciclos reais usam a versão importada da planilha oficial. |
| 4 | Nomenclatura oficial. | Os cadernos e o Manual usam "obrigatório". A interface adota "Maturidade mínima exigida" por decisão de produto, para não confundir com a obrigação de responder. |
