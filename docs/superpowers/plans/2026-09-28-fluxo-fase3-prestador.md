# Fluxo principal · Fase 3 (telas do prestador) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o app do prestador completo para o fluxo principal (Início, Demandas, Detalhe e execução com o painel "Marcar como inviável", fotos pela câmera e pela galeria), pixel perfect com o protótipo e falando com a API real.

**Architecture:**
- **Dados:** `@tanstack/vue-query` registrado no `main.ts`. As chaves e o tratamento de erro ficam em `src/consultas.ts`. Cada funcionalidade tem uma pasta com composables de consulta e de mutação:
  - `src/inicio/`
  - `src/demandas/`
  - `src/execucao/`
- **Regras de tela** em funções puras testadas por TDD: filtros das Demandas, envio, resumo da etapa, faixas de aviso, validação do inviável, redimensionamento de foto. Os `.vue` só montam o template.
- **Visual:** medidas copiadas do CSS inline do protótipo (linhas 598–897 de `docs/design/Acionamentos.dc.html`). Elementos nativos estilizados; nada de VBtn, VTextarea ou VBottomSheet onde o comparador acusar diferença.

**Tech Stack:** Vue 3, Vuetify 4 (só o tema e o reset), vue-router 5, @tanstack/vue-query 5, openapi-fetch (via `@kgb/api-client`), @capacitor/camera 8, Vitest + @vue/test-utils, Playwright + pixelmatch (`tools/visual`).

**Spec:** [`docs/superpowers/specs/2026-09-28-fluxo-principal-design.md`](../specs/2026-09-28-fluxo-principal-design.md) (seções "Fotos", "Fronts" e "Pixel perfect"), com o handoff [`docs/design/README.md`](../../design/README.md) ("Telas — Prestador" 1, 3 e 4).

## Global Constraints

- **Fronteira:**
  - Só se altera `apps/prestador/**`, `tools/visual/casos-prestador.ts` e este plano.
  - `packages/*`, `apps/api`, `apps/gestor`, `tools/visual/{comparar,tipos,casos,casos-gestor}.ts`, a raiz e `pnpm-lock.yaml` ficam intocados.
  - Nenhuma dependência nova.
- **Textos:**
  - Toasts: "Atendimento iniciado", "Enviado para aprovação" e "Inviabilidade enviada ao gestor". Em erro, o toast mostra `erro.mensagem`.
  - "Adicione N foto(s) da conclusão para enviar"; "Conclua todas as etapas para enviar".
  - "N foto obrigatória" / "N fotos obrigatórias".
  - "Nenhum atendimento pendente na sua agenda.", "Nada agendado para hoje.", "Nada por aqui." e "Sem fotos ou comentários."
  - "Explique o motivo e registre pelo menos 1 foto. O gestor vai conferir."
- **Comentários:** salvam sozinhos **600 ms** depois da última digitação, sem sobrescrever o que está sendo digitado.
- **Fotos:**
  - no máximo **1600px** no lado maior, JPEG com qualidade **0,8**;
  - `tiradaEm` em ISO com fuso, gravado na captura;
  - no nativo, `@capacitor/camera`; no navegador, `<input type="file" accept="image/*">` com `capture="environment"` na Câmera.
- **Inviabilidade:** POST multipart único com `comentario` e `arquivos` (1 a 5).
- **Finalizadas:** ordem inversa (mais recente primeiro), no máximo 20.
- **Pixel perfect:** `pnpm visual -- --app=prestador` com todas as regiões ≤ 0,2 % da região e ≤ 2 % do conteúdo. Divergência se corrige no CSS.
- **Ambiente deste worktree:**
  - API na porta 3001 (`kgb_prestador_dev`).
  - Vite do prestador na porta **5184**, porque a 5174 está ocupada pelo `pnpm dev` do checkout principal. Por isso o comparador roda com `URL_PRESTADOR=http://localhost:5184`.

## Review Focus

1. **Autosave com digitação em andamento:** a resposta do servidor (ou um refetch) chega enquanto a pessoa ainda digita, e o texto local não pode voltar para o valor antigo. Coberto na Task 5.
2. **Sair do Detalhe com um comentário pendente** (antes dos 600 ms): o texto não pode se perder, e o autosave dispara o envio ao desmontar. Coberto na Task 5.
3. **Erro da API numa ação** (422 `fotos_insuficientes`, 409 `transicao_invalida` ou rede fora): o toast mostra a mensagem e a tela continua usável. Coberto nas Tasks 1 e 7.
4. **Foto de retrato e de paisagem maiores que 1600px, e foto menor que o limite** (que não pode ser ampliada). Coberto na Task 6.
5. **Painel inviável:** motivo só com espaços, zero fotos ou mais de 5 fotos deixam "Enviar ao gestor" desabilitado. Reabrir o painel começa vazio. Coberto nas Tasks 4 e 8.

