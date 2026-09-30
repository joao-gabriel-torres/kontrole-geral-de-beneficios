<!-- Conferência das pendências da revisão contra a main (e4385c1), 29/09/2026. As decisões finais estão em ../2026-09-29-telas-restantes-design.md. -->

# Conferência das pendências contra a `main` (e4385c1)

## Como conferi

Li o código atual. Para a API, rodei um teste de verificação que ficou fora do repositório (`scratchpad/pendencias-verif/verif.test.ts`), contra o `kgb_test`. Na primeira rodada, o `globalSetup` recriou o banco de teste. Também ficou lá um prestador `p-verif-inativo`, que voltou a ativo no fim. Resultados medidos:

| Pendência | Resultado medido |
|---|---|
| P1 | `POST /api/acionamentos/..%2F..%2Fx/fotos` → **500** `{"codigo":"interno"}`. Controle com `/nao-existe/fotos` → 404. |
| P2 | `DELETE …/fotos/:id` com `armazenamento.remover` falhando → **500**, e a foto **já tinha saído do banco**. |
| P3 | Prestador desativado: `/api/me` → 401, mas `get-session` → **200** (devolve a sessão com o token), `list-sessions` → **200** e `update-user` → **200** (`{"status":true}`). |
| P4 | `GET` da foto assinada chamou `auth.api.getSession` **1 vez**. |
| P5 | Headers da foto: só `cache-control`, `content-type`, CORS e `vary`. **Não tem** `x-content-type-options`. |
| H3 | pixelmatch com `threshold: 0.1` sobre branco: `#F9F9F9` (superficie1) → **0/400 px**; `#EFF1F3` (superficie2) → **0/400 px**. Só a partir de `0.02` o `#F9F9F9` aparece (400/400). |
| C1 | `z.union([ResumoAcionamentoSchema, z.null()])` gera `anyOf:[$ref,{type:null}]`, e o openapi-typescript transforma isso em `ResumoAcionamento \| null`. Testado com o schema real. |

Nenhum arquivo do repositório foi alterado.

**Resumo:** 28 das 32 pendências valem. **G7 já foi corrigida.** **G10 não reproduz.** **R5** só pede uma decisão de documentação. **P6** vale, mas só aparece com S3/R2; minha sugestão é deixar para quando esse adaptador for feito.

---

## API

### P1. Barra codificada no id da foto dá 500 em vez de 404
- **(a) Ainda vale:** sim, medido.
  - A chave é montada antes de validar: `apps/api/src/servicos/acionamentos.ts:302-303` (`` const chave = `${id}/${fotoId}.${tipo.extensao}` ``).
  - `travarDoPrestador` lança 404 na linha 306.
  - O `catch` das linhas 328-330 chama `armazenamento.remover(chave)`, e `caminho()` lança `Chave de arquivo inválida` (`arquivos/armazenamento.ts:18-21`). Esse erro substitui o 404.
  - Não há travessia de caminho: `salvar` (linha 315) só roda depois de travar uma linha que existe.
- **(b) Efeito:** um id malformado vira 500 com stack no log, em vez de 404. É ruído que dispara alertas falsos na operação.
- **(c) Correção:**
  - Em `adicionarFoto`, marcar `salvo = true` logo depois de `armazenamento.salvar` e limpar só se `salvo`.
  - A limpeza nunca deve mascarar o erro original: usar a versão "sem falhar" de `removerArquivos` (ver P2).
  - **Teste (integração, `rotas/execucao.test.ts`):** POST em `/api/acionamentos/..%2F..%2Fx/fotos` com o Carlos → `404`.
- **(d) Esforço:** P · **(e) Área:** api

### P2. Falha ao limpar arquivo depois do commit vira 500
- **(a) Ainda vale:** sim, medido.
  - `revisarAcionamento` chama `await removerArquivos(chavesApagadas)` depois do commit (`acionamentos.ts:214`).
  - `removerFoto` faz o mesmo na linha 346.
  - `removerArquivos` usa `Promise.all` e propaga a rejeição (linhas 117-121).
- **(b) Efeito:**
  - A gestora vê "Erro interno" numa reprovação que já foi gravada. Se tentar de novo, recebe 409.
  - O prestador vê erro numa foto que já foi apagada.
  - É raro com disco, mas comum com S3/R2 (falha de rede).
