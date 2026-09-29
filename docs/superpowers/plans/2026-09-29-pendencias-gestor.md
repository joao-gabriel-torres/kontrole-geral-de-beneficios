# Pendências do gestor — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as pendências do gestor da revisão do fluxo principal (G1/R8, G2, G3, G4, G5, G6 e G8) sem mudar nenhum pixel das telas em repouso.

**Architecture:**
- **Consultas (`src/consultas.ts`):** a política de repetição sai do `retry: 1` fixo para `deveRepetir(falhas, erro)`: 4xx e tempo esgotado não repetem; 5xx e erro de rede repetem uma vez. O mesmo módulo ganha `comLimite(executar, sinal?)`, que junta o tempo limite de `@kgb/api-client` (8 s) com o `signal` de cancelamento do vue-query.
- **Dados (`src/acionamentos/dados.ts`):** toda `queryFn` e `mutationFn` passa por `comLimite`. O `ErroTempoEsgotado` cai em `mensagemDeErro()` como `MENSAGEM_FALHA` ("Não foi possível falar com o servidor. Tente de novo."), que as telas já mostram.
- **Envio:** o modal Novo acionamento ganha `fechar()`, que ignora X, Cancelar e Esc durante o POST, e o botão clicado mostra "Enviando…" com `aria-busy`. O `CartaoDecisao` recebe qual decisão está sendo enviada (`Decisao | null`, das `variables` da mutação) e troca só o rótulo do botão clicado. Os estilos novos só existem com `aria-disabled`, `aria-busy` ou `:disabled`, que não aparecem em repouso.
- **Rolagem (`LayoutGestor.vue`):** um watcher `pre` guarda o `scrollTop` da lista ao sair (o DOM ainda é o da tela anterior). Um watcher `post` restaura quando a navegação é Detalhe → lista de origem; nas demais, a tela abre no topo, como hoje.

**Tech Stack:** Vue 3.5, vue-router 5, @tanstack/vue-query 5.104, Vitest 4 + @vue/test-utils + jsdom 30 (tem `AbortSignal.any`), Playwright (comparador visual).

**Spec:** [`docs/superpowers/specs/2026-09-29-telas-restantes-design.md`](../specs/2026-09-29-telas-restantes-design.md) (seção "Pendências") e o levantamento [`2026-09-29-telas-restantes/pendencias.md`](../specs/2026-09-29-telas-restantes/pendencias.md) (G1–G8, R8).

## Global Constraints

- **Pixel perfect em repouso:** `pnpm db:seed && URL_GESTOR=http://localhost:5216 pnpm visual -- --app=gestor` com todas as regiões em ≤ 0,2 % da região e ≤ 2 % do conteúdo. Divergência se corrige no CSS, nunca no limite. Base medida antes das mudanças: 23 regiões, todas dentro (maior: detalhe-aguardando web, 0,054 % / 0,161 %).
- **Fronteira:** só `apps/gestor/src/consultas.ts`, `apps/gestor/src/layouts/LayoutGestor.vue`, `apps/gestor/src/acionamentos/**` e os testes deles, `apps/gestor/test/**` (sem remover nada) e este plano. Sem dependências novas; `pnpm-lock.yaml`, `tools/visual/*`, `packages/*` e `docs/` (fora este plano) não mudam.
- **Textos:** "Enviando…" (com reticências de um caractere, como o `PainelInviavel` do prestador); "Tentar de novo"; mensagem de conexão = `MENSAGEM_FALHA`; 404 do Detalhe continua "Acionamento não encontrado.".
- **Tempo limite:** `TEMPO_LIMITE_PADRAO = 8000` de `@kgb/api-client`; não se cria outro valor.
- **Repetição:** consultas repetem no máximo 1 vez (atraso padrão do query-core: 1 s); mutações continuam sem repetição.
- **Ambiente:** API em `:3016`, gestor em `:5216`, bancos `kgb_pendgestor_dev/_test` (no `.env` do worktree).
- Commits pequenos, em português, com prefixo convencional e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `pnpm lint`, `format:check`, `typecheck` e `test` antes de cada commit.

