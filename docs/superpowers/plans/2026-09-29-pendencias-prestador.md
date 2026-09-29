# Pendências do prestador e da ui: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:executing-plans (ou superpowers:subagent-driven-development) para seguir este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhar o andamento.

**Objetivo:** fechar as pendências R7, G9, R1, R2, R3, R4 e R6 da revisão do fluxo principal (mais a R8, que mora no mesmo arquivo), cada uma com o teste que falhava antes e sem mudar um pixel.

**Arquitetura:** tudo é front. O toast do `@kgb/ui` ganha uma região viva sempre montada; o prestador ganha mensagens de erro por status, uma regra de ordem para as respostas das mutações do Detalhe, um pipeline de fotos que não vaza memória, a área segura do iPhone e ajustes de acessibilidade (foco, `aria-pressed`, Espaço, Galeria como botão).

**Stack:** Vue 3.5, Vuetify 4, @tanstack/vue-query 5.104, Vitest 4 + jsdom 30 + @vue/test-utils 2.5, Capacitor 8.

**Spec:** `docs/superpowers/specs/2026-09-29-telas-restantes-design.md` (seção "Pendências") e o levantamento `docs/superpowers/specs/2026-09-29-telas-restantes/pendencias.md` (R1–R8, G9).

## Restrições globais

- Arquivos permitidos: `packages/ui/src/componentes/AvisoToast.vue` (+ teste), `apps/prestador/src/consultas.ts`, `apps/prestador/src/execucao/**`, `apps/prestador/src/demandas/**`, `apps/prestador/src/inicio/PaginaInicio.vue`, `apps/prestador/test/**` e os testes deles, e este plano. Nada fora disso (em especial `pnpm-lock.yaml`, `tools/visual/*`, `LayoutPrestador*`, `CartaoProximo.vue`).
- Sem dependências novas.
- Pixel perfect: `pnpm visual` do prestador e do gestor dentro dos limites (≤ 0,2 % da região e ≤ 2 % do conteúdo). Divergência se corrige no CSS, nunca no limite.
- Textos em português, nomes de domínio em português.
- Commits pequenos, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push, merge ou rebase.
- Antes de cada commit: o teste novo falhou antes e passa depois; a suíte do pacote passa.

## Foco da revisão

Casos que o spec implica, mas que os testes pedidos por ele não exercitam:

1. **Refetch do Detalhe em voo quando a resposta de uma mutação chega** (ex.: o GET disparado por uma foto começou antes do PATCH da etapa): o GET antigo não pode sobrescrever a resposta mais nova. Teste na Tarefa 3.
2. **Foto enviando enquanto o prestador marca uma etapa**: a marcação aparece sem esperar a foto terminar, e o estado final tem as duas coisas. Teste na Tarefa 3.
3. **Uma das mutações sobrepostas falha**: a outra ainda deixa o cache no estado final, sem ficar presa. Teste na Tarefa 3.
4. **Painel fechado depois de um envio bem-sucedido** (a barra de ações some porque o status virou "aguardando"): devolver o foco não quebra, e Esc fecha com o foco dentro do painel. Teste na Tarefa 7.
5. **`toBlob` falha**: o canvas é zerado e o bitmap liberado mesmo assim. Teste na Tarefa 4.

---

### Tarefa 1: R7, desmontar os componentes depois de cada teste

**Arquivos:**
- Modificar: `apps/prestador/test/configurar.ts`
- Modificar: `apps/prestador/src/execucao/BotoesFoto.test.ts` (tirar o `unmount()` manual)

- [ ] **Passo 1: verificação que falha.** Em `test/configurar.ts`, antes de qualquer outra coisa, registrar um `afterEach` que confere o `body` vazio:

```ts
import { afterEach, expect } from 'vitest'

// Registrado antes do enableAutoUnmount: os afterEach rodam em ordem inversa (pilha), então a
// conferência acontece depois da desmontagem.
afterEach(() => {
  expect(document.body.innerHTML, 'algum teste deixou elementos no body').toBe('')
})
```