---

### Task 1: Infraestrutura de dados, toast e rota do Detalhe

**Files:**
- Create:
  - `apps/prestador/src/consultas.ts`
  - `apps/prestador/src/avisos.ts` (toast único do app)
  - `apps/prestador/test/montar.ts` (monta um componente com Vuetify, router e vue-query)
- Modify:
  - `apps/prestador/src/main.ts` (registra o `VueQueryPlugin`)
  - `apps/prestador/src/api.ts` (exporta `baseApi`)
  - `apps/prestador/src/router.ts` (rota `demandas/:id` com `meta.semAbas`)
  - `apps/prestador/env.d.ts` (`semAbas?: boolean` em `RouteMeta`)
  - `apps/prestador/src/layouts/LayoutPrestador.vue` (esconde as abas; `AvisoToast`)
- Test: `apps/prestador/src/consultas.test.ts` e `apps/prestador/src/layouts/LayoutPrestador.test.ts`

**Interfaces:**
- Produces:
  - `CHAVES = { inicio: ['inicio'], lista: ['acionamentos'], detalhe: (id: string) => ['acionamento', id] }`
  - `class ErroApi extends Error { codigo: string; status: number }`
  - `exigir<T>(r: { data?: T; error?: unknown; response: Response }): T`: lança `ErroApi` com `erro.mensagem`.
  - `mensagemDeErro(e: unknown): string`: `ErroApi` → a mensagem. Qualquer outro erro → "Não foi possível falar com o servidor. Verifique sua conexão."
  - `criarClienteConsultas(): QueryClient`: `retry: 1` nas consultas, `refetchOnWindowFocus: false`.
  - `avisos: Toast`: `usarToast()` único. `avisar(texto)` é um atalho para `avisos.mostrar`.
  - `baseApi: string`

- [ ] **Step 1: Testes (falham)**
  - `consultas.test.ts`:
    - `exigir` devolve `data` num 200;
    - com `{ error: { erro: { codigo: 'fotos_insuficientes', mensagem: 'Adicione 1 foto da conclusão para enviar' } }, response: 422 }`, lança `ErroApi` com esse código, status e mensagem;
    - `mensagemDeErro(new TypeError('Failed to fetch'))` devolve a mensagem de conexão.
  - `LayoutPrestador.test.ts`:
    - na rota `inicio` a `nav[aria-label=Navegação]` aparece; numa rota com `meta.semAbas` ela some;
    - `avisar('Atendimento iniciado')` mostra o texto em `[role=status]`.
- [ ] **Step 2:** `pnpm --filter @kgb/prestador test`, com falha esperada (módulos inexistentes).
- [ ] **Step 3: Implementação**
  - `consultas.ts`, conforme as interfaces acima.
  - `LayoutPrestador`:
    - `.layout` ganha `position: relative`;
    - `<AbasPrestador v-if="!route.meta.semAbas">`;
    - `<AvisoToast :mensagem="avisos.mensagem.value" variante="prestador" />`.
  - `main.ts`: `app.use(VueQueryPlugin, { queryClient: criarClienteConsultas() })`.
  - `router.ts`, no layout:
    ```ts
    {
      path: 'demandas/:id',
      name: 'detalhe',
      component: () => import('./execucao/PaginaDetalhe.vue'),
      meta: { semAbas: true },
    }
    ```
    Até a Task 7, a página é um placeholder mínimo.
  - `test/montar.ts`:
    ```ts
    montar(componente, { props?, rotas?, rotaInicial? })
    // → { wrapper, router, cliente }
    ```
    Monta com `createVuetify(opcoesVuetify({ fundo: '#FFFFFF' }))`, router de memória e `VueQueryPlugin` com um `QueryClient` sem retry.
- [ ] **Step 4:** Testes passam.
- [ ] **Step 5:** Commit `feat(prestador): vue-query, toast do app e rota do detalhe sem abas`.

### Task 2: Demandas (filtros, lista e cartões)

