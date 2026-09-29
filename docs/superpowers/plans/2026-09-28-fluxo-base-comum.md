# Fluxo principal · Base comum das telas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar pronto o que as telas do gestor e do prestador compartilham, para as duas fases rodarem em paralelo (dois agentes, dois worktrees) sem editar os mesmos arquivos.

**Architecture:**
- **`@kgb/ui` ganha:**
  - os formatos de data e hora do fluxo;
  - os links de mapa;
  - `MiniaturaFoto`, `BarraProgresso` e `AvisoToast`, com o composable `usarToast`.
- **`@kgb/api-client` ganha:** `resolverUrl` e os formulários multipart de foto e de inviabilidade.
- **Os apps ganham:**
  - as dependências novas: `@tanstack/vue-query` nos dois e `@capacitor/camera` no prestador;
  - o proxy do Vite configurável (`API_PROXY_ALVO`), para cada agente usar a própria API.
- **O comparador visual ganha:**
  - casos separados por app (`casos-gestor.ts` e `casos-prestador.ts`);
  - `passos` (cliques aplicados no protótipo e no app);
  - a região `telaInteira`;
  - o filtro `--app=`.

**Tech Stack:** Vue 3, Vitest, openapi-fetch, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-28-fluxo-principal-design.md`](../specs/2026-09-28-fluxo-principal-design.md)

## Global Constraints

- **Medidas das miniaturas**, tiradas do CSS do protótipo:

  | Tamanho | Carimbo (deslocamento · padding · fonte) | Ícone do placeholder |
  |---|---|---|
  | 64 | 4px · `0 4px` · 10px | nenhum |
  | 68 | 4px · `0 4px` · 10px | 20px |
  | 80 | 5px · `0 5px` · 10px | 22px |
  | 96 | 5px · `0 5px` · 10px | 24px |
  | 120 | 6px · `0 5px` · 11px | 28px |

  Todas têm raio 12. O carimbo usa fundo `rgba(0,0,0,.35)`. O botão remover tem 22px, fica em top/right 3, com fundo `rgba(255,255,255,.9)` e ícone `cancel` de 14px.
- **Toasts:**
  - Gestor: `left 50%`, `bottom 96px`, padding `12px 18px`, raio 12, sem quebra de linha.
  - Prestador: `left/right 24px`, `bottom 110px`, padding `12px 16px`, raio 14, centralizado.
  - Os dois: fundo `#262A3B`, fonte 14/500 branca, sombra `0 12px 32px rgba(28,18,67,.2)`, somem após 2600 ms.
- Datas no fuso `America/Sao_Paulo`. O intervalo de horas usa travessão: "10:30–12:30".

## Review Focus

1. **Toast repetido antes de sumir:** a mensagem nova substitui a anterior e o prazo recomeça. Teste na Task 1.
2. **Foto sem URL e sem cor** (dado inesperado): a miniatura mostra o bloco neutro `#8FA3A0` e não quebra. Teste na Task 1.
3. **Endereço com " · "** (o padrão do protótipo): nos links de mapa vira ", " e ganha ", São Paulo". Teste na Task 1.

---

### Task 1: `@kgb/ui` — formatos do fluxo, mapas, miniatura, barra de progresso e toast

**Files:**
- Create: `packages/ui/src/fluxo.ts`, `packages/ui/src/componentes/{MiniaturaFoto.vue,BarraProgresso.vue,AvisoToast.vue}`, `packages/ui/src/toast.ts`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/fluxo.test.ts`, `packages/ui/src/componentes/{MiniaturaFoto,BarraProgresso,AvisoToast}.test.ts`

**Interfaces:**
- Produces:
  - Formatos de data e hora:
    - `dataISO(d: Date): 'YYYY-MM-DD'` e `dataBR(iso): 'DD/MM/AAAA'`
    - `diaMes(iso): 'DD/MM'` e `intervalo(inicio, fim): 'HH:MM–HH:MM'`
    - `quandoCurto(data, inicio, fim, hoje): 'Hoje · …' | 'DD/MM · …'`
    - `momento(isoInstante): 'DD/MM · HH:MM'`
  - Links de mapa: `urlMapa(endereco)` e `urlRota(enderecos)`.
  - `progresso(etapas: { feitas, total }): { texto: 'f/t', percentual: number }`.
  - `<MiniaturaFoto :tamanho="64|68|80|96|120" :url? :cor? :horario :removivel? @remover>`
  - `<BarraProgresso :percentual :trilho?>`
  - `<AvisoToast :mensagem :variante="'gestor'|'prestador'">`
  - `usarToast(duracao = 2600): { mensagem: Ref<string|null>, mostrar(texto) }`

- [ ] **Step 1: Testes (falham)**

`packages/ui/src/fluxo.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { dataBR, dataISO, diaMes, intervalo, momento, progresso, quandoCurto, urlMapa, urlRota } from './fluxo'

