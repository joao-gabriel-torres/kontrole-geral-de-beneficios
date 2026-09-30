# Telas restantes e pendências — design

Data: 2026-09-29 · Branch: `feat/telas-restantes` (a partir da `main`, com o fluxo principal já integrado)

## Objetivo

Deixar o protótipo inteiro funcionando contra a API real, com telas **pixel perfect** (`docs/design/Acionamentos.dc.html`):

- **Gestor:** Painel, Prestadores (com importação e exportação de planilha) e Checklists.
- **Prestador:** Agenda.
- **Pendências:** as da revisão do fluxo principal que ainda valem.

**Critério de sucesso:** com `pnpm dev` e o seed do dia, cada tela abaixo funciona contra a API real, e o `pnpm visual` fica dentro dos limites em todas as regiões novas. `pnpm lint`, `format:check`, `typecheck`, `test`, `build` e `pnpm e2e` passam.

## Fontes

- **Levantamento verificado de cada tela**, a referência de detalhe da implementação: textos exatos, fórmulas com linha do protótipo, estados, casos visuais e medidas. Fica em [`2026-09-29-telas-restantes/`](2026-09-29-telas-restantes/):
  - `painel.md`, `prestadores.md`, `checklists.md` e `agenda.md`;
  - `pendencias.md`, a conferência de cada pendência contra o código;
  - `mapa-do-codigo.md`, as convenções do monorepo.
- **Regra geral:** quando o README e o código do protótipo divergem, **vale o código do protótipo**. Isso inclui efeitos de layout que parecem acidentais, como a barra achatada do gráfico e as colunas estreitas do ranking e da fila no mobile. Eles são replicados como estão, e a mudança fica como decisão de produto futura.
- **Onde este documento prevalece:** quando decide algo diferente do levantamento (as "Dúvidas" de cada tela).

## Decisões gerais

1. **Singular.** O protótipo escreve "1 itens", "1 ativos de 1 credenciados" e "1 novos". O app corrige para o singular ("1 item", "1 ativo de 1 credenciado", "1 novo"). Os casos visuais usam contagens maiores que 1, então a comparação não muda.
2. **Carregando e erro.** Os estados que o protótipo não tem seguem o padrão de Aprovações: mensagem da API (`mensagemDeErro`) num cartão branco. Não se mostram zeros falsos enquanto os dados carregam.
3. **"Hoje".** É sempre `America/Sao_Paulo`: `dataSP` na API e os formatos de `@kgb/ui` nos fronts.
4. **Casos visuais que gravam no banco ficam fora.** Salvar, alternar o switch, excluir e importar mudariam os dados dos casos seguintes. Os passos disponíveis são `clicar` (com `inicio` para nomes com contagem), `preencher`, `anexar` (arquivos em `tools/visual/fixtures/`) e `esperar`.
5. **Prestador inativo.** Desativar só tira o prestador da escolha do Novo acionamento. Ele **continua entrando** e conclui os atendimentos que já tem ("Desative o cadastro para parar de receber novos, ou conclua os atuais"). **Só o excluído** perde login e sessão (403 `PRESTADOR_EXCLUIDO`). Já implementado no esqueleto.

## Painel (gestor)

**API:** `GET /api/painel?periodo=7|30`, só gestor.
- As regras ficam em `apps/api/src/dominio/painel.ts`: funções puras, TDD com os números do seed do levantamento.
- A resposta traz tudo pronto:
  - KPIs: em aberto, para hoje, aguardando, aprovação `{aprovadas, total}`, tempo médio em minutos (fração, ou `null`) e inviáveis `{quantidade, totalPeriodo}`;
  - volume por dia;
  - reprovações por tipo, já ordenadas;
  - ranking, já ordenado.