## Review Focus

1. **Voltar pelo botão do navegador** (histórico, não o link "Acionamentos") a partir do Detalhe: a lista também volta na posição de onde saiu. Teste na Task 7 (`router.back()`).
2. **Sair da tela com a consulta em andamento:** o cancelamento do vue-query continua abortando o pedido, mesmo com o sinal do tempo limite junto. Teste na Task 2.
3. **API travada na lista:** depois de 8 s a lista mostra a mensagem de conexão, em vez de ficar vazia sem aviso. Teste na Task 2 (`PaginaAcionamentos`).
4. **POST de criação que falha depois de bloquear o fechamento:** X, Cancelar e Esc voltam a funcionar, e o formulário continua preenchido. Teste na Task 3.
5. **"Tentar de novo" que falha outra vez:** a mensagem e o botão continuam lá (sem grupo vazio). Teste na Task 4.

---

## Mapa de arquivos

```
apps/gestor/
  src/consultas.ts                               deveRepetir(), comLimite(), retry do QueryClient
  src/consultas.test.ts                          G1: 4xx, 5xx, rede e tempo esgotado (timers falsos)
  src/acionamentos/dados.ts                      G5: comLimite em toda queryFn e mutationFn
  src/acionamentos/dados.test.ts                 G5: 8 s → ErroTempoEsgotado; cancelamento ainda aborta
  src/acionamentos/PaginaAcionamentos.test.ts    G5: a lista mostra a mensagem de conexão
  src/acionamentos/novo/ModalNovoAcionamento.vue G3, G4 e G8
  src/acionamentos/novo/ModalNovoAcionamento.test.ts
  src/acionamentos/detalhe/CartaoDecisao.vue     G4: enviando: Decisao | null
  src/acionamentos/detalhe/CartaoDecisao.test.ts
  src/acionamentos/detalhe/PaginaDetalhe.vue     G4 (variables da mutação) e G6 (watch do id)
  src/acionamentos/detalhe/PaginaDetalhe.test.ts
  src/layouts/LayoutGestor.vue                   G2: guarda e restaura a rolagem
  src/layouts/LayoutGestor.test.ts
  test/api-falsa.ts                              `signal` nas opções e `nuncaResponde`
```

---

### Task 1: G1/R8 — não repetir 4xx

**Files:**
- Modify: `apps/gestor/src/consultas.ts`
- Test: `apps/gestor/src/consultas.test.ts`

**Interfaces:**
- Produces: `export function deveRepetir(falhas: number, erro: unknown): boolean` e `export const REPETICOES = 1`.

- [ ] **Step 1: Write the failing test** (acrescentar ao `describe` existente)

```ts
import { ErroTempoEsgotado } from '@kgb/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('repetição das consultas', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  async function buscar(erro: unknown, aoPerderSessao = vi.fn()) {
    const consultas = criarClienteConsultas(aoPerderSessao)
    const queryFn = vi.fn(() => Promise.reject(erro))
    const resultado = consultas.fetchQuery({ queryKey: ['x'], queryFn }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(0)
    return { queryFn, resultado, aoPerderSessao }
  }

  it('4xx não repete: 404 e 401 aparecem na hora', async () => {
    const naoEncontrado = await buscar(new ErroApi('Acionamento não encontrado', 'nao_encontrado', 404))
    expect(naoEncontrado.queryFn).toHaveBeenCalledTimes(1)
    expect(await naoEncontrado.resultado).toBeInstanceOf(ErroApi)
    const semSessao = await buscar(new ErroApi('Faça login', 'nao_autenticado', 401))
    expect(semSessao.queryFn).toHaveBeenCalledTimes(1)
    expect(semSessao.aoPerderSessao).toHaveBeenCalledTimes(1)
  })

  it('5xx e falha de rede repetem uma vez, depois de 1 s', async () => {
    for (const erro of [new ErroApi('Erro interno', 'interno', 500), new TypeError('Failed to fetch')]) {
      const { queryFn, resultado } = await buscar(erro)
      expect(queryFn).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(999)
      expect(queryFn).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(queryFn).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(5_000)
      expect(queryFn).toHaveBeenCalledTimes(2)
      expect(await resultado).toBe(erro)
    }
  })

  it('tempo esgotado não repete: a gestora já esperou 8 s', async () => {
    const { queryFn } = await buscar(new ErroTempoEsgotado())
    await vi.advanceTimersByTimeAsync(5_000)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })
})

it('deveRepetir: só a primeira falha de 5xx ou rede', () => {
  expect(deveRepetir(0, new ErroApi('x', 'x', 503))).toBe(true)
  expect(deveRepetir(1, new ErroApi('x', 'x', 503))).toBe(false)
  expect(deveRepetir(0, new ErroApi('x', 'x', 422))).toBe(false)
  expect(deveRepetir(0, new ErroApi('x', 'x', 499))).toBe(false)
  expect(deveRepetir(0, new TypeError('Failed to fetch'))).toBe(true)
  expect(deveRepetir(0, new ErroTempoEsgotado())).toBe(false)
})
```

- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/consultas.test.ts` — Expected: FAIL (`deveRepetir` não existe; 404 chamado 2 vezes).

- [ ] **Step 3: Implement**

```ts
import { ErroTempoEsgotado } from '@kgb/api-client'

/** Quantas vezes uma consulta que falhou por 5xx ou rede é repetida. */
export const REPETICOES = 1

/**
 * 4xx é resposta definitiva (404, 401, 403…): repetir só atrasa o aviso e a volta ao login.
 * Tempo esgotado também não repete, porque a gestora já esperou o limite inteiro.
 */
export function deveRepetir(falhas: number, erro: unknown): boolean {
  if (falhas >= REPETICOES) return false
  if (erro instanceof ErroTempoEsgotado) return false
  return !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500)
}
// no QueryClient: defaultOptions: { queries: { retry: deveRepetir, staleTime: 5_000 } }
```

- [ ] **Step 4: Run** o mesmo comando — Expected: PASS. Depois `pnpm --filter @kgb/gestor test`.
- [ ] **Step 5: Commit** `fix(gestor): consultas não repetem 4xx nem tempo esgotado (G1)`

---

### Task 2: G5 — tempo limite nas chamadas de dados

**Files:**
- Modify: `apps/gestor/src/consultas.ts`, `apps/gestor/src/acionamentos/dados.ts`, `apps/gestor/test/api-falsa.ts`
- Test: `apps/gestor/src/acionamentos/dados.test.ts`, `apps/gestor/src/acionamentos/PaginaAcionamentos.test.ts`

**Interfaces:**
- Produces: `export function comLimite<T>(executar: (sinal: AbortSignal) => Promise<T>, sinal?: AbortSignal): Promise<T>` em `consultas.ts`; em `test/api-falsa.ts`, `OpcoesChamada.signal?: AbortSignal` e `export const nuncaResponde: (o: OpcoesChamada) => Promise<RespostaFalsa>` (só termina rejeitando com o `reason` quando o sinal aborta, como o `fetch`).

- [ ] **Step 1: Write the failing tests**

`dados.test.ts` (timers falsos; cada composable montado num componente de teste):

```ts
const CONSULTAS = [
  ['contagem', 'GET /api/acionamentos/contagem', () => usarContagem()],
  ['lista', 'GET /api/acionamentos', () => usarLista('todos')],
  ['detalhe', 'GET /api/acionamentos/{id}', () => usarDetalhe('a1059')],
  ['tipos', 'GET /api/tipos', () => usarTipos()],
  ['prestadores', 'GET /api/prestadores', () => usarPrestadoresAtivos()],
] as const

