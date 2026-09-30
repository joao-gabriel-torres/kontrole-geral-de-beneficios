<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { RussoIcone } from '@kgb/ui'
import { computed, nextTick, ref } from 'vue'
import { alternarTipo, gruposDeTipos, tipoDoEnter } from './formulario'

/**
 * Busca de tipos de demanda, de escolha múltipla: o campo é um combobox cuja lista suspensa
 * (agrupada por categoria) tem um botão liga/desliga por tipo. ↓/↑ levam o foco pela lista, Enter
 * liga ou desliga o tipo em foco e Esc fecha a lista. Os escolhidos viram chips removíveis, na
 * ordem da escolha (a mesma da prévia do checklist).
 */
const props = defineProps<{ id: string; tipos: readonly TipoDemanda[] }>()
const escolhidos = defineModel<string[]>({ required: true })

const termo = ref('')
const aberto = ref(false)
const raiz = ref<HTMLElement>()
const entrada = ref<HTMLInputElement>()
const idLista = computed(() => `${props.id}-lista`)
const grupos = computed(() => gruposDeTipos(props.tipos, termo.value))
const selecionados = computed(() =>
  escolhidos.value.flatMap((id) => props.tipos.filter((t) => t.id === id)),
)
const escolhido = (id: string) => escolhidos.value.includes(id)

function alternar(id: string) {
  escolhidos.value = alternarTipo(escolhidos.value, id)
}

/** Clique de mouse (detail > 0): o foco continua no campo e a busca recomeça do zero. */
function clicar(evento: MouseEvent, id: string) {
  alternar(id)
  if (evento.detail > 0) termo.value = ''
}

const botoes = () => [...(raiz.value?.querySelectorAll<HTMLButtonElement>('.opcao') ?? [])]

async function focarOpcao(i: number) {
  aberto.value = true
  await nextTick()
  const lista = botoes()
  lista[Math.max(0, Math.min(i, lista.length - 1))]?.focus()
}

/** O X do chip some junto com o chip: o foco volta ao campo para não se perder. */
function remover(id: string) {
  alternar(id)
  entrada.value?.focus()
}

function fechar(voltarAoCampo: boolean) {
  aberto.value = false
  if (voltarAoCampo) entrada.value?.focus()
}

function teclarCampo(evento: KeyboardEvent) {
  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    evento.preventDefault()
    void focarOpcao(evento.key === 'ArrowDown' ? 0 : Number.MAX_SAFE_INTEGER)
  } else if (evento.key === 'Enter') {
    // Com a busca digitada, Enter liga o primeiro tipo encontrado pelo nome (ou, sem nenhum, pela
    // categoria).
    const tipo = tipoDoEnter(grupos.value, termo.value)
    if (aberto.value && termo.value.trim() && tipo) {
      evento.preventDefault()
      alternar(tipo.id)
      termo.value = ''
    }
  } else if (evento.key === 'Escape' && aberto.value) {
    // Só a lista fecha: o Esc não chega ao modal.
    evento.preventDefault()
    evento.stopPropagation()
    fechar(false)
  }
}

function teclarOpcao(evento: KeyboardEvent, id: string) {
  const i = botoes().indexOf(evento.currentTarget as HTMLButtonElement)
  switch (evento.key) {
    case 'ArrowDown':
      evento.preventDefault()
      void focarOpcao(i + 1)
      break
    case 'ArrowUp':
      evento.preventDefault()
      if (i === 0) entrada.value?.focus()
      else void focarOpcao(i - 1)
      break
    case 'Home':
    case 'End':
      evento.preventDefault()
      void focarOpcao(evento.key === 'Home' ? 0 : Number.MAX_SAFE_INTEGER)
      break
    case 'Enter':
      evento.preventDefault()
      alternar(id)
      break
    case 'Escape':
      evento.preventDefault()
      evento.stopPropagation()
      fechar(true)
      break
    default:
      // Letras voltam para a busca (o caractere cai no campo).
      if (evento.key.length === 1 && evento.key !== ' ' && !evento.ctrlKey && !evento.metaKey) {
        entrada.value?.focus()
      }
  }
}

