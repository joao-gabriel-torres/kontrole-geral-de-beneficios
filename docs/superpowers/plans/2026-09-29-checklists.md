# Checklists (tipos de demanda) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a tela "Tipos de demanda" do gestor (web e mobile, pixel perfect) funcionando contra `POST/PATCH/DELETE /api/tipos`, com salvamento automático (debounce de 600 ms) e rascunho local.

**Architecture:** regras puras em `apps/api/src/dominio/tipos.ts` (TDD), acesso ao banco em `servicos/tipos.ts` com as escritas em fila por um advisory lock de transação, e rotas OpenAPI em `rotas/tipos.ts`. No gestor, `checklists/regras.ts` (funções puras), `checklists/salvamento.ts` (um "canal" de salvamento com debounce, em série), `checklists/edicao.ts` (rascunhos por tipo: nome e checklist), `checklists/dados.ts` (vue-query) e três componentes (`PaginaChecklists`, `ListaTipos`, `EditorTipo`). A tela reflete o rascunho na hora; o servidor recebe o PATCH 600 ms depois da última alteração.

**Tech Stack:** Hono + @hono/zod-openapi + zod 4, Prisma 7.10.0 (Postgres), Vitest 4, Vue 3.5 + @tanstack/vue-query 5, @vue/test-utils, Playwright + pixelmatch (`tools/visual`).

**Spec:** [`docs/superpowers/specs/2026-09-29-telas-restantes-design.md`](../specs/2026-09-29-telas-restantes-design.md), seção "Checklists (gestor)". Detalhe de medidas e textos: [`2026-09-29-telas-restantes/checklists.md`](../specs/2026-09-29-telas-restantes/checklists.md). Onde os dois divergem, vale o spec.

## Global Constraints

- Arquivos permitidos: `apps/api/src/rotas/tipos.ts`, `apps/api/src/servicos/tipos.ts`, `apps/api/src/dominio/tipos.ts`, `apps/api/src/dominio/erros-tipos.ts` (e testes), `apps/gestor/src/checklists/**`, `tools/visual/casos-checklists.ts`, este plano e os gerados do api-client (`pnpm api:generate`). Nada fora disso (sem dependências novas, sem `pnpm-lock.yaml`, `casos.ts`, `regioes.ts`, `comparar.ts`, `tipos.ts` do visual, `schema.prisma`, `consultas.ts`, `test/**` do gestor, `@kgb/api-client/src/index.ts`).
- Mensagens da API, literais: "Informe o nome do tipo" (422), "Já existe um tipo com esse nome" (409), "Mantenha pelo menos um tipo de demanda" (409).
- Paleta de tipos novos: `['#0069BD','#FC7608','#B37BE7','#F47B50','#FF6A5D','#FFB523','#363853','#47C272'][quantidade de tipos não excluídos % 8]`.
- Limites: nome até 60 caracteres, etapa até 200 (depois do trim).
- Título da página "Tipos de demanda"; aviso "O checklist de cada tipo é copiado para o acionamento quando ele é criado."; contagem no singular corrigido ("1 item", "N itens").
- Debounce de 600 ms. "Subir" na 1ª etapa: opacidade .3, sem `disabled`. "Adicionar etapa" com o campo vazio não faz nada (sem `disabled`, sem erro). Excluir tipo sem confirmação.
- Ícones com `<RussoIcone>`; cores e medidas do CSS inline do protótipo (L264–309).
- Pixel perfect: toda região ≤ 0,2 % da região e ≤ 2 % do conteúdo em `pnpm visual`; divergência se corrige no CSS.
- Commits pequenos em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push, merge ou rebase.

## Review Focus

1. **Espaços no fim do texto enquanto se digita.** Quem digita "Testar " e pausa 600 ms não pode perder o espaço (o servidor devolve com trim). O rascunho do checklist só sai da tela quando o tipo deixa de ser o selecionado; o do nome, quando o campo perde o foco. Teste na Task 5 ("pausa com espaço no fim").
2. **Nome duplicado ou vazio no título.** 409 vira toast; ao sair do campo o nome volta ao último salvo; nome vazio não é enviado. Testes na Task 5.
3. **Duas escritas ao mesmo tempo** (dois cliques em "Adicionar" com o mesmo nome, ou duas exclusões dos dois últimos tipos). O advisory lock põe em fila; um lado recebe 409. Testes de concorrência na Task 2.
4. **Envios fora de ordem.** O segundo PATCH do mesmo campo só sai depois da resposta do primeiro, e cada resposta só atualiza no cache o campo que enviou. Teste na Task 4 ("em série").
5. **Sair da tela com alteração esperando o debounce.** É enviada na hora. Teste na Task 5 ("ao sair da tela").

---

## Mapa de arquivos