it.each(CONSULTAS)('%s: sem resposta em 8 s, falha com tempo esgotado e aborta o pedido', async (_, rota, usar) => {
  vi.useFakeTimers()
  const simulada = simularApi(api, { [rota]: nuncaResponde })
  const consulta = montarConsulta(usar)
  await vi.advanceTimersByTimeAsync(7_999)
  expect(consulta().isError.value).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  expect(consulta().error.value).toBeInstanceOf(ErroTempoEsgotado)
  expect(mensagemDeErro(consulta().error.value)).toBe(MENSAGEM_FALHA)
  const [metodo, caminho] = rota.split(' ') as ['GET', string]
  expect(simulada.chamadas(metodo, caminho)[0]!.signal!.aborted).toBe(true)
})

it('cancelar a consulta (sair da tela) ainda aborta o pedido', async () => { /* cancelQueries → signal.aborted */ })
it('criar e revisar: sem resposta em 8 s, a ação falha com tempo esgotado', async () => { /* mutateAsync rejeita com ErroTempoEsgotado */ })
```

`PaginaAcionamentos.test.ts`: `GET /api/acionamentos` com `nuncaResponde`; depois de 8 s, `.aviso` tem `MENSAGEM_FALHA`.

- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/dados.test.ts src/acionamentos/PaginaAcionamentos.test.ts` — Expected: FAIL (a consulta fica pendente para sempre).

- [ ] **Step 3: Implement**

`consultas.ts`:

```ts
/**
 * Chamada de dados com tempo limite: sem resposta em 8 s, o pedido é abortado e a consulta ou a
 * ação falha com `ErroTempoEsgotado`, que vira a mensagem de conexão. O `signal` do vue-query
 * (cancelamento ao sair da tela) continua abortando o pedido.
 */
export function comLimite<T>(executar: (sinal: AbortSignal) => Promise<T>, sinal?: AbortSignal): Promise<T> {
  return comTempoLimite((limite) => executar(sinal ? AbortSignal.any([sinal, limite]) : limite))
}
```

`dados.ts`: `queryFn: ({ signal }) => exigir(comLimite((s) => api.GET('/api/tipos', { signal: s }), signal))` em todas as consultas; `mutationFn: (corpo) => exigir(comLimite((s) => api.POST('/api/acionamentos', { body: corpo, signal: s })))` nas duas mutações.

- [ ] **Step 4: Run** os testes da Task — Expected: PASS; depois a suíte do gestor.
- [ ] **Step 5: Commit** `fix(gestor): tempo limite de 8 s nas consultas e ações de acionamentos (G5)`

---

### Task 3: G3 + G4 no modal — bloquear o fechamento e mostrar "Enviando…"

**Files:**
- Modify: `apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.vue`
- Test: `apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.test.ts`

**Interfaces:**
- Consumes: `usarCriarAcionamento()` (Task 2, agora com tempo limite).

- [ ] **Step 1: Write the failing tests**

```ts
function adiado() {
  let responder!: (r: RespostaFalsa) => void
  const promessa = new Promise<RespostaFalsa>((ok) => (responder = ok))
  return { promessa, responder }
}

it('durante o envio, X, Cancelar e Esc não fecham; o botão mostra "Enviando…"', async () => {
  const pedido = adiado()
  criar = () => pedido.promessa
  const { tela } = await abrir()
  await preencher(tela)
  await tela.find('button.enviar').trigger('click')
  await aguardar()
  const enviar = tela.find('button.enviar')
  expect(enviar.text()).toBe('Enviando…')
  expect(enviar.attributes('aria-busy')).toBe('true')
  expect(enviar.attributes('aria-disabled')).toBe('true')
  expect(enviar.classes()).toContain('inativo')
  expect(tela.find('button.fechar').attributes('aria-disabled')).toBe('true')
  expect(tela.find('button.cancelar').attributes('aria-disabled')).toBe('true')
  await tela.find('button.fechar').trigger('click')
  await tela.find('button.cancelar').trigger('click')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(tela.emitted('fechar')).toBeUndefined()
  pedido.responder({ data: resumo({ id: 'a2000' }) })
  await aguardar()
  expect(tela.emitted('fechar')).toHaveLength(1)
})

it('se o envio falha, destrava o fechamento e mantém o formulário', async () => {
  const pedido = adiado()
  criar = () => pedido.promessa
  const { tela } = await abrir()
  await preencher(tela)
  await tela.find('button.enviar').trigger('click')
  await aguardar()
  pedido.responder(erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo'))
  await aguardar()
  expect(tela.find('button.enviar').text()).toBe('Enviar ao prestador')
  expect(tela.find('button.enviar').attributes('aria-busy')).toBeUndefined()
  expect(tela.find('button.fechar').attributes('aria-disabled')).toBeUndefined()
  expect((tela.findAll('input:not([type])')[0]!.element as HTMLInputElement).value).toBe('  Vazamento no banheiro social ')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await tela.find('button.cancelar').trigger('click')
  expect(tela.emitted('fechar')).toHaveLength(2)
})

it('em repouso, X e Cancelar não têm aria-disabled nem o botão tem aria-busy', …)
```

- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/novo/ModalNovoAcionamento.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
/** Durante o POST não fecha: no erro o formulário se perderia, e reabrir e enviar duplicaria. */
function fechar() {
  if (criando.value) return
  emit('fechar')
}
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') fechar()
}
```

```html
<button type="button" class="fechar" aria-label="Fechar" :aria-disabled="criando || undefined" @click="fechar">
<button type="button" class="cancelar" :aria-disabled="criando || undefined" @click="fechar">Cancelar</button>
<button type="button" class="enviar" :class="{ inativo: !valido || criando }" :aria-disabled="bloqueado"
  :aria-busy="criando || undefined" @click="enviar">{{ criando ? 'Enviando…' : 'Enviar ao prestador' }}</button>
```

```css
/* Só durante o envio (atributos ausentes em repouso). */
.fechar[aria-disabled='true'],
.cancelar[aria-disabled='true'] { opacity: 0.6; cursor: not-allowed; }
.enviar[aria-busy='true'] { cursor: progress; }
```

- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `fix(gestor): modal Novo acionamento não fecha durante o envio e mostra "Enviando…" (G3, G4)`

---

### Task 4: G8 — erro ao carregar tipos ou prestadores no modal

**Files:**
- Modify: `apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.vue`
- Test: `apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('tipos que não carregam: mostra a mensagem e "Tentar de novo" busca de novo', async () => {
  let tentativas = 0
  simulada = simularApi(api, {
    'GET /api/tipos': () => (++tentativas === 1 ? erroApi(500, 'interno', 'Erro interno') : { data: TIPOS }),
    'GET /api/prestadores': PRESTADORES,
  })
  const { tela } = await abrir()
  const falha = tela.find('.grupo-tipos .falha')
  expect(falha.attributes('role')).toBe('alert')
  expect(falha.text()).toContain('Erro interno')
  await falha.find('button.tentar').trigger('click')
  await aguardar()
  expect(tela.find('.grupo-tipos .falha').exists()).toBe(false)
  expect(tela.findAll('button.tipo')).toHaveLength(TIPOS.length)
})

it('"Tentar de novo" que falha outra vez mantém a mensagem e o botão', …)

it('prestadores que não carregam: mensagem no lugar do seletor, e o Carlos volta a ser o padrão depois', async () => {
  // 1ª chamada: rede cai (throw TypeError) → MENSAGEM_FALHA; 2ª: PRESTADORES → select com 'p1'
})
```

- [ ] **Step 2: Run** — Expected: FAIL (`.falha` não existe).

- [ ] **Step 3: Implement**

```ts
const { data: tipos, isError: erroTipos, error: falhaTipos, refetch: recarregarTipos } = usarTipos()
const { data: prestadores, isError: erroPrestadores, error: falhaPrestadores, refetch: recarregarPrestadores } =
  usarPrestadoresAtivos()
// Com a lista já carregada, uma nova busca que falhe não esconde o que a gestora está vendo.
const semTipos = computed(() => erroTipos.value && !tipos.value)
const semPrestadores = computed(() => erroPrestadores.value && !prestadores.value)
```

```html
<div v-if="semTipos" class="falha" role="alert">
  {{ mensagemDeErro(falhaTipos) }}
  <button type="button" class="tentar" @click="recarregarTipos()">Tentar de novo</button>