- **Arredondamentos em TypeScript** (`Math.round`), não no SQL. O seed tem empates de .5: 82,5 min dá "1h23", 122,5 min dá "2h03" e 12,5% dá "13%".
- **Duração.** Arredonda os minutos totais antes de dividir, o que evita o "1h60" do protótipo. Sem dados, mostra "—" no KPI e no ranking.
- **Ranking:**
  - entram os prestadores ativos (sempre) e os inativos com atividade no período; excluídos nunca;
  - desempate por `criadoEm asc, id asc`.
- **Reprovações por tipo:** agrupadas pelo `tipoNome` gravado na demanda (snapshot). Um tipo renomeado aparece com os dois nomes, como no protótipo.

**Gestor:**
- **Fila de aprovação:** usa `GET /api/acionamentos?status=aguardando`, com `ordenarFila` e os 4 primeiros.
- **Chave da consulta:** começa com `'acionamentos'` (`['acionamentos', 'painel', periodo]`), para as mutações invalidarem o Painel junto.
- **Período:** estado de módulo, que volta a 7 dias ao sair da conta (`usarSaida`).
- **Atualização:** ao voltar à tela, ao focar a janela e a cada 30 s enquanto o Painel está aberto (o protótipo re-renderiza a cada 30 s).
- **KPIs clicáveis** (com `cursor: pointer`):
  - "Acionamentos em aberto" leva à lista sem filtro, como no protótipo;
  - "Aguardando aprovação" leva a Aprovações.
- **Detalhe pela fila:** `/painel/:id`, com o voltar "Painel" (já no esqueleto).
- **Avatar com "Sair" no mobile:** continua, e as regiões dos casos mobile pulam o canto dele.

## Checklists (gestor)

O título da página é **"Tipos de demanda"**, como no código do protótipo.

**API**, só gestor. `GET /api/tipos` fica como está.

- **`POST /api/tipos { nome }`:**
  - trim;
  - nome vazio: 422, "Informe o nome do tipo";
  - duplicado entre os tipos não excluídos, comparando sem acentos e sem maiúsculas: 409, "Já existe um tipo com esse nome";
  - cor pela paleta do protótipo (`['#0069BD','#FC7608','#B37BE7','#F47B50','#FF6A5D','#FFB523','#363853','#47C272'][quantidade de tipos não excluídos % 8]`);
  - checklist vazio;
  - devolve o tipo.
- **`PATCH /api/tipos/{id} { nome?, checklist? }`:**
  - `checklist` é a lista inteira: editar, subir, remover e adicionar são todos um PATCH;
  - trim em tudo; etapas vazias são descartadas;
  - limites: nome até 60 caracteres, etapa até 200;
  - nome com as mesmas regras do POST.
- **`DELETE /api/tipos/{id}`:**
  - exclusão lógica (`excluidoEm`);
  - recusa o último tipo ativo: 409, "Mantenha pelo menos um tipo de demanda";
  - apaga os vínculos de especialidade (`prestador_especialidade`);
  - os acionamentos existentes guardam a cópia do checklist e não mudam.

**Gestor:**
- **Salvamento:**
  - nome e etapas salvam sozinhos com debounce de 600 ms, como o autosave do prestador;
  - a lista da esquerda reflete o que se digita (rascunho local);
  - nome vazio não é enviado e volta ao último salvo ao sair do campo;
  - erro da API vira toast com a mensagem.
- **Seleção:**
  - começa no primeiro da lista e fica em estado de módulo;
  - depois de excluir, vai para o primeiro da lista, como no protótipo;
  - criar um tipo seleciona o tipo novo.
- **Excluir tipo** não pede confirmação, como no protótipo.
- **Ordem das etapas (pedido do usuário, 30/09, substitui o parágrafo do protótipo):** cada etapa
  tem alça de arrastar (SortableJS), "Subir" e "Descer" (apagados nas pontas, sem `disabled`) e
  Alt+↑/↓ no campo; o texto da etapa aparece como campo editável. As linhas das etapas ficam
  mascaradas no comparador (`ocultarNoApp`).