/** O foco saiu do campo, da lista e dos chips: a lista fecha. */
function aoSairFoco(evento: FocusEvent) {
  if (!raiz.value?.contains(evento.relatedTarget as Node | null)) aberto.value = false
}
</script>

<template>
  <div ref="raiz" class="busca-tipos" @focusout="aoSairFoco">
    <div class="caixa">
      <RussoIcone nome="search" :tamanho="18" class="lupa" />
      <input
        :id="id"
        ref="entrada"
        v-model="termo"
        class="entrada"
        role="combobox"
        autocomplete="off"
        aria-haspopup="dialog"
        :aria-expanded="aberto"
        :aria-controls="idLista"
        placeholder="Buscar por tipo ou categoria"
        @click="aberto = true"
        @input="aberto = true"
        @keydown="teclarCampo"
      />
      <!-- mousedown.prevent: clicar num tipo não tira o foco do campo. -->
      <div
        v-show="aberto"
        :id="idLista"
        class="lista"
        role="dialog"
        aria-label="Tipos de demanda"
        @mousedown.prevent
      >
        <div
          v-for="(grupo, g) in grupos"
          :key="grupo.categoria"
          role="group"
          :aria-labelledby="`${id}-grupo-${g}`"
        >
          <div :id="`${id}-grupo-${g}`" class="grupo">{{ grupo.categoria }}</div>
          <button
            v-for="t in grupo.tipos"
            :key="t.id"
            type="button"
            class="opcao"
            tabindex="-1"
            :aria-pressed="escolhido(t.id)"
            @click="clicar($event, t.id)"
            @keydown="teclarOpcao($event, t.id)"
          >
            <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
            <RussoIcone v-if="escolhido(t.id)" nome="check" :tamanho="18" class="marca" />
          </button>
        </div>
        <div v-if="!grupos.length" class="vazio">Nenhum tipo encontrado</div>
      </div>
    </div>
    <div v-if="selecionados.length" class="chips">
      <span v-for="t in selecionados" :key="t.id" class="chip">
        <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
        <button
          type="button"
          class="remover"
          :aria-label="`Remover ${t.nome}`"
          @click="remover(t.id)"
        >
          <RussoIcone nome="cancel" :tamanho="14" />
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.busca-tipos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.caixa {
  position: relative;
}
.lupa {
  position: absolute;
  left: 16px;
  top: 15px;
  color: var(--kgb-terciario);
  pointer-events: none;
}
.entrada {
  width: 100%;
  height: 48px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  padding: 0 16px 0 42px;
  font-size: 14px;
  font-weight: 500;
  outline: 0;
  background: var(--kgb-branco);
}
.entrada:focus {
  border-color: var(--kgb-tinta);
}
.lista {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 5;
  max-height: 300px;
  overflow: auto;
  padding: 6px;
  background: var(--kgb-branco);
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(28, 18, 67, 0.12);
}
/* Cabeçalho da categoria no estilo do rótulo "Checklist · N itens". */
.grupo {
  padding: 10px 10px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.opcao {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--kgb-texto);
  text-align: left;
}
.opcao:hover,
.opcao:focus {
  background: var(--kgb-superficie1);
  outline: 0;
}
.opcao[aria-pressed='true'] {
  color: var(--kgb-primaria-escura);
  font-weight: 600;
}
.marca {
  margin-left: auto;
  color: var(--kgb-primaria);
}
.vazio {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-terciario);
}
.bolinha {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex: none;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* O chip escolhido de antes (36px, borda e fundo da primária), com o X para remover. */
.chip {
  height: 36px;
  padding: 0 6px 0 12px;
  border: 1px solid var(--kgb-primaria);
  border-radius: 999px;
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.remover {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--kgb-primaria-escura);
  display: flex;
  align-items: center;
  justify-content: center;
}
.remover:hover {
  background: var(--kgb-primaria-tint-forte);
}
</style>