</div>
<div v-else class="tipos" role="group" aria-labelledby="novo-tipos">…</div>

<div v-if="semPrestadores" class="campo">
  <span>Prestador</span>
  <div class="falha" role="alert">
    {{ mensagemDeErro(falhaPrestadores) }}
    <button type="button" class="tentar" @click="recarregarPrestadores()">Tentar de novo</button>
  </div>
</div>
<label v-else class="campo">Prestador <select>…</select></label>
```

```css
/* Só quando a carga falha: não existe em repouso. */
.falha { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; font-weight: 500; color: var(--kgb-perigo-texto); }
.tentar { padding: 0; border: 0; background: none; font-size: 13px; font-weight: 600; color: var(--kgb-primaria); text-decoration: underline; }
```

- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `fix(gestor): modal Novo acionamento avisa quando tipos ou prestadores não carregam (G8)`

---

### Task 5: G4 no Detalhe — "Enviando…" no botão da decisão

**Files:**
- Modify: `apps/gestor/src/acionamentos/detalhe/CartaoDecisao.vue`, `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue`
- Test: `apps/gestor/src/acionamentos/detalhe/CartaoDecisao.test.ts`, `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.test.ts`

**Interfaces:**
- Produces: `CartaoDecisao` prop `enviando: Decisao | null` (antes `boolean`).

- [ ] **Step 1: Write the failing tests**

`CartaoDecisao.test.ts`:

```ts
const montar = (inviavel: boolean, enviando: Decisao | null = null) =>
  mount(CartaoDecisao, { props: { inviavel, enviando, observacao: '' } })

it('enquanto envia, os dois botões travam e só o clicado diz "Enviando…"', () => {
  const c = montar(false, 'reprovado')
  expect(c.find('.aprovar').attributes('disabled')).toBeDefined()
  expect(c.find('.reprovar').attributes('disabled')).toBeDefined()
  expect(c.find('.reprovar').text()).toBe('Enviando…')
  expect(c.find('.reprovar').attributes('aria-busy')).toBe('true')
  expect(c.find('.aprovar').text()).toBe('Aprovar conclusão')
  expect(c.find('.aprovar').attributes('aria-busy')).toBeUndefined()
})
it('em repouso, nada de disabled nem aria-busy', …)
```

`PaginaDetalhe.test.ts`: revisão com resposta adiada → depois do clique em Aprovar, `.aprovar` tem "Enviando…" e `aria-busy="true"`, `.reprovar` está `disabled`; ao responder, o cartão some e o toast aparece.

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement**

`PaginaDetalhe.vue`:

```ts
const { mutateAsync: revisar, isPending, variables } = usarRevisao(() => props.id)
/** A decisão em envio (para o rótulo do botão clicado), ou null. */
const enviando = computed(() => (isPending.value ? (variables.value?.decisao ?? null) : null))
// decidir(): if (isPending.value) return
```

`CartaoDecisao.vue`:

```html
<button type="button" class="aprovar" :disabled="!!enviando" :aria-busy="enviando === 'aprovado' || undefined" …>
  {{ enviando === 'aprovado' ? 'Enviando…' : rotulos.aprovar }}
