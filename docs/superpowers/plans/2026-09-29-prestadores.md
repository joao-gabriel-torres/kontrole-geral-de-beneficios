# Prestadores — etapa 1 (cadastro) · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API do cadastro de prestadores (lista de gestão, criar, editar, status, excluir) e a tela Prestadores do gestor, pixel perfect com o protótipo, sem a planilha (os botões e o link da planilha entram com o visual e chamam stubs documentados).

**Architecture:** Regras puras em `apps/api/src/dominio/prestadores.ts` (normalização, validação na ordem do protótipo, carga, ordenação), acesso ao banco em `servicos/prestadores.ts` e rotas OpenAPI em `rotas/cadastro-prestadores.ts`. No gestor, tudo fica em `apps/gestor/src/prestadores/`: regras de tela puras (`lista.ts`, `formulario.ts`), consultas e mutações (`dados.ts`), estado de módulo (`estado.ts`), componentes (página, linha, interruptor, dois modais) e o encaixe da planilha (`planilha/acoes.ts`, `planilha/estado.ts`).

**Tech Stack:** Hono + @hono/zod-openapi, Prisma 7.10 (Postgres), Vitest; Vue 3 + Vuetify 4 + @tanstack/vue-query, @vue/test-utils; Playwright/pixelmatch no `tools/visual`.

**Spec:** `docs/superpowers/specs/2026-09-29-telas-restantes-design.md` (seção "Prestadores e planilha (gestor)"), com o levantamento `docs/superpowers/specs/2026-09-29-telas-restantes/prestadores.md`. Protótipo: `docs/design/Acionamentos.dc.html` (H210–261 tela, H436–477 formulário, H515–526 exclusão, H1157–1233 lógica).

## Global Constraints

- Pixel perfect: medidas, cores e textos do CSS inline do protótipo; `pnpm visual` ≤ 0,2 % da região e ≤ 2 % do conteúdo; divergência se corrige no CSS, nunca no limite.
- `line-height: normal`; `<button>` sem padding explícito herda `1px 6px`.
- Ícones só com `<RussoIcone>`.
- O gestor fala com a API só via `@kgb/api-client` (`components['schemas'][…]`; o `index.ts` do cliente não é desta frente).
- Nomes de domínio em português; regras de negócio com TDD na API.
- Testes de banco só em `DATABASE_URL_TEST` (`kgb_prestadores_test`); testes que mudam prestadores re-semeiam no `afterAll`.
- Arquivos permitidos: `apps/api/src/{rotas/cadastro-prestadores.ts,rotas/planilha.ts,servicos/prestadores.ts,servicos/planilha.ts,dominio/prestadores.ts,dominio/planilha.ts,dominio/erros-prestadores.ts,dominio/erros-planilha.ts}` (e testes), `apps/gestor/src/prestadores/**`, `apps/gestor/src/componentes/CabecalhoPagina.vue` (só a prop `espaco`), `tools/visual/casos-prestadores.ts`, `tools/visual/fixtures/**`, este plano e os gerados do api-client. Nada de dependências novas.
- Singular (spec, decisão 1): "1 ativo de 1 credenciado".
- Carregando e erro: mensagem da API num cartão branco; sem zeros falsos enquanto carrega.
- Modais: `usarModalAberto()` + `<Teleport defer to="#modais-gestor">`; no mobile o sobreposto sobe 44px (`top: -44px`).
- Commits pequenos em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisões desta etapa (onde o spec deixa margem)

1. **Ordem da validação na API:** nome → tamanho do documento (11/14) → duplicado (409) → dígitos verificadores (só documento novo ou alterado) → telefone. O DV fica depois do duplicado porque o front confere o duplicado ao vivo (a lista está carregada) e não tem o DV (que mora só na API): assim os dois dizem a mesma coisa.
2. **Telefone válido:** 10 ou 11 dígitos (`telefoneValido` do esqueleto), no front e na API.
3. **Erro do servidor no formulário:** 409/422 do salvar aparecem na linha de erro laranja do modal (a mesma do protótipo); outros erros viram toast. Editar qualquer campo limpa o erro do servidor.
4. **Exclusão bloqueada por corrida:** o `DELETE` responde 409 `prestador_com_acionamentos` com a mensagem de bloqueio; o modal recarrega a lista e passa ao estado bloqueado com a contagem nova.
5. **Busca e filtro:** estado de módulo (sobrevive a trocar de tela, como no protótipo) e volta ao padrão quando muda o usuário da sessão.
6. **Switch:** atualização otimista no cache, com volta em caso de erro.
7. **Especialidade inexistente ou excluída no corpo:** 422 `tipo_invalido` ("Tipo de demanda inválido").