```
apps/api/src/dominio/erros-tipos.ts        códigos de erro da frente
apps/api/src/dominio/tipos.ts (+ .test)    regras puras: cor, nome, checklist, duplicado, último tipo
apps/api/src/servicos/tipos.ts             criar/atualizar/excluir com advisory lock
apps/api/src/rotas/tipos.ts (+ .test)      POST/PATCH/DELETE /api/tipos (só gestor)
packages/api-client/openapi.json, src/schema.d.ts   gerados
apps/gestor/src/checklists/regras.ts (+ .test)       rotuloItens, subir/remover/editar/acrescentar etapa, escolherSelecionado
apps/gestor/src/checklists/salvamento.ts (+ .test)   criarCanal<T>: rascunho, debounce 600 ms, em série
apps/gestor/src/checklists/selecao.ts                estado de módulo: tipo selecionado
apps/gestor/src/checklists/dados.ts                  usarTiposDemanda, usarSalvarTipo, usarCriarTipo, usarExcluirTipo
apps/gestor/src/checklists/edicao.ts                 usarEdicaoTipos: canais de nome e checklist por tipo
apps/gestor/src/checklists/ListaTipos.vue            coluna da esquerda
apps/gestor/src/checklists/EditorTipo.vue            coluna da direita
apps/gestor/src/checklists/PaginaChecklists.vue (+ .test)
tools/visual/casos-checklists.ts                     casos só de leitura
```

---

### Task 1: Regras puras dos tipos (API)

**Files:**
- Modify: `apps/api/src/dominio/erros-tipos.ts`
- Create: `apps/api/src/dominio/tipos.ts`
- Test: `apps/api/src/dominio/tipos.test.ts`

**Interfaces:**
- Produces: `PALETA_TIPOS`, `LIMITE_NOME_TIPO = 60`, `LIMITE_ETAPA = 200`, `corDoNovoTipo(quantidadeAtivos: number): string`, `normalizarNomeTipo(nome: string): string`, `normalizarChecklist(etapas: readonly string[]): string[]`, `chaveDoNome(nome: string): string`, `exigirNomeLivre(nome, existentes: readonly {id, nome}[], proprioId?: string): void`, `exigirOutroTipoAtivo(quantidadeAtivos: number): void`. Erros: `ErroDominio` com `codigo` em `CodigoErroTipos = 'nome_obrigatorio' | 'nome_duplicado' | 'texto_longo' | 'ultimo_tipo'`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  chaveDoNome,
  corDoNovoTipo,
  exigirNomeLivre,
  exigirOutroTipoAtivo,
  normalizarChecklist,
  normalizarNomeTipo,
} from './tipos'

function erroDe(fn: () => unknown): unknown {
  try {
    fn()
  } catch (erro) {
    return erro
  }
  throw new Error('a função não lançou erro')
}

describe('corDoNovoTipo', () => {
  it('usa a paleta do protótipo pela quantidade de tipos não excluídos', () => {
    expect(corDoNovoTipo(8)).toBe('#0069BD')
    expect(corDoNovoTipo(9)).toBe('#FC7608')
    expect(corDoNovoTipo(2)).toBe('#B37BE7')
    expect(corDoNovoTipo(15)).toBe('#47C272')
  })
})

describe('normalizarNomeTipo', () => {
  it('tira os espaços das pontas', () => {
    expect(normalizarNomeTipo('  Jardinagem  ')).toBe('Jardinagem')
  })
  it('recusa nome vazio (422)', () => {
    expect(erroDe(() => normalizarNomeTipo('   '))).toMatchObject({
      codigo: 'nome_obrigatorio',
      message: 'Informe o nome do tipo',
      status: 422,
    })
  })
  it('aceita até 60 caracteres depois do trim', () => {
    expect(normalizarNomeTipo(` ${'a'.repeat(60)} `)).toHaveLength(60)
    expect(erroDe(() => normalizarNomeTipo('a'.repeat(61)))).toMatchObject({
      codigo: 'texto_longo',
      status: 422,
    })
  })
})

describe('normalizarChecklist', () => {
  it('faz trim e descarta as etapas vazias', () => {
    expect(normalizarChecklist([' Avaliar ', '', '   ', 'Testar'])).toEqual(['Avaliar', 'Testar'])
  })
  it('aceita etapa de até 200 caracteres', () => {
    expect(normalizarChecklist(['b'.repeat(200)])).toHaveLength(1)
    expect(erroDe(() => normalizarChecklist(['b'.repeat(201)]))).toMatchObject({
      codigo: 'texto_longo',
      status: 422,
    })
  })
})