describe('datas e horários do fluxo', () => {
  it('formata datas como o protótipo', () => {
    expect(dataBR('2026-09-28')).toBe('28/09/2026')
    expect(diaMes('2026-09-28')).toBe('28/09')
    expect(intervalo('10:30', '12:30')).toBe('10:30–12:30')
  })
  it('usa "Hoje" no dia de hoje e a data curta nos outros', () => {
    expect(quandoCurto('2026-09-28', '10:30', '12:30', '2026-09-28')).toBe('Hoje · 10:30–12:30')
    expect(quandoCurto('2026-09-29', '09:00', '10:00', '2026-09-28')).toBe('29/09 · 09:00–10:00')
  })
  it('mostra instantes no fuso de São Paulo', () => {
    expect(momento('2026-09-28T13:05:00Z')).toBe('28/09 · 10:05')
    expect(dataISO(new Date('2026-09-29T01:30:00Z'))).toBe('2026-09-28')
  })
  it('calcula o progresso das etapas', () => {
    expect(progresso({ feitas: 3, total: 5 })).toEqual({ texto: '3/5', percentual: 60 })
    expect(progresso({ feitas: 0, total: 0 })).toEqual({ texto: '0/0', percentual: 0 })
  })
})

describe('links de mapa', () => {
  const alvo = (e: string) => encodeURIComponent(`${e}, São Paulo`)
  it('abre a busca do endereço, trocando " · " por ", "', () => {
    expect(urlMapa('Rua Harmonia, 410 · Vila Madalena')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${alvo('Rua Harmonia, 410, Vila Madalena')}`,
    )
  })
  it('monta a rota do dia na ordem', () => {
    expect(urlRota(['Rua A, 1 · Centro', 'Rua B, 2 · Sé'])).toBe(
      `https://www.google.com/maps/dir/${alvo('Rua A, 1, Centro')}/${alvo('Rua B, 2, Sé')}`,
    )
  })
})
```

`packages/ui/src/componentes/MiniaturaFoto.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MiniaturaFoto from './MiniaturaFoto.vue'

describe('MiniaturaFoto', () => {
  it('mostra a imagem e o carimbo de horário', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 80, url: '/f.jpg', horario: '10:05' } })
    expect(m.find('img').attributes('src')).toBe('/f.jpg')
    expect(m.find('.carimbo').text()).toBe('10:05')
    expect(m.attributes('style')).toContain('width: 80px')
  })
  it('foto de exemplo: bloco colorido com o ícone de imagem', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 68, cor: '#8FA3A0', horario: '09:15' } })
    expect(m.find('img').exists()).toBe(false)
    expect(m.attributes('style')).toContain('background: rgb(143, 163, 160)')
    expect(m.find('.icone-placeholder svg').attributes('width')).toBe('20')
  })
  it('no tamanho 64 o protótipo não mostra o ícone', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 64, cor: '#8FA3A0', horario: '09:15' } })
    expect(m.find('.icone-placeholder').exists()).toBe(false)
  })
  it('sem url e sem cor, usa o bloco neutro', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 68, horario: '09:15' } })
    expect(m.attributes('style')).toContain('background: rgb(143, 163, 160)')
  })
  it('removível: mostra o X e avisa ao remover', async () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 68, cor: '#8FA3A0', horario: '09:15', removivel: true } })
    await m.find('button[aria-label="Remover foto"]').trigger('click')
    expect(m.emitted('remover')).toHaveLength(1)
  })
})
```

`packages/ui/src/componentes/BarraProgresso.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BarraProgresso from './BarraProgresso.vue'