- [ ] **Passo 2:** `pnpm --filter @kgb/prestador test` → FALHA (os testes que montam com `attachTo: document.body` deixam o componente lá).
- [ ] **Passo 3: implementação.** Depois da conferência:

```ts
import { enableAutoUnmount } from '@vue/test-utils'
enableAutoUnmount(afterEach)
```

Tirar `botoes.unmount()` de `BotoesFoto.test.ts` (a desmontagem automática cuida disso). Se o Vuetify deixar um contêiner de overlay no `body`, limpar só esse contêiner no mesmo `afterEach`, com comentário.
- [ ] **Passo 4:** a suíte inteira do prestador passa (16 arquivos).
- [ ] **Passo 5:** commit `test(prestador): desmonta os componentes depois de cada teste e confere o body vazio`.

### Tarefa 2: G9, região viva do toast sempre presente

**Arquivos:**
- Modificar: `packages/ui/src/componentes/AvisoToast.vue`
- Modificar: `packages/ui/src/componentes/AvisoToast.test.ts`

**Contorno registrado:** o spec pede `role="status"` no invólucro. Isso quebra `apps/prestador/src/layouts/LayoutPrestador.test.ts:51` (espera que `[role="status"]` suma com o toast), que fica fora desta frente. O invólucro sempre montado é então `aria-live="polite" aria-atomic="true"` (a região viva), e o `.toast` continua com `role="status"`. O anúncio vem da região que já existia quando o texto entrou. Para a forma literal do spec, basta mover o `role` para o invólucro e trocar aquela asserção por "região vazia".

- [ ] **Passo 1: testes que falham.**

```ts
it('a região viva fica sempre montada: sem mensagem, existe e está vazia', () => {
  const t = mount(AvisoToast, { props: { mensagem: null, variante: 'gestor' } })
  const regiao = t.find('[aria-live="polite"]')
  expect(regiao.exists()).toBe(true)
  expect(regiao.attributes('aria-atomic')).toBe('true')
  expect(regiao.text()).toBe('')
  expect(t.find('.toast').exists()).toBe(false)
})

it('a mensagem entra na mesma região (o leitor de tela anuncia)', async () => {
  const t = mount(AvisoToast, { props: { mensagem: null, variante: 'prestador' } })
  const regiao = t.find('[aria-live="polite"]').element
  await t.setProps({ mensagem: 'Conclusão aprovada' })
  expect(t.find('[aria-live="polite"]').element).toBe(regiao)
  expect(regiao.textContent?.trim()).toBe('Conclusão aprovada')
  expect(t.find('[role="status"]').text()).toBe('Conclusão aprovada')
})
```

Trocar o teste antigo "sem mensagem, não renderiza".
- [ ] **Passo 2:** `pnpm --filter @kgb/ui test` → FALHA.
- [ ] **Passo 3: implementação.**

```vue
<template>
  <!-- Região viva sempre montada: um role="status" que entra com v-if nem sempre é anunciado. -->
  <div class="regiao-aviso" aria-live="polite" aria-atomic="true">
    <div v-if="mensagem" class="toast" :class="variante" role="status">{{ mensagem }}</div>
  </div>
</template>
```

```css
/* Cobre a mesma largura e a mesma base do contêiner, sem altura e sem z-index (não cria contexto
   de empilhamento): as posições do .toast continuam relativas ao mesmo retângulo. */
.regiao-aviso {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0;
}
```
- [ ] **Passo 4:** `pnpm --filter @kgb/ui test`, `pnpm --filter @kgb/prestador test` e `pnpm --filter @kgb/gestor test` passam (os testes de layout procuram `[role="status"]`).
- [ ] **Passo 5: pixel.** Retratar o toast visível nos dois apps (prestador 375×768; gestor 1440×844 e 375×768), antes e depois, com um script no scratchpad (login, `import('/src/avisos.ts')` ou `import('/src/toast.ts')`, mostrar a mensagem, screenshot). Diferença esperada: 0 pixels. Depois `pnpm visual` do prestador e do gestor.
- [ ] **Passo 6:** commit `fix(ui): região viva do toast sempre montada para o leitor de tela anunciar`.