## Review Focus

- **Editar um prestador do seed sem mexer no documento** (DV inválido): tem de salvar. Teste na API (Task 2) e no formulário do front (Task 4: sem erro ao abrir Carlos).
- **Documento digitado com máscara igual ao gravado** ("318.402.117-50" no Editar do Carlos): não é "alterado", não passa pelo DV. Teste na Task 2.
- **Documento de um prestador excluído** num cadastro novo: não é duplicado (índice parcial). Teste na Task 2.
- **Clique duplo em Salvar/Excluir/switch:** não dispara duas gravações. Teste na Task 6 (Salvar ignora clique enquanto envia).
- **Excluir um prestador com login ativo:** a sessão dele cai na hora (401 com o token antigo). Teste na Task 2.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `apps/api/src/dominio/erros-prestadores.ts` | códigos de erro da frente |
| `apps/api/src/dominio/prestadores.ts` (+ `.test.ts`) | normalizar, validar, carga, ordenar, mensagem de bloqueio |
| `apps/api/src/servicos/prestadores.ts` | Prisma: listar cadastro, criar, editar, status, excluir |
| `apps/api/src/rotas/cadastro-prestadores.ts` (+ `.test.ts`) | schemas zod e rotas |
| `packages/api-client/{openapi.json,src/schema.d.ts}` | gerados |
| `apps/gestor/src/componentes/CabecalhoPagina.vue` | prop `espaco?: 10 \| 12` |
| `apps/gestor/src/prestadores/lista.ts` (+ teste) | filtro, busca, contagens, subtítulo, chips, carga |
| `apps/gestor/src/prestadores/formulario.ts` (+ teste) | formulário, validação ao vivo, corpo, texto da exclusão |
| `apps/gestor/src/prestadores/estado.ts` | busca e filtro (módulo) |
| `apps/gestor/src/prestadores/dados.ts` (+ teste) | consultas e mutações |
| `apps/gestor/src/prestadores/Interruptor.vue` | switch 44×26 (também servirá à importação) |
| `apps/gestor/src/prestadores/LinhaPrestador.vue` | linha da lista |
| `apps/gestor/src/prestadores/ModalPrestador.vue` | Novo/Editar |
| `apps/gestor/src/prestadores/ModalExcluir.vue` | confirmação |
| `apps/gestor/src/prestadores/PaginaPrestadores.vue` (+ teste) | a tela |
| `apps/gestor/src/prestadores/teste/dados.ts` | fixtures dos testes do front |
| `apps/gestor/src/prestadores/planilha/acoes.ts`, `planilha/estado.ts` | stubs da etapa 2 |
| `tools/visual/casos-prestadores.ts` | casos visuais |

---

### Task 1: Domínio do cadastro (API, puro)

**Files:**
- Modify: `apps/api/src/dominio/erros-prestadores.ts`
- Create: `apps/api/src/dominio/prestadores.ts`, `apps/api/src/dominio/prestadores.test.ts`

