# Regras do Programa ESG-FIEMS — registro com origem e critério de aceite

Base de regras para a reconstrução. Cada regra traz a **origem** e o **critério de aceite**
que a comprova. Regras sem origem oficial ficam marcadas como pendência e **não** devem ser
implementadas por inferência.

Estado em 22/10/2026. Commit inspecionado: `42ba516`. Revisado contra a **especificação oficial
`Plataforma esg fiems.docx` v1.0 (19/10/2026)**, recebida depois do diagnóstico.

## Legenda de origem

| Marca | Significado | Prioridade |
|---|---|---|
| `[DEC]` | Decisão explícita do responsável (inclui as decisões consolidadas e as permissões fechadas posteriormente) | 1 |
| `[DOC]` | Documento `Plataforma esg fiems.docx` | 2 |
| `[PLAN]` | Planilha oficial `Indicadores Programa ESG FIEMS 1.xlsx` (abas `Questionário`, `Consolidado`, `Pontuações`, `Caderno Geral`, `A`–`H`) | 3 |
| `[HTML]` | HTML aprovado / imagens de referência dos cards | 4 |
| `[COD]` | Comportamento do código, README ou conversa antiga — **contexto histórico, não autoridade** | 5 |
| `[PEND]` | Decisão ausente: preservar a parte dependente e não decidir no código | — |

**Fontes disponíveis:** `[DEC]`; `[DOC]` — `Plataforma esg fiems.docx` v1.0, entregue na raiz do
repositório (arquivo não versionado); `[PLAN]` — `Indicadores Programa ESG FIEMS 1.xlsx`; `[COD]`.
Também foram entregues (22/10/2026) os **cadernos oficiais em PDF** — `Caderno GERAL` e `A`–`H`, na
pasta `Cadernos indicadores/`, fora do versionamento. A especificação § 17 manda **conferir a
correspondência entre os cadernos e a planilha antes da importação**: essa conferência é parte da
etapa de catálogo (E3), não desta.

**Ainda não disponível:** `[HTML]` (HTML aprovado e imagens de referência dos cards) — necessário
para a etapa visual, não bloqueia as anteriores.

**Leitura do documento:** ele distingue o que está **definido** do que é **proposta** ou
**pendente**, e o diz explicitamente ("Proposta:", "pendente", "a confirmar"). Proposta escrita no
documento não é regra aprovada. As decisões do responsável (`[DEC]`) prevalecem sobre propostas e
pendências do documento.

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
| C9 | Código oficial do indicador = `<caderno><eixo><NN>`: Geral `GE01`, `GS01`, `GG01`; setorial A `AE01`, `AS01`; etc. O caderno **G usa `G1`** (`G1E01`, `G1S01`, `G1G01`) para não colidir com o Geral. | `[PLAN]` colunas `Códigos` / `codigo_ajustado`, confirmado nos cadernos em PDF | Nenhum código no formato `CG-E01` / `A-S02` (formato inventado na reconstrução). Implementado e testado. |
| C12 | O catálogo é **versionado**: versões em rascunho e publicadas, com arquivo de origem, SHA-256, autoria, contagens e relatório. Versão publicada não se altera; mudança vira versão nova. Cada ciclo fixa a versão com que foi aberto. | `[DOC]` § 14 + `[DEC]` C2 | Publicar versão nova não altera resposta, critério nem resultado de ciclo anterior (teste automatizado). |
| C13 | A **descrição do indicador** e a **orientação de verificação** não estão na planilha (que traz descrição por alternativa): estão nos cadernos em PDF. Ficam **nulas** até a conferência, nunca preenchidas por texto gerado. | `[PLAN]` × `[DOC]` § 9 | Relatório de importação declara a ausência; nenhuma descrição inventada no banco. |
| C10 | Cada indicador carrega **Eixo** (E/S/G), **Tópico**, **ODS** e nome oficial. | `[PLAN]` | Campos preservados na importação; ODS pode ter mais de um valor (ex.: `3, 8`). |
| C11 | Nomes oficiais dos cadernos: Geral; A Alimentos e Bebidas; B Indústria Frigorífica e Derivados; C Construção Civil; D Indústrias de Transformação Diversas; E Energia, Telecomunicações, Resíduos e Similares; F Extração de Minerais Metálicos, Não Metálicos/Agroindústria; G Papel e Celulose; H Calçados e Componentes para Calçados, Couro, Confecções Têxteis e Artefatos. | `[PLAN]` células `B1` das abas | Divergem dos rótulos do sistema antigo em B, D, F e H (ver § Divergências). |