- **(c) Correção:** tornar `removerArquivos` melhor esforço: `Promise.allSettled` e `console.error` para as rejeições. Usar essa versão depois do commit e também nos `catch` de `adicionarFoto` e `marcarInviavel`.
  - **Teste (integração):** `vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(...)`. Depois:
    - `DELETE …/fotos/:id` → 200 e foto fora do banco (`execucao.test.ts`);
    - reprovar uma inviabilidade → 200 e status `reprovado` (`gestao.test.ts`).
- **(d) Esforço:** P · **(e) Área:** api

### P3. Sessão de prestador desativado ainda vale em `/api/auth/*`
- **(a) Ainda vale:** sim, medido.
  - `app.ts:51` registra `auth.handler` antes de `app.use('/api/*', sessao)` (linha 52).
  - O bloqueio só existe em `middlewares/sessao.ts:28-35` e no hook `session.create` (`auth.ts:21-38`).
  - A tela de Prestadores ainda é `EmConstrucao` (`apps/gestor/src/paginas/PaginaPrestadores.vue`), então hoje não existe revogação.
- **(b) Efeito:** o desativado não acessa nada do negócio, mas continua lendo a própria sessão e o token, listando sessões e trocando o nome (e provavelmente a senha).
- **(c) Correção, em duas partes:**
  1. **Agora:** em `auth.ts`, um `hooks.before` com `createAuthMiddleware`. Ele usa `getSessionFromCtx(ctx)`, que existe em `better-auth/api` 1.7.6. Deixa passar `/sign-in/*` e `/sign-out`; nos demais, se `prestadorBloqueado(...)`, lança `APIError('UNAUTHORIZED')`.
  2. **Quando a tela de Prestadores ganhar desativar e excluir** (no protótipo são `toggle`, `pcDeactivate` e `pcExcluir` de `vPros`): na mesma transação, `tx.session.deleteMany({ where: { user: { prestadorId } } })`. Coordenar com quem estiver fazendo essa tela.
  - **Teste (integração, `auth.test.ts`, bloco "prestador inativo"):** depois de desativar, `get-session` e `update-user` → 401 e `sign-out` → 200. Quando o endpoint de desativar existir: desativar → a sessão some da tabela.
- **(d) Esforço:** P para a guarda; M junto com a revogação · **(e) Área:** api

### P4. Toda `<img>` de foto passa pelo middleware `sessao`
- **(a) Ainda vale:** sim, medido: 1 chamada de `getSession` por foto.
  - `app.ts:52` aplica `sessao` a `/api/*`, e `rotasArquivos` é montado depois (linha 63).
  - No gestor web a imagem leva cookie, então cada miniatura faz uma leitura de sessão no banco. No app do prestador a `<img>` vai sem Bearer e custa pouco.
- **(b) Efeito:** uma consulta de sessão por miniatura. Um Detalhe com 10–20 fotos gera 10–20 leituras à toa.
- **(c) Correção:** em `app.ts`, montar `app.route('/', rotasArquivos)` antes de `app.use('/api/*', sessao)`, como já é feito com o handler do Better Auth. O handler responde sem `next()`. O OpenAPI não muda.
  - **Teste (integração, novo `rotas/arquivos.test.ts`):** espiar `auth.api.getSession`, fazer `GET` da URL assinada com cookie ou Bearer → 0 chamadas e status 200.
- **(d) Esforço:** P · **(e) Área:** api

### P5. Foto sem `X-Content-Type-Options: nosniff`
- **(a) Ainda vale:** sim, medido (`rotas/arquivos.ts:23-26`).
- **(b) Efeito:** é defesa em profundidade. O risco é baixo, porque o tipo vem dos bytes mágicos no upload.
- **(c) Correção:** acrescentar `'X-Content-Type-Options': 'nosniff'` (opcional: `Content-Security-Policy: default-src 'none'; sandbox`).
  - **Teste:** em `rotas/arquivos.test.ts`, `expect(r.headers.get('x-content-type-options')).toBe('nosniff')`.
- **(d) Esforço:** P · **(e) Área:** api

### P6. Arquivo gravado dentro da transação, com a linha travada
- **(a) Ainda vale:** sim.
  - `armazenamento.salvar` roda dentro do `$transaction` em `acionamentos.ts:315` e `:390`.
  - Não há `transactionOptions` (`apps/api/src/db.ts`), então vale o limite padrão de **5 s** da transação interativa do Prisma.