describe('exigirNomeLivre', () => {
  const existentes = [
    { id: 't2', nome: 'Revisão elétrica' },
    { id: 't5', nome: 'Pintura' },
  ]
  it('compara sem acentos e sem maiúsculas (409)', () => {
    expect(chaveDoNome(' Revisão ELÉTRICA ')).toBe('revisao eletrica')
    for (const nome of ['pintura', 'Revisao eletrica']) {
      expect(erroDe(() => exigirNomeLivre(nome, existentes))).toMatchObject({
        codigo: 'nome_duplicado',
        message: 'Já existe um tipo com esse nome',
        status: 409,
      })
    }
  })
  it('o próprio tipo não conta (renomear para outra grafia)', () => {
    expect(() => exigirNomeLivre('PINTURA', existentes, 't5')).not.toThrow()
  })
  it('nome diferente passa', () => {
    expect(() => exigirNomeLivre('Pintura externa', existentes)).not.toThrow()
  })
})

describe('exigirOutroTipoAtivo', () => {
  it('recusa excluir o último tipo ativo (409)', () => {
    expect(erroDe(() => exigirOutroTipoAtivo(1))).toMatchObject({
      codigo: 'ultimo_tipo',
      message: 'Mantenha pelo menos um tipo de demanda',
      status: 409,
    })
    expect(() => exigirOutroTipoAtivo(2)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kgb/api exec vitest run src/dominio/tipos.test.ts`
Expected: FAIL (`Cannot find module './tipos'`).

- [ ] **Step 3: Write minimal implementation**

`apps/api/src/dominio/erros-tipos.ts`:

```ts
/** Códigos de ErroDominio da frente de tipos (acrescente aqui os novos). */
export type CodigoErroTipos = 'nome_obrigatorio' | 'nome_duplicado' | 'texto_longo' | 'ultimo_tipo'
```

`apps/api/src/dominio/tipos.ts`:

```ts
import { ErroDominio } from './acionamento'

/** Cores dos tipos novos, na ordem do protótipo (addType, Acionamentos.dc.html L1014). */
export const PALETA_TIPOS = [
  '#0069BD', '#FC7608', '#B37BE7', '#F47B50', '#FF6A5D', '#FFB523', '#363853', '#47C272',
] as const
export const LIMITE_NOME_TIPO = 60
export const LIMITE_ETAPA = 200

export function corDoNovoTipo(quantidadeAtivos: number): string {
  return PALETA_TIPOS[quantidadeAtivos % PALETA_TIPOS.length]!
}

export function normalizarNomeTipo(nome: string): string {
  const aparado = nome.trim()
  if (!aparado) throw new ErroDominio('nome_obrigatorio', 'Informe o nome do tipo')
  if (aparado.length > LIMITE_NOME_TIPO) {
    throw new ErroDominio('texto_longo', `O nome pode ter até ${LIMITE_NOME_TIPO} caracteres`)
  }
  return aparado
}

export function normalizarChecklist(etapas: readonly string[]): string[] {
  const limpas = etapas.map((e) => e.trim()).filter(Boolean)
  if (limpas.some((e) => e.length > LIMITE_ETAPA)) {
    throw new ErroDominio('texto_longo', `Cada etapa pode ter até ${LIMITE_ETAPA} caracteres`)
  }
  return limpas
}

export function chaveDoNome(nome: string): string {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function exigirNomeLivre(
  nome: string,
  existentes: readonly { id: string; nome: string }[],
  proprioId?: string,
): void {
  const chave = chaveDoNome(nome)
  if (existentes.some((t) => t.id !== proprioId && chaveDoNome(t.nome) === chave)) {
    throw new ErroDominio('nome_duplicado', 'Já existe um tipo com esse nome', 409)
  }
}

export function exigirOutroTipoAtivo(quantidadeAtivos: number): void {
  if (quantidadeAtivos <= 1) {
    throw new ErroDominio('ultimo_tipo', 'Mantenha pelo menos um tipo de demanda', 409)
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — mesmo comando; Expected: PASS.
- [ ] **Step 5: Commit** — `feat(api): regras dos tipos de demanda (nome, checklist, cor e último tipo)`.

---

### Task 2: Serviço e rotas POST/PATCH/DELETE /api/tipos

**Files:**
- Create: `apps/api/src/servicos/tipos.ts`
- Modify: `apps/api/src/rotas/tipos.ts`
- Test: `apps/api/src/rotas/tipos.test.ts`
- Generated: `packages/api-client/openapi.json`, `packages/api-client/src/schema.d.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `POST /api/tipos {nome}` → 201 `TipoDemanda`; `PATCH /api/tipos/{id} {nome?, checklist?}` → 200 `TipoDemanda`; `DELETE /api/tipos/{id}` → 200 `{ok: true}`. Schemas OpenAPI `NovoTipo` e `AtualizacaoTipo` (no cliente: `components['schemas']['AtualizacaoTipo']`).

- [ ] **Step 1: Write the failing test** (`rotas/tipos.test.ts`). O arquivo re-semeia antes de cada teste (o `semear` apaga as sessões, então o login vem depois) e no fim.

```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear } from '@kgb/db/seed'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { corpo, criarAcionamento } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

interface Tipo { id: string; nome: string; cor: string; checklist: string[] }
const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

beforeEach(async () => {
  await semear(prisma)
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
})
afterAll(() => semear(prisma))

const pedir = (metodo: string, caminho: string, headers: Record<string, string>, dados?: unknown) =>
  app.request(caminho, {
    method: metodo,
    headers: { ...headers, 'content-type': 'application/json' },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  })
const listar = () => corpo<Tipo[]>(app.request('/api/tipos', { headers: gestora }))
const detalhe = (id: string) =>
  corpo<{ demandas: { tipoNome: string; cor: string; etapas: { texto: string }[] }[] }>(
    app.request(`/api/acionamentos/${id}`, { headers: gestora }),
  )

describe('POST /api/tipos', () => {
  it('cria com trim, checklist vazio e a cor da paleta pela quantidade de tipos', async () => { … 201, '#0069BD'; o segundo '#FC7608'; aparece no fim do GET })
  it('recusa nome vazio (422)', …)                         // nome_obrigatorio, "Informe o nome do tipo"
  it('recusa nome de outro tipo, sem acentos e sem maiúsculas (409)', …) // 'revisao ELETRICA'
  it('recusa nome com mais de 60 caracteres (422)', …)     // texto_longo
  it('dois pedidos iguais ao mesmo tempo: um cria e o outro recebe 409', …) // Promise.all → [201, 409]
  it('é só para a gestão', …)                               // prestador 403, sem login 401
})

describe('PATCH /api/tipos/:id', () => {
  it('renomeia com trim e grava o checklist inteiro, sem as etapas vazias', …)
  it('só o nome: o checklist fica como estava', …)
  it('o próprio nome em outra grafia não conta como duplicado', …)   // t5 → 'PINTURA'
  it('recusa o nome de outro tipo (409) e nome vazio (422)', …)
  it('recusa etapa com mais de 200 caracteres (422)', …)
  it('404 para tipo inexistente ou excluído', …)
  it('editar o tipo não muda o acionamento já criado', …)          // tipoNome, cor e etapas copiados
  it('é só para a gestão', …)
})

describe('DELETE /api/tipos/:id', () => {
  it('exclui (lógico), some da lista e apaga as especialidades', …) // t8: 2 especialidades → 0; excluidoEm preenchido
  it('o acionamento criado antes continua com a cópia', …)
  it('dá para recriar o nome de um tipo excluído', …)
  it('recusa excluir o último tipo ativo (409)', …)                 // ultimo_tipo
  it('dois pedidos ao mesmo tempo nos dois últimos: um exclui e o outro recebe 409', …)
  it('404 para tipo inexistente ou já excluído; só para a gestão', …)
})
```

(O corpo de cada `it` segue a descrição: `pedir(...)`, `expect(r.status)`, `expect(await r.json()).toMatchObject({ erro: { codigo, mensagem } })`. Para "último tipo", `prisma.tipoDemanda.updateMany({ where: { id: { not: 't1' } }, data: { excluidoEm: new Date() } })` antes do DELETE de t1.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/tipos.test.ts`
Expected: FAIL (404 "Rota não encontrada" em POST/PATCH/DELETE).

- [ ] **Step 3: Write minimal implementation**

`apps/api/src/servicos/tipos.ts`:

```ts
import type { Prisma } from '@kgb/db'
import { prisma } from '../db'
import {
  corDoNovoTipo, exigirNomeLivre, exigirOutroTipoAtivo, normalizarChecklist, normalizarNomeTipo,
} from '../dominio/tipos'
import { naoEncontrado } from '../erros'

const CAMPOS = { id: true, nome: true, cor: true, checklist: true } as const

/**
 * Põe em fila as escritas nos tipos até o fim da transação: o nome único (sem acentos e sem
 * maiúsculas), a cor pela quantidade e o "pelo menos um tipo" valem mesmo com pedidos simultâneos.
 */
async function travarTipos(tx: Prisma.TransactionClient): Promise<{ id: string; nome: string }[]> {
  await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext('tipo_demanda'))`
  return tx.tipoDemanda.findMany({ where: { excluidoEm: null }, select: { id: true, nome: true } })
}

export async function criarTipo(dados: { nome: string }) {
  const nome = normalizarNomeTipo(dados.nome)
  return prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    exigirNomeLivre(nome, ativos)
    return tx.tipoDemanda.create({
      data: { nome, cor: corDoNovoTipo(ativos.length), checklist: [] },
      select: CAMPOS,
    })
  })
}

export async function atualizarTipo(id: string, dados: { nome?: string; checklist?: string[] }) {
  const nome = dados.nome === undefined ? undefined : normalizarNomeTipo(dados.nome)
  const checklist = dados.checklist === undefined ? undefined : normalizarChecklist(dados.checklist)
  return prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    if (!ativos.some((t) => t.id === id)) throw naoEncontrado('Tipo de demanda')
    if (nome !== undefined) exigirNomeLivre(nome, ativos, id)
    return tx.tipoDemanda.update({ where: { id }, data: { nome, checklist }, select: CAMPOS })
  })
}

/** Exclusão lógica; os acionamentos guardam a cópia do checklist e não mudam. */
export async function excluirTipo(id: string): Promise<{ ok: true }> {
  await prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    if (!ativos.some((t) => t.id === id)) throw naoEncontrado('Tipo de demanda')
    exigirOutroTipoAtivo(ativos.length)
    await tx.prestadorEspecialidade.deleteMany({ where: { tipoId: id } })
    await tx.tipoDemanda.update({ where: { id }, data: { excluidoEm: new Date() } })
  })
  return { ok: true }
}
```

`apps/api/src/rotas/tipos.ts`:

```ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { IdParam, TipoDemandaSchema } from '../schemas'
import { atualizarTipo, criarTipo, excluirTipo } from '../servicos/tipos'

