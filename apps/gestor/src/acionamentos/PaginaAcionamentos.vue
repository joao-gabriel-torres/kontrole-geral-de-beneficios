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