- **(b) Efeito:** hoje nenhum, porque o disco é rápido. Com S3/R2, 5 fotos de até 10 MB seguram a linha e uma conexão do pool, e podem passar dos 5 s: a resposta vira 500, as fotos são descartadas e o autosave fica esperando o lock.
- **(c) Correção:**
  1. Fazer uma verificação barata sem lock (dono e status).
  2. Enviar o arquivo fora da transação.
  3. Abrir uma transação curta: `travar`, verificar de novo e gravar a linha.
  4. Se falhar, `removerArquivos` em melhor esforço.
  - **Teste (integração):** `salvar` com um atraso controlado. Enquanto o envio está pendente, um `PATCH` de etapa no mesmo acionamento termina. Também dá para verificar a ordem `salvar` antes de `travar` com espiões.
- **(d) Esforço:** M · **(e) Área:** api. **Minha sugestão:** deixar para quando o adaptador S3/R2 for feito.

---

## Gestor

### G1. 404 e 401 são repetidos antes de aparecer o erro
- **(a) Ainda vale:** sim.
  - `apps/gestor/src/consultas.ts:13` define `retry: 1`.
  - O `defaultRetryDelay` do query-core 5.104 é `1000 * 2 ** n`, ou seja, 1 s na primeira repetição.
  - O `onError` de 401 (`perderSessao`) também só dispara depois dessa repetição.
- **(b) Efeito:** "Acionamento não encontrado." e a volta ao login chegam cerca de 1 s atrasados.
- **(c) Correção:** trocar por `retry: (n, e) => n < 1 && !(e instanceof ErroApi && e.status >= 400 && e.status < 500)`.
  - **Teste (`consultas.test.ts`, com timers falsos):** 404 → `queryFn` chamada 1 vez; 500 → 2 vezes depois de 1 s.
- **(d) Esforço:** P · **(e) Área:** gestor

### G2. Voltar do Detalhe abre a lista no topo
- **(a) Ainda vale:** sim.
  - `layouts/LayoutGestor.vue:30-36` zera `scrollTop` em toda troca de `rota.path`.
  - O "Voltar" é um `RouterLink` para a lista (`PaginaDetalhe.vue:65`), e a rolagem é do `<main>`, então `scrollBehavior` não resolveria.
  - O protótipo também não restaura (ver o comentário em `tools/visual/casos-gestor.ts:16-18`). Isto é uma melhoria além do protótipo; não é divergência visual.
- **(b) Efeito:** em listas longas (Finalizados 57), a gestora perde o lugar a cada acionamento aberto.
- **(c) Correção:**
  - No layout, guardar `scrollTop` por `fullPath` ao sair.
  - Restaurar só na transição Detalhe → lista de origem (`acionamento → acionamentos`, `aprovacao → aprovacoes`), em `flush: 'post'` + `nextTick`. A lista vem do cache (`keepPreviousData`).
  - Nos demais casos, continuar indo ao topo.
  - **Teste (`LayoutGestor.test.ts`; o jsdom aceita `scrollTop`, como `LayoutPrestador.test.ts:76-88` já faz):** lista com `scrollTop=500` → detalhe fica em 0 → volta à lista em 500. Painel → lista fica em 0.
- **(d) Esforço:** M · **(e) Área:** gestor

### G3. Cancelar, X e Esc funcionam durante o POST de criação
- **(a) Ainda vale:** sim. Em `novo/ModalNovoAcionamento.vue`, Esc (linhas 52-54), X (75) e Cancelar (156) fazem `emit('fechar')` sem condição. Só `enviar` checa `bloqueado` (36-37).
- **(b) Efeito:** se a gestora fecha no meio do envio:
  - em caso de erro, o formulário se perde;
  - em caso de sucesso, ela é levada à lista depois de ter fechado;
  - se reabrir e enviar de novo, cria um acionamento duplicado.
- **(c) Correção:** uma função `fechar()` que ignora o pedido enquanto `criando`, com `aria-disabled` em Cancelar e X.
  - **Depende de G5:** sem tempo limite, um POST travado prenderia a gestora no modal.
  - **Teste (`ModalNovoAcionamento.test.ts`):** POST pendente → X, Cancelar e Esc não emitem `fechar`. Depois que o POST resolve, emitem.
- **(d) Esforço:** P · **(e) Área:** gestor

### G4. Botões sem estado visual de "enviando"
- **(a) Ainda vale:** sim.
  - `detalhe/CartaoDecisao.vue:20-35` usa `:disabled="enviando"`, mas o CSS (69-91) não tem `:disabled`, e a cor e o fundo definidos pelo autor não mudam.
  - No modal, `.enviar` recebe `aria-disabled` durante `criando`, mas a classe `inativo` só entra quando o formulário está inválido (`ModalNovoAcionamento.vue:160`).