const apenasGestor = exigePapel('gestor')
const tipo = { description: 'Tipo de demanda', content: { 'application/json': { schema: TipoDemandaSchema } } }
const acesso = { 401: respostaErro('Sem sessão'), 403: respostaErro('Só para a gestão') }

// Os limites de verdade (60 e 200, depois do trim) ficam no domínio, com mensagem própria; estes só barram corpos absurdos.
const NovoTipoSchema = z.object({ nome: z.string().max(500) }).openapi('NovoTipo')
const AtualizacaoTipoSchema = z
  .object({
    nome: z.string().max(500).optional(),
    checklist: z.array(z.string().max(1000)).max(100).optional()
      .openapi({ description: 'O checklist inteiro, na ordem (etapas vazias são descartadas)' }),
  })
  .openapi('AtualizacaoTipo')

const rotaCriar = createRoute({ method: 'post', path: '/api/tipos', tags: ['Catálogo'], summary: 'Cria um tipo de demanda (checklist vazio)', security: [{ Bearer: [] }], middleware: apenasGestor,
  request: { body: { content: { 'application/json': { schema: NovoTipoSchema } }, required: true } },
  responses: { 201: tipo, ...acesso, 409: respostaErro('Nome já usado'), 422: respostaErro('Dados inválidos') } })