### Tarefa 3: R1, respostas fora de ordem não sobrescrevem estado mais novo

**Arquivos:**
- Modificar: `apps/prestador/src/execucao/usarDetalhe.ts`
- Criar: `apps/prestador/src/execucao/usarDetalhe.test.ts`

**Regra:** cada mutação do Detalhe (etapa, comentário, iniciar, enviar, inviável e fotos) recebe um "pedido" ao começar. Se outra mutação esteve em voo em algum momento da vida dela, ela fica marcada como **sobreposta**.
- Resposta com o Detalhe, **sem sobreposição** e **sem GET do Detalhe em voo**: grava direto (`setQueryData`), como hoje.
- **Sobreposta**: não grava. Invalida o Detalhe, e o GET novo, que cancela o anterior, traz o estado depois de todos os commits. A marcação aparece sem esperar uma foto demorada terminar.
- **Sem sobreposição, mas com GET em voo** (ex.: o refetch de uma foto): grava a resposta e invalida, para o GET antigo não chegar depois e desfazer a marcação.
- Fotos continuam sempre invalidando (a resposta delas não traz o Detalhe).
- Erro: só libera o pedido. O que falhou não gravou nada, e as outras mutações sobrepostas já estão marcadas.

- [ ] **Passo 1: testes que falham** (`usarDetalhe.test.ts`, montando um componente que chama `usarDetalhe(ref('a1'))` via `test/montar.ts`, com `api` falsa e respostas adiadas):
  - duas marcações (e2, depois e3); a resposta de e3 (e2 e e3 feitas) chega primeiro e a de e2 (só e2, retrato antigo) por último → o cache final tem e2 **e** e3 feitas, e houve um GET novo;
  - uma marcação sozinha → grava a resposta, sem GET extra;
  - GET do Detalhe em voo (invalidado) quando a resposta de uma marcação chega → o GET antigo, que resolve depois com o retrato sem a marcação, não desfaz a marcação;
  - foto enviando (POST pendente) e marcação de etapa que responde antes → a marcação aparece antes de a foto terminar (GET novo), e o estado final tem a foto e a etapa;
  - duas marcações sobrepostas, uma falha → o cache termina no estado do GET novo.
- [ ] **Passo 2:** `pnpm --filter @kgb/prestador exec vitest run src/execucao/usarDetalhe.test.ts` → FALHA no primeiro, no terceiro e no quarto.
- [ ] **Passo 3: implementação** em `usarDetalhe.ts`:

```ts
/** Pedido de mutação: `sobreposto` quando outra mutação esteve em voo durante a vida dele. */
interface Pedido { sobreposto: boolean }

/**
 * A API monta a resposta depois do commit e fora do lock: com duas mutações em voo, a resposta
 * da primeira pode trazer um retrato anterior ao commit da segunda e chegar por último.
 */
function criarPedidos() {
  const emVoo = new Set<Pedido>()
  return {
    abrir(): Pedido {
      const pedido = { sobreposto: emVoo.size > 0 }
      emVoo.forEach((outro) => (outro.sobreposto = true))
      emVoo.add(pedido)
      return pedido
    },
    fechar(pedido: Pedido | undefined): boolean {
      if (!pedido) return false
      emVoo.delete(pedido)
      return !pedido.sobreposto
    },
  }
}
```