- **(b) Efeito:** a gestora não percebe que o clique foi aceito e tende a clicar de novo. O duplo clique já é barrado, mas fica a sensação de travamento.
- **(c) Correção:**
  - No botão clicado: rótulo "Enviando…" (o mesmo do `PainelInviavel` do prestador), `aria-busy` e o visual `inativo`/tint que já existe.
  - Em aprovar/reprovar: `:disabled { opacity:.6; cursor:progress }`.
  - O estado parado não muda, então `pnpm visual` continua passando.
  - **Teste (`PaginaDetalhe.test.ts` e `ModalNovoAcionamento.test.ts`):** mutação pendente → texto "Enviando…" e o atributo esperado.
- **(d) Esforço:** P · **(e) Área:** gestor

### G5. Chamadas de dados sem tempo limite
- **(a) Ainda vale:** sim.
  - Nenhuma consulta ou mutação de `acionamentos/dados.ts:12-90` usa `comTempoLimite`.
  - Só `sessao.ts:28,58,76` usa. A função fica em `packages/api-client/src/index.ts:47-79`.
  - O prestador tem o mesmo buraco: `usarDetalhe`, `usarInicio` e `usarDemandas` não têm tempo limite, e `usarDetalhe.ts:18` nem repassa o `signal`.
- **(b) Efeito:** se a API travar, a lista fica vazia sem erro e os botões ficam em "enviando" para sempre.
- **(c) Correção:** em `dados.ts`, envolver cada `queryFn` e `mutationFn` em `comTempoLimite((s) => api.X(..., { signal: AbortSignal.any([signal, s]) }))`. O `ErroTempoEsgotado` já cai em `MENSAGEM_FALHA`.
  - **Teste (`dados.test.ts`, timers falsos + fetch que nunca responde):** avançar 8 s → a consulta fica em erro com `ErroTempoEsgotado`.
- **(d) Esforço:** M · **(e) Área:** gestor

### G6. Observação não é zerada ao trocar só o `:id`
- **(a) Ainda vale:** sim, mas hoje não dá para chegar lá.
  - `observacao` fica em `detalhe/PaginaDetalhe.vue:25` e só é zerada depois de uma decisão bem-sucedida (linha 55).
  - O `RouterView` não tem `key` (`LayoutGestor.vue:50`), então o componente é reaproveitado.
  - Hoje não existe link de um Detalhe direto para outro.
- **(b) Efeito:** nenhum hoje. Com um futuro link "próximo da fila", a nota de A poderia reprovar B.
- **(c) Correção:** `watch(() => props.id, () => { observacao.value = '' })`.
  - **Teste (`PaginaDetalhe.test.ts`):** digitar a observação, `setProps({ id: 'a2' })` → textarea vazio.
- **(d) Esforço:** P · **(e) Área:** gestor

### G7. `PRESTADOR_PADRAO` sem comentário
- **(a) Já corrigida.** `novo/formulario.ts:15-16` tem: "O protótipo abre o formulário com o Carlos (p1). Sem ele entre os ativos, vale o primeiro."
- **(d/e)** Nada a fazer (gestor).

### G8. Falha ao carregar tipos ou prestadores no modal fica sem mensagem
- **(a) Ainda vale:** sim. `ModalNovoAcionamento.vue:22-23` só lê `data` e ignora `isError` e `error`.
- **(b) Efeito:** o modal abre sem tipos e com o seletor de prestador vazio, pedindo "Escolha um ou mais tipos", e a gestora não sabe por quê.
- **(c) Correção:** mostrar `mensagemDeErro(erro)` no grupo de tipos e no seletor, com um "Tentar de novo" que chama `refetch`.
  - **Teste (`ModalNovoAcionamento.test.ts`):** API falsa com 500 em `/api/tipos` → a mensagem aparece; clicar em "Tentar de novo" → os tipos aparecem.
- **(d) Esforço:** P · **(e) Área:** gestor

### G9. `AvisoToast` é um `role="status"` inserido com `v-if`
- **(a) Ainda vale:** sim (`packages/ui/src/componentes/AvisoToast.vue:6`). É usado nos dois apps.
- **(b) Efeito:** leitores de tela como VoiceOver e NVDA podem não anunciar os avisos, como "Conclusão aprovada".
- **(c) Correção:**
  - Deixar sempre montado um invólucro `role="status" aria-live="polite" aria-atomic="true"` com `position:absolute; left:0; right:0; bottom:0; height:0` e sem `z-index`.
  - O `.toast` com `v-if` vai dentro dele.
  - Com isso, as posições `left:50%/bottom:96px` e `left/right:24px` continuam relativas à mesma largura e o pixel não muda.
  - **Teste (`AvisoToast.test.ts`):** com `mensagem=null`, o `[role=status]` existe e está vazio; depois de `setProps`, é o mesmo nó e tem o texto. Rodar `pnpm visual` sem regressão.