describe('BarraProgresso', () => {
  it('preenche o percentual sobre o trilho', () => {
    const b = mount(BarraProgresso, { props: { percentual: 60, trilho: '#E5E5E5' } })
    expect(b.attributes('style')).toContain('background: rgb(229, 229, 229)')
    expect(b.find('.preenchimento').attributes('style')).toContain('width: 60%')
    expect(b.attributes('role')).toBe('progressbar')
    expect(b.attributes('aria-valuenow')).toBe('60')
  })
})
```

`packages/ui/src/componentes/AvisoToast.test.ts`:
```ts
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usarToast } from '../toast'
import AvisoToast from './AvisoToast.vue'

describe('AvisoToast', () => {
  it('mostra a mensagem com a variante do app', () => {
    const t = mount(AvisoToast, { props: { mensagem: 'Atendimento iniciado', variante: 'prestador' } })
    expect(t.text()).toBe('Atendimento iniciado')
    expect(t.classes()).toContain('prestador')
    expect(t.attributes('role')).toBe('status')
  })
  it('sem mensagem, não renderiza', () => {
    expect(mount(AvisoToast, { props: { mensagem: null, variante: 'gestor' } }).html()).toBe('<!--v-if-->')
  })
})

describe('usarToast', () => {
  afterEach(() => vi.useRealTimers())

  it('some depois de 2,6 s', () => {
    vi.useFakeTimers()
    const toast = usarToast()
    toast.mostrar('Enviado para aprovação')
    expect(toast.mensagem.value).toBe('Enviado para aprovação')
    vi.advanceTimersByTime(2599)
    expect(toast.mensagem.value).toBe('Enviado para aprovação')
    vi.advanceTimersByTime(1)
    expect(toast.mensagem.value).toBeNull()
  })
  it('mensagem nova substitui a anterior e o prazo recomeça', () => {
    vi.useFakeTimers()
    const toast = usarToast()
    toast.mostrar('Primeira')
    vi.advanceTimersByTime(2000)
    toast.mostrar('Segunda')
    vi.advanceTimersByTime(2000)
    expect(toast.mensagem.value).toBe('Segunda')
    vi.advanceTimersByTime(600)
    expect(toast.mensagem.value).toBeNull()
  })
})
```

Run: `pnpm --filter @kgb/ui exec vitest run src/fluxo.test.ts src/componentes`
Expected: FAIL com "Failed to resolve import".

- [ ] **Step 2: Implementação**

`packages/ui/src/fluxo.ts`:
```ts
import { FUSO } from './formatos'

const doisDigitos = (n: number) => String(n).padStart(2, '0')

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
const formatoMomento = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD" do dia em São Paulo. */
export function dataISO(d: Date): string {
  return formatoDia.format(d)
}

/** "2026-09-28" → "28/09/2026". */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "2026-09-28" → "28/09". */
export function diaMes(iso: string): string {
  return dataBR(iso).slice(0, 5)
}

export function intervalo(inicio: string, fim: string): string {
  return `${inicio}–${fim}`
}

/** "Hoje · 10:30–12:30" ou "29/09 · 09:00–10:00" (app do prestador). */
export function quandoCurto(data: string, inicio: string, fim: string, hoje: string): string {
  return `${data === hoje ? 'Hoje' : diaMes(data)} · ${intervalo(inicio, fim)}`
}

/** Instante ISO → "28/09 · 10:05" no fuso de São Paulo (linha do tempo, envios). */
export function momento(instante: string): string {
  const partes = Object.fromEntries(formatoMomento.formatToParts(new Date(instante)).map((p) => [p.type, p.value]))
  return `${partes.day}/${partes.month} · ${partes.hour}:${partes.minute}`
}

export function progresso(etapas: { feitas: number; total: number }): { texto: string; percentual: number } {
  return {
    texto: `${etapas.feitas}/${etapas.total}`,
    percentual: etapas.total ? Math.round((etapas.feitas / etapas.total) * 100) : 0,
  }
}