Em `acao()`: `onMutate: () => pedidos.abrir()`. No `onSuccess(detalhe, _, pedido)`: se `pedidos.fechar(pedido)` for verdadeiro, grava; se ainda houver GET do Detalhe em voo ou o pedido estiver sobreposto, `invalidateQueries`. No `onError(erro, _, pedido)`: `pedidos.fechar(pedido)` e o aviso. Em `acaoFoto()`: `onMutate` abre, e `onSuccess` e `onError` fecham. O resto continua igual.
- [ ] **Passo 4:** o arquivo novo e a suíte do prestador passam (`PaginaDetalhe.test.ts` inclusive).
- [ ] **Passo 5:** commit `fix(prestador): respostas fora de ordem não desfazem a marcação mais nova no Detalhe`.

### Tarefa 4: R2, pipeline de fotos

**Arquivos:**
- Modificar: `apps/prestador/src/execucao/fotos.ts`
- Modificar: `apps/prestador/src/execucao/fotos.test.ts`

- [ ] **Passo 1: testes que falham** (`describe('redimensionar')`, com `vi.stubGlobal('createImageBitmap', …)`, `vi.spyOn(HTMLCanvasElement.prototype, 'getContext' | 'toBlob')` e `HTMLImageElement.prototype.decode` definido no teste, porque o jsdom não tem):
  - uma imagem de 4000×3000 sai em 1600×1200, com `toBlob(…, 'image/jpeg', 0.8)`;
  - a ordem das chamadas no contexto é `fillStyle = '#fff'`, `fillRect(0,0,1600,1200)` e só então `drawImage(fonte,0,0,1600,1200)` (PNG transparente sai com fundo branco);
  - depois de gerar, o canvas fica com 0×0 e o bitmap foi fechado;
  - com `toBlob` devolvendo `null`: rejeita com "Falha ao gerar o JPEG", mas o canvas fica 0×0 e o bitmap fechado;
  - no fallback (`createImageBitmap` rejeita), com `decode` rejeitando: rejeita e revoga a URL temporária;
  - no fallback com `decode` ok (3000×4000 pela `<img>`): sai em 1200×1600 e revoga a URL depois.
- [ ] **Passo 2:** `vitest run src/execucao/fotos.test.ts` → FALHA (fundo, canvas e revogação).
- [ ] **Passo 3: implementação:**
  - no fallback, `try { await img.decode() } catch (e) { URL.revokeObjectURL(url); throw e }`;
  - criar o canvas antes do `try`;
  - `contexto.fillStyle = '#fff'; contexto.fillRect(0, 0, largura, altura)` antes do `drawImage`;
  - no `finally`, `canvas.width = 0; canvas.height = 0` antes de `imagem.liberar()`.
- [ ] **Passo 4:** a suíte do prestador passa.
- [ ] **Passo 5:** commit `fix(prestador): fotos com fundo branco, URL temporária revogada e canvas liberado`.

### Tarefa 5: R3, área segura do iPhone

**Arquivos:**
- Modificar: `apps/prestador/src/execucao/BarraAcoes.vue` e `PainelInviavel.vue`
- Criar: `apps/prestador/src/execucao/areaSegura.test.ts`

- [ ] **Passo 1: teste que falha.** O jsdom não aplica o CSS dos SFCs, então o teste lê a fonte (`?raw`) e confere a regra:

```ts
import barra from './BarraAcoes.vue?raw'
import painel from './PainelInviavel.vue?raw'

const regra = (fonte: string, seletor: string) =>
  new RegExp(`\\n\\${seletor} \\{([^}]*)\\}`).exec(fonte)?.[1] ?? ''

it('a barra de ações soma a área segura de baixo aos 24px do protótipo', () => {
  expect(regra(barra, '.barra-acoes')).toMatch(
    /padding: 12px 24px calc\(24px \+ env\(safe-area-inset-bottom\)\);/,
  )
})
it('o painel inviável soma a área segura de baixo aos 28px do protótipo', () => {
  expect(regra(painel, '.painel')).toMatch(
    /padding: 12px 24px calc\(28px \+ env\(safe-area-inset-bottom\)\);/,
  )
})
```
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** trocar os `padding` pelos valores acima, com um comentário: "no navegador `env()` vale 0 e fica o valor do protótipo; no iPhone, a barra fica acima do indicador de início". Usar **soma** (pedida na tarefa), e não `max()`: os 24/28px do protótipo ficam acima da área segura.
- [ ] **Passo 4:** a suíte passa; `pnpm visual -- --app=prestador` não muda (Chromium: `env()` = 0).
- [ ] **Passo 5:** commit `fix(prestador): barra de ações e painel inviável acima do indicador de início do iPhone`.