## 2. Cálculo, elegibilidade e rating

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| P1 | **Primeiro** verificar os requisitos obrigatórios aplicáveis. **Um único obrigatório não atendido impede a elegibilidade**, mesmo com pontuação alta. | `[DEC]` | Caso de teste: 100% dos pontos possíveis + 1 obrigatório não atendido → inelegível. |
| P2 | E, S e G calculados **separadamente**: pontos obtidos ÷ máximo aplicável de cada eixo. | `[DEC]` | Três resultados independentes; nenhum índice único substituindo os três. |
| P3 | Rating por dimensão sobre o máximo aplicável: **A ≥ 80%**; **B 60%–79,99%**; **C 30%–59,99%** (micro e pequena) ou **40%–59,99%** (média e grande); **abaixo de C** se menor. | `[DOC]` § 13 RN04 (tabela de faixas) + `[PLAN]` aba `Pontuações` | Percentual com precisão integral; arredondar **somente** para exibição (79,95% continua abaixo de 80%). Testar 39,99 / 40 / 59,99 / 60 / 79,99 / 80 e 30. |
| P9 | Máximo aplicável **zero** em um eixo: exibir "sem base para classificação" e encaminhar para revisão. Não dividir por zero nem atribuir A. | `[DOC]` § 8 e § 13 RN06 | Eixo sem base não gera faixa nem erro. |
| P10 | Rating identificado como **simulado, preliminar ou homologado**; rating matemático, bloqueios e decisão de certificação aparecem separados. | `[DOC]` § 8 e § 13 RN07 | Nenhuma tela apresenta um rating aparentemente definitivo. |
| P4 | Aprovar o relatório de uma empresa inelegível **não** transforma o resultado em certificação concedida. | `[DEC]` | Relatório aprovado + inelegível → resultado registrado sem concessão; nenhum certificado emitido. |
| P5 | Preservar a distinção entre **preenchimento**, **resultado matemático**, **conclusão auditada** e **elegibilidade**. | `[DEC]` | Quatro estados/campos distintos, nunca derivados um do outro na interface. |
| P6 | A faixa **abaixo de C** existe (< 30% MPE / < 40% média e grande). O **efeito institucional** dessa faixa e a permanência limitada em C (Manual § 7.7: uma recertificação no mesmo nível, depois evolução para ao menos B) seguem pendentes de ratificação — inclusive se o controle é por eixo ou pela composição do rating. Até lá, alerta de análise, sem indeferimento automático. | `[DOC]` § 13 RN04 e § 14 | — |
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
| F10 | **Solicitar auditoria** é do gestor da empresa (a Administração também pode registrar a solicitação). **Liberar o processo** para auditoria é da **Administração FIEMS** — liberação operacional, não aprovação técnica. | `[DEC]` + `[DOC]` § 3 ("Solicitar auditoria: Adm Sim / Empresa Gestor") e § 11 ("Gestor manifesta intenção; Administração verifica dados de escopo e encaminha designação") | Gestor solicita → ciclo continua em preenchimento; Administração libera → ciclo entra em auditoria. Liberar não decide resposta, parecer nem resultado. |
| F11 | O que ocorre quando o supervisor **não aprova**. O documento trata devolução da supervisão como **proposta** (§ 3 e § 12) e a homologação como pendente; a decisão do responsável é que o supervisor **consulta e aprova**, sem poderes de devolução por inferência. | `[PEND]` | Nenhuma devolução é implementada. Sem aprovação, o ciclo permanece aguardando supervisão. |
| F12 | Validação interna por **gestor/consultor** antes do envio (aprovar/reprovar com comentário). | `[COD]` + `[DOC]` § 3 (consultor "revisa informações e orienta adequações"; auditor aprova "indicadores aprovados pelos gestores e consultores") | Mantido como está, sem ampliação: o consultor não conclui parecer. |
| F13 | **Delegação por indicador com prazo** é do gestor do projeto. Quem vê todos os indicadores ou apenas os atribuídos **era** pendência do documento (§ 2) — resolvida pela decisão do responsável: colaborador só vê os atribuídos. O **efeito do vencimento** segue pendente; o documento afirma apenas que "o prazo vencido não encerra a pendência nem muda a pontuação por si só" (§ 10). | `[DEC]` + `[DOC]` § 9, § 10 (Manual § 7.6) | Prazo gravado na atribuição, sem efeito automático. |
| F14 | **Não respondido é estado próprio** e não pode ser gravado como "não conforme". | `[DOC]` § 9 | Item sem resposta aparece como não respondido; a conclusão da avaliação é apresentada separadamente. |
| F15 | Rascunho: salvar sem submeter; ao submeter, validar no servidor. Depois da submissão, **congelar a versão enviada**; complementações geram nova versão em rodada autorizada. | `[DOC]` § 9 (declarada como proposta de implementação) + `[DEC]` F1/F4 | Versão enviada preservada e legível depois do retorno. |