- **(d) Esforço:** P · **(e) Área:** ui

### G10. Gatilho do `MenuUsuario` não ocupa a largura
- **(a) Não reproduz no prestador.**
  - Lá o gatilho envolve só um `AvatarIniciais` de 44 px (`apps/prestador/src/inicio/PaginaInicio.vue:73-75`).
  - O `.menu-usuario` é `flex: none` (`MenuUsuario.vue:33-36`), então encolher até o conteúdo é o resultado certo.
  - O gestor já tem a correção em `NavLateral.vue:100-103`.
- **(d/e)** Nada a fazer (ui).

---

## Prestador

### R1. Respostas de mutações simultâneas fora de ordem no cache
- **(a) Ainda vale:** sim.
  - `execucao/usarDetalhe.ts:35-45`: todo `onSuccess` faz `setQueryData` com a resposta, sem ordem.
  - A API monta o Detalhe depois do commit e fora do lock (`servicos/acionamentos.ts:273`). Por isso a resposta de A pode trazer um retrato anterior ao commit de B e chegar por último.
- **(b) Efeito:** o prestador marca duas etapas em sequência e a segunda aparece desmarcada. Se tocar de novo, desmarca no servidor.
- **(c) Correção:**
  - Um contador de pedidos em `usarDetalhe`.
  - No `onSuccess`, só gravar se `cliente.isMutating({ mutationKey: ['detalhe', id] }) === 1`.
  - Se houve sobreposição, `invalidateQueries(CHAVES.detalhe(id))` para buscar o estado final.
  - **Teste (novo `execucao/usarDetalhe.test.ts`):** duas marcações com as respostas resolvidas em ordem inversa → o cache final reflete o estado mais novo, ou houve refetch.
- **(d) Esforço:** M · **(e) Área:** prestador

### R2. Pipeline de fotos
- **(a) Ainda vale:** sim, nos quatro pontos, todos em `execucao/fotos.ts`:
  1. Nada pinta o fundo antes do `drawImage` (71-76). O JPEG achata a transparência sobre preto.
  2. No fallback, se `img.decode()` falhar, `URL.revokeObjectURL` nunca roda (53-56).
  3. O canvas não é zerado (84-86).
  4. `fotos.test.ts` só testa `dimensoesAlvo`, `isoComFuso` e `prepararArquivo`.
- **(b) Efeito:**
  - Print ou logo em PNG chega preto ao gestor.
  - Há vazamento de memória no WebView. No iOS existe um teto de memória de canvas, e sessões longas de fotos podem começar a falhar.
- **(c) Correção:**
  - `fillStyle = '#fff'; fillRect(...)` antes de desenhar.
  - `try/catch` no fallback que revoga a URL e relança o erro.
  - No `finally`, `canvas.width = canvas.height = 0`.
  - **Testes (`fotos.test.ts`, com `createImageBitmap`, `getContext` e `toBlob` falsos):**
    - `fillRect` branco é chamado antes do `drawImage`;
    - o canvas fica zerado;
    - com `decode` rejeitando, `revokeObjectURL` é chamado;
    - uma imagem de 4000×3000 sai em 1600×1200.
- **(d) Esforço:** M · **(e) Área:** prestador

### R3. Área segura do iPhone
- **(a) Ainda vale:** sim.
  - `execucao/BarraAcoes.vue:42` usa `padding: 12px 24px 24px`, e `PainelInviavel.vue:122` usa `12px 24px 28px`.
  - O `index.html` tem `viewport-fit=cover`, e o Detalhe é `semAbas` (`router.ts:35`).
  - As abas já fazem `max(18px, env(safe-area-inset-bottom))` (`AbasPrestador.vue:26,31`).
- **(b) Efeito:** no iPhone com barra de gestos, "Enviar para aprovação" e "Enviar ao gestor" ficam por baixo do indicador de início.
- **(c) Correção:** `padding-bottom: max(24px, env(safe-area-inset-bottom))` e `max(28px, env(safe-area-inset-bottom))`.
  - **Teste:** no Chromium `env()` vale 0, então `pnpm visual` não muda. A verificação real é manual no Simulator (iPhone 15). Opcionalmente, um teste que confira `env(safe-area-inset-bottom)` no estilo.