### Tarefa 6: R4 (e R8), erro fora do formato da API

**Arquivos:**
- Modificar: `apps/prestador/src/consultas.ts`
- Modificar: `apps/prestador/src/consultas.test.ts`

- [ ] **Passo 1: testes que falham:**
  - `exigir({ error: '<html>502</html>', response: resposta(502) })` → `ErroApi` com "O servidor está com problemas. Tente de novo em instantes." e status 502;
  - `exigir({ error: '<html>413</html>', response: resposta(413) })` → "A foto passa de 10 MB" (código `arquivo_grande`, o mesmo da API);
  - `exigir({ error: '<html>404</html>', response: resposta(404) })` → "Não foi possível falar com o servidor. Tente de novo." (o texto neutro do gestor), e não "Verifique sua conexão";
  - `mensagemDeErro(new TypeError('Failed to fetch'))` continua com "Verifique sua conexão";
  - **R8:** com `criarClienteConsultas()` e timers falsos, um 404 chama a `queryFn` 1 vez, e um 500 chama 2 vezes (a repetição sai depois de 1 s).
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3: implementação:**

```ts
export const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Verifique sua conexão.'
/** Resposta que não veio da API (proxy, servidor fora do ar): não é problema de conexão. */
export const MENSAGEM_SERVIDOR = 'O servidor está com problemas. Tente de novo em instantes.'
export const MENSAGEM_FOTO_GRANDE = 'A foto passa de 10 MB'
export const MENSAGEM_FALHA = 'Não foi possível falar com o servidor. Tente de novo.'

function erroForaDoFormato(status: number): ErroApi {
  if (status === 413) return new ErroApi('arquivo_grande', status, MENSAGEM_FOTO_GRANDE)
  if (status >= 500) return new ErroApi('servidor', status, MENSAGEM_SERVIDOR)
  return new ErroApi('desconhecido', status, MENSAGEM_FALHA)
}
/** Erros 4xx são respostas definitivas da API: repetir só atrasa o aviso (e a volta ao login). */
export function repetirConsulta(falhas: number, erro: unknown): boolean {
  if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false
  return falhas < 1
}
```

Usar `repetirConsulta` como `retry` em `criarClienteConsultas`.
- [ ] **Passo 4:** a suíte passa.
- [ ] **Passo 5:** commits `fix(prestador): erro fora do formato da API não manda conferir a conexão` e `fix(prestador): não repete consultas que a API recusou com 4xx`.

### Tarefa 7: R6, Galeria acessível por teclado na web

**Arquivos:**
- Modificar: `apps/prestador/src/execucao/BotoesFoto.vue` e `BotoesFoto.test.ts`

- [ ] **Passo 1: testes que falham:**
  - a Galeria é um `<button type="button" class="bloco-foto">` com o texto "Galeria", focável;
  - na web, clicar na Galeria chama `click()` no `input[data-origem="galeria"]`;
  - no nativo (`Capacitor.isNativePlatform` → `true`), clicar chama `capturarNativa('galeria')` e emite a foto.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3: implementação:** trocar o `<label>` por `<button type="button" class="bloco-foto" :class="cor" @click="abrirGaleria">`, e deixar o `input` da galeria irmão dele, com `ref="inputGaleria"`, como o da câmera. `abrirGaleria()` faz `capturarNativa('galeria')` no nativo e `inputGaleria.value?.click()` na web.
