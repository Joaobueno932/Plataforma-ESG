# Regras do Programa ESG-FIEMS — registro com origem e critério de aceite

Base de regras para a reconstrução. Cada regra traz a **origem** e o **critério de aceite**
que a comprova. Regras sem origem oficial ficam marcadas como pendência e **não** devem ser
implementadas por inferência.

Estado em 22/10/2026. Commit inspecionado: `42ba516`.

## Legenda de origem

| Marca | Significado | Prioridade |
|---|---|---|
| `[DEC]` | Decisão explícita do responsável (inclui as decisões consolidadas e as permissões fechadas posteriormente) | 1 |
| `[DOC]` | Documento `Plataforma esg fiems.docx` | 2 |
| `[PLAN]` | Planilha oficial `Indicadores Programa ESG FIEMS 1.xlsx` (abas `Questionário`, `Consolidado`, `Pontuações`, `Caderno Geral`, `A`–`H`) | 3 |
| `[HTML]` | HTML aprovado / imagens de referência dos cards | 4 |
| `[COD]` | Comportamento do código, README ou conversa antiga — **contexto histórico, não autoridade** | 5 |
| `[PEND]` | Decisão ausente: preservar a parte dependente e não decidir no código | — |

**Fontes disponíveis nesta etapa:** `[PLAN]` (localizada em `~/Downloads/Indicadores Programa ESG FIEMS 1.xlsx`,
lida somente para leitura) e `[COD]`. **Não localizados no disco:** `[DOC]` e `[HTML]` — ver
`diagnostico.md` § Fontes ausentes.

---

## 1. Catálogo (cadernos, indicadores, alternativas)

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| C1 | Cada avaliação usa o **Caderno Geral (59 indicadores)** + **somente o caderno setorial atribuído (10 indicadores)** = **69 indicadores**. | `[DEC]` `[PLAN]` aba `Pontuações` (TOTAL 69 por setorial); `Consolidado` tem 139 linhas = 59 + 8×10 | Criar ciclo de empresa do caderno X gera exatamente 69 itens, nenhum de outro setorial. O README afirma "64 do Caderno Geral" — **incorreto**. |
| C2 | Caderno Geral e setorial são **fixados na versão do ciclo**. | `[DEC]` | Editar o catálogo não altera ciclo em andamento nem encerrado; o ciclo continua respondendo com a versão com que foi aberto. |
| C3 | Cada indicador tem **suas próprias** alternativas, textos, pontos e mínimo obrigatório. O número de alternativas varia de **2 a 5**. | `[PLAN]` aba `Questionário`: 538 alternativas / 139 indicadores; distribuição no Geral = 10 ind. com 2, 7 com 3, 20 com 4, 22 com 5 | Nenhum indicador com 6 alternativas; nenhuma alternativa com texto genérico reaproveitado. |
| C4 | Sequências de maturidade observadas (somente estas 4): `Não conforme > Sensibilizada > Consciente > Engajada` (46 ind.); `Não conforme > Iniciante > Sensibilizada > Consciente > Engajada` (45); `Não conforme > Consciente > Engajada` (33); `Não conforme > Conforme` (15). | `[PLAN]` | A ordem de exibição é a ordem da planilha, não a ordem alfabética nem a ordem de pontos. |
| C5 | **Pontos não derivam do nome do nível.** O mesmo rótulo tem pontos diferentes conforme o indicador: `Iniciante` 0 ou 4; `Sensibilizada` 0 ou 6; `Consciente` 0 ou 8; `Conforme` 0 ou 10; `Engajada` sempre 10; `Não conforme` sempre 0. | `[DEC]` `[PLAN]` | Importar o par (alternativa, pontos) da planilha. Proibido tabelar pontos por rótulo. |
| C6 | **50 indicadores têm mínimo obrigatório** (Geral 29; A 5; B 5; C 3; D 1; E 1; F 1; G 1; H 4). O nível que serve de piso **varia**: `Iniciante` em 14, `Sensibilizada` em 13, `Conforme` em 14, `Consciente` em 9. | `[PLAN]` colunas `Obrigatório`/`Observações` | A alternativa marcada `Obrigatório` é o piso daquele indicador; o piso nunca é inferido do rótulo. |
| C7 | Máximo por indicador é **10 ou 0**. Indicadores de máximo 0 (ex.: GE03, GS01–GS07, GE11) **não entram no denominador**: valem apenas como requisito obrigatório. | `[PLAN]` aba `Consolidado`, coluna `Máximo` | Soma dos máximos por eixo confere com C8. |
| C8 | Máximo por dimensão — Geral: **E 120, S 170, G 200**. Setorial: A 50/30/0 · B 40/40/20 · C 50/30/20 · D 60/20/10 · E 50/30/20 · F 50/40/10 · G 60/30/10 · H 80/10/0 (E/S/G). | `[PLAN]` `Consolidado` e `Pontuações` | Máximo aplicável = Geral + setorial. Ex.: setorial A → E 170, S 200, G 200, total 570 (igual à tabela "Aproveitamento por rating"). |
| C9 | Código oficial do indicador = `<caderno><eixo><NN>`: Geral `GE01`, `GS01`, `GG01`; setorial A `AE01`, `AS01`; etc. | `[PLAN]` colunas `Códigos` / `codigo_ajustado` | Nenhum código no formato `CG-E01` / `A-S02` (formato inventado na reconstrução). |
| C10 | Cada indicador carrega **Eixo** (E/S/G), **Tópico**, **ODS** e nome oficial. | `[PLAN]` | Campos preservados na importação; ODS pode ter mais de um valor (ex.: `3, 8`). |
| C11 | Nomes oficiais dos cadernos: Geral; A Alimentos e Bebidas; B Indústria Frigorífica e Derivados; C Construção Civil; D Indústrias de Transformação Diversas; E Energia, Telecomunicações, Resíduos e Similares; F Extração de Minerais Metálicos, Não Metálicos/Agroindústria; G Papel e Celulose; H Calçados e Componentes para Calçados, Couro, Confecções Têxteis e Artefatos. | `[PLAN]` células `B1` das abas | Divergem dos rótulos do sistema antigo em B, D, F e H (ver § Divergências). |