const destino = (endereco: string) => encodeURIComponent(`${endereco.replace(' · ', ', ')}, São Paulo`)

export function urlMapa(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${destino(endereco)}`
}

export function urlRota(enderecos: readonly string[]): string {
  return `https://www.google.com/maps/dir/${enderecos.map(destino).join('/')}`
}

export { doisDigitos }
```

`packages/ui/src/toast.ts`:
```ts
import { ref, type Ref } from 'vue'

export interface Toast {
  mensagem: Ref<string | null>
  mostrar(texto: string): void
}

/** Aviso curto que some sozinho (2,6 s, como no protótipo). Mensagem nova substitui a anterior. */
export function usarToast(duracao = 2600): Toast {
  const mensagem = ref<string | null>(null)
  let temporizador: ReturnType<typeof setTimeout> | undefined
  return {
    mensagem,
    mostrar(texto: string) {
      clearTimeout(temporizador)
      mensagem.value = texto
      temporizador = setTimeout(() => {
        mensagem.value = null
      }, duracao)
    },
  }
}
```

`packages/ui/src/componentes/MiniaturaFoto.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import RussoIcone from '../icones/RussoIcone.vue'

type Tamanho = 64 | 68 | 80 | 96 | 120

const props = withDefaults(
  defineProps<{ tamanho: Tamanho; url?: string | null; cor?: string | null; horario: string; removivel?: boolean }>(),
  { url: null, cor: null, removivel: false },
)
defineEmits<{ remover: [] }>()

/** Medidas do carimbo e do ícone por tamanho, copiadas do protótipo. */
const MEDIDAS: Record<Tamanho, { recuo: number; padding: number; fonte: number; icone: number | null }> = {
  64: { recuo: 4, padding: 4, fonte: 10, icone: null },
  68: { recuo: 4, padding: 4, fonte: 10, icone: 20 },
  80: { recuo: 5, padding: 5, fonte: 10, icone: 22 },
  96: { recuo: 5, padding: 5, fonte: 10, icone: 24 },
  120: { recuo: 6, padding: 5, fonte: 11, icone: 28 },
}

const medidas = computed(() => MEDIDAS[props.tamanho])
const estilo = computed(() => ({
  width: `${props.tamanho}px`,
  height: `${props.tamanho}px`,
  background: props.url ? 'transparent' : (props.cor ?? '#8FA3A0'),
}))
const estiloCarimbo = computed(() => ({
  left: `${medidas.value.recuo}px`,
  bottom: `${medidas.value.recuo}px`,
  padding: `0 ${medidas.value.padding}px`,
  fontSize: `${medidas.value.fonte}px`,
}))
</script>

<template>
  <div class="miniatura" :style="estilo">
    <img v-if="url" :src="url" alt="" class="imagem" />
    <div v-else-if="medidas.icone" class="icone-placeholder">
      <RussoIcone nome="image" :tamanho="medidas.icone" />
    </div>
    <div class="carimbo" :style="estiloCarimbo">{{ horario }}</div>
    <button v-if="removivel" type="button" class="remover" aria-label="Remover foto" @click="$emit('remover')">
      <RussoIcone nome="cancel" :tamanho="14" />
    </button>
  </div>
</template>

<style scoped>
.miniatura {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  flex: none;
}
.imagem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.icone-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0.6;
}
.carimbo {
  position: absolute;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
}
.remover {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.9);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kgb-tinta);
}
</style>
```

`packages/ui/src/componentes/BarraProgresso.vue`:
```vue
<script setup lang="ts">
withDefaults(defineProps<{ percentual: number; trilho?: string }>(), { trilho: 'var(--kgb-superficie2)' })
</script>

<template>
  <div
    class="barra"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percentual"
    :style="{ background: trilho }"
  >
    <div class="preenchimento" :style="{ width: `${percentual}%` }" />
  </div>
</template>