**Interfaces:**
- Consumes: `soDigitos`, `tipoDeDocumento`, `digitosVerificadoresValidos`, `telefoneValido` de `./documentos`; `ErroDominio` de `./acionamento`.
- Produces:
  - `type CodigoErroPrestadores = 'nome_obrigatorio' | 'documento_invalido' | 'documento_duplicado' | 'telefone_invalido' | 'prestador_com_acionamentos'`
  - `interface DadosPrestador { nome: string; documento: string; telefone: string; email?: string | null; regiao?: string | null; especialidades: string[] }`
  - `interface PrestadorNormalizado { nome; documento; telefone: string; email: string | null; regiao: string | null; especialidades: string[] }`
  - `normalizarPrestador(d: DadosPrestador): PrestadorNormalizado`
  - `validarPrestador(p: PrestadorNormalizado, ctx: { documentoAtual?: string; donoDoDocumento?: string | null }): void` (lança `ErroDominio`)
  - `STATUS_EM_ABERTO: readonly ['aberto','em_andamento','reprovado','aguardando']`
  - `somarCarga(grupos: { prestadorId: string; status: string; quantidade: number }[]): Map<string, { emAberto: number; total: number }>`
  - `ordenarPorNome<T extends { nome: string }>(lista: T[]): T[]`
  - `mensagemBloqueio(nome: string, emAberto: number): string`