## 4.1 Cadastros, vínculos e ciclos (especificação § 4, § 5, § 11, § 14)

| # | Regra | Origem | Critério de aceite |
|---|---|---|---|
| A1 | **Usuário, perfil e vínculo são entidades diferentes.** Usuário da empresa tem **uma** empresa no escopo inicial; consultor, auditor e supervisor podem ter **várias**, com vínculos editáveis (acrescentar e remover). | `[DOC]` § 5 + `[DEC]` | Conceder um terceiro vínculo a um profissional não remove os anteriores; usuário da empresa recusa um segundo vínculo. |
| A2 | **Cargo não concede privilégio** e não é exigido de consultor, auditor e supervisor. | `[DOC]` § 2, § 5 | Cadastro de profissional sem cargo é aceito; nenhuma permissão deriva do cargo. |
| A3 | **CNPJ**: obrigatório, único, validado na estrutura e nos dígitos verificadores, armazenado como **texto sem máscara** e exibido formatado. A validação não substitui consulta cadastral oficial. | `[DOC]` § 4 | CNPJ com DV inválido é recusado; duplicado orienta a editar o cadastro existente. |
| A4 | **E-mail** obrigatório, validado e único considerando espaços e caixa. | `[DOC]` § 5 | `NOVO@x.com ` e `novo@x.com` não coexistem. |
| A5 | **Inativação** (pessoa e empresa) preserva avaliações, arquivos, vínculos, autoria e histórico; a conta inativa não entra e pode ser reativada. **Não é permitido desativar o último administrador ativo sem substituto.** | `[DOC]` § 4, § 5 | Inativar não apaga nada; o último ADMIN ativo é recusado com mensagem própria. |
| A6 | **Remoção de vínculo ou inativação impede novos acessos e invalida permissões já carregadas.** | `[DOC]` § 2 | A sessão aberta deixa de valer na requisição seguinte. |
| A7 | A **seleção de contexto** escolhe um vínculo vigente e nunca cria ou amplia acesso; a troca não mantém em tela nem em downloads dados da empresa anterior. Mudança de empresa e concessão de perfil **não são autodeclaradas**. | `[DOC]` § 7 + `[DEC]` | Selecionar empresa sem vínculo → 403; após a troca, nenhuma consulta devolve dados da empresa anterior. |
| A8 | **Vários ciclos por empresa**, com versão de catálogo e caderno congelados, estado, responsáveis designados e relação com o ciclo anterior. Recertificação cria **novo** ciclo ligado ao anterior, sem reiniciar o registro antigo. | `[DOC]` § 11, § 14 + `[DEC]` C2 | Empresa com dois ciclos; o segundo aponta para o primeiro; editar catálogo não altera ciclo anterior. |
| A9 | **Vínculo com a empresa não basta** para o auditor atuar: a avaliação precisa estar **atribuída** a ele e em etapa permitida. Substituição de profissional preserva histórico e revoga o acesso anterior. | `[DOC]` § 11 | Auditor vinculado sem designação no ciclo → 403; designado → 200; designação revogada → 403. |
| A10 | **Troca de caderno** afeta nova avaliação ou revisão controlada, sem apagar respostas de ciclos anteriores e sem recalcular resultado homologado. | `[DOC]` § 4 | Alterar o caderno da empresa não muda o caderno do ciclo em andamento. |
| A11 | **Exclusões físicas de registros já usados em avaliação devem ser evitadas**; identificadores são estáveis e mudanças de nome, e-mail ou CNPJ não rompem vínculos históricos. | `[DOC]` § 15 | Excluir indicador, alternativa, arquivo, empresa ou ciclo com avaliação vinculada é recusado. |
| A12 | Arquivos **executáveis são bloqueados** no envio de evidência; tipo e tamanho validados. | `[DOC]` § 10 | Upload com extensão executável é recusado. |
| A13 | Recuperação de acesso por **código ou link temporário de uso único**; a senha anterior nunca é reenviada. Sessão encerrada não pode ser reutilizada. | `[DOC]` § 7 | Link reutilizado → 401; logout invalida o token. |