<style scoped>
.barra {
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
}
.preenchimento {
  height: 100%;
  background: var(--kgb-primaria);
}
</style>
```

`packages/ui/src/componentes/AvisoToast.vue`:
```vue
<script setup lang="ts">
defineProps<{ mensagem: string | null; variante: 'gestor' | 'prestador' }>()
</script>

<template>
  <div v-if="mensagem" class="toast" :class="variante" role="status" aria-live="polite">{{ mensagem }}</div>
</template>

<style scoped>
.toast {
  position: absolute;
  background: var(--kgb-tinta);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 12px 32px rgba(28, 18, 67, 0.2);
}
.gestor {
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  padding: 12px 18px;
  border-radius: 12px;
  z-index: 30;
  white-space: nowrap;
}
.prestador {
  left: 24px;
  right: 24px;
  bottom: 110px;
  padding: 12px 16px;
  border-radius: 14px;
  text-align: center;
  z-index: 40;
}
</style>
```

Em `packages/ui/src/index.ts`, acrescentar:
```ts
export * from './fluxo'
export { usarToast, type Toast } from './toast'
export { default as MiniaturaFoto } from './componentes/MiniaturaFoto.vue'
export { default as BarraProgresso } from './componentes/BarraProgresso.vue'
export { default as AvisoToast } from './componentes/AvisoToast.vue'
```
Remover o `export { doisDigitos }` do fim de `fluxo.ts` se o lint acusar exportação sem uso. Ele não é usado fora.

- [ ] **Step 3: Rodar e commit**

Run: `pnpm --filter @kgb/ui test && pnpm --filter @kgb/ui typecheck && pnpm lint`
Expected: PASS.

```bash
git add -A && git commit -m "feat(ui): formatos do fluxo, links de mapa, miniatura de foto, barra de progresso e toast

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `@kgb/api-client`, dependências dos apps e proxy configurável

**Files:**
- Create: `packages/api-client/src/arquivos.ts`
- Modify: `packages/api-client/src/index.ts`, `apps/gestor/vite.config.ts`, `apps/prestador/vite.config.ts`, `apps/*/package.json` (dependências), `.env.example`
- Test: `packages/api-client/src/arquivos.test.ts`

**Interfaces:**
- Produces:
  - `resolverUrl(base: string, caminho: string | null): string | null`
  - `formularioFoto({ arquivo: Blob, contexto, etapaId?, tiradaEm? }): FormData`
  - `formularioInviabilidade({ comentario, arquivos: Blob[] }): FormData`
  - `API_PROXY_ALVO` no `.env`. O Vite de cada app manda `/api` para esse endereço (padrão `http://localhost:3000`).

- [ ] **Step 1: Testes (falham)**

`packages/api-client/src/arquivos.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { formularioFoto, formularioInviabilidade, resolverUrl } from './arquivos'

describe('resolverUrl', () => {
  it('prefixa a base da API nos caminhos assinados', () => {
    expect(resolverUrl('http://10.0.0.5:3000', '/api/arquivos/fotos/f?exp=1&sig=a')).toBe(
      'http://10.0.0.5:3000/api/arquivos/fotos/f?exp=1&sig=a',
    )
    expect(resolverUrl('http://api.teste/', '/api/x')).toBe('http://api.teste/api/x')
  })
  it('mantém URL absoluta e devolve null para foto de exemplo', () => {
    expect(resolverUrl('http://api', 'https://cdn/x.jpg')).toBe('https://cdn/x.jpg')
    expect(resolverUrl('http://api', null)).toBeNull()
  })
})

describe('formulários multipart', () => {
  it('monta a foto com contexto, etapa e horário', () => {
    const f = formularioFoto({
      arquivo: new Blob(['x'], { type: 'image/jpeg' }),
      contexto: 'etapa',
      etapaId: 'e1',
      tiradaEm: '2026-09-28T10:00:00-03:00',
    })
    expect(f.get('contexto')).toBe('etapa')
    expect(f.get('etapaId')).toBe('e1')
    expect(f.get('tiradaEm')).toBe('2026-09-28T10:00:00-03:00')
    expect(f.get('arquivo')).toBeInstanceOf(Blob)
  })
  it('foto da conclusão não leva etapa', () => {
    const f = formularioFoto({ arquivo: new Blob(['x']), contexto: 'conclusao' })
    expect(f.has('etapaId')).toBe(false)
  })
  it('monta a inviabilidade com várias fotos', () => {
    const f = formularioInviabilidade({ comentario: 'Sem acesso', arquivos: [new Blob(['a']), new Blob(['b'])] })
    expect(f.get('comentario')).toBe('Sem acesso')
    expect(f.getAll('arquivos')).toHaveLength(2)
  })
})
```

