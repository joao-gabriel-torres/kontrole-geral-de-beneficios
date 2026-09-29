# Pendências da API — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as pendências P1–P5 e C1 da revisão do fluxo principal na API e no cliente gerado, cada uma com o teste que falhava antes.

**Architecture:**
- **Serviço (`servicos/acionamentos.ts`):** a limpeza de arquivos vira melhor esforço (`Promise.allSettled` + `console.error`). Ela roda depois do commit (P2) e nos `catch` de `adicionarFoto` e `marcarInviavel`, sem nunca trocar o erro original. A chave da foto passa a ser montada com o id da linha travada, então um id malformado cai no 404 de `travarDoPrestador` antes de existir chave (P1).
- **Borda HTTP (`app.ts`, `auth.ts`, `rotas/arquivos.ts`):** a leitura de foto assinada é montada antes do middleware `sessao` (P4) e responde com `X-Content-Type-Options: nosniff` (P5). As rotas `/api/auth/*` ganham uma guarda Hono (`guardaAuth`, em `auth.ts`) que recusa com 401 a sessão de prestador **excluído**, menos em `sign-in/*` e `sign-out` (P3).
- **Contrato (`schemas.ts`):** `proximo` passa a ser `z.union([ResumoAcionamentoSchema, z.null()])`, e o cliente gerado vira `ResumoAcionamento | null` (C1).

**Tech Stack:** Hono 4 + @hono/zod-openapi, zod 4, Better Auth 1.7.6 (plugin `bearer`), Prisma 7.10, Vitest 4, openapi-typescript 7.

**Spec:** [`docs/superpowers/specs/2026-09-29-telas-restantes-design.md`](../specs/2026-09-29-telas-restantes-design.md) (seção "Pendências"), com o levantamento em [`2026-09-29-telas-restantes/pendencias.md`](../specs/2026-09-29-telas-restantes/pendencias.md).

## Global Constraints

- **Prestador inativo continua entrando** e usando a sessão; **só o excluído** perde login e sessão (Decisões gerais 5 do spec; `apps/api/src/prestador-bloqueado.ts`). A guarda usa `prestadorBloqueado`, nunca `status`.
- Erros do negócio no formato `{ erro: { codigo, mensagem } }`. Erros de `/api/auth/*` no formato do Better Auth (`{ code, message }`), como o 403 `PRESTADOR_EXCLUIDO` do login.
- Mensagem do prestador excluído: "Seu cadastro de prestador foi encerrado" (a mesma de `auth.ts`).
- Arquivos permitidos nesta frente: `apps/api/src/servicos/acionamentos.ts`, `app.ts`, `auth.ts`, `rotas/arquivos.ts`, `schemas.ts`, seus testes (`rotas/execucao.test.ts`, `rotas/gestao.test.ts`, `auth.test.ts`, novo `rotas/arquivos.test.ts`), `apps/prestador/src/inicio/usarInicio.ts` (só o cast), `packages/api-client/src/index.test.ts`, os gerados do api-client e este plano.
- Sem dependências novas (`pnpm-lock.yaml` intocado). Sem mexer em `tools/visual/*`, `README.md`, `CLAUDE.md`, `schema.prisma`.
- Testes de banco só com `DATABASE_URL_TEST` (`kgb_pendencias_test` neste worktree).
- `pnpm api:generate` depois de mudar `schemas.ts`; o CI falha com cliente desatualizado.
- Commits pequenos, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Fora deste plano

- **P6 (arquivo gravado dentro da transação com a linha travada): adiada.** Só aparece com S3/R2 (limite de 5 s da transação interativa). Fica para quando o adaptador S3/R2 for feito: verificação sem lock → envio fora da transação → transação curta que trava, confere de novo e grava → `removerArquivos` em melhor esforço se falhar.
- **Revogação de sessões ao excluir o prestador** (`tx.session.deleteMany`): é da frente de Prestadores (`DELETE /api/prestadores/{id}`). A guarda deste plano cobre o intervalo até lá.

## Decisão de desenho: por que a guarda do P3 fica no Hono e não num `hooks.before` do Better Auth