- [ ] **Step 1: testes que falham** (`prestadores.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import { mensagemBloqueio, normalizarPrestador, ordenarPorNome, somarCarga, validarPrestador } from './prestadores'

const valido = { nome: 'Pedro Lima', documento: '529.982.247-25', telefone: '(11) 91234-5678', especialidades: ['t1'] }
const erro = (f: () => void) => { try { f() } catch (e) { return e as ErroDominio } throw new Error('não lançou') }

describe('normalizarPrestador', () => {
  it('apara, guarda só dígitos, vazio vira null e tira especialidades repetidas', () => {
    expect(normalizarPrestador({ ...valido, nome: '  Pedro  Lima ', email: ' ', regiao: ' Centro ', especialidades: ['t2', 't1', 't2'] }))
      .toEqual({ nome: 'Pedro  Lima', documento: '52998224725', telefone: '11912345678', email: null, regiao: 'Centro', especialidades: ['t2', 't1'] })
  })
})

describe('validarPrestador (ordem do protótipo)', () => {
  const v = (d: Partial<typeof valido>, ctx = {}) => validarPrestador(normalizarPrestador({ ...valido, ...d }), ctx)
  it('nome vazio', () => expect(erro(() => v({ nome: '  ', documento: '' }))).toMatchObject({ codigo: 'nome_obrigatorio', message: 'Informe o nome', status: 422 }))
  it('documento sem 11 ou 14 dígitos', () => expect(erro(() => v({ documento: '123', telefone: '' }))).toMatchObject({ codigo: 'documento_invalido', message: 'CPF ou CNPJ inválido' }))
  it('duplicado vem antes do DV', () => expect(erro(() => v({ documento: '31840211750' }, { donoDoDocumento: 'Carlos Mendes' }))).toMatchObject({ codigo: 'documento_duplicado', message: 'Documento já cadastrado para Carlos Mendes', status: 409 }))
  it('DV inválido em documento novo', () => expect(erro(() => v({ documento: '52998224726' }))).toMatchObject({ codigo: 'documento_invalido' }))
  it('DV não se aplica ao documento que já estava gravado', () => expect(() => v({ documento: '318.402.117-50' }, { documentoAtual: '31840211750' })).not.toThrow())
  it('telefone sem DDD', () => expect(erro(() => v({ telefone: '91234-5678' }))).toMatchObject({ codigo: 'telefone_invalido', message: 'Informe o telefone com DDD' }))
  it('aceita CNPJ válido e telefone fixo', () => expect(() => v({ documento: '11.222.333/0001-81', telefone: '(11) 3456-7890' })).not.toThrow())
})

describe('somarCarga', () => {
  it('conta em aberto (aberto, em execução, reprovado e aguardando) e o total', () => {
    const carga = somarCarga([
      { prestadorId: 'p1', status: 'aberto', quantidade: 5 }, { prestadorId: 'p1', status: 'aguardando', quantidade: 2 },
      { prestadorId: 'p1', status: 'reprovado', quantidade: 1 }, { prestadorId: 'p1', status: 'aprovado', quantidade: 12 },
      { prestadorId: 'p2', status: 'em_andamento', quantidade: 1 },
    ])
    expect(carga.get('p1')).toEqual({ emAberto: 8, total: 20 })
    expect(carga.get('p2')).toEqual({ emAberto: 1, total: 1 })
  })
})

it('ordena por nome em pt-BR', () => expect(ordenarPorNome([{ nome: 'Érica' }, { nome: 'Ana' }, { nome: 'Eduardo' }]).map((p) => p.nome)).toEqual(['Ana', 'Eduardo', 'Érica']))

it('mensagem de bloqueio no singular e no plural', () => {
  expect(mensagemBloqueio('Marina Costa', 1)).toBe('Marina Costa tem 1 acionamento em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.')
  expect(mensagemBloqueio('Carlos Mendes', 8)).toContain('tem 8 acionamentos em aberto.')
})
```

- [ ] **Step 2:** `pnpm --filter @kgb/api exec vitest run src/dominio/prestadores.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3: implementação** — `erros-prestadores.ts` com o union acima; `prestadores.ts`:

```ts
export function normalizarPrestador(d: DadosPrestador): PrestadorNormalizado {
  const opcional = (t?: string | null) => t?.trim() || null
  return { nome: d.nome.trim(), documento: soDigitos(d.documento), telefone: soDigitos(d.telefone),
    email: opcional(d.email), regiao: opcional(d.regiao), especialidades: [...new Set(d.especialidades)] }
}
export function validarPrestador(p, { documentoAtual, donoDoDocumento }) {
  if (!p.nome) throw new ErroDominio('nome_obrigatorio', 'Informe o nome')
  if (!tipoDeDocumento(p.documento)) throw new ErroDominio('documento_invalido', 'CPF ou CNPJ inválido')
  if (donoDoDocumento) throw new ErroDominio('documento_duplicado', `Documento já cadastrado para ${donoDoDocumento}`, 409)
  if (p.documento !== documentoAtual && !digitosVerificadoresValidos(p.documento)) throw new ErroDominio('documento_invalido', 'CPF ou CNPJ inválido')
  if (!telefoneValido(p.telefone)) throw new ErroDominio('telefone_invalido', 'Informe o telefone com DDD')
}
const colacao = new Intl.Collator('pt-BR')
export const ordenarPorNome = (l) => [...l].sort((a, b) => colacao.compare(a.nome, b.nome))
```

- [ ] **Step 4:** rodar de novo → PASS.
- [ ] **Step 5:** commit `feat(api): regras do cadastro de prestadores`.

### Task 2: Serviço e rotas do cadastro (API)

**Files:**
- Create: `apps/api/src/servicos/prestadores.ts`, `apps/api/src/rotas/cadastro-prestadores.test.ts`
- Modify: `apps/api/src/rotas/cadastro-prestadores.ts`

**Interfaces:**
- Consumes: Task 1; `prisma`, `dataSP`, `corDoPrestador`, `naoEncontrado`, `ErroDominio`.
- Produces (OpenAPI, usados pelo gestor via `components['schemas']`):
  - `PrestadorCadastro { id, nome, documento, telefone, email: string|null, regiao: string|null, status: 'ativo'|'inativo', cor, credenciadoDesde: 'YYYY-MM-DD', especialidades: {id,nome}[], emAberto: int, total: int }`
  - `DadosPrestador { nome, documento, telefone, email?: string|null, regiao?: string|null, especialidades: string[] }`
  - `StatusPrestador { status: 'ativo'|'inativo' }`
  - `GET /api/prestadores/cadastro` → 200 `PrestadorCadastro[]`
  - `POST /api/prestadores` → 201 `PrestadorCadastro` · 409 · 422
  - `PATCH /api/prestadores/{id}` → 200 `PrestadorCadastro` · 404 · 409 · 422
  - `PATCH /api/prestadores/{id}/status` → 200 `PrestadorCadastro` · 404 · 422
  - `DELETE /api/prestadores/{id}` → 200 `{ ok: true }` · 404 · 409
  - todas: 401 sem sessão, 403 prestador.

- [ ] **Step 1: testes de integração que falham** (`cadastro-prestadores.test.ts`, com `beforeAll(semear)` e `afterAll(semear)`):
  - GET: ordem `Ana Ribeiro, Carlos Mendes, João Pires, Luciana Prado, Marina Costa, Roberto Alves`; Carlos completo (`documento '31840211750'`, `telefone '11987342210'`, `credenciadoDesde '2024-03-12'`, especialidades t1–t4 em ordem, `emAberto 8`, `total 20`); cargas `2/17, 8/20, 2/18, 0/0, 1/15, 0/0`; Luciana com `[Reparo em gesso, Pintura]`; tipo excluído some das especialidades; prestador excluído some da lista; 401/403.
  - POST: cria com dígitos, aparado, `cor '#8FB8DE'` (7º registro), `status 'ativo'`, `credenciadoDesde = hojeSP()`, especialidades sem repetição e na ordem, `emAberto 0 · total 0` (201); mensagens e códigos na ordem; 409 com o nome do dono quando o documento é de um não excluído; documento de um excluído passa; especialidade inexistente → 422 `tipo_invalido`; 401/403; não cria `User`.
  - PATCH: editar Carlos mantendo o documento do seed (com ou sem máscara) → 200, sem mexer em status, cor e data; trocar para documento com DV errado → 422; trocar para o documento de outro → 409; 404 para id inexistente ou excluído.
  - PATCH status: `inativo` e volta; `GET /api/prestadores` deixa de listar; 404 para excluído; `status: 'x'` → 422.
  - DELETE: Carlos → 409 `prestador_com_acionamentos` com `mensagemBloqueio('Carlos Mendes', 8)` e nada muda; Luciana com login → 200 `{ok:true}`, `excluidoEm` preenchido, `status 'inativo'`, sessões apagadas, o token antigo recebe 401, some do GET, e um segundo DELETE dá 404.
- [ ] **Step 2:** rodar → FAIL (404 das rotas).
- [ ] **Step 3: serviço** (`servicos/prestadores.ts`):

```ts
const incluir = { especialidades: { where: { tipo: { excluidoEm: null } }, orderBy: { ordem: 'asc' }, select: { tipo: { select: { id: true, nome: true } } } } } satisfies Prisma.PrestadorInclude
async function listar(where: Prisma.PrestadorWhereInput) {
  const lista = await prisma.prestador.findMany({ where: { excluidoEm: null, ...where }, include: incluir })
  const grupos = await prisma.acionamento.groupBy({ by: ['prestadorId', 'status'], where: { prestadorId: { in: lista.map((p) => p.id) } }, _count: { _all: true } })
  const carga = somarCarga(grupos.map((g) => ({ prestadorId: g.prestadorId, status: g.status, quantidade: g._count._all })))
  return ordenarPorNome(lista.map((p) => paraCadastro(p, carga.get(p.id))))
}
export const listarCadastro = () => listar({})
export async function criarPrestador(d: DadosPrestador) { /* normaliza; dono = findFirst({documento, excluidoEm: null}); valida; confere tipos não excluídos; cor = corDoPrestador(await prisma.prestador.count()); create com especialidades {tipoId, ordem}; P2002 → 409 */ }
export async function atualizarPrestador(id: string, d: DadosPrestador) { /* 404 se não existe/excluído; dono = outro não excluído; valida com documentoAtual; transação: update + deleteMany/createMany das especialidades */ }
export async function alterarStatus(id: string, status: 'ativo' | 'inativo') { /* 404; update */ }
export async function excluirPrestador(id: string) {
  await prisma.$transaction(async (tx) => {
    const [p] = await tx.$queryRaw<{ id: string; nome: string }[]>`SELECT id, nome FROM prestador WHERE id = ${id} AND "excluidoEm" IS NULL FOR UPDATE`
    if (!p) throw naoEncontrado('Prestador')
    const emAberto = await tx.acionamento.count({ where: { prestadorId: id, status: { in: [...STATUS_EM_ABERTO] } } })
    if (emAberto > 0) throw new ErroDominio('prestador_com_acionamentos', mensagemBloqueio(p.nome, emAberto), 409)
    await tx.prestador.update({ where: { id }, data: { excluidoEm: new Date(), status: 'inativo' } })
    await tx.session.deleteMany({ where: { user: { prestadorId: id } } })
  })
}
```

- [ ] **Step 4: rotas** (`rotas/cadastro-prestadores.ts`): schemas `.openapi('PrestadorCadastro' | 'DadosPrestador' | 'StatusPrestador')`, `createRoute` com `exigePapel('gestor')`, tag `Prestadores`, ordem de registro: `/cadastro` antes de `/{id}`.
- [ ] **Step 5:** rodar → PASS; `pnpm --filter @kgb/api typecheck`.
- [ ] **Step 6:** `pnpm api:generate`; commit `feat(api): cadastro de prestadores (lista de gestão, criar, editar, status e excluir)` com os gerados.

### Task 3: Regras de tela da lista (gestor, puro)

**Files:** Create `apps/gestor/src/prestadores/lista.ts`, `lista.test.ts`, `teste/dados.ts`.

**Interfaces:**
- Produces:
  - `type PrestadorCadastro = components['schemas']['PrestadorCadastro']`
  - `type FiltroPrestadores = 'todos' | 'ativo' | 'inativo'`
  - `FILTROS: readonly { id: FiltroPrestadores; rotulo: 'Todos' | 'Ativos' | 'Inativos' }[]`
  - `contagens(lista): Record<FiltroPrestadores, number>`
  - `subtitulo(lista): string` ("5 ativos de 6 credenciados"; "1 ativo de 1 credenciado")
  - `filtrarPrestadores(lista, filtro, busca): PrestadorCadastro[]` (mantém a ordem da API)
  - `linhaDocumento(p): string` ("318.402.117-50 · Zona Oeste", região vazia "—")
  - `chipsDaLinha(p): { visiveis: string[]; mais: string | null }` (2 + "+n")
  - `rotuloCarga(p): string` ("8 em aberto · 20 no total")
- `teste/dados.ts`: `prestador(dados?)` e `SEED_PRESTADORES` (os 6 do seed no formato da API) e `TIPOS_SEED`.

- [ ] Step 1: testes (busca ignora acentos e maiúsculas, acha por nome, documento formatado ou só dígitos, região e e-mail, concatenação "mendes318"; filtro combina com busca; contagens ignoram a busca; singular; chips "+2"; carga) → FAIL.
- [ ] Step 2: implementação → PASS.
- [ ] Step 3: commit `feat(gestor): regras da lista de prestadores`.

### Task 4: Formulário e texto da exclusão (gestor, puro)

**Files:** Create `apps/gestor/src/prestadores/formulario.ts`, `formulario.test.ts`.

**Interfaces:**
- Produces:
  - `interface FormularioPrestador { id: string | null; nome; documento; telefone; email; regiao: string; especialidades: string[] }`
  - `formularioVazio(): FormularioPrestador`
  - `formularioDe(p: PrestadorCadastro): FormularioPrestador` (documento e telefone formatados)
  - `erroDoFormulario(f, lista: PrestadorCadastro[]): string` (nome → tamanho → duplicado → telefone 10–11)
  - `mostrarErro(f, erro: string): boolean` (`!!erro && !!(nome || documento || telefone)`)
  - `alternarEspecialidade(ids, id): string[]` (ordem dos cliques)
  - `corpoDoFormulario(f): DadosPrestador` (`components['schemas']['DadosPrestador']`)
  - `ERROS_DO_FORMULARIO: ReadonlySet<string>` (códigos da API que vão para a linha de erro)
  - `textoExclusao(nome, emAberto): string`; `tituloExclusao(nome): string` ("Excluir X ?")

- [ ] Step 1: testes (vazio sem erro visível e inválido; Carlos do seed sem erro; duplicado com o nome do dono, ignorando o próprio; telefone 9 dígitos; corpo aparado) → FAIL.
- [ ] Step 2: implementação → PASS. Step 3: commit.

### Task 5: Consultas, mutações e estado (gestor)

**Files:** Create `apps/gestor/src/prestadores/dados.ts`, `dados.test.ts`, `estado.ts`, `planilha/acoes.ts`, `planilha/estado.ts`.

**Interfaces:**
- Produces:
  - `CHAVES_PRESTADORES = { todos: ['prestadores'], cadastro: ['prestadores', 'cadastro'] }`
  - `usarCadastro()` (GET `/api/prestadores/cadastro`, `placeholderData: keepPreviousData`)
  - `usarSalvarPrestador()` → `mutateAsync({ id: string | null; corpo: DadosPrestador })` (POST ou PATCH; invalida `['prestadores']`)
  - `usarAlterarStatus()` → `mutateAsync({ id, status })`, otimista no cadastro
  - `usarExcluirPrestador()` → `mutateAsync(id)`; invalida `['prestadores']` no fim
  - `estadoPrestadores: { busca: string; filtro: FiltroPrestadores }`, `reiniciarPrestadores()`
  - `planilha/acoes.ts`: `exportarPlanilha(): Promise<void>`, `baixarModeloPlanilha(): Promise<void>` (stubs sem efeito, documentados para a etapa 2)
  - `planilha/estado.ts`: `importacao = { arquivo: Ref<File | null>; abrir(arquivo: File): void; fechar(): void }`

- [ ] Step 1: testes (`usarAlterarStatus` muda o cache antes da resposta e desfaz no erro; `usarSalvarPrestador` escolhe POST/PATCH; `importacao.abrir` guarda o arquivo) → FAIL.
- [ ] Step 2: implementação → PASS. Step 3: commit.

### Task 6: Tela, linha, interruptor e modais (gestor)

**Files:** Create `Interruptor.vue`, `LinhaPrestador.vue`, `ModalPrestador.vue`, `ModalExcluir.vue`, `PaginaPrestadores.test.ts`; Modify `PaginaPrestadores.vue`, `componentes/CabecalhoPagina.vue` (prop `espaco?: 10 | 12`, padrão 12).

- [ ] Step 1: testes da página (com `#modais-gestor` no `document.body`): cabeçalho e subtítulo; carregando sem zeros; erro no cartão; linhas com documento/telefone formatados, chips e carga; filtros com contagem; busca; vazio "Nenhum prestador encontrado."; switch → PATCH status + toast "X desativado"; lixeira abre a confirmação (bloqueada/livre), "Desativar" e "Excluir" com toasts; 409 na exclusão passa ao estado bloqueado; Novo → POST, toast "Prestador credenciado"; Editar abre formatado e salva com PATCH e toast "Cadastro atualizado"; erro 409 da API na linha de erro; Salvar inválido não chama a API; clique duplo em Salvar grava uma vez; "Subir planilha" entrega o arquivo a `importacao.abrir` e zera o input; Exportar e Baixar modelo chamam as ações.
- [ ] Step 2: FAIL → Step 3: implementação com o CSS do protótipo (H210–261, H436–477, H515–526) → PASS.
- [ ] Step 4: commit `feat(gestor): tela de Prestadores com cadastro, switch e exclusão`.

### Task 7: Casos visuais e ajuste fino

**Files:** Modify `tools/visual/casos-prestadores.ts`.

Casos (todos `app: 'gestor'`, `rota: '/prestadores'`, `navegarPrototipo: 'Prestadores'`, região `telaInteira(modo)`):
`gestor-web-prestadores`, `-ativos` (`Ativos` com `inicio`), `-inativos`, `-novo`, `-novo-especialidades` (`Vazamento`, `Pintura`), `-novo-erro` (preencher `Nome` com `Ana`), `-editar` (`Carlos Mendes`, papel `text`), `-busca` (preencher a busca com `zona oeste`), `-busca-vazia` (`xyz`), `-excluir-bloqueado` (`Excluir`), `-excluir-livre` (`Inativos`, `Excluir`); mobile: `gestor-mobile-prestadores`, `-inativos`, `-novo`, `-excluir-bloqueado`.

- [ ] Step 1: subir API (3012) e gestor (5212), `pnpm db:seed && URL_GESTOR=http://localhost:5212 pnpm visual -- --app=gestor`.
- [ ] Step 2: corrigir no CSS cada região fora do limite (olhar `tools/visual/.saida/*--diff.png`).
- [ ] Step 3: commit `test(visual): casos da tela de Prestadores`.

### Task 8: Verificação final

- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm api:generate` + `git status --porcelain packages/api-client` vazio, e a comparação visual com o seed do dia.
- [ ] Derrubar só os processos das portas 3012 e 5212.