**Files:**
- Create:
  - `apps/prestador/src/demandas/filtros.ts`
  - `apps/prestador/src/demandas/usarDemandas.ts`
  - `apps/prestador/src/demandas/CartaoDemanda.vue`
  - `apps/prestador/src/demandas/PaginaDemandas.vue`
- Delete: `apps/prestador/src/paginas/PaginaDemandas.vue`, e o router aponta para o novo arquivo.
- Test: `apps/prestador/src/demandas/filtros.test.ts` e `apps/prestador/src/demandas/PaginaDemandas.test.ts`

**Interfaces:**
- Produces:
  - `type Filtro = 'ativas' | 'corrigir' | 'analise' | 'finalizadas'`
  - `FILTROS: readonly { id: Filtro; rotulo: string }[]`, na ordem Ativas, Corrigir, Em análise e Finalizadas.
  - `filtroDaQuery(q: unknown): Filtro`: valor desconhecido → `'ativas'`.
  - `ordenarPorData(lista)`: crescente por `data + inicio`, como o `mine` do protótipo.
  - `filtrar(lista, filtro)`:
    - `ativas`: aberto + em_andamento;
    - `corrigir`: reprovado;
    - `analise`: aguardando;
    - `finalizadas`: aprovado, invertida e limitada a 20.
  - `contar(lista): Record<Filtro, number>`: a contagem **não** é limitada a 20.
  - `usarDemandas()`: `useQuery` de `GET /api/acionamentos` (todos os do prestador) com a chave `CHAVES.lista`.

- [ ] **Step 1: Testes de `filtros.ts` (falham)**
  - uma lista embaralhada com os 5 status sai ordenada;
  - `finalizadas` com 25 aprovados devolve 20, o mais recente primeiro;
  - `contar` devolve 25 em finalizadas;
  - `filtroDaQuery('xpto')` devolve `'ativas'`.
- [ ] **Step 2:** Falha confirmada.
- [ ] **Step 3:** Implementar `filtros.ts`.
- [ ] **Step 4: Teste de componente (falha)**
  - `PaginaDemandas`, com o mock de `../api` devolvendo 3 acionamentos:
    - o chip "Ativas" mostra a contagem;
    - `?filtro=corrigir` seleciona Corrigir;
    - clicar no chip troca a query;
    - lista vazia mostra "Nada por aqui.";
    - clicar no cartão navega para `{ name: 'detalhe', params: { id } }`.
- [ ] **Step 5: Implementar a página e o cartão** (CSS do protótipo, linhas 682–705)
  - página: padding `8px 24px 24px`, gap 16;
  - chips: `flex none`, altura 34, padding `0 12px`, raio 999, 13/600, gap 6, contagem com opacidade .6. O ativo tem fundo `#262A3B` e texto branco; os demais, `#F9F9F9` e `#363853`. A faixa tem margin `0 -24px`, padding `0 24px` e rolagem;
  - cartão: padding 16, raio 16, fundo `#F9F9F9`, gap 8:
    - "código · quando" 12/600 `#8F8D8D`;
    - título 15/700 `#2C3143`;
    - "cliente · tipos" 12 `#50555C`;
    - barra (trilho `#E5E5E5`) com gap 10 e `StatusChip` de tamanho p.
- [ ] **Step 6:** Testes passam.
- [ ] **Step 7:** Commit `feat(prestador): tela de demandas com filtros`.

### Task 3: Início completo

**Files:**
- Create:
  - `apps/prestador/src/inicio/inicio.ts` (métricas e atalhos em dados)
  - `apps/prestador/src/inicio/usarInicio.ts`
  - `apps/prestador/src/inicio/CartaoProximo.vue`
  - `apps/prestador/src/inicio/PaginaInicio.vue` (movido de `paginas/`, mantendo o cabeçalho)
- Test:
  - `apps/prestador/src/inicio/inicio.test.ts`
  - `apps/prestador/src/inicio/PaginaInicio.test.ts` (movido e ampliado)

**Interfaces:**
- Produces:
  - `cartoesMetricas(m: InicioPrestador['metricas']): { rotulo; valor; sub; destaque: boolean }[]`:
    - `['Hoje', 'N', 'atendimentos']`
    - `['No mês', 'N', 'aprovados']`
    - `['Aprovação', 'T%', 'de primeira: X%' | 'de primeira: —']`
    - `['Para corrigir', 'N', 'reprovados', destaque = N > 0]`
  - `rotuloProximo(status)`: "Em execução agora" para `em_andamento`, senão "Próximo atendimento".
  - `usarInicio()`: `useQuery` de `GET /api/prestador/inicio`, com a chave `CHAVES.inicio`.