</button>
<!-- idem para reprovar -->
```

```css
.aprovar:hover:not(:disabled) { background: var(--kgb-primaria-hover); }
.reprovar:hover:not(:disabled) { background: var(--kgb-perigo-fundo); }
/* Só durante o envio. */
.aprovar:disabled, .reprovar:disabled { opacity: 0.6; cursor: progress; }
```

- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `fix(gestor): decisão do Detalhe mostra "Enviando…" no botão clicado (G4)`

---

### Task 6: G6 — observação zerada ao trocar de acionamento

**Files:**
- Modify: `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue`
- Test: `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('trocar de acionamento (mesmo componente, outro id) zera a observação', async () => {
  const { tela } = await abrir()
  await tela.find('.decisao textarea').setValue('Falta a foto do quadro')
  await tela.setProps({ id: 'a2' })
  await aguardar()
  expect((tela.find('.decisao textarea').element as HTMLTextAreaElement).value).toBe('')
  await tela.find('.decisao .reprovar').trigger('click')
  await aguardar()
  expect(toastGestor.mensagem.value).toBe('Escreva o motivo da reprovação')
})
```

- [ ] **Step 2: Run** — Expected: FAIL (textarea mantém o texto).
- [ ] **Step 3: Implement** `watch(() => props.id, () => { observacao.value = '' })` com o comentário: a nota de um acionamento nunca vai para outro.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `fix(gestor): observação da decisão zera ao trocar de acionamento (G6)`

---

### Task 7: G2 — voltar do Detalhe para a lista na mesma rolagem

**Files:**
- Modify: `apps/gestor/src/layouts/LayoutGestor.vue`
- Test: `apps/gestor/src/layouts/LayoutGestor.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('volta do Detalhe para a lista de origem na rolagem de onde saiu', async () => {
  const { tela, router } = await montar(LayoutGestor, { rota: '/acionamentos' })
  const conteudo = tela.find('main.conteudo').element as HTMLElement
  conteudo.scrollTop = 500
  await router.push('/acionamentos/a1'); await aguardar()
  expect(conteudo.scrollTop).toBe(0)
  await router.push('/acionamentos'); await aguardar()
  expect(conteudo.scrollTop).toBe(500)
})
it.each([['/aprovacoes', '/aprovacoes/a1'], ['/painel', '/painel/a1']])('vale também para %s', …)
it('pelo botão Voltar do navegador (histórico) também restaura', …) // router.back()
it('nas outras trocas, a tela abre no topo', async () => {
  // /acionamentos 500 → /acionamentos/a1 → /aprovacoes: 0; /painel 300 → /acionamentos: 0
})
```

- [ ] **Step 2: Run** — Expected: FAIL (volta em 0).

- [ ] **Step 3: Implement**

```ts
/** Detalhe → tela de onde ele foi aberto (nome da rota). */
const ORIGEM_DO_DETALHE: Record<string, string> = {
  acionamento: 'acionamentos',
  aprovacao: 'aprovacoes',
  'painel-acionamento': 'painel',
}
const TELAS_DE_ORIGEM = new Set(Object.values(ORIGEM_DO_DETALHE))
const rolagens = new Map<string, number>()
const trocaDeTela = () => [rota.fullPath, String(rota.name ?? '')] as const

// Antes de desenhar a tela nova (flush 'pre'), a rolagem ainda é a da anterior: guarda a da lista
// e leva ao topo.
watch(trocaDeTela, (_, [caminhoAnterior, nomeAnterior]) => {
  if (!conteudo.value) return
  if (TELAS_DE_ORIGEM.has(nomeAnterior)) rolagens.set(caminhoAnterior, conteudo.value.scrollTop)
  conteudo.value.scrollTop = 0
})
// Voltando do Detalhe para a lista de origem, ela reabre onde estava (os dados vêm do cache).
watch(
  trocaDeTela,
  async ([caminho, nome], [, nomeAnterior]) => {
    if (ORIGEM_DO_DETALHE[nomeAnterior] !== nome) return
    const rolagem = rolagens.get(caminho)
    await nextTick()
    if (conteudo.value && rolagem !== undefined) conteudo.value.scrollTop = rolagem
  },
  { flush: 'post' },
)
```

- [ ] **Step 4: Run** — Expected: PASS. Conferir no navegador (Playwright, `:5216`): Finalizados, rolar até o fim, abrir uma linha, "Acionamentos" → mesma rolagem.
- [ ] **Step 5: Commit** `feat(gestor): voltar do Detalhe devolve a lista na rolagem de onde saiu (G2)`

---

### Task 8: Verificação final

- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- [ ] `pnpm api:generate` e `git status --porcelain` sem diferença.
- [ ] `pnpm db:seed && URL_GESTOR=http://localhost:5216 pnpm visual -- --app=gestor`: as 23 regiões dentro dos limites.
- [ ] Derrubar só os processos das portas 3016 e 5216.