- **(d) Esforço:** P · **(e) Área:** prestador

### R4. Erro fora do formato da API mostra a mensagem de conexão
- **(a) Ainda vale:** sim. Em `apps/prestador/src/consultas.ts:34`, todo corpo que não é `CorpoErro` vira `MENSAGEM_SEM_CONEXAO` ("…Verifique sua conexão.", linha 11). O gestor usa um texto neutro (`gestor/src/erros.ts:1`).
- **(b) Efeito:** um 502/503 do proxy, ou um 413 do nginx num upload, manda o prestador conferir o Wi-Fi quando o problema é o servidor ou o tamanho da foto.
- **(c) Correção:**
  - `status >= 500` sem corpo → "O servidor está com problemas. Tente de novo em instantes.";
  - `413` → "A foto passa de 10 MB";
  - manter "Verifique sua conexão" só para erro de rede, que não é `ErroApi`.
  - **Teste (`consultas.test.ts`):** `exigir` com `error: '<html>'` e status 502 ou 413 → as mensagens novas.
- **(d) Esforço:** P · **(e) Área:** prestador

### R5. Textos do Info.plist diferem do plano
- **(a) Ainda vale:** sim. `ios/App/App/Info.plist:69-74` tem textos mais longos e específicos que os de `docs/superpowers/plans/2026-09-28-fluxo-fase3-prestador.md:327-329`.
- **(b) Efeito:** nenhum para quem usa. É só divergência de documentação, e os textos do plist são até melhores para a revisão da App Store.
- **(c) Correção:** manter o plist e anotar a mudança no plano, ou fechar como aceita. Não pede teste.
- **(d) Esforço:** P · **(e) Área:** prestador (docs)

### R6. Acessibilidade
- **(a) Ainda vale:** sim, nos quatro pontos:
  1. **Painel inviável:** `PainelInviavel.vue:69-76` não move o foco, não prende o Tab e não devolve o foco. O `@keydown.esc` só funciona com o foco dentro da sobreposição, e ao abrir o foco continua na `BarraAcoes`.
  2. **Chips de filtro:** `demandas/PaginaDemandas.vue:31-38` não tem `aria-pressed` (o gestor tem).
  3. **Cartões:** `CartaoDemanda.vue:19-22` e `inicio/PaginaInicio.vue:111-114` têm `role="button"`, mas só respondem a Enter.
  4. **Galeria:** é um `<label>` com o `input` em `display:none` (`BotoesFoto.vue:80-87,130`), então não recebe foco pelo teclado.
- **(b) Efeito:** quem usa leitor de tela ou teclado (web e Android com teclado) não chega ao painel nem à Galeria e não sabe qual filtro está ativo.
- **(c) Correção:**
  - **Painel:** ao abrir, focar o painel ou o textarea; `inert` no conteúdo por trás; ao fechar, devolver o foco. É o mesmo padrão de `ModalNovoAcionamento`.
  - **Chips:** `:aria-pressed="f.id === filtro"`.
  - **Cartões:** `@keydown.space.prevent`.
  - **Galeria:** trocar o `<label>` por `<button class="bloco-foto">` que, no nativo, chama `capturarNativa('galeria')` e, na web, faz `inputGaleria.click()`. O visual continua igual ao do botão Câmera.
  - **Testes:** foco ao abrir e ao fechar (`PainelInviavel.test.ts`); `aria-pressed` (`PaginaDemandas.test.ts`); Espaço abre o Detalhe (`PaginaDemandas.test.ts`, `PaginaInicio.test.ts`); Galeria com `role=button` que dispara o input (`BotoesFoto.test.ts`). Rodar `pnpm visual`.
- **(d) Esforço:** M · **(e) Área:** prestador

### R7. Helper de testes não desmonta os componentes
- **(a) Ainda vale:** sim.
  - `apps/prestador/test/montar.ts:36-39` monta com `attachTo: document.body` e sem desmontar.
  - `test/configurar.ts` não tem `enableAutoUnmount`; o gestor tem (`apps/gestor/test/configurar.ts:6`).
  - Só `BotoesFoto.test.ts:56` desmonta à mão.
- **(b) Efeito:** componentes de testes anteriores continuam no `body` com timers e observers ativos. Isso afeta testes de foco e de `document.querySelector` e deixa a suíte instável.
- **(c) Correção:** `enableAutoUnmount(afterEach)` em `test/configurar.ts`.
  - **Teste:** a suíte inteira passa, e uma verificação em `afterEach` confirma que `document.body` volta vazio.