- [ ] **Step 1: Testes de `inicio.ts` (falham)**
  - `dePrimeira: null` gera "de primeira: —";
  - `paraCorrigir: 0` não tem destaque; `paraCorrigir: 2` tem;
  - o rótulo do próximo segue o status.
- [ ] **Step 2:** Implementar `inicio.ts`.
- [ ] **Step 3: Testes de componente (falham)**
  - com `proximo` presente:
    - o cartão mostra o código, "Hoje · 10:30–12:30", o título e "cliente · endereço";
    - "Rota" tem `href` = `urlMapa(endereco)`;
    - "Abrir checklist" navega ao detalhe.
  - com `proximo: null`: "Nenhum atendimento pendente na sua agenda.".
  - atalhos:
    - "Corrigir" mostra o badge = `paraCorrigir` e vai para `/demandas?filtro=corrigir`;
    - "Em análise" vai para `?filtro=analise`;
    - "Agenda" vai para a aba Agenda;
    - "Rota do dia" chama `window.open(urlRota(rotaDoDia), '_blank')` e não faz nada com a rota vazia.
  - `hoje` vazio: "Nada agendado para hoje.".
  - O teste antigo (saudação e menu Sair) continua passando.
- [ ] **Step 4: Implementar** (CSS do protótipo, linhas 604–663)
  - cartão:
    - fundo `#0069BD`, raio 24, padding 20, gap 14;
    - o ponto laranja de 8px aparece sempre, como no template;
    - "quando" 24/32 700; título 16/600 com `margin-top` 4; "cliente · endereço" 13 com opacidade .75 e `margin-top` 2;
    - "Rota": `flex 1`, altura 44, raio 14, `rgba(255,255,255,.12)`, pin de 18 branco, gap 6;
    - "Abrir checklist": `flex 1.4`, altura 44, raio 14, fundo branco, 14/700 `#0069BD`.
  - sem próximo: fundo `#F9F9F9`, raio 24, padding 20, 14 `#50555C`.
  - atalhos:
    - grade de 4 colunas, gap 8;
    - bloco de 56 com raio 16 e fundo `#EEF4FA`; ícone de 22; rótulo 12/600 `#363853`; gap 6;
    - badge em `top -4`, `right 8`, 20px, raio 10, fundo `#FC7608`, 11/700.
  - métricas: grade 1fr 1fr, gap 8, raio 16, padding `14px 16px`:
    - rótulo 12/600 `#50555C`;
    - valor 24/32 700: `#262A3B`, ou `#B8342A` no destaque;
    - sub 12 `#8F8D8D`;
    - fundo `#F9F9F9`, ou `#FFD7D4` no destaque.
  - agenda de hoje:
    - gap 10; título 16/700;
    - item: padding 14, raio 16, fundo `#F9F9F9`, gap 12;
    - hora com largura 48, 14/700 `#262A3B`;
    - título 14/600, cliente 12 `#8F8D8D` e `StatusChip` p, com gap 4.
- [ ] **Step 5:** Testes passam. Commit `feat(prestador): início com próximo atendimento, atalhos, métricas e agenda do dia`.

### Task 4: Regras puras do Detalhe

**Files:**
- Create: `apps/prestador/src/execucao/regras.ts`
- Test: `apps/prestador/src/execucao/regras.test.ts`

**Interfaces:**
- Produces:
  - `podeEditar(status): boolean`: `em_andamento` ou `reprovado`.
  - `avaliarEnvio({ regras, fotosConclusao: number, etapas: { feitas, total } }): { pode: boolean; falta: string | null }`
  - `resumoEtapa(fotos: number, comentario: string | null): string`: "2 fotos · comentário", "1 foto" ou "comentário".
  - `textoFotosObrigatorias(n)`: "1 foto obrigatória" ou "2 fotos obrigatórias".
  - `faixaDoStatus(d: DetalheAcionamento): Faixa | null`, em que:
    ```ts
    type Faixa =
      | { tipo: 'reprovado'; motivo: string }
      | { tipo: 'aguardando'; titulo: string; quando: string }
      | { tipo: 'aprovado'; titulo: string }
    ```
  - `mostrarConclusao(d)`: `podeEditar` ou fotos de conclusão > 0 ou comentário final preenchido.
  - `validarInviabilidade({ comentario, fotos }): boolean`: motivo sem espaços nas pontas não vazio, e 1 ≤ fotos ≤ 5.

