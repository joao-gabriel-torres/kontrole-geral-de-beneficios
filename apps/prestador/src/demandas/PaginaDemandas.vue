<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mensagemDeErro } from '../consultas'
import CartaoDemanda from './CartaoDemanda.vue'
import { contar, FILTROS, filtrar, filtroDaQuery, type Filtro } from './filtros'
import { usarDemandas } from './usarDemandas'

const route = useRoute()
const router = useRouter()
const { data, error, isSuccess } = usarDemandas()

const filtro = computed(() => filtroDaQuery(route.query.filtro))
const contagem = computed(() => contar(data.value ?? []))
const itens = computed(() => filtrar(data.value ?? [], filtro.value))

function escolher(id: Filtro) {
  void router.replace({ query: { ...route.query, filtro: id } })
}
function abrir(id: string) {
  void router.push({ name: 'detalhe', params: { id } })
}
</script>

<template>
  <div class="pagina">
    <h1 class="titulo">Suas demandas</h1>
    <div class="filtros">
      <!-- Rótulo e contagem colados, como no protótipo (o nome acessível fica igual). -->
      <button
        v-for="f in FILTROS"
        :key="f.id"
        type="button"
        class="chip-filtro"
        :class="{ ativo: f.id === filtro }"
        @click="escolher(f.id)"
      >
        {{ f.rotulo }}<span class="contagem">{{ contagem[f.id] }}</span>
      </button>
    </div>
    <div v-if="error" class="vazio">{{ mensagemDeErro(error) }}</div>
    <div v-else-if="isSuccess && !itens.length" class="vazio">Nada por aqui.</div>
    <CartaoDemanda v-for="a in itens" :key="a.id" :acionamento="a" @abrir="abrir(a.id)" />
  </div>
</template>

<style scoped>
.pagina {
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.filtros {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 0 -24px;
  padding: 0 24px;
}
.chip-filtro {
  flex: none;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--kgb-superficie1);
  color: var(--kgb-texto);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  gap: 6px;
  align-items: center;
}
.chip-filtro.ativo {
  background: var(--kgb-tinta);
  color: #fff;
}
.contagem {
  opacity: 0.6;
}
.vazio {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 20px 0;
  text-align: center;
}
</style>