- **(d) Esforço:** P · **(e) Área:** prestador

### R8. `retry: 1` repete 4xx no prestador
- **(a) Ainda vale:** sim (`apps/prestador/src/consultas.ts:49`).
- **(b) Efeito:** como em G1, o 404 e a volta ao login depois de um 401 atrasam cerca de 1 s.
- **(c) Correção:** a mesma função de `retry` de G1, usando o `ErroApi` do prestador.
  - **Teste (`consultas.test.ts`):** o mesmo de G1.
- **(d) Esforço:** P · **(e) Área:** prestador

---

## Harness visual e cliente da API

### H1. Espera pelas fontes e fotografia do protótipo
- **(a) Ainda vale:** sim.
  - `tools/visual/comparar.ts:86-87` e `123-124` só esperam `document.fonts.ready` depois dos passos.
  - O protótipo é aberto primeiro e só é fotografado depois de o app logar e navegar (linhas 203-209). Nesse intervalo o toast de 2,6 s dele já sumiu.
  - Os contornos estão em `casos-prestador.ts:24-36`: `esperarToast` faz 10 cliques e `esperarFonte` faz 6.
- **(b) Efeito:** casos frágeis e lentos, com cliques inertes para compensar o tempo, e erros difíceis de diagnosticar.
- **(c) Correção:**
  - Chamar `document.fonts.ready` logo depois do carregamento, nas duas páginas, antes de `navegarPrototipo` e dos passos.
  - Esconder os toasts antes de fotografar: no app, `.toast`; no protótipo, os dois `div` de toast (os únicos com `bottom:96px` ou `bottom:110px` e sombra `0 12px 32px`). Validar o seletor no modo `--sanidade`.
  - Remover `esperarToast` e `esperarFonte`.
  - **Teste:** `pnpm visual` com os casos do prestador passando sem os contornos.
- **(d) Esforço:** M · **(e) Área:** visual

### H2. Passos dependem das contagens do seed nos nomes dos chips
- **(a) Ainda vale:** sim.
  - Contagens fixas em `casos-gestor.ts:25-28,65,144` e `casos-prestador.ts:65-86`.
  - O clique usa `exact: true` (`comparar.ts:64`).
- **(b) Efeito:** com o banco sujo (`pnpm e2e`, ou "Iniciar atendimento" de uma rodada anterior) ou com o seed alterado, o passo espera o timeout do Playwright em vez de falhar com uma imagem de diferença.
- **(c) Correção:** `Passo.clicar: string | RegExp`, com `chip('Aguardando')` virando `/^Aguardando\s*\d+$/`. A contagem continua sendo conferida pela imagem.
  - **Teste:** `pnpm visual` passa. Com o banco sujo, falha pela diferença de imagem, não por timeout.
- **(d) Esforço:** P · **(e) Área:** visual

### H3. Tons claros sobre branco ficam abaixo do limiar
- **(a) Ainda vale:** sim, medido. Com `threshold: 0.1` (`comparar.ts:184`), `#F9F9F9` e `#EFF1F3` sobre branco dão 0 pixels diferentes. **Um cartão branco que suma sobre o fundo `#EFF1F3` do gestor web também não seria detectado.**
- **(b) Efeito:** o `pnpm visual` aprova telas sem cartões ou fundos de superfície.
- **(c) Correção:**
  - Baixar o limiar para `0.02`, configurável por `LIMIAR_COR` (o anti-aliasing continua fora, porque `includeAA` é falso por padrão).
  - No `--sanidade`, pintar um bloco `#F9F9F9` sobre o branco e exigir que seja detectado.
  - Extrair `diferenca()` para um módulo testável.
  - **Teste:** um teste unitário de `diferenca` com PNGs sintéticos, mais `pnpm visual`. As divergências que aparecerem se corrigem no CSS, nunca no limite.
- **(d) Esforço:** M, mais possíveis ajustes de CSS · **(e) Área:** visual

### C1. `InicioPrestador.proximo` gerado com tipo errado
- **(a) Ainda vale:** sim, e a correção foi testada.
  - O tipo gerado é `ResumoAcionamento & (Record<string, never> | null)` (`packages/api-client/src/schema.d.ts:1325`).
  - A origem é `ResumoAcionamentoSchema.nullable()` (`apps/api/src/schemas.ts:143`), que gera `allOf` com `type:["object","null"]`.
  - O contorno com cast está em `apps/prestador/src/inicio/usarInicio.ts:12-13`.
