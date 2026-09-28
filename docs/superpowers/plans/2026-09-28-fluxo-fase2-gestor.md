# Fluxo principal · Fase 2 (telas do gestor) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar no gestor (web a partir de 840px e mobile a 375px) a lista de Acionamentos, o modal Novo acionamento, Aprovações e o Detalhe do acionamento, pixel perfect em relação ao protótipo e falando com a API real.

**Architecture:**
- **Dados:** `@tanstack/vue-query` registrado no `main.ts`. Os composables de `src/acionamentos/dados.ts` embrulham o `api` (openapi-fetch) com `exigir()`, que transforma `{ erro: { codigo, mensagem } }` em `ErroApi`. Toda chave de consulta de acionamento começa com `'acionamentos'`; cada mutação invalida esse prefixo (lista, contagem e detalhe), e o badge do layout, que também é uma consulta, se atualiza sozinho.
- **Telas:** uma pasta por funcionalidade (`src/acionamentos/`, `src/acionamentos/novo/`, `src/acionamentos/detalhe/`, `src/aprovacoes/`). A lógica de tela (filtros, validação, linha do tempo, decisão) fica em módulos `.ts` puros e testados. Os componentes usam elementos nativos com o CSS inline do protótipo copiado para `<style scoped>`.
- **Modal e toast:** como no protótipo, ficam na coluna de conteúdo do `LayoutGestor` (a sobreposição não cobre a sidebar). Um estado global (`novoAcionamento`) abre o modal pela lista ou pelo Painel, e `toastGestor` é o aviso único do app.
- **Rotas:** o Detalhe existe em `/acionamentos/:id` e em `/aprovacoes/:id` (rotas filhas), e assim o menu destaca a tela de origem e o "voltar" sabe o rótulo.

**Tech Stack:** Vue 3.5, vue-router 5, @tanstack/vue-query 5, Vuetify 4 (só layout e `useDisplay`), Vitest + @vue/test-utils, Playwright (comparador visual).

**Spec:** [`docs/superpowers/specs/2026-09-28-fluxo-principal-design.md`](../specs/2026-09-28-fluxo-principal-design.md)

## Global Constraints

- **Pixel perfect:** medidas, cores e textos saem do CSS inline de `docs/design/Acionamentos.dc.html` (template do gestor nas linhas 150–430, modal nas linhas 528–596, lógica em `vGestor`, `vForm` e `vGDetail`). `pnpm visual -- --app=gestor` precisa ficar em ≤ 0,2 % da região e ≤ 2 % do conteúdo em todas as regiões. Divergência se corrige no CSS, nunca no limite nem na região.
- **Padrões herdados pelo protótipo:** `line-height: normal`; `<button>` sem padding explícito usa `1px 6px`; `h1`/`h2`/`h3` precisam de `margin: 0` e fonte explícita. O reset do Vuetify aplica `font: inherit` em `button`, `input`, `select` e `textarea`: todo controle nativo declara `font-size` e `font-weight` (400 quando o protótipo não define).
- **Ícones:** `<RussoIcone>`, na cor `#262A3B` (a cor dos SVGs do protótipo) ou branca sobre fundo colorido.
- **Textos exatos:**
  - Filtros: "Todos", "Agendados", "Em execução", "Aguardando", "Reprovados", "Finalizados".
  - Busca: "Buscar por título, cliente, código ou prestador".
  - Toasts: "Acionamento enviado para {nome}", "Conclusão aprovada", "Devolvido ao prestador para correção", "Escreva o motivo da reprovação". Erros da API: `erro.mensagem`.
  - Aprovações vazia: "Sua fila está vazia.".
  - Decisão: "Confira e decida" / "O prestador marcou como inviável"; "Aprovar conclusão" / "Confirmar inviabilidade"; "Reprovar" / "Recusar inviabilidade"; placeholder "Observação para o prestador (obrigatória para reprovar)".
  - Linha do tempo: "Acionamento criado", "Atendimento iniciado", "Enviado para aprovação", "Reenviado para aprovação", "Inviabilidade enviada", "Aprovado" (ponto `#0069BD`), "Reprovado" (ponto `#FF6A5D`); demais pontos `#ADB3BC`; data com `momento()`.
- **Novo acionamento:** padrão com a data de hoje, 09:00–11:00 e o prestador Carlos (`p1`). Válido com título, ≥ 1 tipo, cliente, endereço, data e início < fim. Ao criar: toast, volta para a lista com o filtro "Todos".
- **Fronteira:** só `apps/gestor/**`, `tools/visual/casos-gestor.ts` e este plano. Sem dependências novas. `packages/*`, `apps/api`, `apps/prestador`, o resto de `tools/visual` e a configuração da raiz não mudam.
- **Ambiente deste worktree:** API em `:3002` e gestor em `:5175` (as portas 3000/5173 estão ocupadas pelo checkout principal); comparar com `URL_GESTOR=http://localhost:5175`. Sempre `pnpm db:seed` antes de `pnpm visual`.
- Commits pequenos, em português, com prefixo convencional e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Busca digitada rápido, com espaços nas pontas:** uma consulta só, com o termo aparado, depois de 300 ms sem digitar. Teste na Task 3.
2. **Duplo clique em "Enviar ao prestador" ou "Aprovar conclusão":** uma única requisição. Testes nas Tasks 5 e 6.
3. **Revisão recusada pela API** (409 porque outra pessoa já decidiu): toast com a mensagem da API e os dados recarregados. Teste na Task 5.
4. **Eventos no mesmo instante** (inviável sem ter iniciado grava `iniciado` e `inviabilidade_enviada` com o mesmo `em`): ordem lógica e estável na linha do tempo. Teste na Task 5.
5. **Link para acionamento inexistente** (404): "Acionamento não encontrado." em vez de tela em branco. Teste na Task 5.

## Decisões de comparação visual

- **Rolagem herdada no protótipo:** o protótipo reaproveita o mesmo contêiner de rolagem entre as telas, então o Detalhe abre com a rolagem que a lista tinha. O app abre cada tela no topo. Os casos de Detalhe abrem a linha pelo título a partir de um filtro (sem rolar a lista no web) e clicam no título uma segunda vez, já no Detalhe: o Playwright rola até ele e os dois ficam no topo.
- **"Ver no app do prestador":** é ferramenta do protótipo e não é implementado. Nos Detalhes do Carlos no web (aguardando e inviável) essa diferença entra na conta da região.
- **Lista limitada a 60 linhas no protótipo:** o app mostra todas (sem paginação nesta fase). A diferença fica fora da tela comparada.

---

## Mapa de arquivos

```
apps/gestor/
  src/main.ts                               registra o VueQueryPlugin
  src/api.ts                                exporta BASE_API
  src/consultas.ts                          QueryClient e CHAVES
  src/erros.ts                              ErroApi, exigir(), mensagemDeErro()
  src/toast.ts                              toastGestor (aviso único)
  src/router.ts                             rotas filhas de acionamentos e aprovações
  src/layouts/LayoutGestor.vue              badge por consulta, toast, modal, rolagem no topo
  src/componentes/PaginaGestor.vue          largura 1180 (Detalhe)
  src/componentes/CabecalhoPagina.vue       alinhamento "base" (Painel)
  src/paginas/PaginaPainel.vue              botão Novo acionamento
  src/acionamentos/dados.ts                 composables de consulta e mutação
  src/acionamentos/filtros.ts               filtros da lista e contagens
  src/acionamentos/estadoLista.ts           filtro e busca guardados na sessão
  src/acionamentos/apresentacao.ts          rotuloTipos
  src/acionamentos/LinhaAcionamento.vue     linha da lista
  src/acionamentos/PaginaAcionamentos.vue   lista
  src/acionamentos/novo/estado.ts           abrir/fechar o modal
  src/acionamentos/novo/formulario.ts       padrão, validação, prévia do checklist
  src/acionamentos/novo/BotaoNovoAcionamento.vue
  src/acionamentos/novo/ModalNovoAcionamento.vue
  src/acionamentos/detalhe/linhaDoTempo.ts  eventos → histórico
  src/acionamentos/detalhe/decisao.ts       rótulos, motivo obrigatório, última decisão
  src/acionamentos/detalhe/fotos.ts         urlFoto()
  src/acionamentos/detalhe/CartaoDecisao.vue
  src/acionamentos/detalhe/PaginaDetalhe.vue
  src/aprovacoes/fila.ts                    ordem da fila e "Enviado …"
  src/aprovacoes/PaginaAprovacoes.vue
  test/montar.ts                            montagem com Vuetify, router e vue-query
  test/api-falsa.ts                         simularApi() para o mock de ../api
  test/fixtures.ts                          resumo(), detalhe(), foto(), contagem(), TIPOS, PRESTADORES
tools/visual/casos-gestor.ts                casos com tela inteira
```

Removidos: `src/paginas/PaginaAcionamentos.vue` e `src/paginas/PaginaAprovacoes.vue` (vão para as pastas da funcionalidade).

---

### Task 1: Base de dados do gestor (vue-query, erros, toast e badge por consulta)

**Files:**
- Create: `apps/gestor/src/consultas.ts`, `apps/gestor/src/erros.ts`, `apps/gestor/src/toast.ts`, `apps/gestor/src/acionamentos/filtros.ts` (só o tipo e `statusDaConsulta`, completado na Task 3), `apps/gestor/src/acionamentos/dados.ts`, `apps/gestor/test/{montar.ts,api-falsa.ts,fixtures.ts}`
- Modify: `apps/gestor/src/main.ts`, `apps/gestor/src/api.ts`, `apps/gestor/src/layouts/LayoutGestor.vue`, `apps/gestor/test/configurar.ts`
- Test: `apps/gestor/src/erros.test.ts`, `apps/gestor/src/acionamentos/dados.test.ts`, `apps/gestor/src/layouts/LayoutGestor.test.ts`

**Interfaces:**
- Produces:
  - `BASE_API: string` (em `src/api.ts`).
  - `class ErroApi extends Error { codigo: string; status: number }`, `exigir<R>(pedido: Promise<R>): Promise<NonNullable<R['data']>>`, `mensagemDeErro(e: unknown): string`, `MENSAGEM_FALHA`.
  - `criarClienteConsultas(): QueryClient`; `CHAVES.{acionamentos, lista(filtro, busca), contagem, detalhe(id), tipos, prestadoresAtivos}`.
  - `toastGestor: Toast` (`mensagem`, `mostrar(texto)`).
  - `type FiltroLista = 'todos' | 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'finalizados'`, `statusDaConsulta(f)`.
  - `usarContagem()`, `usarLista(filtro, busca?)`, `usarDetalhe(id)`, `usarTipos()`, `usarPrestadoresAtivos()`, `usarCriarAcionamento()`, `usarRevisao(id)`; tipos `NovoAcionamento`, `NovaRevisao`.
  - Testes: `montar(componente, { props?, rota? })` → `{ tela, router, consultas }`, `aguardar()`, `criarRouterDeTeste()`, `criarClienteDeTeste()`, `simularApi(api, rotas)` → `{ chamadas(metodo, caminho) }`, fixtures.

- [ ] **Step 1: Apoio de testes**

`apps/gestor/test/configurar.ts` (desmonta cada tela no fim do teste: o estado do modal e os ouvintes de teclado não vazam entre testes):
```ts
import { enableAutoUnmount } from '@vue/test-utils'
import ResizeObserver from 'resize-observer-polyfill'
import { afterEach } from 'vitest'

globalThis.ResizeObserver ??= ResizeObserver
enableAutoUnmount(afterEach)
```

`apps/gestor/test/montar.ts`:
```ts
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, type Component } from 'vue'
import { createVuetify } from 'vuetify'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'

const Vazio = defineComponent({ render: () => null })

/** As rotas nomeadas do gestor, com componentes vazios (para RouterLink e navegação). */
export function criarRouterDeTeste(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Vazio },
      { path: '/painel', name: 'painel', component: Vazio },
      { path: '/acionamentos', name: 'acionamentos', component: Vazio },
      { path: '/acionamentos/:id', name: 'acionamento', component: Vazio },
      { path: '/aprovacoes', name: 'aprovacoes', component: Vazio },
      { path: '/aprovacoes/:id', name: 'aprovacao', component: Vazio },
      { path: '/prestadores', name: 'prestadores', component: Vazio },
      { path: '/checklists', name: 'checklists', component: Vazio },
    ],
  })
}

export function criarClienteDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

/** Deixa as promessas e os avisos do vue-query (agendados com setTimeout) terminarem. */
export async function aguardar(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await flushPromises()
    await new Promise((pronto) => setTimeout(pronto, 0))
  }
}

export async function montar(
  componente: Component,
  opcoes: { props?: Record<string, unknown>; rota?: string } = {},
) {
  const router = criarRouterDeTeste()
  await router.push(opcoes.rota ?? '/acionamentos')
  const consultas = criarClienteDeTeste()
  const tela = mount(componente, {
    props: opcoes.props,
    global: { plugins: [createVuetify(), router, [VueQueryPlugin, { queryClient: consultas }]] },
  })
  await aguardar()
  return { tela, router, consultas }
}

export { RouterView }
```

`apps/gestor/test/api-falsa.ts`:
```ts
import type { Mock } from 'vitest'

export interface OpcoesChamada {
  params?: { path?: Record<string, string>; query?: Record<string, unknown> }
  body?: unknown
}
export interface RespostaFalsa {
  data?: unknown
  error?: unknown
  status?: number
}
type Manipulador = (opcoes: OpcoesChamada) => RespostaFalsa | Promise<RespostaFalsa>

/**
 * Liga os mocks de `api.GET` e `api.POST` (de `vi.mock('…/api')`) a respostas por rota, no formato
 * do openapi-fetch. A chave é "MÉTODO caminho" ("GET /api/tipos"); o valor é o `data` da resposta
 * ou uma função que recebe as opções da chamada e devolve `{ data } | { error, status }`.
 */
export function simularApi(api: { GET: unknown; POST: unknown }, rotas: Record<string, unknown>) {
  const responder =
    (metodo: 'GET' | 'POST') =>
    async (caminho: string, opcoes: OpcoesChamada = {}) => {
      const chave = `${metodo} ${caminho}`
      if (!(chave in rotas)) throw new Error(`Rota não simulada: ${chave}`)
      const rota = rotas[chave]
      const r: RespostaFalsa =
        typeof rota === 'function' ? await (rota as Manipulador)(opcoes) : { data: rota }
      const status = r.status ?? (r.error === undefined ? 200 : 422)
      return { data: r.data, error: r.error, response: { status, ok: status < 400 } }
    }
  const get = api.GET as Mock
  const post = api.POST as Mock
  get.mockReset()
  post.mockReset()
  get.mockImplementation(responder('GET'))
  post.mockImplementation(responder('POST'))
  return {
    chamadas(metodo: 'GET' | 'POST', caminho: string): OpcoesChamada[] {
      const mock = metodo === 'GET' ? get : post
      return mock.mock.calls
        .filter(([c]) => c === caminho)
        .map(([, o]) => (o ?? {}) as OpcoesChamada)
    },
  }
}

export const erroApi = (status: number, codigo: string, mensagem: string): RespostaFalsa => ({
  status,
  error: { erro: { codigo, mensagem } },
})
```