## 5. Matriz de permissões

Perfis: **ADM** administrador · **CON** consultor · **GES** gestor · **COL** colaborador · **AUD** auditor · **SUP** supervisor.
✅ permitido · ❌ proibido · ⚠️ permitido com restrição descrita · 🔸 pendente de decisão.

| Ação | ADM | CON | GES | COL | AUD | SUP | Origem |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| Cadastrar / editar / desativar usuários, perfis e vínculos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` |
| Operações pessoais em "Meu perfil" (sem autoconcessão de privilégio) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `[DEC]` |
| Trocar a própria empresa vinculada sem vínculo previamente concedido | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` |
| Delegar indicadores e prazos a pessoas já cadastradas | ⚠️ operacional | ❌ | ✅ | ❌ | ❌ | ❌ | `[DEC]` `[DOC]` § 9 |
| Ver indicadores do ciclo (descrição, respostas, comentários, evidências) | ✅ | ⚠️ vínculo | ⚠️ empresa | ⚠️ **só os atribuídos** | ⚠️ vínculo **+ designação no ciclo** | ⚠️ vínculo **+ designação**, leitura | `[DEC]` `[DOC]` § 11 |
| Responder indicador / anexar evidência em nome da empresa | ⚠️ autoria registrada | ✅ vínculo | ✅ | ⚠️ só atribuídos | ❌ | ❌ | `[DEC]` |
| Validar resposta interna (aprovar/reprovar com comentário) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | `[COD]` F12 |
| **Solicitar** auditoria | ✅ operacional | ❌ | ✅ | ❌ | ❌ | ❌ | `[DEC]` `[DOC]` F10 |
| **Liberar** o processo para auditoria (operacional) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DEC]` `[DOC]` F10 |
| Designar auditor e supervisor no ciclo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `[DOC]` § 3, § 11 |
| Avaliar indicador / enquadrar / concluir parecer técnico | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` |
| Decidir pedido de NA (aceitar / recusar) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` |
| Pedir complemento (sem desbloquear a empresa) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `[DEC]` F3 |
| Solicitar retorno do processo | ❌ | ❌ | ✅ pedido | ❌ | ❌ | ❌ | `[DEC]` F2 |
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

| De | Para | Quem | Condição | Origem | Estado da implementação |
|---|---|---|---|---|---|
| Em preenchimento | Em preenchimento **com auditoria solicitada** | GES (ADM operacional) | registra a solicitação; **não** libera o processo | `[DEC]` `[DOC]` F10 | implementado (`POST /reports/requestAudit/:companyId`) |
| Em preenchimento (solicitada) | Em auditoria | **ADM** | solicitação registrada **e** todos os itens com validação interna concluída (ou já decididos pelo auditor em rodada anterior); a versão enviada é fotografada | `[DEC]` `[DOC]` F10 | implementado (`POST /reports/releaseAudit/:companyId`) |
| Em auditoria | Aguardando supervisão | AUD designado | todos os itens avaliados pelo auditor | `[DEC]` F5 | implementado (`POST /auditory/submitToSupervisor/:companyId`) |
| Aguardando supervisão | Aprovado | SUP designado | parecer do auditor concluído | `[DEC]` F6 | implementado; **publicação e certificado automáticos são E6** |
| Em auditoria · Aguardando supervisão | Em preenchimento (nova rodada) | CON, ADM | pedido de retorno da empresa registrado; preserva a versão enviada e abre rodada nova | `[DEC]` F2, F4 | implementado (`POST /reports/return/:companyId`) |
| Em auditoria | — (pedido de complemento no item) | AUD | **não** desbloqueia a empresa | `[DEC]` F3 | implementado |
| Aguardando supervisão | ⟶ ? quando o supervisor não aprova | — | — | `[PEND]` F11 | não implementado por decisão |
| Aprovado | Novo ciclo (recertificação) | ADM | ciclo anterior concluído; novo ciclo aponta para ele | `[DOC]` § 14 | estrutura implementada (ciclos relacionados); regras de recertificação pendentes |
| Aprovado | — | — | não há liberação manual posterior; publicação e certificado são automáticos | `[DEC]` F6, F7 | **E6** |

Transições **proibidas**: SUP → qualquer alteração de item ou reabertura `[DEC]` F5; GES → retorno
`[DEC]` F2; ADM → aprovação de resultado `[DEC]`; auditor → desbloqueio da empresa via complemento
`[DEC]` F3.

### 6.2 Indicador (item do ciclo)

| De | Para | Quem | Condição | Estado da implementação |
|---|---|---|---|---|
| Aguardando resposta | Para análise interna | COL (atribuído), GES, CON, ADM | ciclo em preenchimento; autoria e função exercida registradas | implementado |
| Para análise interna | Aprovado internamente / Reprovado internamente | GES, CON | comentário obrigatório na reprovação | implementado |
| Reprovado internamente | Para análise interna | COL (atribuído), GES, CON, ADM | ciclo em preenchimento | implementado |
| Aprovado internamente | Em auditoria | — | na liberação do processo pela Administração | implementado |
| Em auditoria | Avaliado (atendido / não atendido) | AUD designado | observação obrigatória | implementado |
| Em auditoria | Complemento solicitado | AUD designado | **não desbloqueia a empresa** (F3) | implementado |
| Complemento solicitado | Aguardando resposta | CON, ADM | **somente após retorno autorizado** (F2); demais itens conservam a decisão do auditor | implementado |
| qualquer | NA solicitado | COL (atribuído), GES, CON, ADM | justificativa + evidência pertinente (N1) | **E4** — hoje existe apenas a marca booleana |
| NA solicitado | NA aceito / NA recusado | AUD designado | decisão registrada com autoria (N1) | **E4** — a decisão já é exclusiva do auditor; o pedido com justificativa é E4 |

Estados atuais do código que **não** correspondem a esta tabela estão listados em
`diagnostico.md` § Achados (A3, A4, A5, A6).

## 7. Divergências entre fontes (registradas, não resolvidas)

Conferência completa, com evidência e método, em [`importacao-catalogo.md`](importacao-catalogo.md).

| # | Divergência | Fontes | Impacto |
|---|---|---|---|
| D1 | **GS04** chamado "Certificado de **Regularidade** – Corpo de Bombeiros" na aba `Questionário` e "Certificado de **Conformidade** – Corpo de Bombeiros" nas abas `Caderno Geral` e `Consolidado`. **O caderno em PDF diz "Regularidade"** (duas fontes contra uma). | `[PLAN]` × `[PLAN]` × caderno PDF | Nome oficial do indicador obrigatório GS04. A importação grava o nome do `Questionário` e mantém a divergência registrada; ratificação pendente. |
| D6 | **G1E01**: "Aproveitamento energético" na aba `Questionário` × "Recursos Naturais" no `Consolidado` **e no caderno G em PDF**. Aqui o `Questionário` é o divergente. | `[PLAN]` × caderno PDF | Nome oficial do indicador. Ratificação pendente. |
| D7 | **AE03** e **GE06**: a pontuação do nível "Iniciante" difere entre a planilha e a página do caderno (AE03 = 4 na planilha e 0 no caderno; GE06 = 0 na planilha e 4 no caderno), com o **mesmo texto de nível** nas duas fontes. | `[PLAN]` × cadernos PDF | Afeta pontos obtidos e máximo aplicável desses indicadores. Vale a planilha na importação, com a divergência registrada; ratificação pendente **antes** do cálculo definitivo (E5). |
| D8 | **GS08**: "Inexistência de trabalho infantil, forçado ou análogo ao escravo" (planilha) × "Trabalho infantil, forçado, escravo ou análogo ao escravo" (caderno). `BE04` e `G1E02` têm diferenças de grafia entre abas. | `[PLAN]` × caderno PDF | Rótulo exibido. Ratificação pendente. |
| D2 | Na aba `Pontuações`, bloco **MICRO E PEQUENA**, a linha **SOCIAL / rating C** traz `60, 66, 66, 63, 66, 63, 63, 60` — exatamente os valores da linha de GOVERNANÇA, e não 30% do máximo social (`60, 63, 60, 57, 60, 63, 60, 54`). O bloco **Médias e Grandes** está consistente (40%). | `[PLAN]` interno × `[DOC]` § 13 RN04 | O documento define a faixa por **percentual** (30%/40%), o que aponta erro de célula na planilha; pela prioridade das fontes o documento prevalece, mas a planilha é a base de conferência do cálculo. A divergência **permanece como pendência do catálogo/cálculo** e precisa de ratificação da FIEMS antes de o rating social de micro e pequena ser declarado pronto. Nada foi escolhido no código: o cálculo é a etapa E5. |
| D3 | Nomes dos cadernos B, D, F e H divergem entre a planilha e os rótulos do sistema antigo (`GET /sectors`, hoje no `seed.js`). | `[PLAN]` × `[COD]` | Pela prioridade das fontes vale a planilha; registrado para confirmação de nomenclatura visível à empresa. |
| D4 | O README diz "64 indicadores do Caderno Geral"; a planilha tem **59**. | `[COD]` × `[PLAN]` | Vale a planilha. O README deve ser corrigido quando o catálogo real for importado. |
| D5 | A tela pública de autoavaliação anuncia "20 perguntas objetivas" e aplica **33**. | `[COD]` interno | Texto da tela pública; ajuste de conteúdo, sem efeito na certificação. |

## 8. Pendências que bloqueiam implementação

| # | Pendência | Bloqueia | Pode avançar sem ela |
|---|---|---|---|
| X1 | ~~Especificação indisponível~~ — **recebida em 22/10/2026** e reconciliada aqui. Permanecem as pendências que o próprio documento declara: homologação/devolução da supervisão (F11), efeito do prazo vencido (F13), simulação de rating com NA pendente (P7), faixa abaixo de C e permanência em C (P6/P8), emissão ou apenas guarda do certificado, obrigatoriedade do cartão CNPJ e do nome fantasia, critério oficial de enquadramento de porte, autenticação adicional da Administração e integração com identidade corporativa FIEMS. | as decisões citadas | cadastros, vínculos, ciclos, autorização, catálogo, bloqueio e cálculo E/S/G |
| X2 | HTML aprovado e imagens de referência dos cards não estão no disco | fidelidade visual dos cards de alternativa e organização final da listagem | contratos de API, filtros, agrupamentos, modal e destaque do setorial (estrutura já decidida) |
| X3 | D1 (nome de GS04) | rótulo exibido de GS04 | importação dos outros 138 indicadores |
| X4 | D2 (limiar C social, micro e pequena) | rating social de micro e pequena empresa | rating ambiental e de governança; rating social de média e grande; elegibilidade por obrigatórios |
| X5 | ~~F10~~ — **resolvido** pela especificação (§ 3 e § 11) e pela decisão do responsável: o gestor solicita, a Administração FIEMS libera o processo. | — | — |
| X6 | F11 (supervisor que não aprova) | estado terminal alternativo do ciclo | aprovação e publicação automática |
| X7 | F13 (regras de prazo) | notificação e efeito do vencimento | atribuição por indicador (já decidida) |
| X8 | P7 (rating preliminar com NA pendente) | exibição de rating antes da decisão do auditor | cálculo definitivo após as decisões de NA |
