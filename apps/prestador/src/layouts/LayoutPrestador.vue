<script setup lang="ts">
import { AvisoToast } from '@kgb/ui'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ABAS } from '../abas'
import { avisos } from '../avisos'
import AbasPrestador from '../componentes/AbasPrestador.vue'

const route = useRoute()
const mensagem = avisos.mensagem
const conteudo = ref<HTMLElement>()

// A rolagem é da área de conteúdo, não da janela: cada tela nova abre no topo. Trocar só a query
// (o filtro de Demandas) mantém a posição.
watch(
  () => route.path,
  () => {
    if (conteudo.value) conteudo.value.scrollTop = 0
  },
)
</script>

<template>
  <div class="layout">
    <!-- Uma instância por caminho: o Detalhe de outro acionamento não reaproveita o anterior. -->
    <main ref="conteudo" class="conteudo"><RouterView :key="route.path" /></main>
    <AbasPrestador v-if="!route.meta.semAbas" :itens="ABAS" />
    <AvisoToast :mensagem="mensagem" variante="prestador" />
  </div>
</template>

<style scoped>
.layout {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--kgb-branco);
  padding-top: env(safe-area-inset-top);
}
.conteudo {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}
</style>