- **"Adicionar etapa" com o campo vazio** não faz nada, sem `disabled` e sem erro (o caso visual rola até o botão).
- **O rascunho "Nova etapa"** é limpo ao trocar de tipo.

## Prestadores e planilha (gestor)

**API do cadastro**, só gestor:
- **`GET /api/prestadores/cadastro`:** os prestadores não excluídos, com os campos do cadastro e mais:
  - `especialidades` ordenadas `[{id, nome}]`, sem os tipos excluídos;
  - `emAberto` (aberto, em_andamento, reprovado e aguardando) e `total`.

  A lista é ordenada por nome em pt-BR. O `GET /api/prestadores` atual (ativos, para o Novo acionamento) fica como está.
- **`POST /api/prestadores` e `PATCH /api/prestadores/{id}`** recebem `{nome, documento, telefone, email?, regiao?, especialidades: id[]}`:
  - **Validação e mensagens do protótipo, na ordem dele:**
    - "Informe o nome";
    - "CPF ou CNPJ inválido";
    - "Documento já cadastrado para {nome}" (409);
    - "Informe o telefone com DDD".
  - **Dígitos verificadores:** só para documento novo ou alterado. Os documentos do seed têm DV inválido e continuam editáveis. As funções ficam em `dominio/documentos.ts` (no esqueleto).
  - **Formato gravado:** documento e telefone só com dígitos. Especialidades em ordem e sem repetição.
  - **Ao criar:**
    - `cor = corDoPrestador(total de prestadores, contando os excluídos)`;
    - `status = ativo`;
    - `credenciadoDesde` = hoje em SP.
  - **Login:** criar um prestador **não** cria login. O acesso de prestadores novos (convite ou senha) é uma decisão de produto pendente.
- **`PATCH /api/prestadores/{id}/status { status }`** (o switch e o "Desativar"): sem confirmação, como no protótipo.
- **`DELETE /api/prestadores/{id}`:**
  - com `emAberto > 0`: 409 `prestador_com_acionamentos`;
  - sem acionamentos em aberto: `excluidoEm = agora`, `status = inativo`, e **revoga as sessões** do usuário vinculado.
- **Busca** (no front): nome, documento (formatado ou só dígitos), região e e-mail, ignorando acentos e maiúsculas.

**API da planilha**, só gestor (`rotas/planilha.ts`, registrada antes do cadastro):
- **`POST /api/prestadores/planilha/previa`** (multipart `arquivo`, até 5 MB e 2000 linhas): não grava nada. Devolve:
  - as linhas, cada uma com um selo: **Novo**, **Atualizar** ou erro (*Sem nome*, *Documento inválido*, *Duplicado na planilha*, *Telefone inválido*);
  - o resumo;
  - os **ausentes** (ativos cujo documento não está no arquivo).
- **`POST /api/prestadores/planilha/importacao`** (multipart `arquivo` + `desativarAusentes`):
  - recalcula a prévia e aplica tudo **numa transação**;
  - devolve `{novos, atualizados, desativados}`;
  - grava um **registro de auditoria** (tabela nova, única migração permitida nesta frente) com o autor, a data, o nome do arquivo e as contagens.
- **`GET /api/prestadores/planilha`:** a exportação `credenciados-russo-DD-MM-AAAA.xlsx`, com as colunas do README e documento e telefone formatados (prestadores não excluídos).
- **`GET /api/prestadores/planilha/modelo`:** `modelo-credenciados-russo.xlsx`, com o cabeçalho e a linha de exemplo do protótipo.
- **Leitura:** SheetJS 0.20.3 (já no esqueleto) para .xlsx, .xls e .csv.
  - **CSV:** com BOM, UTF-8; UTF-8 válido, UTF-8; senão, Windows-1252. O separador `,` ou `;` é detectado.
  - **Cabeçalhos e aliases** como no README e no protótipo.
  - **Especialidades:** por nome, separadas por `;`, `,` ou `/`, sem acentos e sem maiúsculas, só entre os tipos ativos.
  - **Status:** o que começa com "inativ" é inativo; vazio é ativo.
  - **"Credenciado desde":** vale quando for uma data válida. Senão, o novo recebe hoje e o atualizado mantém a data.