- [ ] **Step 1: Testes (falham)**
  - `avaliarEnvio`:
    - `photoMin 1` com 0 fotos: `falta` = "Adicione 1 foto da conclusão para enviar" e `pode` = false;
    - `photoMin 3` com 1 foto: "Adicione 2 fotos…";
    - `requireAllSteps` com 3/5 etapas e fotos suficientes: "Conclua todas as etapas para enviar";
    - tudo certo: `pode` = true e `falta` = null.
  - `resumoEtapa`: os 4 casos.
  - `faixaDoStatus`:
    - `reprovado` usa o motivo da última revisão;
    - `aguardando` + inviável: "Inviabilidade enviada para análise", com `momento(ultimoEnvioEm)`;
    - `aprovado` + inviável: "Inviabilidade confirmada pelo gestor";
    - `aberto`: null.
  - `validarInviabilidade`: `'  '` → false; 0 fotos → false; 6 fotos → false; 'ok' com 1 foto → true.
- [ ] **Step 2:** Implementar. Os testes passam. Commit `feat(prestador): regras de envio, resumo e faixas do detalhe`.

### Task 5: Autosave com debounce

**Files:**
- Create: `apps/prestador/src/execucao/usarAutosave.ts`
- Test: `apps/prestador/src/execucao/usarAutosave.test.ts` (fake timers)

**Interfaces:**
- Produces:
  - `usarAutosave({ valor, salvar, espera = 600 })`:
    - `valor: () => string | null`;
    - `salvar: (texto: string) => Promise<unknown>`;
    - devolve `{ texto: Ref<string>, digitar(v: string): void }`.
  - Enquanto houver edição local ainda não confirmada, as mudanças de `valor()` são ignoradas.
  - Ao desmontar (`onScopeDispose`), o envio pendente é disparado na hora.

- [ ] **Step 1: Testes (falham)**, com `effectScope` e `vi.useFakeTimers()`:
  - digitar "a", "ab" e "abc" em sequência não chama `salvar` antes de 600 ms e chama uma vez com "abc" depois;
  - mudar `valor` para "servidor" durante a digitação não altera `texto`;
  - depois do salvamento confirmado, mudar `valor` para "novo" atualiza `texto`;
  - `scope.stop()` com envio pendente chama `salvar` na hora;
  - `salvar` rejeitado mantém o texto local.
- [ ] **Step 2:** Implementar. Os testes passam. Commit `feat(prestador): autosave de comentários com debounce`.

### Task 6: Fotos (redimensionar, capturar, permissões nativas)

**Files:**
- Create:
  - `apps/prestador/src/execucao/fotos.ts`
  - `apps/prestador/src/execucao/BotoesFoto.vue` (os blocos Câmera e Galeria)
- Modify:
  - `apps/prestador/ios/App/App/Info.plist`
  - `apps/prestador/android/app/src/main/AndroidManifest.xml`
- Test:
  - `apps/prestador/src/execucao/fotos.test.ts`
  - `apps/prestador/src/execucao/BotoesFoto.test.ts`

**Interfaces:**
- Produces:
  - `LADO_MAXIMO = 1600`, `QUALIDADE_JPEG = 0.8`
  - `dimensoesAlvo(largura, altura, maximo = 1600)`: devolve `{ largura, altura, fator }`, com `fator = min(1, maximo / max(l, a))` e as dimensões arredondadas.
  - `isoComFuso(d: Date): string`, no formato `2026-09-28T15:10:00-03:00` (fuso do aparelho).
  - `redimensionar(arquivo: Blob): Promise<Blob>`: `createImageBitmap` (ou `Image` como alternativa), `canvas` e `toBlob('image/jpeg', 0.8)`.
  - `interface FotoCapturada { arquivo: Blob; tiradaEm: string }`
  - `capturarNativa(origem: 'camera' | 'galeria'): Promise<FotoCapturada | null>`: usa `Camera.getPhoto({ source: CameraSource.Camera | CameraSource.Photos, resultType: CameraResultType.Uri, quality: 90 })`, faz `fetch(webPath)` e redimensiona.
  - `prepararArquivo(file: File): Promise<FotoCapturada>`: grava `tiradaEm` antes de redimensionar.
  - `<BotoesFoto cor="azul|coral" @foto="(f: FotoCapturada) => …" />`:
    - "Câmera" é um `<button>`. No navegador, abre um input escondido com `capture="environment"`; no nativo, chama `capturarNativa('camera')`.
    - "Galeria" é um `<label>` com input escondido. No nativo, o clique é interceptado e chama `capturarNativa('galeria')`.