- **(b) Efeito:** o tipo real é inutilizável (os campos viram `never`), e o cast esconde erros futuros.
- **(c) Correção:** trocar por `proximo: z.union([ResumoAcionamentoSchema, z.null()])`, rodar `pnpm api:generate` e remover o cast.
  - **Teste:** `expectTypeOf<InicioPrestador['proximo']>().toEqualTypeOf<ResumoAcionamento | null>()` em `packages/api-client/src/index.test.ts`, mais `pnpm typecheck` e a checagem de cliente atualizado do CI.
- **(d) Esforço:** P · **(e) Área:** api-client (+ api, + 1 linha no prestador)

---

## Lotes para implementar em paralelo

Nenhum arquivo aparece em dois lotes.

| Lote | Pendências | Arquivos exclusivos (código + testes) |
|---|---|---|
| **1. API: serviço** | P1, P2 (P6 só quando vier o S3/R2) | `apps/api/src/servicos/acionamentos.ts`; `rotas/execucao.test.ts`, `rotas/gestao.test.ts` |
| **2. API: borda HTTP e sessão** | P3 (guarda), P4, P5 | `apps/api/src/app.ts`, `auth.ts`, `rotas/arquivos.ts`; `auth.test.ts`, novo `rotas/arquivos.test.ts` |
| **3. Contrato** | C1 | `apps/api/src/schemas.ts`, `packages/api-client/openapi.json`, `packages/api-client/src/schema.d.ts` (gerados), `packages/api-client/src/index.test.ts`, `apps/prestador/src/inicio/usarInicio.ts` |
| **4. Gestor: navegação e consultas** | G1, G2 | `apps/gestor/src/consultas.ts`, `layouts/LayoutGestor.vue`; `consultas.test.ts`, `LayoutGestor.test.ts` |
| **5. Gestor: envio e formulários** | G3, G4, G5, G6, G8 | `apps/gestor/src/acionamentos/dados.ts`, `novo/ModalNovoAcionamento.vue`, `detalhe/PaginaDetalhe.vue`, `detalhe/CartaoDecisao.vue` e os `.test.ts` deles |
| **6. UI** | G9 | `packages/ui/src/componentes/AvisoToast.vue` (+ `.test.ts`) |
| **7. Prestador: dados e testes** | R1, R4, R7, R8 | `apps/prestador/src/consultas.ts`, `execucao/usarDetalhe.ts`, `test/configurar.ts`; `consultas.test.ts`, novo `execucao/usarDetalhe.test.ts` |
| **8. Prestador: fotos** | R2, R6 (Galeria) | `execucao/fotos.ts`, `execucao/BotoesFoto.vue`; `fotos.test.ts`, `BotoesFoto.test.ts` |
| **9. Prestador: telas** | R3, R6 (painel, chips, Espaço) | `execucao/BarraAcoes.vue`, `execucao/PainelInviavel.vue`, `demandas/PaginaDemandas.vue`, `demandas/CartaoDemanda.vue`, `inicio/PaginaInicio.vue` e os `.test.ts` deles |
| **10. Visual (por último)** | H1, H2, H3 | `tools/visual/comparar.ts`, `casos-gestor.ts`, `casos-prestador.ts`, `tipos.ts` |

**Sem código:** G7 (já corrigida), G10 (não reproduz), R5 (anotar no plano) e P6 (adiar).

**Cuidados na execução:**
- **Banco de teste compartilhado.** O `globalSetup` da API faz `DROP SCHEMA` no `kgb_test`. Os lotes 1, 2 e 3 não podem rodar os testes da API ao mesmo tempo contra o mesmo banco: ou rodam em sequência, ou cada worktree usa seu próprio `DATABASE_URL_TEST` (`kgb_loteN_test`).
- **Dependências dentro do lote 5.** G3 depende de G5, então os dois ficam juntos.
- **Ordem no lote 7.** Fazer R7 primeiro e rodar a suíte inteira do prestador.
- **Lote 10 por último.** H3 pode revelar divergências de CSS em arquivos de outros lotes, então deve rodar depois dos merges, numa rodada própria de ajuste de CSS.
- **Lotes que mexem no visual.** Os lotes 5 (G4), 6 (G9), 8 (Galeria) e 9 (R3) mudam o que aparece na tela e precisam fechar com `pnpm visual` dentro dos limites.
- **Revogação de P3.** Fica com quem implementar a tela de Prestadores, junto com desativar e excluir.