- **"Atualizar" sobrescreve os dados**, como diz o README, e não mexe na cor.
- **A importação não envia convites em massa** (decisão registrada em 30/09): linhas "Novo" com
  e-mail entram como acesso pendente, e o convite sai um a um pelo Editar. A conferência da
  importação deve avisar isso quando houver novos com e-mail.
- **DV:** só nas linhas **Novo**, porque o documento é novo.

**Gestor:**
- A página, os três modais (Novo/Editar, Excluir e Conferir importação), o switch, os botões e o link de planilha, conforme o levantamento.
- Os modais usam `usarModalAberto()` com `<Teleport defer to="#modais-gestor">` (no esqueleto).
- **Posição dos modais no mobile:** segue o protótipo. O fundo dele começa 44px acima da origem do harness; ver o levantamento.

## Convite por e-mail (acesso do prestador)

Decisão do usuário em 29/09: o acesso de prestadores novos é por **convite por e-mail**.

**Regras** (API, só gestor):
- **`POST /api/prestadores/{id}/convite`** envia ou reenvia o convite:
  - Cria ou atualiza o usuário do prestador (`User` com `role = 'prestador'`, `prestadorId`, nome e e-mail do cadastro). Não cria senha.
  - Gera um token aleatório de uso único, válido por **7 dias**, no formato de redefinição do Better Auth: `reset-password:<token>` na tabela `verification`, gravado na mesma transação (`tx.verification.create`), no formato do `internalAdapter`.
  - Invalida os convites anteriores do mesmo usuário e manda o e-mail.
- **Recusas:**
  - prestador sem e-mail: 409 `prestador_sem_email`, "Cadastre um e-mail para enviar o convite";
  - e-mail já usado por outra conta (gestor ou outro prestador): 409 `email_em_uso`, "Este e-mail já é usado por outra conta";
  - prestador excluído: 404.
- **Inativo:** pode receber convite, porque continua entrando.
- **Quem já tem senha:** o prestador que já criou a senha também pode receber um convite novo, que funciona como redefinição.
- **Situação do acesso:** o cadastro expõe `acesso: 'sem_email' | 'pendente' | 'convidado' | 'ativo'`.
  - `ativo`: já tem senha;
  - `convidado`: tem convite válido;
  - `pendente`: tem e-mail, mas não tem convite válido nem senha.
- **Automático:** criar um prestador com e-mail envia o convite.

**Envio** (`apps/api/src/correio/`), pela interface `Correio { enviar({ para, assunto, texto, html }) }`:
- **Desenvolvimento** (sem `SMTP_URL`): grava o e-mail em HTML em `var/emails/` e mostra o link no log da API.
- **Produção:** SMTP com nodemailer, usando `SMTP_URL` e `EMAIL_REMETENTE`.
- **Link:** `${URL_APP_PRESTADOR}/convite?token=…`, com `URL_APP_PRESTADOR` no `.env` (em dev, `http://localhost:5174`).
- **Texto do e-mail:**
  - assunto: "Seu acesso ao app da Russo Assistência";
  - saudação pelo primeiro nome;
  - o login (e-mail);
  - o botão "Criar minha senha";
  - a validade: "O link vale por 7 dias".

**Prestador** (rota pública `/convite?token=`, fora do protótipo):
- **Tela "Crie sua senha":** no mesmo cartão do login (marca, título, apoio "Para entrar no app da Russo Assistência"), com os campos "Nova senha" e "Confirmar senha" e o botão "Criar senha".
- **Mensagens:**
  - "Use pelo menos 8 caracteres";
  - "As senhas não conferem";
  - token inválido ou vencido: "Este convite expirou ou já foi usado. Peça um novo à Russo Assistência.".