const rotaAtualizar = createRoute({ method: 'patch', path: '/api/tipos/{id}', …, request: { params: IdParam, body: … AtualizacaoTipoSchema … },
  responses: { 200: tipo, ...acesso, 404: …, 409: …, 422: … } })
const rotaExcluir = createRoute({ method: 'delete', path: '/api/tipos/{id}', …, request: { params: IdParam },
  responses: { 200: { description: 'Excluído', content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } }, ...acesso, 404: …, 409: respostaErro('Último tipo ativo') } })

/** Tipos de demanda e checklists (criar, editar, excluir). */
export const rotasTipos = new OpenAPIHono<Ambiente>()
  .openapi(rotaCriar, async (c) => c.json(await criarTipo(c.req.valid('json')), 201))
  .openapi(rotaAtualizar, async (c) => c.json(await atualizarTipo(c.req.valid('param').id, c.req.valid('json')), 200))
  .openapi(rotaExcluir, async (c) => c.json(await excluirTipo(c.req.valid('param').id), 200))
```

- [ ] **Step 4: Run test to verify it passes** — mesmo comando e depois `pnpm --filter @kgb/api test` (a suíte inteira, porque o arquivo re-semeia o banco). Expected: PASS.
- [ ] **Step 5: Regenerate the client** — `pnpm api:generate` e conferir `git diff --stat packages/api-client` (só `openapi.json` e `schema.d.ts`).
- [ ] **Step 6: Commit** — `feat(api): criar, editar e excluir tipos de demanda` (serviço, rotas, testes e cliente gerado).

---

### Task 3: Regras puras da tela (gestor)

**Files:**
- Create: `apps/gestor/src/checklists/regras.ts`
- Test: `apps/gestor/src/checklists/regras.test.ts`

**Interfaces:**
- Produces: `LIMITE_NOME = 60`, `LIMITE_ETAPA = 200`, `rotuloItens(n): string`, `editarEtapa(lista, i, texto): string[]`, `subirEtapa(lista, i): string[] | null` (null na 1ª), `removerEtapa(lista, i): string[]`, `acrescentarEtapa(lista, texto): string[] | null` (null se vazio depois do trim), `escolherSelecionado<T extends {id}>(lista, id | null): T | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { acrescentarEtapa, editarEtapa, escolherSelecionado, removerEtapa, rotuloItens, subirEtapa } from './regras'