O levantamento sugeria `hooks.before` + `getSessionFromCtx(ctx)`. Lendo o `better-auth` 1.7.6 (`dist/api/dispatch.mjs`):
1. O `hooks.before` do usuário roda **antes** dos hooks de plugin, e todos recebem o contexto original. O plugin `bearer` só converte `Authorization: Bearer` em cookie no contexto final. Com isso, `getSessionFromCtx` dentro do hook não enxerga o Bearer, que é justamente como o app do prestador se autentica.
2. `auth.api.getSession` (usado pelo middleware `sessao`) também passa pelos hooks. Um `APIError` lançado ali viraria **500** em `/api/me`, em vez do 401 de hoje.

A guarda em Hono (`app.on(['GET','POST'], '/api/auth/*', guardaAuth, handler)`) chama `auth.api.getSession`, que já aplica o plugin `bearer`, cobre cookie e Bearer igualmente e não afeta chamadas internas.

## Review Focus

1. **Prestador excluído autenticado por Bearer** (app nativo): `get-session`, `list-sessions` e `update-user` → 401. Teste na Task 4 (Bearer), com um caso por cookie.
2. **Sair e entrar continuam possíveis com uma sessão excluída no aparelho**: `sign-out` → 200 e `sign-in` de outra conta carregando o Bearer excluído → 200. Teste na Task 4.
3. **Prestador inativo (não excluído)**: `get-session` → 200 com a sessão e `update-user` → 200. Teste na Task 4.
4. **Falha do armazenamento na limpeza** (S3/R2 fora do ar): nunca vira 500 depois do commit e nunca troca o erro original. Testes nas Tasks 1 e 2.
5. **Foto assinada sem credenciais e com credenciais**: 200, sem ler sessão, com `nosniff` e o CORS de sempre; assinatura adulterada continua 403. Testes na Task 3 (o 403 já está em `execucao.test.ts`).

---

### Task 1: P2 — limpeza de arquivos em melhor esforço

**Files:**
- Modify: `apps/api/src/servicos/acionamentos.ts:117-121` (`removerArquivos`)
- Test: `apps/api/src/rotas/execucao.test.ts` (bloco `fotos`), `apps/api/src/rotas/gestao.test.ts` (bloco `revisao`)

**Interfaces:**
- Produces: `removerArquivos(chaves: readonly string[]): Promise<void>` — nunca rejeita; loga cada falha com `console.error('Não foi possível remover o arquivo', chave, motivo)`. A Task 2 usa isso nos `catch`.

- [ ] **Step 1: Escrever os testes que falham**

Em `execucao.test.ts`, importar `afterEach` e `vi` do vitest e `armazenamento` de `'../arquivos'`; acrescentar `afterEach(() => vi.restoreAllMocks())` no topo e, no bloco `describe('fotos')`:

```ts
it('remover a foto responde 200 mesmo se o arquivo não puder ser apagado', async () => {
  const id = await novoIniciado()
  const foto = await (
    await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }))
  ).json()
  vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(new Error('armazenamento fora do ar'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const r = await req('DELETE', `/api/acionamentos/${id}/fotos/${foto.id}`, carlos)
  expect(r.status).toBe(200)
  expect(await prisma.foto.count({ where: { id: foto.id } })).toBe(0)
  expect(log).toHaveBeenCalledWith(
    'Não foi possível remover o arquivo',
    expect.stringContaining(foto.id),
    expect.any(Error),
  )
})
```

Em `gestao.test.ts`, importar `afterEach` e `vi`, acrescentar `afterEach(() => vi.restoreAllMocks())` e, no bloco da revisão:

```ts
it('recusar a inviabilidade grava mesmo se o arquivo não puder ser apagado', async () => {
  const id = await criarAcionamento(app, gestora)
  const formulario = new FormData()
  formulario.set('comentario', 'Sem acesso ao local')
  formulario.append('arquivos', formularioFoto({}).get('arquivo') as File)
  const inviavel = await app.request(`/api/acionamentos/${id}/inviavel`, {
    method: 'POST',
    headers: carlos,
    body: formulario,
  })
  expect(inviavel.status).toBe(200)
  vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(new Error('armazenamento fora do ar'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const r = await post(`/api/acionamentos/${id}/revisao`, gestora, {
    decisao: 'reprovado',
    motivo: 'Dá para fazer',
  })
  expect(r.status).toBe(200)
  expect(await r.json()).toMatchObject({ status: 'reprovado', inviavel: false })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/execucao.test.ts src/rotas/gestao.test.ts`