- **Sucesso:** vai para o login com o aviso "Senha criada. Entre com seu e-mail e a nova senha.".
- **Chamada:** `auth.resetPassword({ newPassword, token })` do cliente do Better Auth.

**Gestor** (depois da integração com a frente de Prestadores):
- **Toast ao cadastrar com e-mail:** "Prestador cadastrado. Convite enviado para {e-mail}".
- **No modal Editar:** o botão de texto "Enviar convite de acesso" (acesso pendente), "Reenviar convite" (convidado) ou "Redefinir acesso" (ativo, que já tem senha: o convite funciona como redefinição), na linha do rótulo do e-mail, no estilo de link do protótipo (`#0069BD`, 13/600). A linha de e-mail, região e CEP fica fora da comparação visual (`ocultarNoApp`).
- **Cadastro e login andam juntos:** editar o e-mail (no Editar ou pela planilha) troca o login do usuário vinculado, com a mesma checagem de conflito do convite; remover o e-mail ou excluir o prestador anonimiza o login e derruba sessões e convites.

## Agenda (prestador)

- **Sem rota nova:** reusa `GET /api/acionamentos` (`usarDemandas`, a mesma chave e as mesmas invalidações de Demandas). O front filtra por data e ordena por início.
- **Faixa:** 7 dias a partir de hoje em SP. Os helpers de data ficam em `apps/prestador/src/agenda/`.
- **Dia selecionado:** guardado como data ISO em estado de módulo. Sobrevive a abrir o Detalhe e voltar. Se sair da janela (virada do dia), volta para hoje.
- **O que entra:** todos os status, como no protótipo. O cartão abre o Detalhe.
- **Rótulos:**
  - "Hoje, DD/MM", "Amanhã, DD/MM" ou "Quinta-feira, DD/MM";
  - dia vazio: "Dia livre.".
- **Botão do dia:** `<button>` nativo com `display:flex` e sem `aria-label`. O nome acessível fica "Qua 30", que é o que os casos visuais usam.

## Pendências (da revisão do fluxo principal)

Conferidas em `2026-09-29-telas-restantes/pendencias.md`. Quatro não viram código:
- **G7:** já corrigida.
- **G10:** não reproduz.
- **R5:** só documentação.
- **P6:** fica para quando existir o adaptador S3/R2.

As demais são implementadas em três frentes:
- **API:**
  - P1: id malformado responde 404;
  - P2: limpeza de arquivo em best-effort com log;
  - P3: guarda de `/api/auth/*` para prestador excluído;
  - P4: foto assinada sem passar pela sessão;
  - P5: `X-Content-Type-Options: nosniff`;
  - C1: `proximo` anulável gerado certo no cliente, sem o cast.
- **Gestor:**
  - G1/R8: não repetir 4xx;
  - G2: voltar do Detalhe para a linha de onde saiu;
  - G3/G4: estados de "enviando" e bloqueio durante o POST;
  - G5: tempo limite nas chamadas;
  - G6: observação zerada ao trocar de acionamento;
  - G8: erro ao carregar tipos e prestadores no modal.
- **Prestador e ui:**
  - G9: anúncio do toast;
  - R1: ordem das respostas no cache;
  - R2: pipeline de fotos (PNG transparente, URLs, canvas, testes);
  - R3: área segura do iPhone;
  - R4: erro fora do formato da API;
  - R6: acessibilidade;
  - R7: desmontar nos testes.
- **H3** (limiar do pixelmatch) roda **depois** da integração, numa passada própria de ajuste de CSS.

## Trabalho em paralelo

O esqueleto já está no ramo (`c633418..334548f`). Ele traz:
- os casos visuais em um arquivo por tela;
- a migração de especialidades em ordem e da unicidade parcial;
- a regra do prestador excluído;
- `dominio/documentos.ts` e `@kgb/ui/documentos.ts`;
- as rotas vazias registradas e os códigos de erro por frente;
- o SheetJS;
- as pastas do gestor, `/painel/:id` e os modais genéricos;
- a API falsa com PATCH e DELETE;
- a pasta da Agenda.