describe('rotuloItens', () => {
  it('corrige o singular do protótipo ("1 itens")', () => {
    expect(rotuloItens(0)).toBe('0 itens')
    expect(rotuloItens(1)).toBe('1 item')
    expect(rotuloItens(5)).toBe('5 itens')
  })
})

describe('etapas', () => {
  const lista = ['a', 'b', 'c']
  it('editar troca só o texto da posição, sem trim', () => {
    expect(editarEtapa(lista, 1, 'b ')).toEqual(['a', 'b ', 'c'])
  })
  it('subir troca com a anterior; na primeira não faz nada', () => {
    expect(subirEtapa(lista, 2)).toEqual(['a', 'c', 'b'])
    expect(subirEtapa(lista, 0)).toBeNull()
  })
  it('remover tira a posição', () => {
    expect(removerEtapa(lista, 0)).toEqual(['b', 'c'])
  })
  it('acrescentar faz trim, entra no fim e recusa vazio', () => {
    expect(acrescentarEtapa(lista, '  d  ')).toEqual(['a', 'b', 'c', 'd'])
    expect(acrescentarEtapa(lista, '   ')).toBeNull()
  })
  it('nada muda a lista recebida', () => {
    subirEtapa(lista, 1); removerEtapa(lista, 1); editarEtapa(lista, 1, 'x'); acrescentarEtapa(lista, 'y')
    expect(lista).toEqual(['a', 'b', 'c'])
  })
})