## 2. Cálculo, elegibilidade e rating

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| P1 | **Primeiro** verificar os requisitos obrigatórios aplicáveis. **Um único obrigatório não atendido impede a elegibilidade**, mesmo com pontuação alta. | `[DEC]` | Caso de teste: 100% dos pontos possíveis + 1 obrigatório não atendido → inelegível. |
| P2 | E, S e G calculados **separadamente**: pontos obtidos ÷ máximo aplicável de cada eixo. | `[DEC]` | Três resultados independentes; nenhum índice único substituindo os três. |
| P3 | Rating por dimensão sobre o máximo aplicável: **A ≥ 80%**, **B ≥ 60%**, **C ≥ 30%** (micro e pequena) ou **≥ 40%** (média e grande). | `[PLAN]` aba `Pontuações` linhas 18–40, confirmado por aritmética (ex.: setorial A ambiental máx. 170 → 136 / 102 / 51 / 68) | Reproduzir a tabela da planilha célula a célula, exceto a linha divergente (ver D2). |
| P4 | Aprovar o relatório de uma empresa inelegível **não** transforma o resultado em certificação concedida. | `[DEC]` | Relatório aprovado + inelegível → resultado registrado sem concessão; nenhum certificado emitido. |
| P5 | Preservar a distinção entre **preenchimento**, **resultado matemático**, **conclusão auditada** e **elegibilidade**. | `[DEC]` | Quatro estados/campos distintos, nunca derivados um do outro na interface. |
| P6 | Faixa abaixo de C: efeito e nomenclatura. | `[PEND]` | — |
| P7 | Política de **rating preliminar enquanto houver NA pendente**. | `[PEND]` (o documento trata como proposta) | — |
| P8 | Ratificação de critérios sinalizados como condicionais e regras de **recertificação**. | `[PEND]` | — |