- [ ] **Step 1: Testes (falham)**
  - `dimensoesAlvo(4000, 3000)` → `{ 1600, 1200, 0.4 }`;
  - `dimensoesAlvo(3000, 4000)` → `{ 1200, 1600 }`;
  - `dimensoesAlvo(800, 600)` → fator 1, sem ampliar;
  - `dimensoesAlvo(1601, 1)` → altura 1, nunca 0;
  - `isoComFuso(new Date('2026-09-28T18:10:05Z'))` com `TZ=America/Sao_Paulo` → `'2026-09-28T15:10:05-03:00'`;
  - `BotoesFoto`:
    - o input da Câmera tem `capture="environment"` e `accept="image/*"`;
    - o da Galeria tem só `accept`;
    - trocar o arquivo emite `foto` (com `redimensionar` mockado).
- [ ] **Step 2:** Implementar.
  - `BotoesFoto`: 68×68, borda `1px dashed` (`#0069BD` no azul, `#F47B50` no coral), raio 12, fundo branco, coluna centralizada com gap 2, 11/600, texto `#004E8F` no azul e `#A8336A` no coral, ícones camera e image de 20.
- [ ] **Step 3: Permissões**
  - `Info.plist`:
    - `NSCameraUsageDescription` = "O app usa a câmera para registrar fotos dos serviços."
    - `NSPhotoLibraryUsageDescription` = "O app acessa suas fotos para anexar imagens aos serviços."
    - `NSPhotoLibraryAddUsageDescription` = "O app pode salvar as fotos tiradas nos serviços."
  - `AndroidManifest.xml`:
    - `android.permission.CAMERA`
    - `READ_MEDIA_IMAGES`
    - `READ_EXTERNAL_STORAGE` com `maxSdkVersion 32`
  - Depois: `pnpm --filter @kgb/prestador exec cap sync`.
- [ ] **Step 4:** Os testes passam. Commit `feat(prestador): captura e redimensionamento de fotos, permissões nativas`.

### Task 7: Detalhe e execução

**Files:**
- Create:
  - `apps/prestador/src/execucao/usarDetalhe.ts`: consulta e mutações.
  - `apps/prestador/src/execucao/PaginaDetalhe.vue`
  - `apps/prestador/src/execucao/CartaoEtapa.vue`
  - `apps/prestador/src/execucao/ConclusaoServico.vue`
  - `apps/prestador/src/execucao/BarraAcoes.vue`
- Test: `apps/prestador/src/execucao/PaginaDetalhe.test.ts`

**Interfaces:**
- Consumes:
  - `regras.ts` (Task 4), `usarAutosave` (Task 5), `BotoesFoto` e `FotoCapturada` (Task 6);
  - `CHAVES`, `exigir`, `mensagemDeErro` e `avisar` (Task 1).
- Produces: `usarDetalhe(id: Ref<string>)` →
  ```ts
  {
    detalhe
    carregando
    iniciar()
    marcarEtapa(etapaId, feita)
    comentarEtapa(etapaId, texto)
    comentarConclusao(texto)
    adicionarFoto(contexto, foto, etapaId?)
    removerFoto(fotoId)
    enviar()
    marcarInviavel(comentario, arquivos)
  }
  ```
  - As mutações que devolvem `DetalheAcionamento` gravam o cache com `setQueryData(CHAVES.detalhe(id), d)` e invalidam `CHAVES.lista` e `CHAVES.inicio`.
  - As de foto invalidam o detalhe.
  - Erros viram toast com `mensagemDeErro`. Os sucessos das transições mostram o toast correspondente.