describe('escolherSelecionado', () => {
  const tipos = [{ id: 't1' }, { id: 't2' }]
  it('o do id; senão o primeiro; sem tipos, nenhum', () => {
    expect(escolherSelecionado(tipos, 't2')).toEqual({ id: 't2' })
    expect(escolherSelecionado(tipos, 'sumiu')).toEqual({ id: 't1' })
    expect(escolherSelecionado(tipos, null)).toEqual({ id: 't1' })
    expect(escolherSelecionado([], null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/checklists/regras.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** (funções de uma linha cada; `subirEtapa` devolve `null` com `i === 0`, `acrescentarEtapa` devolve `null` com o texto vazio depois do trim; `LIMITE_*` com comentário apontando para a API).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(gestor): regras da tela de checklists`.

---

### Task 4: Canal de salvamento (debounce de 600 ms, em série)

**Files:**
- Create: `apps/gestor/src/checklists/salvamento.ts`
- Test: `apps/gestor/src/checklists/salvamento.test.ts`

**Interfaces:**
- Produces:

```ts
export const ESPERA_SALVAMENTO = 600
export interface OpcoesCanal<T> {
  salvar: (valor: T) => Promise<unknown>
  /** Falso: o valor fica só na tela (ex.: nome vazio). */
  podeEnviar?: (valor: T) => boolean
  aoFalhar?: (erro: unknown) => void
  espera?: number
}
export interface Canal<T> {
  /** O que a tela mostra no lugar do valor salvo; undefined = mostra o salvo. */
  readonly rascunho: Readonly<ShallowRef<T | undefined>>
  alterar(valor: T): void
  /** Fim da edição: o rascunho sai assim que não houver envio pendente (a tela volta ao salvo). */
  soltar(): void
  /** Envia na hora o que esperava o debounce; resolve quando a fila terminar. */
  descarregar(): Promise<void>
  /** Esquece o rascunho e o envio agendado (tipo excluído). */
  descartar(): void
}
export function criarCanal<T>(opcoes: OpcoesCanal<T>): Canal<T>
```

- [ ] **Step 1: Write the failing test** (fake timers):
  - "mostra o rascunho na hora e salva uma vez, 600 ms depois da última alteração, com o valor final";
  - "o rascunho continua depois de salvo, até soltar";
  - "soltar com envio pendente: o rascunho sai quando o servidor responder";
  - "em série: a segunda alteração só é enviada depois da resposta da primeira";
  - "podeEnviar falso não envia; soltar volta ao salvo";
  - "falha avisa e, ao soltar, volta ao salvo";
  - "descarregar envia na hora o que esperava o debounce";
  - "descartar esquece o rascunho e o envio agendado".
- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/checklists/salvamento.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
export function criarCanal<T>({ salvar, podeEnviar = () => true, aoFalhar, espera = ESPERA_SALVAMENTO }: OpcoesCanal<T>): Canal<T> {
  const rascunho = shallowRef<T>()
  let versao = 0
  let enviada = 0
  let solto = true
  let pendentes = 0
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let fila: Promise<void> = Promise.resolve()

  const limparSeLivre = () => {
    if (solto && pendentes === 0 && temporizador === undefined) rascunho.value = undefined
  }
  async function enviarAgora() {
    const valor = rascunho.value
    if (valor === undefined || versao === enviada || !podeEnviar(valor)) return
    enviada = versao
    try { await salvar(valor) } catch (erro) { aoFalhar?.(erro) }
  }
  function enfileirar(): Promise<void> {
    clearTimeout(temporizador)
    temporizador = undefined
    pendentes++
    fila = fila.then(enviarAgora).finally(() => { pendentes--; limparSeLivre() })
    return fila
  }
  return {
    rascunho,
    alterar(valor) {
      rascunho.value = valor
      versao++
      solto = false
      clearTimeout(temporizador)
      temporizador = setTimeout(() => void enfileirar(), espera)
    },
    soltar() { solto = true; limparSeLivre() },
    descarregar() { return temporizador === undefined ? fila : enfileirar() },
    descartar() { clearTimeout(temporizador); temporizador = undefined; enviada = versao; solto = true; rascunho.value = undefined },
  }
}
```

- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(gestor): salvamento com debounce e em série para os checklists`.

---

### Task 5: Dados, edição e a tela "Tipos de demanda"

**Files:**
- Create: `apps/gestor/src/checklists/{selecao.ts,dados.ts,edicao.ts,ListaTipos.vue,EditorTipo.vue}`
- Modify: `apps/gestor/src/checklists/PaginaChecklists.vue`
- Test: `apps/gestor/src/checklists/PaginaChecklists.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4 (`components['schemas']['AtualizacaoTipo']`, `TipoDemanda`, `criarCanal`, regras).
- Produces:
  - `selecao.ts`: `export const tipoSelecionado = ref<string | null>(null)` (estado de módulo; `null` = o primeiro da lista).
  - `dados.ts`: `usarTiposDemanda()` (useQuery em `CHAVES.tipos`), `usarSalvarTipo(): (id, corpo: AtualizacaoTipo) => Promise<TipoDemanda>` (PATCH; na resposta, só o campo enviado entra no cache `CHAVES.tipos`; renomear invalida `['prestadores']`), `usarCriarTipo()` (POST; acrescenta ao cache), `usarExcluirTipo()` (DELETE; tira do cache e invalida `['prestadores']`).
  - `edicao.ts`: `usarEdicaoTipos({ salvar, aoFalhar })` → `{ exibir(t), renomear(id, nome), soltarNome(id), alterarChecklist(id, lista), soltar(id), descartar(id) }`; nome com `podeEnviar: n => n.trim() !== ''`; `onScopeDispose` descarrega todos os canais.
  - `ListaTipos.vue`: props `tipos`, `selecionadoId`; `v-model:novo-tipo`; emite `selecionar(id)` e `criar`.
  - `EditorTipo.vue`: prop `tipo`; `v-model:nova-etapa`; emite `renomear(nome)`, `soltar-nome`, `editar(i, texto)`, `subir(i)`, `remover(i)`, `adicionar`, `excluir`.

- [ ] **Step 1: Write the failing tests** (`PaginaChecklists.test.ts`, com `vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))`, `simularApi` e `TIPOS` de `test/fixtures`; `vi.useFakeTimers({ shouldAdvanceTime: true })` para o debounce):
  1. lista com "N itens" e singular ("Vistoria 1 item"), o primeiro selecionado, título, aviso, "Checklist · 5 itens" e as etapas numeradas;
  2. renomear: a lista acompanha na hora; PATCH `{nome}` só 600 ms depois da última tecla;
  3. nome vazio não é enviado e volta ao último salvo ao sair do campo;
  4. 409 no nome vira toast com a mensagem e o nome volta ao salvo ao sair do campo;
  5. editar etapa envia o checklist inteiro; pausa com espaço no fim não perde o espaço;
  6. "Subir" troca com a anterior (um PATCH) e na 1ª não faz nada, com opacidade .3 e sem `disabled`;
  7. "Remover" tira a etapa; sem etapas aparece "Nenhum item ainda." e "Checklist · 0 itens";
  8. "Adicionar etapa" (clique e Enter) acrescenta com trim e limpa o campo; vazio não faz nada;
  9. "Novo tipo" (clique e Enter) cria, seleciona o novo e limpa o campo; vazio não chama a API; 409 vira toast e o texto fica;
  10. "Excluir tipo" exclui sem confirmação e seleciona o primeiro da lista; 409 vira toast;
  11. trocar de tipo limpa "Nova etapa";
  12. a seleção sobrevive a remontar a tela (estado de módulo);
  13. carregando: só o cabeçalho; erro: a mensagem da API num cartão;
  14. ao sair da tela, o que esperava o debounce é salvo na hora.
- [ ] **Step 2: Run** `pnpm --filter @kgb/gestor exec vitest run src/checklists` — Expected: FAIL.
- [ ] **Step 3: Implement** os arquivos acima. CSS literal do protótipo (L264–309): colunas `flex-wrap:wrap; gap:16px; align-items:flex-start`; lista `flex:1 1 240px; padding:12px; gap:4px; raio 16`; botão do tipo `padding:10px 12px; border:1px solid (#0069BD|transparent); raio 12; fundo (#E6F0FA|#fff); gap 10`; bolinha 10; nome 14/600 `#2C3143`; contagem 12 `#8F8D8D`; linha "Novo tipo" `padding:8px 4px 4px; border-top:1px solid #E5E5E5; margin-top:4px; gap:8px`; campo 40 de altura, `1px dashed #0069BD`, raio 12, `padding:0 12px`, 14px; "Adicionar" 40 de altura, `padding:0 14px`, raio 12, `#E6F0FA`/`#004E8F`, 13/600; editor `flex:2 1 340px; padding:24px; gap:16px`; título com bolinha 14, input 18/700 `padding:4px 0; border-bottom:1px solid transparent` (foco `#262A3B`); "Excluir tipo" 13/600 `#B8342A` com `padding:1px 6px`; rótulo 12/600 `#8F8D8D` uppercase `.06em`; etapa `padding:4px 4px 4px 12px; raio 12; #F9F9F9; gap 8`; número 22 de largura 12/700; input 40 de altura 14/500 `padding:1px 2px`; Subir/Remover 36×36 raio 10 `padding:1px 6px`, ícones de 18 (Subir com `rotate(-90deg)`), hover do Remover `#FFD7D4`; vazio 14 `#8F8D8D` `padding:8px 0`; "Nova etapa" 44 de altura `padding:0 14px`; "Adicionar etapa" 44 de altura `padding:0 16px` `#0069BD`/branco 14/600.
- [ ] **Step 4: Run** `pnpm --filter @kgb/gestor test` e `pnpm --filter @kgb/gestor typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(gestor): tela Tipos de demanda com salvamento automático`.

---

### Task 6: Casos visuais e ajuste pixel a pixel

**Files:**
- Modify: `tools/visual/casos-checklists.ts`
- Modify (se preciso): CSS de `apps/gestor/src/checklists/*.vue`

- [ ] **Step 1: Casos** (regiões do levantamento; nada que grave no banco):
  - `gestor-web-checklists` (`gw`, sem passos): `sidebar`, cabeçalho `296,28,1080×54`, lista `296,98,401×433`, editor `713,98,663×459`, tela;
  - `gestor-web-checklists-chaveiro` (`clicar: 'Chaveiro 4 itens'`): lista, editor, tela;
  - `gestor-web-checklists-limpeza` (`clicar: 'Limpeza de ar-condicionado 5 itens'`): lista, editor, tela;
  - `gestor-web-checklists-rascunhos` (`preencher` "Novo tipo" e "Nova etapa do checklist"; não grava): lista, editor;
  - `gestor-mobile-checklists` (`gm`): abas, cabeçalho `16,16,335×72`, lista `16,104,335×433`, tela;
  - `gestor-mobile-checklists-editor` (`clicar: 'Adicionar etapa'`, rola até o fim): abas, editor `16,209,335×459`, tela;
  - `gestor-mobile-checklists-pintura` (`clicar: 'Pintura 5 itens'`, depois `'Adicionar etapa'`): abas, editor, tela.
- [ ] **Step 2: Servidores** — API (`pnpm --filter @kgb/api dev`, porta 3013) e gestor (`pnpm --filter @kgb/gestor exec vite --port 5213 --strictPort`) em segundo plano.
- [ ] **Step 3: Rodar** — `pnpm db:seed && URL_GESTOR=http://localhost:5213 pnpm visual -- --app=gestor`. Para cada região fora do limite, abrir `tools/visual/.saida/*--diff.png`, medir no navegador (protótipo × app) e corrigir o CSS. Repetir até todas as regiões passarem.
- [ ] **Step 4: Commit** — `test(visual): casos da tela Tipos de demanda` (e `fix(gestor): …` para ajustes de CSS).

---

### Task 7: Verificação final

- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm api:generate` + `git status --porcelain packages/api-client` vazio, e a comparação visual da Task 6 — com os números reais anotados no relatório.
- [ ] Derrubar só os processos das portas 3013 e 5213.