`apps/gestor/test/fixtures.ts`:
```ts
import type {
  ContagemAcionamentos,
  DetalheAcionamento,
  Foto,
  PrestadorOpcao,
  ResumoAcionamento,
  TipoDemanda,
} from '@kgb/api-client'

export function resumo(dados: Partial<ResumoAcionamento> = {}): ResumoAcionamento {
  return {
    id: 'a1059',
    codigo: 'AC-1059',
    titulo: 'Revisão elétrica e troca de disjuntor',
    cliente: 'Colégio Aprender',
    endereco: 'Rua Apinajés, 1500 · Perdizes',
    data: '2026-09-27',
    inicio: '08:00',
    fim: '11:00',
    status: 'aguardando',
    inviavel: false,
    prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
    tipos: [
      { nome: 'Revisão elétrica', cor: '#FC7608' },
      { nome: 'Troca de disjuntor', cor: '#F47B50' },
    ],
    etapas: { feitas: 7, total: 10 },
    ultimoEnvioEm: '2026-09-27T13:30:00.000Z',
    ...dados,
  }
}

export function foto(dados: Partial<Foto> = {}): Foto {
  return {
    id: 'f1',
    url: null,
    cor: '#9CA88A',
    horario: '08:15',
    tiradaEm: '2026-09-27T11:15:00.000Z',
    ...dados,
  }
}

export function detalhe(dados: Partial<DetalheAcionamento> = {}): DetalheAcionamento {
  return {
    ...resumo(),
    criadoEm: '2026-09-25T19:20:00.000Z',
    iniciadoEm: '2026-09-27T11:00:00.000Z',
    comentarioConclusao: 'Serviço finalizado e testado junto com o cliente.',
    regras: { photoMin: 1, requireAllSteps: false },
    demandas: [
      {
        id: 'd1',
        tipoNome: 'Revisão elétrica',
        cor: '#FC7608',
        etapas: [
          {
            id: 'e1',
            texto: 'Inspecionar quadro de distribuição',
            feita: true,
            comentario: null,
            fotos: [foto()],
          },
          {
            id: 'e2',
            texto: 'Medir tensão das tomadas',
            feita: false,
            comentario: 'Tomada da cozinha sem tensão',
            fotos: [],
          },
        ],
      },
    ],
    fotosConclusao: [foto({ id: 'f2', horario: '10:24' }), foto({ id: 'f3', horario: '10:28' })],
    inviabilidade: null,
    revisoes: [],
    eventos: [
      { tipo: 'criado', em: '2026-09-25T19:20:00.000Z', motivo: null },
      { tipo: 'iniciado', em: '2026-09-27T11:00:00.000Z', motivo: null },
      { tipo: 'enviado', em: '2026-09-27T13:30:00.000Z', motivo: null },
    ],
    ...dados,
  }
}

export function contagem(dados: Partial<ContagemAcionamentos> = {}): ContagemAcionamentos {
  return { aberto: 7, em_andamento: 1, aguardando: 3, reprovado: 2, aprovado: 57, ...dados }
}

export const TIPOS: TipoDemanda[] = [
  {
    id: 't1',
    nome: 'Vazamento',
    cor: '#0069BD',
    checklist: [
      'Localizar ponto do vazamento',
      'Fechar registro e isolar a área',
      'Substituir conexão ou vedação',
      'Testar com registro aberto',
      'Limpar área de trabalho',
    ],
  },
  {
    id: 't2',
    nome: 'Revisão elétrica',
    cor: '#FC7608',
    checklist: ['Inspecionar quadro de distribuição', 'Medir tensão das tomadas'],
  },
  {
    id: 't6',
    nome: 'Reparo em gesso',
    cor: '#E0A100',
    checklist: [
      'Remover parte danificada',
      'Aplicar placa ou massa nova',
      'Lixar e nivelar',
      'Retocar pintura',
    ],
  },
  { id: 't9', nome: 'Vistoria', cor: '#5D627D', checklist: ['Fotografar a fachada'] },
]

export const PRESTADORES: PrestadorOpcao[] = [
  { id: 'p2', nome: 'Ana Ribeiro', regiao: 'Zona Sul', cor: '#FC7608' },
  { id: 'p1', nome: 'Carlos Mendes', regiao: 'Zona Oeste', cor: '#0069BD' },
  { id: 'p7', nome: 'Pedro Lima', regiao: null, cor: '#5D627D' },
]
```

- [ ] **Step 2: Testes (falham)**

`apps/gestor/src/erros.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ErroApi, exigir, MENSAGEM_FALHA, mensagemDeErro } from './erros'

const resposta = (status: number) => ({ status }) as Response

describe('exigir', () => {
  it('devolve os dados da resposta', async () => {
    await expect(exigir(Promise.resolve({ data: { ok: 1 }, response: resposta(200) }))).resolves.toEqual({
      ok: 1,
    })
  })
  it('lança ErroApi com o código e a mensagem da API', async () => {
    const pedido = Promise.resolve({
      error: { erro: { codigo: 'motivo_obrigatorio', mensagem: 'Escreva o motivo da reprovação' } },
      response: resposta(422),
    })
    await expect(exigir(pedido)).rejects.toMatchObject({
      name: 'ErroApi',
      codigo: 'motivo_obrigatorio',
      status: 422,
      message: 'Escreva o motivo da reprovação',
    })
  })
  it('sem corpo de erro, usa a mensagem padrão', async () => {
    await expect(exigir(Promise.resolve({ error: 'x', response: resposta(502) }))).rejects.toMatchObject({
      message: MENSAGEM_FALHA,
      status: 502,
    })
  })
})

describe('mensagemDeErro', () => {
  it('usa a mensagem da API ou a padrão (falha de rede)', () => {
    expect(mensagemDeErro(new ErroApi('Tipo de demanda inválido', 'tipo_invalido', 422))).toBe(
      'Tipo de demanda inválido',
    )
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toBe(MENSAGEM_FALHA)
  })
})
```

`apps/gestor/src/acionamentos/dados.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { aguardar, criarClienteDeTeste } from '../../test/montar'
import { simularApi } from '../../test/api-falsa'
import { contagem, detalhe, resumo } from '../../test/fixtures'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { usarContagem, usarCriarAcionamento, usarLista, usarRevisao } from './dados'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))

function montarComposables() {
  let expostos!: {
    revisar: ReturnType<typeof usarRevisao>
    criar: ReturnType<typeof usarCriarAcionamento>
  }
  const Teste = defineComponent({
    setup() {
      usarContagem()
      usarLista('aguardando')
      expostos = { revisar: usarRevisao('a1059'), criar: usarCriarAcionamento() }
      return () => h('div')
    },
  })
  const consultas = criarClienteDeTeste()
  mount(Teste, { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } })
  return { expostos: () => expostos, consultas }
}

describe('composables de acionamentos', () => {
  let simulada: ReturnType<typeof simularApi>
  beforeEach(() => {
    simulada = simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/acionamentos': [resumo()],
      'POST /api/acionamentos/{id}/revisao': detalhe({ status: 'aprovado' }),
      'POST /api/acionamentos': resumo({ id: 'a2000' }),
    })
  })

  it('a lista manda o status do filtro e omite a busca vazia', async () => {
    montarComposables()
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos')[0]!.params!.query).toEqual({
      status: 'aguardando',
      busca: undefined,
    })
  })

  it('depois de revisar, grava o detalhe e recarrega contagem e lista', async () => {
    const { expostos, consultas } = montarComposables()
    await aguardar()
    await expostos().revisar.mutateAsync({ decisao: 'aprovado' })
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]).toMatchObject({
      params: { path: { id: 'a1059' } },
      body: { decisao: 'aprovado' },
    })
    expect(consultas.getQueryData(CHAVES.detalhe('a1059'))).toMatchObject({ status: 'aprovado' })
    expect(simulada.chamadas('GET', '/api/acionamentos/contagem')).toHaveLength(2)
    expect(simulada.chamadas('GET', '/api/acionamentos')).toHaveLength(2)
  })

  it('depois de criar, recarrega contagem e lista', async () => {
    const { expostos } = montarComposables()
    await aguardar()
    await expostos().criar.mutateAsync({
      titulo: 'T',
      cliente: 'C',
      endereco: 'E',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos/contagem')).toHaveLength(2)
  })
})
```

`apps/gestor/src/layouts/LayoutGestor.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { contagem } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { toastGestor } from '../toast'
import LayoutGestor from './LayoutGestor.vue'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))
vi.mock('../sessao', () => ({ sessao: { usuario: { nome: 'Renata Silva' } }, sair: vi.fn() }))

describe('LayoutGestor', () => {
  let aguardando: number
  beforeEach(() => {
    aguardando = 3
    simularApi(api, { 'GET /api/acionamentos/contagem': () => ({ data: contagem({ aguardando }) }) })
  })

  it('o badge de Aprovações vem da contagem e se atualiza quando ela é invalidada', async () => {
    const { tela, consultas } = await montar(LayoutGestor, { rota: '/painel' })
    expect(tela.find('.badge').text()).toBe('3')
    aguardando = 2
    await consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    await aguardar()
    expect(tela.find('.badge').text()).toBe('2')
  })

  it('mostra o aviso do gestor', async () => {
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    toastGestor.mostrar('Conclusão aprovada')
    await aguardar()
    expect(tela.find('[role="status"]').text()).toBe('Conclusão aprovada')
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/erros.test.ts src/acionamentos/dados.test.ts src/layouts/LayoutGestor.test.ts`
Expected: FAIL ("Failed to resolve import './erros'", "./dados", "../toast").

- [ ] **Step 3: Implementação**

`apps/gestor/src/api.ts`:
```ts
import { criarClienteApi } from '@kgb/api-client'
import { criarClienteAuth } from '@kgb/api-client/auth'

/** Origem da API. Vazio em dev (proxy do Vite): usa a própria origem do app. */
export const BASE_API = import.meta.env.VITE_API_URL || window.location.origin

export const api = criarClienteApi({ baseUrl: BASE_API })
export const auth = criarClienteAuth({ baseURL: BASE_API })
```

`apps/gestor/src/erros.ts`:
```ts
export const MENSAGEM_FALHA = 'Não foi possível falar com o servidor. Tente de novo.'

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly codigo: string,
    readonly status: number,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

interface RespostaApi {
  data?: unknown
  error?: unknown
  response: { status: number }
}

/** Devolve o `data` de uma resposta do openapi-fetch, ou lança `ErroApi` com a mensagem da API. */
export async function exigir<R extends RespostaApi>(
  pedido: Promise<R>,
): Promise<NonNullable<R['data']>> {
  const { data, error, response } = await pedido
  if (error === undefined && data !== undefined && data !== null) {
    return data as NonNullable<R['data']>
  }
  const corpo = error as { erro?: { codigo?: string; mensagem?: string } } | undefined
  throw new ErroApi(
    corpo?.erro?.mensagem ?? MENSAGEM_FALHA,
    corpo?.erro?.codigo ?? 'desconhecido',
    response.status,
  )
}

/** Texto para o toast: a mensagem da API ou, em falha de rede, a mensagem padrão. */
export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : MENSAGEM_FALHA
}
```

`apps/gestor/src/consultas.ts`:
```ts
import { QueryClient } from '@tanstack/vue-query'
import type { FiltroLista } from './acionamentos/filtros'

export function criarClienteConsultas(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5_000 } } })
}

/**
 * Chaves das consultas. Tudo que depende de acionamentos começa com 'acionamentos', e as mutações
 * invalidam esse prefixo: lista, contagem (badge) e detalhe se atualizam juntos.
 */
export const CHAVES = {
  acionamentos: ['acionamentos'] as const,
  lista: (filtro: FiltroLista, busca: string) => ['acionamentos', 'lista', filtro, busca] as const,
  contagem: ['acionamentos', 'contagem'] as const,
  detalhe: (id: string) => ['acionamentos', 'detalhe', id] as const,
  tipos: ['tipos'] as const,
  prestadoresAtivos: ['prestadores', 'ativos'] as const,
}
```

`apps/gestor/src/toast.ts`:
```ts
import { usarToast } from '@kgb/ui'

/** O aviso do gestor: um por vez, mostrado pelo layout na coluna de conteúdo (como no protótipo). */
export const toastGestor = usarToast()
```

`apps/gestor/src/acionamentos/filtros.ts` (Task 1: só o tipo e `statusDaConsulta`):
```ts
export type FiltroLista =
  | 'todos'
  | 'aberto'
  | 'em_andamento'
  | 'aguardando'
  | 'reprovado'
  | 'finalizados'

export type StatusConsulta = Exclude<FiltroLista, 'todos'>

/** O filtro vira o parâmetro `status` da API ("Todos" não filtra). */
export function statusDaConsulta(filtro: FiltroLista): StatusConsulta | undefined {
  return filtro === 'todos' ? undefined : filtro
}
```

`apps/gestor/src/acionamentos/dados.ts`:
```ts
import type { components } from '@kgb/api-client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { exigir } from '../erros'
import { statusDaConsulta, type FiltroLista } from './filtros'

export type NovoAcionamento = components['schemas']['NovoAcionamento']
export type NovaRevisao = components['schemas']['NovaRevisao']

export function usarContagem() {
  return useQuery({
    queryKey: CHAVES.contagem,
    queryFn: ({ signal }) => exigir(api.GET('/api/acionamentos/contagem', { signal })),
  })
}

export function usarLista(
  filtro: MaybeRefOrGetter<FiltroLista>,
  busca: MaybeRefOrGetter<string> = '',
) {
  return useQuery({
    queryKey: computed(() => CHAVES.lista(toValue(filtro), toValue(busca))),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        api.GET('/api/acionamentos', {
          params: { query: { status: statusDaConsulta(queryKey[2]), busca: queryKey[3] || undefined } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function usarDetalhe(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => CHAVES.detalhe(toValue(id))),
    queryFn: ({ queryKey, signal }) =>
      exigir(api.GET('/api/acionamentos/{id}', { params: { path: { id: queryKey[2] } }, signal })),
  })
}

export function usarTipos() {
  return useQuery({
    queryKey: CHAVES.tipos,
    queryFn: ({ signal }) => exigir(api.GET('/api/tipos', { signal })),
    staleTime: 60_000,
  })
}

export function usarPrestadoresAtivos() {
  return useQuery({
    queryKey: CHAVES.prestadoresAtivos,
    queryFn: ({ signal }) =>
      exigir(api.GET('/api/prestadores', { params: { query: { status: 'ativo' } }, signal })),
    staleTime: 60_000,
  })
}

export function usarCriarAcionamento() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (corpo: NovoAcionamento) => exigir(api.POST('/api/acionamentos', { body: corpo })),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    },
  })
}

export function usarRevisao(id: MaybeRefOrGetter<string>) {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (corpo: NovaRevisao) =>
      exigir(
        api.POST('/api/acionamentos/{id}/revisao', {
          params: { path: { id: toValue(id) } },
          body: corpo,
        }),
      ),
    onSuccess: (detalhe) => {
      consultas.setQueryData(CHAVES.detalhe(detalhe.id), detalhe)
    },
    // Com sucesso ou erro (ex.: 409, outra pessoa já decidiu), tudo volta a refletir a API.
    onSettled: () => {
      void consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    },
  })
}
```

`apps/gestor/src/main.ts`:
```ts
import 'vuetify/styles'
import '@kgb/ui/estilos.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { criarClienteConsultas } from './consultas'
import { vuetify } from './plugins/vuetify'
import { router } from './router'

createApp(App)
  .use(vuetify)
  .use(router)
  .use(VueQueryPlugin, { queryClient: criarClienteConsultas() })
  .mount('#app')
```

`apps/gestor/src/layouts/LayoutGestor.vue`:
```vue
<script setup lang="ts">
import { AvisoToast } from '@kgb/ui'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { usarContagem } from '../acionamentos/dados'
import NavInferior from '../componentes/NavInferior.vue'
import NavLateral from '../componentes/NavLateral.vue'
import { ITENS_NAVEGACAO } from '../navegacao'
import { sair, sessao } from '../sessao'
import { toastGestor } from '../toast'

const { mdAndUp } = useDisplay()
const rota = useRoute()
const router = useRouter()
const consultas = useQueryClient()
const { data: contagem, refetch } = usarContagem()
const aprovacoes = computed(() => contagem.value?.aguardando ?? 0)
const { mensagem } = toastGestor
const conteudo = ref<HTMLElement>()

// A fila muda também pelas ações do prestador: o badge se atualiza a cada troca de tela.
watch(
  () => rota.name,
  () => void refetch(),
)
// A área de conteúdo é a mesma entre as telas: cada tela nova começa no topo.
watch(
  () => rota.path,
  () => {
    if (conteudo.value) conteudo.value.scrollTop = 0
  },
)

async function encerrarSessao() {
  await sair()
  consultas.clear()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="layout" :class="{ compacto: !mdAndUp }">
    <NavLateral
      v-if="mdAndUp"
      :itens="ITENS_NAVEGACAO"
      :aprovacoes="aprovacoes"
      :usuario="sessao.usuario?.nome ?? ''"
      @sair="encerrarSessao"
    />
    <div class="coluna">
      <main ref="conteudo" class="conteudo"><RouterView /></main>
      <NavInferior v-if="!mdAndUp" :itens="ITENS_NAVEGACAO" :aprovacoes="aprovacoes" />
      <AvisoToast :mensagem="mensagem" variante="gestor" />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100dvh;
  background: var(--kgb-superficie1);
  overflow: hidden;
}
.coluna {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.conteudo {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px 32px 40px;
}
.compacto .conteudo {
  padding: 16px 16px 24px;
}
</style>
```