Expected: FAIL — os dois testes novos recebem 500 (`Promise.all` propaga a rejeição depois do commit).

- [ ] **Step 3: Implementar**

```ts
/**
 * Apaga os arquivos em melhor esforço: roda depois do commit ou para desfazer um envio, e uma falha
 * do armazenamento não pode virar erro de uma ação já gravada nem trocar o erro original. Cada
 * falha fica no log.
 */
export async function removerArquivos(chaves: readonly string[]): Promise<void> {
  const reais = chaves.filter((c) => !c.startsWith(PREFIXO_PLACEHOLDER))
  const resultados = await Promise.allSettled(reais.map((c) => armazenamento.remover(c)))
  resultados.forEach((r, i) => {
    if (r.status === 'rejected') console.error('Não foi possível remover o arquivo', reais[i], r.reason)
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/execucao.test.ts src/rotas/gestao.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/servicos/acionamentos.ts apps/api/src/rotas/execucao.test.ts apps/api/src/rotas/gestao.test.ts
git commit -m "fix(api): limpeza de arquivos em melhor esforço, sem 500 depois de gravar"
```

---

### Task 2: P1 — id malformado responde 404 e a limpeza não mascara o erro

**Files:**
- Modify: `apps/api/src/servicos/acionamentos.ts` (`adicionarFoto`, `marcarInviavel`)
- Test: `apps/api/src/rotas/execucao.test.ts`

**Interfaces:**
- Consumes: `removerArquivos` da Task 1 (nunca rejeita).

- [ ] **Step 1: Escrever os testes que falham**

No bloco `fotos` de `execucao.test.ts`:

```ts
it('id com barra codificada responde 404, não 500', async () => {
  const r = await req('POST', '/api/acionamentos/..%2F..%2Fx/fotos', carlos, formularioFoto({ contexto: 'conclusao' }))
  expect(r.status).toBe(404)
  expect(await r.json()).toMatchObject({ erro: { codigo: 'nao_encontrado' } })
})

it('falha ao gravar a foto: a limpeza não troca o erro original', async () => {
  const id = await novoIniciado()
  const original = new Error('disco cheio')
  vi.spyOn(armazenamento, 'salvar').mockRejectedValueOnce(original)
  vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(new Error('armazenamento fora do ar'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const r = await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }))
  expect(r.status).toBe(500)
  // o onError da app loga o erro que chegou até ele: tem de ser o original
  expect(log).toHaveBeenCalledWith(original)
  expect(await prisma.foto.count({ where: { acionamentoId: id } })).toBe(0)
})
```

E, no bloco `marcar como inviável`, a trava de regressão (já passa; fixa o comportamento):

```ts
it('id com barra codificada responde 404', async () => {
  const r = await req('POST', '/api/acionamentos/..%2F..%2Fx/inviavel', carlos, formulario('Sem acesso', 1))
  expect(r.status).toBe(404)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/execucao.test.ts`
Expected: FAIL — o 1º recebe 500 (`Chave de arquivo inválida` no `catch`); o 2º loga o erro do `remover`, não o `original`.

- [ ] **Step 3: Implementar**

Em `adicionarFoto`, trocar do `const fotoId` até o fim por:

```ts
  const fotoId = randomUUID()
  // A chave só existe depois de travar a linha, e usa o id dela: um id malformado na URL cai no
  // 404 sem nunca virar caminho de arquivo.
  let chave: string | null = null
  try {
    const foto = await prisma.$transaction(async (tx) => {
      const a = await travarDoPrestador(tx, u, id)
      exigirStatus('editar', a.status)
      if (entrada.contexto === 'etapa') {
        const etapa = await tx.etapa.findFirst({
          where: { id: entrada.etapaId, demanda: { acionamentoId: a.id } },
          select: { id: true },
        })
        if (!etapa) throw naoEncontrado('Etapa')
      }
      chave = `${a.id}/${fotoId}.${tipo.extensao}`
      await armazenamento.salvar(chave, dados, tipo.mime)
      return tx.foto.create({
        data: {
          id: fotoId,
          acionamentoId: a.id,
          contexto: entrada.contexto,
          etapaId: entrada.contexto === 'etapa' ? entrada.etapaId! : null,
          storageKey: chave,
          tiradaEm: entrada.tiradaEm ? new Date(entrada.tiradaEm) : new Date(),
        },
      })
    })
    return paraFoto(foto)
  } catch (erro) {
    if (chave) await removerArquivos([chave])
    throw erro
  }
```

Em `marcarInviavel`, o laço das fotos passa a montar a chave com o id da linha travada e a registrá-la **antes** de `salvar`, para desfazer também uma gravação que falhou no meio (o `catch` já usa `removerArquivos`, agora em melhor esforço):

```ts
      for (const imagem of imagens) {
        const fotoId = randomUUID()
        const chave = `${a.id}/${fotoId}.${imagem.tipo.extensao}`
        chaves.push(chave)
        await armazenamento.salvar(chave, imagem.dados, imagem.tipo.mime)
        await tx.foto.create({
          data: {
            id: fotoId,
            acionamentoId: a.id,
            contexto: 'inviabilidade',
            storageKey: chave,
            tiradaEm: agora,
          },
        })
      }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/execucao.test.ts src/rotas/gestao.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/servicos/acionamentos.ts apps/api/src/rotas/execucao.test.ts
git commit -m "fix(api): id malformado na foto responde 404 e a limpeza não mascara o erro"
```

---

### Task 3: P4 e P5 — foto assinada sem sessão e com `nosniff`

**Files:**
- Create: `apps/api/src/rotas/arquivos.test.ts`
- Modify: `apps/api/src/app.ts` (ordem de montagem), `apps/api/src/rotas/arquivos.ts:23-26` (headers)

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarAcionamento, formularioFoto, JPEG } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { auth } from '../auth'

const app = criarApp()
let gestora: Record<string, string>
let url = ''

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
  const id = await criarAcionamento(app, gestora)
  await app.request(`/api/acionamentos/${id}/iniciar`, { method: 'POST', headers: carlos })
  const r = await app.request(`/api/acionamentos/${id}/fotos`, {
    method: 'POST',
    headers: carlos,
    body: formularioFoto({ contexto: 'conclusao' }),
  })
  url = ((await r.json()) as { url: string }).url
})

afterEach(() => vi.restoreAllMocks())