- [ ] **Passo 4: pixel.** `<button>` e `<label>` precisam medir e desenhar igual. Conferir no navegador o `getComputedStyle` (padding, line-height, fonte, caixa) da Galeria antes e depois, e rodar `pnpm visual -- --app=prestador` (os casos `prestador-detalhe-reprovado-etapa`, `prestador-inviavel` e `prestador-detalhe-em-andamento` mostram a Galeria).
- [ ] **Passo 5:** commit `fix(prestador): Galeria vira botão e recebe foco pelo teclado`.

### Tarefa 8: R6, foco do painel inviável

**Arquivos:**
- Modificar: `apps/prestador/src/execucao/PainelInviavel.vue`, `PainelInviavel.test.ts`, `PaginaDetalhe.vue` e `PaginaDetalhe.test.ts`

- [ ] **Passo 1: testes que falham:**
  - `PainelInviavel` (montado em `document.body`): com um botão de fora focado, abrir → `document.activeElement` é o `.painel` (`role="dialog"`, `tabindex="-1"`); fechar → o foco volta ao botão;
  - Esc com o foco no painel emite `fechar`;
  - se quem abriu saiu do DOM (a barra some depois do envio), fechar não quebra;
  - `PaginaDetalhe`: com o painel aberto, `.cabecalho`, `.corpo` e `.barra-acoes` ficam `inert`, e ao cancelar deixam de ficar.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3: implementação:**
  - mover `role="dialog" aria-modal="true" aria-labelledby` para o `.painel`, com `ref="painel"` e `tabindex="-1"`;
  - `.painel:focus { outline: none }`, como no `ModalNovoAcionamento` (o painel é o contêiner, não um controle);
  - `watch(() => props.aberto, …, { flush: 'post' })`: ao abrir, guarda o `document.activeElement` e foca o painel; ao fechar, limpa e devolve o foco (depois do DOM atualizado, quando o `inert` já saiu);
  - focar o painel, e não o textarea: o `:focus` do textarea muda a borda, e o caso visual `prestador-inviavel` abre com o clique;
  - em `PaginaDetalhe.vue`: `:inert="painelInviavel || undefined"` no `.cabecalho`, nos dois `.corpo` e no `BarraAcoes`.
- [ ] **Passo 4:** a suíte passa e `pnpm visual -- --app=prestador` fica sem regressão (`prestador-inviavel`).
- [ ] **Passo 5:** commit `fix(prestador): painel inviável recebe o foco, deixa o resto inerte e o devolve ao fechar`.

### Tarefa 9: R6, chips com `aria-pressed` e Espaço nos cartões

**Arquivos:**
- Modificar: `apps/prestador/src/demandas/PaginaDemandas.vue`, `CartaoDemanda.vue`, `PaginaDemandas.test.ts`, `apps/prestador/src/inicio/PaginaInicio.vue` e `PaginaInicio.test.ts`

- [ ] **Passo 1: testes que falham:**
  - chips: o ativo tem `aria-pressed="true"` e os outros `"false"`;
  - `PaginaDemandas`: `keydown` com `key: ' '` no cartão abre o Detalhe, e o evento fica com `defaultPrevented` (a página não rola);
  - `PaginaInicio`: o mesmo no item da agenda de hoje.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** `:aria-pressed="f.id === filtro"` e `@keydown.space.prevent` ao lado do `@keydown.enter`.
- [ ] **Passo 4:** a suíte passa; `pnpm visual -- --app=prestador` sem regressão.
- [ ] **Passo 5:** commit `fix(prestador): chips de filtro com aria-pressed e cartões que abrem com Espaço`.

### Tarefa 10: verificação final

- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, e `pnpm api:generate` sem diferença (`git status` limpo).
- [ ] `pnpm db:seed && URL_PRESTADOR=http://localhost:5227 pnpm visual -- --app=prestador` e `pnpm db:seed && URL_GESTOR=http://localhost:5217 pnpm visual -- --app=gestor`: todas as regiões dentro dos limites.
- [ ] Retrato do toast antes e depois: 0 pixels de diferença.
- [ ] Derrubar só os processos das portas 3017, 5227 e 5217.