- [ ] **Step 1: Testes de componente (falham)**, com o mock de `../api` devolvendo um detalhe:
  - **`aberto`:**
    - mostra "Iniciar atendimento" e "Marcar como inviável";
    - clicar chama `POST /api/acionamentos/{id}/iniciar` e mostra o toast "Atendimento iniciado".
  - **`em_andamento` sem foto de conclusão:**
    - "Enviar para aprovação" fica `disabled`;
    - aparece o aviso "Adicione 1 foto da conclusão para enviar".
  - **Com 1 foto:** habilitado; clicar chama `/enviar` e mostra o toast "Enviado para aprovação".
  - **Erro 422 ao enviar:** o toast mostra `erro.mensagem`.
  - **Checkbox da etapa:** chama `PATCH` com `{ feita: true }`. Em `aguardando`, o checkbox não chama nada.
  - **Chevron:**
    - expande a etapa;
    - no modo só leitura e sem dados, mostra "Sem fotos ou comentários.";
    - no editável, mostra as miniaturas com o botão "Remover foto", que chama `DELETE`.
  - **Resumo azul:** "2 fotos · comentário".
  - **Faixas:** reprovado (motivo), aguardando ("… · aguarde a conferência do gestor") e aprovado.
  - **A barra de ações não existe em `aguardando`.**
- [ ] **Step 2: Implementar** (CSS do protótipo, linhas 706–871)
  - **Raiz:** `min-height: 100%`, coluna.
  - **Cabeçalho:** `sticky` com `top 0`, `z-index 2`, fundo branco, padding `4px 16px 8px`, gap 8.
    - voltar: 40×40, raio 12, fundo `#F9F9F9`, chevron de 20 girado 180°;
    - código: 14/700 `#2C3143`, centralizado;
    - espaçador de 40.
  - **Corpo:** padding `8px 24px 24px`, gap 16, `flex 1`.
  - **Título:** gap 8, `StatusChip` m com `align-self: flex-start`, título 22/30 700 e cliente 14/500 `#50555C`.
  - **Informações:** fundo `#F9F9F9`, raio 16, padding `4px 16px`.
    - linhas com padding `12px 0`, divisor `#E5E5E5` (menos a última), gap 12, ícone de 20 e texto 14/600;
    - link "Rota" 13/600.
  - **Faixas e cartão inviável:**
    - reprovado: `#FFD7D4`, gap 4, título 13/700 `#B8342A`, motivo 14 `#2C3143`;
    - aguardando: `#FFEBDC`, título 13/700 `#B85200`, linha 13 `#2C3143`;
    - aprovado: `#E6F0FA`, 13/700 `#004E8F`;
    - inviável: borda `#F4D8E8`, gap 8, título 13/700 `#A8336A`, texto 14 `#363853`, miniaturas de 64.
    - Todas com raio 16 e padding `14px 16px`.
  - **Checklist:**
    - cabeçalho com gap 10: título 16/700 e progresso 13/600 `#50555C`;
    - barra com trilho `#EFF1F3` e `margin-top -8px`;
    - grupos com gap 8 e cabeçalho 13/700 `#50555C` (bolinha de 8).
  - **Etapa (`CartaoEtapa`):**
    - linha com padding `12px 12px 12px 14px` e gap 12;
    - checkbox: um botão de 28 com a caixa de 26 e raio 8. Marcado: fundo `#0069BD` e check branco de 18. Desmarcado: borda `1.5px #ADB3BC` e fundo branco;
    - texto 14/600: `#2C3143` se feita, senão `#363853`; resumo 12/500 `#004E8F`;
    - chevron: botão de 32 com o padding padrão `1px 6px`, ícone de 18 girado 90° (fechado) ou −90° (aberto).
    - expandido: padding `0 14px 14px`, gap 10. A linha de fotos é **sempre** renderizada (wrap, gap 8), mesmo vazia. O textarea tem altura 64, padding `10px 12px`, raio 12, borda `#E5E5E5`, foco `#262A3B` e 14px.
  - **Conclusão:**
    - borda `1px #CCE1F2`, raio 16, padding 16, gap 10;
    - título 16/700 e `textoFotosObrigatorias` em 12 `#8F8D8D`;
    - o textarea "Comentário final para o gestor" só aparece no modo editável.
  - **Barra de ações:**
    - `sticky` com `bottom 0`, fundo branco, borda superior `#E5E5E5`, padding `12px 24px 24px`, gap 8;
    - aviso 12/500 `#B85200`, centralizado;
    - botão principal: altura 48, raio 16, 15/600. Fundo `#0069BD` com texto branco, ou `#CCE1F2` com `#004E8F` quando desabilitado;
    - link: altura 32, 13/600 `#A8336A`.
  - **Voltar:** `router.back()` quando `history.state.back` existe; senão, `/demandas`.
- [ ] **Step 3:** Os testes passam. Commit `feat(prestador): detalhe e execução do acionamento`.

### Task 8: Painel "Marcar como inviável"