## 3. "Não se aplica" (NA)

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| N1 | NA é **pedido separado da escala de maturidade**: tem justificativa, evidência pertinente e **decisão do auditor**. | `[DEC]` | NA não é uma alternativa do cartão; é um pedido com estado próprio (solicitado / aceito / recusado) e autoria. |
| N2 | NA **aceito** exclui o indicador do **numerador e do denominador**. | `[DEC]` | Teste de cálculo: aceitar NA em indicador de máximo 10 reduz o máximo aplicável do eixo em 10. |
| N3 | NA **recusado** mantém o indicador no cálculo. | `[DEC]` | Máximo aplicável inalterado após recusa. |
| N4 | Sem comprovação ao fim, e concluindo o auditor pelo **não atendimento**, registrar essa conclusão; se o indicador for obrigatório, marcar **obrigatório não atendido**. | `[DEC]` | O item fica com conclusão explícita, não com "sem resposta"; se obrigatório, aciona P1. |

## 4. Fluxo, bloqueio e publicação

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| F1 | Depois do envio para auditoria, **respostas e evidências ficam bloqueadas**. | `[DEC]` | Resposta, anexo, remoção de anexo e GED retornam 403 enquanto o ciclo está em auditoria. O bloqueio de anexos é **equivalente** ao de respostas. |
| F2 | A **empresa solicita** o retorno ao consultor. **Consultor e administrador** podem retornar o processo. O **gestor não pode**. | `[DEC]` | Pedido da empresa registra solicitação, não desbloqueia; retorno por consultor/admin desbloqueia e abre nova rodada. |
| F3 | Um **pedido de complemento do auditor, sozinho, não desbloqueia** a empresa. | `[DEC]` | Item em "complemento solicitado" permanece bloqueado para a empresa até o retorno autorizado. |
| F4 | Preservar a **versão enviada** e o **histórico das rodadas**. | `[DEC]` | Versões anteriores legíveis depois do retorno; nenhuma sobrescrita destrutiva de resposta, comentário ou evidência. |
| F5 | O **supervisor consulta e aprova** o trabalho concluído pelo auditor. Não altera respostas, enquadramentos, pontuação nem decisões de aplicabilidade. **Não recebe** poderes de devolução ou reabertura por inferência. | `[DEC]` | Nenhuma rota de avaliação de item, NA ou edição aceita perfil SUPERVISOR. |
| F6 | A **aprovação do supervisor libera automaticamente** à empresa o resultado e o relatório. **Não há liberação manual posterior** pelo administrador. | `[DEC]` | Aprovar → acesso liberado na mesma transação. A rota de liberação manual deixa de existir. |
| F7 | O **certificado/selo FIEMS** é disponibilizado **automaticamente no próprio sistema** quando houver concessão elegível. | `[DEC]` | Elegível + aprovado → certificado disponível sem ação humana. Inelegível → nenhum certificado. |
| F8 | O certificado/selo da **Bureau Veritas está fora do sistema**. | `[DEC]` | Nenhuma tela, campo, mensagem, aviso, botão ou instrução sobre envio externo. |
| F9 | A **visão geral da empresa** mostra andamento durante o preenchimento e resultados **após a aprovação**; nunca uma certificação definitiva antecipada. | `[DEC]` | Antes da aprovação: progresso e pendências. Depois: resultado, rating e elegibilidade. |
| F10 | Quem **submete para auditoria** (hoje: somente ADMIN). | `[PEND]` | — |
| F11 | O que ocorre quando o supervisor **não aprova** (F5 não lhe dá devolução). | `[PEND]` | — |
| F12 | Validação interna por **gestor/consultor** antes do envio (aprovar/reprovar com comentário). | `[COD]` — herdado do sistema antigo, não confirmado em fonte oficial | Manter o comportamento atual até confirmação; não ampliar. |
| F13 | **Prazos** por indicador: quem define, efeito do vencimento, notificação. | `[DEC]` reconhece que o gestor delega "indicadores e prazos conforme o documento"; o restante é `[PEND]` | — |

## 5. Matriz de permissões

Perfis: **ADM** administrador · **CON** consultor · **GES** gestor · **COL** colaborador · **AUD** auditor · **SUP** supervisor.
✅ permitido · ❌ proibido · ⚠️ permitido com restrição descrita · 🔸 pendente de decisão.