Run: `pnpm --filter @kgb/api-client test`
Expected: FAIL com "Cannot find module './arquivos'".

- [ ] **Step 2: Implementação**

`packages/api-client/src/arquivos.ts`:
```ts
/** Caminhos de foto vêm relativos à API; no app nativo a API fica em outra origem. */
export function resolverUrl(base: string, caminho: string | null): string | null {
  if (!caminho) return null
  if (/^https?:\/\//.test(caminho)) return caminho
  return `${base.replace(/\/$/, '')}${caminho}`
}

export function formularioFoto(dados: {
  arquivo: Blob
  contexto: 'etapa' | 'conclusao'
  etapaId?: string
  tiradaEm?: string
}): FormData {
  const formulario = new FormData()
  formulario.set('arquivo', dados.arquivo, 'foto.jpg')
  formulario.set('contexto', dados.contexto)
  if (dados.etapaId) formulario.set('etapaId', dados.etapaId)
  if (dados.tiradaEm) formulario.set('tiradaEm', dados.tiradaEm)
  return formulario
}

export function formularioInviabilidade(dados: { comentario: string; arquivos: readonly Blob[] }): FormData {
  const formulario = new FormData()
  formulario.set('comentario', dados.comentario)
  dados.arquivos.forEach((arquivo, i) => formulario.append('arquivos', arquivo, `foto-${i + 1}.jpg`))
  return formulario
}
```

Em `packages/api-client/src/index.ts`: `export * from './arquivos'`.

Para enviar pelo `openapi-fetch`, os apps passam o `FormData` com `bodySerializer`:
```ts
api.POST('/api/acionamentos/{id}/fotos', {
  params: { path: { id } },
  body: {} as never,
  bodySerializer: () => formularioFoto(dados),
})
```

- [ ] **Step 3: Dependências e proxy**

Run:
```bash
pnpm --filter @kgb/gestor add @tanstack/vue-query
pnpm --filter @kgb/prestador add @tanstack/vue-query @capacitor/camera@^8
```

Nos dois `vite.config.ts`:
```ts
import { defineConfig, loadEnv } from 'vite'

const raiz = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ mode }) => {
  const alvo = loadEnv(mode, raiz, '').API_PROXY_ALVO || 'http://localhost:3000'
  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    envDir: raiz,
    server: { port: 5173, strictPort: true, proxy: { '/api': alvo } },
    preview: { port: 5173, strictPort: true, proxy: { '/api': alvo } },
  }
})
```
O prestador usa a porta `5174`. Os dois `vitest.config.ts` fazem `mergeConfig(viteConfig, …)`. Como o `vite.config` agora é uma função, passar a usar `mergeConfig(viteConfig({ mode: 'test', command: 'serve' }), …)`.

`.env.example`: acrescentar
```bash
# Para onde o Vite dos apps encaminha /api em dev (útil para rodar duas APIs em portas diferentes)
API_PROXY_ALVO="http://localhost:3000"
```

- [ ] **Step 4: Rodar e commit**

Run: `pnpm install && pnpm --filter @kgb/api-client test && pnpm typecheck && pnpm lint && pnpm --filter @kgb/gestor test && pnpm --filter @kgb/prestador test`
Expected: PASS.