- [ ] **Step 4: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test`
Expected: PASS (os 26 anteriores + os novos).

- [ ] **Step 5: Commit**

```bash
git add apps/gestor
git commit -m "feat(gestor): vue-query, erros da API, toast e badge por consulta"
```

---

### Task 2: Rotas do fluxo (Detalhe por origem) e largura do Detalhe

**Files:**
- Modify: `apps/gestor/src/router.ts`, `apps/gestor/src/componentes/PaginaGestor.vue`, `apps/gestor/src/componentes/NavLateral.test.ts`
- Create: `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue` (esqueleto; completo na Task 5), `apps/gestor/src/acionamentos/PaginaAcionamentos.vue` e `apps/gestor/src/aprovacoes/PaginaAprovacoes.vue` (movidos de `src/paginas/`, ainda "Em construção")
- Delete: `apps/gestor/src/paginas/PaginaAcionamentos.vue`, `apps/gestor/src/paginas/PaginaAprovacoes.vue`
- Test: `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.test.ts` (substituído na Task 5), `apps/gestor/src/componentes/NavLateral.test.ts`

**Interfaces:**
- Produces: rotas nomeadas `acionamentos`, `acionamento` (`/acionamentos/:id`), `aprovacoes`, `aprovacao` (`/aprovacoes/:id`). `PaginaDetalhe` recebe `props: { id: string; origem: 'acionamentos' | 'aprovacoes' }`. `PaginaGestor` aceita `largura: 1080 | 1180 | 1280`.

- [ ] **Step 1: Testes (falham)**

Acrescentar em `apps/gestor/src/componentes/NavLateral.test.ts` (no topo, junto dos imports, e um `describe` novo no fim):
```ts
import { vi } from 'vitest'
import { rotas } from '../router'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
  BASE_API: 'http://api.test',
}))

describe('Detalhe aberto a partir de uma lista', () => {
  async function navegarPara(caminho: string) {
    const router = createRouter({ history: createMemoryHistory(), routes: rotas })
    await router.push(caminho)
    return mount(NavLateral, {
      props: { itens: ITENS_NAVEGACAO, aprovacoes: 0, usuario: 'Renata Silva' },
      global: { plugins: [router] },
    })
  }
  it('pela fila, destaca Aprovações', async () => {
    expect((await navegarPara('/aprovacoes/a1')).find('.ativo .rotulo').text()).toBe('Aprovações')
  })
  it('pela lista, destaca Acionamentos', async () => {
    expect((await navegarPara('/acionamentos/a1')).find('.ativo .rotulo').text()).toBe(
      'Acionamentos',
    )
  })
})
```

`apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.test.ts` (versão da Task 2):
```ts
import { describe, expect, it } from 'vitest'
import { montar } from '../../../test/montar'
import PaginaDetalhe from './PaginaDetalhe.vue'

