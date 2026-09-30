<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import { computed, nextTick, ref, watch } from 'vue'
import type { OpcaoBusca } from './formulario'

/**
 * Busca com lista suspensa de escolha única (combobox com listbox, padrão da APG): o foco fica no
 * campo e ↓/↑ andam pelas opções (aria-activedescendant), Enter escolhe (menos enquanto
 * `carregando`) e Esc fecha a lista. Fora da edição o campo mostra o escolhido (`valor`); o que é
 * digitado vira `buscar`.
 */
const props = withDefaults(
  defineProps<{
    id: string
    opcoes: readonly OpcaoBusca[]
    valor: string
    selecionadoId?: string | null
    placeholder?: string
    vazio: string
    /**
     * As opções ainda não são as do texto digitado (a busca está a caminho): a lista mostra a busca
     * anterior, e o Enter não escolhe dela.
     */
    carregando?: boolean
    /** A lista abre para cima (campo no fim do modal). */
    paraCima?: boolean
  }>(),
  { selecionadoId: null, placeholder: '', carregando: false, paraCima: false },
)
const emit = defineEmits<{ escolher: [id: string]; buscar: [texto: string] }>()

const aberto = ref(false)
const editando = ref(false)
const digitado = ref('')
const ativo = ref(-1)
const texto = computed(() => (editando.value ? digitado.value : props.valor))
const idLista = computed(() => `${props.id}-lista`)
const idOpcao = (i: number) => `${props.id}-opcao-${i}`
const idAtivo = computed(() =>
  aberto.value && ativo.value >= 0 && ativo.value < props.opcoes.length
    ? idOpcao(ativo.value)
    : undefined,
)

// A lista muda com a busca: o destaque volta para a primeira opção que existir.
watch(
  () => props.opcoes,
  (lista) => {
    if (ativo.value >= lista.length) ativo.value = lista.length ? 0 : -1
  },
)

async function mostrarAtivo() {
  await nextTick()
  if (idAtivo.value) document.getElementById(idAtivo.value)?.scrollIntoView?.({ block: 'nearest' })
}

function abrir() {
  if (aberto.value) return
  aberto.value = true
  const escolhido = props.opcoes.findIndex((o) => o.id === props.selecionadoId)
  ativo.value = escolhido >= 0 ? escolhido : props.opcoes.length ? 0 : -1
  void mostrarAtivo()
}

function fechar() {
  if (!aberto.value && !editando.value) return
  aberto.value = false
  ativo.value = -1
  if (editando.value) {
    editando.value = false
    digitado.value = ''
    emit('buscar', '')
  }
}

function aoDigitar(evento: Event) {
  digitado.value = (evento.target as HTMLInputElement).value
  editando.value = true
  aberto.value = true
  ativo.value = 0
  emit('buscar', digitado.value)
}

function escolher(i: number) {
  const opcao = props.opcoes[i]
  if (!opcao) return
  emit('escolher', opcao.id)
  fechar()
}

function mover(passo: number) {
  if (!props.opcoes.length) return
  ativo.value = Math.min(props.opcoes.length - 1, Math.max(0, ativo.value + passo))
  void mostrarAtivo()
}

function teclar(evento: KeyboardEvent) {
  switch (evento.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      evento.preventDefault()
      if (!aberto.value) abrir()
      else mover(evento.key === 'ArrowDown' ? 1 : -1)
      break
    case 'Enter':
      if (aberto.value && idAtivo.value) {
        evento.preventDefault()
        if (!props.carregando) escolher(ativo.value)
      }
      break
    case 'Escape':
      // Só a lista fecha: o Esc não chega ao modal.
      if (aberto.value) {
        evento.preventDefault()
        evento.stopPropagation()
        fechar()
      }
      break
  }
}
</script>

<template>
  <div class="busca" :class="{ 'para-cima': paraCima }">
    <RussoIcone nome="search" :tamanho="18" class="lupa" />
    <input
      :id="id"
      class="entrada"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-expanded="aberto"
      :aria-controls="idLista"
      :aria-activedescendant="idAtivo"
      :value="texto"
      :placeholder="placeholder"
      @input="aoDigitar"
      @click="abrir"
      @keydown="teclar"
      @blur="fechar"
    />
    <!-- mousedown.prevent: clicar numa opção não tira o foco do campo. -->
    <div v-show="aberto" class="lista" @mousedown.prevent>
      <ul :id="idLista" role="listbox" class="opcoes">
        <li
          v-for="(opcao, i) in opcoes"
          :id="idOpcao(i)"
          :key="opcao.id"
          role="option"
          class="opcao"
          :class="{ ativa: i === ativo }"
          :aria-selected="opcao.id === selecionadoId"
          @click="escolher(i)"
          @mousemove="ativo = i"
        >
          <span class="textos">
            <span class="titulo">{{ opcao.titulo }}</span>
            <span v-if="opcao.detalhe" class="detalhe">{{ opcao.detalhe }}</span>
          </span>
          <RussoIcone v-if="opcao.id === selecionadoId" nome="check" :tamanho="18" class="marca" />
        </li>
      </ul>
      <div v-if="!opcoes.length" class="vazio">{{ carregando ? 'Buscando…' : vazio }}</div>
    </div>
  </div>
</template>

<style scoped>
.busca {
  position: relative;
}
.lupa {
  position: absolute;
  left: 16px;
  top: 15px;
  color: var(--kgb-terciario);
  pointer-events: none;
}
/* Mesmo campo do modal (48px, borda #E5E5E5, raio 16px), com espaço para a lupa. */
.entrada {
  width: 100%;
  height: 48px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  padding: 0 16px 0 42px;
  font-size: 14px;
  font-weight: 500;
  color: var(--kgb-tinta);
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
  max-height: 264px;
  overflow: auto;
  padding: 6px;
  background: var(--kgb-branco);
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(28, 18, 67, 0.12);
}
.para-cima .lista {
  top: auto;
  bottom: calc(100% + 6px);
}
.opcoes {
  margin: 0;
  padding: 0;
  list-style: none;
}
.opcao {
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.opcao.ativa {
  background: var(--kgb-superficie1);
}
.textos {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.detalhe {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-terciario);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.opcao[aria-selected='true'] .titulo {
  color: var(--kgb-primaria-escura);
}
.marca {
  color: var(--kgb-primaria);
}
.vazio {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-terciario);
}
</style>