```bash
git add -A && git commit -m "feat: helpers de fotos no api-client, vue-query, câmera e proxy configurável

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Comparador visual com casos por app, passos e tela inteira

**Files:**
- Create: `tools/visual/casos-gestor.ts`, `tools/visual/casos-prestador.ts`, `tools/visual/tipos.ts`
- Modify: `tools/visual/casos.ts`, `tools/visual/comparar.ts`

**Interfaces:**
- Produces:
  - `tipos.ts`: tipos `Modo`, `Regiao` e `Passo = { clicar: string; papel?: 'button' | 'link' | 'text' }`, mais `Caso { …, passos?: Passo[] }`.
  - `VIEWPORT_APP` e `telaInteira(modo): Regiao`, que é a área do app inteira. No prestador ela exclui 8px à direita, onde pode aparecer a barra de rolagem.
  - `CASOS_GESTOR` e `CASOS_PRESTADOR`, com os casos atuais movidos para lá. `casos.ts` exporta `CASOS = [...CASOS_GESTOR, ...CASOS_PRESTADOR]`.
  - `pnpm visual -- --app=gestor|prestador`.

- [ ] **Step 1: Reorganizar os casos**

`tools/visual/tipos.ts`:
```ts
export type Modo = 'gw' | 'gm' | 'pa'

export interface Regiao {
  nome: string
  x: number
  y: number
  largura: number
  altura: number
}

/** Clique aplicado do mesmo jeito no protótipo e no app, em ordem, depois de abrir a tela. */
export interface Passo {
  clicar: string
  /** Como achar o alvo: botão pelo nome acessível (padrão), link ou texto exato. */
  papel?: 'button' | 'link' | 'text'
}

export interface Caso {
  nome: string
  modo: Modo
  /** Texto do botão de navegação que leva à tela no protótipo (vazio = tela inicial). */
  navegarPrototipo?: string
  app: 'gestor' | 'prestador'
  rota: string
  passos?: Passo[]
  regioes: Regiao[]
}

/** Área útil do app, igual à área do protótipo sem a barra do topo e sem a barra de status falsa. */
export const VIEWPORT_APP: Record<Modo, { width: number; height: number }> = {
  gw: { width: 1440, height: 844 },
  gm: { width: 375, height: 768 },
  pa: { width: 375, height: 768 },
}

/** A tela inteira do app (menos a faixa da barra de rolagem à direita). */
export function telaInteira(modo: Modo): Regiao {
  const { width, height } = VIEWPORT_APP[modo]
  return { nome: 'tela', x: 0, y: 0, largura: width - 8, altura: height }
}
```

`tools/visual/casos-gestor.ts` recebe os casos `gestor-*` atuais. `tools/visual/casos-prestador.ts` recebe os `prestador-*`. As constantes `sidebar`, `abasGestor`, `abasPrestador`, `cabecalhoWeb` e `cabecalhoPrestador` vão para o arquivo de cada app. `tools/visual/casos.ts` fica:
```ts
import { CASOS_GESTOR } from './casos-gestor'
import { CASOS_PRESTADOR } from './casos-prestador'

export * from './tipos'
export const CASOS = [...CASOS_GESTOR, ...CASOS_PRESTADOR]
```

- [ ] **Step 2: Passos e filtro por app em `comparar.ts`**

Acrescentar a função e chamá-la em `abrirPrototipo` (depois de `navegarPrototipo`) e em `abrirApp` (depois do `goto` da rota e do `networkidle`):
```ts
async function aplicarPassos(pagina: Page, passos: readonly Passo[] = []) {
  for (const passo of passos) {
    const alvo =
      passo.papel === 'text'
        ? pagina.getByText(passo.clicar, { exact: true })
        : pagina.getByRole(passo.papel ?? 'button', { name: passo.clicar, exact: true })
    await alvo.first().click()
    await pagina.waitForTimeout(250)
  }
  await pagina.mouse.move(1, 1)
}
```

Filtro: `const filtroApp = argumentos.find((a) => a.startsWith('--app='))?.slice('--app='.length)` e, no laço, `CASOS.filter((c) => (!filtro || c.nome === filtro) && (!filtroApp || c.app === filtroApp))`.

- [ ] **Step 3: Verificar**

Run: `pnpm --filter @kgb/visual typecheck && pnpm lint && pnpm visual -- --sanidade`
Expected: as 19 regiões com `0.000%` e o deslocamento detectado em todas.

```bash
git add -A && git commit -m "test(visual): casos por app, passos e região de tela inteira

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