**Files:**
- Create: `apps/prestador/src/execucao/PainelInviavel.vue`
- Modify: `apps/prestador/src/execucao/PaginaDetalhe.vue`
- Test: `apps/prestador/src/execucao/PainelInviavel.test.ts`

**Interfaces:**
- Consumes: `validarInviabilidade`, `BotoesFoto`, `FotoCapturada` e `marcarInviavel(comentario, arquivos)`.
- Produces: `<PainelInviavel :aberto @fechar @enviar="(comentario: string, arquivos: Blob[]) => …" />`, com as fotos locais e as prévias em `URL.createObjectURL`, revogadas ao remover ou fechar.

- [ ] **Step 1: Testes (falham)**
  - "Enviar ao gestor" começa desabilitado;
  - com o motivo preenchido e 1 foto, fica habilitado e emite `enviar` com o texto sem espaços nas pontas e 1 blob;
  - o X remove a foto;
  - "Cancelar" emite `fechar`;
  - reabrir começa vazio;
  - no Detalhe, enviar faz um único `POST /inviavel` com o `FormData` de `formularioInviabilidade` e mostra o toast "Inviabilidade enviada ao gestor".
- [ ] **Step 2: Implementar** (CSS do protótipo, linhas 846–871)
  - sobreposição `fixed` em `inset 0`, `rgba(28,18,67,.8)`, `z-index 30`, alinhada na base (`Teleport` para o `body`);
  - painel: raio `24px 24px 0 0`, padding `12px 24px 28px`, gap 14;
  - alça: 40×5, raio 3, `#E5E5E5`;
  - título 18/700 e texto 13 `#50555C`;
  - textarea: altura 96, padding 12, raio 12;
  - `BotoesFoto` coral;
  - botões com gap 8:
    - Cancelar: `flex 1`, altura 48, raio 16, `#EFF1F3` / `#363853`, 14/600;
    - Enviar: `flex 1.6`, `#262A3B` / branco, ou `#EFF1F3` / `#A29EB6` quando desabilitado.
- [ ] **Step 3:** Os testes passam. Commit `feat(prestador): painel para marcar como inviável`.

### Task 9: Casos visuais e ajuste fino

**Files:**
- Modify: `tools/visual/casos-prestador.ts`

- [ ] **Step 1: Casos**
  - Todos com `modo: 'pa'` e `regioes: [telaInteira('pa')]`, exceto quando indicado.
  - Início: `prestador-inicio`.
  - Demandas, com `navegarPrototipo: 'Demandas'` e `rota: '/demandas'`:
    - `prestador-demandas-ativas`;
    - `-corrigir`, `-analise` e `-finalizadas`, com o passo no chip do filtro (nome acessível conferido no protótipo).
  - Detalhe, abrindo pelo título (`papel: 'text'`):
    - `prestador-detalhe-aberto`: Ativas → "Vazamento no teto do banheiro";
    - `prestador-detalhe-reprovado`: Corrigir → "Reparo em gesso no quarto";
    - `prestador-detalhe-reprovado-etapa`: o mesmo, mais o clique na etapa "Remover parte danificada";
    - `prestador-detalhe-aguardando`: Em análise → "Limpeza de ar-condicionado";
    - `prestador-detalhe-aprovado`: Finalizadas → "Troca de fechadura da porta dos fundos";
    - `prestador-inviavel`: detalhe aberto → "Marcar como inviável".
  - Por último, `prestador-detalhe-em-andamento`: detalhe aberto → "Iniciar atendimento". Esse caso altera o banco.
  - Os casos antigos de Agenda (abas e cabeçalho) continuam.
- [ ] **Step 2: Rodar**
  ```bash
  pnpm db:seed && URL_PRESTADOR=http://localhost:5184 pnpm visual -- --app=prestador
  ```
  Ler cada `--diff.png` que falhar e corrigir o CSS até todas as regiões passarem.
- [ ] **Step 3:** Commits `test(visual): casos do prestador` e `fix(prestador): ajustes de pixel …`.

### Task 10: Verificação final

- [ ] Rodar e ler a saída:
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm typecheck`
  - `pnpm --filter @kgb/prestador test`
  - `pnpm --filter @kgb/prestador build`
  - `pnpm db:seed && URL_PRESTADOR=http://localhost:5184 pnpm visual -- --app=prestador`
- [ ] Derrubar só os processos deste worktree (API :3001 e Vite :5184).