describe('PaginaDetalhe (voltar)', () => {
  it('volta para Acionamentos quando veio da lista', async () => {
    const { tela } = await montar(PaginaDetalhe, { props: { id: 'a1', origem: 'acionamentos' } })
    const voltar = tela.find('a.voltar')
    expect(voltar.text()).toBe('Acionamentos')
    expect(voltar.attributes('href')).toBe('/acionamentos')
  })
  it('volta para Aprovações quando veio da fila', async () => {
    const { tela } = await montar(PaginaDetalhe, { props: { id: 'a1', origem: 'aprovacoes' } })
    expect(tela.find('a.voltar').text()).toBe('Aprovações')
    expect(tela.find('a.voltar').attributes('href')).toBe('/aprovacoes')
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/componentes/NavLateral.test.ts src/acionamentos/detalhe`
Expected: FAIL (a rota `/aprovacoes/a1` não existe; `./PaginaDetalhe.vue` não existe).

- [ ] **Step 2: Implementação**

Em `apps/gestor/src/router.ts`, trocar as rotas `acionamentos` e `aprovacoes` por rotas com filhas:
```ts
      {
        path: 'acionamentos',
        children: [
          {
            path: '',
            name: 'acionamentos',
            component: () => import('./acionamentos/PaginaAcionamentos.vue'),
          },
          {
            path: ':id',
            name: 'acionamento',
            component: () => import('./acionamentos/detalhe/PaginaDetalhe.vue'),
            props: (r) => ({ id: String(r.params.id), origem: 'acionamentos' }),
          },
        ],
      },
      {
        path: 'aprovacoes',
        children: [
          {
            path: '',
            name: 'aprovacoes',
            component: () => import('./aprovacoes/PaginaAprovacoes.vue'),
          },
          {
            path: ':id',
            name: 'aprovacao',
            component: () => import('./acionamentos/detalhe/PaginaDetalhe.vue'),
            props: (r) => ({ id: String(r.params.id), origem: 'aprovacoes' }),
          },
        ],
      },
```

`git mv apps/gestor/src/paginas/PaginaAcionamentos.vue apps/gestor/src/acionamentos/PaginaAcionamentos.vue` e `git mv apps/gestor/src/paginas/PaginaAprovacoes.vue apps/gestor/src/aprovacoes/PaginaAprovacoes.vue`, trocando nos dois os imports `../componentes/…` (continuam `../componentes/…`, mesma profundidade).

`apps/gestor/src/componentes/PaginaGestor.vue`: `largura?: 1080 | 1180 | 1280`.

`apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue` (esqueleto da Task 2):
```vue
<script setup lang="ts">
import { EmConstrucao, RussoIcone } from '@kgb/ui'
import { computed } from 'vue'
import PaginaGestor from '../../componentes/PaginaGestor.vue'

const props = defineProps<{ id: string; origem: 'acionamentos' | 'aprovacoes' }>()
const voltar = computed(() =>
  props.origem === 'aprovacoes'
    ? { rota: 'aprovacoes', rotulo: 'Aprovações' }
    : { rota: 'acionamentos', rotulo: 'Acionamentos' },
)
</script>

<template>
  <PaginaGestor :largura="1180">
    <RouterLink :to="{ name: voltar.rota }" class="voltar">
      <RussoIcone nome="chevron-right" :tamanho="18" class="seta" />{{ voltar.rotulo }}
    </RouterLink>
    <EmConstrucao />
  </PaginaGestor>
</template>

<style scoped>
.voltar {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.voltar:hover {
  color: var(--kgb-secundario);
}
.seta {
  transform: rotate(180deg);
  color: var(--kgb-tinta);
}
</style>
```

- [ ] **Step 3: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test && pnpm --filter @kgb/gestor typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A apps/gestor
git commit -m "feat(gestor): rotas do Detalhe por origem e pastas por funcionalidade"
```

---

### Task 3: Lista de Acionamentos

**Files:**
- Modify: `apps/gestor/src/acionamentos/filtros.ts`, `apps/gestor/src/acionamentos/PaginaAcionamentos.vue`, `tools/visual/casos-gestor.ts`
- Create: `apps/gestor/src/acionamentos/{estadoLista.ts,apresentacao.ts,LinhaAcionamento.vue}`, `apps/gestor/src/acionamentos/novo/{estado.ts,BotaoNovoAcionamento.vue}`
- Test: `apps/gestor/src/acionamentos/filtros.test.ts`, `apps/gestor/src/acionamentos/PaginaAcionamentos.test.ts`

**Interfaces:**
- Consumes: `usarContagem`, `usarLista`, `FiltroLista`, `statusDaConsulta` (Task 1); rota `acionamento` (Task 2).
- Produces:
  - `FILTROS: readonly { id: FiltroLista; rotulo: string }[]`, `contagemDoFiltro(c?, f): number | null`.
  - `estadoLista: { filtro: FiltroLista; busca: string }` (reativo), `reiniciarLista()`.
  - `rotuloTipos(tipos: readonly { nome: string }[]): string`.
  - `novoAcionamento: { aberto: Readonly<Ref<boolean>>; abrir(); fechar() }`, `<BotaoNovoAcionamento />`.

Medidas (protótipo, linhas 152–185):
- Página: `max-width 1280`, coluna com `gap 16`.
- Cabeçalho: título 24/36 700 `#2C3143` (`flex:1; min-width:180px`); botão 44px, `padding 0 18px`, raio 16, `#0069BD`, 14/600 branco, hover `#005AA3`.
- Busca: 48px, `padding 0 16px`, raio 16, fundo branco, `gap 10`; ícone 18px com opacidade .55; input 14px (peso 400), sem borda e sem contorno.
- Chips: 34px, `padding 0 14px`, pill, 13/600, `gap 6`; ativo `#262A3B`/branco, inativo branco/`#363853`; contagem com opacidade .6; `gap 8` entre chips.
- Tabela: fundo branco, raio 16, `overflow hidden`. Linha: `flex-wrap`, `gap 8px 16px`, `padding 14px 20px`, borda inferior `#E5E5E5`, hover `#F9F9F9`.
  - Colunas: `3 1 240px` (título 14/600 `#2C3143`; "código · cliente" 12 `#8F8D8D`); `2 1 160px` (tipos 13 `#363853`); `1.4 1 130px` (avatar 26, fonte 10/700, nome 13 `#363853` com reticências); `1 1 100px` (data 13/600 `#363853`, horário 12 `#8F8D8D`); `1 1 90px` (texto 12 `#50555C` + barra 6px, `gap 4`); `1.3 1 150px` (chip 12/600, `padding 4px 10px`, à direita).

- [ ] **Step 1: Testes (falham)**

`apps/gestor/src/acionamentos/filtros.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { contagem } from '../../test/fixtures'
import { contagemDoFiltro, FILTROS, statusDaConsulta } from './filtros'

describe('filtros da lista', () => {
  it('seguem a ordem e os rótulos do protótipo', () => {
    expect(FILTROS.map((f) => f.rotulo)).toEqual([
      'Todos',
      'Agendados',
      'Em execução',
      'Aguardando',
      'Reprovados',
      'Finalizados',
    ])
  })
  it('contam cada status; Todos soma tudo e Finalizados são os aprovados', () => {
    const c = contagem()
    expect(FILTROS.map((f) => contagemDoFiltro(c, f.id))).toEqual([70, 7, 1, 3, 2, 57])
  })
  it('sem contagem carregada, não mostram número', () => {
    expect(contagemDoFiltro(undefined, 'todos')).toBeNull()
  })
  it('viram o status da consulta (Todos não filtra)', () => {
    expect(statusDaConsulta('todos')).toBeUndefined()
    expect(statusDaConsulta('finalizados')).toBe('finalizados')
    expect(statusDaConsulta('em_andamento')).toBe('em_andamento')
  })
})
```

`apps/gestor/src/acionamentos/PaginaAcionamentos.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { contagem, resumo } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { api } from '../api'
import { estadoLista, reiniciarLista } from './estadoLista'
import { novoAcionamento } from './novo/estado'
import PaginaAcionamentos from './PaginaAcionamentos.vue'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))

describe('PaginaAcionamentos', () => {
  let simulada: ReturnType<typeof simularApi>
  let lista: ReturnType<typeof resumo>[]
  beforeEach(() => {
    reiniciarLista()
    novoAcionamento.fechar()
    lista = [
      resumo(),
      resumo({ id: 'a1061', codigo: 'AC-1061', titulo: 'Reparo em gesso no quarto', status: 'reprovado' }),
    ]
    simulada = simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/acionamentos': () => ({ data: lista }),
    })
  })

  const ultimaConsulta = () => simulada.chamadas('GET', '/api/acionamentos').at(-1)!.params!.query

  it('mostra os filtros com a contagem de cada status e "Todos" ativo', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const filtros = tela.findAll('.filtro')
    expect(filtros.map((f) => [f.text().replace(/\d+$/, ''), f.find('.n').text()])).toEqual([
      ['Todos', '70'],
      ['Agendados', '7'],
      ['Em execução', '1'],
      ['Aguardando', '3'],
      ['Reprovados', '2'],
      ['Finalizados', '57'],
    ])
    expect(tela.find('.filtro.ativo').text()).toBe('Todos70')
    expect(tela.find('.filtro.ativo').attributes('aria-pressed')).toBe('true')
  })

  it('mostra cada linha como no protótipo e abre o Detalhe', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const linha = tela.findAll('a.linha')[0]!
    expect(linha.find('.titulo').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(linha.find('.sub').text()).toBe('AC-1059 · Colégio Aprender')
    expect(linha.find('.tipos').text()).toBe('Revisão elétrica + Troca de disjuntor')
    expect(linha.find('.prestador').text()).toBe('CMCarlos Mendes')
    expect(linha.find('.data').text()).toBe('27/09/2026')
    expect(linha.find('.horario').text()).toBe('08:00–11:00')
    expect(linha.find('.etapas').text()).toBe('7/10 etapas')
    expect(linha.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('70')
    expect(linha.find('.status').text()).toBe('Aguardando aprovação')
    expect(linha.attributes('href')).toBe('/acionamentos/a1059')
  })

  it('ao escolher um filtro, consulta só aquele status e o guarda', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    expect(ultimaConsulta()).toEqual({ status: undefined, busca: undefined })
    await tela.findAll('.filtro')[5]!.trigger('click')
    await aguardar()
    expect(ultimaConsulta()).toEqual({ status: 'finalizados', busca: undefined })
    expect(estadoLista.filtro).toBe('finalizados')
    expect(tela.find('.filtro.ativo').text()).toBe('Finalizados57')
  })

  it('busca uma vez só, com o termo aparado, depois que a digitação para', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const antes = simulada.chamadas('GET', '/api/acionamentos').length
    const campo = tela.find('input')
    await campo.setValue('vaz')
    await campo.setValue('  vazamento ')
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos')).toHaveLength(antes)
    await new Promise((pronto) => setTimeout(pronto, 350))
    await aguardar()
    const novas = simulada.chamadas('GET', '/api/acionamentos').slice(antes)
    expect(novas.map((c) => c.params!.query!.busca)).toEqual(['vazamento'])
  })

  it('lista vazia mostra o aviso', async () => {
    lista = []
    const { tela } = await montar(PaginaAcionamentos)
    expect(tela.find('.aviso').text()).toBe('Nenhum acionamento encontrado.')
  })

  it('"Novo acionamento" abre o modal', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    await tela.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos`
Expected: FAIL (`FILTROS`/`contagemDoFiltro` não exportados, `./estadoLista` e `./novo/estado` não existem).

- [ ] **Step 2: Implementação**

Acrescentar em `apps/gestor/src/acionamentos/filtros.ts`:
```ts
import type { ContagemAcionamentos } from '@kgb/api-client'

export const FILTROS: readonly { id: FiltroLista; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'aberto', rotulo: 'Agendados' },
  { id: 'em_andamento', rotulo: 'Em execução' },
  { id: 'aguardando', rotulo: 'Aguardando' },
  { id: 'reprovado', rotulo: 'Reprovados' },
  { id: 'finalizados', rotulo: 'Finalizados' },
]

/** Número do chip. "Todos" soma todos os status; "Finalizados" são os aprovados (inviáveis inclusive). */
export function contagemDoFiltro(
  c: ContagemAcionamentos | undefined,
  filtro: FiltroLista,
): number | null {
  if (!c) return null
  if (filtro === 'todos') return c.aberto + c.em_andamento + c.aguardando + c.reprovado + c.aprovado
  if (filtro === 'finalizados') return c.aprovado
  return c[filtro]
}
```

`apps/gestor/src/acionamentos/estadoLista.ts`:
```ts
import { reactive } from 'vue'
import type { FiltroLista } from './filtros'

/**
 * Filtro e busca da lista, guardados enquanto o app está aberto: voltar do Detalhe mantém o filtro,
 * como no protótipo. Criar um acionamento volta para "Todos" sem busca.
 */
export const estadoLista = reactive<{ filtro: FiltroLista; busca: string }>({
  filtro: 'todos',
  busca: '',
})

export function reiniciarLista(): void {
  estadoLista.filtro = 'todos'
  estadoLista.busca = ''
}
```

`apps/gestor/src/acionamentos/apresentacao.ts`:
```ts
/** "Revisão elétrica + Troca de disjuntor". */
export function rotuloTipos(tipos: readonly { nome: string }[]): string {
  return tipos.map((t) => t.nome).join(' + ')
}
```

`apps/gestor/src/acionamentos/novo/estado.ts`:
```ts
import { readonly, ref } from 'vue'

const aberto = ref(false)

/** O modal Novo acionamento é um só: abre pela lista ou pelo Painel e é mostrado pelo layout. */
export const novoAcionamento = {
  aberto: readonly(aberto),
  abrir(): void {
    aberto.value = true
  },
  fechar(): void {
    aberto.value = false
  },
}
```

`apps/gestor/src/acionamentos/novo/BotaoNovoAcionamento.vue`:
```vue
<script setup lang="ts">
import { novoAcionamento } from './estado'
</script>

<template>
  <button type="button" class="novo" @click="novoAcionamento.abrir()">Novo acionamento</button>
</template>

<style scoped>
.novo {
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  background: var(--kgb-primaria);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.novo:hover {
  background: var(--kgb-primaria-hover);
}
</style>
```

`apps/gestor/src/acionamentos/LinhaAcionamento.vue`:
```vue
<script setup lang="ts">
import type { ResumoAcionamento } from '@kgb/api-client'
import { AvatarIniciais, BarraProgresso, dataBR, intervalo, progresso, StatusChip } from '@kgb/ui'
import { computed } from 'vue'
import { rotuloTipos } from './apresentacao'

const props = defineProps<{ acionamento: ResumoAcionamento }>()
const etapas = computed(() => progresso(props.acionamento.etapas))
</script>

<template>
  <RouterLink :to="{ name: 'acionamento', params: { id: acionamento.id } }" class="linha">
    <div class="principal">
      <div class="titulo">{{ acionamento.titulo }}</div>
      <div class="sub">{{ acionamento.codigo }} · {{ acionamento.cliente }}</div>
    </div>
    <div class="tipos">{{ rotuloTipos(acionamento.tipos) }}</div>
    <div class="prestador">
      <AvatarIniciais
        :nome="acionamento.prestador.nome"
        :tamanho="26"
        :cor="acionamento.prestador.cor"
        :tamanho-fonte="10"
      />
      <span class="nome">{{ acionamento.prestador.nome }}</span>
    </div>
    <div class="quando">
      <div class="data">{{ dataBR(acionamento.data) }}</div>
      <div class="horario">{{ intervalo(acionamento.inicio, acionamento.fim) }}</div>
    </div>
    <div class="progresso">
      <div class="etapas">{{ etapas.texto }} etapas</div>
      <BarraProgresso :percentual="etapas.percentual" />
    </div>
    <div class="status">
      <StatusChip :status="acionamento.status" :inviavel="acionamento.inviavel" class="chip" />
    </div>
  </RouterLink>
</template>

<style scoped>
.linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--kgb-divisor);
  color: var(--kgb-tinta);
  cursor: pointer;
}
.linha:hover {
  background: var(--kgb-superficie1);
  color: var(--kgb-tinta);
}
.principal {
  flex: 3 1 240px;
  min-width: 0;
}
.titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.sub {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.tipos {
  flex: 2 1 160px;
  min-width: 0;
  font-size: 13px;
  color: var(--kgb-texto);
}
.prestador {
  flex: 1.4 1 130px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.nome {
  font-size: 13px;
  color: var(--kgb-texto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quando {
  flex: 1 1 100px;
  font-size: 13px;
  color: var(--kgb-texto);
}
.data {
  font-weight: 600;
}
.horario {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.progresso {
  flex: 1 1 90px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.etapas {
  font-size: 12px;
  color: var(--kgb-secundario);
}
.status {
  flex: 1.3 1 150px;
  display: flex;
  justify-content: flex-end;
}
/* O chip da lista tem 4px de padding vertical (o tamanho "m" do StatusChip tem 3px). */
.status .chip {
  padding: 4px 10px;
}
</style>
```

`apps/gestor/src/acionamentos/PaginaAcionamentos.vue`:
```vue
<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import { onBeforeUnmount, ref, watch } from 'vue'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { mensagemDeErro } from '../erros'
import { usarContagem, usarLista } from './dados'
import { estadoLista } from './estadoLista'
import { contagemDoFiltro, FILTROS } from './filtros'
import LinhaAcionamento from './LinhaAcionamento.vue'
import BotaoNovoAcionamento from './novo/BotaoNovoAcionamento.vue'

/** Espera depois da última tecla antes de consultar a API. */
const ESPERA_BUSCA = 300

const texto = ref(estadoLista.busca)
let temporizador: ReturnType<typeof setTimeout> | undefined
watch(texto, (valor) => {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    estadoLista.busca = valor.trim()
  }, ESPERA_BUSCA)
})
// Criar um acionamento limpa a busca: o campo acompanha.
watch(
  () => estadoLista.busca,
  (busca) => {
    if (busca !== texto.value.trim()) texto.value = busca
  },
)
onBeforeUnmount(() => clearTimeout(temporizador))

const { data: contagem } = usarContagem()
const {
  data: acionamentos,
  isSuccess,
  isError,
  error,
} = usarLista(
  () => estadoLista.filtro,
  () => estadoLista.busca,
)
</script>

<template>
  <PaginaGestor :largura="1280">
    <CabecalhoPagina titulo="Acionamentos" :altura-minima="44">
      <template #acoes><BotaoNovoAcionamento /></template>
    </CabecalhoPagina>
    <label class="busca">
      <RussoIcone nome="search" :tamanho="18" class="lupa" />
      <input
        v-model="texto"
        class="campo"
        placeholder="Buscar por título, cliente, código ou prestador"
        aria-label="Buscar acionamentos"
      />
    </label>
    <div class="filtros" role="group" aria-label="Filtrar por status">
      <button
        v-for="f in FILTROS"
        :key="f.id"
        type="button"
        class="filtro"
        :class="{ ativo: estadoLista.filtro === f.id }"
        :aria-pressed="estadoLista.filtro === f.id"
        @click="estadoLista.filtro = f.id"
      >
        {{ f.rotulo }}<span class="n">{{ contagemDoFiltro(contagem, f.id) ?? '' }}</span>
      </button>
    </div>
    <div class="tabela">
      <LinhaAcionamento v-for="a in acionamentos ?? []" :key="a.id" :acionamento="a" />
      <div v-if="isError" class="aviso">{{ mensagemDeErro(error) }}</div>
      <div v-else-if="isSuccess && !acionamentos?.length" class="aviso">
        Nenhum acionamento encontrado.
      </div>
    </div>
  </PaginaGestor>
</template>

<style scoped>
.busca {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 16px;
  background: var(--kgb-branco);
  border-radius: 16px;
  cursor: text;
}
.lupa {
  opacity: 0.55;
  color: var(--kgb-tinta);
}
.campo {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 14px;
  font-weight: 400;
  background: transparent;
}
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filtro {
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--kgb-branco);
  color: var(--kgb-texto);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.filtro.ativo {
  background: var(--kgb-tinta);
  color: #fff;
}
.n {
  opacity: 0.6;
}
.tabela {
  background: var(--kgb-branco);
  border-radius: 16px;
  overflow: hidden;
}
.aviso {
  padding: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
</style>
```

Em `tools/visual/casos-gestor.ts`: importar `telaInteira` de `./tipos`, criar `const telaWeb = telaInteira('gw')` e `const telaMobile = telaInteira('gm')`, trocar as regiões de `gestor-web-acionamentos` por `[telaWeb]` e acrescentar:
```ts
  {
    nome: 'gestor-web-acionamentos-aguardando',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando 3' }],
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-mobile-acionamentos',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    regioes: [telaMobile],
  },
  {
    nome: 'gestor-mobile-acionamentos-aguardando',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando 3' }],
    regioes: [telaMobile],
  },
```

- [ ] **Step 3: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test && pnpm --filter @kgb/gestor typecheck`
Expected: PASS.

- [ ] **Step 4: Comparar com o protótipo e ajustar o CSS**

Run: `pnpm db:seed && URL_GESTOR=http://localhost:5175 pnpm visual -- --app=gestor --caso=<nome>` para cada caso de lista.
Expected: ✓ em todas as regiões. Se falhar, abrir `tools/visual/.saida/<caso>--tela--diff.png` com Read, achar o elemento e corrigir o CSS (nunca a região).

- [ ] **Step 5: Commit**

```bash
git add apps/gestor tools/visual/casos-gestor.ts
git commit -m "feat(gestor): lista de acionamentos com busca e filtros"
```

---

### Task 4: Aprovações

**Files:**
- Create: `apps/gestor/src/aprovacoes/fila.ts`
- Modify: `apps/gestor/src/aprovacoes/PaginaAprovacoes.vue`, `tools/visual/casos-gestor.ts`
- Test: `apps/gestor/src/aprovacoes/fila.test.ts`, `apps/gestor/src/aprovacoes/PaginaAprovacoes.test.ts`

**Interfaces:**
- Consumes: `usarLista('aguardando')`, `rotuloTipos`, rota `aprovacao`.
- Produces: `ordenarFila(lista): ResumoAcionamento[]` (envio mais antigo primeiro, sem envio no fim), `enviadoEm(a): string` ("Enviado 27/09 · 10:30").

Medidas (protótipo, linhas 188–211): `max-width 1080`, `gap 16`. Estado vazio: branco, raio 16, `padding 40`, 14 `#8F8D8D`, centralizado. Grade `repeat(auto-fill, minmax(280px, 1fr))`, `gap 12`. Cartão: branco, raio 16, `padding 20`, coluna `gap 12`, hover com sombra `0 4px 16px rgba(0,0,0,.08)`. Topo: código 12/600 `#8F8D8D` (`flex:1`) + chip "m". Título 16/700 `#2C3143`; "cliente · tipos" 13 `#50555C`. Rodapé: `padding-top 12`, borda superior `#E5E5E5`, `gap 10`; avatar 30 (11/700); nome 13/600 (cor herdada `#262A3B`); "Enviado …" 12 `#8F8D8D`; "Analisar" 13/600 `#004E8F`.

- [ ] **Step 1: Testes (falham)**

`apps/gestor/src/aprovacoes/fila.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { resumo } from '../../test/fixtures'
import { enviadoEm, ordenarFila } from './fila'

describe('fila de aprovação', () => {
  it('quem espera há mais tempo vem primeiro; sem envio vai para o fim', () => {
    const fila = ordenarFila([
      resumo({ id: 'hoje', ultimoEnvioEm: '2026-09-28T11:45:00.000Z' }),
      resumo({ id: 'sem', ultimoEnvioEm: null }),
      resumo({ id: 'ontem', ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }),
    ])
    expect(fila.map((a) => a.id)).toEqual(['ontem', 'hoje', 'sem'])
  })
  it('mostra quando foi enviado, no fuso de São Paulo', () => {
    expect(enviadoEm(resumo({ ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }))).toBe(
      'Enviado 27/09 · 10:30',
    )
    expect(enviadoEm(resumo({ ultimoEnvioEm: null }))).toBe('')
  })
})
```

`apps/gestor/src/aprovacoes/PaginaAprovacoes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { resumo } from '../../test/fixtures'
import { montar } from '../../test/montar'
import { api } from '../api'
import PaginaAprovacoes from './PaginaAprovacoes.vue'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))

describe('PaginaAprovacoes', () => {
  let fila: ReturnType<typeof resumo>[]
  let simulada: ReturnType<typeof simularApi>
  beforeEach(() => {
    fila = [
      resumo({
        id: 'a1062',
        codigo: 'AC-1062',
        titulo: 'Limpeza de ar-condicionado',
        cliente: 'Clínica Vida',
        tipos: [{ nome: 'Limpeza de ar-condicionado', cor: '#8FB8DE' }],
        ultimoEnvioEm: '2026-09-28T11:45:00.000Z',
      }),
      resumo({ ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }),
    ]
    simulada = simularApi(api, { 'GET /api/acionamentos': () => ({ data: fila }) })
  })

  it('consulta só o que aguarda aprovação', async () => {
    await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    expect(simulada.chamadas('GET', '/api/acionamentos')[0]!.params!.query).toEqual({
      status: 'aguardando',
      busca: undefined,
    })
  })

  it('mostra os cartões, do envio mais antigo para o mais novo', async () => {
    const { tela } = await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    const cartoes = tela.findAll('a.cartao')
    expect(cartoes.map((c) => c.find('.codigo').text())).toEqual(['AC-1059', 'AC-1062'])
    const primeiro = cartoes[0]!
    expect(primeiro.find('.titulo').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(primeiro.find('.sub').text()).toBe(
      'Colégio Aprender · Revisão elétrica + Troca de disjuntor',
    )
    expect(primeiro.find('.topo').text()).toContain('Aguardando aprovação')
    expect(primeiro.find('.nome').text()).toBe('Carlos Mendes')
    expect(primeiro.find('.enviado').text()).toBe('Enviado 27/09 · 10:30')
    expect(primeiro.find('.analisar').text()).toBe('Analisar')
    expect(primeiro.attributes('href')).toBe('/aprovacoes/a1059')
  })

  it('fila vazia mostra o aviso do protótipo', async () => {
    fila = []
    const { tela } = await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    expect(tela.find('.vazio').text()).toBe('Sua fila está vazia.')
    expect(tela.findAll('a.cartao')).toHaveLength(0)
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/aprovacoes`
Expected: FAIL (`./fila` não existe; a página ainda é "Em construção").

- [ ] **Step 2: Implementação**

`apps/gestor/src/aprovacoes/fila.ts`:
```ts
import type { ResumoAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

/** Quem espera há mais tempo aparece primeiro (como no protótipo). Sem envio registrado, no fim. */
export function ordenarFila(lista: readonly ResumoAcionamento[]): ResumoAcionamento[] {
  const chave = (a: ResumoAcionamento) => a.ultimoEnvioEm ?? '￿'
  return [...lista].sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0))
}

/** "Enviado 27/09 · 10:30". */
export function enviadoEm(a: Pick<ResumoAcionamento, 'ultimoEnvioEm'>): string {
  return a.ultimoEnvioEm ? `Enviado ${momento(a.ultimoEnvioEm)}` : ''
}
```

`apps/gestor/src/aprovacoes/PaginaAprovacoes.vue`:
```vue
<script setup lang="ts">
import { AvatarIniciais, StatusChip } from '@kgb/ui'
import { computed } from 'vue'
import { rotuloTipos } from '../acionamentos/apresentacao'
import { usarLista } from '../acionamentos/dados'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { mensagemDeErro } from '../erros'
import { enviadoEm, ordenarFila } from './fila'

const { data, isSuccess, isError, error } = usarLista('aguardando')
const fila = computed(() => ordenarFila(data.value ?? []))
</script>

<template>
  <PaginaGestor :largura="1080">
    <CabecalhoPagina
      titulo="Aprovações"
      subtitulo="Confira as fotos e comentários de cada etapa antes de aprovar."
    />
    <div v-if="isError" class="vazio">{{ mensagemDeErro(error) }}</div>
    <div v-else-if="isSuccess && fila.length === 0" class="vazio">Sua fila está vazia.</div>
    <div class="grade">
      <RouterLink
        v-for="a in fila"
        :key="a.id"
        :to="{ name: 'aprovacao', params: { id: a.id } }"
        class="cartao"
      >
        <div class="topo">
          <span class="codigo">{{ a.codigo }}</span>
          <StatusChip :status="a.status" :inviavel="a.inviavel" />
        </div>
        <div>
          <div class="titulo">{{ a.titulo }}</div>
          <div class="sub">{{ a.cliente }} · {{ rotuloTipos(a.tipos) }}</div>
        </div>
        <div class="rodape">
          <AvatarIniciais
            :nome="a.prestador.nome"
            :tamanho="30"
            :cor="a.prestador.cor"
            :tamanho-fonte="11"
          />
          <div class="quem">
            <div class="nome">{{ a.prestador.nome }}</div>
            <div class="enviado">{{ enviadoEm(a) }}</div>
          </div>
          <span class="analisar">Analisar</span>
        </div>
      </RouterLink>
    </div>
  </PaginaGestor>
</template>

<style scoped>
.vazio {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.cartao {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--kgb-tinta);
  cursor: pointer;
}
.cartao:hover {
  box-shadow: var(--kgb-sombra-elevado);
  color: var(--kgb-tinta);
}
.topo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.codigo {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.titulo {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.sub {
  font-size: 13px;
  color: var(--kgb-secundario);
}
.rodape {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--kgb-divisor);
}
.quem {
  flex: 1;
  min-width: 0;
}
.nome {
  font-size: 13px;
  font-weight: 600;
}
.enviado {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.analisar {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria-escura);
}
</style>
```

Em `tools/visual/casos-gestor.ts`: `gestor-web-aprovacoes` e `gestor-mobile-aprovacoes` passam a usar `regioes: [telaWeb]` e `regioes: [telaMobile]`.

- [ ] **Step 3: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test && pnpm --filter @kgb/gestor typecheck`
Expected: PASS.

- [ ] **Step 4: Comparar com o protótipo**

Run: `pnpm db:seed && URL_GESTOR=http://localhost:5175 pnpm visual -- --app=gestor --caso=gestor-web-aprovacoes` (e o mobile).
Expected: ✓.

- [ ] **Step 5: Commit**

```bash
git add apps/gestor tools/visual/casos-gestor.ts
git commit -m "feat(gestor): fila de aprovações"
```

---

### Task 5: Detalhe do acionamento (informações, etapas, conclusão, decisão e histórico)

**Files:**
- Create: `apps/gestor/src/acionamentos/detalhe/{linhaDoTempo.ts,decisao.ts,fotos.ts,CartaoDecisao.vue}`
- Modify: `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue` (substitui o esqueleto), `tools/visual/casos-gestor.ts`
- Test: `apps/gestor/src/acionamentos/detalhe/{linhaDoTempo.test.ts,decisao.test.ts,CartaoDecisao.test.ts,PaginaDetalhe.test.ts}`

**Interfaces:**
- Consumes: `usarDetalhe(id)`, `usarRevisao(id)`, `toastGestor`, `mensagemDeErro`, `ErroApi`.
- Produces:
  - `montarLinhaDoTempo(eventos): { titulo; quando; nota: string | null; cor }[]`, `CORES_HISTORICO`.
  - `rotulosDecisao(inviavel): { titulo; aprovar; reprovar }`, `prepararRevisao(decisao, observacao): { ok: true; corpo } | { ok: false; mensagem }`, `ultimaDecisao(a): { rotulo; motivo } | null`, `MENSAGENS_REVISAO`, `type Decisao`.
  - `urlFoto(foto): string | null`.
  - `<CartaoDecisao :inviavel :enviando v-model:observacao @decidir(decisao, observacao)>`.

Medidas (protótipo, linhas 310–418):
- Página `max-width 1180`, coluna `gap 16`. Voltar: 14/600 `#50555C`, `gap 4`, chevron 18px girado 180°. Topo: `flex-wrap`, `align-items flex-start`, `gap 12`; bloco `flex:1; min-width:220px` com código 13/600 `#8F8D8D` e título 24/32 700 `#2C3143`; chip "g".
- Colunas: `flex-wrap`, `gap 16`, `align-items flex-start`. Principal `2 1 400px`, lateral `1 1 280px`; as duas em coluna com `gap 16`.
- Cartões: branco, raio 16. Na principal `padding 20px 24px`; na lateral `padding 20`.
  - Informações: grid `repeat(auto-fit, minmax(170px, 1fr))`, `gap 16`; rótulo 12 `#8F8D8D`; valor 14/600 `#2C3143`; endereço é link 14/600; avatar 22 (9/700) com `gap 8`.
  - Inviabilidade: borda `1px #F4D8E8`, `gap 12`; título 16/700 `#A8336A`; texto 14/20 `#363853`; fotos 96.
  - Demanda: `gap 4`; cabeçalho `gap 10`, `padding-bottom 8` (bolinha 10, nome 16/700 `#2C3143`, progresso 13/600 `#50555C`); etapa `gap 12`, `padding 12px 0`, borda superior `#E5E5E5`; caixa 22 raio 7 (feita `#0069BD` com check 16 branco; pendente borda `1.5px #ADB3BC`); corpo em coluna `gap 8`; texto 14/600 (`#2C3143` feita, `#8F8D8D` pendente); comentário 13 `#363853` em `#F9F9F9`, raio 10, `padding 8px 12px`; fotos 80, `gap 8`.
  - Conclusão (se há fotos ou comentário): `gap 12`; título 16/700; comentário 14 `#363853`; fotos 120 (a faixa de fotos existe mesmo vazia).
  - Decisão: `gap 12`, sombra `0 4px 16px rgba(0,0,0,.08)`; título 16/700; textarea 96px, borda `#E5E5E5`, raio 12, `padding 12`, 14px, foco `#262A3B`; botões 48px raio 16 14/600 (padding padrão do `<button>`): aprovar `#0069BD` (hover `#005AA3`), reprovar branco com borda `#FF6A5D` e texto `#B8342A` (hover `#FFD7D4`).
  - Última decisão: `gap 6`; rótulo 13/600 `#50555C`; motivo 14 `#363853`.
  - Histórico: `gap 14`; título 16/700; item `gap 12`; ponto 10px, `margin-top 5`; título 14/600 `#2C3143`; data 12 `#8F8D8D`; nota 13 `#363853`, `margin-top 4`.

- [ ] **Step 1: Testes da lógica (falham)**

`apps/gestor/src/acionamentos/detalhe/linhaDoTempo.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CORES_HISTORICO, montarLinhaDoTempo } from './linhaDoTempo'

const ev = (tipo: string, em: string, motivo: string | null = null) =>
  ({ tipo, em, motivo }) as Parameters<typeof montarLinhaDoTempo>[0][number]

describe('linha do tempo do Detalhe', () => {
  it('usa os rótulos do protótipo e a data de São Paulo', () => {
    const itens = montarLinhaDoTempo([
      ev('criado', '2026-09-22T19:20:00.000Z'),
      ev('iniciado', '2026-09-24T13:00:00.000Z'),
      ev('enviado', '2026-09-24T15:10:00.000Z'),
      ev('reprovado', '2026-09-24T16:40:00.000Z', 'A foto final não mostra o retoque da pintura.'),
      ev('enviado', '2026-09-24T17:40:00.000Z'),
      ev('aprovado', '2026-09-24T19:10:00.000Z'),
    ])
    expect(itens).toEqual([
      { titulo: 'Acionamento criado', quando: '22/09 · 16:20', nota: null, cor: '#ADB3BC' },
      { titulo: 'Atendimento iniciado', quando: '24/09 · 10:00', nota: null, cor: '#ADB3BC' },
      { titulo: 'Enviado para aprovação', quando: '24/09 · 12:10', nota: null, cor: '#ADB3BC' },
      {
        titulo: 'Reprovado',
        quando: '24/09 · 13:40',
        nota: 'A foto final não mostra o retoque da pintura.',
        cor: '#FF6A5D',
      },
      { titulo: 'Reenviado para aprovação', quando: '24/09 · 14:40', nota: null, cor: '#ADB3BC' },
      { titulo: 'Aprovado', quando: '24/09 · 16:10', nota: null, cor: '#0069BD' },
    ])
    expect(CORES_HISTORICO).toEqual({ aprovado: '#0069BD', reprovado: '#FF6A5D', neutro: '#ADB3BC' })
  })

  it('uma inviabilidade recusada conta como envio: o envio seguinte é reenvio', () => {
    const titulos = montarLinhaDoTempo([
      ev('criado', '2026-09-20T12:00:00.000Z'),
      ev('inviabilidade_enviada', '2026-09-21T12:00:00.000Z'),
      ev('reprovado', '2026-09-21T13:00:00.000Z', 'Dá para fazer, sim.'),
      ev('enviado', '2026-09-21T15:00:00.000Z'),
    ]).map((i) => i.titulo)
    expect(titulos).toEqual([
      'Acionamento criado',
      'Inviabilidade enviada',
      'Reprovado',
      'Reenviado para aprovação',
    ])
  })

  it('mostra a observação de uma aprovação, quando houver', () => {
    const [item] = montarLinhaDoTempo([ev('aprovado', '2026-09-24T19:10:00.000Z', 'Ficou ótimo.')])
    expect(item!.nota).toBe('Ficou ótimo.')
  })

  it('ordena por data; no mesmo instante, segue a ordem natural do fluxo', () => {
    const titulos = montarLinhaDoTempo([
      ev('inviabilidade_enviada', '2026-09-25T12:30:00.000Z'),
      ev('aprovado', '2026-09-25T14:00:00.000Z'),
      ev('iniciado', '2026-09-25T12:30:00.000Z'),
      ev('criado', '2026-09-23T19:20:00.000Z'),
    ]).map((i) => i.titulo)
    expect(titulos).toEqual([
      'Acionamento criado',
      'Atendimento iniciado',
      'Inviabilidade enviada',
      'Aprovado',
    ])
  })
})
```

`apps/gestor/src/acionamentos/detalhe/decisao.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { detalhe } from '../../../test/fixtures'
import { MENSAGENS_REVISAO, prepararRevisao, rotulosDecisao, ultimaDecisao } from './decisao'

describe('rótulos da decisão', () => {
  it('conclusão normal', () => {
    expect(rotulosDecisao(false)).toEqual({
      titulo: 'Confira e decida',
      aprovar: 'Aprovar conclusão',
      reprovar: 'Reprovar',
    })
  })
  it('inviabilidade em análise', () => {
    expect(rotulosDecisao(true)).toEqual({
      titulo: 'O prestador marcou como inviável',
      aprovar: 'Confirmar inviabilidade',
      reprovar: 'Recusar inviabilidade',
    })
  })
})

describe('prepararRevisao', () => {
  it('reprovar exige motivo (espaços não contam)', () => {
    expect(prepararRevisao('reprovado', '   ')).toEqual({
      ok: false,
      mensagem: 'Escreva o motivo da reprovação',
    })
  })
  it('reprovar com motivo manda o motivo aparado', () => {
    expect(prepararRevisao('reprovado', '  Falta a foto do quadro. ')).toEqual({
      ok: true,
      corpo: { decisao: 'reprovado', motivo: 'Falta a foto do quadro.' },
    })
  })
  it('aprovar dispensa a observação e a manda quando existe', () => {
    expect(prepararRevisao('aprovado', '')).toEqual({ ok: true, corpo: { decisao: 'aprovado' } })
    expect(prepararRevisao('aprovado', 'Ficou ótimo')).toEqual({
      ok: true,
      corpo: { decisao: 'aprovado', motivo: 'Ficou ótimo' },
    })
  })
  it('mensagens dos toasts', () => {
    expect(MENSAGENS_REVISAO).toEqual({
      aprovado: 'Conclusão aprovada',
      reprovado: 'Devolvido ao prestador para correção',
      semMotivo: 'Escreva o motivo da reprovação',
    })
  })
})

describe('ultimaDecisao', () => {
  const revisoes = [
    { decisao: 'reprovado' as const, motivo: 'A foto final não mostra o retoque.', em: '2026-09-24T16:40:00.000Z' },
    { decisao: 'aprovado' as const, motivo: null, em: '2026-09-24T19:10:00.000Z' },
  ]
  it('mostra a última revisão quando não está aguardando', () => {
    expect(ultimaDecisao(detalhe({ status: 'aprovado', revisoes }))).toEqual({
      rotulo: 'Aprovado em 24/09 · 16:10',
      motivo: null,
    })
    expect(
      ultimaDecisao(detalhe({ status: 'reprovado', revisoes: revisoes.slice(0, 1) })),
    ).toEqual({ rotulo: 'Reprovado em 24/09 · 13:40', motivo: 'A foto final não mostra o retoque.' })
  })
  it('aguardando ou sem revisão: nada', () => {
    expect(ultimaDecisao(detalhe({ status: 'aguardando', revisoes }))).toBeNull()
    expect(ultimaDecisao(detalhe({ status: 'em_andamento', revisoes: [] }))).toBeNull()
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/detalhe/linhaDoTempo.test.ts src/acionamentos/detalhe/decisao.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 2: Implementação da lógica**

`apps/gestor/src/acionamentos/detalhe/linhaDoTempo.ts`:
```ts
import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

type Evento = DetalheAcionamento['eventos'][number]

export interface ItemHistorico {
  titulo: string
  quando: string
  nota: string | null
  cor: string
}

export const CORES_HISTORICO = { aprovado: '#0069BD', reprovado: '#FF6A5D', neutro: '#ADB3BC' } as const

/** Desempate para eventos no mesmo instante (ex.: inviável sem ter iniciado). */
const ORDEM: Record<Evento['tipo'], number> = {
  criado: 0,
  iniciado: 1,
  enviado: 2,
  inviabilidade_enviada: 2,
  aprovado: 3,
  reprovado: 3,
}

function comparar(a: Evento, b: Evento): number {
  if (a.em !== b.em) return a.em < b.em ? -1 : 1
  return ORDEM[a.tipo] - ORDEM[b.tipo]
}

/**
 * Eventos da API → histórico do Detalhe, com os rótulos do protótipo. Envio e inviabilidade contam
 * juntos: depois do primeiro, todo envio é "Reenviado para aprovação".
 */
export function montarLinhaDoTempo(eventos: readonly Evento[]): ItemHistorico[] {
  let envios = 0
  return [...eventos].sort(comparar).map((e) => {
    const item = (titulo: string, cor: string = CORES_HISTORICO.neutro): ItemHistorico => ({
      titulo,
      quando: momento(e.em),
      nota: e.motivo || null,
      cor,
    })
    switch (e.tipo) {
      case 'criado':
        return item('Acionamento criado')
      case 'iniciado':
        return item('Atendimento iniciado')
      case 'enviado':
        return item(envios++ ? 'Reenviado para aprovação' : 'Enviado para aprovação')
      case 'inviabilidade_enviada':
        envios++
        return item('Inviabilidade enviada')
      case 'aprovado':
        return item('Aprovado', CORES_HISTORICO.aprovado)
      case 'reprovado':
        return item('Reprovado', CORES_HISTORICO.reprovado)
    }
  })
}
```

`apps/gestor/src/acionamentos/detalhe/decisao.ts`:
```ts
import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

export type Decisao = 'aprovado' | 'reprovado'

export const MENSAGENS_REVISAO = {
  aprovado: 'Conclusão aprovada',
  reprovado: 'Devolvido ao prestador para correção',
  semMotivo: 'Escreva o motivo da reprovação',
} as const

export function rotulosDecisao(inviavel: boolean): {
  titulo: string
  aprovar: string
  reprovar: string
} {
  return inviavel
    ? {
        titulo: 'O prestador marcou como inviável',
        aprovar: 'Confirmar inviabilidade',
        reprovar: 'Recusar inviabilidade',
      }
    : { titulo: 'Confira e decida', aprovar: 'Aprovar conclusão', reprovar: 'Reprovar' }
}

export type PedidoRevisao =
  | { ok: true; corpo: { decisao: Decisao; motivo?: string } }
  | { ok: false; mensagem: string }

/** Reprovar exige motivo; a observação de uma aprovação vai junto quando existe. */
export function prepararRevisao(decisao: Decisao, observacao: string): PedidoRevisao {
  const motivo = observacao.trim()
  if (decisao === 'reprovado' && !motivo) {
    return { ok: false, mensagem: MENSAGENS_REVISAO.semMotivo }
  }
  return { ok: true, corpo: motivo ? { decisao, motivo } : { decisao } }
}

/** Cartão "Última decisão": só quando não está aguardando e já houve revisão. */
export function ultimaDecisao(
  a: Pick<DetalheAcionamento, 'status' | 'revisoes'>,
): { rotulo: string; motivo: string | null } | null {
  const ultima = a.revisoes.at(-1)
  if (!ultima || a.status === 'aguardando') return null
  const verbo = ultima.decisao === 'aprovado' ? 'Aprovado' : 'Reprovado'
  return { rotulo: `${verbo} em ${momento(ultima.em)}`, motivo: ultima.motivo || null }
}
```

`apps/gestor/src/acionamentos/detalhe/fotos.ts`:
```ts
import { resolverUrl, type Foto } from '@kgb/api-client'
import { BASE_API } from '../../api'

/** A foto real vem com caminho assinado relativo à API; a de exemplo não tem URL (bloco colorido). */
export function urlFoto(foto: Pick<Foto, 'url'>): string | null {
  return resolverUrl(BASE_API, foto.url)
}
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/detalhe/linhaDoTempo.test.ts src/acionamentos/detalhe/decisao.test.ts`
Expected: PASS.

- [ ] **Step 3: Testes dos componentes (falham)**

`apps/gestor/src/acionamentos/detalhe/CartaoDecisao.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CartaoDecisao from './CartaoDecisao.vue'

const montar = (inviavel: boolean, enviando = false) =>
  mount(CartaoDecisao, { props: { inviavel, enviando, observacao: '' } })

describe('CartaoDecisao', () => {
  it('conclusão: "Confira e decida", "Aprovar conclusão" e "Reprovar"', () => {
    const c = montar(false)
    expect(c.find('.titulo').text()).toBe('Confira e decida')
    expect(c.find('.aprovar').text()).toBe('Aprovar conclusão')
    expect(c.find('.reprovar').text()).toBe('Reprovar')
    expect(c.find('textarea').attributes('placeholder')).toBe(
      'Observação para o prestador (obrigatória para reprovar)',
    )
  })
  it('inviabilidade: "Confirmar inviabilidade" e "Recusar inviabilidade"', () => {
    const c = montar(true)
    expect(c.find('.titulo').text()).toBe('O prestador marcou como inviável')
    expect(c.find('.aprovar').text()).toBe('Confirmar inviabilidade')
    expect(c.find('.reprovar').text()).toBe('Recusar inviabilidade')
  })
  it('avisa a decisão com a observação digitada', async () => {
    const c = montar(false)
    await c.find('textarea').setValue('Falta a foto do quadro')
    await c.find('.reprovar').trigger('click')
    await c.find('.aprovar').trigger('click')
    expect(c.emitted('decidir')).toEqual([
      ['reprovado', 'Falta a foto do quadro'],
      ['aprovado', 'Falta a foto do quadro'],
    ])
  })
  it('enquanto envia, os botões ficam travados', () => {
    const c = montar(false, true)
    expect(c.find('.aprovar').attributes('disabled')).toBeDefined()
    expect(c.find('.reprovar').attributes('disabled')).toBeDefined()
  })
})
```

`apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.test.ts` (substitui o da Task 2):
```ts
import type { DetalheAcionamento } from '@kgb/api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi } from '../../../test/api-falsa'
import { detalhe, foto } from '../../../test/fixtures'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import { toastGestor } from '../../toast'
import PaginaDetalhe from './PaginaDetalhe.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('PaginaDetalhe', () => {
  let atual: DetalheAcionamento
  let simulada: ReturnType<typeof simularApi>
  let revisao: (corpo: { decisao: string; motivo?: string }) => { data?: unknown; error?: unknown; status?: number }

  beforeEach(() => {
    toastGestor.mensagem.value = null
    atual = detalhe()
    revisao = (corpo) => {
      atual = detalhe({
        status: corpo.decisao as DetalheAcionamento['status'],
        revisoes: [{ decisao: corpo.decisao as 'aprovado', motivo: corpo.motivo ?? null, em: '2026-09-28T12:00:00.000Z' }],
      })
      return { data: atual }
    }
    simulada = simularApi(api, {
      'GET /api/acionamentos/{id}': () => ({ data: atual }),
      'POST /api/acionamentos/{id}/revisao': (o: { body?: unknown }) =>
        revisao(o.body as { decisao: string; motivo?: string }),
    })
  })

  const abrir = (origem: 'acionamentos' | 'aprovacoes' = 'acionamentos') =>
    montar(PaginaDetalhe, { props: { id: 'a1059', origem } })

  it('volta para a tela de origem', async () => {
    const pelaLista = (await abrir()).tela.find('a.voltar')
    expect([pelaLista.text(), pelaLista.attributes('href')]).toEqual(['Acionamentos', '/acionamentos'])
    const pelaFila = (await abrir('aprovacoes')).tela.find('a.voltar')
    expect([pelaFila.text(), pelaFila.attributes('href')]).toEqual(['Aprovações', '/aprovacoes'])
  })

  it('mostra código, título, status e o cartão de informações', async () => {
    const { tela } = await abrir()
    expect(tela.find('.codigo').text()).toBe('AC-1059')
    expect(tela.find('h1').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(tela.find('.topo').text()).toContain('Aguardando aprovação')
    const info = tela.find('.info')
    expect(info.text()).toContain('Colégio Aprender')
    expect(info.text()).toContain('27/09/2026 · 08:00–11:00')
    expect(info.text()).toContain('Carlos Mendes')
    const endereco = info.find('a.endereco')
    expect(endereco.text()).toBe('Rua Apinajés, 1500 · Perdizes')
    expect(endereco.attributes('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua Apinajés, 1500, Perdizes, São Paulo')}`,
    )
    expect(endereco.attributes('target')).toBe('_blank')
  })

  it('mostra as etapas de cada demanda (só leitura), com comentário e fotos de 80px', async () => {
    const { tela } = await abrir()
    const demanda = tela.find('.demanda')
    expect(demanda.find('.nome-demanda').text()).toBe('Revisão elétrica')
    expect(demanda.find('.prog').text()).toBe('1/2')
    const [feita, pendente] = demanda.findAll('.etapa')
    expect(feita!.find('.caixa').classes()).toContain('feita')
    expect(feita!.find('.caixa').attributes('aria-label')).toBe('Feita')
    expect(pendente!.find('.caixa').attributes('aria-label')).toBe('Pendente')
    expect(pendente!.find('.texto').classes()).toContain('pendente')
    expect(pendente!.find('.comentario').text()).toBe('Tomada da cozinha sem tensão')
    expect(feita!.find('.miniatura').attributes('style')).toContain('width: 80px')
    expect(tela.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('foto real vira imagem com a URL da API; foto de exemplo é o bloco colorido', async () => {
    atual = detalhe({
      fotosConclusao: [foto({ id: 'f9', url: '/api/arquivos/fotos/f9?exp=1&sig=x', cor: null }), foto()],
    })
    const { tela } = await abrir()
    const fotos = tela.findAll('.conclusao .miniatura')
    expect(fotos).toHaveLength(2)
    expect(fotos[0]!.find('img').attributes('src')).toBe('http://api.test/api/arquivos/fotos/f9?exp=1&sig=x')
    expect(fotos[0]!.attributes('style')).toContain('width: 120px')
    expect(fotos[1]!.find('img').exists()).toBe(false)
    expect(tela.find('.conclusao').text()).toContain('Serviço finalizado e testado junto com o cliente.')
  })

  it('aguardando: cartão de decisão e nenhuma "última decisão"', async () => {
    const { tela } = await abrir()
    expect(tela.find('.decisao .aprovar').text()).toBe('Aprovar conclusão')
    expect(tela.find('.ultima').exists()).toBe(false)
  })

  it('reprovar sem motivo avisa e não chama a API', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .reprovar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escreva o motivo da reprovação')
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')).toHaveLength(0)
  })

  it('aprovar: envia, avisa e troca o cartão de decisão pela última decisão', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]).toMatchObject({
      params: { path: { id: 'a1059' } },
      body: { decisao: 'aprovado' },
    })
    expect(toastGestor.mensagem.value).toBe('Conclusão aprovada')
    expect(tela.find('.decisao').exists()).toBe(false)
    expect(tela.find('.ultima').text()).toContain('Aprovado em 28/09 · 09:00')
  })

  it('reprovar com motivo: envia o motivo, avisa e limpa a observação', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao textarea').setValue('Falta a foto do quadro')
    await tela.find('.decisao .reprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]!.body).toEqual({
      decisao: 'reprovado',
      motivo: 'Falta a foto do quadro',
    })
    expect(toastGestor.mensagem.value).toBe('Devolvido ao prestador para correção')
    expect(tela.find('.ultima').text()).toContain('Falta a foto do quadro')
  })

  it('dois cliques em aprovar enviam uma revisão só', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .aprovar').trigger('click')
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')).toHaveLength(1)
  })

  it('se a API recusar (outra pessoa já decidiu), mostra a mensagem e recarrega', async () => {
    revisao = () => erroApi(409, 'transicao_invalida', 'Este acionamento não está aguardando aprovação')
    const { tela } = await abrir()
    const leiturasAntes = simulada.chamadas('GET', '/api/acionamentos/{id}').length
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Este acionamento não está aguardando aprovação')
    expect(simulada.chamadas('GET', '/api/acionamentos/{id}').length).toBeGreaterThan(leiturasAntes)
  })

  it('aguardando + inviável: rótulos de inviabilidade e o cartão com o motivo e as fotos', async () => {
    atual = detalhe({
      inviavel: true,
      inviabilidade: {
        comentario: 'O teto da garagem é laje protendida.',
        fotos: [foto({ id: 'f7', horario: '09:30' })],
      },
    })
    const { tela } = await abrir()
    expect(tela.find('.topo').text()).toContain('Inviabilidade em análise')
    expect(tela.find('.decisao .titulo').text()).toBe('O prestador marcou como inviável')
    expect(tela.find('.decisao .aprovar').text()).toBe('Confirmar inviabilidade')
    expect(tela.find('.decisao .reprovar').text()).toBe('Recusar inviabilidade')
    const inv = tela.find('.inviabilidade')
    expect(inv.find('.titulo-inv').text()).toBe('Motivo da inviabilidade')
    expect(inv.text()).toContain('O teto da garagem é laje protendida.')
    expect(inv.find('.miniatura').attributes('style')).toContain('width: 96px')
  })

  it('histórico com os rótulos do protótipo', async () => {
    const { tela } = await abrir()
    expect(tela.findAll('.evento-titulo').map((e) => e.text())).toEqual([
      'Acionamento criado',
      'Atendimento iniciado',
      'Enviado para aprovação',
    ])
    expect(tela.findAll('.evento-quando').map((e) => e.text())).toEqual([
      '25/09 · 16:20',
      '27/09 · 08:00',
      '27/09 · 10:30',
    ])
  })

  it('acionamento inexistente mostra o aviso', async () => {
    simularApi(api, {
      'GET /api/acionamentos/{id}': () => erroApi(404, 'nao_encontrado', 'Acionamento não encontrado'),
    })
    const { tela } = await abrir()
    expect(tela.find('.aviso').text()).toBe('Acionamento não encontrado.')
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/detalhe`
Expected: FAIL (`CartaoDecisao.vue` não existe; a página é o esqueleto).

- [ ] **Step 4: Implementação dos componentes**

`apps/gestor/src/acionamentos/detalhe/CartaoDecisao.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { rotulosDecisao, type Decisao } from './decisao'

const props = defineProps<{ inviavel: boolean; enviando: boolean }>()
const emit = defineEmits<{ decidir: [decisao: Decisao, observacao: string] }>()
const observacao = defineModel<string>('observacao', { default: '' })
const rotulos = computed(() => rotulosDecisao(props.inviavel))
</script>

<template>
  <section class="decisao" aria-labelledby="decisao-titulo">
    <h2 id="decisao-titulo" class="titulo">{{ rotulos.titulo }}</h2>
    <textarea
      v-model="observacao"
      class="observacao"
      placeholder="Observação para o prestador (obrigatória para reprovar)"
      aria-label="Observação para o prestador"
    />
    <button
      type="button"
      class="aprovar"
      :disabled="enviando"
      @click="emit('decidir', 'aprovado', observacao)"
    >
      {{ rotulos.aprovar }}
    </button>
    <button
      type="button"
      class="reprovar"
      :disabled="enviando"
      @click="emit('decidir', 'reprovado', observacao)"
    >
      {{ rotulos.reprovar }}
    </button>
  </section>
</template>

<style scoped>
.decisao {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--kgb-sombra-elevado);
}
.titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.observacao {
  height: 96px;
  resize: none;
  border: 1px solid var(--kgb-divisor);
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 400;
  outline: 0;
}
.observacao:focus {
  border-color: var(--kgb-tinta);
}
/* Sem padding explícito: como no protótipo, fica o padrão do navegador (1px 6px). */
.aprovar,
.reprovar {
  height: 48px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.aprovar {
  border: 0;
  background: var(--kgb-primaria);
  color: #fff;
}
.aprovar:hover {
  background: var(--kgb-primaria-hover);
}
.reprovar {
  border: 1px solid var(--kgb-perigo);
  background: var(--kgb-branco);
  color: var(--kgb-perigo-texto);
}
.reprovar:hover {
  background: var(--kgb-perigo-fundo);
}
</style>
```

`apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue`:
```vue
<script setup lang="ts">
import {
  AvatarIniciais,
  dataBR,
  intervalo,
  MiniaturaFoto,
  RussoIcone,
  StatusChip,
  urlMapa,
} from '@kgb/ui'
import { computed, ref } from 'vue'
import PaginaGestor from '../../componentes/PaginaGestor.vue'
import { ErroApi, mensagemDeErro } from '../../erros'
import { toastGestor } from '../../toast'
import { usarDetalhe, usarRevisao } from '../dados'
import CartaoDecisao from './CartaoDecisao.vue'
import { MENSAGENS_REVISAO, prepararRevisao, ultimaDecisao, type Decisao } from './decisao'
import { urlFoto } from './fotos'
import { montarLinhaDoTempo } from './linhaDoTempo'

const props = defineProps<{ id: string; origem: 'acionamentos' | 'aprovacoes' }>()

const { data: acionamento, isError, error } = usarDetalhe(() => props.id)
const { mutateAsync: revisar, isPending: enviando } = usarRevisao(() => props.id)
const observacao = ref('')

const voltar = computed(() =>
  props.origem === 'aprovacoes'
    ? { rota: 'aprovacoes', rotulo: 'Aprovações' }
    : { rota: 'acionamentos', rotulo: 'Acionamentos' },
)
const historico = computed(() => montarLinhaDoTempo(acionamento.value?.eventos ?? []))
const decisaoAnterior = computed(() =>
  acionamento.value ? ultimaDecisao(acionamento.value) : null,
)
const temConclusao = computed(
  () =>
    !!acionamento.value &&
    (acionamento.value.fotosConclusao.length > 0 || !!acionamento.value.comentarioConclusao),
)
const aviso = computed(() =>
  error.value instanceof ErroApi && error.value.status === 404
    ? 'Acionamento não encontrado.'
    : mensagemDeErro(error.value),
)
const progressoDemanda = (etapas: readonly { feita: boolean }[]) =>
  `${etapas.filter((e) => e.feita).length}/${etapas.length}`

async function decidir(decisao: Decisao, texto: string) {
  if (enviando.value) return
  const pedido = prepararRevisao(decisao, texto)
  if (!pedido.ok) return toastGestor.mostrar(pedido.mensagem)
  try {
    await revisar(pedido.corpo)
    observacao.value = ''
    toastGestor.mostrar(MENSAGENS_REVISAO[decisao])
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  }
}
</script>

<template>
  <PaginaGestor :largura="1180">
    <RouterLink :to="{ name: voltar.rota }" class="voltar">
      <RussoIcone nome="chevron-right" :tamanho="18" class="seta" />{{ voltar.rotulo }}
    </RouterLink>
    <div v-if="isError" class="cartao aviso">{{ aviso }}</div>
    <template v-else-if="acionamento">
      <div class="topo">
        <div class="identificacao">
          <div class="codigo">{{ acionamento.codigo }}</div>
          <h1 class="titulo">{{ acionamento.titulo }}</h1>
        </div>
        <StatusChip :status="acionamento.status" :inviavel="acionamento.inviavel" tamanho="g" />
      </div>
      <div class="colunas">
        <div class="principal">
          <div class="cartao info">
            <div>
              <div class="rotulo">Cliente</div>
              <div class="valor">{{ acionamento.cliente }}</div>
            </div>
            <div>
              <div class="rotulo">Endereço</div>
              <a
                class="endereco"
                :href="urlMapa(acionamento.endereco)"
                target="_blank"
                rel="noopener"
                >{{ acionamento.endereco }}</a
              >
            </div>
            <div>
              <div class="rotulo">Atendimento</div>
              <div class="valor">
                {{ dataBR(acionamento.data) }} · {{ intervalo(acionamento.inicio, acionamento.fim) }}
              </div>
            </div>
            <div>
              <div class="rotulo">Prestador</div>
              <div class="valor prestador">
                <AvatarIniciais
                  :nome="acionamento.prestador.nome"
                  :tamanho="22"
                  :cor="acionamento.prestador.cor"
                  :tamanho-fonte="9"
                />{{ acionamento.prestador.nome }}
              </div>
            </div>
          </div>
          <section v-if="acionamento.inviabilidade" class="cartao inviabilidade">
            <h2 class="titulo-inv">Motivo da inviabilidade</h2>
            <div class="texto-inv">{{ acionamento.inviabilidade.comentario }}</div>
            <div class="fotos">
              <MiniaturaFoto
                v-for="f in acionamento.inviabilidade.fotos"
                :key="f.id"
                :tamanho="96"
                :url="urlFoto(f)"
                :cor="f.cor"
                :horario="f.horario"
              />
            </div>
          </section>
          <section v-for="d in acionamento.demandas" :key="d.id" class="cartao demanda">
            <div class="cab-demanda">
              <span class="bolinha" :style="{ background: d.cor }" />
              <h2 class="nome-demanda">{{ d.tipoNome }}</h2>
              <span class="prog">{{ progressoDemanda(d.etapas) }}</span>
            </div>
            <div v-for="e in d.etapas" :key="e.id" class="etapa">
              <span
                class="caixa"
                :class="{ feita: e.feita }"
                role="img"
                :aria-label="e.feita ? 'Feita' : 'Pendente'"
              >
                <RussoIcone v-if="e.feita" nome="check" :tamanho="16" />
              </span>
              <div class="corpo-etapa">
                <div class="texto" :class="{ pendente: !e.feita }">{{ e.texto }}</div>
                <div v-if="e.comentario" class="comentario">{{ e.comentario }}</div>
                <div v-if="e.fotos.length" class="fotos">
                  <MiniaturaFoto
                    v-for="f in e.fotos"
                    :key="f.id"
                    :tamanho="80"
                    :url="urlFoto(f)"
                    :cor="f.cor"
                    :horario="f.horario"
                  />
                </div>
              </div>
            </div>
          </section>
          <section v-if="temConclusao" class="cartao conclusao">
            <h2 class="titulo-cartao">Conclusão do serviço</h2>
            <div v-if="acionamento.comentarioConclusao" class="comentario-final">
              {{ acionamento.comentarioConclusao }}
            </div>
            <div class="fotos">
              <MiniaturaFoto
                v-for="f in acionamento.fotosConclusao"
                :key="f.id"
                :tamanho="120"
                :url="urlFoto(f)"
                :cor="f.cor"
                :horario="f.horario"
              />
            </div>
          </section>
        </div>
        <div class="lateral">
          <CartaoDecisao
            v-if="acionamento.status === 'aguardando'"
            v-model:observacao="observacao"
            :inviavel="acionamento.inviavel"
            :enviando="enviando"
            @decidir="decidir"
          />
          <div v-if="decisaoAnterior" class="cartao ultima">
            <div class="rotulo-ultima">{{ decisaoAnterior.rotulo }}</div>
            <div v-if="decisaoAnterior.motivo" class="motivo-ultima">
              {{ decisaoAnterior.motivo }}
            </div>
          </div>
          <section class="cartao historico">
            <h2 class="titulo-cartao">Histórico</h2>
            <div v-for="(item, i) in historico" :key="i" class="evento">
              <span class="ponto" :style="{ background: item.cor }" />
              <div class="evento-corpo">
                <div class="evento-titulo">{{ item.titulo }}</div>
                <div class="evento-quando">{{ item.quando }}</div>
                <div v-if="item.nota" class="evento-nota">{{ item.nota }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </PaginaGestor>
</template>

<style scoped>
.voltar {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.voltar:hover {
  color: var(--kgb-secundario);
}
.seta {
  transform: rotate(180deg);
  color: var(--kgb-tinta);
}
.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}
.identificacao {
  flex: 1;
  min-width: 220px;
}
.codigo {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.colunas {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.principal {
  flex: 2 1 400px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lateral {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cartao {
  background: var(--kgb-branco);
  border-radius: 16px;
}
.principal .cartao {
  padding: 20px 24px;
}
.lateral .cartao {
  padding: 20px;
}
.aviso {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
.info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
}
.rotulo {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.valor {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.endereco {
  font-size: 14px;
  font-weight: 600;
}
.prestador {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inviabilidade {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--kgb-inviavel-fundo);
}
.titulo-inv {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-inviavel);
}
.texto-inv {
  font-size: 14px;
  line-height: 20px;
  color: var(--kgb-texto);
}
.fotos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.demanda {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cab-demanda {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
}
.bolinha {
  width: 10px;
  height: 10px;
  border-radius: 5px;
}
.nome-demanda {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.prog {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.etapa {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--kgb-divisor);
}
.caixa {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1.5px solid var(--kgb-linha);
  flex: none;
}
.caixa.feita {
  border: 0;
  background: var(--kgb-primaria);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.corpo-etapa {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.texto {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.texto.pendente {
  color: var(--kgb-terciario);
}
.comentario {
  font-size: 13px;
  color: var(--kgb-texto);
  background: var(--kgb-superficie1);
  border-radius: 10px;
  padding: 8px 12px;
}
.conclusao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.titulo-cartao {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.comentario-final {
  font-size: 14px;
  color: var(--kgb-texto);
}
.ultima {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rotulo-ultima {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.motivo-ultima {
  font-size: 14px;
  color: var(--kgb-texto);
}
.historico {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.evento {
  display: flex;
  gap: 12px;
}
.ponto {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  margin-top: 5px;
  flex: none;
}
.evento-corpo {
  min-width: 0;
}
.evento-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.evento-quando {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.evento-nota {
  font-size: 13px;
  color: var(--kgb-texto);
  margin-top: 4px;
}
</style>
```

Em `tools/visual/casos-gestor.ts`, acrescentar os casos de Detalhe (importar `Passo` de `./tipos`):
```ts
/**
 * Abre um acionamento pelo título a partir de um filtro da lista. O protótipo reaproveita a
 * rolagem da lista no Detalhe; o segundo clique no título (já no Detalhe) faz o navegador rolar até
 * ele, e o protótipo e o app ficam os dois no topo.
 */
function abrirPeloTitulo(filtro: string, titulo: string): Passo[] {
  return [
    { clicar: filtro },
    { clicar: titulo, papel: 'text' },
    { clicar: titulo, papel: 'text' },
  ]
}

const DETALHES = [
  { caso: 'aguardando', filtro: 'Aguardando 3', titulo: 'Revisão elétrica e troca de disjuntor' },
  { caso: 'reprovado', filtro: 'Reprovados 2', titulo: 'Revisão elétrica anual' },
  { caso: 'aprovado', filtro: 'Finalizados 57', titulo: 'Reparo no forro da sala' },
  { caso: 'inviavel', filtro: 'Finalizados 57', titulo: 'Ponto de luz na garagem' },
]

const casosDetalhe: Caso[] = (['gw', 'gm'] as const).flatMap((modo) =>
  DETALHES.map((d) => ({
    nome: `gestor-${modo === 'gw' ? 'web' : 'mobile'}-detalhe-${d.caso}`,
    modo,
    navegarPrototipo: 'Acionamentos',
    app: 'gestor' as const,
    rota: '/acionamentos',
    passos: abrirPeloTitulo(d.filtro, d.titulo),
    regioes: [telaInteira(modo)],
  })),
)
```
e `...casosDetalhe` no fim de `CASOS_GESTOR`.

- [ ] **Step 5: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test && pnpm --filter @kgb/gestor typecheck`
Expected: PASS.

- [ ] **Step 6: Comparar com o protótipo**

Run: `pnpm db:seed && URL_GESTOR=http://localhost:5175 pnpm visual -- --app=gestor --caso=gestor-web-detalhe-aguardando` (e os outros sete).
Expected: ✓ nas oito regiões (nos dois casos do Carlos no web, a diferença inclui o botão "Ver no app do prestador", que não é implementado).

- [ ] **Step 7: Commit**

```bash
git add apps/gestor tools/visual/casos-gestor.ts
git commit -m "feat(gestor): detalhe do acionamento com decisão e histórico"
```

---

### Task 6: Novo acionamento (modal)

**Files:**
- Create: `apps/gestor/src/acionamentos/novo/{formulario.ts,ModalNovoAcionamento.vue}`, `apps/gestor/src/paginas/PaginaPainel.test.ts`
- Modify: `apps/gestor/src/layouts/LayoutGestor.vue`, `apps/gestor/src/paginas/PaginaPainel.vue`, `apps/gestor/src/componentes/CabecalhoPagina.vue`, `tools/visual/casos-gestor.ts`
- Test: `apps/gestor/src/acionamentos/novo/formulario.test.ts`, `apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.test.ts`, `apps/gestor/src/paginas/PaginaPainel.test.ts`, `apps/gestor/src/layouts/LayoutGestor.test.ts`

**Interfaces:**
- Consumes: `usarTipos`, `usarPrestadoresAtivos`, `usarCriarAcionamento`, `reiniciarLista`, `toastGestor`, `novoAcionamento`, `dataISO`.
- Produces: `FormularioAcionamento`, `PRESTADOR_PADRAO`, `prestadorPadrao()`, `formularioInicial()`, `formularioValido()`, `alternarTipo()`, `previaChecklist()`, `rotuloContagem()`, `rotuloPrestador()`, `corpoDoFormulario()`; `<ModalNovoAcionamento @fechar>`; `CabecalhoPagina` com `alinhamento?: 'centro' | 'base'`.

Medidas (protótipo, linhas 528–593): sobreposição `absolute; inset 0`, `rgba(28,18,67,.8)`, `z-index 20`, `padding 24px 12px`, `align-items flex-start`, rolagem própria. Painel `max-width 920`, raio 24, `padding 24`, coluna `gap 20`. Cabeçalho `gap 12`: título 18/700 `#2C3143`; fechar 36px, raio 12, `#EFF1F3`, ícone 18 (padding padrão do botão). Colunas `flex-wrap`, `gap 24`: campos `3 1 300px` (`gap 14`); prévia `2 1 260px`, `#F9F9F9`, raio 16, `padding 20`, `gap 14`. Rótulos 13/600 `#363853` com `gap 6`. Inputs 48px, borda `#E5E5E5`, raio 16, `padding 0 16px` (data, horas e select `0 14px`), 14/500, foco `#262A3B`; select com fundo branco. Data `2 1 150px`, horas `1 1 100px`, `gap 12`. Tipos: 36px, `padding 0 12px`, borda 1px, pill, 13/600, `gap 6`, bolinha 8; escolhido `#0069BD`/`#E6F0FA`/`#004E8F`, livre `#E5E5E5`/branco/`#363853`. Prévia: título 16/700; contagem 12 `#8F8D8D`; vazio 14 `#8F8D8D` `padding 16px 0`; tipo `gap 6`, nome 13/700 com bolinha 8 (`gap 8`); etapa 13 `#363853`, `padding 6px 10px`, branco, raio 10, `gap 10`, número `#8F8D8D` 600 com 14px de largura. Ações à direita, `gap 12`: Cancelar 48px `padding 0 20px` `#EFF1F3`/`#363853`; Enviar 48px `padding 0 24px`, válido `#0069BD`/branco, inválido `#CCE1F2`/`#004E8F`.

- [ ] **Step 1: Testes da lógica (falham)**

`apps/gestor/src/acionamentos/novo/formulario.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { PRESTADORES, TIPOS } from '../../../test/fixtures'
import {
  alternarTipo,
  corpoDoFormulario,
  formularioInicial,
  formularioValido,
  prestadorPadrao,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
  type FormularioAcionamento,
} from './formulario'

const valido = (dados: Partial<FormularioAcionamento> = {}): FormularioAcionamento => ({
  ...formularioInicial('2026-09-28', PRESTADORES),
  titulo: 'Vazamento no banheiro social',
  tipoIds: ['t1'],
  cliente: 'Edifício Aurora',
  endereco: 'Rua Harmonia, 410 · Vila Madalena',
  ...dados,
})

describe('formulário do Novo acionamento', () => {
  it('abre com hoje, 09:00–11:00 e o Carlos (p1)', () => {
    expect(formularioInicial('2026-09-28', PRESTADORES)).toEqual({
      titulo: '',
      tipoIds: [],
      cliente: '',
      endereco: '',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      prestadorId: 'p1',
    })
  })
  it('sem o Carlos entre os ativos, escolhe o primeiro; sem prestadores, nenhum', () => {
    expect(prestadorPadrao(PRESTADORES.filter((p) => p.id !== 'p1'))).toBe('p2')
    expect(prestadorPadrao([])).toBe('')
  })
  it('é válido com título, tipo, cliente, endereço, data, início < fim e prestador', () => {
    expect(formularioValido(valido())).toBe(true)
  })
  it.each([
    ['título vazio', { titulo: '   ' }],
    ['sem tipo', { tipoIds: [] }],
    ['cliente vazio', { cliente: '' }],
    ['endereço vazio', { endereco: ' ' }],
    ['sem data', { data: '' }],
    ['início igual ao fim', { inicio: '11:00', fim: '11:00' }],
    ['início depois do fim', { inicio: '14:00', fim: '09:30' }],
    ['sem prestador', { prestadorId: '' }],
  ])('é inválido com %s', (_, dados) => {
    expect(formularioValido(valido(dados))).toBe(false)
  })
  it('liga e desliga um tipo, guardando a ordem de escolha', () => {
    expect(alternarTipo(['t1'], 't6')).toEqual(['t1', 't6'])
    expect(alternarTipo(['t1', 't6'], 't1')).toEqual(['t6'])
  })
  it('monta a prévia do checklist na ordem de escolha, com a contagem', () => {
    const previa = previaChecklist(TIPOS, ['t6', 't1'])
    expect(previa.map((t) => [t.nome, t.etapas.length])).toEqual([
      ['Reparo em gesso', 4],
      ['Vazamento', 5],
    ])
    expect(rotuloContagem(previa)).toBe('9 itens no checklist')
    expect(rotuloContagem([])).toBe('0 itens no checklist')
    expect(rotuloContagem(previaChecklist(TIPOS, ['t9']))).toBe('1 item no checklist')
  })
  it('rótulo do prestador: "Nome · Região", ou só o nome sem região', () => {
    expect(PRESTADORES.map(rotuloPrestador)).toEqual([
      'Ana Ribeiro · Zona Sul',
      'Carlos Mendes · Zona Oeste',
      'Pedro Lima',
    ])
  })
  it('manda os textos aparados para a API', () => {
    expect(
      corpoDoFormulario(valido({ titulo: '  Vazamento ', cliente: ' Aurora ', endereco: ' Rua A ' })),
    ).toEqual({
      titulo: 'Vazamento',
      cliente: 'Aurora',
      endereco: 'Rua A',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
  })
})
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/novo/formulario.test.ts`
Expected: FAIL (`./formulario` não existe).

- [ ] **Step 2: Implementação da lógica**

`apps/gestor/src/acionamentos/novo/formulario.ts`:
```ts
import type { PrestadorOpcao, TipoDemanda } from '@kgb/api-client'
import type { NovoAcionamento } from '../dados'

export interface FormularioAcionamento {
  titulo: string
  tipoIds: string[]
  cliente: string
  endereco: string
  data: string
  inicio: string
  fim: string
  prestadorId: string
}

/** O protótipo abre o formulário com o Carlos (p1). Sem ele entre os ativos, vale o primeiro. */
export const PRESTADOR_PADRAO = 'p1'

export function prestadorPadrao(prestadores: readonly PrestadorOpcao[]): string {
  return prestadores.find((p) => p.id === PRESTADOR_PADRAO)?.id ?? prestadores[0]?.id ?? ''
}

export function formularioInicial(
  hoje: string,
  prestadores: readonly PrestadorOpcao[],
): FormularioAcionamento {
  return {
    titulo: '',
    tipoIds: [],
    cliente: '',
    endereco: '',
    data: hoje,
    inicio: '09:00',
    fim: '11:00',
    prestadorId: prestadorPadrao(prestadores),
  }
}

/** Título, ≥ 1 tipo, cliente, endereço, data, início < fim (HH:MM) e prestador. */
export function formularioValido(f: FormularioAcionamento): boolean {
  return Boolean(
    f.titulo.trim() &&
      f.tipoIds.length &&
      f.cliente.trim() &&
      f.endereco.trim() &&
      f.data &&
      f.inicio &&
      f.fim &&
      f.inicio < f.fim &&
      f.prestadorId,
  )
}

export function alternarTipo(tipoIds: readonly string[], id: string): string[] {
  return tipoIds.includes(id) ? tipoIds.filter((t) => t !== id) : [...tipoIds, id]
}

export interface PreviaTipo {
  id: string
  nome: string
  cor: string
  etapas: readonly string[]
}

/** O checklist que será copiado, na ordem em que os tipos foram escolhidos. */
export function previaChecklist(
  tipos: readonly TipoDemanda[],
  tipoIds: readonly string[],
): PreviaTipo[] {
  return tipoIds.flatMap((id) => {
    const t = tipos.find((x) => x.id === id)
    return t ? [{ id: t.id, nome: t.nome, cor: t.cor, etapas: t.checklist }] : []
  })
}

export function rotuloContagem(previa: readonly PreviaTipo[]): string {
  const n = previa.reduce((soma, t) => soma + t.etapas.length, 0)
  return `${n} ${n === 1 ? 'item' : 'itens'} no checklist`
}

export function rotuloPrestador(p: PrestadorOpcao): string {
  return p.regiao ? `${p.nome} · ${p.regiao}` : p.nome
}

export function corpoDoFormulario(f: FormularioAcionamento): NovoAcionamento {
  return {
    titulo: f.titulo.trim(),
    cliente: f.cliente.trim(),
    endereco: f.endereco.trim(),
    data: f.data,
    inicio: f.inicio,
    fim: f.fim,
    tipoIds: [...f.tipoIds],
    prestadorId: f.prestadorId,
  }
}
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/novo/formulario.test.ts`
Expected: PASS.

- [ ] **Step 3: Testes dos componentes (falham)**

`apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.test.ts`:
```ts
import { dataISO } from '@kgb/ui'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi } from '../../../test/api-falsa'
import { PRESTADORES, resumo, TIPOS } from '../../../test/fixtures'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import { toastGestor } from '../../toast'
import { estadoLista } from '../estadoLista'
import ModalNovoAcionamento from './ModalNovoAcionamento.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('ModalNovoAcionamento', () => {
  let simulada: ReturnType<typeof simularApi>
  let criar: () => { data?: unknown; error?: unknown; status?: number }
  beforeEach(() => {
    toastGestor.mensagem.value = null
    criar = () => ({ data: resumo({ id: 'a2000', prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' } }) })
    simulada = simularApi(api, {
      'GET /api/tipos': TIPOS,
      'GET /api/prestadores': PRESTADORES,
      'GET /api/acionamentos': [],
      'GET /api/acionamentos/contagem': {},
      'POST /api/acionamentos': () => criar(),
    })
  })

  const abrir = () => montar(ModalNovoAcionamento, { rota: '/painel' })
  const tipo = (tela: Awaited<ReturnType<typeof abrir>>['tela'], nome: string) =>
    tela.findAll('button.tipo').find((b) => b.text() === nome)!
  async function preencher(tela: Awaited<ReturnType<typeof abrir>>['tela']) {
    const [titulo, cliente, endereco] = tela.findAll('input:not([type])')
    await titulo!.setValue('  Vazamento no banheiro social ')
    await cliente!.setValue('Edifício Aurora')
    await endereco!.setValue('Rua Harmonia, 410 · Vila Madalena')
    await tipo(tela, 'Vazamento').trigger('click')
  }

  it('é um diálogo com o título do protótipo', async () => {
    const { tela } = await abrir()
    expect(tela.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(tela.find('#novo-titulo').text()).toBe('Novo acionamento')
  })

  it('abre com hoje, 09:00–11:00 e o Carlos escolhido entre os ativos', async () => {
    const { tela } = await abrir()
    expect((tela.find('input[type="date"]').element as HTMLInputElement).value).toBe(dataISO(new Date()))
    const [inicio, fim] = tela.findAll('input[type="time"]')
    expect([(inicio!.element as HTMLInputElement).value, (fim!.element as HTMLInputElement).value]).toEqual(['09:00', '11:00'])
    expect((tela.find('select').element as HTMLSelectElement).value).toBe('p1')
    expect(tela.findAll('option').map((o) => o.text())).toEqual([
      'Ana Ribeiro · Zona Sul',
      'Carlos Mendes · Zona Oeste',
      'Pedro Lima',
    ])
  })

  it('"Enviar ao prestador" fica desabilitado até o formulário ficar válido', async () => {
    const { tela } = await abrir()
    const enviar = () => tela.find('button.enviar')
    expect(enviar().attributes('aria-disabled')).toBe('true')
    expect(enviar().classes()).toContain('inativo')
    await enviar().trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(0)
    await preencher(tela)
    expect(enviar().attributes('aria-disabled')).toBe('false')
    expect(enviar().classes()).not.toContain('inativo')
    await tela.findAll('input[type="time"]')[1]!.setValue('08:00')
    expect(enviar().attributes('aria-disabled')).toBe('true')
  })

  it('mostra o checklist gerado na ordem em que os tipos são escolhidos', async () => {
    const { tela } = await abrir()
    expect(tela.find('.previa-contagem').text()).toBe('0 itens no checklist')
    expect(tela.find('.previa-vazia').text()).toBe(
      'Escolha um ou mais tipos de demanda para montar o checklist.',
    )
    await tipo(tela, 'Vazamento').trigger('click')
    await tipo(tela, 'Reparo em gesso').trigger('click')
    expect(tipo(tela, 'Vazamento').classes()).toContain('escolhido')
    expect(tipo(tela, 'Vazamento').attributes('aria-pressed')).toBe('true')
    expect(tela.findAll('.previa-nome').map((n) => n.text())).toEqual(['Vazamento', 'Reparo em gesso'])
    expect(tela.find('.previa-contagem').text()).toBe('9 itens no checklist')
    expect(tela.findAll('.previa-etapa')[0]!.text()).toBe('1Localizar ponto do vazamento')
    expect(tela.find('.previa-vazia').exists()).toBe(false)
  })

  it('cria, avisa, fecha e volta para a lista em "Todos"', async () => {
    estadoLista.filtro = 'reprovado'
    estadoLista.busca = 'aurora'
    const { tela, router } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toEqual({
      titulo: 'Vazamento no banheiro social',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      data: dataISO(new Date()),
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
    expect(toastGestor.mensagem.value).toBe('Acionamento enviado para Carlos Mendes')
    expect(tela.emitted('fechar')).toHaveLength(1)
    expect(router.currentRoute.value.name).toBe('acionamentos')
    expect({ ...estadoLista }).toEqual({ filtro: 'todos', busca: '' })
  })

  it('dois cliques em enviar criam um acionamento só', async () => {
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(1)
  })

  it('erro da API: mostra a mensagem e mantém o modal aberto', async () => {
    criar = () => erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo')
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escolha um prestador ativo')
    expect(tela.emitted('fechar')).toBeUndefined()
  })

  it('fecha pelo X, por Cancelar e pela tecla Esc', async () => {
    const { tela } = await abrir()
    await tela.find('button.fechar').trigger('click')
    await tela.find('button.cancelar').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tela.emitted('fechar')).toHaveLength(3)
  })
})
```

`apps/gestor/src/paginas/PaginaPainel.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { novoAcionamento } from '../acionamentos/novo/estado'
import PaginaPainel from './PaginaPainel.vue'

describe('PaginaPainel', () => {
  it('"Novo acionamento" abre o modal', async () => {
    novoAcionamento.fechar()
    const painel = mount(PaginaPainel)
    expect(painel.find('h1').text()).toBe('Seu painel')
    await painel.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
  })
})
```

Acrescentar em `apps/gestor/src/layouts/LayoutGestor.test.ts`:
```ts
import { novoAcionamento } from '../acionamentos/novo/estado'

  it('mostra o modal Novo acionamento quando ele é aberto', async () => {
    simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/tipos': [],
      'GET /api/prestadores': [],
    })
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    expect(tela.find('[role="dialog"]').exists()).toBe(false)
    novoAcionamento.abrir()
    await aguardar()
    expect(tela.find('.coluna [role="dialog"]').exists()).toBe(true)
    novoAcionamento.fechar()
  })
```

Run: `pnpm --filter @kgb/gestor exec vitest run src/acionamentos/novo src/paginas src/layouts`
Expected: FAIL (`ModalNovoAcionamento.vue` não existe; o Painel não tem o botão; o layout não mostra o modal).

- [ ] **Step 4: Implementação dos componentes**

`apps/gestor/src/acionamentos/novo/ModalNovoAcionamento.vue`:
```vue
<script setup lang="ts">
import { dataISO, RussoIcone } from '@kgb/ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '../../erros'
import { toastGestor } from '../../toast'
import { usarCriarAcionamento, usarPrestadoresAtivos, usarTipos } from '../dados'
import { reiniciarLista } from '../estadoLista'
import {
  alternarTipo,
  corpoDoFormulario,
  formularioInicial,
  formularioValido,
  prestadorPadrao,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
} from './formulario'

const emit = defineEmits<{ fechar: [] }>()
const router = useRouter()
const { data: tipos } = usarTipos()
const { data: prestadores } = usarPrestadoresAtivos()
const { mutateAsync: criar, isPending: criando } = usarCriarAcionamento()

const form = reactive(formularioInicial(dataISO(new Date()), prestadores.value ?? []))
// Os prestadores podem chegar depois de o modal abrir.
watch(prestadores, (lista) => {
  if (lista && !form.prestadorId) form.prestadorId = prestadorPadrao(lista)
})

const valido = computed(() => formularioValido(form))
const bloqueado = computed(() => !valido.value || criando.value)
const previa = computed(() => previaChecklist(tipos.value ?? [], form.tipoIds))

async function enviar() {
  if (bloqueado.value) return
  try {
    const criado = await criar(corpoDoFormulario(form))
    reiniciarLista()
    emit('fechar')
    toastGestor.mostrar(`Acionamento enviado para ${criado.prestador.nome}`)
    await router.push({ name: 'acionamentos' })
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  }
}

const painel = ref<HTMLElement>()
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
}
onMounted(() => {
  painel.value?.focus()
  document.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <div class="sobreposicao">
    <div
      ref="painel"
      class="painel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novo-titulo"
      tabindex="-1"
    >
      <div class="cabecalho">
        <h2 id="novo-titulo" class="titulo">Novo acionamento</h2>
        <button type="button" class="fechar" aria-label="Fechar" @click="emit('fechar')">
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div class="colunas">
        <div class="campos">
          <label class="campo"
            >Título do acionamento
            <input
              v-model="form.titulo"
              class="entrada"
              placeholder="Ex.: Vazamento no banheiro social"
            />
          </label>
          <div class="grupo-tipos">
            <div id="novo-tipos" class="rotulo">Tipos de demanda</div>
            <div class="tipos" role="group" aria-labelledby="novo-tipos">
              <button
                v-for="t in tipos ?? []"
                :key="t.id"
                type="button"
                class="tipo"
                :class="{ escolhido: form.tipoIds.includes(t.id) }"
                :aria-pressed="form.tipoIds.includes(t.id)"
                @click="form.tipoIds = alternarTipo(form.tipoIds, t.id)"
              >
                <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
              </button>
            </div>
          </div>
          <label class="campo"
            >Cliente
            <input v-model="form.cliente" class="entrada" placeholder="Nome do cliente" />
          </label>
          <label class="campo"
            >Endereço
            <input v-model="form.endereco" class="entrada" placeholder="Rua, número · bairro" />
          </label>
          <div class="horarios">
            <label class="campo data"
              >Data
              <input v-model="form.data" type="date" class="entrada compacta" />
            </label>
            <label class="campo hora"
              >Início
              <input v-model="form.inicio" type="time" class="entrada compacta" />
            </label>
            <label class="campo hora"
              >Fim
              <input v-model="form.fim" type="time" class="entrada compacta" />
            </label>
          </div>
          <label class="campo"
            >Prestador
            <select v-model="form.prestadorId" class="entrada compacta selecao">
              <option v-for="p in prestadores ?? []" :key="p.id" :value="p.id">
                {{ rotuloPrestador(p) }}
              </option>
            </select>
          </label>
        </div>
        <div class="previa">
          <div>
            <h3 class="previa-titulo">Checklist gerado</h3>
            <div class="previa-contagem">{{ rotuloContagem(previa) }}</div>
          </div>
          <div v-if="!previa.length" class="previa-vazia">
            Escolha um ou mais tipos de demanda para montar o checklist.
          </div>
          <div v-for="t in previa" :key="t.id" class="previa-tipo">
            <div class="previa-nome">
              <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
            </div>
            <div v-for="(etapa, i) in t.etapas" :key="i" class="previa-etapa">
              <span class="numero">{{ i + 1 }}</span>{{ etapa }}
            </div>
          </div>
        </div>
      </div>
      <div class="acoes">
        <button type="button" class="cancelar" @click="emit('fechar')">Cancelar</button>
        <button
          type="button"
          class="enviar"
          :class="{ inativo: !valido }"
          :aria-disabled="bloqueado"
          @click="enviar"
        >
          Enviar ao prestador
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sobreposicao {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: var(--kgb-sobreposicao);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  padding: 24px 12px;
}
.painel {
  width: 100%;
  max-width: 920px;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.painel:focus {
  outline: none;
}
.cabecalho {
  display: flex;
  align-items: center;
  gap: 12px;
}
.titulo {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
/* Sem padding explícito: fica o padrão do navegador para <button>, como no protótipo. */
.fechar {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-superficie2);
  color: var(--kgb-tinta);
  display: flex;
  align-items: center;
  justify-content: center;
}
.colunas {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}
.campos {
  flex: 3 1 300px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.entrada {
  height: 48px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  outline: 0;
}
.entrada.compacta {
  padding: 0 14px;
}
.entrada:focus {
  border-color: var(--kgb-tinta);
}
.selecao {
  background: var(--kgb-branco);
}
.horarios {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.data {
  flex: 2 1 150px;
}
.hora {
  flex: 1 1 100px;
}
.grupo-tipos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rotulo {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.tipos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tipo {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 999px;
  background: var(--kgb-branco);
  color: var(--kgb-texto);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tipo.escolhido {
  border-color: var(--kgb-primaria);
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
}
.bolinha {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}
.previa {
  flex: 2 1 260px;
  min-width: 0;
  background: var(--kgb-superficie1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.previa-titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.previa-contagem {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.previa-vazia {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 16px 0;
}
.previa-tipo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.previa-nome {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.previa-etapa {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: var(--kgb-texto);
  padding: 6px 10px;
  background: var(--kgb-branco);
  border-radius: 10px;
}
.numero {
  width: 14px;
  color: var(--kgb-terciario);
  font-weight: 600;
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.cancelar,
.enviar {
  height: 48px;
  border: 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.cancelar {
  padding: 0 20px;
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.enviar {
  padding: 0 24px;
  background: var(--kgb-primaria);
  color: #fff;
}
.enviar.inativo {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
}
</style>
```

Em `apps/gestor/src/layouts/LayoutGestor.vue`: importar `ModalNovoAcionamento` e `novoAcionamento`, criar `const modalAberto = novoAcionamento.aberto` e, dentro de `.coluna`, antes do `AvisoToast`:
```vue
      <ModalNovoAcionamento v-if="modalAberto" @fechar="novoAcionamento.fechar()" />
```

Em `apps/gestor/src/componentes/CabecalhoPagina.vue`: prop `alinhamento?: 'centro' | 'base'`, classe `base` no `.cabecalho` quando `alinhamento === 'base'`, com `.cabecalho.base { align-items: flex-end; }` (o cabeçalho do Painel alinha pela base).

`apps/gestor/src/paginas/PaginaPainel.vue`:
```vue
<script setup lang="ts">
import { dataPorExtenso, EmConstrucao } from '@kgb/ui'
import BotaoNovoAcionamento from '../acionamentos/novo/BotaoNovoAcionamento.vue'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'

const hoje = dataPorExtenso(new Date())
</script>

<template>
  <PaginaGestor :largura="1280" :espaco="20">
    <CabecalhoPagina :sobretitulo="hoje" titulo="Seu painel" alinhamento="base">
      <template #acoes><BotaoNovoAcionamento /></template>
    </CabecalhoPagina>
    <EmConstrucao />
  </PaginaGestor>
</template>
```

Em `tools/visual/casos-gestor.ts`, acrescentar:
```ts
  {
    nome: 'gestor-web-novo-acionamento',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Novo acionamento' }],
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-web-novo-acionamento-tipos',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Novo acionamento' }, { clicar: 'Vazamento' }, { clicar: 'Reparo em gesso' }],
    regioes: [telaWeb],
  },
```

- [ ] **Step 5: Rodar os testes (passam)**

Run: `pnpm --filter @kgb/gestor test && pnpm --filter @kgb/gestor typecheck`
Expected: PASS.

- [ ] **Step 6: Comparar com o protótipo**

Run: `pnpm db:seed && URL_GESTOR=http://localhost:5175 pnpm visual -- --app=gestor --caso=gestor-web-novo-acionamento` (e `-tipos`), mais `gestor-web-painel` e `gestor-mobile-painel` (o cabeçalho do Painel mudou).
Expected: ✓.

- [ ] **Step 7: Commit**

```bash
git add apps/gestor tools/visual/casos-gestor.ts
git commit -m "feat(gestor): modal Novo acionamento pela lista e pelo Painel"
```

---

### Task 7: Verificação final

- [ ] **Step 1:** `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm --filter @kgb/gestor test` e `pnpm build`, lendo a saída de cada um.
- [ ] **Step 2:** `pnpm db:seed && URL_GESTOR=http://localhost:5175 pnpm visual -- --app=gestor`, todas as regiões ✓.
- [ ] **Step 3:** Roteiro manual contra a API real: criar um acionamento para o Carlos (toast, lista em "Todos", badge inalterado), abrir um aguardando pela fila, reprovar sem motivo (toast), reprovar com motivo (toast, badge −1, "Última decisão"), e conferir o histórico. Depois, `pnpm db:seed`.
- [ ] **Step 4:** Commit das correções de formatação/lint, se houver (`chore(gestor): …`).