**Frentes e arquivos de cada uma** (fora disso, só com pedido ao orquestrador):

| Frente | Arquivos |
|---|---|
| Painel | `rotas/painel.ts`, `servicos/painel.ts`, `dominio/painel.ts` (e testes), `gestor/src/painel/**`, `tools/visual/casos-painel.ts` |
| Prestadores e planilha | `rotas/cadastro-prestadores.ts`, `rotas/planilha.ts`, `servicos/prestadores.ts`, `servicos/planilha.ts`, `dominio/prestadores.ts`, `dominio/planilha.ts`, `dominio/erros-prestadores.ts`, `dominio/erros-planilha.ts` (e testes); migração da auditoria; `gestor/src/prestadores/**`; `CabecalhoPagina.vue` (prop `espaco`); `tools/visual/casos-prestadores.ts` e `fixtures/` |
| Checklists | `rotas/tipos.ts`, `servicos/tipos.ts`, `dominio/tipos.ts`, `dominio/erros-tipos.ts` (e testes), `gestor/src/checklists/**`, `tools/visual/casos-checklists.ts` |
| Agenda | `prestador/src/agenda/**`, `tools/visual/casos-agenda.ts` |
| Pendências da API | `servicos/acionamentos.ts`, `app.ts`, `auth.ts`, `rotas/arquivos.ts`, `schemas.ts` (C1), testes deles, `prestador/src/inicio/usarInicio.ts` (só o cast do C1) |
| Pendências do gestor | `gestor/src/consultas.ts`, `layouts/LayoutGestor.vue`, `gestor/src/acionamentos/**`, testes deles |
| Pendências do prestador e ui | `packages/ui/src/componentes/AvisoToast.vue`, `prestador/src/consultas.ts`, `prestador/src/execucao/**`, `prestador/src/demandas/**`, `prestador/src/inicio/PaginaInicio.vue`, `prestador/test/**` |

**Arquivos gerados:** `openapi.json` e `schema.d.ts` são regenerados com `pnpm api:generate`, e um conflito neles se resolve regenerando depois do merge.

**Ninguém edita:** `pnpm-lock.yaml` (sem dependências novas), `casos.ts`, `regioes.ts`, `comparar.ts`, `README.md`/`CLAUDE.md`/`docs/` (exceto o próprio plano) e `schema.prisma` (exceto a auditoria da planilha).

**Ambiente de cada frente:** bancos `kgb_<frente>_dev/_test` e portas próprias da API e do front, no `.env` do worktree. O `pnpm visual` roda com `URL_GESTOR`/`URL_PRESTADOR` e o seed do dia.

## Testes

- **API:** domínio puro por TDD (fórmulas do Painel com os números do seed, validações de documento e telefone, prévia da planilha), e integração com a matriz de papéis (gestor, prestador → 403, sem login → 401) e os 404, 409 e 422 de cada rota.
- **Fronts:** as regras de tela, o salvamento automático, as validações e mensagens, e os estados de carregando e erro.
- **Visual:** os casos de cada levantamento, sem os que gravam no banco.
- **Ponta a ponta:** o `pnpm e2e` continua verde depois da integração.

## Entrega

Depois da integração, o orquestrador:
1. regenera o cliente;
2. roda a verificação completa, o `pnpm visual` (com a passada do H3) e o `pnpm e2e`;
3. faz uma revisão final independente;
4. abre o PR `feat/telas-restantes` → `main`.

## Novo acionamento inteligente (pedido do usuário, 30/09)

O modal Novo acionamento deixa de seguir o protótipo nos campos da coluna esquerda (decisão do
usuário). A prévia do checklist, o cabeçalho, os botões e o restante do sistema continuam pixel
perfect; no comparador, os casos do modal mascaram a coluna de campos (`ocultarNoApp`).

### Categorias de demanda