| Ação | ADM | CON | GES | COL | AUD | SUP | Origem |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| Cadastrar / editar / desativar usuários, perfis e vínculos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` |
| Operações pessoais em "Meu perfil" (sem autoconcessão de privilégio) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `[DEC]` |
| Trocar a própria empresa vinculada sem vínculo previamente concedido | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` |
| Delegar indicadores e prazos a pessoas já cadastradas | ⚠️ operacional | 🔸 | ✅ | ❌ | ❌ | ❌ | `[DEC]` |
| Ver indicadores do ciclo (descrição, respostas, comentários, evidências) | ✅ | ⚠️ vínculo | ⚠️ empresa | ⚠️ **só os atribuídos** | ⚠️ vínculo | ⚠️ vínculo, leitura | `[DEC]` |
| Responder indicador / anexar evidência em nome da empresa | ⚠️ autoria registrada | ✅ vínculo | ✅ | ⚠️ só atribuídos | ❌ | ❌ | `[DEC]` |
| Validar resposta interna (aprovar/reprovar com comentário) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | `[COD]` F12 |
| Submeter ciclo para auditoria | 🔸 hoje ✅ | 🔸 | 🔸 | ❌ | ❌ | ❌ | `[PEND]` F10 |
| Avaliar indicador / enquadrar / concluir parecer técnico | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` |
| Decidir pedido de NA (aceitar / recusar) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` |
| Pedir complemento (sem desbloquear a empresa) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` F3 |
| Solicitar retorno do processo | ❌ | ❌ | ✅ pedido | 🔸 | ❌ | ❌ | `[DEC]` F2 |
| Retornar o processo (desbloquear a empresa) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `[DEC]` F2 |
| Aprovar o resultado concluído | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `[DEC]` |
| Liberar resultado/relatório à empresa | ❌ (automático) | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` F6 |
| Disponibilizar certificado/selo FIEMS | ❌ (automático) | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` F7 |
| Administrar catálogo (cadernos, indicadores, alternativas) | ✅ versionado | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` C2 |
| Editar pontos/textos de alternativas de um ciclo em andamento | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` C2 + "não substituir o enquadramento técnico do auditor por edição administrativa" |

**Acúmulo de perfis** `[DEC]`: o único permitido é **ADMIN + CONSULTOR**. Todas as demais
combinações ficam impedidas (inclusive `AUDITOR + SUPERVISOR` e `CONSULTOR + AUDITOR`), e o
impedimento vale também **entre empresas diferentes**. Quem acumula ADMIN + CONSULTOR exerce as
ações de consultoria nos vínculos autorizados, **sem** se tornar auditor ou supervisor; as ações
de revisão registram **identidade real e função exercida**. O perfil ADMIN isolado não aprova.

**Verificação no servidor** `[DEC]` + regras de execução: toda autorização confere usuário ativo,
perfil, vínculo, empresa, ciclo, atribuição e estado — inclusive em **arquivos, downloads,
exportações e rotas antigas**.

## 6. Transições autorizadas

### 6.1 Ciclo / relatório

| De | Para | Quem | Condição | Origem |
|---|---|---|---|---|
| Em preenchimento | Em auditoria | 🔸 F10 (hoje ADMIN) | todos os itens com validação interna concluída | `[COD]` + `[PEND]` |
| Em auditoria | Aguardando supervisão | AUD | todos os itens avaliados pelo auditor | `[DEC]` F5 |
| Aguardando supervisão | Aprovado (resultado publicado) | SUP | parecer do auditor concluído | `[DEC]` F6 |
| Em auditoria · Aguardando supervisão | Em preenchimento (nova rodada) | CON, ADM | pedido de retorno da empresa; preserva a versão enviada | `[DEC]` F2, F4 |
| Aguardando supervisão | ⟶ ? quando o supervisor não aprova | — | — | `[PEND]` F11 |
| Aprovado | — | — | não há liberação manual posterior; publicação e certificado são automáticos | `[DEC]` F6, F7 |

Transições **proibidas**: SUP → qualquer alteração de item ou reabertura `[DEC]` F5; GES → retorno
`[DEC]` F2; ADM → aprovação de resultado `[DEC]`; auditor → desbloqueio da empresa via complemento
`[DEC]` F3.

### 6.2 Indicador (item do ciclo)

| De | Para | Quem | Condição |
|---|---|---|---|
| Aguardando resposta | Para análise interna | COL (atribuído), GES, CON, ADM | ciclo em preenchimento |
| Para análise interna | Aprovado internamente / Reprovado internamente | GES, CON | comentário obrigatório na reprovação |
| Reprovado internamente | Para análise interna | COL (atribuído), GES, CON, ADM | ciclo em preenchimento |
| Aprovado internamente | Em auditoria | — | na submissão do ciclo |
| Em auditoria | Avaliado (atendido / não atendido) | AUD | observação obrigatória |
| Em auditoria | Complemento solicitado | AUD | **não desbloqueia a empresa** (F3) |
| Complemento solicitado | Para análise interna | COL/GES/CON/ADM | **somente após retorno autorizado** por CON ou ADM (F2) |
| qualquer | NA solicitado | COL (atribuído), GES, CON, ADM | justificativa + evidência pertinente (N1) |
| NA solicitado | NA aceito / NA recusado | AUD | decisão registrada com autoria (N1) |

Estados atuais do código que **não** correspondem a esta tabela estão listados em
`diagnostico.md` § Achados (A3, A4, A5, A6).

## 7. Divergências entre fontes (registradas, não resolvidas)

| # | Divergência | Fontes | Impacto |
|---|---|---|---|
| D1 | **GS04** chamado "Certificado de **Regularidade** – Corpo de Bombeiros" na aba `Questionário` e "Certificado de **Conformidade** – Corpo de Bombeiros" nas abas `Caderno Geral` e `Consolidado`. Os textos das duas alternativas usam as duas formas na mesma linha. | `[PLAN]` × `[PLAN]` | Nome oficial do indicador obrigatório GS04. Precisa de ratificação antes da importação. |
| D2 | Na aba `Pontuações`, bloco **MICRO E PEQUENA**, a linha **SOCIAL / rating C** traz `60, 66, 66, 63, 66, 63, 63, 60` — exatamente os valores da linha de GOVERNANÇA, e não 30% do máximo social (`60, 63, 60, 57, 60, 63, 60, 54`). O bloco **Médias e Grandes** está consistente (40%). | `[PLAN]` interno | Limiar de rating C social para micro e pequena empresa. Enquanto não houver ratificação, **não** escolher: implementar o percentual ou copiar a célula muda o resultado de empresas reais. |
| D3 | Nomes dos cadernos B, D, F e H divergem entre a planilha e os rótulos do sistema antigo (`GET /sectors`, hoje no `seed.js`). | `[PLAN]` × `[COD]` | Pela prioridade das fontes vale a planilha; registrado para confirmação de nomenclatura visível à empresa. |
| D4 | O README diz "64 indicadores do Caderno Geral"; a planilha tem **59**. | `[COD]` × `[PLAN]` | Vale a planilha. O README deve ser corrigido quando o catálogo real for importado. |
| D5 | A tela pública de autoavaliação anuncia "20 perguntas objetivas" e aplica **33**. | `[COD]` interno | Texto da tela pública; ajuste de conteúdo, sem efeito na certificação. |

## 8. Pendências que bloqueiam implementação

| # | Pendência | Bloqueia | Pode avançar sem ela |
|---|---|---|---|
| X1 | `Plataforma esg fiems.docx` não está no disco | ratificação de F10, F12, F13, P6–P8 e do fluxo de recertificação | catálogo, vínculos, ciclos, bloqueio, cálculo E/S/G, obrigatórios, NA |
| X2 | HTML aprovado e imagens de referência dos cards não estão no disco | fidelidade visual dos cards de alternativa e organização final da listagem | contratos de API, filtros, agrupamentos, modal e destaque do setorial (estrutura já decidida) |
| X3 | D1 (nome de GS04) | rótulo exibido de GS04 | importação dos outros 138 indicadores |
| X4 | D2 (limiar C social, micro e pequena) | rating social de micro e pequena empresa | rating ambiental e de governança; rating social de média e grande; elegibilidade por obrigatórios |
| X5 | F10 (quem submete para auditoria) | botão/rota de submissão | bloqueio, auditoria, supervisão e publicação |
| X6 | F11 (supervisor que não aprova) | estado terminal alternativo do ciclo | aprovação e publicação automática |
| X7 | F13 (regras de prazo) | notificação e efeito do vencimento | atribuição por indicador (já decidida) |
| X8 | P7 (rating preliminar com NA pendente) | exibição de rating antes da decisão do auditor | cálculo definitivo após as decisões de NA |
