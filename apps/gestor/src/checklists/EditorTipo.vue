<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { RussoIcone } from '@kgb/ui'
import Sortable from 'sortablejs'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { LIMITE_CATEGORIA, LIMITE_ETAPA, LIMITE_NOME, rotuloItens } from './regras'

const props = defineProps<{ tipo: TipoDemanda; categorias: readonly string[] }>()
const novaEtapa = defineModel<string>('novaEtapa', { required: true })
const emit = defineEmits<{
  renomear: [nome: string]
  soltarNome: []
  categorizar: [categoria: string]
  soltarCategoria: []
  editar: [indice: number, texto: string]
  mover: [de: number, para: number]
  remover: [indice: number]
  adicionar: []
  excluir: []
}>()

const valor = (evento: Event) => (evento.target as HTMLInputElement).value
const lista = ref<HTMLElement>()

/** Nas pontas, "Subir" e "Descer" ficam apagados (sem disabled, como no protótipo) e não fazem nada. */
function mover(de: number, para: number): boolean {
  if (para < 0 || para >= props.tipo.checklist.length) return false
  emit('mover', de, para)
  return true
}

/** Alt+↑ e Alt+↓ no campo movem a etapa; o foco vai junto com ela. */
async function teclar(evento: KeyboardEvent, i: number) {
  if (!evento.altKey || (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown')) return
  evento.preventDefault()
  const para = evento.key === 'ArrowUp' ? i - 1 : i + 1
  if (!mover(i, para)) return
  await nextTick()
  lista.value?.querySelectorAll<HTMLInputElement>('.etapa .texto')[para]?.focus()
}

let arrastar: Sortable | null = null
onMounted(() => {
  if (!lista.value) return
  // Arrastar pela alça (mouse ou toque). O SortableJS move o nó; ele volta ao lugar e quem
  // redesenha a lista é o Vue, a partir dos dados.
  arrastar = Sortable.create(lista.value, {
    handle: '.alca',
    draggable: '.etapa',
    animation: 150,
    onEnd({ oldIndex, newIndex, item, from }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      mover(oldIndex, newIndex)
    },
  })
})
onBeforeUnmount(() => arrastar?.destroy())
</script>

<template>
  <div class="editor">
    <div class="titulo">
      <span class="bolinha" :style="{ background: tipo.cor }" />
      <input
        class="nome"
        :value="tipo.nome"
        aria-label="Nome do tipo"
        :maxlength="LIMITE_NOME"
        @input="emit('renomear', valor($event))"
        @blur="emit('soltarNome')"
      />
      <button type="button" class="excluir" @click="emit('excluir')">Excluir tipo</button>
    </div>
    <div class="subtitulo">
      <div class="rotulo">Checklist · {{ rotuloItens(tipo.checklist.length) }}</div>
      <!-- Fora do protótipo (pedido do usuário, 30/09): agrupa os tipos no Novo acionamento. -->
      <label class="categoria" title="Categoria">
        <span class="rotulo">Categoria</span>
        <input
          class="campo-categoria"
          :value="tipo.categoria ?? ''"
          list="categorias-tipos"
          aria-label="Categoria"
          placeholder="Outros"
          :maxlength="LIMITE_CATEGORIA"
          @input="emit('categorizar', valor($event))"
          @blur="emit('soltarCategoria')"
        />
        <datalist id="categorias-tipos">
          <option v-for="c in categorias" :key="c" :value="c" />
        </datalist>
      </label>
    </div>
    <div ref="lista" class="etapas">
      <!-- A chave é a posição, como no protótipo: depois de mover, o foco fica na mesma linha. -->
      <div v-for="(texto, i) in tipo.checklist" :key="i" class="etapa">
        <span class="alca" title="Arraste para mudar a ordem" aria-hidden="true">
          <span v-for="n in 6" :key="n" class="ponto" />
        </span>
        <span class="numero">{{ i + 1 }}</span>
        <input
          class="texto"
          :value="texto"
          :aria-label="`Etapa ${i + 1}`"
          title="Clique para editar a etapa"
          :maxlength="LIMITE_ETAPA"
          @input="emit('editar', i, valor($event))"
          @keydown="teclar($event, i)"
        />
        <button
          type="button"
          class="acao"
          title="Subir"
          :style="{ opacity: i ? 1 : 0.3 }"
          @click="mover(i, i - 1)"
        >
          <RussoIcone nome="chevron-right" :tamanho="18" class="seta subir" />
        </button>
        <button
          type="button"
          class="acao"
          title="Descer"
          :style="{ opacity: i < tipo.checklist.length - 1 ? 1 : 0.3 }"
          @click="mover(i, i + 1)"
        >
          <RussoIcone nome="chevron-right" :tamanho="18" class="seta descer" />
        </button>
        <button type="button" class="acao remover" title="Remover" @click="emit('remover', i)">
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div v-if="tipo.checklist.length === 0" class="vazio">Nenhum item ainda.</div>
    </div>
    <div class="nova">
      <input
        v-model="novaEtapa"
        class="campo"
        placeholder="Nova etapa do checklist"
        :maxlength="LIMITE_ETAPA"
        @keydown.enter="emit('adicionar')"
      />
      <button type="button" class="adicionar" @click="emit('adicionar')">Adicionar etapa</button>
    </div>
  </div>
</template>

<style scoped>
/* Medidas e cores do protótipo (Acionamentos.dc.html, L284–305). */
.editor {
  flex: 2 1 340px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bolinha {
  width: 14px;
  height: 14px;
  border-radius: 7px;
  flex: none;
}
.nome {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
  padding: 4px 0;
  border-bottom: 1px solid transparent;
}
.nome:focus {
  border-bottom-color: var(--kgb-tinta);
}
/* Sem padding explícito no protótipo: vale o padrão do navegador (1px 6px). */
.excluir {
  border: 0;
  background: transparent;
  padding: 1px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-perigo-texto);
}
/*
 * A linha do rótulo leva o campo "Categoria" à direita. O campo (28px) tem margens negativas: a
 * linha fica com a altura do rótulo e nada abaixo dela se desloca.
 */
.subtitulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
/* O rótulo não encolhe nem quebra (como no protótipo): quem cede espaço é o campo. */
.subtitulo > .rotulo {
  flex: none;
  white-space: nowrap;
}
.categoria {
  flex: 0 1 auto;
  min-width: 0;
  margin: -7px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.campo-categoria {
  flex: 0 1 160px;
  width: 160px;
  min-width: 80px;
  height: 28px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 10px;
  background: var(--kgb-branco);
  outline: 0;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
}
.campo-categoria:hover {
  border-color: var(--kgb-terciario);
}
.campo-categoria:focus {
  border-color: var(--kgb-primaria);
}
/* No telefone só cabe o campo; o nome acessível vem do aria-label. */
@media (max-width: 599px) {
  .categoria .rotulo {
    display: none;
  }
}
.rotulo {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.etapas {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.etapa {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 8px;
  border-radius: 12px;
  background: var(--kgb-superficie1);
}
/* A ordem muda pela alça (arrastar), pelas setas ou por Alt+↑/↓: pedido do usuário, fora do protótipo. */
.alca {
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, 4px);
  gap: 3px 4px;
  padding: 6px 2px;
  cursor: grab;
  touch-action: none;
}
.ponto {
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: var(--kgb-terciario);
}
.etapa.sortable-ghost {
  opacity: 0.4;
}
.etapa.sortable-chosen .alca {
  cursor: grabbing;
}
.numero {
  width: 22px;
  font-size: 12px;
  font-weight: 700;
  color: var(--kgb-terciario);
}
/* O texto da etapa aparece como campo, para ficar claro que dá para editar (fora do protótipo). */
.texto {
  flex: 1;
  min-width: 0;
  /* 40px como o campo do protótipo: a linha mantém a altura e nada abaixo dela se desloca. */
  height: 40px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 10px;
  background: var(--kgb-branco);
  outline: 0;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 500;
}
.texto:hover {
  border-color: var(--kgb-terciario);
}
.texto:focus {
  border-color: var(--kgb-primaria);
}
.acao {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  padding: 1px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remover:hover {
  background: var(--kgb-perigo-fundo);
}
.seta.subir {
  transform: rotate(-90deg);
}
.seta.descer {
  transform: rotate(90deg);
}
.vazio {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 8px 0;
}
.nova {
  display: flex;
  gap: 8px;
}
.campo {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px dashed var(--kgb-primaria);
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  outline: 0;
}
.adicionar {
  height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-primaria);
  color: var(--kgb-branco);
  font-size: 14px;
  font-weight: 600;
}
</style>