- `TipoDemanda.categoria` (texto, opcional; sem categoria a tela mostra "Outros").
- Seed: Vazamento → Hidráulica; Revisão elétrica, Ponto de luz e Troca de disjuntor → Elétrica;
  Pintura e Reparo em gesso → Acabamento; Limpeza de ar-condicionado → Climatização;
  Chaveiro → Segurança.
- Checklists: o editor ganha o campo "Categoria" (texto com sugestões das categorias existentes,
  salvo com o mesmo autosave). No comparador, o campo fica mascarado.

### Busca de demandas no modal

- Em vez dos chips com todos os tipos: um campo de busca com lista suspensa, agrupada por
  categoria, que filtra por nome do tipo ou da categoria (sem acentos e sem maiúsculas).
- Selecionar acrescenta um chip removível (mesmo visual dos chips atuais); a prévia do checklist
  continua igual.
- Teclado: ↓/↑ navegam, Enter seleciona, Esc fecha a lista.

### Assinantes (clientes ativos)

- Modelo novo `Assinante`: nome, cep (8 dígitos), logradouro, numero, complemento?, bairro,
  cidade, status ativo/inativo, excluidoEm?. Endereço de exibição no formato do protótipo
  ("Rua X, 410 · Bairro").
- Seed: um assinante por cliente distinto dos acionamentos do protótipo, ativo, com CEP paulistano
  plausível para o bairro do endereço; os acionamentos do seed apontam para eles (`assinanteId`).
- `GET /api/assinantes?busca=` (só gestor): ativos, sem acentos, por nome; até 8 resultados.
- No modal, o campo Cliente vira busca com lista suspensa. Selecionar preenche endereço e CEP.

### Endereço por CEP

- `GET /api/cep/{cep}` (só gestor): consulta o ViaCEP atrás da interface `BuscaCep`
  (implementação real com fetch e timeout curto; falsa nos testes). Erros: `cep_invalido` (422,
  "Informe um CEP com 8 dígitos") e `cep_nao_encontrado` (404, "CEP não encontrado").
- Atendimento em outro endereço: o gestor digita outro CEP, o logradouro/bairro/cidade vêm
  preenchidos (somente leitura) e o modal pede número e complemento (opcional).
- Botão "Ver no mapa" (link, estilo dos links do gestor) abre o endereço montado no Google Maps
  (`urlMapa` de @kgb/ui) para validar o local.
- `Acionamento` ganha `assinanteId?` e `cep?`; `cliente` e `endereco` continuam snapshots de texto
  ("Logradouro, número · bairro"), então as demais telas não mudam.

### Prestador por proximidade

- Endereço de outra cidade: gravado com a cidade no fim ("Rua X, 12 · Centro · Osasco - SP"); `urlMapa`/`urlRota` só acrescentam ", São Paulo" quando o endereço não termina em " - UF". CEP inexistente (404) bloqueia o envio; a digitação livre de rua e bairro vale só quando o ViaCEP não responde.
- "Mais próximo" só é escolhido e rotulado quando o primeiro da lista tem CEP.
- `Prestador.cep` (opcional). Seed: CEP plausível para a região de cada um. O modal de
  Novo/Editar prestador ganha o campo CEP (mascarado no comparador). A planilha não importa CEP
  por enquanto.
- `GET /api/prestadores?cep=...`: os ativos ordenados pela distância numérica entre CEPs
  (heurística sem geocodificação; empate por nome; sem CEP vai ao fim, por nome). A resposta
  inclui `regiao` e `cep`.
- No modal, a escolha do prestador vira busca com lista suspensa (por nome ou região), já ordenada
  pela proximidade do CEP em uso; o primeiro (mais próximo) vem selecionado.

### Verificação

- TDD nos módulos novos; o comparador roda só nos casos afetados durante o desenvolvimento
  (a rodada completa fica para o fechamento, junto com o `pnpm e2e` atualizado para o fluxo novo).