describe('GET /api/arquivos/fotos/:id', () => {
  it('não lê a sessão, nem quando a imagem vai com credenciais', async () => {
    const getSession = vi.spyOn(auth.api, 'getSession')
    const r = await app.request(url, { headers: gestora })
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(JPEG)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('manda o navegador não adivinhar o tipo do arquivo', async () => {
    const r = await app.request(url)
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('content-type')).toBe('image/jpeg')
  })

  it('continua com o CORS das outras rotas', async () => {
    const r = await app.request(url, { headers: { origin: 'http://localhost:5173' } })
    expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/arquivos.test.ts`
Expected: FAIL — `getSession` chamado 1 vez; `x-content-type-options` é `null`. (O de CORS já passa: trava de regressão para a mudança de ordem.)

- [ ] **Step 3: Implementar**

`rotas/arquivos.ts`:

```ts
  return c.body(dados, 200, {
    'Content-Type': mimeDaChave(foto.storageKey),
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
```

`app.ts`, logo depois do `cors` e antes do `app.on(... '/api/auth/*' ...)`:

```ts
  // A foto assinada responde sem ler a sessão: a <img> do gestor web leva cookie, e cada miniatura
  // faria uma consulta à toa.
  app.route('/', rotasArquivos)
```

e remover o `app.route('/', rotasArquivos)` que ficava depois de `rotasExecucao`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/arquivos.test.ts src/rotas/execucao.test.ts src/app.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/rotas/arquivos.ts apps/api/src/rotas/arquivos.test.ts
git commit -m "fix(api): foto assinada sem passar pela sessão e com nosniff"
```

---

### Task 4: P3 — guarda de `/api/auth/*` para prestador excluído

**Files:**
- Modify: `apps/api/src/auth.ts` (exporta `guardaAuth`), `apps/api/src/app.ts:55`
- Test: `apps/api/src/auth.test.ts` (bloco `prestador inativo ou excluído`)

**Interfaces:**
- Produces: `guardaAuth: MiddlewareHandler` (Hono) — deixa passar `POST /api/auth/sign-in/*` e `/api/auth/sign-out`; nos demais caminhos, se a requisição carrega sessão (cookie ou Bearer) de um usuário não gestor com `prestadorBloqueado(prestadorId)`, responde `401 { code: 'PRESTADOR_EXCLUIDO', message: 'Seu cadastro de prestador foi encerrado' }`.

- [ ] **Step 1: Escrever os testes que falham**

No `describe('prestador inativo ou excluído')` de `auth.test.ts`, com os auxiliares:

```ts
const authReq = (caminho: string, headers: Record<string, string>, corpo?: unknown) =>
  app.request(`/api/auth/${caminho}`, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: { ...headers, origin: 'http://localhost:5174', 'content-type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

it('inativo continua lendo a sessão e atualizando o perfil', async () => {
  await situacao({ status: 'ativo' })
  const headers = await entrar(app, email)
  await situacao({ status: 'inativo' })
  const sessao = await authReq('get-session', headers)
  expect(sessao.status).toBe(200)
  expect(await sessao.json()).toMatchObject({ user: { email } })
  expect((await authReq('update-user', headers, { name: 'Prestador Inativo' })).status).toBe(200)
})

it('excluído não lê a sessão, não lista sessões nem muda o perfil (Bearer)', async () => {
  await situacao({ status: 'ativo' })
  const headers = await entrar(app, email)
  await situacao({ status: 'inativo', excluidoEm: new Date() })
  for (const r of [
    await authReq('get-session', headers),
    await authReq('list-sessions', headers),
    await authReq('update-user', headers, { name: 'Outro nome' }),
  ]) {
    expect(r.status).toBe(401)
    expect(await r.json()).toMatchObject({ code: 'PRESTADOR_EXCLUIDO' })
  }
})

it('excluído também é recusado pela sessão em cookie', async () => {
  await situacao({ status: 'ativo' })
  const cookie = (await login()).headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  await situacao({ status: 'inativo', excluidoEm: new Date() })
  expect((await authReq('get-session', { cookie })).status).toBe(401)
})

it('excluído ainda sai, e outra conta entra no mesmo aparelho', async () => {
  await situacao({ status: 'ativo' })
  const headers = await entrar(app, email)
  await situacao({ status: 'inativo', excluidoEm: new Date() })
  const outra = await authReq('sign-in/email', headers, { email: GESTORA_DEV.email, password: SENHA_DEV })
  expect(outra.status).toBe(200)
  expect((await authReq('sign-out', headers, {})).status).toBe(200)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @kgb/api exec vitest run src/auth.test.ts`
Expected: FAIL — o excluído recebe 200 em `get-session`, `list-sessions` e `update-user` (Bearer e cookie). O teste do inativo e o de sair/entrar já passam: travas de regressão para a guarda.

- [ ] **Step 3: Implementar**

`auth.ts`:

```ts
import { createMiddleware } from 'hono/factory'
// …

/** Caminhos que o prestador excluído ainda usa: entrar com outra conta e sair. */
const LIVRES_DA_GUARDA = /^\/api\/auth\/(sign-in\/|sign-out$)/

/**
 * A sessão de um prestador excluído não vale nem nas rotas do Better Auth: sem isso, ele continua
 * lendo a sessão e o token, listando sessões e trocando o perfil. Fica no Hono porque o
 * `hooks.before` do Better Auth roda antes do plugin `bearer` (não veria o token do app) e também
 * roda no `auth.api.getSession` do middleware `sessao` (o erro viraria 500 em /api/me).
 * O inativo passa: ver `prestadorBloqueado`.
 */
export const guardaAuth = createMiddleware(async (c, next) => {
  if (LIVRES_DA_GUARDA.test(c.req.path)) return next()
  const sessao = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableRefresh: true },
  })
  const usuario = sessao?.user
  if (usuario && usuario.role !== 'gestor' && (await prestadorBloqueado(usuario.prestadorId))) {
    return c.json(
      { code: 'PRESTADOR_EXCLUIDO', message: 'Seu cadastro de prestador foi encerrado' },
      401,
    )
  }
  return next()
})
```

`app.ts`:

```ts
  app.on(['GET', 'POST'], '/api/auth/*', guardaAuth, (c) => auth.handler(c.req.raw))
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @kgb/api exec vitest run src/auth.test.ts`
Expected: PASS (todos, incluindo "derruba a sessão aberta antes da exclusão", que continua 401 em `/api/me`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth.ts apps/api/src/app.ts apps/api/src/auth.test.ts
git commit -m "fix(api): sessão de prestador excluído não vale nas rotas do Better Auth"
```

---

### Task 5: C1 — `proximo` anulável gerado como `ResumoAcionamento | null`

**Files:**
- Modify: `apps/api/src/schemas.ts:143`, `apps/prestador/src/inicio/usarInicio.ts:12-13`
- Regenerate: `packages/api-client/openapi.json`, `packages/api-client/src/schema.d.ts`
- Test: `packages/api-client/src/index.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Em `index.test.ts`, importar `expectTypeOf` do vitest e os tipos `InicioPrestador` e `ResumoAcionamento` de `./index`:

```ts
describe('tipos gerados', () => {
  it('o próximo atendimento do Início é um resumo ou null', () => {
    expectTypeOf<InicioPrestador['proximo']>().toEqualTypeOf<ResumoAcionamento | null>()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @kgb/api-client typecheck`
Expected: FAIL — `ResumoAcionamento & (Record<string, never> | null)` não é igual a `ResumoAcionamento | null`.

- [ ] **Step 3: Implementar**

`schemas.ts`:

```ts
    // `union` com null gera `anyOf: [$ref, null]`, que o openapi-typescript lê como `T | null`
    // (o `.nullable()` gera `allOf` com `type: ["object","null"]` e vira uma interseção inútil).
    proximo: z.union([ResumoAcionamentoSchema, z.null()]),
```

Run: `pnpm api:generate`

`usarInicio.ts` (sem o cast e sem o import que sobra):

```ts
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { api } from '../api'
import { CHAVES, exigir } from '../consultas'

export function usarInicio() {
  const consulta = useQuery({
    queryKey: CHAVES.inicio,
    queryFn: async () => exigir(await api.GET('/api/prestador/inicio')),
  })
  const proximo = computed(() => consulta.data.value?.proximo ?? null)
  return { ...consulta, proximo }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @kgb/api-client typecheck && pnpm --filter @kgb/prestador typecheck && pnpm --filter @kgb/api exec vitest run src/rotas/prestador.test.ts && pnpm --filter @kgb/api-client test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/schemas.ts packages/api-client/openapi.json packages/api-client/src/schema.d.ts packages/api-client/src/index.test.ts apps/prestador/src/inicio/usarInicio.ts
git commit -m "fix(api): proximo do Início gerado como ResumoAcionamento | null, sem cast"
```

---

### Task 6: Verificação completa e comparação visual

- [ ] **Step 1:** `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` — tudo verde.
- [ ] **Step 2:** `pnpm api:generate && git status --porcelain` — sem diferença pendente.
- [ ] **Step 3:** Subir a API (`pnpm --filter @kgb/api dev`, porta 3015) e o prestador (`pnpm --filter @kgb/prestador exec vite --port 5225 --strictPort`); rodar `pnpm db:seed && URL_PRESTADOR=http://localhost:5225 pnpm visual -- --app=prestador`. Toda região dentro de ≤ 0,2 % da região e ≤ 2 % do conteúdo. Nada desta frente muda o visual; uma divergência se investiga antes de entregar.
- [ ] **Step 4:** Derrubar só os processos das portas 3015 e 5225.
